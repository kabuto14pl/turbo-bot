"""
P#239 v3: Deep optimization around conf=0.50 sweet spot.
V2 best: conf=0.50, SL=1.75, TP=6.0, trail=0.6, risk=0.18, $10k → $1,098.75
Gap to $1,500: $401. Focus on SL/trail/risk tuning at conf=0.45-0.52.
"""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backtest_pipeline.sol_tuner import run_sol_backtest, extract_metrics

CAPITAL = 10_000
TARGET = 1500

# Best known base from V2
BASE = {
    'SL_ATR_MULT': 1.75,
    'TP_ATR_MULT': 6.0,
    'RISK_PER_TRADE': 0.18,
    'TRAILING_DISTANCE_ATR': 0.6,
    'GPU_NATIVE_MIN_CONFIDENCE': 0.50,
}

best_pnl = -1e9
best_config = dict(BASE)


def run_and_log(overrides, tag):
    global best_pnl, best_config
    t0 = time.time()
    try:
        res = run_sol_backtest(overrides, capital=CAPITAL)
        m = extract_metrics(res)
    except Exception as e:
        print(f"  ❌ {tag} → ERROR: {e}")
        return None
    dt = time.time() - t0
    
    emoji = '✅' if m['pnl'] > 0 else '❌'
    star = ''
    if m['pnl'] > best_pnl:
        best_pnl = m['pnl']
        best_config = dict(overrides)
        star = ' ⭐ NEW BEST'
    
    print(f"  {emoji} {tag} | PnL=${m['pnl']:>+9.2f} | "
          f"T={m['trades']:>3} WR={m['win_rate']:>5.1f}% PF={m['profit_factor']:.3f} "
          f"Sh={m['sharpe']:>+6.2f} DD={m['max_drawdown']:>5.1f}% | "
          f"fund=${m['funding_pnl']:>+.2f} trade=${m['net_profit']:>+.2f} ({dt:.0f}s){star}")
    return m


print("=" * 100)
print(f"P#239 v3: Deep optimization around conf=0.50 (target ${TARGET})")
print("=" * 100)

# ── PHASE 1: Fine-grained confidence sweep ─────────────────────────────
print("\n" + "=" * 100)
print("PHASE 1: Fine-grained confidence [0.42 → 0.52]")
print("=" * 100)

for conf in [0.42, 0.44, 0.46, 0.48, 0.50, 0.52]:
    ov = {**BASE, 'GPU_NATIVE_MIN_CONFIDENCE': conf}
    run_and_log(ov, f"conf={conf:.2f}")

print(f"\n  → Phase 1 best: ${best_pnl:+.2f} | conf={best_config.get('GPU_NATIVE_MIN_CONFIDENCE', '?')}")

# ── PHASE 2: SL sweep at best conf ─────────────────────────────────────
print("\n" + "=" * 100)
print(f"PHASE 2: SL sweep at conf={best_config['GPU_NATIVE_MIN_CONFIDENCE']:.2f}")
print("=" * 100)

phase1_best = dict(best_config)
for sl in [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5]:
    ov = {**phase1_best, 'SL_ATR_MULT': sl}
    run_and_log(ov, f"SL={sl:.2f}")

print(f"\n  → Phase 2 best: ${best_pnl:+.2f} | SL={best_config.get('SL_ATR_MULT', '?')}")

# ── PHASE 3: Trailing stop sweep ───────────────────────────────────────
print("\n" + "=" * 100)
print(f"PHASE 3: Trail sweep at conf={best_config['GPU_NATIVE_MIN_CONFIDENCE']:.2f}, SL={best_config['SL_ATR_MULT']}")
print("=" * 100)

phase2_best = dict(best_config)
for trail in [0.2, 0.3, 0.4, 0.5, 0.8, 1.0, 1.5, 2.0, 3.0]:
    ov = {**phase2_best, 'TRAILING_DISTANCE_ATR': trail}
    run_and_log(ov, f"trail={trail:.1f}")

print(f"\n  → Phase 3 best: ${best_pnl:+.2f} | trail={best_config.get('TRAILING_DISTANCE_ATR', '?')}")

# ── PHASE 4: Risk per trade sweep ──────────────────────────────────────
print("\n" + "=" * 100)
print(f"PHASE 4: Risk sweep at best config so far")
print("=" * 100)

phase3_best = dict(best_config)
for risk in [0.08, 0.12, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50]:
    ov = {**phase3_best, 'RISK_PER_TRADE': risk}
    run_and_log(ov, f"risk={risk:.2f}")

print(f"\n  → Phase 4 best: ${best_pnl:+.2f} | risk={best_config.get('RISK_PER_TRADE', '?')}")

# ── PHASE 5: Cross-product of best 2 conf × best 2 SL × best 2 trail ──
# Only if still below target
if best_pnl < TARGET:
    print("\n" + "=" * 100)
    print("PHASE 5: Micro-grid around best config")
    print("=" * 100)
    
    bc = dict(best_config)
    # Try ±1 step around best values
    conf_base = bc['GPU_NATIVE_MIN_CONFIDENCE']
    sl_base = bc['SL_ATR_MULT']
    trail_base = bc['TRAILING_DISTANCE_ATR']
    risk_base = bc['RISK_PER_TRADE']
    
    conf_vals = [max(0.40, conf_base - 0.02), conf_base, min(0.55, conf_base + 0.02)]
    sl_vals = [max(0.5, sl_base - 0.25), sl_base, sl_base + 0.25]
    trail_vals = [max(0.1, trail_base - 0.1), trail_base, trail_base + 0.1]
    
    # Remove duplicates
    conf_vals = sorted(set(conf_vals))
    sl_vals = sorted(set(sl_vals))
    trail_vals = sorted(set(trail_vals))
    
    n = len(conf_vals) * len(sl_vals) * len(trail_vals)
    i = 0
    for c in conf_vals:
        for s in sl_vals:
            for t in trail_vals:
                i += 1
                ov = {**bc, 'GPU_NATIVE_MIN_CONFIDENCE': c, 'SL_ATR_MULT': s, 'TRAILING_DISTANCE_ATR': t}
                run_and_log(ov, f"[{i}/{n}] c={c:.2f} SL={s:.2f} t={t:.1f}")

# ── FINAL SUMMARY ──────────────────────────────────────────────────────
print("\n" + "=" * 100)
hit = '✅ HIT' if best_pnl >= TARGET else '❌ NOT HIT'
print(f"FINAL: ${best_pnl:+.2f} (target ${TARGET}) → {hit}")
print(f"CONFIG: {best_config}")
print("=" * 100)
