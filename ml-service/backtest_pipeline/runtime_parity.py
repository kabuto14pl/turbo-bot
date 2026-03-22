"""Compatibility wrapper for runtime-parity evaluation.

The shared decision logic now lives in decision_core.py. This module keeps the
older output shape used by existing tests and tooling while delegating all
substantive behavior to the extracted runtime consensus core.
"""

import json
import os
import sys


if __package__ in (None, ''):
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from backtest_pipeline.decision_core import evaluate_runtime_snapshot as evaluate_decision_core_snapshot
    from backtest_pipeline.decision_core import apply_runtime_risk_check as apply_decision_core_risk_check
    from backtest_pipeline.decision_core import normalize_mtf_bias, validate_runtime_prime_gate
else:
    from .decision_core import evaluate_runtime_snapshot as evaluate_decision_core_snapshot
    from .decision_core import apply_runtime_risk_check as apply_decision_core_risk_check
    from .decision_core import normalize_mtf_bias, validate_runtime_prime_gate


GATE_PROFILE_RUNTIME_PARITY = 'runtime_parity'
GATE_PROFILE_FULL_PIPELINE = 'full_pipeline'


def apply_runtime_risk_check(action, confidence, drawdown):
    return apply_decision_core_risk_check(action, confidence, drawdown)


def validate_prime_gate(snapshot):
    consensus = dict(snapshot.get('consensus') or {})
    portfolio = dict(snapshot.get('portfolio') or {})
    drawdown = float(portfolio.get('drawdownPct', portfolio.get('drawdown', 0.0)) or 0.0)
    mtf_bias = normalize_mtf_bias(snapshot.get('regime'), snapshot.get('mtf_bias'))
    return validate_runtime_prime_gate(
        consensus=consensus,
        drawdown=drawdown,
        mtf_bias=mtf_bias,
        last_decision=snapshot.get('last_decision'),
        last_trade_candle_gap=snapshot.get('last_trade_candle_gap', 999),
    )


def make_neuron_decision(snapshot):
    consensus = dict(snapshot.get('consensus') or {})
    if consensus:
        return {
            'action': consensus.get('action', 'HOLD'),
            'confidence': float(consensus.get('confidence', 0.0) or 0.0),
            'reason': 'Legacy runtime parity consensus snapshot',
        }

    result = evaluate_decision_core_snapshot(snapshot)
    candidate = dict(result.get('candidate') or {})
    return {
        'action': candidate.get('action', 'HOLD'),
        'confidence': float(candidate.get('confidence', 0.0) or 0.0),
        'reason': result.get('reason', 'No runtime consensus'),
    }


def evaluate_runtime_snapshot(snapshot):
    if snapshot.get('signals'):
        result = evaluate_decision_core_snapshot(snapshot)
        candidate = dict(result.get('candidate') or {})
        prime = dict(result.get('prime') or {})
        risk = dict(result.get('risk') or {})

        return {
            'prime': {
                'approved': bool(prime.get('approved', False)),
                'reason': prime.get('reason', result.get('reason', 'No runtime consensus')),
                'confidence': float(prime.get('confidence', candidate.get('confidence', 0.0)) or 0.0),
            },
            'decision': {
                'action': candidate.get('action', 'HOLD'),
                'confidence': float(candidate.get('confidence', 0.0) or 0.0),
                'reason': result.get('reason', 'No runtime consensus'),
            },
            'risk': {
                'approved': bool(risk.get('approved', result.get('final_action') != 'HOLD')),
                'reason': risk.get('reason', result.get('reason', 'No runtime consensus')),
                'confidence': float(risk.get('confidence', result.get('final_confidence', 0.0)) or 0.0),
            },
            'final_action': result.get('final_action', 'HOLD'),
            'final_confidence': float(result.get('final_confidence', 0.0) or 0.0),
            'candidate': candidate,
            'reason': result.get('reason', ''),
        }

    decision = make_neuron_decision(snapshot)
    prime = validate_prime_gate(snapshot)
    portfolio = dict(snapshot.get('portfolio') or {})
    drawdown = float(portfolio.get('drawdownPct', portfolio.get('drawdown', 0.0)) or 0.0)
    risk = apply_runtime_risk_check(decision['action'], decision['confidence'], drawdown)
    final_action = decision['action'] if prime['approved'] and risk['approved'] else 'HOLD'
    final_confidence = float(risk['confidence'] if prime['approved'] else decision['confidence'])

    return {
        'prime': prime,
        'decision': decision,
        'risk': risk,
        'final_action': final_action,
        'final_confidence': final_confidence,
        'candidate': dict(snapshot.get('consensus') or {}),
        'reason': prime.get('reason') if not prime.get('approved') else risk.get('reason'),
    }


def main():
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python3 runtime_parity.py <snapshot.json>')

    with open(sys.argv[1], 'r', encoding='utf-8') as handle:
        snapshot = json.load(handle)

    result = evaluate_runtime_snapshot(snapshot)
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == '__main__':
    main()