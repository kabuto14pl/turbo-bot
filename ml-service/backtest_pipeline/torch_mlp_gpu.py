"""
TURBO-BOT Full Pipeline Backtest — PyTorch MLP GPU Engine
P#176: 100% GPU ML engine as fallback/alternative to XGBoost.

Architecture:
  - 3-layer MLP (128→64→32) with BatchNorm + Dropout
  - Full CUDA acceleration: train + inference on GPU
  - Walk-forward training with sliding window retrain
  - Same 45-feature interface as XGBoostMLEngine
  - Anti-overfitting: dropout, weight decay, early stopping on val loss
"""

import numpy as np
import pandas as pd
import json
import base64
import urllib.request
import urllib.error
from . import config

try:
    import torch
    import torch.nn as nn
    HAS_TORCH = True
    TORCH_CUDA = torch.cuda.is_available()
except ImportError:
    HAS_TORCH = False
    TORCH_CUDA = False


class _TradingMLP(nn.Module):
    """3-layer MLP for direction classification + return regression."""

    def __init__(self, n_features, hidden1=128, hidden2=64, hidden3=32, dropout=0.3):
        super().__init__()
        self.shared = nn.Sequential(
            nn.Linear(n_features, hidden1),
            nn.BatchNorm1d(hidden1),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden1, hidden2),
            nn.BatchNorm1d(hidden2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden2, hidden3),
            nn.BatchNorm1d(hidden3),
            nn.ReLU(),
        )
        # Classification head: P(UP)
        self.clf_head = nn.Linear(hidden3, 2)
        # Regression head: expected return
        self.reg_head = nn.Linear(hidden3, 1)

    def forward(self, x):
        h = self.shared(x)
        logits = self.clf_head(h)
        ret = self.reg_head(h)
        return logits, ret.squeeze(-1)


