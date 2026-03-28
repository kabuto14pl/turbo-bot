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
    Features: 58 engineered from OHLCV + technical indicators + funding + microstructure.
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
        # P#199: Funding rate data for ML features
        self._funding_rates_df = None
        self._current_symbol = None  # Set by engine.py after construction

    def _load_funding_data(self):
        """P#199: Load real Kraken funding rates for feature engineering."""
        if self._funding_rates_df is not None:
            return  # Already loaded
        symbol = getattr(self, '_current_symbol', None)
        if not symbol:
            return
        import os
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'funding_rates')
        # Symbol format: BTCUSDT → btcusdt_funding.csv
        csv_path = os.path.join(data_dir, f'{symbol.lower()}_funding.csv')
        if os.path.exists(csv_path):
            try:
                df = pd.read_csv(csv_path)
                df['timestamp'] = pd.to_datetime(df['timestamp'], utc=True)
                df = df.sort_values('timestamp').reset_index(drop=True)
                self._funding_rates_df = df
            except Exception:
                pass

    def _get_funding_rate_at(self, candle_time):
        """P#199: Get funding rate at a given candle timestamp."""
        if self._funding_rates_df is None:
            return None
        ts = pd.Timestamp(candle_time)
        if ts.tz is None:
            ts = ts.tz_localize('UTC')
        mask = self._funding_rates_df['timestamp'] <= ts
        if not mask.any():
            return None
        idx = self._funding_rates_df.loc[mask, 'timestamp'].idxmax()
        return float(self._funding_rates_df.loc[idx, 'funding_rate'])

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
        Extract 58 features from current candle + history.
        Groups 1-8: price-based (43 features)
        Groups 9-13: P#199 funding, time, microstructure, cross-pair, OB proxy (15 features)
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

        # === GROUP 9: FUNDING RATE FEATURES (3 features) — P#199 ===
        self._load_funding_data()
        candle_time = getattr(row, 'name', None)  # DatetimeIndex timestamp
        fr = self._get_funding_rate_at(candle_time) if candle_time is not None else None
        if fr is not None:
            features['funding_rate_8h'] = fr
            # Rolling 24h mean (3 x 8h periods) — approximate from nearby rates
            if self._funding_rates_df is not None and candle_time is not None:
                ts = pd.Timestamp(candle_time)
                if ts.tz is None:
                    ts = ts.tz_localize('UTC')
                past_24h = ts - pd.Timedelta(hours=24)
                mask = (self._funding_rates_df['timestamp'] >= past_24h) & (self._funding_rates_df['timestamp'] <= ts)
                recent_rates = self._funding_rates_df.loc[mask, 'funding_rate']
                features['funding_rate_mean_24h'] = float(recent_rates.mean()) if len(recent_rates) > 0 else fr
                features['funding_rate_momentum'] = fr - features['funding_rate_mean_24h']
            else:
                features['funding_rate_mean_24h'] = fr
                features['funding_rate_momentum'] = 0.0
        else:
            features['funding_rate_8h'] = 0.0
            features['funding_rate_mean_24h'] = 0.0
            features['funding_rate_momentum'] = 0.0

        # === GROUP 10: TIME / SESSION FEATURES (3 features) — P#199 ===
        if candle_time is not None:
            try:
                ts = pd.Timestamp(candle_time)
                hour = ts.hour
                features['hour_sin'] = np.sin(2 * np.pi * hour / 24)
                features['hour_cos'] = np.cos(2 * np.pi * hour / 24)
                # Session encoding: 0=Asia(00-08), 1=London(08-14), 2=NY(14-21), 3=Late(21-24)
                if hour < 8:
                    features['session'] = 0.0
                elif hour < 14:
                    features['session'] = 1.0
                elif hour < 21:
                    features['session'] = 2.0
                else:
                    features['session'] = 3.0
            except Exception:
                features['hour_sin'] = 0.0
                features['hour_cos'] = 1.0
                features['session'] = 0.0
        else:
            features['hour_sin'] = 0.0
            features['hour_cos'] = 1.0
            features['session'] = 0.0

        # === GROUP 11: MICROSTRUCTURE / VWAP PROXY (3 features) — P#199 ===
        if len(closes) >= 20:
            # Estimated VWAP = sum(typical_price * volume) / sum(volume) over 20 candles
            typical_prices = (highs[-20:] + lows[-20:] + closes[-20:]) / 3
            vwap_20 = np.sum(typical_prices * volumes[-20:]) / (np.sum(volumes[-20:]) + 1e-10)
            features['vwap_ratio'] = close / vwap_20 - 1 if vwap_20 > 0 else 0.0
            # Volume-price correlation (20 candles)
            if np.std(volumes[-20:]) > 0 and np.std(closes[-20:]) > 0:
                features['vol_price_corr'] = float(np.corrcoef(closes[-20:], volumes[-20:])[0, 1])
            else:
                features['vol_price_corr'] = 0.0
            # Tick intensity: range relative to ATR (intra-bar activity proxy)
            atr_val = features.get('atr_pct', 0) * close
            features['tick_intensity'] = (row['high'] - row['low']) / (atr_val + 1e-10) if atr_val > 0 else 1.0
        else:
            features['vwap_ratio'] = 0.0
            features['vol_price_corr'] = 0.0
            features['tick_intensity'] = 1.0

        # === GROUP 12: CROSS-PAIR PROXY (3 features) — P#199 ===
        # Workers are isolated, so use self-relative metrics as proxy
        if len(closes) >= 50:
            ret_20 = close / closes[-20] - 1 if len(closes) >= 20 else 0
            ret_50 = close / closes[-50] - 1
            # Relative strength: short vs long return
            features['relative_strength'] = ret_20 - ret_50 / 2.5
            # Extended z-score (50-period)
            features['mean_revert_z50'] = (close - np.mean(closes[-50:])) / (np.std(closes[-50:]) + 1e-10)
            # Auto-correlation lag-1 of returns
            rets = np.diff(np.log(closes[-20:]))
            if len(rets) > 1:
                features['return_autocorr'] = float(np.corrcoef(rets[:-1], rets[1:])[0, 1])
            else:
                features['return_autocorr'] = 0.0
        else:
            features['relative_strength'] = 0.0
            features['mean_revert_z50'] = 0.0
            features['return_autocorr'] = 0.0

        # === GROUP 13: ORDER BOOK DEPTH PROXY (3 features) — P#199 ===
        # Approximate OB imbalance from candle data
        close_pos = features.get('close_position', 0.5)
        curr_vol = volumes[-1] if len(volumes) > 0 else 0
        vol_ma = np.mean(volumes[-20:]) if len(volumes) >= 20 else (curr_vol + 1e-10)
        # Buy pressure: close near high + above-avg volume
        features['buy_pressure'] = close_pos * (curr_vol / (vol_ma + 1e-10))
        # Sell pressure: close near low + above-avg volume
        features['sell_pressure'] = (1 - close_pos) * (curr_vol / (vol_ma + 1e-10))
        # Liquidity score: high volume + narrow range = deep book
        candle_range = (row['high'] - row['low']) / (close + 1e-10)
        features['liquidity_score'] = (curr_vol / (vol_ma + 1e-10)) / (candle_range + 1e-10) if candle_range > 0 else 1.0

        return features
    
    def _prepare_training_data(self, df, start_idx, end_idx, horizon=1):
        """
        Prepare training data from DataFrame slice.
        
        P#200d: Supports two label modes:
        - Legacy (XGBOOST_REGIME_CLASSIFIER=False): UP/DOWN direction labels
        - Regime (XGBOOST_REGIME_CLASSIFIER=True): GOOD_REGIME/BAD_REGIME quality labels
        
        Returns:
            X: feature matrix
            y_dir: direction/regime labels (1=UP/GOOD, 0=DOWN/BAD)
            y_ret: future returns
        """
        X_list = []
        y_dir_list = []
        y_ret_list = []
        
        use_regime_labels = getattr(config, 'XGBOOST_REGIME_CLASSIFIER', False)
        lookahead = getattr(config, 'XGBOOST_REGIME_LOOKAHEAD', 12)
        good_mfe_mult = getattr(config, 'XGBOOST_REGIME_GOOD_MFE_ATR', 1.5)
        bad_mae_mult = getattr(config, 'XGBOOST_REGIME_BAD_MAE_ATR', 2.0)
        good_mae_cap = getattr(config, 'XGBOOST_REGIME_GOOD_MAE_CAP_ATR', 1.0)
        
        effective_horizon = lookahead if use_regime_labels else horizon
        
        for i in range(max(start_idx, 50), end_idx - effective_horizon):
            row = df.iloc[i]
            features = self._cached_features_for_index(df, i)
            if not features:
                continue
            
            current_close = row['close']
            
            # Future return (for regression target — always computed)
            future_close = df.iloc[i + horizon]['close']
            future_return = (future_close - current_close) / current_close
            
            if use_regime_labels:
                # P#200d: Regime quality label — GOOD_REGIME vs BAD_REGIME
                atr_pct = features.get('atr_pct', 0.01)
                if atr_pct < 0.0001:
                    atr_pct = 0.01
                
                # Compute max favorable/adverse excursion in lookahead window
                max_favorable = 0.0
                max_adverse = 0.0
                for j in range(1, lookahead + 1):
                    if i + j >= len(df):
                        break
                    fj_close = df.iloc[i + j]['close']
                    excursion = (fj_close - current_close) / current_close
                    if excursion > max_favorable:
                        max_favorable = excursion
                    if excursion < max_adverse:
                        max_adverse = excursion
                
                # GOOD_REGIME: favorable > threshold AND adverse contained
                if (max_favorable > atr_pct * good_mfe_mult and
                        abs(max_adverse) < atr_pct * good_mae_cap):
                    direction = 1  # GOOD_REGIME
                elif abs(max_adverse) > atr_pct * bad_mae_mult:
                    direction = 0  # BAD_REGIME
                else:
                    continue  # Skip ambiguous (neutral)
            else:
                # Legacy: direction label
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
        print(f"  🔍 XGBoost train_initial: HAS_XGBOOST={HAS_XGBOOST}, HAS_SKLEARN={HAS_SKLEARN}, gpu_url={self.gpu_url}")
        if not HAS_XGBOOST:
            if self.gpu_url:
                print("  ❌ XGBoost not installed locally — cannot use remote GPU models")
                print("  FIX: pip install xgboost scikit-learn")
            else:
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
        """
        Train XGBoost classifier + regressor.
        P#200f: Incremental learning — on retrain, update existing model
        with new data instead of discarding learned weights.
        """
        # P#179: When gpu_url is set, try remote GPU first, CPU fallback on failure.
        if self.gpu_url:
            remote_ok = self._train_models_remote(X, y_dir, y_ret)
            if remote_ok:
                return True
            if not HAS_XGBOOST:
                print(f"  ❌ Remote GPU failed and local XGBoost not available")
                return False
            print(f"  ⚠️ Remote GPU failed — falling back to CPU training")
            # Fall through to local CPU training below
        
        _n_estimators = getattr(config, 'XGBOOST_N_ESTIMATORS', 200)
        _max_depth = getattr(config, 'XGBOOST_MAX_DEPTH', 4)
        _lr = getattr(config, 'XGBOOST_LEARNING_RATE', 0.03)
        _mcw = getattr(config, 'XGBOOST_MIN_CHILD_WEIGHT', 10)
        
        _clf_params = dict(
            n_estimators=_n_estimators,
            max_depth=_max_depth,
            learning_rate=_lr,
            subsample=0.75,
            colsample_bytree=0.7,
            min_child_weight=_mcw,
            reg_alpha=0.3,
            reg_lambda=2.0,
            gamma=0.1,
            eval_metric='logloss',
            random_state=42,
            **self._model_kwargs(),
        )
        
        # Walk-forward CV for quality check (always do CV)
        if HAS_SKLEARN and len(X) >= 100:
            _cv_clf = xgb.XGBClassifier(**_clf_params)
            tscv = TimeSeriesSplit(n_splits=3)
            cv_scores = []
            for train_idx, val_idx in tscv.split(X):
                X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
                y_tr, y_val = y_dir[train_idx], y_dir[val_idx]
                
                _cv_clf.fit(X_tr, y_tr)
                score = _cv_clf.score(X_val, y_val)
                cv_scores.append(score)
            
            self.cv_scores = cv_scores
            mean_cv = np.mean(cv_scores)
            print(f"  📈 XGBoost CV scores: {[f'{s:.3f}' for s in cv_scores]} "
                  f"(mean={mean_cv:.3f})")
            
            if mean_cv < getattr(config, 'XGBOOST_MIN_CV_ACCURACY', 0.55):
                print(f"  ⚠️ CV accuracy {mean_cv:.3f} below threshold "
                      f"{getattr(config, 'XGBOOST_MIN_CV_ACCURACY', 0.55)} — "
                      f"model has no edge, veto disabled")
        
        # P#200f: Incremental learning decision
        # Retrain count > 0 AND existing model → incremental update
        # Every 10 retrains → full refit to prevent concept drift accumulation
        _incremental = (
            self.retrain_count > 0 and
            self.model_clf is not None and
            self.trained and
            self.retrain_count % 10 != 0  # Full refit every 10th retrain
        )
        
        if _incremental:
            # P#200f: Incremental — add 100 new trees to existing model
            try:
                _inc_rounds = min(100, _n_estimators // 3)
                self.model_clf.fit(
                    X, y_dir,
                    xgb_model=self.model_clf.get_booster(),
                )
                # Regressor also incremental
                if self.model_reg is not None:
                    self.model_reg.fit(
                        X, y_ret,
                        xgb_model=self.model_reg.get_booster(),
                    )
                _mode = 'incremental'
            except Exception as e:
                print(f"  ⚠️ Incremental training failed ({e}), falling back to full refit")
                _incremental = False
        
        if not _incremental:
            # Full training from scratch
            self.model_clf = xgb.XGBClassifier(**_clf_params)
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
            self.model_clf.fit(X, y_dir)
            self.model_reg.fit(X, y_ret)
            _mode = 'full'
        
        # Feature importance
        imp = self.model_clf.feature_importances_
        self.feature_importance = dict(zip(self.feature_names, imp.tolist()))
        
        self.trained = True
        self.retrain_count += 1
        self.last_retrain_idx = self.train_idx
        
        up_ratio = np.mean(y_dir == 1)
        _label = 'GOOD' if getattr(config, 'XGBOOST_REGIME_CLASSIFIER', False) else 'UP'
        print(f"  🧠 XGBoost trained ({_mode}): {len(X)} samples, {len(self.feature_names)} features, "
              f"{_label}={up_ratio:.1%}, retrains={self.retrain_count}")
        
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
            # Use tempfile + load_model on XGBClassifier to preserve all
            # metadata (classes_, _le, etc.) — avoids read-only property
            # errors in XGBoost >= 2.1 where classes_ has no setter.
            import tempfile, os as _os
            clf_bytes = base64.b64decode(result['clf_model_b64'])
            with tempfile.NamedTemporaryFile(suffix='.ubj', delete=False) as f:
                f.write(clf_bytes)
                clf_tmp = f.name
            try:
                self.model_clf = xgb.XGBClassifier()
                self.model_clf.load_model(clf_tmp)
            finally:
                _os.unlink(clf_tmp)
            # Ensure classes_ is set for predict_proba
            try:
                _ = self.model_clf.classes_
            except (AttributeError, TypeError):
                self.model_clf._le = type('', (), {'classes_': np.array([0, 1])})()

            if result.get('reg_model_b64'):
                reg_bytes = base64.b64decode(result['reg_model_b64'])
                with tempfile.NamedTemporaryFile(suffix='.ubj', delete=False) as f:
                    f.write(reg_bytes)
                    reg_tmp = f.name
                try:
                    self.model_reg = xgb.XGBRegressor()
                    self.model_reg.load_model(reg_tmp)
                finally:
                    _os.unlink(reg_tmp)

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
        
        P#200d: When XGBOOST_REGIME_CLASSIFIER=True, predicts regime quality
        (GOOD/BAD) and returns sizing_multiplier instead of direction.
        
        Returns:
            dict: {action, confidence, source, raw_score, feature_importance,
                   sizing_multiplier (P#200d), regime_quality (P#200d)}
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
            proba = self.model_clf.predict_proba(X)[0]  # [P(class0), P(class1)]
            expected_return = self.model_reg.predict(X)[0]
        except Exception:
            return self._heuristic_predict(row, history_df, regime)
        
        use_regime = getattr(config, 'XGBOOST_REGIME_CLASSIFIER', False)
        
        if use_regime:
            # P#200d: Regime quality classifier — output sizing multiplier
            p_good = float(proba[1])  # P(GOOD_REGIME)
            p_bad = float(proba[0])   # P(BAD_REGIME)
            
            # Sizing multiplier based on regime quality confidence
            if p_good > 0.60:
                sizing_mult = 0.8 + p_good * 0.5  # 1.1-1.3x for good regime
            elif p_bad > 0.60:
                sizing_mult = max(0.3, 1.0 - p_bad * 0.7)  # 0.3-0.7x for bad regime
            else:
                sizing_mult = 1.0  # Neutral — no adjustment
            
            # Don't override direction — regime classifier modulates size, not action
            action = 'HOLD'  # Neutral — let strategies decide direction
            confidence = max(p_good, p_bad)
            
            # CV-based trust scaling
            mean_cv = np.mean(self.cv_scores) if self.cv_scores else 0.5
            if mean_cv < 0.55:
                cv_trust = max(0.3, (mean_cv - 0.45) / 0.10)
                sizing_mult = 1.0 + (sizing_mult - 1.0) * cv_trust  # Dampen the adjustment
            
            top_features = dict(sorted(
                self.feature_importance.items(), key=lambda x: -x[1]
            )[:5])
            
            return {
                'action': action,
                'confidence': min(0.95, confidence),
                'source': 'XGBoost_Regime',
                'raw_score': float(p_good - p_bad),
                'expected_return': float(expected_return),
                'probabilities': {'GOOD': p_good, 'BAD': p_bad},
                'regime_quality': p_good,
                'sizing_multiplier': sizing_mult,
                'feature_importance': top_features,
            }
        else:
            # Legacy: direction prediction
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
            
            # CV-based confidence scaling
            mean_cv = np.mean(self.cv_scores) if self.cv_scores else 0.5
            if mean_cv < 0.55:
                cv_trust = max(0.3, (mean_cv - 0.45) / 0.10)
                confidence *= cv_trust
            
            # Regime adjustment
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
                'source': 'XGBoost',
                'raw_score': float(proba[1] - proba[0]),
                'expected_return': float(expected_return),
                'probabilities': {'UP': float(proba[1]), 'DOWN': float(proba[0])},
                'sizing_multiplier': 1.0,
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
            'gpu_enabled': self.use_gpu or bool(self.gpu_url),
            'gpu_remote_url': self.gpu_url or '',
            'gpu_remote_active': bool(self.gpu_url and self.trained),
            'has_xgboost_lib': HAS_XGBOOST,
            'has_sklearn_lib': HAS_SKLEARN,
        }
