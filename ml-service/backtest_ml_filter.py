"""
🧪 TURBO-BOT — ML-Filtered Backtest

Tests the REAL use case: ML model as FILTER on strategy signals.
- Strategy generates BUY/SELL signals
- ML model agrees or disagrees
- Only trade when ML agrees → fewer trades, higher quality

This is the true measure of ML value — not standalone prediction.

Usage:
    python3 backtest_ml_filter.py
    python3 backtest_ml_filter.py --timeframe 1h
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


def ml_filtered_strategy(row, history, strategy_fn, ml_model, feature_extractor,
                         min_confidence=0.56, require_agreement=True):
    """
    Apply ML filter to strategy signal.
    Only pass BUY/SELL when ML model agrees.
    
    Args:
        row: Current candle
        history: Past candles DataFrame
        strategy_fn: Base strategy function
        ml_model: Trained TradingMLEnsemble
        feature_extractor: FeatureExtractor instance
        min_confidence: Min ML confidence to agree
        require_agreement: If True, ML must agree with direction
    
    Returns:
        'BUY', 'SELL', or 'HOLD'
    """
    # Step 1: Get strategy signal
    try:
        base_signal = strategy_fn(row, history)
    except Exception:
        return 'HOLD'
    
    if base_signal == 'HOLD':
        return 'HOLD'
    
    # Step 2: Get ML prediction
    if not ml_model.trained:
        return base_signal  # No filter if model not trained
    
    # Build full DataFrame for feature extraction
    full_df = pd.concat([history, pd.DataFrame([row], index=[row.name] if hasattr(row, 'name') else [0])])
    features = feature_extractor.extract(full_df, lookback=min(200, len(full_df)))
    pred = ml_model.predict(features)
    
    # Step 3: Filter decision
    ml_direction = pred['direction']
    ml_confidence = pred['confidence']
    
    if require_agreement:
        if base_signal == 'BUY' and ml_direction == 'UP' and ml_confidence >= min_confidence:
            return 'BUY'
        elif base_signal == 'SELL' and ml_direction == 'DOWN' and ml_confidence >= min_confidence:
            return 'SELL'
        else:
            return 'HOLD'  # ML disagrees or low confidence
    else:
        # ML can veto only
        if ml_direction == 'NEUTRAL':
            return 'HOLD'
        if base_signal == 'BUY' and ml_direction == 'DOWN' and ml_confidence > 0.60:
            return 'HOLD'  # Strong ML veto
        if base_signal == 'SELL' and ml_direction == 'UP' and ml_confidence > 0.60:
            return 'HOLD'  # Strong ML veto
        return base_signal


def run_ml_filtered_backtests(timeframe='15m', min_confidence=0.56):
    """
    Run backtests with and without ML filter for comparison.
    """
    filepath = os.path.join(DATA_DIR, f'btcusdt_{timeframe}.csv')
    if not os.path.exists(filepath):
        print(f"❌ Data not found: {filepath}")
        return None
    
    print(f"\n{'='*70}")
    print(f"🧪 ML-FILTERED BACKTEST — {timeframe} (min_conf={min_confidence})")
    print(f"{'='*70}")
    
    df = pd.read_csv(filepath, index_col='datetime', parse_dates=True)
    
    # Load trained model
    model = TradingMLEnsemble(use_gpu=False)
    loaded = model.load()
    if not loaded:
        print("❌ No trained model found — run train_model.py first")
        return None
    
    extractor = FeatureExtractor()
    
    strategies = {
        'AdvancedAdaptive': strategy_advanced_adaptive,
        'RSITurbo': strategy_rsi_turbo,
        'SuperTrend': strategy_supertrend,
        'MACrossover': strategy_ma_crossover,
        'MomentumPro': strategy_momentum_pro,
    }
    
    # Use only test data (last 20%) to avoid look-ahead bias
    split_idx = int(len(df) * 0.8)
    df_test = df.iloc[split_idx-200:]  # Include warmup candles
    
    print(f"📊 Test data: {len(df_test)} candles (last 20% + warmup)")
    print(f"   Range: {df_test.index[0]} → {df_test.index[-1]}")
    print(f"   Model features: {len(model.feature_names)}")
    
    all_results = []
    
    for name, fn in strategies.items():
        print(f"\n--- {name} ---")
        
        # A) Baseline: strategy alone (no ML)
        bt_base = TurboBacktester(initial_capital=10000, fee_rate=0.001)
        result_base = bt_base.run(
            df_test, fn, strategy_name=f'{name} (baseline)',
            sl_atr_mult=1.5, tp_atr_mult=4.0,
            risk_pct=0.02, max_hold_hours=72, allow_short=True
        )
        
        # B) ML Agreement filter
        def ml_agree_fn(row, history, _fn=fn, _model=model, _ext=extractor, _mc=min_confidence):
            return ml_filtered_strategy(row, history, _fn, _model, _ext,
                                         min_confidence=_mc, require_agreement=True)
        
        bt_agree = TurboBacktester(initial_capital=10000, fee_rate=0.001)
        result_agree = bt_agree.run(
            df_test, ml_agree_fn, strategy_name=f'{name} (ML agree)',
            sl_atr_mult=1.5, tp_atr_mult=4.0,
            risk_pct=0.02, max_hold_hours=72, allow_short=True
        )
        
        # C) ML Veto-only filter (less restrictive)
        def ml_veto_fn(row, history, _fn=fn, _model=model, _ext=extractor, _mc=min_confidence):
            return ml_filtered_strategy(row, history, _fn, _model, _ext,
                                         min_confidence=_mc, require_agreement=False)
        
        bt_veto = TurboBacktester(initial_capital=10000, fee_rate=0.001)
        result_veto = bt_veto.run(
            df_test, ml_veto_fn, strategy_name=f'{name} (ML veto)',
            sl_atr_mult=1.5, tp_atr_mult=4.0,
            risk_pct=0.02, max_hold_hours=72, allow_short=True
        )
        
        for r in [result_base, result_agree, result_veto]:
            if 'error' not in r:
                all_results.append(r)
                emoji = '✅' if r['net_profit'] > 0 else '❌'
                print(f"  {emoji} {r['strategy']:<30} Trades={r['total_trades']:>3} "
                      f"WR={r['win_rate']*100:>5.1f}% PF={r['profit_factor']:>5.2f} "
                      f"Return={r['total_return_pct']:>7.1f}% Sharpe={r['sharpe_ratio']:>6.2f}")
    
    if not all_results:
        print("❌ No results")
        return None
    
    # === SUMMARY COMPARISON ===
    print(f"\n{'='*90}")
    print(f"📊 ML FILTER IMPACT ANALYSIS — {timeframe}")
    print(f"{'='*90}")
    print(f"{'Strategy':<32} {'Trades':>7} {'WinRate':>8} {'PF':>6} {'Sharpe':>8} "
          f"{'Return':>8} {'MaxDD':>7}")
    print(f"{'─'*90}")
    
    # Group by strategy name
    base_map = {}
    for r in all_results:
        strategy_base = r['strategy'].split(' (')[0]
        mode = 'baseline' if 'baseline' in r['strategy'] else ('agree' if 'agree' in r['strategy'] else 'veto')
        key = (strategy_base, mode)
        base_map[key] = r
    
    for strategy_name in strategies.keys():
        for mode in ['baseline', 'agree', 'veto']:
            key = (strategy_name, mode)
            r = base_map.get(key)
            if r:
                flag = '✅' if r['net_profit'] > 0 else '❌'
                label = f"{strategy_name} ({mode})"
                print(f"{flag} {label:<30} {r['total_trades']:>7} "
                      f"{r['win_rate']*100:>7.1f}% {r['profit_factor']:>6.2f} "
                      f"{r['sharpe_ratio']:>8.2f} {r['total_return_pct']:>7.1f}% "
                      f"{r['max_drawdown']*100:>6.1f}%")
        print()
    
    # ML Value Added analysis
    print(f"\n🎯 ML VALUE ADDED:")
    for strategy_name in strategies.keys():
        baseline = base_map.get((strategy_name, 'baseline'))
        ml_agree = base_map.get((strategy_name, 'agree'))
        ml_veto = base_map.get((strategy_name, 'veto'))
        
        if baseline and ml_agree:
            delta_return = ml_agree['total_return_pct'] - baseline['total_return_pct']
            delta_wr = (ml_agree['win_rate'] - baseline['win_rate']) * 100
            trade_reduction = (1 - ml_agree['total_trades'] / max(baseline['total_trades'], 1)) * 100
            emoji = '✅' if delta_return > 0 else '❌'
            print(f"   {emoji} {strategy_name} (agree): Return Δ={delta_return:+.1f}% | "
                  f"WR Δ={delta_wr:+.1f}pp | Trades {trade_reduction:.0f}% fewer")
        
        if baseline and ml_veto:
            delta_return = ml_veto['total_return_pct'] - baseline['total_return_pct']
            delta_wr = (ml_veto['win_rate'] - baseline['win_rate']) * 100
            emoji = '✅' if delta_return > 0 else '❌'
            print(f"   {emoji} {strategy_name} (veto):  Return Δ={delta_return:+.1f}% | "
                  f"WR Δ={delta_wr:+.1f}pp")
    
    # Save results
    os.makedirs(RESULTS_DIR, exist_ok=True)
    results_file = os.path.join(
        RESULTS_DIR,
        f'ml_filter_{timeframe}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    )
    with open(results_file, 'w') as f:
        json.dump(all_results, f, indent=2, default=str)
    print(f"\n💾 Results saved: {results_file}")
    
    return all_results


def main():
    import argparse
    parser = argparse.ArgumentParser(description='ML-Filtered Backtest')
    parser.add_argument('--timeframe', '-t', default='15m')
    parser.add_argument('--confidence', '-c', type=float, default=0.56)
    args = parser.parse_args()
    
    run_ml_filtered_backtests(args.timeframe, args.confidence)


if __name__ == '__main__':
    main()
