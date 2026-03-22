"""
TURBO-BOT P#71+P#152 — Funding Rate Arbitrage Module
Delta-neutral strategy: simulates spot-long + perpetual-short when funding > threshold.

HOW IT WORKS:
- When funding rate is positive (longs pay shorts), we:
  1. Hold spot LONG (neutral exposure)
  2. Short perpetual (collect funding every 8h)
  3. Net position = delta-neutral, but we earn funding payments
- When funding rate is negative → close/skip (shorts pay longs)

IN BACKTEST:
- P#152: When FUNDING_USE_REAL_DATA=True, uses real Kraken Futures funding rates
  via KrakenFundingDataProvider (cached locally)
- Fallback: simulated funding rates from price action + volatility
- Funding settles every 8 hours (candles 0:00, 8:00, 16:00 UTC on 15m = every 32 candles)

CAPITAL:
- Funding arb uses SEPARATE capital from directional trades
- It's always-on when funding > threshold (no signal dependency)
"""

import numpy as np
import pandas as pd
from . import config
from .kraken_funding_provider import KrakenFundingDataProvider


# ============================================================================
# FUNDING RATE SIMULATION PARAMETERS
# ============================================================================

# Funding settlement: every 8 hours = 32 candles on 15m
FUNDING_INTERVAL_15M = 32  # candles between funding settlements
FUNDING_INTERVAL_1H = 8    # candles on 1h
FUNDING_INTERVAL_4H = 2    # candles on 4h

# Thresholds
FUNDING_MIN_RATE = 0.0001       # Min funding rate to enter (0.01% per 8h)
FUNDING_MAX_RATE = 0.005        # Max realistic funding (0.5% per 8h = extreme)
FUNDING_EXIT_RATE = -0.0001     # Exit when funding turns negative

# Risk management
FUNDING_CAPITAL_PCT = 0.30       # Use 30% of pair capital for funding arb
FUNDING_MAX_UNREALIZED_LOSS = 0.02  # Exit if spot price drops > 2% (hedge gap)
FUNDING_MIN_CANDLES = 200        # Warmup before starting


