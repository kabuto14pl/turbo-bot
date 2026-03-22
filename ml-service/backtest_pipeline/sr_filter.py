"""
TURBO-BOT Full Pipeline Backtest — Support/Resistance + Volume + MTF Filter
PATCH #59: Entry quality improvement via structural price levels.

Three filters combined:
1. S/R Proximity: Pivot Points + Fibonacci retracement levels
2. Volume Profile: VWAP-based buying/selling pressure
3. MTF Confluence: SMA200 slope + EMA trend alignment

Usage:
    from .sr_filter import EntryQualityFilter
    eqf = EntryQualityFilter()
    result = eqf.evaluate(row, history, action, regime)
    # result = {'pass': True/False, 'confidence_adj': 0.85-1.15, 'reasons': [...]}
"""

import numpy as np
from . import config


class EntryQualityFilter:
    """
    Multi-factor entry quality filter.
    
    Soft filter — adjusts confidence rather than hard-blocking.
    Exception: very low scores (< 0.25) block entry.
    """
    
    def __init__(self):
        # S/R tracking
        self._last_pivots = None
        self._last_fibs = None
        self._pivot_update_interval = 96  # Recalc pivots every 96 candles (~1 day on 15m)
        self._candle_count = 0
        
        # Stats
        self.stats = {
            'total_evaluated': 0,
            'sr_boosts': 0,
            'sr_penalties': 0,
            'sr_blocks': 0,
            'volume_confirms': 0,
            'mtf_aligns': 0,
            'mtf_conflicts': 0,
            'mtf_blocks': 0,
        }
    
    def evaluate(self, row, history, action, regime='RANGING'):
        """
        Evaluate entry quality for a proposed trade.
        
        Args:
            row: Current candle (Series with close, high, low, volume, indicators)
            history: DataFrame of recent candles (200+ for Fibs)
            action: 'BUY' or 'SELL'
            regime: Current market regime
            
        Returns:
            dict: {
                'pass': bool,           # False = hard block
                'confidence_adj': float, # 0.70 - 1.20 multiplier
                'score': float,         # 0.0 - 1.0 composite score
                'reasons': list,        # Human-readable reasons
                'sr_proximity': float,  # Distance to nearest S/R
                'volume_score': float,
                'mtf_score': float,
            }
        """
        if action == 'HOLD':
            return {'pass': True, 'confidence_adj': 1.0, 'score': 0.5,
                    'reasons': [], 'sr_proximity': 0, 'volume_score': 0.5,
                    'mtf_score': 0.5}
        
        self._candle_count += 1
        self.stats['total_evaluated'] += 1
        close = row['close']
        atr = row.get('atr', close * 0.01)
        
        scores = []
        weights = []
        reasons = []
        
        # ================================================================
        # 1. S/R PROXIMITY (weight: 0.35)
        # ================================================================
        sr_score, sr_reasons = self._evaluate_sr(row, history, action, atr)
        scores.append(sr_score)
        weights.append(0.35)
        reasons.extend(sr_reasons)
        
        # ================================================================
        # 2. VOLUME PROFILE (weight: 0.25)
        # ================================================================
        vol_score, vol_reasons = self._evaluate_volume(row, history, action)
        scores.append(vol_score)
        weights.append(0.25)
        reasons.extend(vol_reasons)
        
        # ================================================================
        # 3. MTF CONFLUENCE (weight: 0.40)
        # ================================================================
        mtf_score, mtf_reasons, mtf_alignment_count = self._evaluate_mtf(row, history, action, regime)
        scores.append(mtf_score)
        weights.append(0.40)
        reasons.extend(mtf_reasons)

        strong_mtf_block_enabled = getattr(config, 'ENTRY_FILTER_STRONG_MTF_BLOCK_ENABLED', False)
        strong_mtf_block_threshold = getattr(config, 'ENTRY_FILTER_STRONG_MTF_BLOCK_THRESHOLD', -2)
        if (strong_mtf_block_enabled and
            regime in ('TRENDING_UP', 'TRENDING_DOWN') and
            mtf_alignment_count <= strong_mtf_block_threshold):
            self.stats['mtf_blocks'] += 1
            reasons.append(f'MTF: hard block alignment_count={mtf_alignment_count}')
            return {
                'pass': False,
                'confidence_adj': 0.0,
                'score': 0.0,
                'reasons': reasons,
                'sr_proximity': sr_score,
                'volume_score': vol_score,
                'mtf_score': mtf_score,
            }
        
        # ================================================================
        # COMPOSITE SCORE
        # ================================================================
        total_weight = sum(weights)
        composite = sum(s * w for s, w in zip(scores, weights)) / total_weight
        
        # PATCH #62: ACTIVATED — S/R filter now gates entries
        # Score → confidence adjustment: poor scores penalize, strong scores boost
        pa_gate_min = getattr(config, 'PA_GATE_MIN_SCORE', 0.30)
        pa_boost_threshold = getattr(config, 'PA_BOOST_THRESHOLD', 0.65)
        
        if composite < pa_gate_min:
            # Very poor S/R alignment → hard block
            confidence_adj = 0.0
            passed = False
            self.stats['sr_blocks'] += 1
        elif composite < 0.40:
            # Below average → penalize confidence
            confidence_adj = 0.80 + (composite - pa_gate_min) / (0.40 - pa_gate_min) * 0.15
            passed = True
        elif composite >= pa_boost_threshold:
            # Strong S/R alignment → boost confidence
            confidence_adj = 1.05 + (composite - pa_boost_threshold) * 0.30
            confidence_adj = min(1.15, confidence_adj)
            passed = True
        else:
            # Neutral zone
            confidence_adj = 0.95 + (composite - 0.40) * 0.40  # 0.95 - 1.05
            passed = True
        
        return {
            'pass': passed,
            'confidence_adj': round(confidence_adj, 3),
            'score': round(composite, 3),
            'reasons': reasons,
            'sr_proximity': sr_score,
            'volume_score': vol_score,
            'mtf_score': mtf_score,
        }
    
    def _evaluate_sr(self, row, history, action, atr):
        """
        Support/Resistance proximity check.
        
        BUY: better near support (bounce expected)
        SELL: better near resistance (rejection expected)
        """
        close = row['close']
        reasons = []
        
        # Calculate S/R levels
        sr_levels = self._calculate_sr_levels(row, history)
        
        if not sr_levels['supports'] and not sr_levels['resistances']:
            return 0.5, ['S/R: no levels found']
        
        # Find nearest support and resistance
        supports = sr_levels['supports']
        resistances = sr_levels['resistances']
        
        nearest_support = None
        nearest_resistance = None
        
        if supports:
            dists = [(abs(close - s), s) for s in supports]
            dists.sort()
            nearest_support = dists[0][1]
            
        if resistances:
            dists = [(abs(close - r), r) for r in resistances]
            dists.sort()
            nearest_resistance = dists[0][1]
        
        score = 0.5  # Default neutral
        
        if action == 'BUY':
            if nearest_support and abs(close - nearest_support) < 1.5 * atr:
                # Near support — good for BUY
                proximity = 1.0 - abs(close - nearest_support) / (1.5 * atr)
                score = 0.6 + proximity * 0.35  # 0.60 - 0.95
                self.stats['sr_boosts'] += 1
                reasons.append(f'S/R: BUY near support ${nearest_support:.0f} ({proximity:.0%} proximity)')
            elif nearest_resistance and abs(close - nearest_resistance) < 0.8 * atr:
                # Near resistance — bad for BUY (likely rejection)
                score = 0.20
                self.stats['sr_penalties'] += 1
                reasons.append(f'S/R: BUY at resistance ${nearest_resistance:.0f} — risky')
            else:
                reasons.append('S/R: BUY mid-range')
                
        elif action == 'SELL':
            if nearest_resistance and abs(close - nearest_resistance) < 1.5 * atr:
                # Near resistance — good for SELL
                proximity = 1.0 - abs(close - nearest_resistance) / (1.5 * atr)
                score = 0.6 + proximity * 0.35
                self.stats['sr_boosts'] += 1
                reasons.append(f'S/R: SELL near resistance ${nearest_resistance:.0f} ({proximity:.0%} proximity)')
            elif nearest_support and abs(close - nearest_support) < 0.8 * atr:
                # Near support — bad for SELL (likely bounce)
                score = 0.20
                self.stats['sr_penalties'] += 1
                reasons.append(f'S/R: SELL at support ${nearest_support:.0f} — risky')
            else:
                reasons.append('S/R: SELL mid-range')
        
        return score, reasons
    
    def _evaluate_volume(self, row, history, action):
        """
        Volume profile check.
        
        - VWAP as dynamic S/R
        - Volume ratio as confirmation
        - Volume trend (rising/falling)
        """
        close = row['close']
        volume_ratio = row.get('volume_ratio', 1.0)
        reasons = []
        
        # Calculate VWAP from recent history
        if len(history) >= 20:
            prices = history['close'].values[-96:]  # ~1 day on 15m
            volumes = history['volume'].values[-96:]
            total_vol = np.sum(volumes)
            if total_vol > 0:
                vwap = np.sum(prices * volumes) / total_vol
            else:
                vwap = close
        else:
            vwap = close
        
        score = 0.5
        
        # Volume confirmation
        if volume_ratio >= 1.5:
            score += 0.20  # Strong volume = conviction
            self.stats['volume_confirms'] += 1
            reasons.append(f'VOL: strong volume ({volume_ratio:.1f}x avg)')
        elif volume_ratio >= 1.2:
            score += 0.10
            reasons.append(f'VOL: above-avg volume ({volume_ratio:.1f}x)')
        elif volume_ratio < 0.6:
            score -= 0.20  # Weak volume = no conviction
            reasons.append(f'VOL: weak volume ({volume_ratio:.1f}x)')
        
        # VWAP alignment
        atr = row.get('atr', close * 0.01)
        if action == 'BUY':
            if close > vwap:
                score += 0.10  # Above VWAP = buying pressure
                reasons.append('VOL: above VWAP (buying pressure)')
            elif close < vwap - 0.5 * atr:
                # Far below VWAP — potential mean reversion (if near support)
                score += 0.05
                reasons.append('VOL: below VWAP (mean reversion)')
        elif action == 'SELL':
            if close < vwap:
                score += 0.10  # Below VWAP = selling pressure
                reasons.append('VOL: below VWAP (selling pressure)')
            elif close > vwap + 0.5 * atr:
                score += 0.05
                reasons.append('VOL: above VWAP (mean reversion)')
        
        return max(0.0, min(1.0, score)), reasons
    
    def _evaluate_mtf(self, row, history, action, regime):
        """
        Multi-Timeframe confluence check.
        
        Uses long-period indicators as higher TF proxies:
        - SMA200 slope: monthly trend direction
        - EMA50 vs EMA200: weekly trend
        - ADX: trend strength
        """
        close = row['close']
        reasons = []
        
        sma200 = row.get('sma_200', close)
        ema50 = row.get('ema_50', row.get('sma_50', close))
        ema200 = row.get('ema_200', sma200)
        adx = row.get('adx', 20)
        ema21 = row.get('ema_21', close)
        
        score = 0.5
        alignment_count = 0
        
        # Check SMA200 slope (monthly trend)
        if len(history) >= 20:
            sma200_values = history['sma_200'].values[-20:] if 'sma_200' in history.columns else None
            if sma200_values is not None and len(sma200_values) >= 10:
                slope = (sma200_values[-1] - sma200_values[-10]) / sma200_values[-10] if sma200_values[-10] > 0 else 0
                
                if action == 'BUY' and slope > 0.001:
                    alignment_count += 1
                    reasons.append(f'MTF: SMA200 rising ({slope*100:.2f}%)')
                elif action == 'SELL' and slope < -0.001:
                    alignment_count += 1
                    reasons.append(f'MTF: SMA200 falling ({slope*100:.2f}%)')
                elif action == 'BUY' and slope < -0.002:
                    alignment_count -= 1
                    reasons.append(f'MTF: SMA200 strongly falling — CONFLICT')
                elif action == 'SELL' and slope > 0.002:
                    alignment_count -= 1
                    reasons.append(f'MTF: SMA200 strongly rising — CONFLICT')
        
        # Check EMA50 vs EMA200 (weekly trend)
        if ema50 > 0 and ema200 > 0:
            if action == 'BUY' and ema50 > ema200:
                alignment_count += 1
                reasons.append('MTF: EMA50 > EMA200 (bullish)')
            elif action == 'SELL' and ema50 < ema200:
                alignment_count += 1
                reasons.append('MTF: EMA50 < EMA200 (bearish)')
            elif action == 'BUY' and ema50 < ema200:
                alignment_count -= 1
                reasons.append('MTF: EMA50 < EMA200 — counter-trend BUY')
            elif action == 'SELL' and ema50 > ema200:
                alignment_count -= 1
                reasons.append('MTF: EMA50 > EMA200 — counter-trend SELL')
        
        # Check price vs SMA200 (macro trend)
        if sma200 > 0:
            if action == 'BUY' and close > sma200:
                alignment_count += 1
            elif action == 'SELL' and close < sma200:
                alignment_count += 1
            elif action == 'BUY' and close < sma200 * 0.98:
                # Buying well below SMA200 = strongly counter-trend
                alignment_count -= 1
                reasons.append('MTF: Price well below SMA200 — counter-macro')
        
        # ADX strength confirmation
        if adx > 30:
            # Strong trend — check alignment
            if action == 'BUY' and close > ema21:
                alignment_count += 1
                reasons.append(f'MTF: Strong trend (ADX {adx:.0f}) + price > EMA21')
            elif action == 'SELL' and close < ema21:
                alignment_count += 1
                reasons.append(f'MTF: Strong trend (ADX {adx:.0f}) + price < EMA21')
        
        # Convert alignment count to score
        # -3 to +4 range → 0.0 to 1.0
        score = 0.5 + alignment_count * 0.125
        score = max(0.0, min(1.0, score))
        
        if alignment_count >= 2:
            self.stats['mtf_aligns'] += 1
        elif alignment_count <= -1:
            self.stats['mtf_conflicts'] += 1
        
        return score, reasons, alignment_count
    
    def _calculate_sr_levels(self, row, history):
        """
        Calculate dynamic Support/Resistance levels.
        
        Sources:
        1. Pivot Points from rolling daily OHLC
        2. Fibonacci retracement from swing high/low
        3. Round numbers (psychological levels)
        """
        close = row['close']
        supports = []
        resistances = []
        
        # Recalculate pivots periodically
        if len(history) >= 96:
            # =========== PIVOT POINTS ===========
            # Rolling 1-day equivalent (96 candles on 15m, 24 on 1h, 6 on 4h)
            lookback = min(96, len(history))
            recent = history.iloc[-lookback:]
            
            day_high = recent['high'].max()
            day_low = recent['low'].min()
            day_close = recent['close'].iloc[-1]
            
            pivot = (day_high + day_low + day_close) / 3
            r1 = 2 * pivot - day_low
            s1 = 2 * pivot - day_high
            r2 = pivot + (day_high - day_low)
            s2 = pivot - (day_high - day_low)
            
            # Classify relative to current price
            for level in [s2, s1, pivot]:
                if level < close:
                    supports.append(level)
                else:
                    resistances.append(level)
            for level in [r1, r2]:
                if level > close:
                    resistances.append(level)
                else:
                    supports.append(level)
        
        # =========== FIBONACCI RETRACEMENT ===========
        if len(history) >= 50:
            lookback_fib = min(100, len(history))
            fib_data = history.iloc[-lookback_fib:]
            swing_high = fib_data['high'].max()
            swing_low = fib_data['low'].min()
            fib_range = swing_high - swing_low
            
            if fib_range > 0:
                # Fibonacci levels
                fib_levels = {
                    0.236: swing_high - 0.236 * fib_range,
                    0.382: swing_high - 0.382 * fib_range,
                    0.500: swing_high - 0.500 * fib_range,
                    0.618: swing_high - 0.618 * fib_range,
                    0.786: swing_high - 0.786 * fib_range,
                }
                
                for ratio, level in fib_levels.items():
                    if level < close:
                        supports.append(level)
                    else:
                        resistances.append(level)
        
        # =========== ROUND NUMBERS ===========
        # Psychological levels (every $1000 for BTC)
        base = int(close / 1000) * 1000
        for level in [base - 1000, base, base + 1000, base + 2000]:
            if level > 0:
                if level < close:
                    supports.append(level)
                elif level > close:
                    resistances.append(level)
        
        # Deduplicate and sort
        supports = sorted(set(supports), reverse=True)[:5]  # Top 5 nearest supports
        resistances = sorted(set(resistances))[:5]  # Top 5 nearest resistances
        
        return {
            'supports': supports,
            'resistances': resistances,
        }
    
    def get_stats(self):
        """Return filter statistics."""
        return self.stats.copy()
