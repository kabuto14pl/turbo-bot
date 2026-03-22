"""
📊 TURBO-BOT — Statistical Regime Detection

Replaces: MarketRegimeDetector (200 params neural, circular reasoning)
Method: Statistical (Hurst + ADX + volatility clustering + trend R²)

Regimes:
  - TRENDING_UP: Hurst > 0.55, ADX > 25, positive slope
  - TRENDING_DOWN: Hurst > 0.55, ADX > 25, negative slope  
  - RANGING: Hurst ≈ 0.5, ADX < 20, low R²
  - HIGH_VOLATILITY: Vol ratio > 2.0 or annualized vol > 60%

No neural networks, no circular reasoning, no training on own labels.
Pure statistical tests with well-defined thresholds from finance literature.
"""

import numpy as np
from scipy import stats


class StatisticalRegimeDetector:
    """
    Statistical regime detection — industry standard approach.
    Uses: Hurst exponent + ADX + volatility analysis + trend regression.
    """
    
    def __init__(self):
        self.current_regime = 'UNKNOWN'
        self.regime_confidence = 0
        self.regime_stats = {}
        self.regime_history = []  # Last 20 regime observations
    
    def detect(self, prices, high=None, low=None, lookback=100):
        """
        Detect current market regime from price data.
        
        Args:
            prices: Array of close prices (min 100 values)
            high: Array of high prices (optional, for ADX)
            low: Array of low prices (optional, for ADX)
            lookback: Window size for analysis
            
        Returns:
            dict with regime, confidence, statistics
        """
        if len(prices) < max(50, lookback):
            return {
                'regime': 'UNKNOWN',
                'confidence': 0,
                'statistics': {},
            }
        
        prices = np.array(prices[-lookback:], dtype=float)
        returns = np.diff(np.log(prices))
        
        # 1. HURST EXPONENT — trending vs mean-reverting
        hurst = self._compute_hurst(prices)
        
        # 2. VOLATILITY REGIME
        vol_short = np.std(returns[-10:]) * np.sqrt(252 * 24)  # annualized (assuming hourly)
        vol_long = np.std(returns[-50:]) * np.sqrt(252 * 24) if len(returns) >= 50 else vol_short
        vol_ratio = vol_short / (vol_long + 1e-8)
        
        # 3. TREND STRENGTH — linear regression R²
        x = np.arange(len(prices))
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, prices)
        trend_r2 = r_value ** 2
        trend_direction = 1 if slope > 0 else -1
        
        # Relative slope (% per candle)
        rel_slope = slope / prices[-1] if prices[-1] > 0 else 0
        
        # 4. ADX (if high/low provided)
        adx = 20  # default
        if high is not None and low is not None and len(high) >= lookback:
            adx = self._compute_adx(
                np.array(high[-lookback:], dtype=float),
                np.array(low[-lookback:], dtype=float),
                prices,
                14
            )
        
        # 5. REGIME CLASSIFICATION
        regime, confidence = self._classify_regime(
            hurst, vol_ratio, vol_short, trend_r2, trend_direction, adx, p_value
        )
        
        self.current_regime = regime
        self.regime_confidence = confidence
        self.regime_stats = {
            'hurst': round(float(hurst), 4),
            'vol_ratio': round(float(vol_ratio), 4),
            'vol_annualized': round(float(vol_short), 4),
            'trend_r2': round(float(trend_r2), 4),
            'trend_direction': int(trend_direction),
            'rel_slope': round(float(rel_slope), 6),
            'adx': round(float(adx), 2),
            'p_value': round(float(p_value), 6),
        }
        
        # Track regime history
        self.regime_history.append(regime)
        if len(self.regime_history) > 20:
            self.regime_history = self.regime_history[-20:]
        
        return {
            'regime': regime,
            'confidence': round(confidence, 4),
            'statistics': self.regime_stats,
            'regime_stability': self._compute_stability(),
        }
    
    def _classify_regime(self, hurst, vol_ratio, vol_short, trend_r2, trend_dir, adx, p_value):
        """
        Classify regime using statistical thresholds.
        Based on finance literature + empirical crypto market analysis.
        """
        # Priority 1: HIGH VOLATILITY (overrides everything)
        if vol_ratio > 2.0 or vol_short > 0.80:
            confidence = min(0.95, 0.5 + vol_ratio * 0.15)
            return 'HIGH_VOLATILITY', confidence
        
        # Priority 2: TRENDING (strong directional movement)
        if adx > 25 and trend_r2 > 0.25 and hurst > 0.52 and p_value < 0.05:
            confidence = min(0.92, 0.5 + trend_r2 * 0.35 + (adx - 25) * 0.005)
            if trend_dir > 0:
                return 'TRENDING_UP', confidence
            else:
                return 'TRENDING_DOWN', confidence
        
        # Weaker trend signal (relaxed conditions)
        if adx > 20 and trend_r2 > 0.15 and hurst > 0.50:
            confidence = min(0.75, 0.45 + trend_r2 * 0.25)
            if trend_dir > 0:
                return 'TRENDING_UP', confidence
            else:
                return 'TRENDING_DOWN', confidence
        
        # Priority 3: RANGING (no clear direction)
        confidence = min(0.85, 0.5 + (1 - trend_r2) * 0.25)
        return 'RANGING', confidence
    
    def _compute_stability(self):
        """
        Compute regime stability — how consistent is the current regime.
        Returns: float 0-1 (1 = very stable, same regime for 20 periods)
        """
        if len(self.regime_history) < 3:
            return 0.5
        
        current = self.regime_history[-1]
        matches = sum(1 for r in self.regime_history[-10:] if r == current)
        return matches / min(10, len(self.regime_history))
    
    @staticmethod
    def _compute_hurst(prices, max_lag=20):
        """
        Rescaled range (R/S) analysis — Hurst exponent.
        
        H > 0.5: Trending (persistent)
        H < 0.5: Mean-reverting (anti-persistent)
        H ≈ 0.5: Random walk
        """
        if len(prices) < max_lag + 5:
            return 0.5
        
        lags = range(2, min(max_lag, len(prices) // 3))
        tau_values = []
        
        for lag in lags:
            pp = np.subtract(prices[lag:], prices[:-lag])
            std_val = np.std(pp)
            if std_val > 1e-10:
                tau_values.append(np.sqrt(std_val))
            else:
                tau_values.append(1e-8)
        
        if len(tau_values) < 3:
            return 0.5
        
        try:
            log_lags = np.log(list(lags)[:len(tau_values)])
            log_tau = np.log(tau_values)
            poly = np.polyfit(log_lags, log_tau, 1)
            hurst = max(0.0, min(1.0, poly[0] * 2.0))
            return hurst
        except:
            return 0.5
    
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
            
            plus_dm_list.append(up_move if (up_move > down_move and up_move > 0) else 0)
            minus_dm_list.append(down_move if (down_move > up_move and down_move > 0) else 0)
        
        if len(tr_list) < period:
            return 20
        
        tr_arr = np.array(tr_list)
        plus_dm = np.array(plus_dm_list)
        minus_dm = np.array(minus_dm_list)
        
        atr = np.mean(tr_arr[:period])
        pdi_smooth = np.mean(plus_dm[:period])
        mdi_smooth = np.mean(minus_dm[:period])
        
        dx_values = []
        for i in range(period, len(tr_arr)):
            # Wilder smoothing: avg = (prev_avg * (period-1) + new_val) / period
            atr = (atr * (period - 1) + tr_arr[i]) / period
            pdi_smooth = (pdi_smooth * (period - 1) + plus_dm[i]) / period
            mdi_smooth = (mdi_smooth * (period - 1) + minus_dm[i]) / period
            
            plus_di = 100 * pdi_smooth / (atr + 1e-8)
            minus_di = 100 * mdi_smooth / (atr + 1e-8)
            
            di_sum = plus_di + minus_di
            if di_sum > 0:
                dx_values.append(abs(plus_di - minus_di) / di_sum * 100)
        
        if len(dx_values) < period:
            return 20
        
        adx = np.mean(dx_values[:period])
        for i in range(period, len(dx_values)):
            adx = (adx * (period - 1) + dx_values[i]) / period
        
        return adx
    
    def get_trading_recommendations(self):
        """
        Get regime-based trading recommendations.
        Returns sizing multiplier and strategy preferences.
        """
        recommendations = {
            'TRENDING_UP': {
                'sizing_mult': 1.0,
                'prefer_strategies': ['MomentumPro', 'SuperTrend'],
                'avoid_strategies': ['RSITurbo'],
                'advice': 'Follow trend. Use breakout entries. Trail stops.',
            },
            'TRENDING_DOWN': {
                'sizing_mult': 0.8,
                'prefer_strategies': ['MomentumPro', 'SuperTrend'],
                'avoid_strategies': ['RSITurbo'],
                'advice': 'Follow trend down. Short bias. Tight stops.',
            },
            'RANGING': {
                'sizing_mult': 0.5,
                'prefer_strategies': ['RSITurbo', 'AdvancedAdaptive'],
                'avoid_strategies': ['SuperTrend', 'MACrossover'],
                'advice': 'Mean reversion. Small size. Avoid trend-following.',
            },
            'HIGH_VOLATILITY': {
                'sizing_mult': 0.3,
                'prefer_strategies': [],
                'avoid_strategies': ['MACrossover', 'MomentumPro'],
                'advice': 'Reduce exposure. Widen stops. Consider sitting out.',
            },
            'UNKNOWN': {
                'sizing_mult': 0.5,
                'prefer_strategies': [],
                'avoid_strategies': [],
                'advice': 'Insufficient data. Use conservative sizing.',
            },
        }
        
        rec = recommendations.get(self.current_regime, recommendations['UNKNOWN'])
        rec['regime'] = self.current_regime
        rec['confidence'] = self.regime_confidence
        rec['stability'] = self._compute_stability()
        
        return rec


# Convenience function for use in ml_service.py
def detect_regime(prices, high=None, low=None, lookback=100):
    """
    Standalone regime detection function.
    
    Args:
        prices: Close prices array
        high: High prices array (optional)
        low: Low prices array (optional)
        lookback: Analysis window
        
    Returns:
        dict with regime, confidence, statistics
    """
    detector = StatisticalRegimeDetector()
    return detector.detect(prices, high, low, lookback)
