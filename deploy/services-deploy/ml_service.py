"""
🧠 TURBO-BOT — ML Service (FastAPI)

HTTP API for real-time ML predictions:
- POST /predict — get ML signal for current market state  
- POST /train — trigger walk-forward retraining
- POST /validate-llm — LLM override validation (PATCH #58)
- POST /sentiment — sentiment analysis (PATCH #58)
- GET /health — service status
- GET /metrics — model performance metrics

Runs on local PC alongside Ollama.
Bot connects via SSH tunnel from VPS.

Usage:
    python3 ml_service.py
    # Service runs on port 4000
"""

import os
import sys
import time
import json
import logging
from datetime import datetime
from typing import Optional, List, Dict

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from fastapi.responses import HTMLResponse, FileResponse
from pathlib import Path

# Import our ML modules
from ml_features import FeatureExtractor
from ml_model import TradingMLEnsemble
from ollama_validator import OllamaValidator
from regime_detection import StatisticalRegimeDetector
from rule_validator import RuleValidator
from openlit_config import bootstrap_openlit

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [ML] %(message)s')
logger = logging.getLogger(__name__)

bootstrap_openlit("turbo-bot-ml-service-deploy")

# ============================================================================
# FastAPI App
# ============================================================================

app = FastAPI(
    title="Turbo-Bot ML Service",
    description="XGBoost + LightGBM ensemble for crypto trading signals",
    version="1.0.0"
)

# CORS — allow dashboard to call API from browser
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Dashboard route
DASHBOARD_PATH = Path(__file__).parent / "ml-dashboard.html"

@app.get("/", response_class=HTMLResponse)
async def dashboard():
    if DASHBOARD_PATH.exists():
        return HTMLResponse(DASHBOARD_PATH.read_text(encoding='utf-8'))
    return HTMLResponse("<h1>ML Service running. Dashboard not found.</h1>")

# Global state
model = TradingMLEnsemble(use_gpu=False)
feature_extractor = FeatureExtractor()
ollama = OllamaValidator()
regime_detector = StatisticalRegimeDetector()
rule_validator = RuleValidator()
service_stats = {
    'started_at': datetime.now().isoformat(),
    'predictions': 0,
    'avg_latency_ms': 0,
    'last_prediction': None,
}

# Try to load saved model on startup
@app.on_event("startup")
async def startup():
    try:
        loaded = model.load()
        if loaded:
            logger.info("✅ Pre-trained model loaded successfully")
        else:
            logger.warning("⚠️ No pre-trained model found — train first via POST /train")
    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
    
    # Check Ollama availability
    await ollama.check_availability()


# ============================================================================
# Request/Response Models
# ============================================================================

class Candle(BaseModel):
    open: float
    high: float
    low: float
    close: float
    volume: float
    timestamp: Optional[int] = None

class PredictRequest(BaseModel):
    candles: List[Candle]
    portfolio_value: float = 10000
    has_position: bool = False
    current_regime: str = "UNKNOWN"
    strategy_signal: Optional[str] = None  # 'BUY', 'SELL', 'HOLD'
    strategy_confidence: Optional[float] = None

class PredictResponse(BaseModel):
    direction: str
    confidence: float
    expected_return: float
    should_trade: bool
    features_used: int
    inference_ms: float
    feature_importance: Dict[str, float] = {}
    xgb_proba: List[float] = []
    lgb_proba: List[float] = []
    ollama_validation: Optional[Dict] = None
    rule_validation: Optional[Dict] = None

class TrainRequest(BaseModel):
    timeframe: str = "15m"
    horizon: int = 1

class HealthResponse(BaseModel):
    status: str
    model_trained: bool
    predictions_count: int
    avg_latency_ms: float
    uptime_seconds: float
    feature_count: int


# ============================================================================
# Endpoints
# ============================================================================

