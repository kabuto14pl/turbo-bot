"""
🧪 TURBO-BOT — Walk-Forward ML-Filtered Backtest (90-Day)

Extended validation: Multiple walk-forward windows to prove ML filter stability.
Instead of single 80/20 split, uses rolling windows:
  - Train on 60 days, test on 15 days, slide 15 days → 4-5 windows

This proves that ML filter performance is STABLE, not just one lucky period.
Target: Sharpe > 1.0 across ALL windows, not just one.

Usage:
    python3 backtest_walkforward.py
    python3 backtest_walkforward.py --timeframe 15m --windows 5
"""

import numpy as np
import pandas as pd
import os
import json
from datetime import datetime

from ml_features import FeatureExtractor
from ml_model import TradingMLEnsemble
from backtest_strategies import (
    TurboBacktester,
    strategy_advanced_adaptive,
    strategy_rsi_turbo,
    strategy_supertrend,
    strategy_ma_crossover,
    strategy_momentum_pro,
)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
RESULTS_DIR = os.path.join(os.path.dirname(__file__), 'results')


def ml_filtered_veto(row, history, strategy_fn, ml_model, feature_extractor,
                     min_confidence=0.52):
    """ML veto filter (matches PATCH #54 bot.js implementation)."""
    try:
        base_signal = strategy_fn(row, history)
    except Exception:
        return 'HOLD'
    
    if base_signal == 'HOLD':
        return 'HOLD'
    
    if not ml_model.trained:
        return base_signal
    
    full_df = pd.concat([history, pd.DataFrame([row], index=[row.name] if hasattr(row, 'name') else [0])])
    features = feature_extractor.extract(full_df, lookback=min(200, len(full_df)))
    pred = ml_model.predict(features)
    
    ml_direction = pred['direction']
    ml_confidence = pred['confidence']
    
    # 3-tier veto matching bot.js implementation
    # HARD VETO: ML opposes with high confidence
    if base_signal == 'BUY' and ml_direction == 'DOWN' and ml_confidence > 0.52:
        return 'HOLD'
    if base_signal == 'SELL' and ml_direction == 'UP' and ml_confidence > 0.52:
        return 'HOLD'
    
    # SOFT VETO: ML uncertain/neutral with medium confidence → still trade but reduced  
    # (In backtest we just pass through since we can't reduce position size easily)
    if ml_direction == 'NEUTRAL' and ml_confidence > 0.45:
        return 'HOLD'
    
    return base_signal


