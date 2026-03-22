"""
TURBO-BOT P#72 — Per-Pair Configuration Overrides
Each pair has unique characteristics requiring different parameters.

Current operating policy:
- all five requested pairs remain active: BTC, ETH, SOL, BNB, XRP
- no pair is directionally disabled by impossible confidence floors
- pair overrides tune behavior, but do not silently exclude symbols from testing
"""

# ============================================================================
# CAPITAL ALLOCATION (P#72: BNB boost, SOL trim, ETH/XRP trim)
# ============================================================================
# BNB = most robust multi-pair sleeve after fresh remote-GPU validation
# SOL = good test-period edge, but full-sample losses were too concentrated
# BTC/XRP stay active as contained sleeves leaning on funding rather than
# high-frequency ranging/grid turnover.

PORTFOLIO_CAPITAL = 10000  # Total portfolio capital

PAIR_CAPITAL_ALLOCATION = {
    'BTCUSDT': 0.08,    # P#175: funding-only, reduced from 10%
    'ETHUSDT': 0.12,    # ✅ ROBUST (PF 1.357 test)
    'SOLUSDT': 0.25,    # P#175: ✅ ROBUST grid_v2 (PF 3.235 test), boosted from 22%
    'BNBUSDT': 0.40,    # ✅ ROBUST (PF 2.484 test), boosted from 38%
    'XRPUSDT': 0.15,    # P#175: funding-only, reduced from 18%
}

# ============================================================================
# PAIR-SPECIFIC CONFIG OVERRIDES
# ============================================================================
# Each dict contains ONLY the params that differ from the base config.
# Engine applies these on top of the base config at runtime.