@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    """
    Get ML prediction for current market state.
    
    Accepts OHLCV candles (min 200), returns direction + confidence.
    If strategy_signal is provided, ML acts as FILTER (agree/disagree).
    """
    t0 = time.time()
    
    if len(req.candles) < 50:
        raise HTTPException(status_code=400, detail="Need at least 50 candles (200 recommended)")
    
    # Convert candles to DataFrame
    candle_data = [c.dict() for c in req.candles]
    df = pd.DataFrame(candle_data)
    
    # Set datetime index if timestamps available
    if 'timestamp' in df.columns and df['timestamp'].notna().all():
        df['datetime'] = pd.to_datetime(df['timestamp'], unit='ms')
        df.set_index('datetime', inplace=True)
    
    # Extract features (with regime context from Node.js VQC/NeuralAI)
    features = feature_extractor.extract(df, lookback=min(200, len(df)), regime=req.current_regime)
    
    # Detect regime (statistical — no ML, no circular reasoning)
    regime_result = regime_detector.detect(
        prices=df['close'].values,
        high=df['high'].values if 'high' in df.columns else None,
        low=df['low'].values if 'low' in df.columns else None,
        lookback=min(100, len(df))
    )
    detected_regime = regime_result.get('regime', 'UNKNOWN')
    
    # Get ML prediction
    if not model.trained:
        result = {
            'direction': 'NEUTRAL',
            'confidence': 0.33,
            'expected_return': 0,
            'xgb_proba': [0.5, 0.5],
            'lgb_proba': [0.5, 0.5],
            'feature_importance': {},
        }
    else:
        result = model.predict(features)
    
    # ML as signal filter (if strategy signal provided)
    should_trade = True
    if req.strategy_signal and req.strategy_signal != 'HOLD':
        strategy_dir = 'UP' if req.strategy_signal == 'BUY' else 'DOWN'
        
        if result['direction'] == 'NEUTRAL':
            # ML is uncertain — reduce confidence but allow
            should_trade = True  # Don't block, let risk manager decide
            result['confidence'] *= 0.7
        elif result['direction'] != strategy_dir:
            # ML disagrees with strategy — block trade
            should_trade = False
            result['direction'] = 'NEUTRAL'
            result['confidence'] = 0.3
    elif result['direction'] == 'NEUTRAL':
        should_trade = False
    
    # ── DUAL VALIDATION: Rule-based (always) + Ollama (conditional) ──
    
    # STEP 1: Rule-based validator (always runs, <1ms)
    rule_result = None
    if result['direction'] != 'NEUTRAL':
        rule_result = rule_validator.validate(result, features, regime=detected_regime)
        if not rule_result['valid']:
            # Hard reject — rules failed
            should_trade = False
            result['confidence'] = min(result['confidence'], 0.30)
            logger.info(f"📏 Rule REJECT: {rule_result['rejections']}")
        elif rule_result['confidence_adj'] < result['confidence']:
            # Soft adjustment (regime mismatch etc.)
            result['confidence'] = rule_result['confidence_adj']
    
    # STEP 2: Ollama validation (skip if confidence > 0.65 = fast-path)
    ollama_result = None
    if result['direction'] != 'NEUTRAL' and should_trade:
        if result['confidence'] > 0.65:
            # FAST-PATH: High confidence → skip Ollama (saves 200-800ms)
            logger.info(f"⚡ Fast-path: conf={result['confidence']:.3f} > 0.65 → skip Ollama")
        elif result['confidence'] > 0.45 and ollama.is_available:
            # STANDARD-PATH: Medium confidence → ask Ollama
            ollama_result = await ollama.validate_signal(
                result, features, regime=req.current_regime, has_position=req.has_position
            )
            
            if ollama_result and not ollama_result['agrees']:
                if ollama_result['confidence'] > 0.7:
                    result['confidence'] *= 0.7  # 30% penalty
                    should_trade = False  # Ollama veto
                    logger.info(f"🚫 Ollama VETO: {result['direction']} | Reason: {ollama_result.get('reasoning', 'N/A')}")
        # else: Low confidence (0.35-0.45) → rule validator already handles
    
    elapsed_ms = (time.time() - t0) * 1000
    
    # Update stats
    service_stats['predictions'] += 1
    n = service_stats['predictions']
    service_stats['avg_latency_ms'] = (
        service_stats['avg_latency_ms'] * (n - 1) + elapsed_ms
    ) / n
    service_stats['last_prediction'] = datetime.now().isoformat()
    
    return PredictResponse(
        direction=result['direction'],
        confidence=result['confidence'],
        expected_return=result.get('expected_return', 0),
        should_trade=should_trade,
        features_used=len(features),
        inference_ms=round(elapsed_ms, 1),
        feature_importance=result.get('feature_importance', {}),
        xgb_proba=result.get('xgb_proba', [0.5, 0.5]),
        lgb_proba=result.get('lgb_proba', [0.5, 0.5]),
        ollama_validation=ollama_result,
        rule_validation=rule_result,
    )


