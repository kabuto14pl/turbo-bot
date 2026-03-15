"""
Experimental GPU-native backtest engine foundation.

This path is the first step toward a true GPU-first backtest runtime:
  - raw indicator tensors are built once on CUDA
  - model training and batched inference run on CUDA
  - CPU-only classical strategy stack is bypassed

The execution loop still uses the existing position manager for lifecycle parity,
but the signal path is moved onto GPU so the old pandas-heavy decision layer is
no longer the dominant driver.
"""

from __future__ import annotations

import math

import numpy as np

from . import config
from .engine import FullPipelineEngine
from .runtime_parity import apply_runtime_risk_check

try:
    import torch
    import torch.nn as nn
    HAS_TORCH = True
except ImportError:
    torch = None
    nn = None
    HAS_TORCH = False

GpuModuleBase = nn.Module if HAS_TORCH else object


class _GpuSignalMLP(GpuModuleBase):
    def __init__(self, in_features: int, hidden_dims: list[int], dropout: float = 0.15):
        super().__init__()
        layers = []
        prev = in_features
        for dim in hidden_dims:
            layers.extend([
                nn.Linear(prev, dim),
                nn.LayerNorm(dim),
                nn.GELU(),
                nn.Dropout(dropout),
            ])
            prev = dim
        self.backbone = nn.Sequential(*layers)
        self.head = nn.Linear(prev, 2)

    def forward(self, x):
        return self.head(self.backbone(x))