class TorchMLPEngine:
    """
    PyTorch MLP engine — 100% GPU for train + inference.
    Drop-in replacement for XGBoostMLEngine with same interface.
    """

    def __init__(self, use_gpu=None, gpu_url=None):
        if use_gpu is None:
            use_gpu = True

        self.gpu_url = gpu_url  # P#178/179: remote GPU service URL

        # P#179: When gpu_url is set, ALL training goes through remote GPU service.
        # Local GPU is disabled to prevent VRAM conflicts with gpu-cuda-service.py.
        if self.gpu_url:
            self.gpu_available = False
            self.device = torch.device('cpu') if HAS_TORCH else None
            print(f"  🚀 PyTorch MLP → remote GPU training: {self.gpu_url}")
        elif HAS_TORCH and TORCH_CUDA and use_gpu:
            self.gpu_available = True
            self.device = torch.device('cuda:0')
            print("  ✅ PyTorch MLP GPU engine active (device=cuda)")
        elif HAS_TORCH:
            self.gpu_available = False
            self.device = torch.device('cpu')
            print("  ❌ PyTorch MLP: no GPU service URL and no local CUDA")
        else:
            self.gpu_available = False
            self.device = None
            print("  ⚠️ PyTorch not installed — MLP engine disabled")

        self.model = None
        self.trained = False
        self.feature_names = []
        self.feature_importance = {}

        # Training state
        self.train_idx = 0
        self.last_retrain_idx = 0
        self.retrain_interval = getattr(config, 'XGBOOST_RETRAIN_INTERVAL', 200)
        self.min_train_samples = getattr(config, 'XGBOOST_MIN_TRAIN_SAMPLES', 150)
        self.warmup_candles = getattr(config, 'XGBOOST_WARMUP_CANDLES', 500)

        # Hyperparams
        self.lr = getattr(config, 'MLP_LEARNING_RATE', 1e-3)
        self.epochs = getattr(config, 'MLP_EPOCHS', 80)
        self.batch_size = getattr(config, 'MLP_BATCH_SIZE', 64)
        self.weight_decay = getattr(config, 'MLP_WEIGHT_DECAY', 1e-4)
        self.patience = getattr(config, 'MLP_PATIENCE', 10)

        # Stats
        self.prediction_count = 0
        self.correct_predictions = 0
        self.total_evaluated = 0
        self.recent_accuracy = []
        self.veto_hard_count = 0
        self.veto_soft_count = 0
        self.retrain_count = 0
        self.cv_scores = []

        # Normalization params (fit on training data)
        self._mean = None
        self._std = None

        # Feature cache
        self._feature_cache = {}

    # ----- Feature extraction (reused from XGBoostMLEngine) -----

    def _cached_features_for_index(self, df, idx):
        cache_key = int(idx)
        if cache_key in self._feature_cache:
            return self._feature_cache[cache_key]
        row = df.iloc[idx]
        history = df.iloc[max(0, idx - 200):idx]
        features = self._extract_features(row, history)
        self._feature_cache[cache_key] = features
        return features

    def _extract_features(self, row, history_df):
        """Same 45-feature set as XGBoostMLEngine for fair comparison."""
        close = row['close']
        features = {}
        if len(history_df) < 20:
            return features

        closes = history_df['close'].values.astype(float)
        highs = history_df['high'].values.astype(float)
        lows = history_df['low'].values.astype(float)
        volumes = history_df['volume'].values.astype(float)

        # GROUP 1: PRICE MOMENTUM
        for period in [5, 10, 20, 50]:
            if len(closes) > period:
                features[f'return_{period}'] = close / closes[-period] - 1
                log_ret = np.diff(np.log(closes[-period:]))
                features[f'volatility_{period}'] = np.std(log_ret) if len(log_ret) > 1 else 0
            else:
                features[f'return_{period}'] = 0
                features[f'volatility_{period}'] = 0

        # GROUP 2: MEAN REVERSION
        for period in [10, 20, 50]:
            if len(closes) >= period:
                sma = np.mean(closes[-period:])
                features[f'price_sma{period}_ratio'] = close / sma - 1 if sma > 0 else 0
                features[f'price_sma{period}_zscore'] = (close - sma) / (np.std(closes[-period:]) + 1e-10)
            else:
                features[f'price_sma{period}_ratio'] = 0
                features[f'price_sma{period}_zscore'] = 0

        # GROUP 3: VOLATILITY REGIME
        if len(closes) >= 20:
            short_vol = np.std(np.diff(np.log(closes[-5:]))) if len(closes) >= 5 else 0
            long_vol = np.std(np.diff(np.log(closes[-20:])))
            features['vol_ratio'] = short_vol / (long_vol + 1e-10)
            if len(highs) >= 14:
                tr_hl = highs[-14:] - lows[-14:]
                prev_close = np.roll(closes[-14:], 1)
                prev_close[0] = closes[-15] if len(closes) > 14 else closes[-14]
                tr_hc = np.abs(highs[-14:] - prev_close)
                tr_lc = np.abs(lows[-14:] - prev_close)
                tr = np.maximum(tr_hl, np.maximum(tr_hc, tr_lc))
                features['atr_pct'] = np.mean(tr) / close if close > 0 else 0
            else:
                features['atr_pct'] = 0
            features['high_low_range'] = (highs[-1] - lows[-1]) / close if close > 0 else 0
            features['close_position'] = (close - lows[-1]) / (highs[-1] - lows[-1] + 1e-10)
        else:
            features['vol_ratio'] = 1
            features['atr_pct'] = 0
            features['high_low_range'] = 0
            features['close_position'] = 0.5

        # GROUP 4: VOLUME PROFILE
        if len(volumes) >= 20:
            vol_ma20 = np.mean(volumes[-20:])
            features['vol_ratio_20'] = volumes[-1] / (vol_ma20 + 1e-10)
            features['vol_trend'] = np.mean(volumes[-5:]) / (np.mean(volumes[-20:]) + 1e-10)
            features['vol_spike'] = 1.0 if volumes[-1] > vol_ma20 * 2 else 0.0
            features['vol_dry'] = 1.0 if volumes[-1] < vol_ma20 * 0.3 else 0.0
        else:
            features['vol_ratio_20'] = 1
            features['vol_trend'] = 1
            features['vol_spike'] = 0
            features['vol_dry'] = 0

        # GROUP 5: TECHNICAL INDICATORS
        features['rsi_14'] = row.get('rsi_14', 50) / 100.0
        features['macd_hist'] = row.get('macd_hist', 0) / (close * 0.01 + 1e-10)
        features['bb_pctb'] = row.get('bb_pctb', 0.5)
        features['adx'] = row.get('adx', 20) / 100.0
        features['roc_10'] = row.get('roc_10', 0)
        ema9 = row.get('ema_9', close)
        ema21 = row.get('ema_21', close)
        sma50 = row.get('sma_50', close)
        features['ema9_21_cross'] = (ema9 - ema21) / (close * 0.01 + 1e-10)
        features['price_ema9_ratio'] = close / ema9 - 1 if ema9 > 0 else 0
        features['price_ema21_ratio'] = close / ema21 - 1 if ema21 > 0 else 0
        features['ema21_sma50_ratio'] = ema21 / sma50 - 1 if sma50 > 0 else 0
        supertrend = row.get('supertrend', close)
        features['supertrend_signal'] = 1.0 if close > supertrend else -1.0

        # GROUP 6: REGIME INDICATORS
        if len(closes) >= 100:
            half = len(closes) // 2
            r1 = np.max(closes[:half]) - np.min(closes[:half])
            r2 = np.max(closes[half:]) - np.min(closes[half:])
            s1 = np.std(closes[:half]) + 1e-10
            s2 = np.std(closes[half:]) + 1e-10
            features['hurst_proxy'] = np.log((r1 / s1 + r2 / s2) / 2 + 1e-10) / np.log(len(closes) + 1)
        else:
            features['hurst_proxy'] = 0.5
        features['trend_strength'] = row.get('adx', 20) / 50.0
        features['trend_direction'] = 1.0 if close > sma50 else -1.0

        # GROUP 7: CANDLE PATTERNS
        body = abs(close - row['open'])
        total_range = row['high'] - row['low'] + 1e-10
        features['body_ratio'] = body / total_range
        features['upper_shadow'] = (row['high'] - max(close, row['open'])) / total_range
        features['lower_shadow'] = (min(close, row['open']) - row['low']) / total_range
        features['is_bullish'] = 1.0 if close > row['open'] else 0.0

        # GROUP 8: MOMENTUM DERIVATIVES
        if len(closes) >= 20:
            roc_5 = (close / closes[-5] - 1) if len(closes) >= 5 else 0
            roc_10_val = (close / closes[-10] - 1) if len(closes) >= 10 else 0
            features['roc_acceleration'] = roc_5 - roc_10_val / 2
            features['revert_speed_10'] = -features.get('price_sma10_ratio', 0) * 0.5
            if len(closes) >= 5:
                diffs = np.diff(closes[-5:])
                features['consec_up'] = sum(1 for d in diffs if d > 0) / len(diffs)
                features['consec_down'] = sum(1 for d in diffs if d < 0) / len(diffs)
            else:
                features['consec_up'] = 0.5
                features['consec_down'] = 0.5
        else:
            features['roc_acceleration'] = 0
            features['revert_speed_10'] = 0
            features['consec_up'] = 0.5
            features['consec_down'] = 0.5

        return features

    # ----- Training data preparation -----

    def _prepare_training_data(self, df, start_idx, end_idx, horizon=1):
        X_list = []
        y_dir_list = []
        y_ret_list = []
        threshold = getattr(config, 'XGBOOST_LABEL_THRESHOLD', 0.001)

        for i in range(max(start_idx, 50), end_idx - horizon):
            features = self._cached_features_for_index(df, i)
            if not features:
                continue
            future_close = df.iloc[i + horizon]['close']
            current_close = df.iloc[i]['close']
            future_return = (future_close - current_close) / current_close

            if future_return > threshold:
                direction = 1
            elif future_return < -threshold:
                direction = 0
            else:
                continue

            X_list.append(features)
            y_dir_list.append(direction)
            y_ret_list.append(future_return)

        if not X_list:
            return None, None, None

        X = pd.DataFrame(X_list)
        X = X.replace([np.inf, -np.inf], np.nan).fillna(0)
        self.feature_names = list(X.columns)
        return X.values.astype(np.float32), np.array(y_dir_list, dtype=np.int64), np.array(y_ret_list, dtype=np.float32)

    # ----- GPU Training -----

    def _normalize(self, X):
        """Z-score normalization using stored params."""
        return (X - self._mean) / (self._std + 1e-8)

    def _fit_normalizer(self, X):
        """Fit normalization params on training data."""
        self._mean = X.mean(axis=0)
        self._std = X.std(axis=0)

    def _train_model(self, X, y_dir, y_ret):
        """Train MLP on GPU with early stopping (GPU only)."""
        if not HAS_TORCH:
            return False

        # P#179: When gpu_url is set, ALWAYS use remote GPU. No CPU fallback.
        if self.gpu_url:
            return self._train_model_remote(X, y_dir, y_ret)

        # P#179: Local CUDA available → train locally on GPU
        if self.gpu_available:
            return self._train_model_local(X, y_dir, y_ret)

        # P#179: No GPU at all → refuse to train
        print("  ❌ MLP training BLOCKED: no GPU available (set --gpu-url or install CUDA)")
        return False

    def _train_model_remote(self, X, y_dir, y_ret):
        """P#178: Train MLP on remote GPU service and load state_dict locally."""
        try:
            payload = {
                'X': X.tolist(),
                'y_dir': y_dir.tolist(),
                'y_ret': y_ret.tolist(),
                'hidden': [
                    getattr(config, 'MLP_HIDDEN1', 128),
                    getattr(config, 'MLP_HIDDEN2', 64),
                    getattr(config, 'MLP_HIDDEN3', 32),
                ],
                'lr': self.lr,
                'epochs': self.epochs,
                'batch_size': self.batch_size,
                'weight_decay': self.weight_decay,
                'patience': self.patience,
                'dropout': getattr(config, 'MLP_DROPOUT', 0.3),
                'symbol': getattr(self, '_current_symbol', 'UNKNOWN'),
            }

            data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                f'{self.gpu_url}/gpu/mlp-train',
                data=data,
                headers={'Content-Type': 'application/json'},
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=60.0) as resp:
                result = json.loads(resp.read().decode('utf-8'))

            n_features = result.get('n_features', X.shape[1])

            # Load normalization params
            mean_b64 = result.get('mean_b64')
            std_b64 = result.get('std_b64')
            if mean_b64:
                self._mean = np.frombuffer(base64.b64decode(mean_b64), dtype=np.float32).copy()
            if std_b64:
                self._std = np.frombuffer(base64.b64decode(std_b64), dtype=np.float32).copy()

            # Rebuild model architecture on CPU
            self.model = _TradingMLP(n_features).to(self.device)

            # Load state_dict from serialized tensors
            sd_serialized = result.get('state_dict', {})
            state_dict = {}
            for key, meta in sd_serialized.items():
                arr = np.frombuffer(
                    base64.b64decode(meta['data_b64']),
                    dtype=np.dtype(meta['dtype']),
                ).reshape(meta['shape']).copy()
                state_dict[key] = torch.tensor(arr, device=self.device)
            self.model.load_state_dict(state_dict)
            self.model.eval()

            val_acc = result.get('val_accuracy', 0.5)
            self.cv_scores = [val_acc]
            self.trained = True
            self.retrain_count += 1
            self.last_retrain_idx = self.train_idx

            up_ratio = result.get('up_ratio', 0.5)
            epochs_used = result.get('epochs_used', 0)
            training_ms = result.get('training_ms', 0)
            backend = result.get('backend', 'unknown')
            print(f"  🧠 MLP-GPU trained [{backend}]: {len(X)} samples, {n_features} features, "
                  f"{epochs_used} epochs, val_acc={val_acc:.3f}, UP={up_ratio:.1%} ({training_ms:.0f}ms)")
            return True

        except Exception as e:
            print(f"  ❌ Remote GPU MLP training FAILED: {e}")
            print(f"  ❌ GPU service at {self.gpu_url} unreachable — check gpu-cuda-service.py")
            return False

    def _train_model_local(self, X, y_dir, y_ret):
        """Train MLP locally (original implementation)."""

        n_features = X.shape[1]
        self._fit_normalizer(X)
        X_norm = self._normalize(X)

        # 80/20 train/val split (time-ordered)
        split = int(len(X_norm) * 0.8)
        X_train, X_val = X_norm[:split], X_norm[split:]
        y_dir_train, y_dir_val = y_dir[:split], y_dir[split:]
        y_ret_train, y_ret_val = y_ret[:split], y_ret[split:]

        # To GPU tensors
        X_t = torch.tensor(X_train, dtype=torch.float32, device=self.device)
        y_d_t = torch.tensor(y_dir_train, dtype=torch.long, device=self.device)
        y_r_t = torch.tensor(y_ret_train, dtype=torch.float32, device=self.device)
        X_v = torch.tensor(X_val, dtype=torch.float32, device=self.device)
        y_d_v = torch.tensor(y_dir_val, dtype=torch.long, device=self.device)
        y_r_v = torch.tensor(y_ret_val, dtype=torch.float32, device=self.device)

        self.model = _TradingMLP(n_features).to(self.device)
        optimizer = torch.optim.AdamW(self.model.parameters(), lr=self.lr, weight_decay=self.weight_decay)
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)
        clf_loss_fn = nn.CrossEntropyLoss()
        reg_loss_fn = nn.MSELoss()

        best_val_loss = float('inf')
        patience_counter = 0
        best_state = None

        for epoch in range(self.epochs):
            # --- Train ---
            self.model.train()
            perm = torch.randperm(len(X_t), device=self.device)
            epoch_loss = 0.0
            n_batches = 0

            for start in range(0, len(X_t), self.batch_size):
                idx = perm[start:start + self.batch_size]
                if len(idx) < 2:
                    continue  # BatchNorm requires batch_size >= 2
                xb = X_t[idx]
                ydb = y_d_t[idx]
                yrb = y_r_t[idx]

                logits, ret_pred = self.model(xb)
                loss = clf_loss_fn(logits, ydb) + 0.5 * reg_loss_fn(ret_pred, yrb)

                optimizer.zero_grad()
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
                optimizer.step()
                epoch_loss += loss.item()
                n_batches += 1

            # --- Validate ---
            self.model.eval()
            with torch.no_grad():
                val_logits, val_ret = self.model(X_v)
                val_loss = (clf_loss_fn(val_logits, y_d_v) + 0.5 * reg_loss_fn(val_ret, y_r_v)).item()
                val_acc = (val_logits.argmax(dim=1) == y_d_v).float().mean().item()

            scheduler.step(val_loss)

            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                best_state = {k: v.clone() for k, v in self.model.state_dict().items()}
            else:
                patience_counter += 1
                if patience_counter >= self.patience:
                    break

        if best_state is not None:
            self.model.load_state_dict(best_state)
        self.model.eval()

        # CV score estimate from final val accuracy
        self.cv_scores = [val_acc]
        self.trained = True
        self.retrain_count += 1
        self.last_retrain_idx = self.train_idx

        up_ratio = np.mean(y_dir == 1)
        epochs_used = epoch + 1
        print(f"  🧠 MLP-GPU trained: {len(X)} samples, {n_features} features, "
              f"{epochs_used} epochs, val_acc={val_acc:.3f}, UP={up_ratio:.1%}")

        # Feature importance via gradient-based saliency
        self._compute_feature_importance(X_t[:min(500, len(X_t))], y_d_t[:min(500, len(X_t))])

        return True

    def _compute_feature_importance(self, X_t, y_t):
        """Gradient saliency for feature importance."""
        self.model.eval()
        X_t = X_t.detach().requires_grad_(True)
        logits, _ = self.model(X_t)
        target_logits = logits.gather(1, y_t.unsqueeze(1)).sum()
        target_logits.backward()
        importance = X_t.grad.abs().mean(dim=0).cpu().numpy()
        self.feature_importance = {
            name: float(imp) for name, imp in zip(self.feature_names, importance)
        }

    # ----- Public interface (same as XGBoostMLEngine) -----

    def train_initial(self, df, warmup_end_idx):
        if not HAS_TORCH:
            print("  ⚠️ PyTorch not installed — MLP engine disabled")
            return False

        X, y_dir, y_ret = self._prepare_training_data(df, 50, warmup_end_idx, horizon=1)
        if X is None or len(X) < self.min_train_samples:
            print(f"  ⚠️ MLP: Insufficient training data: {len(X) if X is not None else 0}")
            return False

        return self._train_model(X, y_dir, y_ret)

    def maybe_retrain(self, df, current_idx):
        if not HAS_TORCH:
            return

        candles_since = current_idx - self.last_retrain_idx
        if candles_since < self.retrain_interval:
            return

        train_start = max(50, current_idx - self.warmup_candles)
        X, y_dir, y_ret = self._prepare_training_data(df, train_start, current_idx)
        if X is not None and len(X) >= self.min_train_samples:
            self.train_idx = current_idx
            self._train_model(X, y_dir, y_ret)

    def predict(self, row, history_df, regime, candle_idx=None, df=None):
        self.prediction_count += 1

        if not self.trained or not HAS_TORCH or self.model is None:
            return self._heuristic_predict(row, history_df, regime)

        if df is not None and candle_idx is not None:
            features = self._cached_features_for_index(df, candle_idx)
        else:
            features = self._extract_features(row, history_df)
        if not features:
            return self._heuristic_predict(row, history_df, regime)

        X = np.array([[features.get(name, 0) for name in self.feature_names]], dtype=np.float32)
        X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

        # P#182b: Use locally-stored model for prediction (no HTTP per candle!)
        # Training happens on remote GPU, but inference uses downloaded model (fast local)
        try:
            if self._mean is not None:
                X = self._normalize(X)
            with torch.no_grad():
                X_t = torch.tensor(X, dtype=torch.float32, device=self.device)
                logits, ret_pred = self.model(X_t)
                proba = torch.softmax(logits, dim=1).cpu().numpy()[0]
                expected_return = ret_pred.cpu().item()
        except Exception:
            return self._heuristic_predict(row, history_df, regime)

        min_prob = getattr(config, 'XGBOOST_MIN_PROBABILITY', 0.55)

        if proba[1] > min_prob:
            action = 'BUY'
            confidence = float(proba[1])
        elif proba[0] > min_prob:
            action = 'SELL'
            confidence = float(proba[0])
        else:
            action = 'HOLD'
            confidence = float(max(proba))

        mean_cv = np.mean(self.cv_scores) if self.cv_scores else 0.5
        if mean_cv < 0.55:
            cv_trust = max(0.3, (mean_cv - 0.45) / 0.10)
            confidence *= cv_trust

        if regime == 'RANGING':
            confidence *= 0.85
        elif regime == 'HIGH_VOLATILITY':
            confidence *= 0.90

        top_features = dict(sorted(
            self.feature_importance.items(), key=lambda x: -x[1]
        )[:5])

        return {
            'action': action,
            'confidence': min(0.95, confidence),
            'source': 'MLP-GPU',
            'raw_score': float(proba[1] - proba[0]),
            'expected_return': float(expected_return),
            'probabilities': {'UP': float(proba[1]), 'DOWN': float(proba[0])},
            'feature_importance': top_features,
        }

    def _heuristic_predict(self, row, history_df, regime):
        close = row['close']
        rsi = row.get('rsi_14', 50)
        macd_hist = row.get('macd_hist', 0)
        bb_pctb = row.get('bb_pctb', 0.5)
        adx = row.get('adx', 20)
        ema9 = row.get('ema_9', close)
        ema21 = row.get('ema_21', close)

        score = 0.0
        if rsi < 30: score += 0.25
        elif rsi > 70: score -= 0.25
        elif rsi < 40: score += 0.10
        elif rsi > 60: score -= 0.10
        if macd_hist > 0: score += 0.15
        elif macd_hist < 0: score -= 0.15
        if bb_pctb < 0.15: score += 0.15
        elif bb_pctb > 0.85: score -= 0.15
        if close > ema21 and ema9 > ema21: score += 0.10
        elif close < ema21 and ema9 < ema21: score -= 0.10
        if adx > 25: score *= 1.2
        if regime == 'RANGING': score *= 0.7

        if score > 0.15:
            action = 'BUY'
            confidence = min(0.90, 0.40 + abs(score))
        elif score < -0.15:
            action = 'SELL'
            confidence = min(0.90, 0.40 + abs(score))
        else:
            action = 'HOLD'
            confidence = 0.20

        return {
            'action': action,
            'confidence': confidence,
            'source': 'Heuristic_Fallback',
            'raw_score': round(score, 3),
        }

    def apply_ml_veto(self, signals, ml_signal):
        ml_action = ml_signal['action']
        ml_conf = ml_signal['confidence']
        if ml_action == 'HOLD':
            return signals

        modified = {}
        for name, sig in signals.items():
            sig_action = sig.get('action', 'HOLD')
            sig_conf = sig.get('confidence', 0)
            is_conflict = (
                (ml_action == 'BUY' and sig_action == 'SELL') or
                (ml_action == 'SELL' and sig_action == 'BUY')
            )
            if is_conflict:
                if ml_conf > 0.80:
                    modified[name] = {'action': 'HOLD', 'confidence': 0.0}
                    self.veto_hard_count += 1
                elif ml_conf > 0.60:
                    modified[name] = {'action': sig_action, 'confidence': sig_conf * 0.70}
                    self.veto_soft_count += 1
                else:
                    modified[name] = sig
            else:
                modified[name] = sig
        return modified

    def learn_from_trade(self, pnl, hold_hours):
        self.total_evaluated += 1
        if pnl > 0:
            self.correct_predictions += 1
        self.recent_accuracy.append(1 if pnl > 0 else 0)
        if len(self.recent_accuracy) > 50:
            self.recent_accuracy.pop(0)

    def get_stats(self):
        recent_acc = np.mean(self.recent_accuracy) if self.recent_accuracy else 0
        return {
            'engine': 'MLP-GPU' if self.trained else 'Heuristic_Fallback',
            'gpu_active': self.gpu_available,
            'device': str(self.device) if self.device else 'none',
            'total_predictions': self.prediction_count,
            'trades_evaluated': self.total_evaluated,
            'overall_accuracy': round(self.correct_predictions / max(self.total_evaluated, 1) * 100, 1),
            'recent_accuracy': round(recent_acc * 100, 1),
            'veto_hard': self.veto_hard_count,
            'veto_soft': self.veto_soft_count,
            'retrain_count': self.retrain_count,
            'cv_scores': [round(s, 3) for s in self.cv_scores],
            'features_count': len(self.feature_names),
            'top_features': dict(sorted(
                self.feature_importance.items(), key=lambda x: -x[1]
            )[:10]) if self.feature_importance else {},
        }
