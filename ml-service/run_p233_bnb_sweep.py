"""
P#233: BNB Parity Fix — Full Parameter Sweep
PROBLEM: Python backtest uses SL=1.25/TP=2.75 (base config), Node.js had hardcoded SL=1.5/TP=4.0
Need to find actual optimal BNB params on current data and align both systems.
"""
import sys, json, time
import numpy as np
import pandas as pd
sys.path.insert(0, '.')

from backtest_pipeline.walk_forward import walk_forward_backtest
from backtest_pipeline.pair_config import PAIR_OVERRIDES
from backtest_pipeline import config

# ============================================================
# PHASE 1: BNB REGIME ANALYSIS
# ============================================================
print("=" * 70)
print("  PHASE 1: BNB REGIME ANALYSIS")
print("=" * 70)

df = pd.read_csv('data/bnbusdt_4h.csv', index_col='datetime', parse_dates=True)

split_date = '2026-03-19'
df_old = df[df.index <= split_date]
df_new = df[df.index > split_date]

def analyze_regime(df_chunk, label):
    close = df_chunk['close']
    returns = close.pct_change().dropna()
    vol = returns.std() * np.sqrt(6 * 365)
    adx_mean = df_chunk['adx'].mean() if 'adx' in df_chunk.columns else 0
    total_move = close.iloc[-1] - close.iloc[0]
    total_distance = close.diff().abs().sum()
    trend_efficiency = abs(total_move) / total_distance if total_distance > 0 else 0
    atr_pct = (df_chunk['atr'] / close).mean() * 100 if 'atr' in df_chunk.columns else 0
    rsi_mean = df_chunk['rsi_14'].mean() if 'rsi_14' in df_chunk.columns else 50
    rsi_std = df_chunk['rsi_14'].std() if 'rsi_14' in df_chunk.columns else 0
    price_range_pct = (close.max() - close.min()) / close.mean() * 100
    direction = np.sign(returns)
    direction_changes = (direction.diff().abs() > 0).sum()
    choppiness = direction_changes / len(returns) * 100

    print(f"\n  [{label}] ({len(df_chunk)} candles, {df_chunk.index[0].date()} -> {df_chunk.index[-1].date()})")
    print(f"  Price:      ${close.iloc[0]:.2f} -> ${close.iloc[-1]:.2f} ({total_move/close.iloc[0]*100:+.1f}%)")
    print(f"  Volatility: {vol:.1f}% (annualized)")
    print(f"  ADX mean:   {adx_mean:.1f} ({'TRENDING' if adx_mean > 25 else 'RANGING/CHOPPY'})")
    print(f"  Trend eff:  {trend_efficiency:.3f}")
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
print(f"  ADX:        {old_regime['adx']:.1f} -> {new_regime['adx']:.1f}")
print(f"  Trend Eff:  {old_regime['trend_eff']:.3f} -> {new_regime['trend_eff']:.3f}")
print(f"  Volatility: {old_regime['volatility']:.1f}% -> {new_regime['volatility']:.1f}%")
print(f"  Choppiness: {old_regime['choppiness']:.1f}% -> {new_regime['choppiness']:.1f}%")

# ============================================================
# PHASE 2: BNB PARAMETER SWEEP
# ============================================================
print(f"\n{'='*70}")
print("  PHASE 2: BNB PARAMETER SWEEP (SL/TP parity focus)")
print(f"{'='*70}")
print("  Current Python base: SL=1.25 TP=2.75, BNB has no SL/TP override")
print("  Old Node.js hardcode: SL=1.50 TP=4.00 (P#232 set per-pair env)")
print("  BNB conf=0.75 (P#229)")

