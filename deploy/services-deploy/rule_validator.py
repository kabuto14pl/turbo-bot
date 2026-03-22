"""
📏 TURBO-BOT — Rule-Based Validator

Simple deterministic validator that works alongside (or instead of) Ollama.
Always available — no GPU/model dependency.

Rules:
1. Expected return must cover 2× fees (0.4% minimum edge)
2. Volatility ratio > 3 → too choppy → reject
3. Confidence below floor (0.35) → reject
4. ADX < 15 in trend trade → reject (no trend)
5. Regime mismatch → reduce confidence

Usage:
    from rule_validator import RuleValidator
    validator = RuleValidator()
    result = validator.validate(prediction, features, regime)
"""

import logging

logger = logging.getLogger(__name__)


class RuleValidator:
    """
    Deterministic rule-based signal validator.
    Provides baseline validation when Ollama is offline.
    Fast (<1ms), stateless, predictable.
    """

    def __init__(self, config=None):
        config = config or {}
        self.min_edge = config.get('min_edge', 0.004)        # 2× fees (0.2% round-trip)
        self.max_vol_ratio = config.get('max_vol_ratio', 3.0) # Reject choppy markets
        self.confidence_floor = config.get('confidence_floor', 0.35)
        self.min_adx_trend = config.get('min_adx_trend', 15)   # Min ADX for trend trades
        self.stats = {
            'validations': 0,
            'passed': 0,
            'rejected': 0,
            'reasons': {},
        }

    def validate(self, prediction, features, regime='UNKNOWN'):
        """
        Validate ML prediction against deterministic rules.

        Args:
            prediction: dict with 'direction', 'confidence', 'expected_return'
            features: dict of extracted features
            regime: current market regime string

        Returns:
            dict with:
                'valid': bool — signal passes rules
                'confidence_adj': float — adjusted confidence
                'rejections': list[str] — reasons for rejection
                'notes': list[str] — warnings (non-blocking)
        """
        self.stats['validations'] += 1
        rejections = []
        notes = []
        conf_mult = 1.0

        direction = prediction.get('direction', 'NEUTRAL')
        confidence = prediction.get('confidence', 0)
        expected_ret = abs(prediction.get('expected_return', 0))

        # === RULE 1: Edge must cover 2× fees ===
        if expected_ret < self.min_edge:
            rejections.append(f"Low edge: {expected_ret:.4f} < {self.min_edge} (2×fees)")

        # === RULE 2: Volatility ratio check ===
        vol_ratio = features.get('vol_ratio_5_20', features.get('volume_ratio', 1.0))
        if vol_ratio > self.max_vol_ratio:
            rejections.append(f"Choppy market: vol_ratio={vol_ratio:.2f} > {self.max_vol_ratio}")

        # === RULE 3: Confidence floor ===
        if confidence < self.confidence_floor:
            rejections.append(f"Low confidence: {confidence:.3f} < {self.confidence_floor}")

        # === RULE 4: ADX check for trend trades ===
        adx = features.get('adx', features.get('adx_14', 25))
        if direction in ('UP', 'DOWN') and adx < self.min_adx_trend:
            rejections.append(f"Weak trend: ADX={adx:.1f} < {self.min_adx_trend}")

        # === RULE 5: Regime mismatch warning ===
        if regime == 'RANGING' and direction != 'NEUTRAL':
            conf_mult *= 0.8
            notes.append(f"Ranging regime — confidence reduced 20%")
        elif regime == 'HIGH_VOLATILITY':
            conf_mult *= 0.9
            notes.append(f"High volatility regime — confidence reduced 10%")

        # === RULE 6: RSI extreme check ===
        rsi = features.get('rsi_14', features.get('rsi', 50))
        if direction == 'UP' and rsi > 80:
            rejections.append(f"RSI overbought: {rsi:.1f} > 80 (buying into top)")
        elif direction == 'DOWN' and rsi < 20:
            rejections.append(f"RSI oversold: {rsi:.1f} < 20 (selling into bottom)")

        # Result
        adjusted_confidence = confidence * conf_mult
        is_valid = len(rejections) == 0

        if is_valid:
            self.stats['passed'] += 1
        else:
            self.stats['rejected'] += 1
            for r in rejections:
                reason_key = r.split(':')[0]
                self.stats['reasons'][reason_key] = self.stats['reasons'].get(reason_key, 0) + 1

        result = {
            'valid': is_valid,
            'confidence_adj': round(adjusted_confidence, 4),
            'rejections': rejections,
            'notes': notes,
            'rules_checked': 6,
        }

        if not is_valid:
            logger.info(f"📏 RuleValidator REJECT: {rejections}")

        return result

    def get_stats(self):
        """Return validation statistics."""
        total = self.stats['validations']
        return {
            'total_validations': total,
            'passed': self.stats['passed'],
            'rejected': self.stats['rejected'],
            'reject_rate': round(self.stats['rejected'] / total, 3) if total > 0 else 0,
            'top_reasons': dict(sorted(
                self.stats['reasons'].items(), key=lambda x: -x[1]
            )[:5]),
        }