@app.post("/train")
async def train(req: TrainRequest):
    """
    Trigger walk-forward retraining.
    Typically called every 24h from bot's scheduler.
    """
    try:
        from train_model import train_and_evaluate
        
        logger.info(f"🔧 Starting training on {req.timeframe} data...")
        result = train_and_evaluate(req.timeframe, req.horizon)
        
        if result is None:
            raise HTTPException(status_code=500, detail="Training failed — check data files")
        
        # Reload the trained model
        model.load()
        
        return {
            'status': 'ok',
            'metrics': result,
            'message': f'Model retrained on {req.timeframe} data'
        }
    except Exception as e:
        logger.error(f"❌ Training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health", response_model=HealthResponse)
async def health():
    """Service health check."""
    uptime = (datetime.now() - datetime.fromisoformat(service_stats['started_at'])).total_seconds()
    
    return HealthResponse(
        status="ok",
        model_trained=model.trained,
        predictions_count=service_stats['predictions'],
        avg_latency_ms=round(service_stats['avg_latency_ms'], 1),
        uptime_seconds=round(uptime, 0),
        feature_count=feature_extractor.feature_count,
    )


@app.get("/metrics")
async def metrics():
    """Detailed model metrics."""
    return {
        'training_metrics': model.training_metrics if model.trained else None,
        'feature_importance': dict(sorted(
            model.feature_importance.items(), key=lambda x: -x[1]
        )[:20]) if model.feature_importance else None,
        'service_stats': service_stats,
        'ollama_stats': ollama.get_stats(),
        'rule_validator_stats': rule_validator.get_stats(),
        'current_regime': regime_detector.current_regime,
        'regime_confidence': regime_detector.regime_confidence,
        'regime_stats': regime_detector.regime_stats,
    }


@app.post("/regime")
async def detect_regime_endpoint(req: PredictRequest):
    """
    Detect current market regime from candle data.
    Uses statistical methods (Hurst + ADX + trend regression).
    """
    if len(req.candles) < 50:
        raise HTTPException(status_code=400, detail="Need at least 50 candles")
    
    candle_data = [c.dict() for c in req.candles]
    df = pd.DataFrame(candle_data)
    
    result = regime_detector.detect(
        prices=df['close'].values,
        high=df['high'].values,
        low=df['low'].values,
        lookback=min(100, len(df))
    )
    
    result['recommendations'] = regime_detector.get_trading_recommendations()
    return result


# ============================================================================
# PATCH #58: LLM Override Validation Endpoint
# ============================================================================

class LLMValidateRequest(BaseModel):
    """Request body for LLM signal validation."""
    direction: str  # 'UP' or 'DOWN'
    confidence: float
    expected_return: float = 0
    regime: str = 'UNKNOWN'
    has_position: bool = False
    rsi: float = 50
    adx: float = 20
    bb_pctb: float = 0.5
    vol_ratio: float = 1.0
    macd_hist: float = 0

class LLMValidateResponse(BaseModel):
    """LLM validation result."""
    agrees: bool
    confidence_adj: float
    reasoning: str
    risk_flag: Optional[str] = None
    override_action: Optional[str] = None
    source: str  # 'ollama' or 'rule_based'
    latency_ms: float

