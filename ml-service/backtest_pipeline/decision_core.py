"""Runtime consensus decision core shared by live-parity validation and backtest parity mode."""

import json
import os
import sys

if __package__ in (None, ''):
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from backtest_pipeline.structural_gate import evaluate_structural_gate
else:
    from .structural_gate import evaluate_structural_gate


RUNTIME_STATIC_WEIGHTS = {
    'AdvancedAdaptive': 0.20,
    'RSITurbo': 0.14,
    'SuperTrend': 0.17,
    'MACrossover': 0.22,
    'MomentumPro': 0.10,
    'NeuralAI': 0.10,
    'PythonML': 0.07,
    'BollingerMR': 0.0,
}

RUNTIME_THRESHOLD_NORMAL = 0.30
RUNTIME_THRESHOLD_CONFLICT = 0.35
RUNTIME_THRESHOLD_STRONG = 0.25
RUNTIME_CONFLICT_FLOOR = 0.25
RUNTIME_STRONG_SIGNAL_CONFIDENCE = 0.80
RUNTIME_STRONG_AGREEMENT_COUNT = 3
RUNTIME_CONFIDENCE_CLAMP_MIN = 0.20
RUNTIME_CONFIDENCE_CLAMP_MAX = 0.95
RUNTIME_CONFIDENCE_FLOOR = 0.35
RUNTIME_BUY_CONFIDENCE_FLOOR = 0.30
RUNTIME_BUY_DRAWDOWN_BLOCK = 0.20
RUNTIME_BUY_SIZING_REDUCTION_START = 0.10
RUNTIME_BUY_SIZING_REDUCTION_END = 0.20
RUNTIME_MINIMUM_BUY_SIZING_FACTOR = 0.30
RUNTIME_COUNTER_TREND_SCORE = 20
RUNTIME_TREND_SCORE = 25
RUNTIME_DEFENSE_BUY_CONF_MULT = 0.65
RUNTIME_DEFENSE_BUY_CONF_CAP = 0.55


def _clamp_confidence(value, min_value=RUNTIME_CONFIDENCE_CLAMP_MIN, max_value=RUNTIME_CONFIDENCE_CLAMP_MAX):
    return max(min_value, min(max_value, float(value or 0)))


def normalize_mtf_bias(regime=None, mtf_bias=None):
    current = dict(mtf_bias or {})
    if current:
        current.setdefault('direction', 'NEUTRAL')
        current.setdefault('score', 0)
        current.setdefault('confidenceMultiplier', 1.15 if abs(float(current['score'])) >= 20 else 1.0)
        return current

    regime = str(regime or 'UNKNOWN').upper()
    if regime == 'TRENDING_UP':
        return {'direction': 'BULLISH', 'score': RUNTIME_TREND_SCORE, 'confidenceMultiplier': 1.15}
    if regime == 'TRENDING_DOWN':
        return {'direction': 'BEARISH', 'score': -RUNTIME_TREND_SCORE, 'confidenceMultiplier': 1.15}
    return {'direction': 'NEUTRAL', 'score': 0, 'confidenceMultiplier': 1.0}


def _extract_ml_signal(signals, ml_signal=None):
    if ml_signal and ml_signal.get('action'):
        return dict(ml_signal)

    for name in ('PythonML', 'EnterpriseML'):
        signal = (signals or {}).get(name)
        if signal and signal.get('action'):
            return dict(signal)

    return {'action': 'HOLD', 'confidence': 0.0, 'source': 'NONE'}


