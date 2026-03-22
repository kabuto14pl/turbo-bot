"""
TURBO-BOT Full Pipeline Backtest — Sentiment Analysis Engine
PATCH #58: Adds humanoid sentiment layer from market microstructure.

Architecture:
  For BACKTEST: Constructs sentiment signals from price/volume data
  (real social/news APIs not available in historical backtest).
  
  For PRODUCTION: Fetches from CryptoPanic, Fear/Greed, X/Twitter.
  
Sentiment Signals:
  1. Fear/Greed proxy — from volatility + momentum + volume
  2. Social momentum — from volume spikes + price acceleration
  3. News impact proxy — from large candle bodies + gap detection
  4. Crowd positioning — from RSI extremes + mean reversion pressure
  
Output:
  sentiment_score: -1.0 (extreme fear) to +1.0 (extreme greed)
  sentiment_regime: 'FEAR', 'NEUTRAL', 'GREED', 'EXTREME_FEAR', 'EXTREME_GREED'
  trading_bias: affect on confidence (+10% to -20%)
"""

import numpy as np
from . import config


class SentimentAnalyzer:
    """
    Constructs market sentiment from price/volume microstructure.
    
    In backtest: uses OHLCV-derived sentiment proxy.
    In production: augmented with real API data (CryptoPanic, Fear/Greed).
    """
    
    SENTIMENT_REGIMES = {
        'EXTREME_FEAR': (-1.0, -0.6),
        'FEAR': (-0.6, -0.2),
        'NEUTRAL': (-0.2, 0.2),
        'GREED': (0.2, 0.6),
        'EXTREME_GREED': (0.6, 1.0),
    }
    
    def __init__(self):
        self.enabled = getattr(config, 'SENTIMENT_ENABLED', True)
        
        # Weights for composite sentiment
        self.weights = {
            'fear_greed': getattr(config, 'SENTIMENT_W_FEAR_GREED', 0.30),
            'social_momentum': getattr(config, 'SENTIMENT_W_SOCIAL', 0.25),
            'news_impact': getattr(config, 'SENTIMENT_W_NEWS', 0.20),
            'crowd_positioning': getattr(config, 'SENTIMENT_W_CROWD', 0.25),
        }
        
        # History
        self.sentiment_history = []
        self.regime_counts = {r: 0 for r in self.SENTIMENT_REGIMES}
        
        # Stats
        self.total_analyses = 0
        self.signal_boosts = 0
        self.signal_dampens = 0
        self.vetoes = 0
    
    def analyze(self, row, history_df, market_regime='UNKNOWN'):
        """
        Generate composite sentiment score from market data.
        
        Args:
            row: Current candle (Series with OHLCV + indicators)
            history_df: Historical data (DataFrame, last N candles)
            market_regime: Current VQC/regime from regime detector
            
        Returns:
            dict: {
                score: float (-1 to +1),
                regime: str,
                components: dict,
                trading_bias: float (-0.20 to +0.10),
                confidence_modifier: float (0.80 to 1.10)
            }
        """
        if not self.enabled or len(history_df) < 30:
            return self._neutral_result()
        
        self.total_analyses += 1
        
        closes = history_df['close'].values.astype(float)
        volumes = history_df['volume'].values.astype(float)
        highs = history_df['high'].values.astype(float)
        lows = history_df['low'].values.astype(float)
        
        # === Component 1: Fear/Greed Proxy ===
        fg_score = self._fear_greed_proxy(
            row, closes, volumes, highs, lows
        )
        
        # === Component 2: Social Momentum ===
        social_score = self._social_momentum(
            volumes, closes
        )
        
        # === Component 3: News Impact Proxy ===
        news_score = self._news_impact_proxy(
            row, closes, highs, lows
        )
        
        # === Component 4: Crowd Positioning ===
        crowd_score = self._crowd_positioning(
            row, closes
        )
        
        # Weighted composite
        components = {
            'fear_greed': round(fg_score, 4),
            'social_momentum': round(social_score, 4),
            'news_impact': round(news_score, 4),
            'crowd_positioning': round(crowd_score, 4),
        }
        
        composite = (
            fg_score * self.weights['fear_greed'] +
            social_score * self.weights['social_momentum'] +
            news_score * self.weights['news_impact'] +
            crowd_score * self.weights['crowd_positioning']
        )
        
        # Clamp to [-1, 1]
        composite = max(-1.0, min(1.0, composite))
        
        # Determine regime
        regime = self._classify_regime(composite)
        self.regime_counts[regime] += 1
        
        # Calculate trading bias
        trading_bias, confidence_mod = self._compute_trading_bias(
            composite, regime, market_regime
        )
        
        # Track history
        self.sentiment_history.append(composite)
        if len(self.sentiment_history) > 200:
            self.sentiment_history.pop(0)
        
        return {
            'score': round(composite, 4),
            'regime': regime,
            'components': components,
            'trading_bias': round(trading_bias, 4),
            'confidence_modifier': round(confidence_mod, 4),
        }
    
    def modify_signal(self, signal_action, signal_confidence, sentiment_result):
        """
        Modify trading signal based on sentiment.
        
        Logic:
          - EXTREME_FEAR + BUY → contrarian boost +10% (brave buying)
          - EXTREME_GREED + BUY → caution -15% (late entry risk)
          - EXTREME_FEAR + SELL → caution -10% (panic selling risk)  
          - EXTREME_GREED + SELL → contrarian boost +5%
          - NEUTRAL → no change
          
        Returns:
            (modified_confidence, was_modified, reason)
        """
        if sentiment_result is None:
            return signal_confidence, False, 'Sentiment unavailable'
        
        regime = sentiment_result.get('regime', 'NEUTRAL')
        score = sentiment_result.get('score', 0)
        confidence_mod = sentiment_result.get('confidence_modifier', 1.0)
        
        new_confidence = signal_confidence * confidence_mod
        was_modified = abs(confidence_mod - 1.0) > 0.01
        
        reason = f'Sentiment {regime} (score={score:.2f})'
        
        # Additional contrarian logic
        # PATCH #67: Enhanced contrarian — stronger boosts in extreme fear/greed
        is_contrarian = getattr(config, 'SENTIMENT_CONTRARIAN', False)
        
        if regime == 'EXTREME_FEAR' and signal_action == 'BUY':
            # Brave buying in extreme fear = contrarian edge
            boost = getattr(config, 'SENTIMENT_CONTRARIAN_EXTREME_FEAR_BUY_BOOST', 1.15) if is_contrarian else 1.10
            new_confidence *= boost
            reason = f'Contrarian BUY in EXTREME_FEAR (score={score:.2f}, boost={boost:.2f})'
            self.signal_boosts += 1
            was_modified = True
            
        elif regime == 'EXTREME_GREED' and signal_action == 'BUY':
            # Late BUY in extreme greed = dangerous
            new_confidence *= 0.80 if is_contrarian else 0.85
            reason = f'Late BUY in EXTREME_GREED — reduced (score={score:.2f})'
            self.signal_dampens += 1
            was_modified = True
            
        elif regime == 'EXTREME_GREED' and signal_action == 'SELL':
            # Selling at greed extreme = smart
            boost = getattr(config, 'SENTIMENT_CONTRARIAN_EXTREME_GREED_SELL_BOOST', 1.10) if is_contrarian else 1.05
            new_confidence *= boost
            reason = f'Smart SELL in EXTREME_GREED (score={score:.2f}, boost={boost:.2f})'
            self.signal_boosts += 1
            was_modified = True
            
        elif regime == 'EXTREME_FEAR' and signal_action == 'SELL':
            # Panic selling = risky (contrarian: really bad)
            new_confidence *= 0.80 if is_contrarian else 0.90
            reason = f'Panic SELL in EXTREME_FEAR — reduced (score={score:.2f})'
            self.signal_dampens += 1
            was_modified = True
        
        # Clamp
        new_confidence = max(0.15, min(0.95, new_confidence))
        
        # Veto if sentiment-modified confidence too low
        if new_confidence < getattr(config, 'SENTIMENT_VETO_THRESHOLD', 0.25):
            self.vetoes += 1
        
        return round(new_confidence, 4), was_modified, reason
    
    def _fear_greed_proxy(self, row, closes, volumes, highs, lows):
        """
        Fear/Greed Index proxy from market data.
        
        Components (matching CNN Fear/Greed):
          - Momentum (price vs 125-day MA)
          - Volatility (VIX-like from ATR)
          - Volume (buying vs selling pressure)
          - Market breadth (proxy: consecutive direction)
        """
        score = 0.0
        n_components = 0
        
        # 1. Momentum: price vs 50-SMA (simplified)
        if len(closes) >= 50:
            sma50 = np.mean(closes[-50:])
            momentum = (closes[-1] - sma50) / sma50
            # Normalize: +5% = max greed, -5% = max fear
            score += np.clip(momentum / 0.05, -1, 1)
            n_components += 1
        
        # 2. Volatility: high vol = fear, low vol = greed
        if len(closes) >= 20:
            log_ret = np.diff(np.log(closes[-20:]))
            current_vol = np.std(log_ret)
            
            if len(closes) >= 50:
                long_vol = np.std(np.diff(np.log(closes[-50:])))
                vol_ratio = current_vol / (long_vol + 1e-10)
                # High vol ratio = fear, low = greed
                score += np.clip(1 - vol_ratio, -1, 1) * 0.8
            else:
                score += 0  # Neutral
            n_components += 1
        
        # 3. Volume momentum (buying pressure)
        if len(volumes) >= 20:
            vol_ma = np.mean(volumes[-20:])
            recent_vol = np.mean(volumes[-5:])
            
            # High volume + price up = greed
            if len(closes) >= 5:
                price_change = closes[-1] / closes[-5] - 1
                if recent_vol > vol_ma * 1.5 and price_change > 0:
                    score += 0.5  # Buying frenzy
                elif recent_vol > vol_ma * 1.5 and price_change < 0:
                    score -= 0.7  # Panic selling
                else:
                    score += price_change * 5  # Proportional
            n_components += 1
        
        # 4. Consecutive candle direction
        if len(closes) >= 10:
            diffs = np.diff(closes[-10:])
            up_ratio = sum(1 for d in diffs if d > 0) / len(diffs)
            # >70% up = greed, <30% = fear
            score += (up_ratio - 0.5) * 2
            n_components += 1
        
        return np.clip(score / max(n_components, 1), -1, 1)
    
    def _social_momentum(self, volumes, closes):
        """
        Social momentum proxy from volume pattern.
        
        High volume spikes = increased social attention.
        Volume trend = sentiment momentum.
        """
        if len(volumes) < 20:
            return 0.0
        
        vol_ma20 = np.mean(volumes[-20:])
        
        # Volume spike score
        spike_score = 0
        for i in range(-5, 0):
            if volumes[i] > vol_ma20 * 2.0:
                # Price direction during spike
                if i < -1:
                    price_dir = closes[i + 1] - closes[i]
                else:
                    price_dir = closes[-1] - closes[i]
                spike_score += 0.3 if price_dir > 0 else -0.3
        
        # Volume trend (5d vs 20d)
        vol_5 = np.mean(volumes[-5:])
        vol_trend = (vol_5 / (vol_ma20 + 1e-10)) - 1
        
        # Combine
        combined = spike_score * 0.6 + np.clip(vol_trend, -1, 1) * 0.4
        return np.clip(combined, -1, 1)
    
    def _news_impact_proxy(self, row, closes, highs, lows):
        """
        News impact proxy from price action patterns.
        
        Large candle bodies = news event.
        Gap detection = overnight news.
        """
        if len(closes) < 5:
            return 0.0
        
        close = row['close']
        open_price = row['open']
        
        # 1. Body size relative to ATR
        body = abs(close - open_price)
        if len(highs) >= 14:
            atr = np.mean(highs[-14:] - lows[-14:])
        else:
            atr = np.mean(highs[-5:] - lows[-5:])
        
        body_ratio = body / (atr + 1e-10)
        
        # Large body = news impact
        if body_ratio > 2.0:
            # Direction of the news candle
            direction = 1.0 if close > open_price else -1.0
            news_score = direction * min(body_ratio / 3.0, 1.0)
        else:
            news_score = 0.0
        
        # 2. Gap detection (open vs previous close)
        prev_close = closes[-2]
        gap = (open_price - prev_close) / (atr + 1e-10)
        
        if abs(gap) > 0.5:
            gap_score = np.clip(gap, -1, 1)
            news_score = (news_score * 0.6 + gap_score * 0.4)
        
        return np.clip(news_score, -1, 1)
    
    def _crowd_positioning(self, row, closes):
        """
        Crowd positioning from mean reversion indicators.
        
        RSI extreme = crowd is on one side.
        Price deviation from MA = crowd momentum.
        """
        rsi = row.get('rsi_14', 50)
        
        # RSI → crowd position
        # RSI > 70: crowd is long (greed)
        # RSI < 30: crowd is short (fear)
        rsi_score = (rsi - 50) / 50  # Normalize to [-1, 1]
        
        # Mean reversion pressure
        if len(closes) >= 20:
            sma20 = np.mean(closes[-20:])
            deviation = (closes[-1] - sma20) / sma20
            # Large deviation = crowd momentum, but contrarian pressure grows
            reversion_score = np.clip(deviation / 0.03, -1, 1)
        else:
            reversion_score = 0
        
        # Combine: RSI weighted more
        combined = rsi_score * 0.7 + reversion_score * 0.3
        return np.clip(combined, -1, 1)
    
    def _classify_regime(self, score):
        """Classify sentiment score into regime."""
        for regime, (low, high) in self.SENTIMENT_REGIMES.items():
            if low <= score < high:
                return regime
        return 'EXTREME_GREED' if score >= 0.6 else 'EXTREME_FEAR'
    
    def _compute_trading_bias(self, score, sentiment_regime, market_regime):
        """
        Compute trading bias and confidence modifier.
        
        Returns:
            (trading_bias, confidence_modifier)
        """
        # Base confidence modifier from sentiment
        if sentiment_regime == 'EXTREME_FEAR':
            confidence_mod = getattr(config, 'SENTIMENT_MOD_EXTREME_FEAR', 0.90)
            trading_bias = -0.15
        elif sentiment_regime == 'FEAR':
            confidence_mod = getattr(config, 'SENTIMENT_MOD_FEAR', 0.95)
            trading_bias = -0.05
        elif sentiment_regime == 'GREED':
            confidence_mod = getattr(config, 'SENTIMENT_MOD_GREED', 1.05)
            trading_bias = 0.05
        elif sentiment_regime == 'EXTREME_GREED':
            confidence_mod = getattr(config, 'SENTIMENT_MOD_EXTREME_GREED', 0.92)
            trading_bias = 0.08
        else:
            confidence_mod = 1.0
            trading_bias = 0.0
        
        # Market regime interaction
        # If sentiment and regime agree → stronger signal
        # If they disagree → caution
        if market_regime == 'TRENDING_UP' and sentiment_regime in ('FEAR', 'EXTREME_FEAR'):
            # Trending up but fearful = potential reversal
            confidence_mod *= 0.95
        elif market_regime == 'TRENDING_DOWN' and sentiment_regime in ('GREED', 'EXTREME_GREED'):
            # Trending down but greedy = trap
            confidence_mod *= 0.90
        
        return trading_bias, confidence_mod
    
    def _neutral_result(self):
        """Return neutral sentiment result."""
        return {
            'score': 0.0,
            'regime': 'NEUTRAL',
            'components': {
                'fear_greed': 0,
                'social_momentum': 0,
                'news_impact': 0,
                'crowd_positioning': 0,
            },
            'trading_bias': 0.0,
            'confidence_modifier': 1.0,
        }
    
    def get_stats(self):
        """Get sentiment analyzer statistics."""
        total = self.total_analyses
        regime_dist = {}
        if total > 0:
            for regime, count in self.regime_counts.items():
                regime_dist[regime] = round(count / total * 100, 1)
        
        avg_sentiment = (
            np.mean(self.sentiment_history) if self.sentiment_history else 0
        )
        
        return {
            'total_analyses': total,
            'signal_boosts': self.signal_boosts,
            'signal_dampens': self.signal_dampens,
            'vetoes': self.vetoes,
            'avg_sentiment': round(avg_sentiment, 4),
            'current_sentiment': round(
                self.sentiment_history[-1], 4) if self.sentiment_history else 0,
            'regime_distribution': regime_dist,
            'enabled': self.enabled,
        }