@app.post("/validate-llm", response_model=LLMValidateResponse)
async def validate_llm(req: LLMValidateRequest):
    """
    PATCH #58: LLM Override Validation.
    
    Validates ML signal using Ollama LLM (if available) or rule-based fallback.
    Returns agree/disagree + confidence adjustment + reasoning.
    
    Called by bot.js AFTER /predict, BEFORE execution.
    Budget: ~300ms Ollama, ~1ms rule-based.
    """
    t0 = time.time()
    
    ml_result = {
        'direction': req.direction,
        'confidence': req.confidence,
        'expected_return': req.expected_return,
    }
    
    features = {
        'rsi_14': req.rsi / 100,  # Normalize for validator
        'adx': req.adx / 100,
        'bb_pctb': req.bb_pctb,
        'vol_ratio': req.vol_ratio,
        'macd_hist': req.macd_hist,
    }
    
    # Try Ollama first, then rule-based fallback
    result = None
    source = 'rule_based'
    
    if ollama.is_available:
        try:
            result = await ollama.validate_signal(
                ml_result, features, regime=req.regime, has_position=req.has_position
            )
            if result:
                source = 'ollama'
        except Exception as e:
            logger.warning(f"Ollama validation failed: {e}")
    
    # Rule-based fallback
    if result is None:
        agrees = True
        confidence_adj = req.confidence
        reasoning = 'Rule-based validation passed'
        risk_flag = None
        override_action = None
        
        action = 'BUY' if req.direction == 'UP' else 'SELL'
        
        # RSI exhaustion
        if action == 'BUY' and req.rsi > 75:
            agrees = False
            confidence_adj *= 0.70
            reasoning = f'RSI exhaustion: BUY at RSI={req.rsi:.0f}'
            risk_flag = 'exhaustion'
        elif action == 'SELL' and req.rsi < 25:
            agrees = False
            confidence_adj *= 0.70
            reasoning = f'RSI exhaustion: SELL at RSI={req.rsi:.0f}'
            risk_flag = 'exhaustion'
        
        # Counter-trend (only very strong, ADX > 40)
        if req.adx > 40:
            if action == 'BUY' and req.regime == 'TRENDING_DOWN':
                agrees = False
                confidence_adj *= 0.85
                risk_flag = 'counter_trend'
                reasoning = f'Counter-trend: BUY in downtrend (ADX={req.adx:.0f})'
            elif action == 'SELL' and req.regime == 'TRENDING_UP':
                agrees = False
                confidence_adj *= 0.85
                risk_flag = 'counter_trend'
                reasoning = f'Counter-trend: SELL in uptrend (ADX={req.adx:.0f})'
        
        # High volatility
        if req.vol_ratio > 2.0:
            confidence_adj *= 0.90
            risk_flag = 'high_vol'
            reasoning = f'High volatility: vol_ratio={req.vol_ratio:.2f}'
        
        # Bollinger extremes
        if action == 'BUY' and req.bb_pctb > 0.95:
            agrees = False
            confidence_adj *= 0.80
            risk_flag = 'exhaustion'
            reasoning = f'BB extreme: BUY at %B={req.bb_pctb:.2f}'
        elif action == 'SELL' and req.bb_pctb < 0.05:
            agrees = False
            confidence_adj *= 0.80
            risk_flag = 'exhaustion'
            reasoning = f'BB extreme: SELL at %B={req.bb_pctb:.2f}'
        
        if agrees:
            confidence_adj = min(confidence_adj * 1.03, 0.95)
        
        if not agrees and confidence_adj < 0.25:
            override_action = 'HOLD'
        
        result = {
            'agrees': agrees,
            'confidence_adj': round(confidence_adj, 4),
            'reasoning': reasoning[:200],
            'risk_flag': risk_flag,
            'override_action': override_action,
        }
    
    elapsed_ms = (time.time() - t0) * 1000
    
    return LLMValidateResponse(
        agrees=result.get('agrees', True),
        confidence_adj=result.get('confidence_adj', req.confidence),
        reasoning=result.get('reasoning', 'No reasoning')[:200],
        risk_flag=result.get('risk_flag'),
        override_action=result.get('override_action'),
        source=source,
        latency_ms=round(elapsed_ms, 1),
    )


