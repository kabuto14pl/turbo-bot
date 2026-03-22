"""
TURBO-BOT Full Pipeline Backtest — LLM Override Validator
PATCH #58: Integrates Ollama (mistral:7b-instruct) into backtest pipeline.

Architecture:
  - Validates ML signals using LLM reasoning
  - Override decisions: LLM can VETO signals ML missed
  - Synchronous calls (no async in backtest)
  - Caches identical signal patterns for speed
  - Falls back to rule-based if Ollama unavailable
  
Flow:
  ML Signal → LLM Validate → {agree/disagree, confidence_adj, risk_flags}
  If disagree + high confidence → VETO (override ML)
  If disagree + low confidence → reduce confidence 20%
  If agree → boost confidence 5%
"""

import json
import time
import hashlib
import logging
from . import config

logger = logging.getLogger(__name__)

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False


class LLMOverrideValidator:
    """
    Ollama LLM signal validator for backtest pipeline.
    
    Validates trading signals with LLM reasoning.
    Can override (veto or boost) ML/ensemble decisions.
    """
    
    def __init__(self, model=None, base_url=None, timeout=None):
        self.model = model or getattr(config, 'LLM_MODEL', 'mistral:7b-instruct')
        self.base_url = base_url or getattr(config, 'LLM_OLLAMA_URL', 'http://localhost:11434')
        self.timeout = timeout or getattr(config, 'LLM_TIMEOUT_S', 5.0)
        self.enabled = getattr(config, 'LLM_ENABLED', False)
        
        self.is_available = False
        self._cache = {}
        self._cache_hits = 0
        self._max_cache = 500
        
        # Stats
        self.stats = {
            'calls': 0,
            'successes': 0,
            'failures': 0,
            'timeouts': 0,
            'agrees': 0,
            'disagrees': 0,
            'vetoes': 0,
            'boosts': 0,
            'avg_latency_ms': 0,
            'cache_hits': 0,
            'fallback_used': 0,
        }
    
    def check_availability(self):
        """Check if Ollama is running (synchronous)."""
        if not self.enabled or not HAS_HTTPX:
            return False
        
        try:
            with httpx.Client(timeout=2.0) as client:
                resp = client.get(f"{self.base_url}/api/tags")
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m.get('name', '') for m in data.get('models', [])]
                    self.is_available = any(self.model in m for m in models)
                    if self.is_available:
                        logger.info(f"✅ LLM available: {self.model}")
                    return self.is_available
        except Exception as e:
            logger.debug(f"LLM not available: {e}")
        
        self.is_available = False
        return False
    
    def validate_signal(self, ml_result, features, regime, has_position=False):
        """
        Validate ML signal using Ollama LLM.
        
        Args:
            ml_result: dict with action, confidence, expected_return
            features: dict of feature values
            regime: Current market regime
            has_position: Whether bot has open position
            
        Returns:
            dict: {agrees, confidence_adj, reasoning, risk_flag, override_action}
            or None if unavailable
        """
        if not self.enabled:
            return None
        
        # Check cache first
        cache_key = self._make_cache_key(ml_result, regime)
        if cache_key in self._cache:
            self._cache_hits += 1
            self.stats['cache_hits'] += 1
            return self._cache[cache_key]
        
        # Try Ollama
        if self.is_available and HAS_HTTPX:
            result = self._call_ollama(ml_result, features, regime, has_position)
            if result is not None:
                self._cache[cache_key] = result
                self._trim_cache()
                return result
        
        # Fallback to rule-based validation
        self.stats['fallback_used'] += 1
        result = self._rule_based_validate(ml_result, features, regime)
        self._cache[cache_key] = result
        self._trim_cache()
        return result
    
    def _call_ollama(self, ml_result, features, regime, has_position):
        """Make synchronous Ollama API call."""
        self.stats['calls'] += 1
        t0 = time.time()
        
        prompt = self._build_prompt(ml_result, features, regime, has_position)
        
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "format": "json",
                        "stream": False,
                        "options": {
                            "temperature": 0.1,
                            "num_predict": 200,
                        }
                    }
                )
                
                if resp.status_code != 200:
                    self.stats['failures'] += 1
                    return None
                
                data = resp.json()
                response_text = data.get('response', '{}')
                
                # Parse JSON
                try:
                    result = json.loads(response_text)
                except json.JSONDecodeError:
                    import re
                    json_match = re.search(r'\{[^{}]*\}', response_text)
                    if json_match:
                        result = json.loads(json_match.group())
                    else:
                        self.stats['failures'] += 1
                        return None
                
                validated = self._normalize_result(result, ml_result)
                
                elapsed_ms = (time.time() - t0) * 1000
                self.stats['successes'] += 1
                n = self.stats['successes']
                self.stats['avg_latency_ms'] = (
                    self.stats['avg_latency_ms'] * (n - 1) + elapsed_ms
                ) / n
                
                return validated
                
        except Exception:
            self.stats['timeouts'] += 1
            return None
    
    def _rule_based_validate(self, ml_result, features, regime):
        """
        Rule-based fallback when Ollama is unavailable.
        Implements key validation rules that LLM would check.
        """
        action = ml_result.get('action', 'HOLD')
        confidence = ml_result.get('confidence', 0)
        agrees = True
        confidence_adj = confidence
        risk_flag = None
        reasoning = 'Rule-based validation'
        override_action = None
        
        rsi = features.get('rsi_14', 0.5) * 100  # Denormalize
        macd_hist = features.get('macd_hist', 0)
        bb_pctb = features.get('bb_pctb', 0.5)
        vol_ratio = features.get('vol_ratio', 1)
        adx = features.get('adx', 0.2) * 100
        
        # Rule 1: RSI exhaustion — BUY at RSI > 75 or SELL at RSI < 25
        if action == 'BUY' and rsi > 75:
            agrees = False
            confidence_adj *= 0.70
            risk_flag = 'exhaustion'
            reasoning = f'RSI exhaustion: BUY at RSI={rsi:.0f} (overbought)'
        elif action == 'SELL' and rsi < 25:
            agrees = False
            confidence_adj *= 0.70
            risk_flag = 'exhaustion'
            reasoning = f'RSI exhaustion: SELL at RSI={rsi:.0f} (oversold)'
        
        # Rule 2: Counter-trend in VERY strong trend (ADX > 40)
        # Note: ensemble already applies 0.55 counter-trend penalty, so only
        # add light friction here to avoid over-filtering
        if adx > 40:
            if action == 'BUY' and regime == 'TRENDING_DOWN':
                agrees = False
                confidence_adj *= 0.85
                risk_flag = 'counter_trend'
                reasoning = f'Counter-trend: BUY in strong downtrend (ADX={adx:.0f})'
            elif action == 'SELL' and regime == 'TRENDING_UP':
                agrees = False
                confidence_adj *= 0.85
                risk_flag = 'counter_trend'
                reasoning = f'Counter-trend: SELL in strong uptrend (ADX={adx:.0f})'
        
        # Rule 3: Low volume warning
        if features.get('vol_dry', 0) > 0:
            confidence_adj *= 0.85
            risk_flag = 'low_volume'
            reasoning = f'Low volume: vol_dry detected'
        
        # Rule 4: High volatility caution
        if vol_ratio > 2.0:
            confidence_adj *= 0.85
            risk_flag = 'high_vol'
            reasoning = f'High volatility spike: vol_ratio={vol_ratio:.2f}'
        
        # Rule 5: BB extremes — potential reversal
        if action == 'BUY' and bb_pctb > 0.95:
            agrees = False
            confidence_adj *= 0.75
            risk_flag = 'exhaustion'
            reasoning = f'BB extreme: BUY at %B={bb_pctb:.2f} (top of band)'
        elif action == 'SELL' and bb_pctb < 0.05:
            agrees = False
            confidence_adj *= 0.75
            risk_flag = 'exhaustion'
            reasoning = f'BB extreme: SELL at %B={bb_pctb:.2f} (bottom of band)'
        
        # Rule 6: Ranging regime — very light nudge (pipeline already handles)
        if regime == 'RANGING' and action in ('BUY', 'SELL'):
            confidence_adj *= 0.95
            reasoning = 'Ranging regime: reduced confidence'
        
        # Track stats
        if agrees:
            self.stats['agrees'] += 1
            confidence_adj = min(confidence_adj * 1.05, 0.95)  # Small boost
            self.stats['boosts'] += 1
        else:
            self.stats['disagrees'] += 1
            if confidence_adj < 0.25:
                self.stats['vetoes'] += 1
                override_action = 'HOLD'
        
        return {
            'agrees': agrees,
            'confidence_adj': round(confidence_adj, 4),
            'reasoning': reasoning[:200],
            'risk_flag': risk_flag,
            'override_action': override_action,
            'source': 'rule_based',
        }
    
    def _normalize_result(self, result, ml_result):
        """Normalize LLM response to standard format."""
        agrees = bool(result.get('agrees', True))
        confidence = float(result.get('confidence', 0.5))
        reasoning = str(result.get('reasoning', 'No reasoning'))[:200]
        risk_flag = result.get('risk_flag', None)
        
        # Calculate confidence adjustment
        ml_conf = ml_result.get('confidence', 0.5)
        
        if agrees:
            confidence_adj = ml_conf * 1.05  # 5% boost
            self.stats['agrees'] += 1
            self.stats['boosts'] += 1
        else:
            if confidence > 0.7:
                confidence_adj = ml_conf * 0.50  # Strong disagree → 50% penalty
                self.stats['vetoes'] += 1
            else:
                confidence_adj = ml_conf * 0.80  # Mild disagree → 20% penalty
            self.stats['disagrees'] += 1
        
        override_action = None
        if not agrees and confidence > 0.7:
            override_action = 'HOLD'  # LLM veto
        
        return {
            'agrees': agrees,
            'confidence_adj': round(min(confidence_adj, 0.95), 4),
            'reasoning': reasoning,
            'risk_flag': risk_flag,
            'override_action': override_action,
            'source': 'ollama',
        }
    
    def _build_prompt(self, ml_result, features, regime, has_position):
        """Build structured validation prompt."""
        rsi = features.get('rsi_14', 0.5) * 100
        macd = features.get('macd_hist', 0)
        bb = features.get('bb_pctb', 0.5)
        adx = features.get('adx', 0.2) * 100
        vol_ratio = features.get('vol_ratio', 1)
        
        prompt = f"""You are a crypto trading signal validator for BTC.
Analyze this ML signal and respond with agree/disagree + reasoning.

SIGNAL: {ml_result.get('action', 'HOLD')} confidence={ml_result.get('confidence', 0):.1%}
Expected return: {ml_result.get('expected_return', 0):.4%}
Source: {ml_result.get('source', 'XGBoost')}

MARKET:
- RSI(14): {rsi:.1f}
- MACD hist: {macd:.6f}
- Bollinger %B: {bb:.3f}
- ADX: {adx:.1f}  
- Vol ratio: {vol_ratio:.2f}
- Regime: {regime}
- Position open: {has_position}

Respond ONLY in JSON:
{{"agrees": true_or_false, "confidence": 0.0_to_1.0, "reasoning": "max 50 words", "risk_flag": null_or_string}}

risk_flag options: null, "high_vol", "counter_trend", "exhaustion", "low_volume", "divergence"
"""
        return prompt
    
    def _make_cache_key(self, ml_result, regime):
        """Create cache key from signal + regime."""
        key_str = f"{ml_result.get('action','')}" \
                  f"_{ml_result.get('confidence', 0):.2f}" \
                  f"_{regime}"
        return hashlib.md5(key_str.encode()).hexdigest()[:12]
    
    def _trim_cache(self):
        """Keep cache size bounded."""
        if len(self._cache) > self._max_cache:
            # Remove oldest half
            keys = list(self._cache.keys())
            for k in keys[:len(keys) // 2]:
                del self._cache[k]
    
    def get_stats(self):
        """Get validator statistics."""
        total = self.stats['agrees'] + self.stats['disagrees']
        return {
            **self.stats,
            'agreement_rate': round(
                self.stats['agrees'] / max(total, 1) * 100, 1),
            'veto_rate': round(
                self.stats['vetoes'] / max(total, 1) * 100, 1),
            'is_available': self.is_available,
            'enabled': self.enabled,
            'model': self.model,
            'cache_size': len(self._cache),
        }
