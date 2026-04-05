"""
P#232: SOL Regime Analysis + Full Parameter Sweep
Diagnose WHY SOL lost edge and find new optimal parameters.
"""
import sys, json, time
import numpy as np
import pandas as pd
sys.path.insert(0, '.')

from backtest_pipeline.walk_forward import walk_forward_backtest
from backtest_pipeline.pair_config import apply_pair_overrides, PAIR_OVERRIDES
from backtest_pipeline import config

# ============================================================
# PHASE 1: SOL REGIME ANALYSIS — what changed?
# ============================================================
print("=" * 70)
print("  PHASE 1: SOL REGIME ANALYSIS")
print("=" * 70)

df = pd.read_csv('data/solusdt_4h.csv', index_col='datetime', parse_dates=True)

# Split into old (train data for P#229) and new (post-March 19)
split_date = '2026-03-19'
df_old = df[df.index <= split_date]
df_new = df[df.index > split_date]

def analyze_regime(df_chunk, label):
    """Analyze market regime metrics for a data chunk."""
    close = df_chunk['close']
    returns = close.pct_change().dropna()
    
    # Volatility
    vol = returns.std() * np.sqrt(6 * 365)  # annualized for 4h
    
    # ADX (from pre-calculated column)
    adx_mean = df_chunk['adx'].mean() if 'adx' in df_chunk.columns else 0
    
    # Trend strength: directional move / total distance
    total_move = close.iloc[-1] - close.iloc[0]
    total_distance = close.diff().abs().sum()
    trend_efficiency = abs(total_move) / total_distance if total_distance > 0 else 0
    
    # ATR relative to price
    atr_pct = (df_chunk['atr'] / close).mean() * 100 if 'atr' in df_chunk.columns else 0
    
    # RSI distribution
    rsi_mean = df_chunk['rsi_14'].mean() if 'rsi_14' in df_chunk.columns else 50
    rsi_std = df_chunk['rsi_14'].std() if 'rsi_14' in df_chunk.columns else 0
    
    # Price range
    price_range_pct = (close.max() - close.min()) / close.mean() * 100
    
    # Consecutive direction changes (choppiness)
    direction = np.sign(returns)
    direction_changes = (direction.diff().abs() > 0).sum()
    choppiness = direction_changes / len(returns) * 100
    
    print(f"\n  [{label}] ({len(df_chunk)} candles, {df_chunk.index[0].date()} -> {df_chunk.index[-1].date()})")
    print(f"  Price:      ${close.iloc[0]:.2f} -> ${close.iloc[-1]:.2f} ({total_move/close.iloc[0]*100:+.1f}%)")
    print(f"  Volatility: {vol:.1f}% (annualized)")
    print(f"  ADX mean:   {adx_mean:.1f} ({'TRENDING' if adx_mean > 25 else 'RANGING/CHOPPY'})")
    print(f"  Trend eff:  {trend_efficiency:.3f} (1.0=pure trend, 0=choppy)")
    print(f"  ATR/Price:  {atr_pct:.2f}%")
    print(f"  RSI:        {rsi_mean:.1f} +/- {rsi_std:.1f}")
    print(f"  Price range:{price_range_pct:.1f}%")
    print(f"  Choppiness: {choppiness:.1f}% direction changes")
    
    return {
        'volatility': vol, 'adx': adx_mean, 'trend_eff': trend_efficiency,
        'atr_pct': atr_pct, 'rsi_mean': rsi_mean, 'choppiness': choppiness,
        'price_range': price_range_pct,
    }

old_regime = analyze_regime(df_old, "OLD (pre-Mar19)")
new_regime = analyze_regime(df_new, "NEW (post-Mar19)")

print(f"\n  REGIME SHIFT SUMMARY:")
print(f"  ADX:          {old_regime['adx']:.1f} -> {new_regime['adx']:.1f} (Δ{new_regime['adx']-old_regime['adx']:+.1f})")
print(f"  Trend Eff:    {old_regime['trend_eff']:.3f} -> {new_regime['trend_eff']:.3f}")
print(f"  Volatility:   {old_regime['volatility']:.1f}% -> {new_regime['volatility']:.1f}%")
print(f"  Choppiness:   {old_regime['choppiness']:.1f}% -> {new_regime['choppiness']:.1f}%")

