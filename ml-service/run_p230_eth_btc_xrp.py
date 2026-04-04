"""
P#230 — ETH/BTC/XRP Optimization Campaign
Target: $3,000 combined from these 3 pairs on $10k capital
Approach: screen 3 pairs × 3 TFs → confidence sweep → risk scaling → portfolio combine

Usage:
    cd ml-service
    python run_p230_eth_btc_xrp.py --phase 1           # baseline screening (9 combos)
    python run_p230_eth_btc_xrp.py --phase 2           # confidence sweep on best TFs
    python run_p230_eth_btc_xrp.py --phase 3           # risk scaling + portfolio
"""
import argparse
import json
import time
import sys
from pathlib import Path

RESULTS_DIR = Path('results/p230_eth_btc_xrp')
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

PAIRS = ['BTCUSDT', 'ETHUSDT', 'XRPUSDT']
TFS = ['15m', '1h', '4h']


def run_wf(pair, tf, gpu_conf=None, risk=None, cap=None, capital=10000):
    """Run walk-forward for a single pair at 100% allocation with optional overrides."""
    from backtest_pipeline import pair_config, config
    from backtest_pipeline.walk_forward import walk_forward_multi_pair

    orig_alloc = dict(pair_config.PAIR_CAPITAL_ALLOCATION)
    orig_capital = pair_config.PORTFOLIO_CAPITAL
    # Deep copy of PAIR_OVERRIDES for this pair
    orig_overrides = dict(pair_config.PAIR_OVERRIDES.get(pair, {})) if pair in pair_config.PAIR_OVERRIDES else None

    # 100% this pair
    for p in pair_config.PAIR_CAPITAL_ALLOCATION:
        pair_config.PAIR_CAPITAL_ALLOCATION[p] = 1.0 if p == pair else 0.0
    pair_config.PORTFOLIO_CAPITAL = capital

    # Apply overrides via PAIR_OVERRIDES (this is what walk_forward respects)
    if pair not in pair_config.PAIR_OVERRIDES:
        pair_config.PAIR_OVERRIDES[pair] = {}
    if gpu_conf is not None:
        pair_config.PAIR_OVERRIDES[pair]['GPU_NATIVE_MIN_CONFIDENCE'] = gpu_conf
    if risk is not None:
        pair_config.PAIR_OVERRIDES[pair]['RISK_PER_TRADE'] = risk
    if cap is not None:
        pair_config.PAIR_OVERRIDES[pair]['MAX_POSITION_VALUE_PCT'] = cap

    try:
        result = walk_forward_multi_pair(timeframe=tf, pairs=[pair], verbose=True)
    except Exception as e:
        print(f"  ERROR: {e}")
        import traceback; traceback.print_exc()
        result = {'error': str(e)}
    finally:
        # Restore
        pair_config.PAIR_CAPITAL_ALLOCATION = orig_alloc
        pair_config.PORTFOLIO_CAPITAL = orig_capital
        if orig_overrides is not None:
            pair_config.PAIR_OVERRIDES[pair] = orig_overrides
        elif pair in pair_config.PAIR_OVERRIDES:
            del pair_config.PAIR_OVERRIDES[pair]

    pair_data = result.get('pair_results', {}).get(pair, {})
    agg = result.get('aggregate', {})
    src = pair_data or agg
    return {
        'net': src.get('net_profit', 0),
        'trades': src.get('trades', 0),
        'wr': src.get('win_rate', 0),
        'pf': src.get('profit_factor', 0),
        'sharpe': src.get('sharpe', 0),
        'dd': src.get('max_drawdown', 0),
        'fees': src.get('total_fees', 0),
    }


def fmt(r, elapsed=None):
    s = "✅" if r['net'] > 0 else "❌"
    t = f" | {elapsed:.0f}s" if elapsed else ""
    return (f"  {s} ${r['net']:+9,.0f} | {r['trades']:>4} trd | WR {r['wr']:5.1f}% | "
            f"PF {r['pf']:5.2f} | Sharpe {r['sharpe']:6.2f} | DD ${r['dd']:,.0f} | Fees ${r['fees']:,.0f}{t}")