# ============================================================================
# PATCH #58: Sentiment Analysis Endpoint
# ============================================================================

class SentimentRequest(BaseModel):
    """Request body for sentiment analysis."""
    candles: List[Candle]
    regime: str = 'UNKNOWN'

class SentimentResponse(BaseModel):
    """Sentiment analysis result."""
    score: float  # -1 to +1
    regime: str   # EXTREME_FEAR, FEAR, NEUTRAL, GREED, EXTREME_GREED
    confidence_modifier: float  # 0.80-1.10
    trading_bias: str  # 'bullish', 'bearish', 'neutral'
    components: Dict[str, float]
    contrarian_signal: Optional[str] = None

# Initialize sentiment analyzer (reuse from backtest_pipeline)
_sentiment_analyzer = None
_sentiment_scraper = None

def _get_sentiment_analyzer():
    """Lazy-load sentiment analyzer."""
    global _sentiment_analyzer
    if _sentiment_analyzer is None:
        try:
            from backtest_pipeline.sentiment_analyzer import SentimentAnalyzer
            _sentiment_analyzer = SentimentAnalyzer()
            logger.info("✅ Sentiment Analyzer loaded")
        except Exception as e:
            logger.warning(f"⚠️ Sentiment Analyzer not available: {e}")
    return _sentiment_analyzer

def _get_sentiment_scraper():
    """Lazy-load external sentiment scraper (PATCH #58)."""
    global _sentiment_scraper
    if _sentiment_scraper is None:
        try:
            from sentiment_scraper import SentimentScraper
            _sentiment_scraper = SentimentScraper(cache_ttl=300)
            logger.info("✅ Sentiment Scraper loaded (external sources)")
        except Exception as e:
            logger.warning(f"⚠️ Sentiment Scraper not available: {e}")
    return _sentiment_scraper