# ============================================================
# PHASE 2: PARAMETER SWEEP — find what works NOW
# ============================================================
print(f"\n{'='*70}")
print("  PHASE 2: SOL PARAMETER SWEEP")
print(f"{'='*70}")

sweep_configs = [
    # (label, overrides_dict)
    # Confidence sweep
    ("conf=0.55", {'GPU_NATIVE_MIN_CONFIDENCE': 0.55}),
    ("conf=0.60", {'GPU_NATIVE_MIN_CONFIDENCE': 0.60}),
    ("conf=0.65 (current)", {'GPU_NATIVE_MIN_CONFIDENCE': 0.65}),
    ("conf=0.70", {'GPU_NATIVE_MIN_CONFIDENCE': 0.70}),
    ("conf=0.75", {'GPU_NATIVE_MIN_CONFIDENCE': 0.75}),
    ("conf=0.80", {'GPU_NATIVE_MIN_CONFIDENCE': 0.80}),
    
    # SL/TP sweep (at conf=0.65)
    ("SL=1.0 TP=2.5", {'GPU_NATIVE_MIN_CONFIDENCE': 0.65, 'SL_ATR_MULT': 1.00, 'TP_ATR_MULT': 2.50}),
    ("SL=1.0 TP=3.0", {'GPU_NATIVE_MIN_CONFIDENCE': 0.65, 'SL_ATR_MULT': 1.00, 'TP_ATR_MULT': 3.00}),
    ("SL=1.25 TP=3.0", {'GPU_NATIVE_MIN_CONFIDENCE': 0.65, 'SL_ATR_MULT': 1.25, 'TP_ATR_MULT': 3.00}),
    ("SL=2.0 TP=4.0", {'GPU_NATIVE_MIN_CONFIDENCE': 0.65, 'SL_ATR_MULT': 2.00, 'TP_ATR_MULT': 4.00}),
    ("SL=2.0 TP=5.0", {'GPU_NATIVE_MIN_CONFIDENCE': 0.65, 'SL_ATR_MULT': 2.00, 'TP_ATR_MULT': 5.00}),
    
    # Risk sizing sweep
    ("risk=0.030", {'GPU_NATIVE_MIN_CONFIDENCE': 0.65, 'RISK_PER_TRADE': 0.030}),
    ("risk=0.040", {'GPU_NATIVE_MIN_CONFIDENCE': 0.65, 'RISK_PER_TRADE': 0.040}),
    ("risk=0.060 (current)", {'GPU_NATIVE_MIN_CONFIDENCE': 0.65, 'RISK_PER_TRADE': 0.060}),
    
    # Combined: higher conf + wider SL = fewer but better trades
    ("conf=0.75 SL=2.0 TP=4.0", {'GPU_NATIVE_MIN_CONFIDENCE': 0.75, 'SL_ATR_MULT': 2.00, 'TP_ATR_MULT': 4.00}),
    ("conf=0.75 SL=2.0 TP=5.0", {'GPU_NATIVE_MIN_CONFIDENCE': 0.75, 'SL_ATR_MULT': 2.00, 'TP_ATR_MULT': 5.00}),
    ("conf=0.80 SL=2.0 TP=5.0", {'GPU_NATIVE_MIN_CONFIDENCE': 0.80, 'SL_ATR_MULT': 2.00, 'TP_ATR_MULT': 5.00}),
    
    # Choppy market: tighter risk + higher conf
    ("choppy: conf=0.80 risk=0.030 SL=1.5 TP=3.0", {
        'GPU_NATIVE_MIN_CONFIDENCE': 0.80, 'RISK_PER_TRADE': 0.030,
        'SL_ATR_MULT': 1.50, 'TP_ATR_MULT': 3.00,
    }),
    ("choppy: conf=0.80 risk=0.025 SL=2.0 TP=4.0", {
        'GPU_NATIVE_MIN_CONFIDENCE': 0.80, 'RISK_PER_TRADE': 0.025,
        'SL_ATR_MULT': 2.00, 'TP_ATR_MULT': 4.00,
    }),
    # Ultra selective
    ("ultra: conf=0.85 risk=0.025", {
        'GPU_NATIVE_MIN_CONFIDENCE': 0.85, 'RISK_PER_TRADE': 0.025,
        'SL_ATR_MULT': 2.00, 'TP_ATR_MULT': 5.00,
    }),
]

