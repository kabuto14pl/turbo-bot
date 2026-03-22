"""
🧠 TURBO-BOT — Model Training Script

Walk-forward training pipeline:
1. Load historical data (from fetch_historical.py)
2. Extract features (ml_features.py)
3. Train XGBoost + LightGBM ensemble (ml_model.py)
4. Evaluate with walk-forward CV
5. Compare ML-enhanced strategies vs baseline
6. Save trained models

Usage:
    python3 train_model.py
    python3 train_model.py --timeframe 1h
"""

import os
import sys
import json
import argparse
import numpy as np
import pandas as pd
from datetime import datetime

from ml_features import FeatureExtractor
from ml_model import TradingMLEnsemble

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
RESULTS_DIR = os.path.join(os.path.dirname(__file__), 'results')

MULTI_SYMBOL_PAIRS = ['btcusdt', 'ethusdt', 'solusdt', 'bnbusdt', 'xrpusdt']


def load_data(timeframe='15m'):
    """Load preprocessed OHLCV data."""
    filepath = os.path.join(DATA_DIR, f'btcusdt_{timeframe}.csv')
    if not os.path.exists(filepath):
        print(f"❌ Data file not found: {filepath}")
        print("   Run fetch_historical.py first!")
        return None
    
    df = pd.read_csv(filepath, index_col='datetime', parse_dates=True)
    print(f"📊 Loaded {len(df)} candles ({timeframe})")
    print(f"   Range: {df.index[0]} → {df.index[-1]}")
    print(f"   Price: ${df['close'].min():.0f} → ${df['close'].max():.0f}")
    return df


def load_multi_symbol_data(timeframe='15m'):
    """Load and normalize OHLCV data from all available symbols."""
    all_dfs = []
    for pair in MULTI_SYMBOL_PAIRS:
        filepath = os.path.join(DATA_DIR, f'{pair}_{timeframe}.csv')
        if os.path.exists(filepath):
            df = pd.read_csv(filepath, index_col='datetime', parse_dates=True)
            # Normalize prices to returns-based so different price scales don't matter
            # Features are already relative (ratios, returns, etc.) so raw OHLCV is fine
            all_dfs.append((pair, df))
            print(f"   {pair}: {len(df)} candles")
    
    if not all_dfs:
        return None
    
    print(f"📊 Loaded {len(all_dfs)} symbols, {sum(len(d) for _,d in all_dfs)} total candles ({timeframe})")
    return all_dfs