@app.post("/sentiment", response_model=SentimentResponse)
async def sentiment(req: SentimentRequest):
    """
    PATCH #58: Market Sentiment Analysis.
    
    Analyzes price/volume microstructure for fear/greed proxy.
    Returns sentiment score, regime classification, and confidence modifier.
    
    Called by bot.js each trading cycle for signal modification.
    """
    analyzer = _get_sentiment_analyzer()
    
    if analyzer is None or len(req.candles) < 50:
        return SentimentResponse(
            score=0.0,
            regime='NEUTRAL',
            confidence_modifier=1.0,
            trading_bias='neutral',
            components={},
        )
    
    # Convert to format the analyzer expects
    candle_data = [c.dict() for c in req.candles]
    df = pd.DataFrame(candle_data)
    
    latest = df.iloc[-1]
    history = df.iloc[-min(200, len(df)):]
    
    # Build row-like object for analyzer
    row = latest.to_dict()
    # Add indicators the analyzer needs
    closes = history['close'].values
    if len(closes) > 14:
        # Simple RSI calc for sentiment
        deltas = np.diff(closes)
        gains = np.where(deltas > 0, deltas, 0)[-14:]
        losses = np.where(deltas < 0, -deltas, 0)[-14:]
        avg_gain = np.mean(gains) if len(gains) > 0 else 0
        avg_loss = np.mean(losses) if len(losses) > 0 else 1e-10
        rs = avg_gain / max(avg_loss, 1e-10)
        row['rsi_14'] = 100 - (100 / (1 + rs))
    else:
        row['rsi_14'] = 50
    
    # Mock row as pandas Series
    row_series = pd.Series(row)
    
    result = analyzer.analyze(row_series, history, req.regime)
    
    # Determine contrarian signal
    contrarian = None
    if result.get('regime') == 'EXTREME_FEAR':
        contrarian = 'BUY_OPPORTUNITY'
    elif result.get('regime') == 'EXTREME_GREED':
        contrarian = 'SELL_WARNING'
    
    # Determine trading bias
    score = result.get('score', 0)
    if score > 0.15:
        bias = 'bullish'
    elif score < -0.15:
        bias = 'bearish'
    else:
        bias = 'neutral'
    
    # --- PATCH #58 Phase 2: Merge external sentiment ---
    # Blend price-based microstructure with Fear & Greed + news
    scraper = _get_sentiment_scraper()
    if scraper:
        try:
            ext_sent = await scraper.get_composite_sentiment('BTC')
            if ext_sent and ext_sent.get('sources', ['fallback']) != ['fallback']:
                # Blend: 60% price-based, 40% external
                micro_score = result.get('score', 0)
                ext_score = ext_sent.get('score', 0)
                blended = 0.60 * micro_score + 0.40 * ext_score

                # Recalculate regime from blended
                if blended <= -0.50: blended_regime = 'EXTREME_FEAR'
                elif blended <= -0.15: blended_regime = 'FEAR'
                elif blended <= 0.15: blended_regime = 'NEUTRAL'
                elif blended <= 0.50: blended_regime = 'GREED'
                else: blended_regime = 'EXTREME_GREED'

                # Recalculate modifier
                modifier_map = {
                    'EXTREME_FEAR': 1.08, 'FEAR': 1.03, 'NEUTRAL': 1.00,
                    'GREED': 0.97, 'EXTREME_GREED': 0.90
                }
                blended_mod = modifier_map.get(blended_regime, 1.0)

                return SentimentResponse(
                    score=round(blended, 4),
                    regime=blended_regime,
                    confidence_modifier=round(blended_mod, 4),
                    trading_bias='bullish' if blended > 0.15 else ('bearish' if blended < -0.15 else 'neutral'),
                    components={
                        **result.get('components', {}),
                        'external_score': round(ext_score, 4),
                        'external_sources': ext_sent.get('sources', []),
                        'fear_greed_index': ext_sent.get('fear_greed_index'),
                    },
                    contrarian_signal='BUY_OPPORTUNITY' if blended_regime == 'EXTREME_FEAR' else (
                        'SELL_WARNING' if blended_regime == 'EXTREME_GREED' else contrarian
                    ),
                )
        except Exception as e:
            logger.debug(f"External sentiment blend failed: {e}")

    return SentimentResponse(
        score=round(result.get('score', 0), 4),
        regime=result.get('regime', 'NEUTRAL'),
        confidence_modifier=round(result.get('confidence_modifier', 1.0), 4),
        trading_bias=bias,
        components=result.get('components', {}),
        contrarian_signal=contrarian,
    )


# ============================================================================
# PATCH #58: Enhanced Health Endpoint
# ============================================================================

@app.get("/health-v2")
async def health_v2():
    """Extended health check with PATCH #58 component status."""
    uptime = (datetime.now() - datetime.fromisoformat(service_stats['started_at'])).total_seconds()
    
    analyzer = _get_sentiment_analyzer()
    scraper = _get_sentiment_scraper()
    
    return {
        'status': 'ok',
        'version': '2.0.0',
        'patch': 58,
        'model_trained': model.trained,
        'predictions_count': service_stats['predictions'],
        'avg_latency_ms': round(service_stats['avg_latency_ms'], 1),
        'uptime_seconds': round(uptime, 0),
        'feature_count': feature_extractor.feature_count,
        'components': {
            'xgboost': True,
            'lightgbm': True,
            'ollama': ollama.is_available,
            'ollama_model': ollama.model,
            'sentiment': analyzer is not None,
            'sentiment_scraper': scraper is not None,
            'rule_validator': True,
        }
    }


# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    port = int(os.environ.get('ML_SERVICE_PORT', 4000))
    logger.info(f"🚀 Starting Turbo-Bot ML Service on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
