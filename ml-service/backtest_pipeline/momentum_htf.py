"""
TURBO-BOT P#175 — Momentum HTF/LTF Strategy Module
Dedicated trend-following for TRENDING regimes — bypasses ensemble.

PORT of trading-bot/src/strategies/momentum-htf-ltf.js to Python
for backtest pipeline parity.

HOW IT WORKS:
1. Determine HTF trend from SMA alignment (SMA20 > SMA50 > SMA200) + ADX > 20
2. Detect LTF pullback into SMA20 zone + RSI extremes
3. Wait for SECOND confirming candle (bullish close + recovering momentum)
4. Entry with SL = 2.0×ATR, TP = 5.0×ATR, min RR 2.5:1
5. Cooldown: 24 candles (6h on 15m), max 3 trades/day

TARGET PAIR: BTCUSDT (also usable on trending pairs)
"""

import numpy as np
from . import config


# ============================================================================
# MOMENTUM HTF/LTF DEFAULT PARAMETERS
# ============================================================================

MTF_ADX_MIN = getattr(config, 'MTF_ADX_MIN', 28)       # P#189: ADX gate — was 20 (too permissive)
MTF_SMA_FAST = 20               # Fast SMA period
MTF_SMA_SLOW = 50               # Slow SMA period
MTF_SMA_TREND = getattr(config, 'MTF_SMA_TREND', 100)  # P#189: was 200 (wasted 1/4 data on warmup)
MTF_VOL_CONFIRM = getattr(config, 'MTF_VOL_CONFIRM', 2.0)  # P#189: min volume ratio for entry
MTF_ENTRY_RSI_OVERSOLD = 40     # LTF RSI for pullback entry (LONG)
MTF_ENTRY_RSI_OVERBOUGHT = 60   # LTF RSI for pullback entry (SHORT)
MTF_MIN_RR = 2.5                # Minimum Risk:Reward ratio
MTF_SL_ATR = 2.0                # SL distance in ATR units
MTF_TP_ATR = 5.0                # TP distance in ATR units
MTF_COOLDOWN = 24               # Min candles between trades (6h on 15m)
MTF_MAX_TRADES = 50             # Max momentum trades per backtest session
MTF_RISK_PER_TRADE = 0.010      # 1.0% risk per momentum trade
MTF_MIN_CANDLES = 200            # Data warmup