sweep_configs = [
    # A) Confidence sweep (BNB already at 0.75 from P#229)
    ("conf=0.60", {'GPU_NATIVE_MIN_CONFIDENCE': 0.60}),
    ("conf=0.65", {'GPU_NATIVE_MIN_CONFIDENCE': 0.65}),
    ("conf=0.70", {'GPU_NATIVE_MIN_CONFIDENCE': 0.70}),
    ("conf=0.75 (current)", {'GPU_NATIVE_MIN_CONFIDENCE': 0.75}),
    ("conf=0.80", {'GPU_NATIVE_MIN_CONFIDENCE': 0.80}),
    
    # B) SL/TP sweep at conf=0.75 — finding parity sweet spot
    # Python base: SL=1.25/TP=2.75
    ("SL=1.25 TP=2.75 (python base)", {'GPU_NATIVE_MIN_CONFIDENCE': 0.75, 'SL_ATR_MULT': 1.25, 'TP_ATR_MULT': 2.75}),
    ("SL=1.25 TP=3.50", {'GPU_NATIVE_MIN_CONFIDENCE': 0.75, 'SL_ATR_MULT': 1.25, 'TP_ATR_MULT': 3.50}),
    ("SL=1.50 TP=3.00", {'GPU_NATIVE_MIN_CONFIDENCE': 0.75, 'SL_ATR_MULT': 1.50, 'TP_ATR_MULT': 3.00}),
    ("SL=1.50 TP=4.00 (old hardcode)", {'GPU_NATIVE_MIN_CONFIDENCE': 0.75, 'SL_ATR_MULT': 1.50, 'TP_ATR_MULT': 4.00}),
    ("SL=1.75 TP=3.50", {'GPU_NATIVE_MIN_CONFIDENCE': 0.75, 'SL_ATR_MULT': 1.75, 'TP_ATR_MULT': 3.50}),
    ("SL=2.00 TP=4.00", {'GPU_NATIVE_MIN_CONFIDENCE': 0.75, 'SL_ATR_MULT': 2.00, 'TP_ATR_MULT': 4.00}),
    ("SL=1.00 TP=2.50", {'GPU_NATIVE_MIN_CONFIDENCE': 0.75, 'SL_ATR_MULT': 1.00, 'TP_ATR_MULT': 2.50}),
    ("SL=1.60 TP=3.00 (old pair_config comment)", {'GPU_NATIVE_MIN_CONFIDENCE': 0.75, 'SL_ATR_MULT': 1.60, 'TP_ATR_MULT': 3.00}),
    
    # C) Combined optimization
    ("conf=0.70 SL=1.50 TP=3.50", {'GPU_NATIVE_MIN_CONFIDENCE': 0.70, 'SL_ATR_MULT': 1.50, 'TP_ATR_MULT': 3.50}),
    ("conf=0.80 SL=1.25 TP=2.75", {'GPU_NATIVE_MIN_CONFIDENCE': 0.80, 'SL_ATR_MULT': 1.25, 'TP_ATR_MULT': 2.75}),
    ("conf=0.80 SL=1.50 TP=3.50", {'GPU_NATIVE_MIN_CONFIDENCE': 0.80, 'SL_ATR_MULT': 1.50, 'TP_ATR_MULT': 3.50}),
    
    # D) Risk sizing at best SL/TP (once we know it)
    ("risk=0.010 SL=1.50 TP=4.00", {'GPU_NATIVE_MIN_CONFIDENCE': 0.75, 'RISK_PER_TRADE': 0.010, 'SL_ATR_MULT': 1.50, 'TP_ATR_MULT': 4.00}),
    ("risk=0.020 SL=1.50 TP=4.00", {'GPU_NATIVE_MIN_CONFIDENCE': 0.75, 'RISK_PER_TRADE': 0.020, 'SL_ATR_MULT': 1.50, 'TP_ATR_MULT': 4.00}),
    ("risk=0.014 (current)", {'GPU_NATIVE_MIN_CONFIDENCE': 0.75}),
]

results = []
t0 = time.time()
original_bnb_overrides = dict(PAIR_OVERRIDES.get('BNBUSDT', {}))

for i, (label, overrides) in enumerate(sweep_configs):
    print(f"\n  [{i+1}/{len(sweep_configs)}] {label}...")
    PAIR_OVERRIDES['BNBUSDT'] = dict(original_bnb_overrides)
    PAIR_OVERRIDES['BNBUSDT'].update(overrides)
    
    try:
        r = walk_forward_backtest(symbol='BNBUSDT', timeframe='4h', verbose=False)
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
            'label': label, 'overrides': overrides,
            'pnl': pnl, 'trades': trades, 'win_rate': wr,
            'sharpe': sharpe, 'profit_factor': pf, 'max_dd_pct': dd,
        })
    except Exception as e:
        print(f"    ❌ ERROR: {e}")
        results.append({'label': label, 'pnl': 0, 'trades': 0, 'error': str(e)})
    finally:
        PAIR_OVERRIDES['BNBUSDT'] = dict(original_bnb_overrides)

PAIR_OVERRIDES['BNBUSDT'] = dict(original_bnb_overrides)
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
out = Path('results/p233_bnb_sweep.json')
out.parent.mkdir(parents=True, exist_ok=True)
with open(out, 'w') as f:
    json.dump({
        'regime_analysis': {'old': old_regime, 'new': new_regime},
        'sweep_results': results,
        'ranked': [r['label'] for r in ranked[:5]],
        'elapsed_sec': elapsed,
    }, f, indent=2, default=str)
print(f"  Saved: {out}")