class FundingRateSimulator:
    """
    Provides funding rate for backtesting.
    
    P#152: Supports two modes:
    1. REAL DATA (use_real_data=True): Uses cached Kraken Futures funding rates
    2. SIMULATED (use_real_data=False): Estimates from price action (legacy)
    """
    
    def __init__(self, symbol='BTCUSDT', use_real_data=None):
        self.funding_history = []
        self.base_rate = 0.0001  # 0.01% base (Binance default)
        self.symbol = symbol
        
        # P#152: Real data mode
        if use_real_data is None:
            use_real_data = getattr(config, 'FUNDING_USE_REAL_DATA', False)
        self.use_real_data = use_real_data
        self._real_provider = None
        self._real_data_loaded = False
        
        if self.use_real_data:
            self._init_real_data()
    
    def _init_real_data(self):
        """Initialize Kraken funding data provider."""
        provider = KrakenFundingDataProvider(self.symbol)
        if provider.is_supported():
            if provider.fetch_and_cache():
                self._real_provider = provider
                self._real_data_loaded = True
                stats = provider.get_stats()
                print(f"  📊 {self.symbol} real funding: mean_8h={stats['mean_rate_8h']:.6f}, "
                      f"positive={stats['positive_pct']}%, "
                      f"est. APR={stats['estimated_annual_yield']}%")
            else:
                print(f"  ⚠️ {self.symbol}: Real funding data fetch failed — falling back to simulation")
                self.use_real_data = False
        else:
            print(f"  ⚠️ {self.symbol}: No Kraken perpetual available — using simulation")
            self.use_real_data = False
        
    def estimate_funding_rate(self, row, history, regime):
        """
        Get funding rate for current candle.
        
        P#152: If real data loaded, returns actual Kraken rate.
        Otherwise falls back to simulation.
        """
        # P#152: Try real data first
        if self._real_data_loaded and self._real_provider is not None:
            candle_time = getattr(row, 'name', None)  # DataFrame index = timestamp
            if candle_time is not None:
                real_rate = self._real_provider.get_rate_at(candle_time)
                if real_rate is not None:
                    self.funding_history.append(real_rate)
                    return real_rate
        
        # Fallback: simulation
        return self._simulate_rate(row, history, regime)
    
    def _simulate_rate(self, row, history, regime):
        """
        Legacy: Estimate funding rate from price action.
        
        CALIBRATED to real-world Binance/Bybit funding rates:
        - Average: 0.01% per 8h (0.0001) = ~11% APR
        - Bull market average: 0.015-0.025% per 8h = 16-27% APR
        - Extreme: 0.05-0.10% per 8h = short-lived spikes
        - Negative periods: ~30-40% of time
        
        Returns:
            float: estimated funding rate per 8h settlement
        """
        if len(history) < 50:
            return self.base_rate
        
        close = row['close']
        
        # 1. Premium component: short-term momentum → funding direction
        returns_20 = history['close'].pct_change(20).iloc[-1] if len(history) >= 20 else 0
        premium_component = np.clip(returns_20 * 0.05, -0.0003, 0.0003)
        
        # 2. Volatility component: higher vol = slightly higher absolute funding
        atr = row.get('atr', close * 0.01)
        atr_pct = atr / close
        vol_multiplier = np.clip(atr_pct / 0.015, 0.7, 1.8)
        
        # 3. RSI component: extreme readings amplify funding
        rsi = row.get('rsi_14', 50)
        if rsi > 70:
            rsi_component = (rsi - 70) / 30000
        elif rsi < 30:
            rsi_component = (rsi - 30) / 30000
        else:
            rsi_component = 0
        
        # 4. Volume surge component
        vol_ratio = row.get('volume_ratio', 1.0)
        vol_component = (vol_ratio - 1.0) * 0.00003
        
        # 5. Regime adjustment
        regime_adj = {
            'TRENDING_UP': 0.00005,
            'TRENDING_DOWN': -0.00003,
            'RANGING': 0.00001,
            'HIGH_VOLATILITY': 0.00008,
        }.get(regime, 0)
        
        # Composite funding rate
        funding = (
            self.base_rate +
            premium_component * vol_multiplier +
            rsi_component +
            vol_component +
            regime_adj
        )
        
        # Clamp to realistic range
        funding = np.clip(funding, -FUNDING_MAX_RATE, FUNDING_MAX_RATE)
        
        # Add noise for realism
        noise = np.random.normal(0, 0.00003)
        funding += noise
        
        self.funding_history.append(funding)
        return funding
    
    def reset(self):
        """Reset simulator state."""
        self.funding_history = []