def train_and_evaluate(timeframe='15m', horizon=1):
    """
    Full training pipeline:
    1. Extract features
    2. Train ensemble
    3. Evaluate on out-of-sample data
    4. Compare with baseline backtest
    """
    print(f"\n{'='*60}")
    print(f"🧠 TURBO-BOT ML TRAINING — {timeframe} (horizon={horizon})")
    print(f"{'='*60}")
    
    # 1. Load data — multi-symbol for better generalization
    print("\n📊 Loading multi-symbol data...")
    multi_data = load_multi_symbol_data(timeframe)
    if not multi_data:
        df = load_data(timeframe)
        if df is None:
            return None
        multi_data = [('btcusdt', df)]
    
    # 2. Extract features from all symbols
    print("\n📐 Extracting features...")
    extractor = FeatureExtractor()
    all_X, all_y_dir, all_y_ret = [], [], []
    
    for pair, df in multi_data:
        X, y_dir, y_ret = extractor.extract_batch(df, lookback=200, horizon=horizon)
        print(f"   {pair}: {X.shape[0]} samples, {X.shape[1]} features")
        all_X.append(X)
        all_y_dir.append(y_dir)
        all_y_ret.append(y_ret)
    
    X = pd.concat(all_X, ignore_index=True)
    y_dir = np.concatenate(all_y_dir)
    y_ret = np.concatenate(all_y_ret)
    
    print(f"   TOTAL: {X.shape[0]} samples, {X.shape[1]} features")
    print(f"   Labels: {sum(y_dir==1)} UP, {sum(y_dir==0)} DOWN, {sum(y_dir==-1)} NEUTRAL")
    print(f"   UP ratio: {sum(y_dir==1)/(sum(y_dir!=-1)+1e-8):.1%}")
    
    # Handle NaN/Inf in features
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0)
    
    # 3. Train-test split (80/20 temporal)
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_dir_train, y_dir_test = y_dir[:split_idx], y_dir[split_idx:]
    y_ret_train, y_ret_test = y_ret[:split_idx], y_ret[split_idx:]
    
    print(f"\n   Train: {len(X_train)} samples | Test: {len(X_test)} samples")
    
    # 4. Train ensemble
    print("\n🔧 Training XGBoost + LightGBM ensemble...")
    model = TradingMLEnsemble(use_gpu=False)  # CPU in dev container
    metrics = model.train(X_train, y_dir_train, y_ret_train)
    
    if 'error' in metrics:
        print(f"❌ Training failed: {metrics['error']}")
        return None
    
    # 5. Evaluate on test set
    print("\n📊 Evaluating on out-of-sample test data...")
    test_mask = y_dir_test != -1
    X_test_filt = X_test[test_mask]
    y_test_filt = y_dir_test[test_mask]
    y_ret_test_filt = y_ret_test[test_mask]
    
    if len(X_test_filt) < 10:
        print(f"   ⚠️ Too few test samples: {len(X_test_filt)}")
        return metrics
    
    # Predictions — position-based simulation (not per-bar)
    # Enter on signal, exit on reversal/neutral, fee per trade (not per candle)
    correct = 0
    total = 0
    total_pnl = 0
    wins = 0
    losses = 0
    trades_taken = 0
    fee = 0.001  # 0.1% round-trip (0.05% maker entry + 0.05% maker exit, Kraken Pro)
    
    # Position-based PnL
    position = None  # None, 'UP', or 'DOWN'
    entry_idx = 0
    cumulative_ret = 0
    
    for i in range(len(X_test_filt)):
        features = dict(X_test_filt.iloc[i])
        pred = model.predict(features)
        actual_dir = y_test_filt.iloc[i] if hasattr(y_test_filt, 'iloc') else y_test_filt[i]
        actual_ret = y_ret_test_filt.iloc[i] if hasattr(y_ret_test_filt, 'iloc') else y_ret_test_filt[i]
        
        if pred['direction'] != 'NEUTRAL':
            pred_dir = 1 if pred['direction'] == 'UP' else 0
            if pred_dir == actual_dir:
                correct += 1
            total += 1
        
        # Position management
        pred_dir_str = pred['direction']
        
        if position is None and pred_dir_str != 'NEUTRAL':
            # Open new position
            position = pred_dir_str
            entry_idx = i
            cumulative_ret = 0
        elif position is not None:
            # Accumulate return while in position
            if position == 'UP':
                cumulative_ret += actual_ret
            else:
                cumulative_ret -= actual_ret
            
            # Exit on reversal or neutral
            if pred_dir_str != position:
                # Close position
                trade_pnl = cumulative_ret - fee  # Fee once per trade
                total_pnl += trade_pnl
                trades_taken += 1
                if trade_pnl > 0:
                    wins += 1
                else:
                    losses += 1
                
                # Maybe open reverse position
                if pred_dir_str != 'NEUTRAL':
                    position = pred_dir_str
                    entry_idx = i
                    cumulative_ret = 0
                else:
                    position = None
    
    # Close any open position at end
    if position is not None:
        trade_pnl = cumulative_ret - fee
        total_pnl += trade_pnl
        trades_taken += 1
        if trade_pnl > 0:
            wins += 1
        else:
            losses += 1
    
    if total == 0:
        print("   ⚠️ Model generated 0 non-NEUTRAL predictions")
        accuracy = 0
        win_rate = 0
    else:
        accuracy = correct / total
        win_rate = wins / (wins + losses) if (wins + losses) > 0 else 0
    
    print(f"\n{'='*60}")
    print(f"📊 OUT-OF-SAMPLE RESULTS ({timeframe})")
    print(f"{'='*60}")
    print(f"  Directional accuracy:  {accuracy:.1%} ({correct}/{total})")
    print(f"  Trades taken:          {trades_taken}/{len(X_test_filt)} ({trades_taken/len(X_test_filt)*100:.0f}%)")
    print(f"  Win rate (after fees): {win_rate:.1%}")
    print(f"  Total PnL (simulated): {total_pnl*100:.2f}%")
    print(f"  Avg PnL per trade:     {total_pnl/max(trades_taken,1)*100:.4f}%")
    
    # 6. Feature importance
    print(f"\n📊 Top 10 Features:")
    sorted_features = sorted(model.feature_importance.items(), key=lambda x: -x[1])
    for name, imp in sorted_features[:10]:
        bar = '█' * int(imp / max(v for v in model.feature_importance.values()) * 20)
        print(f"   {name:<25} {imp:.4f} {bar}")
    
    # 7. Save model
    model.save(prefix=f'turbo_{timeframe}')
    
    # 8. Save results
    os.makedirs(RESULTS_DIR, exist_ok=True)
    result = {
        'timeframe': timeframe,
        'horizon': horizon,
        'training_metrics': metrics,
        'test_results': {
            'accuracy': accuracy,
            'trades_taken': trades_taken,
            'total_test_samples': len(X_test_filt),
            'win_rate': win_rate,
            'total_pnl_pct': total_pnl * 100,
            'avg_pnl_per_trade_pct': total_pnl / max(trades_taken, 1) * 100,
        },
        'top_features': dict(sorted_features[:15]),
        'timestamp': datetime.now().isoformat(),
    }
    
    results_file = os.path.join(RESULTS_DIR, f'ml_training_{timeframe}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json')
    with open(results_file, 'w') as f:
        json.dump(result, f, indent=2, default=str)
    print(f"\n💾 Results saved: {results_file}")
    
    return result