class GpuNativeBacktestEngine(FullPipelineEngine):
    """GPU-first backtest engine using batched tensor features and CUDA model inference."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.engine_mode = 'gpu-native-experimental'
        self.gpu_native_stats = {
            'enabled': True,
            'device': 'none',
            'n_features': 0,
            'retrain_count': 0,
            'epochs_last': 0,
            'train_accuracy_last': 0.0,
            'val_accuracy_last': 0.0,
            'inference_batches': 0,
        }

    def _resolve_device(self):
        if not HAS_TORCH:
            raise RuntimeError('PyTorch not installed — GPU native engine unavailable')
        if not torch.cuda.is_available():
            raise RuntimeError('CUDA not available — GPU native engine requires local CUDA')
        return torch.device('cuda:0')

    @staticmethod
    def _rolling_mean(values, window: int):
        out = torch.zeros_like(values)
        if values.numel() < window:
            return out
        unfolded = values.unfold(0, window, 1)
        out[window - 1:] = unfolded.mean(dim=-1)
        return out

    @staticmethod
    def _rolling_std(values, window: int):
        out = torch.zeros_like(values)
        if values.numel() < window:
            return out
        unfolded = values.unfold(0, window, 1)
        out[window - 1:] = unfolded.std(dim=-1, unbiased=False)
        return out

    def _tensor_inputs(self, df, device):
        def col(name, default=0.0):
            if name in df.columns:
                arr = df[name].to_numpy(dtype=np.float32, copy=True)
            else:
                arr = np.full(len(df), default, dtype=np.float32)
            return torch.from_numpy(np.nan_to_num(arr, nan=default, posinf=default, neginf=default)).to(device)

        close = col('close', 1.0)
        open_ = col('open', float(close[0].item()) if len(df) else 1.0)
        high = col('high', float(close[0].item()) if len(df) else 1.0)
        low = col('low', float(close[0].item()) if len(df) else 1.0)
        volume = col('volume', 0.0)
        ema9 = col('ema_9', 0.0)
        ema21 = col('ema_21', 0.0)
        sma50 = col('sma_50', 0.0)
        adx = col('adx', 20.0)
        rsi = col('rsi_14', 50.0)
        macd_hist = col('macd_hist', 0.0)
        bb_pctb = col('bb_pctb', 0.5)
        atr_pct = col('atr_pct', 0.01)
        volume_ratio = col('volume_ratio', 1.0)
        roc10 = col('roc_10', 0.0)
        supertrend_dir = col('supertrend_dir', 0.0)

        return {
            'close': close,
            'open': open_,
            'high': high,
            'low': low,
            'volume': volume,
            'ema9': ema9,
            'ema21': ema21,
            'sma50': sma50,
            'adx': adx,
            'rsi': rsi,
            'macd_hist': macd_hist,
            'bb_pctb': bb_pctb,
            'atr_pct': atr_pct,
            'volume_ratio': volume_ratio,
            'roc10': roc10,
            'supertrend_dir': supertrend_dir,
        }

    def _build_feature_matrix(self, inputs):
        close = torch.clamp(inputs['close'], min=1e-6)
        open_ = inputs['open']
        high = inputs['high']
        low = inputs['low']
        volume = torch.clamp(inputs['volume'], min=0.0)

        prev_close = torch.roll(close, 1)
        prev_close[0] = close[0]

        ret1 = (close - prev_close) / prev_close
        sma5 = self._rolling_mean(close, 5)
        sma20 = self._rolling_mean(close, 20)
        vol5 = self._rolling_std(ret1, 5)
        vol20 = self._rolling_std(ret1, 20)

        candle_range = torch.clamp(high - low, min=1e-6)
        upper_wick = (high - torch.maximum(open_, close)) / close
        lower_wick = (torch.minimum(open_, close) - low) / close

        features = torch.stack([
            (close - open_) / close,
            candle_range / close,
            upper_wick,
            lower_wick,
            ret1,
            (close - sma5) / torch.clamp(sma5, min=1e-6),
            (close - sma20) / torch.clamp(sma20, min=1e-6),
            vol5,
            vol20,
            torch.log1p(volume),
            inputs['rsi'] / 100.0,
            inputs['adx'] / 100.0,
            inputs['bb_pctb'],
            inputs['macd_hist'] / torch.clamp(close * 0.01, min=1e-6),
            (inputs['ema9'] - inputs['ema21']) / torch.clamp(close, min=1e-6),
            (close - inputs['ema21']) / torch.clamp(close, min=1e-6),
            (close - inputs['sma50']) / torch.clamp(close, min=1e-6),
            inputs['atr_pct'],
            inputs['volume_ratio'],
            inputs['roc10'],
            inputs['supertrend_dir'],
        ], dim=1)

        features = torch.nan_to_num(features, nan=0.0, posinf=0.0, neginf=0.0)
        return features

    def _build_labels(self, close):
        future_close = torch.roll(close, -1)
        future_close[-1] = close[-1]
        future_return = (future_close - close) / torch.clamp(close, min=1e-6)
        threshold = float(getattr(config, 'XGBOOST_LABEL_THRESHOLD', 0.001))
        labels = (future_return > threshold).long()
        valid = torch.ones_like(labels, dtype=torch.bool)
        valid[-1] = False
        return labels, valid

    def _build_regime_series(self, inputs):
        close = inputs['close']
        atr_pct = inputs['atr_pct']
        adx = inputs['adx']
        ema9 = inputs['ema9']
        ema21 = inputs['ema21']
        sma50 = inputs['sma50']

        high_vol = (atr_pct > 0.02) | (inputs['volume_ratio'] > 2.0)
        trending_up = (adx > getattr(config, 'ADX_TREND_THRESHOLD', 20)) & (close > ema21) & (ema9 > ema21) & (ema21 > sma50)
        trending_down = (adx > getattr(config, 'ADX_TREND_THRESHOLD', 20)) & (close < ema21) & (ema9 < ema21) & (ema21 < sma50)

        regimes = np.full(close.shape[0], 'RANGING', dtype=object)
        regimes[high_vol.detach().cpu().numpy()] = 'HIGH_VOLATILITY'
        regimes[trending_up.detach().cpu().numpy()] = 'TRENDING_UP'
        regimes[trending_down.detach().cpu().numpy()] = 'TRENDING_DOWN'
        return regimes

    def _train_window_model(self, features, labels, valid, train_start: int, train_end: int, device):
        train_idx = torch.arange(train_start, train_end, device=device)
        train_idx = train_idx[valid[train_idx]]
        if train_idx.numel() < max(64, getattr(config, 'XGBOOST_MIN_TRAIN_SAMPLES', 150)):
            return None, None

        X = features[train_idx]
        y = labels[train_idx]

        mean = X.mean(dim=0, keepdim=True)
        std = torch.clamp(X.std(dim=0, keepdim=True, unbiased=False), min=1e-6)
        X = (X - mean) / std

        split = max(32, int(X.shape[0] * 0.85))
        split = min(split, X.shape[0])
        X_train = X[:split]
        y_train = y[:split]
        X_val = X[split:] if split < X.shape[0] else X[:0]
        y_val = y[split:] if split < y.shape[0] else y[:0]

        model = _GpuSignalMLP(X.shape[1], getattr(config, 'GPU_NATIVE_HIDDEN_DIMS', [512, 256, 128])).to(device)
        optimizer = torch.optim.AdamW(model.parameters(), lr=getattr(config, 'MLP_LEARNING_RATE', 1e-3), weight_decay=getattr(config, 'MLP_WEIGHT_DECAY', 1e-4))
        criterion = nn.CrossEntropyLoss()
        batch_size = int(getattr(config, 'GPU_NATIVE_BATCH_SIZE', 1024))
        epochs = int(getattr(config, 'GPU_NATIVE_EPOCHS', 36))
        patience = min(10, int(getattr(config, 'MLP_PATIENCE', 10)))

        best_state = None
        best_val_loss = float('inf')
        patience_left = patience
        train_acc = 0.0
        val_acc = 0.0
        epochs_used = 0

        for epoch in range(epochs):
            epochs_used = epoch + 1
            model.train()
            perm = torch.randperm(X_train.shape[0], device=device)
            for start in range(0, X_train.shape[0], batch_size):
                idx = perm[start:start + batch_size]
                logits = model(X_train[idx])
                loss = criterion(logits, y_train[idx])
                optimizer.zero_grad(set_to_none=True)
                loss.backward()
                optimizer.step()

            model.eval()
            with torch.no_grad():
                train_pred = model(X_train).argmax(dim=1)
                train_acc = (train_pred == y_train).float().mean().item()
                if X_val.numel() > 0:
                    val_logits = model(X_val)
                    val_loss = criterion(val_logits, y_val).item()
                    val_acc = (val_logits.argmax(dim=1) == y_val).float().mean().item()
                else:
                    val_loss = 1.0 - train_acc
                    val_acc = train_acc

            if val_loss < best_val_loss:
                best_val_loss = val_loss
                best_state = {k: v.detach().clone() for k, v in model.state_dict().items()}
                patience_left = patience
            else:
                patience_left -= 1
                if patience_left <= 0:
                    break

        if best_state is not None:
            model.load_state_dict(best_state)

        stats = {
            'mean': mean,
            'std': std,
            'train_accuracy': train_acc,
            'val_accuracy': val_acc,
            'epochs_used': epochs_used,
        }
        return model, stats

    def _infer_segment(self, model, stats, features, start_idx: int, end_idx: int):
        X_seg = features[start_idx:end_idx]
        X_seg = (X_seg - stats['mean']) / stats['std']
        X_seg = torch.nan_to_num(X_seg, nan=0.0, posinf=0.0, neginf=0.0)
        with torch.no_grad():
            probs = torch.softmax(model(X_seg), dim=1)
        self.gpu_native_stats['inference_batches'] += 1
        return probs

    def run(self, df, timeframe='15m'):
        self._reset()

        if len(df) < 300:
            return {'error': f'Insufficient data for GPU-native engine: {len(df)} (need 300+)'}

        device = self._resolve_device()
        self.gpu_native_stats['device'] = str(device)
        print('  🚧 GPU-native experimental engine active (CUDA tensor pipeline)')

        if len(df) > 1:
            td = (df.index[1] - df.index[0]).total_seconds()
            self.candle_hours = td / 3600
        else:
            self.candle_hours = 0.25

        inputs = self._tensor_inputs(df, device)
        features = self._build_feature_matrix(inputs)
        labels, valid = self._build_labels(inputs['close'])
        regimes = self._build_regime_series(inputs)
        self.gpu_native_stats['n_features'] = int(features.shape[1])

        warmup = min(getattr(config, 'XGBOOST_WARMUP_CANDLES', 500), max(250, int(len(df) * 0.6)))
        retrain_interval = int(getattr(config, 'GPU_NATIVE_RETRAIN_INTERVAL', getattr(config, 'XGBOOST_RETRAIN_INTERVAL', 200)))

        probas = torch.zeros((len(df), 2), device=device)
        cursor = warmup
        while cursor < len(df) - 1:
            train_start = max(50, cursor - warmup)
            model, train_stats = self._train_window_model(features, labels, valid, train_start, cursor, device)
            if model is None:
                return {'error': f'GPU-native model could not train at cursor={cursor}'}

            self.gpu_native_stats['retrain_count'] += 1
            self.gpu_native_stats['epochs_last'] = train_stats['epochs_used']
            self.gpu_native_stats['train_accuracy_last'] = round(train_stats['train_accuracy'], 4)
            self.gpu_native_stats['val_accuracy_last'] = round(train_stats['val_accuracy'], 4)

            infer_end = min(len(df) - 1, cursor + retrain_interval)
            probas[cursor:infer_end] = self._infer_segment(model, train_stats, features, cursor, infer_end)
            cursor = infer_end

        probs_cpu = probas.detach().cpu().numpy()

        for i in range(warmup, len(df) - 1):
            row = df.iloc[i]
            history = df.iloc[max(0, i - 200):i]
            candle_time = df.index[i]
            current_regime = regimes[i]
            self.cycle_count += 1

            self.regime.current_regime = current_regime
            self.regime.regime_history.append(current_regime)
            self.phase_stats['phase_0'] += 1
            self.phase_stats['phase_1'] += 1
            self.phase_stats['phase_2'] += 1
            self.phase_stats['phase_4'] += 1

            q_result = self.quantum.process_cycle(row, history, current_regime, {}, self.pm.capital)

            if self.pm.position is not None:
                self.phase_stats['phase_10'] += 1
                exit_result = self.pm.manage_position(row, candle_time, current_regime, q_result)
                if exit_result and exit_result != 'OPEN':
                    self._learn_from_last_trade(i)

            if self.pm.position is None:
                self.phase_stats['phase_6'] += 1
                drawdown = self.pm.get_current_drawdown()
                proba_up = float(probs_cpu[i, 1])
                proba_down = float(probs_cpu[i, 0])
                final_confidence = max(proba_up, proba_down)
                final_confidence += float(q_result.get('quantum_confidence_boost', 0.0) or 0.0)
                final_confidence = min(config.CONFIDENCE_CLAMP_MAX, max(0.0, final_confidence))

                if final_confidence >= getattr(config, 'XGBOOST_MIN_PROBABILITY', 0.55):
                    final_action = 'BUY' if proba_up >= proba_down else 'SELL'
                else:
                    final_action = 'HOLD'

                if final_action == 'HOLD' or final_confidence < config.CONFIDENCE_FLOOR:
                    self._track_equity(row, candle_time)
                    continue

                qdv = self.quantum.verify_decision(final_action, final_confidence, current_regime, q_result['qra_risk_score'])
                if not qdv['verified']:
                    self._block(f'QDV: {qdv["reason"]}')
                    self._track_equity(row, candle_time)
                    continue

                runtime_risk = apply_runtime_risk_check(final_action, final_confidence, drawdown)
                if not runtime_risk['approved']:
                    self._block(f'Runtime risk: {runtime_risk["reason"]}')
                    self._track_equity(row, candle_time)
                    continue

                self.phase_stats['phase_9'] += 1
                atr = row.get('atr', row['close'] * 0.01)
                side = 'LONG' if final_action == 'BUY' else 'SHORT'
                opened = self.pm.open_position(
                    side=side,
                    price=row['close'],
                    atr=atr,
                    time=candle_time,
                    regime=current_regime,
                    sl_adjust=q_result['sl_adjust'],
                    tp_adjust=q_result['tp_adjust'],
                    risk_multiplier=1.0,
                    confidence=runtime_risk['confidence'],
                )
                if not opened:
                    self._block('Execution failed (fee gate / sizing)')

            self._track_equity(row, candle_time)

        if self.pm.position is not None:
            last_price = df.iloc[-1]['close']
            last_time = df.index[-1]
            self.pm.force_close(last_price, last_time, 'END')
            self._learn_from_last_trade(len(df) - 1)

        results = self._compute_results(df, timeframe)
        results['engine_mode'] = self.engine_mode
        results['gpu_native_stats'] = dict(self.gpu_native_stats)
        return results