def vote_runtime_signals(signals, regime=None, mtf_bias=None, ml_signal=None):
    signal_map = dict(signals or {})
    resolved_ml_signal = _extract_ml_signal(signal_map, ml_signal)
    if resolved_ml_signal.get('action') not in (None, 'HOLD') and 'PythonML' not in signal_map:
        signal_map['PythonML'] = resolved_ml_signal

    if not signal_map:
        return {
            'consensus': None,
            'votes': {'BUY': 0.0, 'SELL': 0.0, 'HOLD': 0.0},
            'counts': {'BUY': 0, 'SELL': 0, 'HOLD': 0},
            'reason': 'No signals available',
            'threshold': RUNTIME_THRESHOLD_NORMAL,
        }

    current_mtf_bias = normalize_mtf_bias(regime=regime, mtf_bias=mtf_bias)
    votes = {'BUY': 0.0, 'SELL': 0.0, 'HOLD': 0.0}
    counts = {'BUY': 0, 'SELL': 0, 'HOLD': 0}
    weighted_confidence = 0.0

    for name, signal in signal_map.items():
        action = signal.get('action', 'HOLD')
        confidence = max(0.0, min(1.0, float(signal.get('confidence') or 0.0)))
        weight = float(RUNTIME_STATIC_WEIGHTS.get(name, 0.0))
        votes[action] = votes.get(action, 0.0) + weight
        counts[action] = counts.get(action, 0) + 1
        weighted_confidence += confidence * weight

    max_vote = max(votes['BUY'], votes['SELL'], votes['HOLD'])
    action = 'BUY' if max_vote == votes['BUY'] else 'SELL' if max_vote == votes['SELL'] else 'HOLD'
    has_conflict = votes['BUY'] > RUNTIME_CONFLICT_FLOOR and votes['SELL'] > RUNTIME_CONFLICT_FLOOR
    ml_confidence = float(resolved_ml_signal.get('confidence') or 0.0)
    ml_action = resolved_ml_signal.get('action', 'HOLD')
    sources_agree = counts.get(action, 0)

    if action != 'HOLD':
        mtf_direction = current_mtf_bias.get('direction', 'NEUTRAL')
        aligned = (action == 'BUY' and mtf_direction == 'BULLISH') or (action == 'SELL' and mtf_direction == 'BEARISH')
        counter = (action == 'BUY' and mtf_direction == 'BEARISH') or (action == 'SELL' and mtf_direction == 'BULLISH')
        if counter:
            weighted_confidence *= 0.55
        elif aligned:
            weighted_confidence *= float(current_mtf_bias.get('confidenceMultiplier') or 1.0)

    if has_conflict:
        threshold = RUNTIME_THRESHOLD_CONFLICT
    elif sources_agree >= RUNTIME_STRONG_AGREEMENT_COUNT and ml_confidence > RUNTIME_STRONG_SIGNAL_CONFIDENCE and ml_action == action:
        threshold = RUNTIME_THRESHOLD_STRONG
    else:
        threshold = RUNTIME_THRESHOLD_NORMAL

    if max_vote < threshold:
        mtf_score = abs(float(current_mtf_bias.get('score') or 0.0))
        if mtf_score >= RUNTIME_COUNTER_TREND_SCORE:
            mtf_action = 'BUY' if current_mtf_bias.get('direction') == 'BULLISH' else 'SELL'
            mtf_vote = votes.get(mtf_action, 0.0)
            opposite_action = 'SELL' if mtf_action == 'BUY' else 'BUY'
            opposite_vote = votes.get(opposite_action, 0.0)
            if mtf_vote >= 0.15 and mtf_vote >= opposite_vote * 0.7:
                action = mtf_action
                weighted_confidence = max(mtf_vote, RUNTIME_THRESHOLD_NORMAL) * float(current_mtf_bias.get('confidenceMultiplier') or 1.0) * 0.85
            else:
                return {
                    'consensus': None,
                    'votes': votes,
                    'counts': counts,
                    'reason': 'No runtime consensus after MTF override check',
                    'threshold': threshold,
                }
        else:
            return {
                'consensus': None,
                'votes': votes,
                'counts': counts,
                'reason': 'No runtime consensus',
                'threshold': threshold,
            }

    final_confidence = _clamp_confidence(weighted_confidence)
    return {
        'consensus': {
            'action': action,
            'confidence': final_confidence,
            'votes': votes,
            'counts': counts,
            'threshold': threshold,
        },
        'votes': votes,
        'counts': counts,
        'reason': 'Consensus approved',
        'threshold': threshold,
    }


