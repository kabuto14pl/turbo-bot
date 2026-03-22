"""
TURBO-BOT P#71 — News/Sentiment Filter Module
Simulates news-driven market events for pair-specific filtering.

CONCEPT:
- In production: connects to X API, CryptoCompare News, regulatory feeds
- In backtest: simulates news events from price anomalies:
  1. Sudden volume spikes (>3× average) = news event
  2. Large price moves (>2% in 1 candle) = news event
  3. Gaps between candles = news event
  4. RSI extreme reversals = sentiment shift

USAGE:
- XRP: Block trades during "regulatory events" (sudden vol + price drop)
- BNB: Boost confidence during "ecosystem events" (price + volume aligned)
- ETH: Filter noise during high-vol events
- BTC: Minimal (already efficient market)

NEWS TYPES:
1. REGULATORY — sudden drop + volume spike (SEC/regulatory risk)
2. ECOSYSTEM — steady climb + volume (positive development)
3. WHALE_MOVE — huge volume, little price change (accumulation/distribution)
4. PANIC — rapid drop + extreme RSI < 20 (capitulation)
5. FOMO — rapid rise + extreme RSI > 80 (greed)
"""

import numpy as np
from . import config


# ============================================================================
# NEWS EVENT DETECTION THRESHOLDS
# ============================================================================

NEWS_VOLUME_SPIKE_MULT = 2.0      # Volume >2× avg = potential news
NEWS_PRICE_MOVE_PCT = 0.012       # >1.2% candle = potential news (realistic for 15m)
NEWS_RSI_EXTREME_LOW = 25         # RSI < 25 = panic
NEWS_RSI_EXTREME_HIGH = 75        # RSI > 75 = FOMO
NEWS_COOLDOWN_CANDLES = 12        # Ignore news for N candles after detection
NEWS_LOOKBACK_CANDLES = 4         # Check last N candles for event pattern


class NewsEvent:
    """Represents a detected news event."""
    def __init__(self, event_type, severity, direction, candle_idx):
        self.event_type = event_type      # REGULATORY, ECOSYSTEM, WHALE, PANIC, FOMO
        self.severity = severity          # 0.0 - 1.0
        self.direction = direction        # BULLISH, BEARISH, NEUTRAL
        self.candle_idx = candle_idx
        self.age = 0                      # Candles since detection
        
    def __repr__(self):
        return f"NewsEvent({self.event_type}, sev={self.severity:.2f}, dir={self.direction})"


