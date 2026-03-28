"""
P#200e: State Persistence — Save/Load bot state between restarts.

Persists NeuronAI state, ContinualLearningAgent summary, and XGBoost model
to JSON/binary files in the state/ directory.

File layout:
    state/{symbol}_{timeframe}_neuron.json   — NeuronAI defense/risk/evolution
    state/{symbol}_{timeframe}_learner.json  — ContinualLearningAgent windows
"""

import json
import os
from datetime import datetime

STATE_DIR = os.path.join(os.path.dirname(__file__), '..', 'state')


def _ensure_dir():
    os.makedirs(STATE_DIR, exist_ok=True)


def _safe_path(symbol, timeframe, suffix):
    """Build sanitized state file path."""
    # Prevent path traversal
    safe_sym = ''.join(c for c in symbol if c.isalnum())
    safe_tf = ''.join(c for c in timeframe if c.isalnum())
    return os.path.join(STATE_DIR, f'{safe_sym}_{safe_tf}_{suffix}.json')


# ============================================================================
# NeuronAI State
# ============================================================================

def save_neuron_state(symbol, timeframe, neuron):
    """Save NeuronAI state to JSON for persistence across restarts."""
    _ensure_dir()
    state = {
        'saved_at': datetime.utcnow().isoformat(),
        'version': '200e',
        'defense_mode': neuron.defense_mode,
        'defense_mode_start': neuron.defense_mode_start,
        'consecutive_losses': neuron.consecutive_losses,
        'loss_streak_max': neuron.loss_streak_max,
        'win_count': neuron.win_count,
        'loss_count': neuron.loss_count,
        'recent_pnls': list(neuron.recent_pnls[-50:]),
        'risk_multiplier': neuron.risk_multiplier,
        'confidence_threshold': neuron.confidence_threshold,
        'aggression_level': neuron.aggression_level,
        'evolution_count': neuron.evolution_count,
        'total_decisions': neuron.total_decisions,
        'override_count': neuron.override_count,
        'hold_count': neuron.hold_count,
    }
    path = _safe_path(symbol, timeframe, 'neuron')
    with open(path, 'w') as f:
        json.dump(state, f, indent=2)
    return path


def load_neuron_state(symbol, timeframe, neuron):
    """
    Load NeuronAI state from JSON. Returns True if loaded successfully.
    On failure, neuron keeps default fresh state (graceful fallback).
    """
    path = _safe_path(symbol, timeframe, 'neuron')
    if not os.path.exists(path):
        return False
    try:
        with open(path) as f:
            state = json.load(f)
        neuron.defense_mode = state.get('defense_mode', False)
        neuron.defense_mode_start = state.get('defense_mode_start', 0)
        neuron.consecutive_losses = state.get('consecutive_losses', 0)
        neuron.loss_streak_max = state.get('loss_streak_max', 0)
        neuron.win_count = state.get('win_count', 0)
        neuron.loss_count = state.get('loss_count', 0)
        neuron.recent_pnls = state.get('recent_pnls', [])
        neuron.risk_multiplier = state.get('risk_multiplier', 1.0)
        neuron.confidence_threshold = state.get('confidence_threshold', 0.35)
        neuron.aggression_level = state.get('aggression_level', 1.0)
        neuron.evolution_count = state.get('evolution_count', 0)
        neuron.total_decisions = state.get('total_decisions', 0)
        neuron.override_count = state.get('override_count', 0)
        neuron.hold_count = state.get('hold_count', 0)
        return True
    except Exception as e:
        print(f"  ⚠️ Failed to load neuron state: {e}")
        return False


# ============================================================================
# ContinualLearningAgent State
# ============================================================================

def save_learner_state(symbol, timeframe, learner):
    """Save ContinualLearningAgent state to JSON."""
    _ensure_dir()
    state = {
        'saved_at': datetime.utcnow().isoformat(),
        'version': '200e',
        'summary': learner.summary(),
        'deactivated': list(learner.get_deactivated_strategies()),
        'confidence_ema': dict(learner._confidence_ema),
    }
    # Persist individual window data for restoration
    windows = {}
    for key, perf in learner._strategy_perf.items():
        windows[f'strategy:{key}'] = {
            'pnls': list(perf.pnls),
            'outcomes': list(perf.outcomes),
        }
    for key, perf in learner._pair_perf.items():
        windows[f'pair:{key}'] = {
            'pnls': list(perf.pnls),
            'outcomes': list(perf.outcomes),
        }
    for key, perf in learner._regime_perf.items():
        windows[f'regime:{key}'] = {
            'pnls': list(perf.pnls),
            'outcomes': list(perf.outcomes),
        }
    for key, perf in learner._combo_perf.items():
        windows[f'combo:{key}'] = {
            'pnls': list(perf.pnls),
            'outcomes': list(perf.outcomes),
        }
    state['windows'] = windows
    
    path = _safe_path(symbol, timeframe, 'learner')
    with open(path, 'w') as f:
        json.dump(state, f, indent=2)
    return path


def load_learner_state(symbol, timeframe, learner):
    """
    Load ContinualLearningAgent state from JSON.
    Restores rolling performance windows and deactivation state.
    """
    path = _safe_path(symbol, timeframe, 'learner')
    if not os.path.exists(path):
        return False
    try:
        with open(path) as f:
            state = json.load(f)
        
        # Restore confidence EMA
        learner._confidence_ema = state.get('confidence_ema', {})
        
        # Restore deactivated strategies
        learner._deactivated = set(state.get('deactivated', []))
        
        # Restore performance windows
        from .continual_learning import PerformanceWindow
        windows = state.get('windows', {})
        for key, data in windows.items():
            scope, name = key.split(':', 1)
            perf = PerformanceWindow(max_size=learner.window_size)
            for pnl in data.get('pnls', []):
                perf.pnls.append(pnl)
            for outcome in data.get('outcomes', []):
                perf.outcomes.append(outcome)
            
            if scope == 'strategy':
                learner._strategy_perf[name] = perf
            elif scope == 'pair':
                learner._pair_perf[name] = perf
            elif scope == 'regime':
                learner._regime_perf[name] = perf
            elif scope == 'combo':
                learner._combo_perf[name] = perf
        
        return True
    except Exception as e:
        print(f"  ⚠️ Failed to load learner state: {e}")
        return False
