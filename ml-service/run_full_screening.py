"""
P#229 Full Crypto Screening — Test each pair individually on 15m/1h/4h.
Temporarily sets each pair to 100% allocation, runs WF backtest, collects results.

Usage:
    cd ml-service
    python run_full_screening.py                  # all pairs, all TFs
    python run_full_screening.py --pairs BTC ETH  # specific pairs
    python run_full_screening.py --tf 4h          # specific timeframe
"""
import argparse
import json
import time
import sys
from pathlib import Path

RESULTS_DIR = Path('results/p229_screening')
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

ALL_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']
ALL_TFS = ['15m', '1h', '4h']

# Short aliases for CLI
PAIR_ALIASES = {
    'BTC': 'BTCUSDT', 'ETH': 'ETHUSDT', 'SOL': 'SOLUSDT',
    'BNB': 'BNBUSDT', 'XRP': 'XRPUSDT',
}


def run_single_pair_wf(pair: str, tf: str, capital: float = 10000) -> dict:
    """Run walk-forward for a single pair at 100% allocation."""
    from backtest_pipeline import pair_config
    from backtest_pipeline.walk_forward import walk_forward_multi_pair
    
    # Save original allocations
    original_alloc = dict(pair_config.PAIR_CAPITAL_ALLOCATION)
    
    # Set this pair to 100%, others to 0%
    for p in pair_config.PAIR_CAPITAL_ALLOCATION:
        pair_config.PAIR_CAPITAL_ALLOCATION[p] = 1.0 if p == pair else 0.0
    
    # Override portfolio capital
    original_capital = pair_config.PORTFOLIO_CAPITAL
    pair_config.PORTFOLIO_CAPITAL = capital
    
    try:
        result = walk_forward_multi_pair(timeframe=tf, pairs=[pair], verbose=True)
    except Exception as e:
        print(f"  ❌ ERROR: {e}")
        result = {'error': str(e)}
    finally:
        # Restore original allocations
        pair_config.PAIR_CAPITAL_ALLOCATION = original_alloc
        pair_config.PORTFOLIO_CAPITAL = original_capital
    
    return result


def extract_summary(result: dict, pair: str) -> dict:
    """Extract key metrics from WF result."""
    if 'error' in result:
        return {'net': 0, 'trades': 0, 'wr': 0, 'pf': 0, 'sharpe': 0, 'dd': 0, 'fees': 0, 'error': result['error']}
    
    # Look in pair_results first
    pair_data = result.get('pair_results', {}).get(pair, {})
    if pair_data:
        return {
            'net': pair_data.get('net_profit', 0),
            'trades': pair_data.get('trades', 0),
            'wr': pair_data.get('win_rate', 0),
            'pf': pair_data.get('profit_factor', 0),
            'sharpe': pair_data.get('sharpe', 0),
            'dd': pair_data.get('max_drawdown', 0),
            'fees': pair_data.get('total_fees', 0),
        }
    
    # Fallback to aggregate
    agg = result.get('aggregate', {})
    return {
        'net': agg.get('net_profit', 0),
        'trades': agg.get('trades', 0),
        'wr': agg.get('win_rate', 0),
        'pf': agg.get('profit_factor', 0),
        'sharpe': agg.get('sharpe', 0),
        'dd': agg.get('max_drawdown', 0),
        'fees': agg.get('total_fees', 0),
    }


