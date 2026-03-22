"""
🧠 TURBO-BOT — ML Feature Engineering
Feature engineering is 10x more important than model choice.

Groups:
1. Price Momentum (co-integrated returns)
2. Mean Reversion (price vs SMA ratios)
3. Volatility Regime (short/long vol ratio)
4. Volume Profile (volume ratios + trend)
5. Technical Indicators (RSI, MACD, BB)
6. Regime Indicators (Hurst, ADX)
7. Time Features (cyclical hour/day)
8. Candle Patterns (body ratio, shadows)
9. Microstructure / Advanced
10. Candlestick Pattern Formations (engulfing, hammer, doji, star, etc.)
"""

import numpy as np
import pandas as pd
from scipy import stats
from candle_patterns import CandlePatternEngine


class FeatureExtractor:
    """Extract ~61 proven features for crypto price prediction."""
    
    # Features that must exist
    REQUIRED_COLUMNS = ['open', 'high', 'low', 'close', 'volume']
    
    # Regime encoding map (VQC/NeuralAI regime → numeric)
    REGIME_MAP = {
        'TRENDING_UP': 1.0,
        'TRENDING_DOWN': -1.0,
        'RANGING': 0.0,
        'HIGH_VOLATILITY': 0.5,
        'LOW_VOLATILITY': -0.5,
        'UNKNOWN': 0.0,
    }
    
    def __init__(self):
        self.feature_names = None
        self.feature_count = 0
        self.candle_engine = CandlePatternEngine()
    
    def extract(self, df, lookback=200, regime='UNKNOWN'):
        """
        Extract features from OHLCV DataFrame.
        
        Args:
            df: DataFrame with OHLCV data (min 200 rows)
            lookback: Number of candles to use for feature computation
            
        Returns:
            dict of feature_name → value
        """
        if len(df) < lookback:
            lookback = len(df)
        
        data = df.iloc[-lookback:].copy()
        close = data['close'].values.astype(float)
        high = data['high'].values.astype(float)
        low = data['low'].values.astype(float)
        volume = data['volume'].values.astype(float)
        
        features = {}
        
        # === GROUP 1: PRICE MOMENTUM ===
        for period in [5, 10, 20, 50]:
            if len(close) > period:
                features[f'return_{period}'] = close[-1] / close[-period] - 1
                log_returns = np.diff(np.log(close[-period:]))
                features[f'volatility_{period}'] = np.std(log_returns) if len(log_returns) > 1 else 0
            else:
                features[f'return_{period}'] = 0
                features[f'volatility_{period}'] = 0
        
        # Rate of change acceleration
        if len(close) > 20:
            roc_10 = close[-1] / close[-10] - 1
            roc_20 = close[-1] / close[-20] - 1
            features['roc_acceleration'] = roc_10 - roc_20 / 2
        else:
            features['roc_acceleration'] = 0
        
        # === GROUP 2: MEAN REVERSION ===
        if len(close) >= 50:
            sma20 = np.mean(close[-20:])
            sma50 = np.mean(close[-50:])
            features['price_sma20_ratio'] = close[-1] / sma20 - 1
            features['price_sma50_ratio'] = close[-1] / sma50 - 1
            features['sma20_sma50_ratio'] = sma20 / sma50 - 1
        else:
            features['price_sma20_ratio'] = 0
            features['price_sma50_ratio'] = 0
            features['sma20_sma50_ratio'] = 0
        
        # Z-score of price vs moving average
        if len(close) >= 20:
            sma20 = np.mean(close[-20:])
            std20 = np.std(close[-20:])
            features['price_zscore'] = (close[-1] - sma20) / (std20 + 1e-8)
        else:
            features['price_zscore'] = 0
        
        # === GROUP 3: VOLATILITY REGIME ===
        if len(close) >= 50 and len(high) >= 15:
            vol_short = np.std(np.diff(np.log(close[-10:])))
            vol_long = np.std(np.diff(np.log(close[-50:])))
            features['vol_ratio'] = vol_short / (vol_long + 1e-8)
            
            # ATR %
            h14 = high[-14:]
            l14 = low[-14:]
            c_prev = close[-15:-1]  # previous close aligned with h14/l14
            tr = np.maximum(h14 - l14,
                           np.maximum(np.abs(h14 - c_prev), np.abs(l14 - c_prev)))
            features['atr_pct'] = np.mean(tr) / close[-1]
        else:
            features['vol_ratio'] = 1.0
            features['atr_pct'] = 0.01
        
        # Bollinger Band width (volatility measure)
        if len(close) >= 20:
            bb_std = np.std(close[-20:])
            bb_mean = np.mean(close[-20:])
            features['bb_width'] = 2 * bb_std / bb_mean
        else:
            features['bb_width'] = 0.02
        
        # === GROUP 4: VOLUME PROFILE ===
        if len(volume) >= 20:
            avg_vol = np.mean(volume[-20:])
            features['vol_ratio_20'] = volume[-1] / (avg_vol + 1e-8)
            features['vol_trend'] = np.mean(volume[-5:]) / (np.mean(volume[-20:]) + 1e-8)
            
            # VWAP deviation
            vwap = np.sum(close[-20:] * volume[-20:]) / (np.sum(volume[-20:]) + 1e-8)
            features['vwap_deviation'] = close[-1] / vwap - 1
        else:
            features['vol_ratio_20'] = 1.0
            features['vol_trend'] = 1.0
            features['vwap_deviation'] = 0
        
        # Volume on up vs down candles
        if len(close) >= 20 and len(volume) >= 20:
            up_mask = np.diff(close[-21:]) > 0
            down_mask = np.diff(close[-21:]) <= 0
            vol_changes = volume[-20:]
            up_vol = np.mean(vol_changes[up_mask]) if np.any(up_mask) else 1
            down_vol = np.mean(vol_changes[down_mask]) if np.any(down_mask) else 1
            features['up_down_vol_ratio'] = up_vol / (down_vol + 1e-8)
        else:
            features['up_down_vol_ratio'] = 1.0
        
        # === GROUP 5: TECHNICAL INDICATORS ===
        features['rsi_14'] = self._compute_rsi(close, 14)
        features['macd_hist'] = self._compute_macd_histogram(close)
        features['bb_pctb'] = self._compute_bb_pctb(close, 20)
        
        # Stochastic RSI
        if len(close) >= 28:
            rsi_values = []
            for i in range(14):
                rsi_values.append(self._compute_rsi(close[:-(13-i) if (13-i) > 0 else len(close)], 14))
            rsi_arr = np.array(rsi_values)
            stoch_rsi = (features['rsi_14'] - np.min(rsi_arr)) / (np.max(rsi_arr) - np.min(rsi_arr) + 1e-8)
            features['stoch_rsi'] = stoch_rsi
        else:
            features['stoch_rsi'] = 0.5
        
        # === GROUP 6: REGIME INDICATORS ===
        if len(close) >= 100:
            features['hurst'] = self._compute_hurst_exponent(close[-100:])
        else:
            features['hurst'] = 0.5
        
        # ADX
        if len(close) >= 28:
            features['adx_14'] = self._compute_adx(high, low, close, 14)
        else:
            features['adx_14'] = 20
        
        # Trend R²
        if len(close) >= 50:
            x = np.arange(50)
            _, _, r_value, p_value, _ = stats.linregress(x, close[-50:])
            features['trend_r2'] = r_value ** 2
            features['trend_p_value'] = p_value
        else:
            features['trend_r2'] = 0
            features['trend_p_value'] = 1.0
        
        # === GROUP 7: TIME FEATURES ===
        if hasattr(df.index, 'hour') or (hasattr(df, 'index') and hasattr(df.index[-1], 'hour')):
            try:
                last_time = df.index[-1]
                features['hour_sin'] = np.sin(2 * np.pi * last_time.hour / 24)
                features['hour_cos'] = np.cos(2 * np.pi * last_time.hour / 24)
                features['day_of_week'] = last_time.dayofweek / 6
            except:
                features['hour_sin'] = 0
                features['hour_cos'] = 1
                features['day_of_week'] = 0
        else:
            features['hour_sin'] = 0
            features['hour_cos'] = 1
            features['day_of_week'] = 0
        
        # === GROUP 8: CANDLE PATTERNS ===
        if len(close) >= 3:
            body = abs(close[-1] - data['open'].values[-1])
            total_range = high[-1] - low[-1] + 1e-8
            features['body_ratio'] = body / total_range
            features['upper_shadow'] = (high[-1] - max(close[-1], data['open'].values[-1])) / total_range
            features['lower_shadow'] = (min(close[-1], data['open'].values[-1]) - low[-1]) / total_range
            
            # Last 3 candles direction
            features['candle_dir_1'] = 1 if close[-1] > data['open'].values[-1] else -1
            features['candle_dir_2'] = 1 if close[-2] > data['open'].values[-2] else -1
            features['candle_dir_3'] = 1 if close[-3] > data['open'].values[-3] else -1
        else:
            features['body_ratio'] = 0.5
            features['upper_shadow'] = 0.25
            features['lower_shadow'] = 0.25
            features['candle_dir_1'] = 0
            features['candle_dir_2'] = 0
            features['candle_dir_3'] = 0
        
        # === GROUP 9: MICROSTRUCTURE / ADVANCED ===
        
        # Garman-Klass volatility (better than close-to-close)
        if len(close) >= 20:
            gk_sum = 0
            opens = data['open'].values.astype(float)
            for j in range(-20, 0):
                hl = np.log(high[j] / low[j])
                co = np.log(close[j] / opens[j])
                gk_sum += 0.5 * hl ** 2 - (2 * np.log(2) - 1) * co ** 2
            features['gk_volatility'] = np.sqrt(gk_sum / 20)
        else:
            features['gk_volatility'] = 0.01
        
        # Parkinson volatility (uses high-low only, more efficient)
        if len(close) >= 20:
            hl_log = np.log(high[-20:] / low[-20:])
            features['parkinson_vol'] = np.sqrt(np.mean(hl_log ** 2) / (4 * np.log(2)))
        else:
            features['parkinson_vol'] = 0.01
        
        # Volume momentum oscillator (vol acceleration)
        if len(volume) >= 30:
            vol_sma5 = np.mean(volume[-5:])
            vol_sma10 = np.mean(volume[-10:])
            vol_sma30 = np.mean(volume[-30:])
            features['vol_momentum'] = (vol_sma5 / (vol_sma10 + 1e-8)) - 1
            features['vol_acceleration'] = (vol_sma5 / (vol_sma30 + 1e-8)) - 1
        else:
            features['vol_momentum'] = 0
            features['vol_acceleration'] = 0
        
        # Net buying pressure proxy (close position within bar)
        if len(close) >= 10:
            buying_pressure = []
            for j in range(-10, 0):
                rng = high[j] - low[j]
                if rng > 0:
                    bp = (close[j] - low[j]) / rng  # 0=sold at low, 1=bought at high
                else:
                    bp = 0.5
                buying_pressure.append(bp)
            features['buying_pressure_avg'] = np.mean(buying_pressure)
            features['buying_pressure_trend'] = np.mean(buying_pressure[-3:]) - np.mean(buying_pressure[:3])
        else:
            features['buying_pressure_avg'] = 0.5
            features['buying_pressure_trend'] = 0
        
        # Price acceleration (2nd derivative)
        if len(close) >= 15:
            ret5 = close[-1] / close[-5] - 1
            ret5_prev = close[-5] / close[-10] - 1
            features['price_acceleration'] = ret5 - ret5_prev
        else:
            features['price_acceleration'] = 0
        
        # High-Low range % change (expansion/contraction)
        if len(close) >= 20:
            range_recent = np.mean(high[-5:] - low[-5:])
            range_older = np.mean(high[-20:-5] - low[-20:-5])
            features['range_expansion'] = range_recent / (range_older + 1e-8) - 1
        else:
            features['range_expansion'] = 0
        
        # Consecutive candles pattern (streak)
        if len(close) >= 10:
            opens_arr = data['open'].values.astype(float)
            streak = 0
            for j in range(-1, -11, -1):
                if close[j] > opens_arr[j]:
                    if streak >= 0:
                        streak += 1
                    else:
                        break
                else:
                    if streak <= 0:
                        streak -= 1
                    else:
                        break
            features['candle_streak'] = streak / 10.0  # Normalized
        else:
            features['candle_streak'] = 0
        
        # Volatility-adjusted return (signal-to-noise)
        if len(close) >= 20:
            ret_20 = close[-1] / close[-20] - 1
            vol_20 = np.std(np.diff(np.log(close[-20:])))
            features['vol_adj_return'] = ret_20 / (vol_20 + 1e-8)
        else:
            features['vol_adj_return'] = 0
        
        # === GROUP 10: CANDLESTICK PATTERN FORMATIONS ===
        # Detected patterns: engulfing, hammer, doji, morning/evening star, etc.
        # These features capture ENTRY QUALITY — when to enter, not just direction.
        cp_features = self.candle_engine.extract_features(data)
        features.update(cp_features)
        
        # === GROUP 11: REGIME CONTEXT (from VQC/NeuralAI or statistical detection) ===
        # Regime information from quantum VQC classifier or statistical detector.
        # Encodes market regime as numeric features for ensemble model.
        regime_val = self.REGIME_MAP.get(regime, 0.0)
        features['regime_encoded'] = regime_val
        features['regime_is_trending'] = 1.0 if abs(regime_val) >= 0.9 else 0.0
        features['regime_is_ranging'] = 1.0 if regime in ('RANGING', 'LOW_VOLATILITY') else 0.0
        
        # Store feature names
        self.feature_names = list(features.keys())
        self.feature_count = len(features)
        
        return features
    
    def extract_batch(self, df, lookback=200, horizon=1):
        """
        Extract features for all rows with labels for training.
        
        Args:
            df: Full DataFrame with OHLCV
            lookback: Feature window size
            horizon: Future candles for label
            
        Returns:
            X (DataFrame), y_direction (array), y_return (array)
        """
        # Import statistical regime detector for training labels
        try:
            from regime_detection import StatisticalRegimeDetector
            stat_regime = StatisticalRegimeDetector()
        except ImportError:
            stat_regime = None
        
        rows = []
        y_dir = []
        y_ret = []
        
        for i in range(lookback, len(df) - horizon):
            window = df.iloc[i - lookback:i + 1]
            
            # Detect regime statistically for training data
            regime = 'UNKNOWN'
            if stat_regime is not None:
                try:
                    close_w = window['close'].values
                    high_w = window['high'].values if 'high' in window.columns else None
                    low_w = window['low'].values if 'low' in window.columns else None
                    r = stat_regime.detect(close_w, high=high_w, low=low_w, lookback=min(100, len(close_w)))
                    regime = r.get('regime', 'UNKNOWN')
                except Exception:
                    pass
            
            features = self.extract(window, lookback=lookback, regime=regime)
            rows.append(features)
            
            # Label: future return
            future_price = df.iloc[i + horizon]['close']
            current_price = df.iloc[i]['close']
            ret = future_price / current_price - 1
            y_ret.append(ret)
            
            # Direction label with neutral zone
            # 0.2% threshold — filter noise, only label clear moves
            fee_threshold = 0.002
            if ret > fee_threshold:
                y_dir.append(1)  # UP
            elif ret < -fee_threshold:
                y_dir.append(0)  # DOWN
            else:
                y_dir.append(-1)  # NEUTRAL (filtered out during training)
        
        X = pd.DataFrame(rows)
        return X, np.array(y_dir), np.array(y_ret)
    
    # ======================================================================
    # HELPER METHODS
    # ======================================================================
    
    @staticmethod
    def _compute_rsi(close, period=14):
        """RSI calculation."""
        if len(close) < period + 1:
            return 50
        deltas = np.diff(close[-(period + 1):])
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        avg_gain = np.mean(gains)
        avg_loss = np.mean(losses)
        if avg_loss == 0:
            return 100
        rs = avg_gain / avg_loss
        return 100 - 100 / (1 + rs)
    
    @staticmethod
    def _compute_macd_histogram(close):
        """MACD histogram using EMA12/26/9."""
        if len(close) < 26:
            return 0
        ema12 = pd.Series(close).ewm(span=12).mean().values[-1]
        ema26 = pd.Series(close).ewm(span=26).mean().values[-1]
        macd_line = ema12 - ema26
        signal_line = pd.Series(
            pd.Series(close).ewm(span=12).mean() - pd.Series(close).ewm(span=26).mean()
        ).ewm(span=9).mean().values[-1]
        return macd_line - signal_line
    
    @staticmethod
    def _compute_bb_pctb(close, period=20):
        """Bollinger Band %B."""
        if len(close) < period:
            return 0.5
        sma = np.mean(close[-period:])
        std = np.std(close[-period:])
        if std == 0:
            return 0.5
        upper = sma + 2 * std
        lower = sma - 2 * std
        return (close[-1] - lower) / (upper - lower + 1e-8)
    
    @staticmethod
    def _compute_hurst_exponent(prices, max_lag=20):
        """Rescaled range (R/S) analysis — Hurst exponent."""
        if len(prices) < max_lag + 2:
            return 0.5
        lags = range(2, min(max_lag, len(prices) // 2))
        tau = []
        for lag in lags:
            pp = np.subtract(prices[lag:], prices[:-lag])
            std_val = np.std(pp)
            if std_val > 0:
                tau.append(np.sqrt(std_val))
            else:
                tau.append(1e-8)
        if len(tau) < 2:
            return 0.5
        poly = np.polyfit(np.log(list(lags)[:len(tau)]), np.log(tau), 1)
        return max(0, min(1, poly[0] * 2.0))
    
    @staticmethod
    def _compute_adx(high, low, close, period=14):
        """ADX with Wilder smoothing."""
        if len(close) < period * 2:
            return 20
        
        tr_list = []
        plus_dm_list = []
        minus_dm_list = []
        
        for i in range(1, len(close)):
            hl = high[i] - low[i]
            hpc = abs(high[i] - close[i-1])
            lpc = abs(low[i] - close[i-1])
            tr_list.append(max(hl, hpc, lpc))
            
            up_move = high[i] - high[i-1]
            down_move = low[i-1] - low[i]
            
            if up_move > down_move and up_move > 0:
                plus_dm_list.append(up_move)
            else:
                plus_dm_list.append(0)
            
            if down_move > up_move and down_move > 0:
                minus_dm_list.append(down_move)
            else:
                minus_dm_list.append(0)
        
        if len(tr_list) < period:
            return 20
        
        tr_arr = np.array(tr_list)
        plus_dm = np.array(plus_dm_list)
        minus_dm = np.array(minus_dm_list)
        
        # Wilder smoothing
        atr = np.mean(tr_arr[:period])
        plus_di = np.mean(plus_dm[:period])
        minus_di = np.mean(minus_dm[:period])
        
        dx_values = []
        for i in range(period, len(tr_arr)):
            atr = (atr * (period - 1) + tr_arr[i]) / period
            plus_di = (plus_di * (period - 1) + plus_dm[i]) / period
            minus_di = (minus_di * (period - 1) + minus_dm[i]) / period
            
            plus_di_val = 100 * plus_di / (atr + 1e-8)
            minus_di_val = 100 * minus_di / (atr + 1e-8)
            
            di_sum = plus_di_val + minus_di_val
            if di_sum > 0:
                dx_values.append(abs(plus_di_val - minus_di_val) / di_sum * 100)
        
        if len(dx_values) < period:
            return 20
        
        adx = np.mean(dx_values[:period])
        for i in range(period, len(dx_values)):
            adx = (adx * (period - 1) + dx_values[i]) / period
        
        return adx