def apply_defense_mode_sizing(consensus, neural_state=None):
    if not consensus:
        return None

    current = dict(consensus)
    state = dict(neural_state or {})
    if not state.get('defense_mode') or current.get('action') != 'BUY':
        return current

    current['confidence'] = min(
        float(current.get('confidence') or 0.0) * RUNTIME_DEFENSE_BUY_CONF_MULT,
        RUNTIME_DEFENSE_BUY_CONF_CAP,
    )
    return current


def apply_structural_gate(consensus, history=None):
    if not consensus:
        return None, None

    current = dict(consensus)
    structural_gate = evaluate_structural_gate(current.get('action', 'HOLD'), history)
    if not structural_gate.get('pass', True):
        return None, structural_gate

    current['confidence'] = _clamp_confidence(float(current.get('confidence') or 0.0) * float(structural_gate.get('confidence_adj', 1.0)))
    current['structural_gate'] = structural_gate
    return current, structural_gate


def validate_runtime_prime_gate(consensus, drawdown, mtf_bias=None, last_decision=None, last_trade_candle_gap=999):
    current = dict(consensus or {})
    action = current.get('action', 'HOLD')
    confidence = float(current.get('confidence') or 0.0)
    current_mtf_bias = normalize_mtf_bias(mtf_bias=mtf_bias)
    mtf_direction = current_mtf_bias.get('direction', 'NEUTRAL')
    mtf_score = abs(float(current_mtf_bias.get('score') or 0.0))
    previous = dict(last_decision or {})

    if drawdown > 0.15 and action not in ('SELL', 'HOLD'):
        return {'approved': False, 'reason': f'Drawdown {drawdown * 100:.1f}% > 15%', 'confidence': confidence}

    if (
        previous.get('action') == action and
        float(previous.get('confidence') or 0.0) > 0.4 and
        int(last_trade_candle_gap or 999) < 12 and
        confidence <= float(previous.get('confidence') or 0.0)
    ):
        return {'approved': False, 'reason': f'LLM already executed {action} recently', 'confidence': confidence}

    if mtf_direction == 'BEARISH' and action == 'BUY' and mtf_score >= RUNTIME_COUNTER_TREND_SCORE:
        return {'approved': False, 'reason': f'Counter-trend: BUY vs BEARISH MTF score={mtf_score:.0f}', 'confidence': confidence}

    if mtf_direction == 'BULLISH' and action == 'SELL' and mtf_score >= RUNTIME_COUNTER_TREND_SCORE:
        return {'approved': False, 'reason': f'Counter-trend: SELL vs BULLISH MTF score={mtf_score:.0f}', 'confidence': confidence}

    return {'approved': True, 'reason': 'PRIME Gate APPROVED (runtime consensus core)', 'confidence': confidence}


def apply_runtime_risk_check(action, confidence, drawdown):
    adjusted_confidence = float(confidence or 0.0)
    required_floor = RUNTIME_BUY_CONFIDENCE_FLOOR if action == 'BUY' else RUNTIME_CONFIDENCE_FLOOR

    if drawdown > RUNTIME_BUY_DRAWDOWN_BLOCK and action == 'BUY':
        return {'approved': False, 'confidence': adjusted_confidence, 'reason': 'BUY blocked by drawdown circuit breaker'}

    if adjusted_confidence < required_floor:
        return {'approved': False, 'confidence': adjusted_confidence, 'reason': 'Signal below runtime confidence floor'}

    if drawdown > RUNTIME_BUY_SIZING_REDUCTION_START and action == 'BUY':
        raw_reduction = 1 - ((drawdown - RUNTIME_BUY_SIZING_REDUCTION_START) / max(RUNTIME_BUY_SIZING_REDUCTION_END - RUNTIME_BUY_SIZING_REDUCTION_START, 1e-9))
        adjusted_confidence *= max(RUNTIME_MINIMUM_BUY_SIZING_FACTOR, raw_reduction)
        if adjusted_confidence < required_floor:
            return {
                'approved': False,
                'confidence': adjusted_confidence,
                'reason': 'Signal fell below runtime floor after drawdown sizing reduction',
            }

    return {'approved': True, 'confidence': adjusted_confidence, 'reason': 'Runtime risk check approved'}


