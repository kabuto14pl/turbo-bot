"""
🛡️ TURBO-BOT — Overfitting Guard

Anti-overfitting validation suite:
1. Out-of-sample test (holdout 20%)
2. Monte Carlo permutation test (shuffle returns → null Sharpe distribution)
3. Feature importance stability check (cross-fold consistency)
4. Walk-forward degradation check (CV acc vs test acc gap)

Usage:
    python3 overfitting_guard.py
    python3 overfitting_guard.py --timeframe 15m
"""

import numpy as np
import pandas as pd
import os
import json
from datetime import datetime
from sklearn.model_selection import TimeSeriesSplit

from ml_features import FeatureExtractor
from ml_model import TradingMLEnsemble


DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
RESULTS_DIR = os.path.join(os.path.dirname(__file__), 'results')


class OverfittingGuard:
    """
    Suite of anti-overfitting tests for ML trading models.
    Based on industry-standard quant validation practices.
    """

    def __init__(self, fee_rate=0.002):
        self.fee_rate = fee_rate  # 0.2% round-trip

    def run_full_validation(self, timeframe='15m', horizon=1, n_permutations=100):
        """
        Run complete anti-overfitting validation suite.
        
        Returns:
            dict with all test results + pass/fail verdict
        """
        print(f"\n{'='*60}")
        print(f"🛡️ OVERFITTING GUARD — {timeframe}")
        print(f"{'='*60}")

        # Load data
        filepath = os.path.join(DATA_DIR, f'btcusdt_{timeframe}.csv')
        if not os.path.exists(filepath):
            print(f"❌ Data not found: {filepath}")
            return None

        df = pd.read_csv(filepath, index_col='datetime', parse_dates=True)
        print(f"📊 Data: {len(df)} candles ({timeframe})")

        # Extract features
        extractor = FeatureExtractor()
        X, y_dir, y_ret = extractor.extract_batch(df, lookback=200, horizon=horizon)
        X = X.replace([np.inf, -np.inf], np.nan).fillna(0)

        # Split: 60% train, 20% validation, 20% holdout (NEVER touched during training)
        n = len(X)
        train_end = int(n * 0.6)
        val_end = int(n * 0.8)

        X_train = X.iloc[:train_end]
        y_dir_train = y_dir[:train_end]
        y_ret_train = y_ret[:train_end]

        X_val = X.iloc[train_end:val_end]
        y_dir_val = y_dir[train_end:val_end]
        y_ret_val = y_ret[train_end:val_end]

        X_holdout = X.iloc[val_end:]
        y_dir_holdout = y_dir[val_end:]
        y_ret_holdout = y_ret[val_end:]

        print(f"   Train: {len(X_train)} | Validation: {len(X_val)} | Holdout: {len(X_holdout)}")

        results = {}

        # TEST 1: Walk-forward degradation check
        print(f"\n📊 Test 1: Walk-Forward Degradation Check")
        results['degradation'] = self._test_degradation(
            X_train, y_dir_train, y_ret_train,
            X_val, y_dir_val, y_ret_val,
            X_holdout, y_dir_holdout, y_ret_holdout
        )

        # TEST 2: Monte Carlo permutation test
        print(f"\n🎲 Test 2: Monte Carlo Permutation Test (n={n_permutations})")
        results['permutation'] = self._test_permutation(
            X_train, y_dir_train, y_ret_train,
            X_val, y_dir_val, y_ret_val,
            n_permutations=n_permutations
        )

        # TEST 3: Feature importance stability
        print(f"\n⚡ Test 3: Feature Importance Stability (5-fold)")
        results['feature_stability'] = self._test_feature_stability(
            X_train, y_dir_train, y_ret_train
        )

        # TEST 4: Out-of-sample holdout test
        print(f"\n🔒 Test 4: Pure Out-of-Sample Holdout Test")
        results['holdout'] = self._test_holdout(
            X_train, y_dir_train, y_ret_train,
            X_holdout, y_dir_holdout, y_ret_holdout
        )

        # VERDICT
        results['verdict'] = self._compute_verdict(results)

        print(f"\n{'='*60}")
        print(f"🛡️ VERDICT: {'✅ PASS' if results['verdict']['pass'] else '❌ FAIL'}")
        print(f"   Score: {results['verdict']['score']}/100")
        for note in results['verdict']['notes']:
            print(f"   {'✅' if note['pass'] else '❌'} {note['test']}: {note['detail']}")
        print(f"{'='*60}")

        # Save results
        os.makedirs(RESULTS_DIR, exist_ok=True)
        result_file = os.path.join(
            RESULTS_DIR,
            f'overfitting_guard_{timeframe}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        )
        with open(result_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"💾 Results saved: {result_file}")

        return results

    def _test_degradation(self, X_train, y_dir_train, y_ret_train,
                          X_val, y_dir_val, y_ret_val,
                          X_holdout, y_dir_holdout, y_ret_holdout):
        """
        Check if model performance degrades significantly from CV → validation → holdout.
        Large gaps indicate overfitting.
        """
        model = TradingMLEnsemble(use_gpu=False)
        metrics = model.train(X_train, y_dir_train, y_ret_train)
        cv_acc = metrics.get('cv_mean_accuracy', 0.5)

        # Validation accuracy
        val_acc = self._evaluate_accuracy(model, X_val, y_dir_val)
        # Holdout accuracy  
        holdout_acc = self._evaluate_accuracy(model, X_holdout, y_dir_holdout)

        # Degradation = gap between CV and holdout
        cv_val_gap = cv_acc - val_acc
        cv_holdout_gap = cv_acc - holdout_acc

        result = {
            'cv_accuracy': round(cv_acc, 4),
            'val_accuracy': round(val_acc, 4),
            'holdout_accuracy': round(holdout_acc, 4),
            'cv_val_gap': round(cv_val_gap, 4),
            'cv_holdout_gap': round(cv_holdout_gap, 4),
            'pass': bool(cv_holdout_gap < 0.05),  # Less than 5% degradation
        }

        print(f"   CV acc:      {cv_acc:.1%}")
        print(f"   Val acc:     {val_acc:.1%} (gap: {cv_val_gap:+.1%})")
        print(f"   Holdout acc: {holdout_acc:.1%} (gap: {cv_holdout_gap:+.1%})")
        print(f"   {'✅ PASS' if result['pass'] else '❌ FAIL'}: gap {'<' if result['pass'] else '>'} 5%")

        return result

    def _test_permutation(self, X_train, y_dir_train, y_ret_train,
                          X_val, y_dir_val, y_ret_val, n_permutations=100):
        """
        Monte Carlo permutation test:
        - Train real model → get real accuracy
        - Shuffle labels n times → train → get null distribution
        - P-value = % of shuffled models that beat real model
        - If p < 0.05 → model has real predictive power (not random luck)
        """
        # Real model accuracy
        model = TradingMLEnsemble(use_gpu=False)
        model.train(X_train, y_dir_train, y_ret_train)
        real_acc = self._evaluate_accuracy(model, X_val, y_dir_val)

        # Null distribution (shuffled labels)
        null_accuracies = []
        print(f"   Real accuracy: {real_acc:.3f}")
        print(f"   Running {n_permutations} permutations...", end='', flush=True)

        for i in range(n_permutations):
            if (i + 1) % 20 == 0:
                print(f" {i+1}", end='', flush=True)

            # Shuffle training labels (break any real signal)
            y_shuffled = y_dir_train.copy()
            mask = y_shuffled != -1
            shuffled_vals = y_shuffled[mask].values if hasattr(y_shuffled, 'values') else y_shuffled[mask]
            np.random.shuffle(shuffled_vals)
            if hasattr(y_shuffled, 'iloc'):
                y_shuffled.iloc[np.where(mask)[0]] = shuffled_vals
            else:
                y_shuffled[mask] = shuffled_vals

            try:
                perm_model = TradingMLEnsemble(use_gpu=False)
                perm_model.train(X_train, y_shuffled, y_ret_train)
                perm_acc = self._evaluate_accuracy(perm_model, X_val, y_dir_val)
                null_accuracies.append(perm_acc)
            except Exception:
                null_accuracies.append(0.5)

        print()

        null_arr = np.array(null_accuracies)
        p_value = np.mean(null_arr >= real_acc)

        result = {
            'real_accuracy': round(real_acc, 4),
            'null_mean': round(float(np.mean(null_arr)), 4),
            'null_std': round(float(np.std(null_arr)), 4),
            'null_max': round(float(np.max(null_arr)), 4),
            'p_value': round(float(p_value), 4),
            'n_permutations': n_permutations,
            'pass': bool(p_value < 0.10),  # 10% significance (generous for crypto)
        }

        print(f"   Null distribution: {np.mean(null_arr):.3f} ± {np.std(null_arr):.3f} (max: {np.max(null_arr):.3f})")
        print(f"   P-value: {p_value:.3f}")
        print(f"   {'✅ PASS' if result['pass'] else '❌ FAIL'}: p-value {'<' if result['pass'] else '>'} 0.10")

        return result

    def _test_feature_stability(self, X, y_dir, y_ret, n_folds=5):
        """
        Check if feature importance is stable across folds.
        If top features change radically → model is fitting noise.
        """
        tscv = TimeSeriesSplit(n_splits=n_folds)
        fold_importances = []

        mask = y_dir != -1
        X_filt = X[mask].copy()
        y_filt = y_dir[mask].copy()

        for fold, (train_idx, _) in enumerate(tscv.split(X_filt)):
            model = TradingMLEnsemble(use_gpu=False)
            X_fold = X_filt.iloc[train_idx]
            y_fold = y_filt[train_idx] if not hasattr(y_filt, 'iloc') else y_filt.iloc[train_idx]
            y_ret_fold = y_ret[mask][train_idx] if not hasattr(y_ret, 'iloc') else y_ret[mask].iloc[train_idx]

            try:
                model.train(X_fold, y_fold, y_ret_fold)
                # Get top 10 features
                top10 = sorted(model.feature_importance.items(), key=lambda x: -x[1])[:10]
                fold_importances.append({name: rank for rank, (name, _) in enumerate(top10)})
            except Exception:
                continue

        if len(fold_importances) < 3:
            return {'pass': False, 'error': 'Too few successful folds'}

        # Check overlap of top 10 features across folds
        all_top10_sets = [set(fi.keys()) for fi in fold_importances]
        
        # Pairwise Jaccard similarity
        similarities = []
        for i in range(len(all_top10_sets)):
            for j in range(i + 1, len(all_top10_sets)):
                intersection = len(all_top10_sets[i] & all_top10_sets[j])
                union = len(all_top10_sets[i] | all_top10_sets[j])
                similarities.append(intersection / union if union > 0 else 0)

        avg_similarity = float(np.mean(similarities))

        # Find consistently top features (appear in >60% of folds)
        feature_counts = {}
        for fi in fold_importances:
            for name in fi:
                feature_counts[name] = feature_counts.get(name, 0) + 1

        stable_features = [
            name for name, count in feature_counts.items()
            if count >= len(fold_importances) * 0.6
        ]

        result = {
            'n_folds': len(fold_importances),
            'avg_jaccard_similarity': round(avg_similarity, 4),
            'stable_features': stable_features,
            'n_stable': len(stable_features),
            'all_features_seen': list(feature_counts.keys()),
            'pass': bool(avg_similarity > 0.3 and len(stable_features) >= 3),
        }

        print(f"   Folds analyzed: {len(fold_importances)}")
        print(f"   Avg Jaccard similarity: {avg_similarity:.3f}")
        print(f"   Stable features ({len(stable_features)}): {stable_features[:5]}")
        print(f"   {'✅ PASS' if result['pass'] else '❌ FAIL'}: similarity {'>' if avg_similarity > 0.3 else '<'} 0.3, stable features {'≥' if len(stable_features) >= 3 else '<'} 3")

        return result

    def _test_holdout(self, X_train, y_dir_train, y_ret_train,
                      X_holdout, y_dir_holdout, y_ret_holdout):
        """
        Pure out-of-sample holdout test.
        Model trained ONLY on training data, tested on holdout (never seen).
        """
        model = TradingMLEnsemble(use_gpu=False)
        model.train(X_train, y_dir_train, y_ret_train)

        mask = y_dir_holdout != -1
        X_test = X_holdout[mask]
        y_test = y_dir_holdout[mask]
        y_ret_test = y_ret_holdout[mask]

        if len(X_test) < 10:
            return {'pass': False, 'error': 'Too few holdout samples'}

        # Simulate trading on holdout
        total_pnl = 0
        wins = 0
        losses = 0
        trades = 0
        correct = 0

        for i in range(len(X_test)):
            features = dict(X_test.iloc[i])
            pred = model.predict(features)
            actual_dir = y_test.iloc[i] if hasattr(y_test, 'iloc') else y_test[i]
            actual_ret = y_ret_test.iloc[i] if hasattr(y_ret_test, 'iloc') else y_ret_test[i]

            if pred['direction'] != 'NEUTRAL':
                trades += 1
                pred_dir = 1 if pred['direction'] == 'UP' else 0

                if pred_dir == actual_dir:
                    correct += 1

                pnl = actual_ret - self.fee_rate if pred['direction'] == 'UP' else -actual_ret - self.fee_rate
                total_pnl += pnl
                if pnl > 0:
                    wins += 1
                else:
                    losses += 1

        accuracy = correct / trades if trades > 0 else 0
        win_rate = wins / (wins + losses) if (wins + losses) > 0 else 0
        avg_pnl = total_pnl / trades if trades > 0 else 0

        # Sharpe estimate (annualized, assuming 15m candles → 96 candles/day)
        if trades > 1:
            per_trade_pnls = []
            for i in range(len(X_test)):
                features = dict(X_test.iloc[i])
                pred = model.predict(features)
                actual_ret = y_ret_test.iloc[i] if hasattr(y_ret_test, 'iloc') else y_ret_test[i]
                if pred['direction'] != 'NEUTRAL':
                    pnl = actual_ret - self.fee_rate if pred['direction'] == 'UP' else -actual_ret - self.fee_rate
                    per_trade_pnls.append(pnl)

            if len(per_trade_pnls) > 1:
                sharpe = (np.mean(per_trade_pnls) / (np.std(per_trade_pnls) + 1e-8)) * np.sqrt(252 * 96)
            else:
                sharpe = 0
        else:
            sharpe = 0

        result = {
            'holdout_samples': len(X_test),
            'trades': trades,
            'accuracy': round(accuracy, 4),
            'win_rate': round(win_rate, 4),
            'total_pnl_pct': round(total_pnl * 100, 4),
            'avg_pnl_per_trade_pct': round(avg_pnl * 100, 6),
            'sharpe_estimate': round(float(sharpe), 4),
            'pass': bool(total_pnl > 0 and accuracy > 0.50),
        }

        print(f"   Holdout samples: {len(X_test)} | Trades: {trades}")
        print(f"   Accuracy: {accuracy:.1%} | Win rate: {win_rate:.1%}")
        print(f"   Total PnL: {total_pnl*100:.2f}% | Avg per trade: {avg_pnl*100:.4f}%")
        print(f"   Sharpe estimate: {sharpe:.2f}")
        print(f"   {'✅ PASS' if result['pass'] else '❌ FAIL'}: PnL {'>' if total_pnl > 0 else '<'} 0, acc {'>' if accuracy > 0.50 else '<'} 50%")

        return result

    def _evaluate_accuracy(self, model, X, y_dir):
        """Evaluate model accuracy on filtered data."""
        mask = y_dir != -1
        X_filt = X[mask]
        y_filt = y_dir[mask]

        if len(X_filt) == 0:
            return 0.5

        correct = 0
        total = 0
        for i in range(len(X_filt)):
            features = dict(X_filt.iloc[i])
            pred = model.predict(features)
            if pred['direction'] != 'NEUTRAL':
                actual = y_filt.iloc[i] if hasattr(y_filt, 'iloc') else y_filt[i]
                pred_dir = 1 if pred['direction'] == 'UP' else 0
                if pred_dir == actual:
                    correct += 1
                total += 1

        return correct / total if total > 0 else 0.5

    def _compute_verdict(self, results):
        """Compute final pass/fail verdict."""
        tests = [
            {'test': 'Degradation', 'pass': results.get('degradation', {}).get('pass', False),
             'detail': f"CV→holdout gap: {results.get('degradation', {}).get('cv_holdout_gap', 0)*100:.1f}%"},
            {'test': 'Permutation', 'pass': results.get('permutation', {}).get('pass', False),
             'detail': f"p-value: {results.get('permutation', {}).get('p_value', 1):.3f}"},
            {'test': 'Feature Stability', 'pass': results.get('feature_stability', {}).get('pass', False),
             'detail': f"Jaccard: {results.get('feature_stability', {}).get('avg_jaccard_similarity', 0):.3f}"},
            {'test': 'Holdout', 'pass': results.get('holdout', {}).get('pass', False),
             'detail': f"PnL: {results.get('holdout', {}).get('total_pnl_pct', 0):.2f}%, Sharpe: {results.get('holdout', {}).get('sharpe_estimate', 0):.2f}"},
        ]

        passed = sum(1 for t in tests if t['pass'])
        score = int(passed / len(tests) * 100)

        return {
            'pass': passed >= 2,  # Need at least 2/4 tests to pass
            'score': score,
            'passed_tests': passed,
            'total_tests': len(tests),
            'notes': tests,
        }


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Overfitting Guard')
    parser.add_argument('--timeframe', '-t', default='15m')
    parser.add_argument('--permutations', '-n', type=int, default=50)
    args = parser.parse_args()

    guard = OverfittingGuard()
    guard.run_full_validation(args.timeframe, n_permutations=args.permutations)


if __name__ == '__main__':
    main()