PAIR_OVERRIDES = {
    # ====================================================================
    # SOLUSDT — Star Performer
    # Higher volatility → wider SL/TP, more partials, more aggressive
    # P#68: PF 1.562, Sharpe 6.4, +4.52%, WR 84.7%, MaxDD 2.55%
    # P#175: Switched from funding_rate to grid_v2 (funding APR=0.8% too low)
    # SOL has high volatility → good for grid_v2 mean-reversion
    # Kept wider SL/TP to accommodate SOL's larger ATR
    # ====================================================================
    'SOLUSDT': {
        # Wider SL to accommodate SOL volatility (ATR is larger)
        'SL_ATR_MULT': 2.00,
        'TP_ATR_MULT': 3.00,
        'TP_CLAMP_MAX': 5.50,
        
        # Risk sizing
        'RISK_PER_TRADE': 0.010,       # P#175: reduced from 0.014 for grid_v2 higher frequency
        'MAX_POSITION_VALUE_PCT': 0.50,
        
        # Partial profit taking
        'PARTIAL_ATR_L2_MULT': 2.00,
        'PARTIAL_ATR_L3_MULT': 4.00,
        
        # Trailing
        'TRAILING_DISTANCE_ATR': 1.25,
        'PHASE3_TRAIL_ATR': 1.25,
        
        # NeuronAI
        'DEFENSE_MODE_TRIGGER_LOSSES': 9,
        
        # Pre-entry momentum
        'PRE_ENTRY_MOMENTUM_MIN_ALIGNED': 2,
        
        # P#175: Grid V2 (replaces funding_rate — SOL APR=0.8% doesn't cover costs)
        'GRID_V2_ENABLED': True,
        'GRID_V2_ADX_THRESHOLD': 22,   # SOL: slightly higher ADX threshold (volatile)
        'GRID_V2_BB_LOWER_ENTRY': 0.08,  # SOL: tighter BB entry (more volatile)
        'GRID_V2_BB_UPPER_ENTRY': 0.92,
        'GRID_V2_RSI_OVERSOLD': 35,
        'GRID_V2_RSI_OVERBOUGHT': 65,
        'GRID_V2_SL_ATR': 0.80,       # SOL: wider grid SL (volatile)
        'GRID_V2_TP_ATR': 1.40,       # SOL: wider grid TP
        'GRID_V2_COOLDOWN': 12,        # SOL: faster cooldown (3h on 15m)
        'GRID_V2_MAX_TRADES': 40,
        'GRID_V2_RISK_PER_TRADE': 0.010,
        # P#198: Re-enable funding arb — diversify income (grid+funding dual)
        # P#175 disabled at APR=0.8%, but any positive funding adds edge
        # Lower min_rate threshold captures more funding windows
        'FUNDING_ARB_ENABLED': True,
        'FUNDING_MIN_RATE': 0.00005,   # Lower than BNB (0.00008) — SOL funding is smaller
        'FUNDING_CAPITAL_PCT': 0.20,   # 20% of SOL allocation to funding hedge
        'FUNDING_MAX_UNREALIZED_LOSS': 0.025,
    },
    
    # ====================================================================
    # BTCUSDT — Funding Rate only (P#175 review)
    # P#175: momentum_htf created but can't be properly backtested on 15m data
    #   (needs real multi-TF 4h+15m which backtest doesn't provide)
    # Live BTC runs momentum_htf with real multi-TF data from exchanges
    # Backtest: funding-only (APR=6.45%, proven)
    # ====================================================================
    'BTCUSDT': {
        'BTC_DIRECTION_FILTER_ENABLED': False,
        'BTC_LONG_BLOCK_ALL': False,
        'CONFIDENCE_FLOOR': 0.30,       # P#195: was 0.38 — too high, BTC had 0 trades on all TFs
        'RISK_PER_TRADE': 0.005,
        'GRID_V2_ENABLED': False,
        'MOMENTUM_HTF_ENABLED': False,  # P#175: can't backtest on 15m (needs 4h+15m)
        'FUNDING_ARB_ENABLED': True,
        'FUNDING_MIN_RATE': 0.00005,
        'FUNDING_CAPITAL_PCT': 0.35,
        'FUNDING_MAX_UNREALIZED_LOSS': 0.025,
    },
    
    # ====================================================================
    # BNBUSDT — SHORT Bias + Grid V2 + Funding Rate
    # Walk-forward P#71: ✅ ROBUST (PF 0.994→1.322, +33%)
    # P#72: Boosted allocation 10%→18% (earned ROBUST status)
    # Strategy: SHORT-only directional + Grid in RANGING + Funding arb
    # ====================================================================
    'BNBUSDT': {
        'BNB_DIRECTION_FILTER_ENABLED': False,
        'BNB_LONG_MIN_CONFIDENCE': 0.30,
        'BNB_LONG_REQUIRE_MTF_UPTREND': True,
        'BNB_LONG_BLOCK_IN_TRENDING_DOWN': False,
        
        # P#70: Lower confidence floor for BNB SHORTs
        'CONFIDENCE_FLOOR': 0.24,
        
        # P#72: Slightly more aggressive (ROBUST pair)
        'RISK_PER_TRADE': 0.014,
        
        # P#74: Cap max position value to prevent outlier SL losses
        # Trades #50/#51 lost $31 each due to position size scaling up too fast
        'MAX_POSITION_VALUE_PCT': 0.60,  # P#74: 60% max position (was 100% default)
        
        # Tighter trailing for BNB
        'TRAILING_DISTANCE_ATR': 0.85,
        
        # P#71: Funding Rate Arbitrage
        'FUNDING_ARB_ENABLED': True,
        'FUNDING_MIN_RATE': 0.00008,
        'FUNDING_CAPITAL_PCT': 0.35,
        
        # P#71: Grid V2
        'GRID_V2_ENABLED': True,
        'GRID_V2_ADX_THRESHOLD': 18,
        'GRID_V2_BB_LOWER_ENTRY': 0.07,
        'GRID_V2_BB_UPPER_ENTRY': 0.93,
        'GRID_V2_RSI_OVERSOLD': 36,
        'GRID_V2_RSI_OVERBOUGHT': 64,
        'GRID_V2_SL_ATR': 0.65,
        'GRID_V2_TP_ATR': 1.20,
        'GRID_V2_COOLDOWN': 18,
        'GRID_V2_MAX_TRADES': 22,
        'GRID_V2_RISK_PER_TRADE': 0.005,
        
        # P#71: News filter — Binance ecosystem events
        'NEWS_FILTER_ENABLED': True,
        'NEWS_ECOSYSTEM_BOOST': True,   # Boost on positive BNB news
        'NEWS_REGULATORY_BLOCK': False,  # BNB less regulatory risk
    },
    
    # ====================================================================
    # ETHUSDT — PURE Funding Rate (P#72: directional fully disabled)
    # P#71 walk-forward: CURVE-FIT (PF 0.917→0.463)
    # P#72: CONFIDENCE_FLOOR=0.55 kills ALL directional + grid
    # Only funding rate arb runs (ETH has highest avg funding)
    # ====================================================================
    'ETHUSDT': {
        'CONFIDENCE_FLOOR': 0.34,
        'RISK_PER_TRADE': 0.006,
        'GRID_V2_ENABLED': True,
        'FUNDING_ARB_ENABLED': True,
        'FUNDING_MIN_RATE': 0.00005,
        'FUNDING_CAPITAL_PCT': 0.25,
        'FUNDING_MAX_UNREALIZED_LOSS': 0.025,
        # P#198: Disable ETH directional — loses -$34, funding makes +$24
        # WR=40% on 1h, WR=25% on 4h → net negative. Funding-only + Grid V2.
        'DIRECTIONAL_ENABLED': False,
        
        # P#177: ETH Grid V2 discipline — reduce overtrading (was 152 trades, PF 0.724)
        'GRID_V2_ADX_THRESHOLD': 20,   # Tighter than default 15
        'GRID_V2_BB_LOWER_ENTRY': 0.08,  # Tighter BB band entry
        'GRID_V2_BB_UPPER_ENTRY': 0.92,
        'GRID_V2_COOLDOWN': 20,         # 5h on 15m (vs default 16)
        'GRID_V2_MAX_TRADES': 18,       # Hard cap on grid trades
        'GRID_V2_RISK_PER_TRADE': 0.005,
        
        # P#71: News filter for ETH
        'NEWS_FILTER_ENABLED': True,
        'NEWS_PANIC_BLOCK': True,
        'NEWS_FOMO_BLOCK': True,
    },
    
    # ====================================================================
    # XRPUSDT — Funding Rate only (P#175 review)
    # P#175: Tested grid_v2 → PF 0.461→0.660 CURVE-FIT, no edge
    # Reverted to funding-only (APR=3.18%, positive=63.3%)
    # Capital: 18% to capture funding spikes
    # ====================================================================
    'XRPUSDT': {
        'CONFIDENCE_FLOOR': 0.38,
        'RISK_PER_TRADE': 0.004,
        'GRID_V2_ENABLED': False,
        'FUNDING_ARB_ENABLED': True,
        'FUNDING_MIN_RATE': 0.00005,
        'FUNDING_CAPITAL_PCT': 0.35,
        'FUNDING_MAX_UNREALIZED_LOSS': 0.03,
        # News filter — still valuable for funding decisions
        'NEWS_FILTER_ENABLED': True,
        'NEWS_REGULATORY_BLOCK': True,
        'NEWS_PANIC_BLOCK': True,
    },
}


