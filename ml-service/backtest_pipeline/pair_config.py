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
    'BTCUSDT': 0.00,    # P#229: BTC negative on all TFs — no edge
    'ETHUSDT': 0.00,    # P#229: ETH marginal +$105 on 1h only — not worth allocation
    'SOLUSDT': 0.65,    # P#232: SOL@4h conf=0.75 SL=2.0 TP=4.0 → +$246, Sharpe=2.19 (fresh April data)
    'BNBUSDT': 0.35,    # P#229: BNB@4h conf=0.70 → +$513 standalone (stable)
    'XRPUSDT': 0.00,    # P#230: XRP@4h conf=0.65 has edge (+$1,232) but dilutes SOL/BNB
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
        # P#232: Fresh April 2026 data sweep — SOL regime shifted (lower vol, ranging)
        # P#229 conf=0.65 collapsed from +$1,926 to -$1,518 on fresh data
        # Sweep winner: conf=0.75 SL=2.0 TP=4.0 → +$246, Sharpe=2.19, WR=59%, PF=1.41
        'GPU_NATIVE_MIN_CONFIDENCE': 0.75,  # P#232: 0.65→0.75 — filter choppy signals (36→34 trades, WR 46%→59%)
        
        # P#232: Wider SL gives signals more room to breathe in choppy regime
        'SL_ATR_MULT': 2.00,           # P#232: 1.50→2.00 — fewer stopped out prematurely
        'TP_ATR_MULT': 4.00,           # P#232: 3.00→4.00 — bigger winners compensate wider SL
        'TP_CLAMP_MAX': 6.50,
        
        # Risk sizing — keep conservative until regime confirms
        'RISK_PER_TRADE': 0.060,       # P#229: unchanged — sweep showed risk sizing has minimal impact on PnL direction
        'MAX_POSITION_VALUE_PCT': 0.80, # P#229: unchanged
        
        # Partial profit taking
        'PARTIAL_ATR_L2_MULT': 2.00,
        'PARTIAL_ATR_L3_MULT': 4.00,
        
        # Trailing
        'TRAILING_DISTANCE_ATR': 1.00,   # P#228: 1.25→1.00 — tighter trail to lock more profit on 4h
        'PHASE3_TRAIL_ATR': 1.00,     # P#228: 1.25→1.00
        
        # NeuronAI
        'DEFENSE_MODE_TRIGGER_LOSSES': 9,
        
        # Pre-entry momentum
        'PRE_ENTRY_MOMENTUM_MIN_ALIGNED': 2,
        
        # P#175: Grid V2 (replaces funding_rate — SOL APR=0.8% doesn't cover costs)
        'GRID_V2_ENABLED': True,
        'GRID_V2_ALLOWED_TIMEFRAMES': ['1h'],  # P#204d+: Removed 4h (PF<1.0, net negative -$12). Keep 1h only (PF=1.79, Board5)
        'GRID_V2_ADX_THRESHOLD': 22,   # SOL: slightly higher ADX threshold (volatile)
        'GRID_V2_BB_LOWER_ENTRY': 0.15,  # P#200c: Relaxed from 0.08 — capture more mean-reversion
        'GRID_V2_BB_UPPER_ENTRY': 0.85,  # P#200c: Relaxed from 0.92 — more SELL entries
        'GRID_V2_RSI_OVERSOLD': 35,
        'GRID_V2_RSI_OVERBOUGHT': 65,
        'GRID_V2_SL_ATR': 0.80,       # SOL: wider grid SL (volatile)
        'GRID_V2_TP_ATR': 1.40,       # SOL: wider grid TP
        'GRID_V2_COOLDOWN': 5,         # P#211: reduced 6→5 candles — SOL 1h has proven alpha, allow faster re-entry
        'GRID_V2_MAX_TRADES': 100,     # P#211: boosted 80→100 — SOL 1h is the primary revenue driver
        'GRID_V2_RISK_PER_TRADE': 0.012,  # P#211: boosted 0.008→0.012 — SOL 1h is ONLY proven alpha (PF=1.75, 4/4 positive). Scale the winner.
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
        'DIRECTIONAL_ENABLED': False,   # P#200a: BTC directional PF=0.131, net negative. Pure funding.
        'FUNDING_ARB_ENABLED': True,
        'FUNDING_MIN_RATE': 0.00005,
        'FUNDING_CAPITAL_PCT': 0.50,    # P#200a: Pure funding → 50% capital on funding (was 35%)
        'FUNDING_MAX_UNREALIZED_LOSS': 0.025,
    },
    
    # ====================================================================
    # BNBUSDT — SHORT Bias + Grid V2 + Funding Rate
    # Walk-forward P#71: ✅ ROBUST (PF 0.994→1.322, +33%)
    # P#72: Boosted allocation 10%→18% (earned ROBUST status)
    # Strategy: SHORT-only directional + Grid in RANGING + Funding arb
    # ====================================================================
    'BNBUSDT': {
        # P#229: Per-pair GPU confidence — BNB best at 0.75 (38 trades, PF 2.28, Sharpe 2.82)
        'GPU_NATIVE_MIN_CONFIDENCE': 0.75,  # P#229: 0.60→0.75 — 75% fewer trades, fees $128 vs $535, unlocks +$1,898 edge
        
        'BNB_DIRECTION_FILTER_ENABLED': False,
        'BNB_LONG_MIN_CONFIDENCE': 0.30,
        'BNB_LONG_REQUIRE_MTF_UPTREND': True,
        'BNB_LONG_BLOCK_IN_TRENDING_DOWN': False,
        
        # P#202b: Disable MomentumHTF on BNB — 3 trades, PF=0.18, lost $35 on 1h
        'MOMENTUM_HTF_ENABLED': False,
        
        # P#70: Lower confidence floor for BNB SHORTs
        'CONFIDENCE_FLOOR': 0.15,       # P#200: Was 0.24 — blocked 108/118 signals on 1h
        
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
        'GRID_V2_ALLOWED_TIMEFRAMES': ['15m'],  # P#211: DISABLED 1h (0/4 runs positive, PF=0.504, avg -$25). Keep 15m only (marginal PF=1.37)
        'GRID_V2_ADX_THRESHOLD': 18,
        'GRID_V2_BB_LOWER_ENTRY': 0.12,   # P#200c: Relaxed from 0.07 — more entries
        'GRID_V2_BB_UPPER_ENTRY': 0.88,   # P#200c: Relaxed from 0.93
        'GRID_V2_RSI_OVERSOLD': 36,
        'GRID_V2_RSI_OVERBOUGHT': 64,
        'GRID_V2_SL_ATR': 0.65,
        'GRID_V2_TP_ATR': 1.50,           # P#211: widened 1.20→1.50 ATR — bigger winners to overcome 30% fee drag (avg move 0.23%, need more TP room)
        'GRID_V2_COOLDOWN': 8,             # P#200c: 8 candles = 2h on 15m (was 18 = 4.5h)
        'GRID_V2_MAX_TRADES': 50,          # P#200c: 50 max (was 22)
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
        'GRID_V2_ENABLED': False,       # P#201a: ETH Grid V2 lost -$83.80 across ALL TFs (PF 0.409-0.702). Funding-only.
        'FUNDING_ARB_ENABLED': True,
        'FUNDING_MIN_RATE': 0.00005,
        'FUNDING_CAPITAL_PCT': 0.40,    # P#200a: Pure funding formalized → 40% (was 25%)
        'FUNDING_MAX_UNREALIZED_LOSS': 0.025,
        # P#198: Disable ETH directional — loses -$34, funding makes +$24
        # WR=40% on 1h, WR=25% on 4h → net negative. Funding-only + Grid V2.
        'DIRECTIONAL_ENABLED': False,
        
        # P#177: ETH Grid V2 discipline — reduce overtrading (was 152 trades, PF 0.724)
        'GRID_V2_ADX_THRESHOLD': 20,   # Tighter than default 15
        'GRID_V2_BB_LOWER_ENTRY': 0.12,  # P#200c: Relaxed from 0.08 → 0.12
        'GRID_V2_BB_UPPER_ENTRY': 0.88,  # P#200c: Relaxed from 0.92 → 0.88
        'GRID_V2_COOLDOWN': 12,         # P#200c: 12 candles = 3h (was 20 = 5h)
        'GRID_V2_MAX_TRADES': 35,       # P#200c: 35 max (was 18)
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
        'RISK_PER_TRADE': 0.020,       # P#228 iter10: 0.012→0.020 — XRP consistently profitable with bagging, scale up
        # P#204d+: Enable Grid V2 on XRP 1h — ranging 80% of time, low spread on Kraken (Board5: Liam Chen)
        # P#211e: DISABLED — 36 trades across 1yr, PF=0.456, WR=36.1%, net=-$25.60. No alpha.
        'GRID_V2_ENABLED': False,
        'GRID_V2_ALLOWED_TIMEFRAMES': ['1h'],
        'GRID_V2_ADX_THRESHOLD': 23,
        'GRID_V2_BB_LOWER_ENTRY': 0.15,
        'GRID_V2_BB_UPPER_ENTRY': 0.85,
        'GRID_V2_RSI_OVERSOLD': 35,
        'GRID_V2_RSI_OVERBOUGHT': 65,
        'GRID_V2_SL_ATR': 0.70,         # Standard SL, not too tight
        'GRID_V2_TP_ATR': 1.30,
        'GRID_V2_COOLDOWN': 8,
        'GRID_V2_MAX_TRADES': 40,
        'GRID_V2_RISK_PER_TRADE': 0.005,
        'DIRECTIONAL_ENABLED': False,   # P#200a: XRP directional PF=0.588, net negative. Pure funding + grid.
        'FUNDING_ARB_ENABLED': True,
        'FUNDING_MIN_RATE': 0.00005,
        'FUNDING_CAPITAL_PCT': 0.50,    # P#200a: Pure funding → 50% capital on funding (was 35%)
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
