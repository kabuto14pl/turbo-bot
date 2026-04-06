"""
P#239 v2: Re-sweep confidence with optimized SL/TP at $10,000 capital.
The v1 tuner tested confidence with default SL/TP=2.0/4.0.
Now we test with the optimized SL=1.75/TP=6.0/trail=0.6 + full capital.
"""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backtest_pipeline.sol_tuner import run_sol_backtest, extract_metrics

BASE = {
    'SL_ATR_MULT': 1.75,
    'TP_ATR_MULT': 6.0,
    'RISK_PER_TRADE': 0.18,
    'TRAILING_DISTANCE_ATR': 0.6,
}
CAPITAL = 10_000

print("=" * 100)
print("P#239 v2: Confidence re-sweep with optimized SL/TP at $10,000")
print("=" * 100)

best_pnl = -1e9
best_conf = 0.80

for conf in [0.45, 0.50, 0.55, 0.60, 0.65, 0.68, 0.70, 0.72, 0.75, 0.78, 0.80]:
    ov = {**BASE, 'GPU_NATIVE_MIN_CONFIDENCE': conf}
    t0 = time.time()
    res = run_sol_backtest(ov, capital=CAPITAL)
    m = extract_metrics(res)
    dt = time.time() - t0
    
    emoji = '✅' if m['pnl'] > 0 else '❌'
    star = ' ⭐ BEST' if m['pnl'] > best_pnl else ''
    fund = m['funding_pnl']
    trade_pnl = m['net_profit']
    
    print(f"  {emoji} conf={conf:.2f} | PnL=${m['pnl']:>+9.2f} | "
          f"T={m['trades']:>3} WR={m['win_rate']:>5.1f}% PF={m['profit_factor']:.3f} "
          f"Sh={m['sharpe']:>+6.2f} DD={m['max_drawdown']:>5.1f}% | "
          f"fund=${fund:>+.2f} trade=${trade_pnl:>+.2f} ({dt:.0f}s){star}")
    
    if m['pnl'] > best_pnl:
        best_pnl = m['pnl']
        best_conf = conf

print(f"\n  → WINNER: conf={best_conf:.2f} → PnL=${best_pnl:+.2f}")
print(f"  → Target $1,500: {'✅ HIT' if best_pnl >= 1500 else '❌ NOT HIT'}")

# If the best is still below target, try with lower confidence + cooldown=1
if best_pnl < 1500:
    print("\n" + "=" * 100)
    print("PHASE 2: Testing cooldown=1 (more trades) with best configs")
    print("=" * 100)
    
    for conf in [0.50, 0.55, 0.60, 0.65, 0.70]:
        ov = {**BASE, 'GPU_NATIVE_MIN_CONFIDENCE': conf, 'COOLDOWN_CANDLES': 1}
        t0 = time.time()
        res = run_sol_backtest(ov, capital=CAPITAL)
        m = extract_metrics(res)
        dt = time.time() - t0
        
        emoji = '✅' if m['pnl'] > 0 else '❌'
        star = ' ⭐ BEST' if m['pnl'] > best_pnl else ''
        fund = m['funding_pnl']
        trade_pnl = m['net_profit']
        
        print(f"  {emoji} conf={conf:.2f} cd=1 | PnL=${m['pnl']:>+9.2f} | "
              f"T={m['trades']:>3} WR={m['win_rate']:>5.1f}% PF={m['profit_factor']:.3f} "
              f"Sh={m['sharpe']:>+6.2f} DD={m['max_drawdown']:>5.1f}% | "
              f"fund=${fund:>+.2f} trade=${trade_pnl:>+.2f} ({dt:.0f}s){star}")
        
        if m['pnl'] > best_pnl:
            best_pnl = m['pnl']

# Phase 3: Test with breakeven turned off (currently at 999.0R which means disabled)
# and try different TP targets
if best_pnl < 1500:
    print("\n" + "=" * 100)
    print("PHASE 3: Wide TP sweep at lower confidence with $10k")
    print("=" * 100)
    
    for conf in [0.50, 0.60, 0.70]:
        for tp in [2.0, 3.0, 4.0, 5.0, 8.0, 10.0]:
            ov = {**BASE, 'GPU_NATIVE_MIN_CONFIDENCE': conf, 'TP_ATR_MULT': tp}
            t0 = time.time()
            res = run_sol_backtest(ov, capital=CAPITAL)
            m = extract_metrics(res)
            dt = time.time() - t0
            
            emoji = '✅' if m['pnl'] > 0 else '❌'
            star = ' ⭐ BEST' if m['pnl'] > best_pnl else ''
            
            print(f"  {emoji} conf={conf:.2f} TP={tp:.1f} | PnL=${m['pnl']:>+9.2f} | "
                  f"T={m['trades']:>3} WR={m['win_rate']:>5.1f}% PF={m['profit_factor']:.3f} "
                  f"DD={m['max_drawdown']:>5.1f}% ({dt:.0f}s){star}")
            
            if m['pnl'] > best_pnl:
                best_pnl = m['pnl']

print(f"\n{'=' * 100}")
print(f"  FINAL BEST: ${best_pnl:+.2f} (target: $1,500)")
print(f"{'=' * 100}")