def get_pair_overrides(symbol):
    """Get config overrides for a specific pair."""
    return PAIR_OVERRIDES.get(symbol, {})


def get_pair_capital(symbol, total_capital=None):
    """Get capital allocation for a specific pair."""
    total = total_capital or PORTFOLIO_CAPITAL
    alloc = PAIR_CAPITAL_ALLOCATION.get(symbol, 0.0)
    return total * alloc


def get_active_pairs():
    """Get list of pairs with non-zero capital allocation."""
    return [pair for pair, alloc in PAIR_CAPITAL_ALLOCATION.items() if alloc > 0]


def apply_pair_overrides(symbol):
    """
    Apply pair-specific overrides to the config module at runtime.
    Returns a dict of {param: original_value} for restoration.
    
    IMPORTANT: Call restore_config() after backtest to reset!
    """
    from . import config as cfg
    overrides = get_pair_overrides(symbol)
    originals = {}
    
    for param, value in overrides.items():
        if hasattr(cfg, param):
            originals[param] = getattr(cfg, param)
            setattr(cfg, param, value)
        # Custom params (like BNB_DIRECTION_FILTER_ENABLED) are set regardless
        if not hasattr(cfg, param):
            originals[param] = None  # Mark as new (to delete on restore)
            setattr(cfg, param, value)
    
    return originals


def restore_config(originals):
    """Restore config to original values after pair-specific run."""
    from . import config as cfg
    for param, original_value in originals.items():
        if original_value is None:
            # Was newly added — remove it
            if hasattr(cfg, param):
                delattr(cfg, param)
        else:
            setattr(cfg, param, original_value)


# ============================================================================
# P#197 FAZA 2.6: TIMEFRAME HIERARCHY OVERRIDES
# ============================================================================

def apply_timeframe_overrides(timeframe):
    """
    Apply per-TF overrides from config.TIMEFRAME_OVERRIDES.
    Returns dict of {param: original_value} for restoration.
    """
    from . import config as cfg
    tf_overrides = getattr(cfg, 'TIMEFRAME_OVERRIDES', {}).get(timeframe, {})
    originals = {}

    for param, value in tf_overrides.items():
        if hasattr(cfg, param):
            originals[param] = getattr(cfg, param)
        else:
            originals[param] = None
        setattr(cfg, param, value)

    return originals