results = []
t0 = time.time()

# Save original PAIR_OVERRIDES to restore after each run
original_sol_overrides = dict(PAIR_OVERRIDES.get('SOLUSDT', {}))

for i, (label, overrides) in enumerate(sweep_configs):
    print(f"\n  [{i+1}/{len(sweep_configs)}] {label}...")
    
    # Modify PAIR_OVERRIDES directly (since walk_forward_backtest applies pair overrides
    # AFTER user overrides, overwriting them — we must modify the source dict)
    PAIR_OVERRIDES['SOLUSDT'] = dict(original_sol_overrides)
    PAIR_OVERRIDES['SOLUSDT'].update(overrides)
    
    try:
        r = walk_forward_backtest(
            symbol='SOLUSDT',
            timeframe='4h',
            verbose=False,
        )
        a = r.get('aggregate', {})
        pnl = a.get('net_profit', 0)
        trades = a.get('trades', 0)
        wr = a.get('win_rate', 0)
        sharpe = a.get('sharpe', 0)
        pf = a.get('profit_factor', 0)
        dd = a.get('max_dd_pct', 0)
        
        tag = '✅' if pnl > 0 else '❌'
        print(f"    {tag} PnL=${pnl:+.0f} | Trades={trades} | WR={wr:.0f}% | Sharpe={sharpe:.2f} | PF={pf:.2f} | DD={dd:.1f}%")
        
        results.append({
            'label': label,
            'overrides': overrides,
            'pnl': pnl, 'trades': trades, 'win_rate': wr,
            'sharpe': sharpe, 'profit_factor': pf, 'max_dd_pct': dd,
        })
    except Exception as e:
        print(f"    ❌ ERROR: {e}")
        results.append({'label': label, 'pnl': 0, 'trades': 0, 'error': str(e)})
    finally:
        # Restore original pair overrides
        PAIR_OVERRIDES['SOLUSDT'] = dict(original_sol_overrides)

# Final safety restore
PAIR_OVERRIDES['SOLUSDT'] = dict(original_sol_overrides)

elapsed = time.time() - t0

# ============================================================
# PHASE 3: RESULTS RANKING
# ============================================================
print(f"\n{'='*70}")
print(f"  PHASE 3: RANKING (sorted by PnL)")
print(f"{'='*70}")

ranked = sorted(results, key=lambda x: x.get('pnl', -9999), reverse=True)
print(f"  {'#':>3} {'Label':<45} {'PnL':>8} {'Trades':>7} {'WR%':>5} {'Sharpe':>7} {'PF':>5}")
print(f"  {'─'*3} {'─'*45} {'─'*8} {'─'*7} {'─'*5} {'─'*7} {'─'*5}")
for i, r in enumerate(ranked):
    tag = '→' if i == 0 else ' '
    print(f"  {tag}{i+1:>2} {r['label']:<45} ${r.get('pnl',0):>+7.0f} {r.get('trades',0):>7} {r.get('win_rate',0):>4.0f}% {r.get('sharpe',0):>6.2f} {r.get('profit_factor',0):>4.2f}")

print(f"\n  Elapsed: {elapsed:.0f}s")

# Save
from pathlib import Path
out = Path('results/p232_sol_sweep.json')
out.parent.mkdir(parents=True, exist_ok=True)
with open(out, 'w') as f:
    json.dump({
        'regime_analysis': {'old': old_regime, 'new': new_regime},
        'sweep_results': results,
        'ranked': [r['label'] for r in ranked[:5]],
        'elapsed_sec': elapsed,
    }, f, indent=2, default=str)
print(f"  Saved: {out}")
