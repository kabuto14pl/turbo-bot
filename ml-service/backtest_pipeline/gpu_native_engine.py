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
import time

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
            'train_repeat': 1,
            'retrain_count': 0,
            'epochs_last': 0,
            'train_accuracy_last': 0.0,
            'val_accuracy_last': 0.0,
            'inference_batches': 0,
        }

    def _resolve_device(self):
        if not HAS_TORCH:
            raise RuntimeError('PyTorch not installed — GPU native engine unavailable')
        if torch.cuda.is_available():
            return torch.device('cuda:0')
        # P#217: Allow CPU fallback for local development without GPU
        print('  ⚠️ CUDA not available — GPU-native engine running on CPU (slower)')
        return torch.device('cpu')

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

    @staticmethod
    def _rolling_max(values, window: int):
        out = torch.zeros_like(values)
        if values.numel() < window:
            return out
        unfolded = values.unfold(0, window, 1)
        out[window - 1:] = unfolded.max(dim=-1).values
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

        base_features = torch.stack([
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

        features = torch.cat([
            base_features,
            base_features.square(),
            torch.abs(base_features),
        ], dim=1)
        features = torch.nan_to_num(features, nan=0.0, posinf=0.0, neginf=0.0)
        return features

    def _build_labels(self, close, timeframe='15m'):
        """P#220: Multi-candle forward labels with symmetric UP/DOWN + noise exclusion.

        Old: 1-candle ahead, 0.1% threshold → pure noise prediction (53% WR).
        New: N-candle ahead (TF-specific), higher threshold, flat candles excluded
        from training so MLP learns real directional moves only.
        """
        _tf = str(timeframe).lower()

        horizon_map = getattr(config, 'GPU_NATIVE_LABEL_HORIZON', {})
        if isinstance(horizon_map, dict):
            horizon = int(horizon_map.get(_tf, 1))
        else:
            horizon = int(horizon_map)

        thresh_map = getattr(config, 'GPU_NATIVE_LABEL_THRESHOLD', {})
        if isinstance(thresh_map, dict):
            threshold = float(thresh_map.get(_tf, getattr(config, 'XGBOOST_LABEL_THRESHOLD', 0.001)))
        else:
            threshold = float(thresh_map)

        # Forward return over N candles
        future_close = torch.roll(close, -horizon)
        future_close[-horizon:] = close[-1]
        future_return = (future_close - close) / torch.clamp(close, min=1e-6)

        # Binary: 1=UP (return > +threshold), 0=DOWN (return < -threshold)
        labels = (future_return > threshold).long()

        # Valid mask: exclude last N candles AND flat candles (|return| < threshold)
        valid = torch.ones_like(labels, dtype=torch.bool)
        valid[-horizon:] = False
        valid &= (future_return.abs() >= threshold)  # Only train on clear moves

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

    def _build_qra_series(self, inputs, regimes, warmup: int):
        close = inputs['close']
        atr_pct = inputs['atr_pct']
        volume_ratio = inputs['volume_ratio']
        rsi = inputs['rsi']

        risk = torch.full_like(close, 30.0)
        risk += torch.where(atr_pct > 0.02, 20.0, torch.where(atr_pct > 0.015, 10.0, 0.0))
        risk += torch.where(volume_ratio > 3.0, 15.0, torch.where(volume_ratio > 2.0, 8.0, 0.0))
        risk += torch.where((rsi > 80.0) | (rsi < 20.0), 15.0, torch.where((rsi > 70.0) | (rsi < 30.0), 5.0, 0.0))

        rolling_peak = self._rolling_max(close, 20)
        drawdown = (rolling_peak - close) / torch.clamp(rolling_peak, min=1e-6)
        risk += torch.where(drawdown > 0.05, 15.0, torch.where(drawdown > 0.02, 5.0, 0.0))

        risk_np = risk.detach().cpu().numpy()
        risk_np[regimes == 'HIGH_VOLATILITY'] += 20
        risk_np[regimes == 'RANGING'] += 5
        risk_np = np.clip(np.rint(risk_np), 0, 100).astype(np.int32)

        interval = max(1, int(getattr(config, 'QRA_RISK_INTERVAL', 10)))
        qra_series = np.full(len(risk_np), 50, dtype=np.int32)
        last_risk = 50

        for idx in range(warmup, len(risk_np)):
            if (idx - warmup + 1) % interval == 0:
                last_risk = int(risk_np[idx])
            qra_series[idx] = last_risk

        return qra_series

    def _build_local_qmc_plan(self, inputs, warmup: int, device):
        size = inputs['close'].shape[0]
        close_cpu = inputs['close'].detach().cpu().numpy()
        atr_pct_cpu = inputs['atr_pct'].detach().cpu().numpy()

        qmc_interval = max(1, int(getattr(config, 'QMC_SIM_INTERVAL', 15)))
        qmc_paths = max(2048, int(getattr(config, 'GPU_NATIVE_LOCAL_QMC_PATHS', 32768)))
        qmc_steps = max(2, int(getattr(config, 'GPU_NATIVE_LOCAL_QMC_STEPS', getattr(config, 'REMOTE_GPU_QMC_STEPS', 16))))
        qmc_lookback = max(32, int(getattr(config, 'GPU_NATIVE_LOCAL_QMC_LOOKBACK', 200)))
        qmc_window_batch = max(1, int(getattr(config, 'GPU_NATIVE_LOCAL_QMC_BATCH', 32)))

        qmc_outlook = np.full(size, 'NEUTRAL', dtype=object)
        qmc_var = np.zeros(size, dtype=np.float32)
        qmc_tp_adjust = np.ones(size, dtype=np.float32)
        qmc_conf_boost = np.zeros(size, dtype=np.float32)

        scheduled = [
            idx for idx in range(warmup, size - 1)
            if (idx - warmup + 1) % qmc_interval == 0
        ]

        if not scheduled:
            return {
                'qmc_outlook': qmc_outlook,
                'qmc_var': qmc_var,
                'qmc_tp_adjust': qmc_tp_adjust,
                'qmc_conf_boost': qmc_conf_boost,
                'qmc_points': 0,
                'qmc_batches': 0,
                'qmc_compute_ms': 0.0,
            }

        batch_count = 0
        started_at = time.perf_counter()

        for start in range(0, len(scheduled), qmc_window_batch):
            batch_indices = scheduled[start:start + qmc_window_batch]
            batch_count += 1

            mus = []
            sigmas = []
            prices = []

            for idx in batch_indices:
                history = close_cpu[max(0, idx - qmc_lookback):idx]
                prices.append(float(close_cpu[idx]))

                if history.shape[0] < 2:
                    mus.append(0.0)
                    sigmas.append(0.0)
                    continue

                returns = np.diff(history) / np.clip(history[:-1], 1e-6, None)
                mus.append(float(returns.mean()) * 252.0 if returns.size else 0.0)
                sigmas.append(float(returns.std()) * math.sqrt(252.0) if returns.size else 0.0)

            mu = torch.tensor(mus, dtype=torch.float32, device=device).view(-1, 1, 1)
            sigma = torch.tensor(sigmas, dtype=torch.float32, device=device).view(-1, 1, 1)

            drift = (mu - 0.5 * sigma.square()) * (1.0 / 252.0)
            diffusion = sigma * math.sqrt(1.0 / 252.0)

            with torch.no_grad():
                noise = torch.randn((len(batch_indices), qmc_paths, qmc_steps), device=device)
                final_prices = torch.exp((drift + diffusion * noise).sum(dim=2))
                bullish_prob = (final_prices > 1.0).float().mean(dim=1)
                var_proxy = 1.0 - torch.quantile(final_prices, 0.05, dim=1)

            bullish_prob_np = bullish_prob.detach().cpu().numpy()
            var_proxy_np = np.maximum(0.0, var_proxy.detach().cpu().numpy())

            for local_idx, candle_idx in enumerate(batch_indices):
                prob_positive = float(bullish_prob_np[local_idx])
                qmc_var[candle_idx] = round(float(prices[local_idx] * var_proxy_np[local_idx]), 2)

                if prob_positive > 0.60:
                    qmc_outlook[candle_idx] = 'BULLISH'
                    qmc_tp_adjust[candle_idx] = float(config.QMC_BULLISH_TP_BOOST)
                    qmc_conf_boost[candle_idx] = 0.05
                elif prob_positive < 0.40:
                    qmc_outlook[candle_idx] = 'BEARISH'
                    qmc_tp_adjust[candle_idx] = float(config.QMC_BEARISH_TP_SHRINK)
                    qmc_conf_boost[candle_idx] = -0.05

        default_var = round(float(close_cpu[warmup] * max(float(atr_pct_cpu[warmup]), 0.01) * 1.645), 2)
        last_outlook = 'NEUTRAL'
        last_var = default_var
        last_tp_adjust = 1.0
        last_conf_boost = 0.0
        scheduled_set = set(scheduled)

        for idx in range(warmup, size):
            if idx in scheduled_set:
                last_outlook = qmc_outlook[idx]
                last_var = float(qmc_var[idx])
                last_tp_adjust = float(qmc_tp_adjust[idx])
                last_conf_boost = float(qmc_conf_boost[idx])
            else:
                qmc_outlook[idx] = last_outlook
                qmc_var[idx] = last_var
                qmc_tp_adjust[idx] = last_tp_adjust
                qmc_conf_boost[idx] = last_conf_boost

        return {
            'qmc_outlook': qmc_outlook,
            'qmc_var': qmc_var,
            'qmc_tp_adjust': qmc_tp_adjust,
            'qmc_conf_boost': qmc_conf_boost,
            'qmc_points': len(scheduled),
            'qmc_batches': batch_count,
            'qmc_compute_ms': round((time.perf_counter() - started_at) * 1000.0, 2),
        }

    @staticmethod
    def _row_buffers(df):
        def column(name: str, default: float):
            if name in df.columns:
                values = df[name].to_numpy(dtype=np.float32, copy=True)
                return np.nan_to_num(values, nan=default, posinf=default, neginf=default)
            return np.full(len(df), default, dtype=np.float32)

        close = column('close', 0.0)
        cl0 = float(close[0]) if len(close) else 0.0
        rsi = column('rsi_14', 50.0)
        return {
            'close': close,
            'high': column('high', cl0),
            'low': column('low', cl0),
            'atr': column('atr', 0.0),
            'open': column('open', cl0),
            'volume': column('volume', 1.0),
            # P#188: indicator columns for GridV2, MomentumHTF, FundingArb, NewsFilter
            'adx': column('adx', 20.0),
            'rsi_14': rsi,
            'rsi': rsi,                        # alias — momentum_htf uses 'rsi' key
            'bb_pctb': column('bb_pctb', 0.5),
            'bb_upper': column('bb_upper', 0.0),   # safe default 0.0; strategies fall back to close*1.02
            'bb_lower': column('bb_lower', 0.0),
            'volume_ratio': column('volume_ratio', 1.0),
            'macd_histogram': column('macd_hist', 0.0),  # momentum_htf uses 'macd_histogram' key
            'macd_hist': column('macd_hist', 0.0),
            'ema_21': column('ema_21', cl0),
            'sma_50': column('sma_50', cl0),
        }

    def _build_ext_signals_plan(self, df, warmup: int, regimes):
        """
        P#187: Pre-compute ExternalSignals composite decisions for all candles.
        Runs once before the hot candle loop; results stored as numpy arrays.
        ExternalSignalsSimulator is pure numpy — no API calls, ~2ms/candle.
        """
        n = len(df)
        actions = np.full(n, 'HOLD', dtype=object)
        confidences = np.zeros(n, dtype=np.float32)

        if not self.external_signals.enabled:
            return {'actions': actions, 'confidences': confidences}

        lookback = min(getattr(config, 'GPU_NATIVE_LOCAL_QMC_LOOKBACK', 200), 200)
        print(f'  🔌 Pre-computing ExternalSignals plan ({n - warmup} candles, lookback={lookback})')
        t0 = time.perf_counter()

        for i in range(warmup, n - 1):
            hist_start = max(0, i - lookback)
            sig = self.external_signals.generate_signal(
                df.iloc[i],
                df.iloc[hist_start:i],
                str(regimes[i]),
            )
            if sig:
                actions[i] = sig.get('action', 'HOLD')
                confidences[i] = float(sig.get('confidence', 0.0))

        elapsed = (time.perf_counter() - t0) * 1000
        buy_n = int(np.sum(actions == 'BUY'))
        sell_n = int(np.sum(actions == 'SELL'))
        print(f'  ✅ ExtSig plan: {buy_n} BUY / {sell_n} SELL ({elapsed:.0f} ms)')
        return {'actions': actions, 'confidences': confidences}

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

        repeat_count = max(1, int(getattr(config, 'GPU_NATIVE_TRAIN_REPEAT', 1)))
        if repeat_count > 1:
            X_train = X_train.repeat((repeat_count, 1))
            y_train = y_train.repeat(repeat_count)
            X_train = X_train + torch.randn_like(X_train) * 0.01

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
            'train_repeat': repeat_count,
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
        labels, valid = self._build_labels(inputs['close'], timeframe)
        regimes = self._build_regime_series(inputs)
        warmup = min(getattr(config, 'XGBOOST_WARMUP_CANDLES', 500), max(250, int(len(df) * 0.6)))
        retrain_interval = int(getattr(config, 'GPU_NATIVE_RETRAIN_INTERVAL', getattr(config, 'XGBOOST_RETRAIN_INTERVAL', 200)))
        qra_series = self._build_qra_series(inputs, regimes, warmup)
        row_buffers = self._row_buffers(df)
        self.gpu_native_stats['n_features'] = int(features.shape[1])

        if getattr(config, 'GPU_NATIVE_LOCAL_QUANTUM', True):
            quantum_plan = self._build_local_qmc_plan(inputs, warmup, device)
            self.gpu_native_stats['quantum_mode'] = 'local-cuda-batched'
            self.gpu_native_stats['qmc_points'] = quantum_plan['qmc_points']
            self.gpu_native_stats['qmc_batches'] = quantum_plan['qmc_batches']
            self.gpu_native_stats['qmc_compute_ms'] = quantum_plan['qmc_compute_ms']
        else:
            quantum_plan = {
                'qmc_outlook': np.full(len(df), 'NEUTRAL', dtype=object),
                'qmc_var': np.zeros(len(df), dtype=np.float32),
                'qmc_tp_adjust': np.ones(len(df), dtype=np.float32),
                'qmc_conf_boost': np.zeros(len(df), dtype=np.float32),
                'qmc_points': 0,
                'qmc_batches': 0,
                'qmc_compute_ms': 0.0,
            }
            self.gpu_native_stats['quantum_mode'] = 'disabled'

        # P#187: Pre-compute ExternalSignals plan (pure numpy, runs once before hot loop)
        ext_plan = self._build_ext_signals_plan(df, warmup, regimes)

        # P#188: funding interval (32 candles on 15m, 8 on 1h, 2 on 4h)
        _tf = str(timeframe or '15m').lower()
        funding_interval = 32 if '15m' in _tf else (8 if '1h' in _tf else 2)

        probas = torch.zeros((len(df), 2), device=device)
        cursor = warmup
        total_candles = len(df) - 1
        est_retrains = max(1, (total_candles - warmup) // retrain_interval)
        retrain_num = 0
        train_t0 = time.perf_counter()
        print(f'  📊 MLP training loop: {total_candles - warmup} candles, retrain every {retrain_interval}, '
              f'~{est_retrains} retrains, dims={getattr(config, "GPU_NATIVE_HIDDEN_DIMS", [512, 256, 128])}, '
              f'epochs={getattr(config, "GPU_NATIVE_EPOCHS", 36)}, repeat={getattr(config, "GPU_NATIVE_TRAIN_REPEAT", 1)}',
              flush=True)
        while cursor < len(df) - 1:
            train_start = max(50, cursor - warmup)
            model, train_stats = self._train_window_model(features, labels, valid, train_start, cursor, device)
            if model is None:
                return {'error': f'GPU-native model could not train at cursor={cursor}'}

            retrain_num += 1
            self.gpu_native_stats['retrain_count'] += 1
            self.gpu_native_stats['train_repeat'] = train_stats['train_repeat']
            self.gpu_native_stats['epochs_last'] = train_stats['epochs_used']
            self.gpu_native_stats['train_accuracy_last'] = round(train_stats['train_accuracy'], 4)
            self.gpu_native_stats['val_accuracy_last'] = round(train_stats['val_accuracy'], 4)

            infer_end = min(len(df) - 1, cursor + retrain_interval)
            probas[cursor:infer_end] = self._infer_segment(model, train_stats, features, cursor, infer_end)

            pct = round(100.0 * (infer_end - warmup) / max(1, total_candles - warmup), 1)
            elapsed = time.perf_counter() - train_t0
            print(f'    retrain {retrain_num}/{est_retrains} | candle {infer_end}/{total_candles} '
                  f'({pct}%) | acc={train_stats["train_accuracy"]:.3f}/{train_stats["val_accuracy"]:.3f} '
                  f'| ep={train_stats["epochs_used"]} | {elapsed:.1f}s', flush=True)

            cursor = infer_end

        train_elapsed = time.perf_counter() - train_t0
        print(f'  ✅ MLP training complete: {retrain_num} retrains in {train_elapsed:.1f}s', flush=True)

        probs_cpu = probas.detach().cpu().numpy()

        # P#220: Trade cooldown — prevent overtrading (was 15 trades/day/pair)
        cooldown_map = getattr(config, 'GPU_NATIVE_COOLDOWN_CANDLES', {})
        if isinstance(cooldown_map, dict):
            cooldown_candles = int(cooldown_map.get(_tf, 0))
        else:
            cooldown_candles = int(cooldown_map)
        cooldown_remaining = 0

        # P#220: Higher MLP confidence threshold (was 0.55 ≈ random)
        mlp_min_conf = float(getattr(config, 'GPU_NATIVE_MIN_CONFIDENCE',
                                     getattr(config, 'XGBOOST_MIN_PROBABILITY', 0.55)))

        # P#220: Disable momentum early-exit gate for MLP trades
        # Gate was tightening SL to 35% after 3 candles → avg_win/avg_loss = 0.63 (inverted R:R)
        _orig_momentum_gate = config.MOMENTUM_GATE_ENABLED
        if not getattr(config, 'GPU_NATIVE_MOMENTUM_GATE', True):
            config.MOMENTUM_GATE_ENABLED = False

        exec_total = total_candles - warmup
        exec_t0 = time.perf_counter()
        print(f'  ⚡ Executing {exec_total} candles (GridV2 + MomentumHTF + GPU_MLP signals)...'
              f' [cooldown={cooldown_candles}, min_conf={mlp_min_conf:.2f}, momentum_gate={config.MOMENTUM_GATE_ENABLED}]',
              flush=True)
        for i in range(warmup, len(df) - 1):
            row = {
                'close': float(row_buffers['close'][i]),
                'high': float(row_buffers['high'][i]),
                'low': float(row_buffers['low'][i]),
                'atr': float(row_buffers['atr'][i]),
                'open': float(row_buffers['open'][i]),
                'volume': float(row_buffers['volume'][i]),
                # P#188: indicators needed by GridV2, MomentumHTF, FundingArb, NewsFilter
                'adx': float(row_buffers['adx'][i]),
                'rsi_14': float(row_buffers['rsi_14'][i]),
                'rsi': float(row_buffers['rsi'][i]),
                'bb_pctb': float(row_buffers['bb_pctb'][i]),
                'bb_upper': float(row_buffers['bb_upper'][i]) or float(row_buffers['close'][i]) * 1.02,
                'bb_lower': float(row_buffers['bb_lower'][i]) or float(row_buffers['close'][i]) * 0.98,
                'volume_ratio': float(row_buffers['volume_ratio'][i]),
                'macd_histogram': float(row_buffers['macd_histogram'][i]),
                'macd_hist': float(row_buffers['macd_hist'][i]),
                'ema_21': float(row_buffers['ema_21'][i]) or float(row_buffers['close'][i]),
                'sma_50': float(row_buffers['sma_50'][i]) or float(row_buffers['close'][i]),
            }
            candle_time = df.index[i]
            current_regime = regimes[i]
            self.cycle_count += 1

            self.regime.current_regime = current_regime
            self.regime.regime_history.append(current_regime)
            self.phase_stats['phase_0'] += 1
            self.phase_stats['phase_1'] += 1
            self.phase_stats['phase_2'] += 1
            self.phase_stats['phase_4'] += 1

            qra_risk_score = int(qra_series[i])
            q_result = {
                'qmc_outlook': quantum_plan['qmc_outlook'][i],
                'qmc_var': float(quantum_plan['qmc_var'][i]),
                'qra_risk_score': qra_risk_score,
                'qaoa_weights': None,
                'qdv_verified': True,
                'sl_adjust': float(config.QRA_SL_TIGHTEN_FACTOR) if qra_risk_score > config.QRA_HIGH_RISK_THRESHOLD else 1.0,
                'tp_adjust': float(quantum_plan['qmc_tp_adjust'][i]),
                'quantum_confidence_boost': float(quantum_plan['qmc_conf_boost'][i]),
            }

            if self.pm.position is not None:
                self.phase_stats['phase_10'] += 1
                exit_result = self.pm.manage_position(row, candle_time, current_regime, q_result)
                if exit_result and exit_result != 'OPEN':
                    self._learn_from_last_trade(i)
                    # P#220: Start cooldown after trade close
                    cooldown_remaining = cooldown_candles
                    if self.pm.trades and self.pm.trades[-1].get('is_grid_v2', False):
                        last_t = self.pm.trades[-1]
                        self.grid_v2.record_grid_trade(last_t['net_pnl'], last_t['fees'])
                    if self.pm.trades and self.pm.trades[-1].get('is_momentum_htf', False):
                        last_t = self.pm.trades[-1]
                        self.momentum_htf.record_trade(last_t['net_pnl'], last_t['fees'])

            # P#188: FundingRateArbitrage — delta-neutral income, every funding_interval candles
            if getattr(config, 'FUNDING_ARB_ENABLED', False) and (i - warmup) % funding_interval == 0:
                fr_result = self.funding_arb.process_candle(
                    row, df.iloc[max(0, i - 100):i], current_regime,
                    self.pm.capital, candle_idx=i, funding_interval=funding_interval
                )
                if fr_result.get('funding_collected', 0) > 0:
                    self.pm.capital += fr_result['funding_collected']

            # P#188: NewsFilter — detect events every candle (builds event history)
            if getattr(config, 'NEWS_FILTER_ENABLED', False):
                self.news_filter.detect_events(row, df.iloc[max(0, i - 50):i], i)

            # P#188: GridV2 — RANGING mean-reversion bypass (row-only, no history needed)
            if self.pm.position is None and getattr(config, 'GRID_V2_ENABLED', False):
                grid_signal = self.grid_v2.evaluate(
                    row, df.iloc[max(0, i - 5):i], current_regime,
                    candle_idx=i, has_position=False
                )
                if grid_signal is not None:
                    self.grid_v2.mark_entry(i)
                    _atr = row.get('atr', row['close'] * 0.01)
                    _side = 'LONG' if grid_signal['signal'] == 'BUY' else 'SHORT'
                    _opened = self.pm.open_position(
                        side=_side, price=row['close'], atr=_atr,
                        time=candle_time, regime=current_regime,
                        sl_adjust=grid_signal['sl_atr'] / max(config.SL_ATR_MULT, 1e-6),
                        tp_adjust=grid_signal['tp_atr'] / max(config.TP_ATR_MULT, 1e-6),
                        risk_multiplier=grid_signal['risk_per_trade'] / max(getattr(config, 'RISK_PER_TRADE', 0.015), 1e-6),
                        confidence=grid_signal['confidence'],
                    )
                    if _opened and self.pm.position is not None:
                        self.pm.position['strategies'] = ['GridV2']
                        self.pm.position['is_grid_v2'] = True
                    self._track_equity(row, candle_time)
                    continue

            # P#188: MomentumHTF — TRENDING pullback bypass
            if self.pm.position is None and getattr(config, 'MOMENTUM_HTF_ENABLED', False):
                mtf_signal = self.momentum_htf.evaluate(
                    row, df.iloc[max(0, i - 250):i], current_regime,
                    candle_idx=i, has_position=False
                )
                if mtf_signal is not None:
                    self.momentum_htf.mark_entry(i)
                    _atr = row.get('atr', row['close'] * 0.01)
                    _side = 'LONG' if mtf_signal['signal'] == 'BUY' else 'SHORT'
                    _opened = self.pm.open_position(
                        side=_side, price=row['close'], atr=_atr,
                        time=candle_time, regime=current_regime,
                        sl_adjust=mtf_signal['sl_atr'] / max(config.SL_ATR_MULT, 1e-6),
                        tp_adjust=mtf_signal['tp_atr'] / max(config.TP_ATR_MULT, 1e-6),
                        risk_multiplier=mtf_signal['risk_per_trade'] / max(getattr(config, 'RISK_PER_TRADE', 0.015), 1e-6),
                        confidence=mtf_signal['confidence'],
                    )
                    if _opened and self.pm.position is not None:
                        self.pm.position['strategies'] = ['MomentumHTF']
                        self.pm.position['is_momentum_htf'] = True
                    self._track_equity(row, candle_time)
                    continue

            if self.pm.position is None:
                # P#220: Cooldown — skip MLP signals during cooldown period
                if cooldown_remaining > 0:
                    cooldown_remaining -= 1
                    self._track_equity(row, candle_time)
                    continue

                self.phase_stats['phase_6'] += 1
                drawdown = self.pm.get_current_drawdown()
                proba_up = float(probs_cpu[i, 1])
                proba_down = float(probs_cpu[i, 0])
                final_confidence = max(proba_up, proba_down)
                final_confidence += float(q_result.get('quantum_confidence_boost', 0.0) or 0.0)
                final_confidence = min(config.CONFIDENCE_CLAMP_MAX, max(0.0, final_confidence))

                # P#220: Use GPU_NATIVE_MIN_CONFIDENCE instead of XGBOOST_MIN_PROBABILITY
                if final_confidence >= mlp_min_conf:
                    final_action = 'BUY' if proba_up >= proba_down else 'SELL'
                else:
                    final_action = 'HOLD'

                # P#187: ExternalSignals soft vote — blended at STATIC_WEIGHTS['ExternalSignals'] (0.10)
                # Aligned signal → confidence boost; conflicting signal → small headwind
                if final_action != 'HOLD' and self.external_signals.enabled:
                    ext_action = ext_plan['actions'][i]
                    ext_conf = float(ext_plan['confidences'][i])
                    if ext_action not in ('HOLD', None) and ext_conf > 0.0:
                        ext_w = config.STATIC_WEIGHTS.get('ExternalSignals', 0.10)
                        if ext_action == final_action:
                            final_confidence += ext_conf * ext_w
                        else:
                            final_confidence -= ext_conf * ext_w * 0.5
                        final_confidence = min(config.CONFIDENCE_CLAMP_MAX, max(0.0, final_confidence))

                if final_action == 'HOLD' or final_confidence < config.CONFIDENCE_FLOOR:
                    self._track_equity(row, candle_time)
                    continue

                # P#188: NewsFilter — apply signal confidence adjustment/block
                if getattr(config, 'NEWS_FILTER_ENABLED', False) and final_action in ('BUY', 'SELL'):
                    _nconf, _nblocked, _nreason = self.news_filter.filter_signal(final_action, final_confidence, i)
                    if _nblocked:
                        self._block(f'NewsFilter: {_nreason}')
                        self._track_equity(row, candle_time)
                        continue
                    final_confidence = _nconf

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
                if opened and self.pm.position is not None:
                    self.pm.position['strategies'] = ['GPU_MLP']
                    self.pm.position['is_gpu_direct'] = True
                elif not opened:
                    self._block('Execution failed (fee gate / sizing)')

            self._track_equity(row, candle_time)

        exec_elapsed = time.perf_counter() - exec_t0
        trades_so_far = len(self.pm.trades)
        print(f'  ✅ Execution complete: {trades_so_far} trades in {exec_elapsed:.1f}s', flush=True)

        # P#220: Restore original momentum gate setting
        config.MOMENTUM_GATE_ENABLED = _orig_momentum_gate

        if self.pm.position is not None:
            last_price = df.iloc[-1]['close']
            last_time = df.index[-1]
            self.pm.force_close(last_price, last_time, 'END')
            self._learn_from_last_trade(len(df) - 1)

        results = self._compute_results(df, timeframe)
        results['engine_mode'] = self.engine_mode
        results['gpu_native_stats'] = dict(self.gpu_native_stats)
        return results