def main():
    parser = argparse.ArgumentParser(description='Turbo-Bot ML Training')
    parser.add_argument('--timeframe', '-t', default='all', 
                        help='Timeframe to train on (15m, 1h, 4h, or all)')
    parser.add_argument('--horizon', '-H', type=int, default=1,
                        help='Prediction horizon in candles (default: 1)')
    args = parser.parse_args()
    
    timeframes = ['15m', '1h', '4h'] if args.timeframe == 'all' else [args.timeframe]
    
    all_results = {}
    for tf in timeframes:
        filepath = os.path.join(DATA_DIR, f'btcusdt_{tf}.csv')
        if os.path.exists(filepath):
            result = train_and_evaluate(tf, args.horizon)
            if result:
                all_results[tf] = result
        else:
            print(f"\n⚠️ No data for {tf} — skip")
    
    # Summary
    if all_results:
        print(f"\n{'='*60}")
        print(f"📊 TRAINING SUMMARY")
        print(f"{'='*60}")
        print(f"{'TF':<6} {'CV Acc':>8} {'Test Acc':>9} {'WinRate':>8} {'PnL%':>8} {'Trades':>7}")
        print(f"{'─'*50}")
        for tf, r in all_results.items():
            cv_acc = r['training_metrics'].get('cv_mean_accuracy', 0)
            test_acc = r['test_results']['accuracy']
            wr = r['test_results']['win_rate']
            pnl = r['test_results']['total_pnl_pct']
            trades = r['test_results']['trades_taken']
            emoji = '✅' if pnl > 0 else '❌'
            print(f"{emoji} {tf:<4} {cv_acc:>7.1%} {test_acc:>8.1%} {wr:>7.1%} {pnl:>7.2f} {trades:>7}")


if __name__ == '__main__':
    main()