def run_walkforward_backtest(timeframe='15m', n_windows=5, train_days=60, test_days=15):
    """
    Walk-forward validation with rolling train/test windows.
    """
    filepath = os.path.join(DATA_DIR, f'btcusdt_{timeframe}.csv')
    if not os.path.exists(filepath):
        print(f"❌ Data not found: {filepath}")
        return None
    
    print(f"\n{'='*80}")
    print(f"🧪 WALK-FORWARD ML BACKTEST — {timeframe}")
    print(f"   Train: {train_days}d | Test: {test_days}d | Windows: {n_windows}")
    print(f"{'='*80}")
    
    df = pd.read_csv(filepath, index_col='datetime', parse_dates=True)
    
    # Calculate candles per day based on timeframe
    tf_minutes = {'1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440}
    mins = tf_minutes.get(timeframe, 15)
    candles_per_day = 1440 // mins
    
    train_candles = train_days * candles_per_day
    test_candles = test_days * candles_per_day
    window_size = train_candles + test_candles
    warmup_candles = 200  # Feature extraction warmup
    
    total_needed = window_size + (n_windows - 1) * test_candles
    
    print(f"📊 Data available: {len(df)} candles ({len(df)/candles_per_day:.0f} days)")
    print(f"   Need minimum: {total_needed} candles ({total_needed/candles_per_day:.0f} days)")
    
    if len(df) < total_needed + warmup_candles:
        # Adjust n_windows or train_days
        max_windows = max(1, (len(df) - warmup_candles - train_candles) // test_candles)
        print(f"⚠️  Reducing windows from {n_windows} to {max_windows} based on data")
        n_windows = max_windows
    
    strategies = {
        'MACrossover': strategy_ma_crossover,       # Best with ML filter
        'AdvancedAdaptive': strategy_advanced_adaptive,
        'MomentumPro': strategy_momentum_pro,
        'SuperTrend': strategy_supertrend,
        'RSITurbo': strategy_rsi_turbo,
    }
    
    extractor = FeatureExtractor()
    all_window_results = []
    
    for window_idx in range(n_windows):
        start_idx = len(df) - (n_windows - window_idx) * test_candles - train_candles
        train_start = max(0, start_idx)
        train_end = train_start + train_candles
        test_start = train_end - warmup_candles  # Include warmup for features
        test_end = min(len(df), train_end + test_candles)
        
        if train_start < 0 or test_end > len(df):
            continue
        
        df_train = df.iloc[train_start:train_end]
        df_test = df.iloc[test_start:test_end]
        
        print(f"\n{'─'*80}")
        print(f"📅 Window {window_idx+1}/{n_windows}")
        print(f"   Train: {df_train.index[0].strftime('%Y-%m-%d')} → {df_train.index[-1].strftime('%Y-%m-%d')} ({len(df_train)} candles)")
        print(f"   Test:  {df.iloc[train_end].name.strftime('%Y-%m-%d')} → {df_test.index[-1].strftime('%Y-%m-%d')} ({test_end - train_end} candles)")
        
        # Train fresh model on this window's training data
        model = TradingMLEnsemble(use_gpu=False)
        
        try:
            # Use extract_batch which returns (X_df, y_dir, y_ret)
            X_train, y_dir, y_ret = extractor.extract_batch(df_train, lookback=min(200, len(df_train) // 3), horizon=1)
            
            if X_train is None or len(X_train) == 0:
                print(f"   ⚠️ No features extracted, skipping window")
                continue
            
            # Filter out neutral labels
            valid_mask = y_dir != -1
            X_filtered = X_train[valid_mask]
            y_filtered = y_dir[valid_mask]
            y_ret_filtered = y_ret[valid_mask]
            
            if len(X_filtered) < 100:
                print(f"   ⚠️ Too few samples ({len(X_filtered)}), skipping window")
                continue
            
            train_result = model.train(X_filtered, y_filtered, y_ret_filtered)
            if not train_result or not model.trained:
                print(f"   ⚠️ Model training failed, skipping window")
                continue
            print(f"   ✅ Model trained ({len(model.feature_names)} features, {len(X_filtered)} samples)")
        except Exception as e:
            print(f"   ⚠️ Training error: {e}")
            continue
        
        # Run backtests on test data
        window_results = {'window': window_idx + 1, 'strategies': {}}
        
        for name, fn in strategies.items():
            # Baseline (no ML)
            bt_base = TurboBacktester(initial_capital=10000, fee_rate=0.001)
            result_base = bt_base.run(
                df_test, fn, strategy_name=f'{name}',
                sl_atr_mult=1.5, tp_atr_mult=4.0,
                risk_pct=0.02, max_hold_hours=72, allow_short=True
            )
            
            # ML veto
            def veto_fn(row, history, _fn=fn, _model=model, _ext=extractor):
                return ml_filtered_veto(row, history, _fn, _model, _ext, min_confidence=0.52)
            
            bt_veto = TurboBacktester(initial_capital=10000, fee_rate=0.001)
            result_veto = bt_veto.run(
                df_test, veto_fn, strategy_name=f'{name} (ML veto)',
                sl_atr_mult=1.5, tp_atr_mult=4.0,
                risk_pct=0.02, max_hold_hours=72, allow_short=True
            )
            
            if 'error' not in result_base and 'error' not in result_veto and 'total_return_pct' in result_base and 'total_return_pct' in result_veto:
                delta_return = result_veto['total_return_pct'] - result_base['total_return_pct']
                delta_wr = (result_veto['win_rate'] - result_base['win_rate']) * 100
                
                emoji_base = '✅' if result_base['net_profit'] > 0 else '❌'
                emoji_veto = '✅' if result_veto['net_profit'] > 0 else '❌'
                ml_emoji = '📈' if delta_return > 0 else '📉'
                
                print(f"   {name}:")
                print(f"     {emoji_base} Baseline: {result_base['total_trades']:>3} trades, "
                      f"WR={result_base['win_rate']*100:>5.1f}%, "
                      f"Return={result_base['total_return_pct']:>6.1f}%, "
                      f"Sharpe={result_base['sharpe_ratio']:>5.2f}")
                print(f"     {emoji_veto} ML Veto:  {result_veto['total_trades']:>3} trades, "
                      f"WR={result_veto['win_rate']*100:>5.1f}%, "
                      f"Return={result_veto['total_return_pct']:>6.1f}%, "
                      f"Sharpe={result_veto['sharpe_ratio']:>5.2f}")
                print(f"     {ml_emoji} ML Δ: Return {delta_return:+.1f}%, WR {delta_wr:+.1f}pp")
                
                window_results['strategies'][name] = {
                    'baseline': {
                        'trades': result_base['total_trades'],
                        'win_rate': result_base['win_rate'],
                        'return_pct': result_base['total_return_pct'],
                        'sharpe': result_base['sharpe_ratio'],
                        'max_dd': result_base['max_drawdown'],
                        'pf': result_base['profit_factor'],
                    },
                    'ml_veto': {
                        'trades': result_veto['total_trades'],
                        'win_rate': result_veto['win_rate'],
                        'return_pct': result_veto['total_return_pct'],
                        'sharpe': result_veto['sharpe_ratio'],
                        'max_dd': result_veto['max_drawdown'],
                        'pf': result_veto['profit_factor'],
                    },
                    'ml_delta_return': delta_return,
                    'ml_delta_wr': delta_wr,
                }
        
        all_window_results.append(window_results)
    
    if not all_window_results:
        print("❌ No windows completed")
        return None
    
    # ═══════════════════════════════════════════
    # CROSS-WINDOW STABILITY ANALYSIS
    # ═══════════════════════════════════════════
    print(f"\n{'='*80}")
    print(f"📊 WALK-FORWARD STABILITY ANALYSIS — {n_windows} Windows")
    print(f"{'='*80}")
    
    for strategy_name in strategies.keys():
        sharpes_base = []
        sharpes_veto = []
        returns_base = []
        returns_veto = []
        wr_deltas = []
        return_deltas = []
        wins_count = 0
        
        for wr in all_window_results:
            s = wr['strategies'].get(strategy_name)
            if not s:
                continue
            sharpes_base.append(s['baseline']['sharpe'])
            sharpes_veto.append(s['ml_veto']['sharpe'])
            returns_base.append(s['baseline']['return_pct'])
            returns_veto.append(s['ml_veto']['return_pct'])
            wr_deltas.append(s['ml_delta_wr'])
            return_deltas.append(s['ml_delta_return'])
            if s['ml_delta_return'] > 0:
                wins_count += 1
        
        if not sharpes_veto:
            continue
        
        n = len(sharpes_veto)
        avg_sharpe_base = np.mean(sharpes_base)
        avg_sharpe_veto = np.mean(sharpes_veto)
        avg_ret_base = np.mean(returns_base)
        avg_ret_veto = np.mean(returns_veto)
        avg_wr_delta = np.mean(wr_deltas)
        avg_ret_delta = np.mean(return_deltas)
        sharpe_stability = np.std(sharpes_veto) if len(sharpes_veto) > 1 else 0
        consistency = wins_count / n * 100
        
        # Overall verdict
        stable = avg_sharpe_veto > 0.5 and consistency >= 60
        profitable = avg_ret_veto > 0
        verdict = '🏆 STABLE' if stable and profitable else ('⚡ PROMISING' if consistency >= 50 else '❌ UNSTABLE')
        
        print(f"\n{verdict} {strategy_name}:")
        print(f"  Baseline:   Avg Sharpe={avg_sharpe_base:>6.2f} | Avg Return={avg_ret_base:>6.1f}%")
        print(f"  ML Veto:    Avg Sharpe={avg_sharpe_veto:>6.2f} | Avg Return={avg_ret_veto:>6.1f}%")
        print(f"  ML Impact:  Return Δ={avg_ret_delta:>+5.1f}% | WR Δ={avg_wr_delta:>+5.1f}pp")
        print(f"  Consistency: ML improves in {wins_count}/{n} windows ({consistency:.0f}%)")
        print(f"  Sharpe Stability: σ={sharpe_stability:.2f} (lower=more stable)")
        
        # Per-window breakdown
        for i, wr in enumerate(all_window_results):
            s = wr['strategies'].get(strategy_name)
            if s:
                flag = '✅' if s['ml_delta_return'] > 0 else '❌'
                print(f"    W{i+1}: Base {s['baseline']['return_pct']:>+5.1f}% → "
                      f"Veto {s['ml_veto']['return_pct']:>+5.1f}% "
                      f"(Sharpe {s['ml_veto']['sharpe']:>5.2f}) {flag}")
    
    # Save results
    os.makedirs(RESULTS_DIR, exist_ok=True)
    results_file = os.path.join(
        RESULTS_DIR,
        f'walkforward_{timeframe}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    )
    with open(results_file, 'w') as f:
        json.dump(all_window_results, f, indent=2, default=str)
    print(f"\n💾 Results saved: {results_file}")
    
    return all_window_results


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Walk-Forward ML Backtest')
    parser.add_argument('--timeframe', '-t', default='15m')
    parser.add_argument('--windows', '-w', type=int, default=5)
    parser.add_argument('--train-days', type=int, default=60)
    parser.add_argument('--test-days', type=int, default=15)
    args = parser.parse_args()
    
    run_walkforward_backtest(args.timeframe, args.windows, args.train_days, args.test_days)


if __name__ == '__main__':
    main()