def evaluate_runtime_consensus_path(signals, regime, drawdown=0.0, neural_state=None, ml_signal=None, last_decision=None, last_trade_candle_gap=999, mtf_bias=None, history=None):
    vote_result = vote_runtime_signals(signals, regime=regime, mtf_bias=mtf_bias, ml_signal=ml_signal)
    consensus = vote_result.get('consensus')
    if not consensus:
        return {
            'candidate': None,
            'prime': None,
            'risk': None,
            'structural_gate': None,
            'final_action': 'HOLD',
            'final_confidence': 0.0,
            'reason': vote_result.get('reason', 'No runtime consensus'),
            'votes': vote_result.get('votes'),
            'counts': vote_result.get('counts'),
        }

    consensus = apply_defense_mode_sizing(consensus, neural_state=neural_state)
    consensus, structural_gate = apply_structural_gate(consensus, history=history)
    if not consensus:
        return {
            'candidate': None,
            'prime': None,
            'risk': None,
            'structural_gate': structural_gate,
            'final_action': 'HOLD',
            'final_confidence': 0.0,
            'reason': 'structural_gate_blocked',
            'votes': vote_result.get('votes'),
            'counts': vote_result.get('counts'),
        }

    current_mtf_bias = normalize_mtf_bias(regime=regime, mtf_bias=mtf_bias)
    prime = validate_runtime_prime_gate(
        consensus,
        drawdown,
        mtf_bias=current_mtf_bias,
        last_decision=last_decision,
        last_trade_candle_gap=last_trade_candle_gap,
    )
    if not prime['approved']:
        return {
            'candidate': consensus,
            'prime': prime,
            'risk': None,
            'structural_gate': structural_gate,
            'final_action': 'HOLD',
            'final_confidence': 0.0,
            'reason': prime['reason'],
            'votes': vote_result.get('votes'),
            'counts': vote_result.get('counts'),
        }

    risk = apply_runtime_risk_check(consensus['action'], consensus['confidence'], drawdown)
    if not risk['approved']:
        return {
            'candidate': consensus,
            'prime': prime,
            'risk': risk,
            'structural_gate': structural_gate,
            'final_action': 'HOLD',
            'final_confidence': 0.0,
            'reason': risk['reason'],
            'votes': vote_result.get('votes'),
            'counts': vote_result.get('counts'),
        }

    final_confidence = float(risk['confidence'])
    return {
        'candidate': consensus,
        'prime': prime,
        'risk': risk,
        'structural_gate': structural_gate,
        'final_action': consensus['action'],
        'final_confidence': final_confidence,
        'reason': 'Runtime consensus path approved',
        'votes': vote_result.get('votes'),
        'counts': vote_result.get('counts'),
    }


def evaluate_runtime_snapshot(snapshot):
    portfolio = dict(snapshot.get('portfolio') or {})
    drawdown = float(portfolio.get('drawdownPct', portfolio.get('drawdown', 0.0)) or 0.0)
    return evaluate_runtime_consensus_path(
        signals=snapshot.get('signals') or {},
        regime=snapshot.get('regime'),
        drawdown=drawdown,
        neural_state=snapshot.get('neural_state') or {},
        ml_signal=snapshot.get('ml_signal'),
        last_decision=snapshot.get('last_decision'),
        last_trade_candle_gap=snapshot.get('last_trade_candle_gap', 999),
        mtf_bias=snapshot.get('mtf_bias'),
        history=snapshot.get('history'),
    )


def main():
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python3 decision_core.py <snapshot.json>')

    with open(sys.argv[1], 'r', encoding='utf-8') as handle:
        snapshot = json.load(handle)

    print(json.dumps(evaluate_runtime_snapshot(snapshot), indent=2, sort_keys=True))


if __name__ == '__main__':
    main()