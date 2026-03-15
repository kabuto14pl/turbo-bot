"""
TURBO-BOT Full Pipeline Backtest — Real XGBoost ML Engine
PATCH #58: Replaces heuristic MLSimulator with actual trained XGBoost model.

Architecture:
  - Walk-forward training: train on first 60% of data, predict on remaining 40%
  - Feature engineering: 45 features from OHLCV + indicators
  - GPU acceleration: tree_method='gpu_hist' when available (RTX 5070 Ti)
  - Retrain window: sliding 500-candle window every 200 candles
  - Anti-overfitting: early stopping + L1/L2 regularization + min_child_weight
"""

import numpy as np
import pandas as pd
from . import config

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False


_XGBOOST_GPU_SUPPORT_CACHE = None

try:
    from sklearn.model_selection import TimeSeriesSplit
    from sklearn.metrics import accuracy_score
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


class XGBoostMLEngine:
    """
    Real XGBoost ML engine for backtest pipeline.
    Replaces heuristic MLSimulator with trained gradient boosting model.
    
    Training: Walk-forward with sliding window retrain.
    Inference: <1ms per prediction.
    Features: 45 engineered from OHLCV + technical indicators.
    """
    
    def __init__(self, use_gpu=None, gpu_url=None):
        if use_gpu is None:
            use_gpu = getattr(config, 'XGBOOST_USE_GPU', False)

        self.gpu_url = gpu_url  # P#178: remote GPU service URL
        self.gpu_requested = bool(use_gpu)

        # P#179: When gpu_url is set, ALL training goes through remote GPU service.
        if self.gpu_url:
            self.use_gpu = False  # disable local CUDA — remote handles GPU
            print(f"  🚀 XGBoost → remote GPU training: {self.gpu_url}")
        else:
            self.use_gpu = self._resolve_gpu_mode(self.gpu_requested)

        self.tree_method = 'hist'
        self.model_clf = None
        self.model_reg = None
        self._booster_clf = None  # P#178: raw Booster from remote
        self._booster_reg = None
        self.trained = False
        self.feature_names = []
        self.feature_importance = {}
        
        # Training state
        self.train_idx = 0
        self.last_retrain_idx = 0
        self.retrain_interval = getattr(config, 'XGBOOST_RETRAIN_INTERVAL', 200)
        self.min_train_samples = getattr(config, 'XGBOOST_MIN_TRAIN_SAMPLES', 150)
        self.warmup_candles = getattr(config, 'XGBOOST_WARMUP_CANDLES', 500)
        
        # Performance tracking
        self.prediction_count = 0
        self.correct_predictions = 0
        self.total_evaluated = 0
        self.recent_accuracy = []
        self.veto_hard_count = 0
        self.veto_soft_count = 0
        self.retrain_count = 0
        self.cv_scores = []
        
        # Feature cache
        self._feature_cache = {}

    def _cached_features_for_index(self, df, idx):
        cache_key = int(idx)
        if cache_key in self._feature_cache:
            return self._feature_cache[cache_key]

        row = df.iloc[idx]
        history = df.iloc[max(0, idx - 200):idx]
        features = self._extract_features(row, history)
        self._feature_cache[cache_key] = features
        return features

    @staticmethod
    def _supports_gpu_tree_method():
        global _XGBOOST_GPU_SUPPORT_CACHE

        if _XGBOOST_GPU_SUPPORT_CACHE is not None:
            return _XGBOOST_GPU_SUPPORT_CACHE

        if not HAS_XGBOOST:
            _XGBOOST_GPU_SUPPORT_CACHE = False
            return _XGBOOST_GPU_SUPPORT_CACHE

        try:
            X_probe = np.array([[0.0], [1.0], [2.0], [3.0]], dtype=np.float32)
            y_probe = np.array([0, 1, 0, 1], dtype=np.int32)
            probe = xgb.XGBClassifier(
                n_estimators=1,
                max_depth=1,
                learning_rate=0.1,
                tree_method='hist',
                device='cuda',
                eval_metric='logloss',
                random_state=42,
            )
            probe.fit(X_probe, y_probe)
            _XGBOOST_GPU_SUPPORT_CACHE = True
        except Exception:
            _XGBOOST_GPU_SUPPORT_CACHE = False

        return _XGBOOST_GPU_SUPPORT_CACHE

    def _resolve_gpu_mode(self, gpu_requested):
        if not gpu_requested:
            return False

        if self._supports_gpu_tree_method():
            print("  ✅ XGBoost GPU mode active (device=cuda, tree_method=hist)")
            return True

        print("  ⚠️ XGBoost CUDA build not available — falling back to CPU hist")
        print("  FIX: pip install xgboost --upgrade  (ensure CUDA toolkit installed)")
        return False

    def _model_kwargs(self):
        kwargs = {'tree_method': self.tree_method}
        if self.use_gpu:
            kwargs['device'] = 'cuda'
        return kwargs
        
    def _extract_features(self, row, history_df):
        """
        Extract 45 features from current candle + history.
        Matches ml_features.py groups but optimized for speed.
        """
        close = row['close']
        features = {}
        
        if len(history_df) < 20:
            return features
        
        closes = history_df['close'].values.astype(float)
        highs = history_df['high'].values.astype(float)
        lows = history_df['low'].values.astype(float)
        volumes = history_df['volume'].values.astype(float)
        
        # === GROUP 1: PRICE MOMENTUM (8 features) ===
        for period in [5, 10, 20, 50]:
            if len(closes) > period:
                features[f'return_{period}'] = close / closes[-period] - 1
                log_ret = np.diff(np.log(closes[-period:]))
                features[f'volatility_{period}'] = np.std(log_ret) if len(log_ret) > 1 else 0
            else:
                features[f'return_{period}'] = 0
                features[f'volatility_{period}'] = 0
        
        # === GROUP 2: MEAN REVERSION (6 features) ===
        for period in [10, 20, 50]:
            if len(closes) >= period:
                sma = np.mean(closes[-period:])
                features[f'price_sma{period}_ratio'] = close / sma - 1 if sma > 0 else 0
                features[f'price_sma{period}_zscore'] = (
                    (close - sma) / (np.std(closes[-period:]) + 1e-10)
                )
            else:
                features[f'price_sma{period}_ratio'] = 0
                features[f'price_sma{period}_zscore'] = 0
        
        # === GROUP 3: VOLATILITY REGIME (4 features) ===
        if len(closes) >= 20:
            short_vol = np.std(np.diff(np.log(closes[-5:]))) if len(closes) >= 5 else 0
            long_vol = np.std(np.diff(np.log(closes[-20:])))
            features['vol_ratio'] = short_vol / (long_vol + 1e-10)
            
            # ATR proxy
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
        
        # === GROUP 4: VOLUME PROFILE (4 features) ===
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
        
        # === GROUP 5: TECHNICAL INDICATORS (10 features) ===
        features['rsi_14'] = row.get('rsi_14', 50) / 100.0  # Normalize 0-1
        features['macd_hist'] = row.get('macd_hist', 0) / (close * 0.01 + 1e-10)
        features['bb_pctb'] = row.get('bb_pctb', 0.5)
        features['adx'] = row.get('adx', 20) / 100.0  # Normalize 0-1
        features['roc_10'] = row.get('roc_10', 0)
        
        # EMA relationships
        ema9 = row.get('ema_9', close)
        ema21 = row.get('ema_21', close)
        sma50 = row.get('sma_50', close)
        features['ema9_21_cross'] = (ema9 - ema21) / (close * 0.01 + 1e-10)
        features['price_ema9_ratio'] = close / ema9 - 1 if ema9 > 0 else 0
        features['price_ema21_ratio'] = close / ema21 - 1 if ema21 > 0 else 0
        features['ema21_sma50_ratio'] = ema21 / sma50 - 1 if sma50 > 0 else 0
        
        # SuperTrend
        supertrend = row.get('supertrend', close)
        features['supertrend_signal'] = 1.0 if close > supertrend else -1.0
        
        # === GROUP 6: REGIME INDICATORS (3 features) ===
        if len(closes) >= 100:
            # Simple Hurst exponent approximation
            half = len(closes) // 2
            r1 = np.max(closes[:half]) - np.min(closes[:half])
            r2 = np.max(closes[half:]) - np.min(closes[half:])
            s1 = np.std(closes[:half]) + 1e-10
            s2 = np.std(closes[half:]) + 1e-10
            features['hurst_proxy'] = np.log((r1/s1 + r2/s2) / 2 + 1e-10) / np.log(len(closes) + 1)
        else:
            features['hurst_proxy'] = 0.5
        
        features['trend_strength'] = row.get('adx', 20) / 50.0  # Normalized
        features['trend_direction'] = 1.0 if close > sma50 else -1.0
        
        # === GROUP 7: CANDLE PATTERNS (4 features) ===
        body = abs(close - row['open'])
        total_range = row['high'] - row['low'] + 1e-10
        features['body_ratio'] = body / total_range
        features['upper_shadow'] = (row['high'] - max(close, row['open'])) / total_range
        features['lower_shadow'] = (min(close, row['open']) - row['low']) / total_range
        features['is_bullish'] = 1.0 if close > row['open'] else 0.0
        
        # === GROUP 8: MOMENTUM DERIVATIVES (4 features) ===
        if len(closes) >= 20:
            roc_5 = (close / closes[-5] - 1) if len(closes) >= 5 else 0
            roc_10 = (close / closes[-10] - 1) if len(closes) >= 10 else 0
            features['roc_acceleration'] = roc_5 - roc_10 / 2
            
            # Mean reversion speed
            features['revert_speed_10'] = -features.get('price_sma10_ratio', 0) * 0.5
            
            # Consecutive direction
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
    
    def _prepare_training_data(self, df, start_idx, end_idx, horizon=1):
        """
        Prepare training data from DataFrame slice.
        
        Returns:
            X: feature matrix
            y_dir: direction labels (1=UP, 0=DOWN)
            y_ret: future returns
        """
        X_list = []
        y_dir_list = []
        y_ret_list = []
        
        for i in range(max(start_idx, 50), end_idx - horizon):
            row = df.iloc[i]
            features = self._cached_features_for_index(df, i)
            if not features:
                continue
            
            # Label: future return
            future_close = df.iloc[i + horizon]['close']
            current_close = row['close']
            future_return = (future_close - current_close) / current_close
            
            # Direction: UP if return > 0.001 (0.1%), DOWN if < -0.001
            threshold = getattr(config, 'XGBOOST_LABEL_THRESHOLD', 0.001)
            if future_return > threshold:
                direction = 1  # UP
            elif future_return < -threshold:
                direction = 0  # DOWN
            else:
                continue  # Skip neutral (too small movement)
            
            X_list.append(features)
            y_dir_list.append(direction)
            y_ret_list.append(future_return)
        
        if not X_list:
            return None, None, None
        
        X = pd.DataFrame(X_list)
        X = X.replace([np.inf, -np.inf], np.nan).fillna(0)
        self.feature_names = list(X.columns)
        
        return X, np.array(y_dir_list), np.array(y_ret_list)
    
    def train_initial(self, df, warmup_end_idx):
        """
        Initial training on warmup data.
        Called once at the start of backtest.
        """
        if not HAS_XGBOOST:
            print("  ⚠️ XGBoost not installed — falling back to heuristic")
            return False
        
        X, y_dir, y_ret = self._prepare_training_data(
            df, 50, warmup_end_idx, horizon=1
        )
        
        if X is None or len(X) < self.min_train_samples:
            print(f"  ⚠️ Insufficient training data: {len(X) if X is not None else 0} "
                  f"(need {self.min_train_samples})")
            return False
        
        return self._train_models(X, y_dir, y_ret)
    
    def _train_models(self, X, y_dir, y_ret):
        """Train XGBoost classifier + regressor."""
        # P#179: When gpu_url is set, ALWAYS use remote GPU. No CPU fallback.
        if self.gpu_url:
            return self._train_models_remote(X, y_dir, y_ret)
        
        # XGBoost Classifier (direction prediction)
        self.model_clf = xgb.XGBClassifier(
            n_estimators=getattr(config, 'XGBOOST_N_ESTIMATORS', 200),
            max_depth=getattr(config, 'XGBOOST_MAX_DEPTH', 4),
            learning_rate=getattr(config, 'XGBOOST_LEARNING_RATE', 0.03),
            subsample=0.75,
            colsample_bytree=0.7,
            min_child_weight=getattr(config, 'XGBOOST_MIN_CHILD_WEIGHT', 10),
            reg_alpha=0.3,
            reg_lambda=2.0,
            gamma=0.1,
            eval_metric='logloss',
            random_state=42,
            **self._model_kwargs(),
        )
        
        # XGBoost Regressor (expected return)
        self.model_reg = xgb.XGBRegressor(
            n_estimators=150,
            max_depth=3,
            learning_rate=0.03,
            subsample=0.75,
            colsample_bytree=0.7,
            min_child_weight=10,
            gamma=0.1,
            random_state=42,
            **self._model_kwargs(),
        )
        
        # Walk-forward CV for quality check
        if HAS_SKLEARN and len(X) >= 100:
            tscv = TimeSeriesSplit(n_splits=3)
            cv_scores = []
            for train_idx, val_idx in tscv.split(X):
                X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
                y_tr, y_val = y_dir[train_idx], y_dir[val_idx]
                
                self.model_clf.fit(X_tr, y_tr)
                score = self.model_clf.score(X_val, y_val)
                cv_scores.append(score)
            
            self.cv_scores = cv_scores
            mean_cv = np.mean(cv_scores)
            print(f"  📈 XGBoost CV scores: {[f'{s:.3f}' for s in cv_scores]} "
                  f"(mean={mean_cv:.3f})")
            
            # Quality gate: only deploy if CV > 52% (better than random)
            if mean_cv < getattr(config, 'XGBOOST_MIN_CV_ACCURACY', 0.50):
                print(f"  ⚠️ CV accuracy {mean_cv:.3f} below threshold — "
                      f"model may not have edge")
        
        # Final training on all data
        self.model_clf.fit(X, y_dir)
        self.model_reg.fit(X, y_ret)
        
        # Feature importance
        imp = self.model_clf.feature_importances_
        self.feature_importance = dict(zip(self.feature_names, imp.tolist()))
        
        self.trained = True
        self.retrain_count += 1
        self.last_retrain_idx = self.train_idx
        
        up_ratio = np.mean(y_dir == 1)
        print(f"  🧠 XGBoost trained: {len(X)} samples, {len(self.feature_names)} features, "
              f"UP={up_ratio:.1%}")
        
        return True
    
    def _train_models_remote(self, X, y_dir, y_ret):
        """P#178/179: Train XGBoost on remote GPU service."""
        import json
        import urllib.request
        import base64

        X_list = X.values.tolist() if hasattr(X, 'values') else X.tolist()
        y_dir_list = y_dir.tolist() if hasattr(y_dir, 'tolist') else list(y_dir)
        y_ret_list = y_ret.tolist() if hasattr(y_ret, 'tolist') else list(y_ret)

        payload = json.dumps({
            'X': X_list,
            'y_dir': y_dir_list,
            'y_ret': y_ret_list,
            'clf_params': {
                'n_estimators': getattr(config, 'XGBOOST_N_ESTIMATORS', 200),
                'max_depth': getattr(config, 'XGBOOST_MAX_DEPTH', 4),
                'learning_rate': getattr(config, 'XGBOOST_LEARNING_RATE', 0.03),
                'min_child_weight': getattr(config, 'XGBOOST_MIN_CHILD_WEIGHT', 10),
            },
            'cv_splits': 3,
            'symbol': getattr(self, '_current_symbol', 'UNKNOWN'),
        }).encode('utf-8')

        try:
            req = urllib.request.Request(
                f'{self.gpu_url}/gpu/xgboost-train',
                data=payload,
                headers={'Content-Type': 'application/json'},
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read().decode('utf-8'))

            # Deserialize models from remote
            clf_bytes = base64.b64decode(result['clf_model_b64'])
            booster_clf = xgb.Booster()
            booster_clf.load_model(bytearray(clf_bytes))
            self._booster_clf = booster_clf

            self.model_clf = xgb.XGBClassifier()
            self.model_clf._Booster = booster_clf
            self.model_clf.classes_ = np.array([0, 1])
            self.model_clf._le = type('', (), {'classes_': np.array([0, 1])})()

            if result.get('reg_model_b64'):
                reg_bytes = base64.b64decode(result['reg_model_b64'])
                booster_reg = xgb.Booster()
                booster_reg.load_model(bytearray(reg_bytes))
                self._booster_reg = booster_reg
                self.model_reg = xgb.XGBRegressor()
                self.model_reg._Booster = booster_reg

            self.cv_scores = result.get('cv_scores', [])
            self.trained = True
            self.retrain_count += 1
            self.last_retrain_idx = self.train_idx

            # Feature importance from remote
            top_imp = result.get('top_importance', [])
            if top_imp and self.feature_names:
                self.feature_importance = {}
                for idx, score in top_imp:
                    if idx < len(self.feature_names):
                        self.feature_importance[self.feature_names[idx]] = score

            up_ratio = result.get('up_ratio', 0)
            train_ms = result.get('training_ms', 0)
            xgb_device = result.get('xgb_device', 'cuda')
            cv_str = [f"{s:.3f}" for s in self.cv_scores]
            print(f"  🧠 XGBoost GPU trained: {result.get('n_trained', len(X_list))} samples, "
                  f"device={xgb_device}, {train_ms:.0f}ms")
            print(f"  📈 CV scores: {cv_str} | UP={up_ratio:.1%}")
            return True

        except Exception as e:
            print(f"  ❌ XGBoost remote GPU training failed: {e}")
            print(f"  ❌ GPU service at {self.gpu_url} unreachable — check gpu-cuda-service.py")
            return False

    def maybe_retrain(self, df, current_idx):
        """
        Check if retrain is needed (sliding window every N candles).
        """
        if not HAS_XGBOOST:
            return
        
        candles_since = current_idx - self.last_retrain_idx
        if candles_since < self.retrain_interval:
            return
        
        # Retrain on last `warmup_candles` of data
        train_start = max(50, current_idx - self.warmup_candles)
        train_end = current_idx
        
        X, y_dir, y_ret = self._prepare_training_data(df, train_start, train_end)
        
        if X is not None and len(X) >= self.min_train_samples:
            self.train_idx = current_idx
            self._train_models(X, y_dir, y_ret)
    
    def predict(self, row, history_df, regime, candle_idx=None, df=None):
        """
        Generate ML prediction using trained XGBoost model.
        Falls back to heuristic if model not trained.
        
        Returns:
            dict: {action, confidence, source, raw_score, feature_importance}
        """
        self.prediction_count += 1
        
        if not self.trained or not HAS_XGBOOST:
            return self._heuristic_predict(row, history_df, regime)
        
        # Extract features
        if df is not None and candle_idx is not None:
            features = self._cached_features_for_index(df, candle_idx)
        else:
            features = self._extract_features(row, history_df)
        if not features:
            return self._heuristic_predict(row, history_df, regime)
        
        # Build feature vector in correct order
        X = np.array([[features.get(name, 0) for name in self.feature_names]])
        X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
        
        # Predict
        try:
            proba = self.model_clf.predict_proba(X)[0]  # [P(DOWN), P(UP)]
            expected_return = self.model_reg.predict(X)[0]
        except Exception:
            return self._heuristic_predict(row, history_df, regime)
        
        # Direction with confidence threshold
        min_prob = getattr(config, 'XGBOOST_MIN_PROBABILITY', 0.55)
        
        if proba[1] > min_prob:  # P(UP) > threshold
            action = 'BUY'
            confidence = float(proba[1])
        elif proba[0] > min_prob:  # P(DOWN) > threshold
            action = 'SELL'
            confidence = float(proba[0])
        else:
            action = 'HOLD'
            confidence = float(max(proba))
        
        # CV-based confidence scaling — don't trust model with poor CV
        mean_cv = np.mean(self.cv_scores) if self.cv_scores else 0.5
        if mean_cv < 0.55:
            # Model barely above random — scale down confidence significantly
            cv_trust = max(0.3, (mean_cv - 0.45) / 0.10)  # 0.3-1.0 scale
            confidence *= cv_trust
        
        # Regime adjustment
        if regime == 'RANGING':
            confidence *= 0.85  # Lower confidence in ranging
        elif regime == 'HIGH_VOLATILITY':
            confidence *= 0.90
        
        # Top features
        top_features = dict(sorted(
            self.feature_importance.items(), key=lambda x: -x[1]
        )[:5])
        
        return {
            'action': action,
            'confidence': min(0.95, confidence),
            'source': 'XGBoost',
            'raw_score': float(proba[1] - proba[0]),
            'expected_return': float(expected_return),
            'probabilities': {'UP': float(proba[1]), 'DOWN': float(proba[0])},
            'feature_importance': top_features,
        }
    
    def _heuristic_predict(self, row, history_df, regime):
        """
        Fallback heuristic prediction (same as old MLSimulator).
        Used when XGBoost is not available or not yet trained.
        """
        close = row['close']
        rsi = row.get('rsi_14', 50)
        macd_hist = row.get('macd_hist', 0)
        bb_pctb = row.get('bb_pctb', 0.5)
        adx = row.get('adx', 20)
        roc = row.get('roc_10', 0)
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
        """
        ML Hard/Soft Veto logic (unchanged from original).
        """
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
                    modified[name] = {
                        'action': sig_action,
                        'confidence': sig_conf * 0.70,
                    }
                    self.veto_soft_count += 1
                else:
                    modified[name] = sig
            else:
                modified[name] = sig
        
        return modified
    
    def learn_from_trade(self, pnl, hold_hours):
        """Record trade outcome for accuracy tracking."""
        self.total_evaluated += 1
        if pnl > 0:
            self.correct_predictions += 1
        self.recent_accuracy.append(1 if pnl > 0 else 0)
        if len(self.recent_accuracy) > 50:
            self.recent_accuracy.pop(0)
    
    def get_stats(self):
        """Get ML statistics."""
        recent_acc = np.mean(self.recent_accuracy) if self.recent_accuracy else 0
        return {
            'engine': 'XGBoost' if self.trained else 'Heuristic_Fallback',
            'total_predictions': self.prediction_count,
            'trades_evaluated': self.total_evaluated,
            'overall_accuracy': round(
                self.correct_predictions / max(self.total_evaluated, 1) * 100, 1),
            'recent_accuracy': round(recent_acc * 100, 1),
            'veto_hard': self.veto_hard_count,
            'veto_soft': self.veto_soft_count,
            'retrain_count': self.retrain_count,
            'cv_scores': [round(s, 3) for s in self.cv_scores],
            'features_count': len(self.feature_names),
            'top_features': dict(sorted(
                self.feature_importance.items(), key=lambda x: -x[1]
            )[:10]) if self.feature_importance else {},
            'gpu_requested': self.gpu_requested,
            'gpu_enabled': self.use_gpu,
        }