def phase1_baseline():
    """Screen all 3 pairs on all 3 TFs at baseline conf=0.60."""
    print("=" * 90)
    print("  P#230 — PHASE 1: Baseline Screening (ETH/BTC/XRP × 15m/1h/4h)")
    print("=" * 90)

    results = {}
    for pair in PAIRS:
        for tf in TFS:
            key = f"{pair}_{tf}"
            print(f"\n{'─'*70}")
            print(f"  {pair} @ {tf}")
            print(f"{'─'*70}")
            t0 = time.time()
            r = run_wf(pair, tf)
            elapsed = time.time() - t0
            results[key] = r
            print(fmt(r, elapsed))

    # Summary table
    print("\n\n" + "=" * 90)
    print("  PHASE 1 — BASELINE SCREENING MATRIX")
    print("=" * 90)
    print(f"  {'Pair':>10s} {'15m':>12s} {'1h':>12s} {'4h':>12s}")
    print(f"  {'─'*10} {'─'*12} {'─'*12} {'─'*12}")
    for pair in PAIRS:
        vals = []
        for tf in TFS:
            r = results.get(f"{pair}_{tf}", {})
            n = r.get('net', 0)
            vals.append(f"${n:+9,.0f}")
        short = pair.replace('USDT', '')
        print(f"  {short:>10s} {vals[0]:>12s} {vals[1]:>12s} {vals[2]:>12s}")

    # Best per pair
    print(f"\n  BEST PER PAIR:")
    for pair in PAIRS:
        best_tf = max(TFS, key=lambda tf: results.get(f"{pair}_{tf}", {}).get('net', -99999))
        r = results[f"{pair}_{best_tf}"]
        short = pair.replace('USDT', '')
        s = "✅" if r['net'] > 0 else "❌"
        print(f"  {s} {short:>5s} @ {best_tf}: ${r['net']:+,.0f} ({r['trades']} trades, WR {r['wr']:.1f}%, Sharpe {r['sharpe']:.2f})")

    out = RESULTS_DIR / f'phase1_baseline_{int(time.time())}.json'
    with open(out, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\nSaved: {out}")
    return results


def phase2_confidence_sweep(phase1_results=None):
    """Sweep GPU_NATIVE_MIN_CONFIDENCE on best TFs from Phase 1."""
    print("=" * 90)
    print("  P#230 — PHASE 2: Confidence Sweep (per pair × best TFs)")
    print("=" * 90)

    # Define sweep: only Phase 1 winners + confidence spectrum
    # Phase 1 results: ETH@1h +$83, XRP@4h +$248, all others negative
    confs = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80]
    
    # Only sweep combos that showed positive edge in Phase 1
    sweep_combos = [
        ('ETHUSDT', '1h'),
        ('XRPUSDT', '4h'),
    ]

    results = {}
    for pair, tf in sweep_combos:
        key = f"{pair}_{tf}"
        results[key] = {}
        print(f"\n{'═'*70}")
        print(f"  {pair} @ {tf} — Confidence sweep: {confs}")
        print(f"{'═'*70}")

        for conf in confs:
            label = f"conf_{conf:.2f}"
            print(f"\n  --- [{label}] ---")
            t0 = time.time()
            r = run_wf(pair, tf, gpu_conf=conf)
            elapsed = time.time() - t0
            results[key][label] = r
            print(fmt(r, elapsed))

        # Best for this pair/tf
        best_label = max(results[key], key=lambda k: results[key][k]['net'])
        best = results[key][best_label]
        short = pair.replace('USDT', '')
        s = "✅" if best['net'] > 0 else "❌"
        print(f"\n  BEST {short}@{tf}: {best_label} → ${best['net']:+,.0f} | {best['trades']} trd | Sharpe {best['sharpe']:.2f}")

    # Summary
    print("\n\n" + "=" * 90)
    print("  PHASE 2 — CONFIDENCE SWEEP SUMMARY")
    print("=" * 90)
    for key, configs in results.items():
        best_label = max(configs, key=lambda k: configs[k]['net'])
        best = configs[best_label]
        s = "✅" if best['net'] > 0 else "❌"
        print(f"  {s} {key:18s} best={best_label:12s}: ${best['net']:+9,.0f} | {best['trades']:>4} trd | Sharpe {best['sharpe']:6.2f}")

    out = RESULTS_DIR / f'phase2_conf_sweep_{int(time.time())}.json'
    with open(out, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\nSaved: {out}")
    return results


def phase3_risk_portfolio(best_configs: dict = None):
    """Test risk scaling and combine winners into portfolio.
    
    best_configs: dict like {'BTCUSDT': {'tf': '4h', 'conf': 0.70}, ...}
    """
    if best_configs is None:
        # Phase 2 verified winners — BTC eliminated (no edge anywhere)
        best_configs = {
            'ETHUSDT': {'tf': '1h', 'conf': 0.60},
            'XRPUSDT': {'tf': '4h', 'conf': 0.65},
        }

    print("=" * 90)
    print("  P#230 — PHASE 3: Risk Scaling + Portfolio Combination")
    print("=" * 90)

    results = {}

    # A) Risk scaling per pair
    risk_levels = [
        {'risk': 0.020, 'cap': 0.40, 'label': 'min'},
        {'risk': 0.030, 'cap': 0.50, 'label': 'conservative'},
        {'risk': 0.040, 'cap': 0.60, 'label': 'moderate'},
        {'risk': 0.060, 'cap': 0.80, 'label': 'aggressive'},
        {'risk': 0.080, 'cap': 1.00, 'label': 'max'},
        {'risk': 0.100, 'cap': 1.00, 'label': 'ultra'},
    ]

    for pair, cfg in best_configs.items():
        key = pair.replace('USDT', '')
        results[key] = {}
        print(f"\n{'═'*70}")
        print(f"  {pair} @ {cfg['tf']} conf={cfg['conf']} — Risk scaling")
        print(f"{'═'*70}")

        for rl in risk_levels:
            label = rl['label']
            print(f"\n  --- [{label}] risk={rl['risk']}, cap={rl['cap']} ---")
            t0 = time.time()
            r = run_wf(pair, cfg['tf'], gpu_conf=cfg['conf'], risk=rl['risk'], cap=rl['cap'])
            elapsed = time.time() - t0
            results[key][label] = r
            print(fmt(r, elapsed))

    # B) Portfolio combining — test different allocation splits
    print(f"\n\n{'═'*70}")
    print(f"  PORTFOLIO COMBINATIONS (coming after individual analysis)")
    print(f"{'═'*70}")

    # Summary
    print("\n\n" + "=" * 90)
    print("  PHASE 3 — RISK SCALING SUMMARY")
    print("=" * 90)
    for key, configs in results.items():
        best_label = max(configs, key=lambda k: configs[k]['net'])
        best = configs[best_label]
        s = "✅" if best['net'] > 0 else "❌"
        print(f"  {s} {key:5s} best={best_label:15s}: ${best['net']:+9,.0f} | {best['trades']:>4} trd | Sharpe {best['sharpe']:6.2f}")

    out = RESULTS_DIR / f'phase3_risk_{int(time.time())}.json'
    with open(out, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\nSaved: {out}")
    return results


def main():
    parser = argparse.ArgumentParser(description='P#230 ETH/BTC/XRP Optimization')
    parser.add_argument('--phase', type=int, default=1, choices=[1, 2, 3],
                        help='Phase to run: 1=baseline, 2=conf sweep, 3=risk+portfolio')
    args = parser.parse_args()

    print(f"\n{'█'*90}")
    print(f"  P#230 — ETH/BTC/XRP OPTIMIZATION — Target: $3,000")
    print(f"  Phase {args.phase}")
    print(f"{'█'*90}\n")

    t0 = time.time()

    if args.phase == 1:
        phase1_baseline()
    elif args.phase == 2:
        phase2_confidence_sweep()
    elif args.phase == 3:
        phase3_risk_portfolio()

    total = time.time() - t0
    print(f"\n⏱️ Total elapsed: {total/60:.1f} min")


if __name__ == '__main__':
    main()
