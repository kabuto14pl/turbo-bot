"""
🧠 TURBO-BOT — Ollama Strategy Validator

Ollama's role is NOT to predict prices or generate BUY/SELL signals.
Ollama VALIDATES ML signals by checking reasoning quality:
  - "Does this BUY make sense given the context?"
  - "Are there edge cases ML can't see?"
  - Generates structured JSON responses for machine consumption

Model: mistral:7b-instruct (best quality/VRAM/speed ratio on RTX 5070 Ti)
Expected: ~300ms per validation call
"""

import json
import time
import logging
import httpx

logger = logging.getLogger(__name__)

OLLAMA_URL = "http://localhost:11434"
DEFAULT_MODEL = "mistral:7b-instruct"
TIMEOUT_SECONDS = 3.0


class OllamaValidator:
    """
    Validates ML trading signals using Ollama LLM.
    Returns structured JSON with agree/disagree + reasoning.
    """
    
    def __init__(self, model=None, base_url=None, timeout=None):
        self.model = model or DEFAULT_MODEL
        self.base_url = base_url or OLLAMA_URL
        self.timeout = timeout or TIMEOUT_SECONDS
        self.is_available = False
        self.stats = {
            'calls': 0,
            'successes': 0,
            'failures': 0,
            'agrees': 0,
            'disagrees': 0,
            'avg_latency_ms': 0,
        }
    
    async def check_availability(self):
        """Check if Ollama is running and model is available."""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m.get('name', '') for m in data.get('models', [])]
                    self.is_available = any(self.model in m for m in models)
                    if self.is_available:
                        logger.info(f"✅ Ollama available: {self.model}")
                    else:
                        logger.warning(f"⚠️ Ollama running but model '{self.model}' not found. Available: {models}")
                    return self.is_available
        except Exception as e:
            self.is_available = False
            logger.warning(f"⚠️ Ollama not available at {self.base_url}: {e}")
            return False
    
    async def validate_signal(self, ml_result, features, regime='UNKNOWN', has_position=False):
        """
        Validate an ML trading signal using Ollama.
        
        Args:
            ml_result: dict with direction, confidence, expected_return
            features: dict of feature values
            regime: Current market regime
            has_position: Whether bot has open position
            
        Returns:
            dict with agrees, confidence, reasoning, risk_flag or None if unavailable
        """
        if not self.is_available:
            return None
        
        self.stats['calls'] += 1
        t0 = time.time()
        
        prompt = self._build_validation_prompt(ml_result, features, regime, has_position)
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "format": "json",  # Force JSON output (Ollama 0.1.23+)
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
                
                # Parse JSON response
                try:
                    result = json.loads(response_text)
                except json.JSONDecodeError:
                    # Try to extract JSON from response
                    import re
                    json_match = re.search(r'\{[^{}]*\}', response_text)
                    if json_match:
                        result = json.loads(json_match.group())
                    else:
                        self.stats['failures'] += 1
                        return None
                
                # Normalize result
                validated = {
                    'agrees': bool(result.get('agrees', True)),
                    'confidence': float(result.get('confidence', 0.5)),
                    'reasoning': str(result.get('reasoning', 'No reasoning'))[:200],
                    'risk_flag': result.get('risk_flag', None),
                }
                
                elapsed_ms = (time.time() - t0) * 1000
                self.stats['successes'] += 1
                n = self.stats['successes']
                self.stats['avg_latency_ms'] = (self.stats['avg_latency_ms'] * (n-1) + elapsed_ms) / n
                
                if validated['agrees']:
                    self.stats['agrees'] += 1
                else:
                    self.stats['disagrees'] += 1
                
                validated['latency_ms'] = round(elapsed_ms, 1)
                return validated
                
        except httpx.TimeoutException:
            self.stats['failures'] += 1
            logger.debug("Ollama timeout — signal passes through without validation")
            return None
        except Exception as e:
            self.stats['failures'] += 1
            logger.debug(f"Ollama error: {e}")
            return None
    
    def _build_validation_prompt(self, ml_result, features, regime, has_position):
        """Build structured validation prompt for Ollama."""
        
        # Top 5 features
        top_features = {}
        if ml_result.get('feature_importance'):
            top_features = dict(list(ml_result['feature_importance'].items())[:5])
        
        prompt = f"""You are a crypto trading signal validator. 
Analyze this ML-generated trading signal and determine if it makes sense.

SIGNAL: {ml_result.get('direction', 'UNKNOWN')} with confidence {ml_result.get('confidence', 0):.1%}
Expected return: {ml_result.get('expected_return', 0):.4%}

MARKET CONTEXT:
- RSI(14): {features.get('rsi_14', 50):.1f}
- MACD histogram: {features.get('macd_hist', 0):.6f}
- Volatility ratio (short/long): {features.get('vol_ratio', 1):.2f}
- Price vs SMA20: {features.get('price_sma20_ratio', 0):.2%}
- Price vs SMA50: {features.get('price_sma50_ratio', 0):.2%}
- Volume ratio: {features.get('vol_ratio_20', 1):.2f}
- Hurst exponent: {features.get('hurst', 0.5):.2f}
- ADX: {features.get('adx_14', 20):.1f}
- Bollinger %B: {features.get('bb_pctb', 0.5):.3f}
- Regime: {regime}
- Position open: {has_position}

Top features driving signal:
{json.dumps(top_features, indent=2)}

Respond ONLY in valid JSON:
{{"agrees": true_or_false, "confidence": 0.0_to_1.0, "reasoning": "max 50 words", "risk_flag": null_or_string}}

risk_flag options: null, "high_vol", "counter_trend", "exhaustion", "low_volume", "divergence"
"""
        return prompt
    
    def get_stats(self):
        """Get validator statistics."""
        total = self.stats['agrees'] + self.stats['disagrees']
        return {
            **self.stats,
            'agreement_rate': self.stats['agrees'] / max(total, 1),
            'is_available': self.is_available,
            'model': self.model,
        }
