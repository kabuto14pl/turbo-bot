"""
🧠 TURBO-BOT — ML Model (XGBoost + LightGBM Ensemble)

Industry-standard ensemble for crypto trading:
1. XGBoost classifier — direction (UP/DOWN)
2. LightGBM classifier — direction (UP/DOWN)  
3. XGBoost regressor — expected return (for confidence)

Final signal = weighted average of predictions.
Walk-forward training prevents future data leakage.
"""

import xgboost as xgb
import lightgbm as lgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import accuracy_score, classification_report
import numpy as np
import pandas as pd
import joblib
import os
import json
from datetime import datetime


MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')


class TradingMLEnsemble:
    """
    3-model ensemble for robust trading predictions.
    
    Training: Walk-forward with TimeSeriesSplit (no future leaking).
    Inference: ~5ms total for all 3 models.
    """
    
    def __init__(self, use_gpu=False):
        tree_method = 'gpu_hist' if use_gpu else 'hist'
        device = 'gpu' if use_gpu else 'cpu'
        
        self.xgb_clf = xgb.XGBClassifier(
            n_estimators=300,
            max_depth=5,           # was 6 → less overfitting
            learning_rate=0.03,    # was 0.05 → slower, more generalizable
            subsample=0.75,        # was 0.8
            colsample_bytree=0.7,  # was 0.8 → more feature dropout
            min_child_weight=10,   # was 5 → require more samples per leaf
            reg_alpha=0.3,         # was 0.1 → more L1 regularization
            reg_lambda=2.0,        # was 1.0 → more L2 regularization
            gamma=0.1,             # NEW: min loss reduction for split
            use_label_encoder=False,
            eval_metric='logloss',
            tree_method=tree_method,
            random_state=42,
        )
        
        self.lgb_clf = lgb.LGBMClassifier(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.03,
            subsample=0.75,
            colsample_bytree=0.7,
            min_child_weight=10,
            reg_alpha=0.3,
            reg_lambda=2.0,
            min_split_gain=0.1,    # NEW: min gain for split
            device=device,
            verbose=-1,
            random_state=42,
        )
        
        self.xgb_reg = xgb.XGBRegressor(
            n_estimators=200,
            max_depth=4,           # was 5
            learning_rate=0.03,
            subsample=0.75,
            colsample_bytree=0.7,
            min_child_weight=10,
            gamma=0.1,
            tree_method=tree_method,
            random_state=42,
        )
        
        self.trained = False
        self.feature_importance = {}
        self.feature_names = []
        self.training_metrics = {}
    
    def train(self, X, y_direction, y_return):
        """
        Walk-forward training with TimeSeriesSplit.
        
        Args:
            X: Features DataFrame (N samples × M features)
            y_direction: 1 (UP), 0 (DOWN), -1 (NEUTRAL, filtered out)
            y_return: Actual future returns
            
        Returns:
            dict with training metrics
        """
        # Filter out NEUTRAL labels
        mask = y_direction != -1
        X_filt = X[mask].copy()
        y_dir_filt = y_direction[mask].copy()
        y_ret_filt = y_return[mask].copy()
        
        if len(X_filt) < 100:
            return {'error': f'Too few samples: {len(X_filt)} (need 100+)'}
        
        print(f"  📊 Training data: {len(X_filt)} samples ({sum(y_dir_filt==1)} UP, {sum(y_dir_filt==0)} DOWN)")
        print(f"     Filtered {sum(mask==False)} NEUTRAL samples")
        
        self.feature_names = list(X.columns)
        
        # Walk-forward cross-validation
        tscv = TimeSeriesSplit(n_splits=5)
        cv_scores = []
        
        for fold, (train_idx, val_idx) in enumerate(tscv.split(X_filt)):
            X_train, X_val = X_filt.iloc[train_idx], X_filt.iloc[val_idx]
            y_train, y_val = y_dir_filt[train_idx], y_dir_filt[val_idx]
            
            # Quick evaluation on each fold
            self.xgb_clf.fit(X_train, y_train)
            score = self.xgb_clf.score(X_val, y_val)
            cv_scores.append(score)
        
        print(f"  📈 Walk-forward CV scores: {[f'{s:.3f}' for s in cv_scores]}")
        print(f"     Mean accuracy: {np.mean(cv_scores):.3f} ± {np.std(cv_scores):.3f}")
        
        # Final training on ALL data
        print("  🔧 Training final models on full dataset...")
        self.xgb_clf.fit(X_filt, y_dir_filt)
        self.lgb_clf.fit(X_filt, y_dir_filt)
        self.xgb_reg.fit(X_filt, y_ret_filt)
        
        # Feature importance (average of XGB + LGB)
        xgb_imp = self.xgb_clf.feature_importances_
        lgb_imp = self.lgb_clf.feature_importances_
        avg_imp = (xgb_imp + lgb_imp) / 2
        self.feature_importance = dict(zip(self.feature_names, avg_imp.tolist()))
        
        # Training metrics
        y_pred = self.xgb_clf.predict(X_filt)
        train_acc = accuracy_score(y_dir_filt, y_pred)
        
        self.training_metrics = {
            'samples': len(X_filt),
            'features': len(self.feature_names),
            'cv_mean_accuracy': float(np.mean(cv_scores)),
            'cv_std': float(np.std(cv_scores)),
            'train_accuracy': float(train_acc),
            'up_ratio': float(sum(y_dir_filt == 1) / len(y_dir_filt)),
            'trained_at': datetime.now().isoformat(),
        }
        
        self.trained = True
        return self.training_metrics
    
    def predict(self, features):
        """
        Predict direction and confidence.
        
        Args:
            features: dict of feature_name → value
            
        Returns:
            dict with direction, confidence, expected_return, feature_importance
        """
        if not self.trained:
            return {
                'direction': 'NEUTRAL',
                'confidence': 0.33,
                'expected_return': 0,
                'feature_importance': {},
            }
        
        # Build feature vector in correct order
        X = np.array([[features.get(name, 0) for name in self.feature_names]])
        
        # Handle NaN/Inf
        X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
        
        xgb_proba = self.xgb_clf.predict_proba(X)[0]  # [P(DOWN), P(UP)]
        
        # Handle both LGBMClassifier and Booster
        if hasattr(self.lgb_clf, 'predict_proba'):
            lgb_proba = self.lgb_clf.predict_proba(X)[0]
        else:
            # Raw Booster: predict returns raw scores
            raw = self.lgb_clf.predict(X)[0]
            lgb_proba = np.array([1 - raw, raw])  # [P(DOWN), P(UP)]
        
        xgb_return = self.xgb_reg.predict(X)[0]
        
        # Ensemble average
        avg_proba = (xgb_proba + lgb_proba) / 2
        
        # Direction with adaptive confidence threshold
        # Model prob distribution: mean=0.61, std=0.08, range 0.50-0.87
        # Threshold 0.56 → ~69% of signals pass (good selectivity)
        if avg_proba[1] > 0.56:  # UP
            direction = 'UP'
            confidence = float(avg_proba[1])
        elif avg_proba[0] > 0.56:  # DOWN
            direction = 'DOWN'
            confidence = float(avg_proba[0])
        else:
            direction = 'NEUTRAL'
            confidence = float(max(avg_proba))
        
        # Confidence scaling: penalize if XGB and LGB disagree
        model_agreement = 1.0 - abs(float(xgb_proba[1]) - float(lgb_proba[1]))
        if model_agreement < 0.7:
            confidence *= 0.85  # 15% penalty for model disagreement
            # If agreement is very low, demote to NEUTRAL
            if model_agreement < 0.5:
                direction = 'NEUTRAL'
        
        # Top 10 features by importance
        top_features = dict(sorted(
            self.feature_importance.items(),
            key=lambda x: -x[1]
        )[:10])
        
        return {
            'direction': direction,
            'confidence': confidence,
            'expected_return': float(xgb_return),
            'xgb_proba': xgb_proba.tolist(),
            'lgb_proba': lgb_proba.tolist(),
            'feature_importance': {k: float(v) for k, v in top_features.items()},
        }
    
    def save(self, prefix='trading_model'):
        """Save all 3 models to disk."""
        os.makedirs(MODEL_DIR, exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        xgb_path = os.path.join(MODEL_DIR, f'{prefix}_xgb_clf_{timestamp}.json')
        lgb_path = os.path.join(MODEL_DIR, f'{prefix}_lgb_clf_{timestamp}.pkl')
        reg_path = os.path.join(MODEL_DIR, f'{prefix}_xgb_reg_{timestamp}.json')
        meta_path = os.path.join(MODEL_DIR, f'{prefix}_meta_{timestamp}.json')
        
        self.xgb_clf.save_model(xgb_path)
        joblib.dump(self.lgb_clf, lgb_path)  # Save full classifier (not just booster)
        self.xgb_reg.save_model(reg_path)
        
        meta = {
            'feature_names': self.feature_names,
            'feature_importance': self.feature_importance,
            'training_metrics': self.training_metrics,
            'timestamp': timestamp,
        }
        with open(meta_path, 'w') as f:
            json.dump(meta, f, indent=2)
        
        # Also save latest paths
        latest_path = os.path.join(MODEL_DIR, 'latest.json')
        with open(latest_path, 'w') as f:
            json.dump({
                'xgb_clf': xgb_path,
                'lgb_clf': lgb_path,
                'xgb_reg': reg_path,
                'meta': meta_path,
                'timestamp': timestamp,
            }, f, indent=2)
        
        print(f"  💾 Models saved: {MODEL_DIR}/{prefix}_*_{timestamp}.*")
        return meta_path
    
    def load(self, prefix='trading_model'):
        """Load latest saved models."""
        latest_path = os.path.join(MODEL_DIR, 'latest.json')
        if not os.path.exists(latest_path):
            print("  ❌ No saved models found")
            return False
        
        with open(latest_path) as f:
            paths = json.load(f)
        
        self.xgb_clf.load_model(paths['xgb_clf'])
        self.lgb_clf = joblib.load(paths['lgb_clf'])  # Load full classifier
        self.xgb_reg.load_model(paths['xgb_reg'])
        
        with open(paths['meta']) as f:
            meta = json.load(f)
        
        self.feature_names = meta['feature_names']
        self.feature_importance = meta['feature_importance']
        self.training_metrics = meta['training_metrics']
        self.trained = True
        
        print(f"  ✅ Models loaded (trained at {meta['timestamp']})")
        return True
