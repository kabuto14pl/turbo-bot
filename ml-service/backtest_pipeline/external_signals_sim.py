"""
TURBO-BOT Full Pipeline Backtest — External Signals Simulator
PATCH #152C: Simulates ExternalSignals module from historical price data.

In production: Fetches live data from Fear&Greed API, CoinGecko, FRED, MarketAux, CFTC COT.
In backtest: Reconstructs equivalent signals from OHLCV microstructure.

Simulated components:
  1. Fear & Greed proxy — volatility + volume + momentum composite
  2. Whale activity proxy — volume spikes + large body candles
  3. Macro environment proxy — long-term trend direction + yield curve proxy
  4. Sentiment proxy — short-term sentiment from RSI + price action
  5. COT positioning proxy — institutional flow from volume-weighted directional bias

Output:
  Signal dict: {action, confidence, strategy: 'ExternalSignals', reasoning, ...}
  Defense status: {active, reason, minutesLeft}
"""

import numpy as np
from . import config


class ExternalSignalsSimulator:
    """
    Simulates the ExternalSignals module (external-signals.js) for backtesting.
    
    Generates a composite signal that mirrors live external data using
    price/volume-derived proxies. This allows the backtest to evaluate
    the impact of ExternalSignals as an ensemble voter without requiring
    historical API data.
    """

    def __init__(self):
        self.enabled = getattr(config, 'EXTERNAL_SIGNALS_ENABLED', True)

        # Sub-weights matching live external-signals.js PATCH #152C
        self.sub_weights = {
            'whale': 0.22,
            'sentiment': 0.18,
            'macro': 0.22,
            'fear_greed': 0.18,
            'cot': 0.20,
        }

        # Internal state
        self._defense_active = False
        self._defense_reason = ''
        self._defense_until = 0
        self._cycle_count = 0

        # Stats
        self.total_signals = 0
        self.buy_signals = 0
        self.sell_signals = 0
        self.hold_signals = 0
        self.defense_activations = 0

    def generate_signal(self, row, history_df, regime='UNKNOWN'):
        """
        Generate a composite external signal from price/volume data.

        Args:
            row: Current candle (Series with OHLCV + indicators)
            history_df: Historical candles (DataFrame)
            regime: Current market regime

        Returns:
            dict: {action, confidence, strategy: 'ExternalSignals', reasoning}
                  or None if disabled or insufficient data
        """
        if not self.enabled or len(history_df) < 50:
            return None

        self._cycle_count += 1
        self.total_signals += 1

        components = {}
        weighted_bias = 0
        total_weight = 0

        closes = history_df['close'].values
        volumes = history_df['volume'].values if 'volume' in history_df else np.ones(len(history_df))
        highs = history_df['high'].values
        lows = history_df['low'].values

        current_price = float(row['close'])

        # 1. Fear & Greed proxy
        fg = self._fear_greed_proxy(closes, volumes, highs, lows)
        if fg is not None:
            components['fearGreed'] = fg
            weighted_bias += fg['bias'] * self.sub_weights['fear_greed']
            total_weight += self.sub_weights['fear_greed']

        # 2. Whale activity proxy
        whale = self._whale_proxy(row, closes, volumes)
        if whale is not None:
            components['whale'] = whale
            weighted_bias += whale['bias'] * self.sub_weights['whale']
            total_weight += self.sub_weights['whale']

        # 3. Macro environment proxy
        macro = self._macro_proxy(closes)
        if macro is not None:
            components['macro'] = macro
            weighted_bias += macro['bias'] * self.sub_weights['macro']
            total_weight += self.sub_weights['macro']

        # 4. Sentiment proxy
        sent = self._sentiment_proxy(row, closes, volumes)
        if sent is not None:
            components['sentiment'] = sent
            weighted_bias += sent['bias'] * self.sub_weights['sentiment']
            total_weight += self.sub_weights['sentiment']

        # 5. COT positioning proxy
        cot = self._cot_proxy(closes, volumes)
        if cot is not None:
            components['cot'] = cot
            weighted_bias += cot['bias'] * self.sub_weights['cot']
            total_weight += self.sub_weights['cot']

        if total_weight == 0:
            return None

        # Normalize bias
        normalized_bias = weighted_bias / total_weight

        # Convert to action
        action = 'HOLD'
        confidence = abs(normalized_bias)

        if normalized_bias > 0.10:
            action = 'BUY'
        elif normalized_bias < -0.10:
            action = 'SELL'

        # Defense mode check — simulated from high-volatility events
        self._check_simulated_defense(row, closes, volumes)
        if self._defense_active:
            action = 'HOLD'
            confidence = min(confidence, 0.20)

        # Minimum confidence filter
        if confidence < 0.15:
            action = 'HOLD'

        confidence = min(0.85, confidence)

        # Stats
        if action == 'BUY':
            self.buy_signals += 1
        elif action == 'SELL':
            self.sell_signals += 1
        else:
            self.hold_signals += 1

        return {
            'action': action,
            'confidence': round(confidence, 3),
            'strategy': 'ExternalSignals',
            'reasoning': self._build_reasoning(components, normalized_bias),
            'source': 'ExternalSignalsSim',
            'components': len(components),
        }

    def get_defense_status(self):
        """Check if simulated defense mode is active."""
        return {
            'active': self._defense_active,
            'reason': self._defense_reason,
        }

    # ─────────────────────────────────────────────────
    # COMPONENT PROXIES
    # ─────────────────────────────────────────────────

    def _fear_greed_proxy(self, closes, volumes, highs, lows):
        """
        Simulate Fear & Greed Index from market microstructure.
        
        Components (matching alternative.me methodology):
        - Volatility (large ATR vs average = fear)
        - Momentum (20-day return)
        - Volume (volume spike = participation)
        """
        if len(closes) < 30:
            return None

        # Volatility: high ATR relative to average = fear
        atr_14 = np.mean(np.maximum(
            highs[-14:] - lows[-14:],
            np.abs(highs[-14:] - closes[-15:-1]),
        ))
        avg_atr = np.mean(np.maximum(
            highs[-30:] - lows[-30:],
            np.abs(highs[-30:] - closes[-31:-1]),
        )) if len(closes) >= 31 else atr_14
        vol_ratio = atr_14 / avg_atr if avg_atr > 0 else 1.0

        # Momentum: 20-day return
        ret_20 = (closes[-1] - closes[-20]) / closes[-20] if len(closes) >= 20 else 0

        # Volume: relative to 20-SMA
        vol_sma = np.mean(volumes[-20:]) if len(volumes) >= 20 else np.mean(volumes)
        vol_r = volumes[-1] / vol_sma if vol_sma > 0 else 1.0

        # Composite F&G (0-100 scale)
        # Low vol + positive momentum + normal volume = greed
        # High vol + negative momentum + volume spike = fear
        fg_value = 50
        fg_value += ret_20 * 200  # momentum: +10% = +20 points
        fg_value -= (vol_ratio - 1.0) * 30  # high volatility = fear
        fg_value += min(10, (vol_r - 1.0) * 15)  # moderate volume boost
        fg_value = max(0, min(100, fg_value))

        # Contrarian interpretation (matching live)
        if fg_value <= 20:
            bias = 0.5
            desc = f'Extreme Fear proxy ({fg_value:.0f}) → contrarian BUY'
        elif fg_value <= 35:
            bias = 0.25
            desc = f'Fear proxy ({fg_value:.0f}) → mild BUY'
        elif fg_value >= 80:
            bias = -0.5
            desc = f'Extreme Greed proxy ({fg_value:.0f}) → contrarian SELL'
        elif fg_value >= 65:
            bias = -0.25
            desc = f'Greed proxy ({fg_value:.0f}) → mild SELL'
        else:
            bias = 0
            desc = f'Neutral proxy ({fg_value:.0f})'

        return {'bias': bias, 'desc': desc, 'source': 'FearGreed'}

    def _whale_proxy(self, row, closes, volumes):
        """
        Simulate whale activity from volume spikes and large candle bodies.
        Large volume + directional move = institutional flow.
        """
        if len(volumes) < 20:
            return None

        vol_sma = np.mean(volumes[-20:])
        current_vol = float(volumes[-1]) if len(volumes) > 0 else 0
        vol_ratio = current_vol / vol_sma if vol_sma > 0 else 1.0

        body = abs(float(row['close']) - float(row['open']))
        candle_range = float(row['high']) - float(row['low'])
        body_ratio = body / candle_range if candle_range > 0 else 0

        bias = 0
        reasons = []

        # Volume spike with directional body = whale activity
        if vol_ratio > 2.0 and body_ratio > 0.6:
            direction = 1 if float(row['close']) > float(row['open']) else -1
            bias += direction * 0.35
            reasons.append(f'Whale vol spike ({vol_ratio:.1f}x)')

        # Multi-timeframe trend
        if len(closes) >= 30:
            ret_7 = (closes[-1] - closes[-7]) / closes[-7]
            ret_30 = (closes[-1] - closes[-30]) / closes[-30]
            if ret_7 > 0.05 and ret_30 > 0.10:
                bias += 0.20
                reasons.append('Strong uptrend 7d+30d')
            elif ret_7 < -0.05 and ret_30 < -0.10:
                bias -= 0.20
                reasons.append('Strong downtrend 7d+30d')

        bias = max(-1, min(1, bias))
        return {'bias': bias, 'desc': '; '.join(reasons) or 'Normal activity', 'source': 'Whale'}

    def _macro_proxy(self, closes):
        """
        Simulate macro environment from long-term price structure.
        Rising long-term trend = loose conditions, falling = tight.
        """
        if len(closes) < 100:
            return None

        # 50/200 EMA cross as macro trend proxy
        ema_50 = self._ema(closes, 50)
        ema_200 = self._ema(closes, 200) if len(closes) >= 200 else self._ema(closes, len(closes))

        bias = 0
        reasons = []

        if ema_50 > ema_200 * 1.02:
            bias += 0.30
            reasons.append('Bullish macro (EMA50>EMA200)')
        elif ema_50 < ema_200 * 0.98:
            bias -= 0.30
            reasons.append('Bearish macro (EMA50<EMA200)')

        # Rate of change of long-term trend
        if len(closes) >= 100:
            roc_100 = (closes[-1] - closes[-100]) / closes[-100]
            if roc_100 > 0.15:
                bias += 0.15
                reasons.append(f'Strong macro uptrend ({roc_100*100:.1f}%)')
            elif roc_100 < -0.15:
                bias -= 0.15
                reasons.append(f'Strong macro downtrend ({roc_100*100:.1f}%)')

        bias = max(-1, min(1, bias))
        return {'bias': bias, 'desc': '; '.join(reasons) or 'Neutral macro', 'source': 'Macro'}

    def _sentiment_proxy(self, row, closes, volumes):
        """
        Simulate news/social sentiment from short-term price action.
        """
        if len(closes) < 14:
            return None

        # RSI as sentiment proxy
        rsi = self._rsi(closes, 14)
        if rsi is None:
            return None

        bias = 0
        if rsi <= 25:
            bias = 0.30  # Oversold = negative sentiment = contrarian BUY
        elif rsi <= 35:
            bias = 0.15
        elif rsi >= 75:
            bias = -0.30  # Overbought = positive sentiment = contrarian SELL
        elif rsi >= 65:
            bias = -0.15

        desc = f'RSI sentiment proxy ({rsi:.0f})'
        return {'bias': bias, 'desc': desc, 'source': 'Sentiment'}

    def _cot_proxy(self, closes, volumes):
        """
        Simulate COT positioning from volume-weighted directional bias.
        
        Approximates institutional positioning:
        - Sustained volume increase + price trend = institutional accumulation
        - Volume decline + price trend = retail continuation (weaker)
        - Volume increase + price reversal = institutional distribution
        """
        if len(closes) < 30 or len(volumes) < 30:
            return None

        # Volume-weighted directional bias (last 20 vs previous 20)
        recent_closes = closes[-20:]
        recent_vols = volumes[-20:]
        prev_closes = closes[-40:-20] if len(closes) >= 40 else closes[:20]
        prev_vols = volumes[-40:-20] if len(volumes) >= 40 else volumes[:20]

        # Net volume direction: positive volume on up days vs down days
        recent_direction = np.sign(np.diff(recent_closes))
        recent_vol_bias = np.sum(recent_direction * recent_vols[1:]) / (np.sum(recent_vols[1:]) + 1e-10)

        prev_direction = np.sign(np.diff(prev_closes))
        prev_vol_bias = np.sum(prev_direction * prev_vols[1:]) / (np.sum(prev_vols[1:]) + 1e-10)

        # Net change (momentum of positioning)
        net_change = recent_vol_bias - prev_vol_bias

        bias = 0
        reasons = []

        # Net positioning level
        if recent_vol_bias > 0.30:
            bias += 0.25
            reasons.append(f'Institutional long ({recent_vol_bias*100:.0f}%)')
        elif recent_vol_bias > 0.10:
            bias += 0.10
            reasons.append(f'Mild long ({recent_vol_bias*100:.0f}%)')
        elif recent_vol_bias < -0.30:
            bias -= 0.25
            reasons.append(f'Institutional short ({recent_vol_bias*100:.0f}%)')
        elif recent_vol_bias < -0.10:
            bias -= 0.10
            reasons.append(f'Mild short ({recent_vol_bias*100:.0f}%)')

        # Weekly change momentum
        if net_change > 0.10:
            bias += 0.30
            reasons.append(f'Adding longs (+{net_change*100:.1f}pp)')
        elif net_change > 0.03:
            bias += 0.15
            reasons.append(f'Increasing longs (+{net_change*100:.1f}pp)')
        elif net_change < -0.10:
            bias -= 0.30
            reasons.append(f'Adding shorts ({net_change*100:.1f}pp)')
        elif net_change < -0.03:
            bias -= 0.15
            reasons.append(f'Increasing shorts ({net_change*100:.1f}pp)')

        bias = max(-1, min(1, bias))
        return {'bias': bias, 'desc': '; '.join(reasons) or 'COT neutral', 'source': 'COT'}

    # ─────────────────────────────────────────────────
    # DEFENSE MODE SIMULATION
    # ─────────────────────────────────────────────────

    def _check_simulated_defense(self, row, closes, volumes):
        """
        Simulate calendar defense mode from volatility spikes.
        In live: triggers 30min before CPI/FOMC/NFP.
        In backtest: triggers on extreme volatility spikes (proxy for event impact).
        """
        if len(closes) < 20:
            return

        # Detect extreme volatility spike (proxy for major event)
        atr_5 = np.mean(np.abs(np.diff(closes[-6:])))
        atr_20 = np.mean(np.abs(np.diff(closes[-21:])))
        vol_spike = atr_5 / atr_20 if atr_20 > 0 else 1.0

        body = abs(float(row['close']) - float(row['open']))
        avg_body = np.mean(np.abs(np.diff(closes[-20:])))
        body_spike = body / avg_body if avg_body > 0 else 1.0

        # Defense triggered: extreme volatility + massive candle
        if vol_spike > 2.5 and body_spike > 3.0:
            self._defense_active = True
            self._defense_reason = f'Volatility spike (ATR {vol_spike:.1f}x, body {body_spike:.1f}x)'
            self._defense_until = self._cycle_count + 3  # 3 candles cooldown
            self.defense_activations += 1
        elif self._defense_active and self._cycle_count > self._defense_until:
            self._defense_active = False
            self._defense_reason = ''

    # ─────────────────────────────────────────────────
    # UTILITIES
    # ─────────────────────────────────────────────────

    def _ema(self, data, period):
        """Simple EMA calculation."""
        if len(data) < period:
            return np.mean(data)
        alpha = 2 / (period + 1)
        ema = data[-period]
        for val in data[-period + 1:]:
            ema = alpha * val + (1 - alpha) * ema
        return ema

    def _rsi(self, closes, period=14):
        """Calculate RSI."""
        if len(closes) < period + 1:
            return None
        deltas = np.diff(closes[-(period + 1):])
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        avg_gain = np.mean(gains)
        avg_loss = np.mean(losses)
        if avg_loss == 0:
            return 100
        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))

    def _build_reasoning(self, components, normalized_bias):
        """Build human-readable reasoning string."""
        parts = []
        for key, val in components.items():
            if val.get('desc'):
                parts.append(f"{val.get('source', key)}: {val['desc']}")
        direction = 'BULLISH' if normalized_bias > 0.10 else ('BEARISH' if normalized_bias < -0.10 else 'NEUTRAL')
        return f"ExtSim {direction} (bias: {normalized_bias:.3f}) | {' | '.join(parts)}"

    def get_stats(self):
        """Get simulation statistics."""
        return {
            'total_signals': self.total_signals,
            'buy_signals': self.buy_signals,
            'sell_signals': self.sell_signals,
            'hold_signals': self.hold_signals,
            'defense_activations': self.defense_activations,
            'buy_pct': round(self.buy_signals / max(self.total_signals, 1) * 100, 1),
            'sell_pct': round(self.sell_signals / max(self.total_signals, 1) * 100, 1),
        }