class MomentumHTFStrategy:
    """
    Dedicated Momentum HTF/LTF strategy for TRENDING markets.

    Operates INDEPENDENTLY from the ensemble pipeline.
    Generates its own signals with its own confidence calculation.
    Only activates in trending conditions (ADX > 20, SMA alignment).
    """

    def __init__(self, symbol='BTCUSDT'):
        self.symbol = symbol
        self.enabled = True

        # State tracking
        self.last_entry_candle = -999
        self.trades_count = 0
        self.wins = 0
        self.losses = 0
        self.total_pnl = 0
        self.total_fees = 0

        # Pullback tracking
        self._pullback_detected = False
        self._pullback_direction = None   # 'LONG' or 'SHORT'
        self._pullback_candle_count = 0

        # Per-pair configurable parameters
        self.adx_min = MTF_ADX_MIN
        self.sma_fast = MTF_SMA_FAST
        self.sma_slow = MTF_SMA_SLOW
        self.sma_trend = MTF_SMA_TREND
        self.vol_confirm = MTF_VOL_CONFIRM  # P#189: volume confirmation threshold
        self.rsi_oversold = MTF_ENTRY_RSI_OVERSOLD
        self.rsi_overbought = MTF_ENTRY_RSI_OVERBOUGHT
        self.min_rr = MTF_MIN_RR
        self.sl_atr = MTF_SL_ATR
        self.tp_atr = MTF_TP_ATR
        self.cooldown = MTF_COOLDOWN
        self.max_trades = MTF_MAX_TRADES
        self.risk_per_trade = MTF_RISK_PER_TRADE
        self.min_candles = MTF_MIN_CANDLES

    def configure(self, **kwargs):
        """Apply per-pair configuration overrides."""
        mapping = {
            'MTF_ADX_MIN': 'adx_min',
            'MTF_SMA_FAST': 'sma_fast',
            'MTF_SMA_SLOW': 'sma_slow',
            'MTF_SMA_TREND': 'sma_trend',
            'MTF_ENTRY_RSI_OVERSOLD': 'rsi_oversold',
            'MTF_ENTRY_RSI_OVERBOUGHT': 'rsi_overbought',
            'MTF_MIN_RR': 'min_rr',
            'MTF_SL_ATR': 'sl_atr',
            'MTF_TP_ATR': 'tp_atr',
            'MTF_COOLDOWN': 'cooldown',
            'MTF_MAX_TRADES': 'max_trades',
            'MTF_RISK_PER_TRADE': 'risk_per_trade',
            'MTF_MIN_CANDLES': 'min_candles',
        }
        for cfg_key, attr_name in mapping.items():
            if cfg_key in kwargs:
                setattr(self, attr_name, kwargs[cfg_key])

    def mark_entry(self, candle_idx):
        """Record that we entered a trade on this candle."""
        self.last_entry_candle = candle_idx
        self.trades_count += 1

    def evaluate(self, row, history, regime, candle_idx, has_position=False):
        """
        Evaluate whether a momentum trade should be taken.

        Bypasses ensemble — generates independent signals.
        Only fires in TRENDING conditions (ADX > 20 + SMA alignment).

        Args:
            row: current candle (dict-like with close, high, low, open, etc.)
            history: list of recent candle dicts
            regime: current market regime string
            candle_idx: current candle index
            has_position: whether there's already an open position

        Returns:
            dict with signal info, or None if no signal:
            {
                'signal': 'BUY'|'SELL',
                'confidence': float,
                'is_momentum_htf': True,
                'sl_atr': float,
                'tp_atr': float,
                'risk_per_trade': float,
                'reason': str,
            }
        """
        if not self.enabled:
            return None

        if has_position:
            return None

        if self.trades_count >= self.max_trades:
            return None

        # Cooldown check
        if candle_idx - self.last_entry_candle < self.cooldown:
            return None

        # Need enough data
        if len(history) < self.min_candles:
            return None

        # === STEP 1: Compute indicators from history (DataFrame) ===
        hist_tail = history.iloc[-self.sma_trend:]
        closes = hist_tail['close'].values
        if len(closes) < self.sma_trend:
            return None

        price = row['close']
        atr = row.get('atr', price * 0.01)
        rsi = row.get('rsi', 50)
        adx = row.get('adx', 0)

        # Compute SMAs from history
        sma20 = np.mean(closes[-self.sma_fast:])
        sma50 = np.mean(closes[-self.sma_slow:])
        sma200 = np.mean(closes[-self.sma_trend:])

        # === STEP 2: ADX gate ===
        if adx < self.adx_min:
            self._pullback_detected = False
            return None

        # === STEP 2b: Volume confirmation gate (P#189) ===
        vol_ratio = row.get('volume_ratio', 1.0)
        if vol_ratio < self.vol_confirm:
            return None   # no real volume → skip signal

        # === STEP 3: Determine trend from SMA alignment ===
        htf_trend = None
        htf_strength = 0

        if price > sma20 and sma20 > sma50 and sma50 > sma200:
            htf_trend = 'BULLISH'
            htf_strength = min(100, adx * 2)
        elif price < sma20 and sma20 < sma50 and sma50 < sma200:
            htf_trend = 'BEARISH'
            htf_strength = min(100, adx * 2)
        elif price > sma50 and sma20 > sma50:
            htf_trend = 'BULLISH'
            htf_strength = min(60, adx)
        elif price < sma50 and sma20 < sma50:
            htf_trend = 'BEARISH'
            htf_strength = min(60, adx)
        else:
            self._pullback_detected = False
            return None

        # === STEP 4: Detect pullback ===
        recent = history.iloc[-10:]
        macd_hist = row.get('macd_histogram', 0) or 0

        if htf_trend == 'BULLISH':
            pullback_to_sma = price <= sma20 * 1.005 and price >= sma50 * 0.995
            rsi_pullback = rsi < self.rsi_oversold

            if pullback_to_sma or rsi_pullback:
                if not self._pullback_detected or self._pullback_direction != 'LONG':
                    self._pullback_detected = True
                    self._pullback_direction = 'LONG'
                    self._pullback_candle_count = 1
                    return None  # Wait for second confirming candle

                self._pullback_candle_count += 1

                if self._pullback_candle_count >= 2 and len(recent) >= 2:
                    last_c = recent.iloc[-1]
                    prev_c = recent.iloc[-2]

                    is_bullish = last_c['close'] > last_c['open']
                    is_recovering = last_c['close'] > prev_c['close']
                    macd_turning = macd_hist > 0 or macd_hist > -0.5 * atr

                    if is_bullish and (is_recovering or macd_turning):
                        sl = price - self.sl_atr * atr
                        tp = price + self.tp_atr * atr
                        risk_dist = price - sl
                        reward_dist = tp - price
                        rr = reward_dist / risk_dist if risk_dist > 0 else 0

                        if rr < self.min_rr:
                            return None

                        confidence = self._calc_confidence(
                            htf_strength, rsi, adx,
                            row.get('volume_ratio', 1.0), 'LONG'
                        )

                        self._pullback_detected = False
                        self._pullback_candle_count = 0

                        return {
                            'signal': 'BUY',
                            'confidence': confidence,
                            'is_momentum_htf': True,
                            'sl_atr': self.sl_atr,
                            'tp_atr': self.tp_atr,
                            'risk_per_trade': self.risk_per_trade,
                            'reason': (f'MomHTF LONG: trend={htf_trend}({htf_strength:.0f})'
                                       f' RSI={rsi:.0f} ADX={adx:.0f}'
                                       f' RR={rr:.1f} 2ndCandle'),
                        }
            else:
                if self._pullback_direction == 'LONG':
                    self._pullback_detected = False
                    self._pullback_candle_count = 0

        elif htf_trend == 'BEARISH':
            pullback_to_sma = price >= sma20 * 0.995 and price <= sma50 * 1.005
            rsi_pullback = rsi > self.rsi_overbought

            if pullback_to_sma or rsi_pullback:
                if not self._pullback_detected or self._pullback_direction != 'SHORT':
                    self._pullback_detected = True
                    self._pullback_direction = 'SHORT'
                    self._pullback_candle_count = 1
                    return None

                self._pullback_candle_count += 1

                if self._pullback_candle_count >= 2 and len(recent) >= 2:
                    last_c = recent.iloc[-1]
                    prev_c = recent.iloc[-2]

                    is_bearish = last_c['close'] < last_c['open']
                    is_declining = last_c['close'] < prev_c['close']
                    macd_turning = macd_hist < 0 or macd_hist < 0.5 * atr

                    if is_bearish and (is_declining or macd_turning):
                        sl = price + self.sl_atr * atr
                        tp = max(1e-7, price - self.tp_atr * atr)
                        risk_dist = sl - price
                        reward_dist = price - tp
                        rr = reward_dist / risk_dist if risk_dist > 0 else 0

                        if rr < self.min_rr:
                            return None

                        confidence = self._calc_confidence(
                            htf_strength, rsi, adx,
                            row.get('volume_ratio', 1.0), 'SHORT'
                        )

                        self._pullback_detected = False
                        self._pullback_candle_count = 0

                        return {
                            'signal': 'SELL',
                            'confidence': confidence,
                            'is_momentum_htf': True,
                            'sl_atr': self.sl_atr,
                            'tp_atr': self.tp_atr,
                            'risk_per_trade': self.risk_per_trade,
                            'reason': (f'MomHTF SHORT: trend={htf_trend}({htf_strength:.0f})'
                                       f' RSI={rsi:.0f} ADX={adx:.0f}'
                                       f' RR={rr:.1f} 2ndCandle'),
                        }
            else:
                if self._pullback_direction == 'SHORT':
                    self._pullback_detected = False
                    self._pullback_candle_count = 0

        return None

    def _calc_confidence(self, htf_strength, rsi, adx, volume_ratio, direction):
        """Calculate confidence score matching JS implementation."""
        confidence = 0.40
        if htf_strength > 60:
            confidence += 0.10
        if volume_ratio > 1.2:
            confidence += 0.05
        if direction == 'LONG' and rsi < 35:
            confidence += 0.05
        elif direction == 'SHORT' and rsi > 65:
            confidence += 0.05
        return max(0.30, min(0.80, confidence))

    def record_trade(self, pnl, fees=0):
        """Record trade result for adaptive tracking."""
        if pnl > 0:
            self.wins += 1
        else:
            self.losses += 1
        self.total_pnl += pnl
        self.total_fees += fees

    def get_stats(self):
        """Return strategy stats for backtest reporting."""
        wr = (self.wins / self.trades_count * 100) if self.trades_count > 0 else 0
        return {
            'enabled': self.enabled,
            'trades': self.trades_count,
            'wins': self.wins,
            'losses': self.losses,
            'win_rate': round(wr, 1),
            'net_pnl': round(self.total_pnl, 2),
            'total_fees': round(self.total_fees, 2),
        }