def main():
    parser = argparse.ArgumentParser(description='P#229 Full Crypto Screening')
    parser.add_argument('--pairs', nargs='+', default=None, help='Pairs to test (e.g. BTC ETH SOL)')
    parser.add_argument('--tf', nargs='+', default=None, help='Timeframes (e.g. 15m 1h 4h)')
    parser.add_argument('--capital', type=float, default=10000, help='Capital per pair (default: 10000)')
    args = parser.parse_args()
    
    pairs = ALL_PAIRS
    if args.pairs:
        pairs = [PAIR_ALIASES.get(p.upper(), p.upper()) for p in args.pairs]
        # Validate
        for p in pairs:
            if p not in ALL_PAIRS:
                print(f"❌ Unknown pair: {p}. Valid: {ALL_PAIRS}")
                sys.exit(1)
    
    timeframes = args.tf or ALL_TFS
    
    print("=" * 80)
    print(f"  P#229 FULL CRYPTO SCREENING")
    print(f"  Pairs: {', '.join(pairs)}")
    print(f"  Timeframes: {', '.join(timeframes)}")
    print(f"  Capital: ${args.capital:,.0f} per pair")
    print(f"  GPU-Native MLP with BAG_COUNT=5")
    print("=" * 80)
    
    all_results = {}
    t0 = time.time()
    
    for pair in pairs:
        all_results[pair] = {}
        for tf in timeframes:
            short = pair.replace('USDT', '')
            print(f"\n{'='*80}")
            print(f"  🔬 {short} @ {tf} — Walk-Forward Screening")
            print(f"{'='*80}")
            
            t1 = time.time()
            result = run_single_pair_wf(pair, tf, args.capital)
            elapsed = time.time() - t1
            
            summary = extract_summary(result, pair)
            all_results[pair][tf] = summary
            
            status = "✅" if summary['net'] > 0 else "❌"
            print(f"\n  {status} {short} @ {tf}: ${summary['net']:+,.2f} | "
                  f"{summary['trades']} trades | WR {summary['wr']:.1f}% | "
                  f"PF {summary['pf']:.2f} | Sharpe {summary['sharpe']:.2f} | "
                  f"DD ${summary['dd']:,.0f} | Fees ${summary['fees']:,.0f} | "
                  f"{elapsed:.0f}s")
    
    # Save raw results
    out_file = RESULTS_DIR / f'screening_{int(time.time())}.json'
    with open(out_file, 'w') as f:
        json.dump(all_results, f, indent=2, default=str)
    
    # Print summary table
    total_time = time.time() - t0
    print(f"\n\n{'='*80}")
    print(f"  📊 SCREENING SUMMARY TABLE — {total_time/60:.1f} min total")
    print(f"{'='*80}")
    
    header = f"  {'Pair':<10}"
    for tf in timeframes:
        header += f" | {'Net P&L':>10} {'Trd':>4} {'WR%':>5} {'PF':>5} {'Sharpe':>7}"
    header += f" |"
    print(header)
    print(f"  {'─'*10}" + (f" | {'─'*10} {'─'*4} {'─'*5} {'─'*5} {'─'*7}" * len(timeframes)) + " |")
    
    for pair in pairs:
        short = pair.replace('USDT', '')
        row = f"  {short:<10}"
        for tf in timeframes:
            s = all_results.get(pair, {}).get(tf, {})
            if s:
                status = "✅" if s['net'] > 0 else "❌"
                row += f" | {status}${s['net']:>+8,.0f} {s['trades']:>4} {s['wr']:>4.1f}% {s['pf']:>5.2f} {s['sharpe']:>7.2f}"
            else:
                row += f" |     N/A     N/A   N/A   N/A     N/A"
        row += " |"
        print(row)
    
    # Best per pair
    print(f"\n  🏆 BEST TIMEFRAME PER PAIR:")
    for pair in pairs:
        short = pair.replace('USDT', '')
        best_tf = None
        best_net = float('-inf')
        for tf in timeframes:
            s = all_results.get(pair, {}).get(tf, {})
            if s and s.get('net', 0) > best_net:
                best_net = s['net']
                best_tf = tf
        if best_tf:
            s = all_results[pair][best_tf]
            status = "✅" if best_net > 0 else "❌"
            print(f"    {status} {short}: {best_tf} → ${best_net:+,.2f} (PF {s['pf']:.2f}, Sharpe {s['sharpe']:.2f})")
    
    # Portfolio suggestion
    print(f"\n  💰 OPTIMAL PORTFOLIO SUGGESTION (pairs with PF > 1.10):")
    profitable = []
    for pair in pairs:
        for tf in timeframes:
            s = all_results.get(pair, {}).get(tf, {})
            if s and s.get('pf', 0) > 1.10 and s.get('net', 0) > 0:
                profitable.append((pair, tf, s))
    
    if profitable:
        profitable.sort(key=lambda x: x[2]['net'], reverse=True)
        total_net = sum(x[2]['net'] for x in profitable[:5])  # Top 5
        for pair, tf, s in profitable[:5]:
            short = pair.replace('USDT', '')
            print(f"    ✅ {short} @ {tf}: ${s['net']:+,.2f} (PF {s['pf']:.2f})")
        print(f"    ═══════════════════════════════")
        print(f"    Combined (if independent): ${total_net:+,.2f}")
    else:
        print(f"    ❌ No pairs with PF > 1.10 found")
    
    print(f"\n📁 Results saved: {out_file}")


if __name__ == '__main__':
    main()