class FundingRateArbitrage:
    """
    Manages funding rate arbitrage positions.
    
    Position lifecycle:
    1. IDLE → Check funding rate each settlement
    2. If funding > threshold → OPEN (spot long + perp short = delta-neutral)
    3. Collect funding every 8h while open
    4. If funding turns negative → CLOSE
    5. If unrealized loss > max → CLOSE (hedge gap protection)
    """
    
    def __init__(self, symbol='BTCUSDT'):
        self.symbol = symbol
        self.position_open = False
        self.entry_price = 0
        self.capital_allocated = 0
        self.total_funding_collected = 0
        self.total_funding_fees = 0  # Spot+perp trading fees for entry/exit
        self.position_count = 0
        self.settlement_count = 0
        self.funding_payments = []
        self.candles_in_position = 0
        self.best_funding_rate = 0
        self.simulator = FundingRateSimulator(symbol=symbol)  # P#152: passes symbol for real data
        
        # Per-pair config
        self.min_rate = FUNDING_MIN_RATE
        self.exit_rate = FUNDING_EXIT_RATE
        self.capital_pct = FUNDING_CAPITAL_PCT
        self.max_unrealized_loss_pct = FUNDING_MAX_UNREALIZED_LOSS
        
    def configure(self, **kwargs):
        """Apply per-pair configuration overrides."""
        if 'FUNDING_MIN_RATE' in kwargs:
            self.min_rate = kwargs['FUNDING_MIN_RATE']
        if 'FUNDING_EXIT_RATE' in kwargs:
            self.exit_rate = kwargs['FUNDING_EXIT_RATE']
        if 'FUNDING_CAPITAL_PCT' in kwargs:
            self.capital_pct = kwargs['FUNDING_CAPITAL_PCT']
        if 'FUNDING_MAX_UNREALIZED_LOSS' in kwargs:
            self.max_unrealized_loss_pct = kwargs['FUNDING_MAX_UNREALIZED_LOSS']
    
    def process_candle(self, row, history, regime, pair_capital, candle_idx,
                       funding_interval=FUNDING_INTERVAL_15M):
        """
        Process one candle for funding rate arbitrage.
        
        Called every candle by the engine. Only acts on settlement candles.
        
        Args:
            row: current candle
            history: recent history
            regime: current market regime
            pair_capital: total capital allocated to this pair
            candle_idx: current candle index
            funding_interval: candles between settlements
            
        Returns:
            dict: {
                'funding_collected': float,  # funding earned this candle (0 if not settlement)
                'position_open': bool,
                'action': str,  # 'OPEN', 'CLOSE', 'COLLECT', 'NONE'
                'funding_rate': float,
                'unrealized_pnl': float,
            }
        """
        result = {
            'funding_collected': 0,
            'position_open': self.position_open,
            'action': 'NONE',
            'funding_rate': 0,
            'unrealized_pnl': 0,
        }
        
        # Warmup
        if candle_idx < FUNDING_MIN_CANDLES:
            return result
        
        # Estimate current funding rate
        funding_rate = self.simulator.estimate_funding_rate(row, history, regime)
        result['funding_rate'] = funding_rate
        
        # Calculate unrealized PnL if position open
        if self.position_open:
            self.candles_in_position += 1
            # Delta-neutral: unrealized PnL comes from basis risk (spot vs perp divergence)
            # Simulated as small fraction of price change (typically < 0.1% divergence)
            price_change_pct = (row['close'] - self.entry_price) / self.entry_price
            # Basis risk: ~10% of price change leaks through (imperfect hedge)
            basis_leak = abs(price_change_pct) * 0.10
            result['unrealized_pnl'] = -basis_leak * self.capital_allocated
        
        # Check if this is a settlement candle
        is_settlement = (candle_idx % funding_interval == 0)
        
        if not is_settlement:
            # Not settlement — check for emergency exit only
            if self.position_open:
                if abs(result['unrealized_pnl']) > self.max_unrealized_loss_pct * self.capital_allocated:
                    # Emergency close — basis risk too high
                    result['action'] = 'CLOSE'
                    self._close_position(row)
            return result
        
        # === SETTLEMENT CANDLE ===
        self.settlement_count += 1
        
        if self.position_open:
            if funding_rate > 0:
                # Positive funding → we collect (shorts earn from longs)
                payment = funding_rate * self.capital_allocated
                self.total_funding_collected += payment
                self.funding_payments.append(payment)
                result['funding_collected'] = payment
                result['action'] = 'COLLECT'
                self.best_funding_rate = max(self.best_funding_rate, funding_rate)
                
            elif funding_rate < self.exit_rate:
                # P#72: Require minimum time in position before closing
                # Prevents fee churning (open→close→open cycles)
                # Min 3 settlements (24h on 15m) before considering close
                if self.candles_in_position >= funding_interval * 3:
                    result['action'] = 'CLOSE'
                    self._close_position(row)
                else:
                    # Too early to close — wait for possible recovery
                    result['action'] = 'COLLECT'
                    result['funding_collected'] = max(0, funding_rate * self.capital_allocated * 0.5)
                    self.total_funding_collected += result['funding_collected']
                
            else:
                # Funding near zero but not negative enough to close
                result['action'] = 'COLLECT'
                result['funding_collected'] = max(0, funding_rate * self.capital_allocated)
                self.total_funding_collected += result['funding_collected']
                
        else:
            # No position — check if we should open
            if funding_rate >= self.min_rate:
                alloc_capital = pair_capital * self.capital_pct
                
                # P#72: Fee-aware open condition (skip for very low min_rate pairs)
                # If min_rate is very low (<0.0001), trust the rate and skip fee check
                # Anti-churning (min hold 3 settlements) prevents fee death
                should_open = True
                if self.min_rate >= 0.0001:
                    fee_rate = getattr(config, 'FEE_RATE', 0.00075)
                    entry_fees = alloc_capital * fee_rate * 2
                    expected_funding = funding_rate * alloc_capital * 10
                    should_open = (expected_funding > entry_fees)
                
                if should_open:
                    result['action'] = 'OPEN'
                    self._open_position(row, pair_capital)
                    result['position_open'] = True
                
        return result
    
    def _open_position(self, row, pair_capital):
        """Open funding arb position (spot long + perp short)."""
        self.position_open = True
        self.entry_price = row['close']
        self.capital_allocated = pair_capital * self.capital_pct
        self.candles_in_position = 0
        self.position_count += 1
        
        # Entry fees: spot buy + perp short open (2x trading fees)
        fee_rate = getattr(config, 'FEE_RATE', 0.00075)
        entry_fee = self.capital_allocated * fee_rate * 2
        self.total_funding_fees += entry_fee
        
    def _close_position(self, row):
        """Close funding arb position."""
        self.position_open = False
        
        # Exit fees: spot sell + perp close (2x trading fees)
        fee_rate = getattr(config, 'FEE_RATE', 0.00075)
        exit_fee = self.capital_allocated * fee_rate * 2
        self.total_funding_fees += exit_fee
        
        self.capital_allocated = 0
        self.entry_price = 0
        self.candles_in_position = 0
    
    def force_close(self, row):
        """Force close at end of backtest."""
        if self.position_open:
            self._close_position(row)
    
    def get_net_pnl(self):
        """Get net PnL from funding arbitrage (collected - fees)."""
        return self.total_funding_collected - self.total_funding_fees
    
    def get_stats(self):
        """Get comprehensive funding arb stats."""
        net_pnl = self.get_net_pnl()
        avg_payment = np.mean(self.funding_payments) if self.funding_payments else 0
        
        stats = {
            'enabled': True,
            'data_source': 'kraken_real' if self.simulator.use_real_data else 'simulated',
            'positions_opened': self.position_count,
            'settlements_processed': self.settlement_count,
            'funding_collected': round(self.total_funding_collected, 4),
            'trading_fees': round(self.total_funding_fees, 4),
            'net_pnl': round(net_pnl, 4),
            'avg_funding_payment': round(avg_payment, 6),
            'total_payments': len(self.funding_payments),
            'best_funding_rate': round(self.best_funding_rate, 6),
            'avg_funding_rate': round(np.mean(self.simulator.funding_history), 6) if self.simulator.funding_history else 0,
        }
        
        # P#152: Include real data provider stats if available
        if self.simulator._real_provider is not None:
            stats['real_data_stats'] = self.simulator._real_provider.get_stats()
        
        return stats
    
    def reset(self):
        """Reset for fresh run (preserves real data provider)."""
        self.position_open = False
        self.entry_price = 0
        self.capital_allocated = 0
        self.total_funding_collected = 0
        self.total_funding_fees = 0
        self.position_count = 0
        self.settlement_count = 0
        self.funding_payments = []
        self.candles_in_position = 0
        self.best_funding_rate = 0
        # Only reset history, keep real data provider loaded
        self.simulator.funding_history = []