class NewsFilter:
    """
    Detects and filters based on simulated news events.
    
    For each candle, checks for anomalous price/volume behavior
    and classifies it as a news type. Then applies pair-specific
    filtering rules.
    """
    
    def __init__(self, symbol='BTCUSDT'):
        self.symbol = symbol
        self.enabled = True
        self.active_events = []        # Currently active news events
        self.all_events = []           # All detected events
        self.trades_blocked = 0
        self.trades_boosted = 0
        self.last_event_candle = -999
        
        # Per-pair configuration
        self.regulatory_block = False       # Block trades during regulatory events
        self.ecosystem_boost = False        # Boost confidence on ecosystem events
        self.panic_block = True             # Block trades during panic
        self.fomo_block = True              # Block trades during FOMO
        self.whale_caution = True           # Reduce confidence on whale moves
        
    def configure(self, **kwargs):
        """Apply per-pair configuration."""
        if 'NEWS_REGULATORY_BLOCK' in kwargs:
            self.regulatory_block = kwargs['NEWS_REGULATORY_BLOCK']
        if 'NEWS_ECOSYSTEM_BOOST' in kwargs:
            self.ecosystem_boost = kwargs['NEWS_ECOSYSTEM_BOOST']
        if 'NEWS_PANIC_BLOCK' in kwargs:
            self.panic_block = kwargs['NEWS_PANIC_BLOCK']
        if 'NEWS_FOMO_BLOCK' in kwargs:
            self.fomo_block = kwargs['NEWS_FOMO_BLOCK']
        if 'NEWS_WHALE_CAUTION' in kwargs:
            self.whale_caution = kwargs['NEWS_WHALE_CAUTION']
    
    def detect_events(self, row, history, candle_idx):
        """
        Detect news events from price/volume anomalies.
        
        Returns list of detected events (usually 0-1 per candle).
        """
        events = []
        
        if len(history) < 30:
            return events
        
        close = row['close']
        open_price = row['open']
        volume = row['volume']
        rsi = row.get('rsi_14', 50)
        vol_ratio = row.get('volume_ratio', 1.0)
        atr = row.get('atr', close * 0.01)
        
        # Price change this candle
        candle_change_pct = (close - open_price) / open_price if open_price > 0 else 0
        
        # Recent price change (last 3 candles)
        if len(history) >= NEWS_LOOKBACK_CANDLES:
            recent_close = history['close'].iloc[-NEWS_LOOKBACK_CANDLES]
            multi_candle_change = (close - recent_close) / recent_close
        else:
            multi_candle_change = candle_change_pct
        
        # === EVENT DETECTION ===
        
        # 1. REGULATORY EVENT: Big drop + volume spike
        if (candle_change_pct < -NEWS_PRICE_MOVE_PCT and 
            vol_ratio > NEWS_VOLUME_SPIKE_MULT):
            severity = min(1.0, abs(candle_change_pct) / 0.05 + (vol_ratio - 3) / 5)
            events.append(NewsEvent('REGULATORY', severity, 'BEARISH', candle_idx))
        
        # 2. ECOSYSTEM EVENT: Steady climb + volume boost
        elif (multi_candle_change > NEWS_PRICE_MOVE_PCT * 0.7 and 
              vol_ratio > NEWS_VOLUME_SPIKE_MULT * 0.7 and
              candle_change_pct > 0):
            severity = min(1.0, multi_candle_change / 0.05 + (vol_ratio - 2) / 5)
            events.append(NewsEvent('ECOSYSTEM', severity, 'BULLISH', candle_idx))
        
        # 3. WHALE MOVE: Huge volume, small price change
        if (vol_ratio > NEWS_VOLUME_SPIKE_MULT * 1.5 and 
            abs(candle_change_pct) < NEWS_PRICE_MOVE_PCT * 0.3):
            severity = min(1.0, (vol_ratio - 4) / 6)
            direction = 'BULLISH' if candle_change_pct > 0 else 'BEARISH'
            events.append(NewsEvent('WHALE_MOVE', max(0.3, severity), direction, candle_idx))
        
        # 4. PANIC: Rapid drop + extreme RSI
        if rsi < NEWS_RSI_EXTREME_LOW and candle_change_pct < -0.01:
            severity = min(1.0, (NEWS_RSI_EXTREME_LOW - rsi) / 20 + abs(candle_change_pct) / 0.03)
            events.append(NewsEvent('PANIC', severity, 'BEARISH', candle_idx))
        
        # 5. FOMO: Rapid rise + extreme RSI
        if rsi > NEWS_RSI_EXTREME_HIGH and candle_change_pct > 0.01:
            severity = min(1.0, (rsi - NEWS_RSI_EXTREME_HIGH) / 20 + candle_change_pct / 0.03)
            events.append(NewsEvent('FOMO', severity, 'BULLISH', candle_idx))
        
        # Add to tracking
        for event in events:
            self.all_events.append(event)
            self.active_events.append(event)
            self.last_event_candle = candle_idx
        
        # Age existing events + remove old ones
        self.active_events = [
            e for e in self.active_events 
            if (candle_idx - e.candle_idx) < NEWS_COOLDOWN_CANDLES
        ]
        for e in self.active_events:
            e.age = candle_idx - e.candle_idx
        
        return events
    
    def filter_signal(self, action, confidence, candle_idx):
        """
        Apply news-based filtering to a trading signal.
        
        Args:
            action: 'BUY' or 'SELL'
            confidence: current signal confidence
            candle_idx: current candle index
            
        Returns:
            tuple: (new_confidence, blocked, reason)
                - new_confidence: adjusted confidence (may be boosted or reduced)
                - blocked: True if trade should be completely blocked
                - reason: explanation string
        """
        if not self.enabled or not self.active_events:
            return confidence, False, ''
        
        blocked = False
        reason_parts = []
        conf_adj = confidence
        
        for event in self.active_events:
            # Decay: events less impactful as they age
            decay = max(0.2, 1.0 - event.age / NEWS_COOLDOWN_CANDLES)
            effective_severity = event.severity * decay
            
            # --- REGULATORY: Block counter-trend trades ---
            if event.event_type == 'REGULATORY' and self.regulatory_block:
                if action == 'BUY' and event.direction == 'BEARISH':
                    # Don't buy into a regulatory selloff
                    if effective_severity > 0.4:
                        blocked = True
                        reason_parts.append(f'REGULATORY block (sev={effective_severity:.2f})')
                    else:
                        conf_adj *= (1 - effective_severity * 0.3)
                        reason_parts.append(f'REGULATORY penalty')
                elif action == 'SELL' and event.direction == 'BEARISH':
                    # SHORT during regulatory event = good
                    conf_adj *= (1 + effective_severity * 0.15)
                    reason_parts.append(f'REGULATORY SHORT boost')
            
            # --- ECOSYSTEM: Boost aligned trades ---
            elif event.event_type == 'ECOSYSTEM' and self.ecosystem_boost:
                if action == 'BUY' and event.direction == 'BULLISH':
                    conf_adj *= (1 + effective_severity * 0.15)
                    self.trades_boosted += 1
                    reason_parts.append(f'ECOSYSTEM LONG boost')
                elif action == 'SELL' and event.direction == 'BULLISH':
                    # Don't short into ecosystem rally
                    conf_adj *= (1 - effective_severity * 0.2)
                    reason_parts.append(f'ECOSYSTEM SHORT penalty')
            
            # --- PANIC: Block buys, boost shorts ---
            elif event.event_type == 'PANIC' and self.panic_block:
                if action == 'BUY':
                    if effective_severity > 0.5:
                        blocked = True
                        reason_parts.append(f'PANIC block (sev={effective_severity:.2f})')
                    else:
                        conf_adj *= (1 - effective_severity * 0.4)
                elif action == 'SELL':
                    conf_adj *= (1 + effective_severity * 0.10)
                    reason_parts.append(f'PANIC SHORT boost')
            
            # --- FOMO: Block buys (late entry), allow shorts ---
            elif event.event_type == 'FOMO' and self.fomo_block:
                if action == 'BUY':
                    if effective_severity > 0.6:
                        blocked = True
                        reason_parts.append(f'FOMO block (sev={effective_severity:.2f})')
                    else:
                        conf_adj *= (1 - effective_severity * 0.3)
                elif action == 'SELL':
                    # Shorting FOMO can be profitable (mean reversion)
                    conf_adj *= (1 + effective_severity * 0.10)
            
            # --- WHALE: Reduce confidence (uncertain direction) ---
            elif event.event_type == 'WHALE_MOVE' and self.whale_caution:
                conf_adj *= (1 - effective_severity * 0.15)
                reason_parts.append(f'WHALE caution')
        
        if blocked:
            self.trades_blocked += 1
        
        reason = ' | '.join(reason_parts) if reason_parts else ''
        return float(np.clip(conf_adj, 0, 1.0)), blocked, reason
    
    def get_stats(self):
        """Get news filter statistics."""
        event_types = {}
        for e in self.all_events:
            event_types[e.event_type] = event_types.get(e.event_type, 0) + 1
        
        return {
            'enabled': self.enabled,
            'total_events_detected': len(self.all_events),
            'events_by_type': event_types,
            'trades_blocked': self.trades_blocked,
            'trades_boosted': self.trades_boosted,
            'symbol': self.symbol,
        }
    
    def reset(self):
        """Reset for fresh run."""
        self.active_events = []
        self.all_events = []
        self.trades_blocked = 0
        self.trades_boosted = 0
        self.last_event_candle = -999
