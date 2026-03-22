# PLAN EWOLUCJI DO PROFESJONALNEGO AI TRADING BOTA
## CLAUDE-SKYNET v1.0 – Turbo-Bot Evolution

**Data:** 2026-03-01
**Cel:** Krytyczna, realistyczna ścieżka od prototypu do produkcji
**Podejście:** Stop marketing, start engineering

---

## DIAGNOSTYKA WYJŚCIOWA — CO MAMY

| Zasób | Stan | Wartość realna |
|-------|------|---------------|
| **Ollama** | Wbudowany w LLMRouter (megatron_system.js) | ✅ Gotowy do użycia |
| **RTX 5070 Ti** | 16GB VRAM, via SSH tunnel VPS→Local | ✅ Potężny zasób |
| **TensorFlow.js** | Już w stacku (GRU 3K params) | ⚠️ Too small |
| **Python CUDA service** | gpu-cuda-service.py (port 4002) | ✅ GPU compute |
| **Node.js bot** | Dobrze zorganizowany, modularny | ✅ Solid base |
| **5 strategii klasycznych** | RSITurbo, SuperTrend, MACrossover, MomentumPro, AdvancedAdaptive | ⚠️ Nie zbacktestowane |
| **Thompson Sampling** | Bayesian MAB — jedyny real ML | ✅ Keep |
| **Feature Pipeline** | RSI, MACD, BB, ATR, volume, z-score | ✅ Keep |
| **Risk Management** | Circuit breaker, drawdown, defense mode | ✅ Keep (uprościć) |

### Kluczowe ograniczenia:
1. **VPS (DigitalOcean):** CPU-only, 2-4GB RAM → BRAK GPU, brak ciężkiego ML
2. **RTX 5070 Ti:** 16GB VRAM na lokalnym PC → Ollama + CUDA → MUSI być online
3. **SSH tunnel:** VPS:4001 → Local:4000 → ładny ale FRAGILE (rozłączenia, latencja)
4. **Node.js:** ML ecosystem słaby vs Python. TF.js ≪ PyTorch/sklearn
5. **Brak backtestów:** Zero evidence na to, że cokolwiek zarabia

---

## KRYTYCZNA ANALIZA OPCJI

### Opcja A: "Ollama as Trading Brain" (LLM-first)
**Pomysł:** Duży model Ollama (Mistral 7B, Qwen2.5 14B, DeepSeek) podejmuje decyzje tradingowe.

**PROBLEMY:**
- LLM NIE SĄ zaprojektowane do predykcji cen — to modele języka, nie time-series
- Latencja: nawet 7B model to 1-3s per inference → za wolno dla fast signals
- Hallucynacje: LLM "widzi wzorce" których nie ma → fałszywe sygnały
- Determinizm: ten sam input → różne outputy (temperature) → niereplikowalne wyniki
- Koszty VRAM: Mistral 7B = ~4GB, Qwen 14B = ~8GB, zostawia mało dla CUDA quantum
- **WERDYKT:** LLM mogą WALIDOWAĆ decyzje, nie GENEROWAĆ sygnały tradingowe

### Opcja B: "Bigger TF.js Model" (GRU → Transformer)
**Pomysł:** Zastąpić 3K params GRU modelem 100K+ params Transformer w TF.js.

**PROBLEMY:**
- TF.js na CPU VPS = BARDZO wolne (Transformer 100K = ~5-30s inference)
- TF.js ecosystem jest ograniczony vs PyTorch
- Training w Node.js jest koszmarny (memory leaks, no CUDA support natively)
- **WERDYKT:** Lepsze niż 3K GRU, ale to walka z technologią

### Opcja C: "Python ML Microservice na GPU" (REKOMENDOWANA)
**Pomysł:** Python service na RTX 5070 Ti → XGBoost/LightGBM/Transformer → HTTP API.

**ZALETY:**
- Dostęp do PEŁNEGO Python ML ecosystem (sklearn, XGBoost, LightGBM, PyTorch)
- GPU acceleration dla treningu modeli
- **XGBoost/LightGBM** są INDUSTRY STANDARD w quant trading (nie deep learning!)
- Inference ~1-5ms (XGBoost) vs ~1-5s (LLM) → 1000x szybciej
- Backtesting w Python jest trivialny (pandas, backtrader, vectorbt)
- Ollama nadal dostępny na GPU dla WALIDACJI (nie predykcji)
- **WERDYKT:** Najlepsza opcja — ML i Ollama współdzielą GPU

### Opcja D: "Hybrid C + Ollama Validator" (OPTYMALNA)
**Pomysł:** Python ML generuje sygnały → Ollama (7B) waliduje/wzbogaca w reasoning → bot wykonuje.

**Dlaczego to najlepsze:**
1. XGBoost/LightGBM robi fast, accurate prediction (1-5ms)
2. Ollama dostaje sygnał + kontekst → "Czy ten trade ma sens?" (200-500ms z 7B)
3. Bot executuje lub odrzuca na podstawie OBIE warstw
4. Każdy komponent robi to, w czym jest NAJLEPSZY

---

## ARCHITEKTURA DOCELOWA — OPCJA D

```
┌──────────────────────────────────────────────────────────────────┐
│                    VPS (DigitalOcean, CPU)                        │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │                  Node.js Bot (bot.js)                    │      │
│  │                                                          │      │
│  │  DataPipeline → StrategyRunner(5) → EnsembleVoting      │      │
│  │       ↓                                    ↓             │      │
│  │  [Feature Extraction]           [Thompson Sampling]      │      │
│  │       ↓                                    ↓             │      │
│  │  HTTP POST to ML Service    ←   consensus signal         │      │
│  │       ↓                                                  │      │
│  │  [ML Prediction + Ollama Validation]                     │      │
│  │       ↓                                                  │      │
│  │  RiskManager → ExecutionEngine → OKX                     │      │
│  └──────────┬──────────────────────────────────────────────┘      │
│              │ SSH Tunnel VPS:4001 → Local:4000                    │
│              ↓                                                     │
├──────────────────────────────────────────────────────────────────┤
│                  LOCAL PC (RTX 5070 Ti, 16GB VRAM)                │
│                                                                    │
│  ┌──────────────────────────────────┐ ┌──────────────────────┐   │
│  │  Python ML Service (:4000)       │ │  Ollama (:11434)     │   │
│  │                                   │ │                      │   │
│  │  /predict    → XGBoost ensemble  │ │  mistral:7b-instruct │   │
│  │  /features   → Feature eng.      │ │  or qwen2.5:7b      │   │
│  │  /train      → Online learning  │ │  ~4GB VRAM           │   │
│  │  /backtest   → Walk-forward     │ │                      │   │
│  │  /validate   → Ollama call      │ │  Rola: Walidacja     │   │
│  │  /health     → Status           │ │  decyzji ML +        │   │
│  │                                   │ │  reasoning           │   │
│  │  ~2GB VRAM (XGBoost train)      │ │                      │   │
│  └──────────────────────────────────┘ └──────────────────────┘   │
│                                                                    │
│  VRAM Budget: 4GB Ollama + 2GB ML + 10GB free                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## FAZA 0: FUNDAMENTY (1-2 dni) — BACKTEST

**To jest ABSOLUTNIE PIERWSZY KROK. Bez tego cała reszta nie ma sensu.**

### 0.1 Backtest infrastruktura
```python
# backtest_engine.py — na lokalnym PC
import pandas as pd
import numpy as np
from datetime import datetime

class TurboBacktester:
    """Walk-forward backtester z proper fee accounting"""
    
    def __init__(self, initial_capital=10000, fee_rate=0.001):
        self.capital = initial_capital
        self.fee_rate = fee_rate  # 0.1% per side
        self.trades = []
        self.equity_curve = []
    
    def run(self, data, strategy_fn, sl_atr_mult=1.5, tp_atr_mult=4.0):
        """
        data: DataFrame z OHLCV + indicators
        strategy_fn: (row, history) → 'BUY' | 'SELL' | 'HOLD'
        """
        position = None
        for i in range(100, len(data)):  # min 100 candles warmup
            row = data.iloc[i]
            history = data.iloc[max(0,i-200):i]
            
            signal = strategy_fn(row, history)
            
            # Execute
            if signal == 'BUY' and position is None:
                entry_fee = row.close * self.fee_rate
                position = {
                    'entry': row.close, 'side': 'LONG',
                    'sl': row.close - sl_atr_mult * row.atr,
                    'tp': row.close + tp_atr_mult * row.atr,
                    'entry_time': row.name,
                    'entry_fee': entry_fee
                }
                self.capital -= entry_fee
                
            elif position:
                # Check SL/TP
                if row.low <= position['sl']:
                    pnl = position['sl'] - position['entry']
                    exit_fee = position['sl'] * self.fee_rate
                    self.capital += pnl - exit_fee
                    self.trades.append({...})
                    position = None
                elif row.high >= position['tp']:
                    pnl = position['tp'] - position['entry']
                    exit_fee = position['tp'] * self.fee_rate
                    self.capital += pnl - exit_fee
                    self.trades.append({...})
                    position = None
            
            self.equity_curve.append(self.capital)
```

### 0.2 Dane historyczne
```python
# fetch_historical.py
import ccxt

exchange = ccxt.okx()
ohlcv = exchange.fetch_ohlcv('BTC/USDT', '15m', limit=10000)  # ~100 dni
df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])

# Dodaj indicators (RSI, MACD, BB, ATR, SMA, EMA)
# Backtest KAŻDĄ z 5 strategii indywidualnie
# Raport: win rate, profit factor, max drawdown, Sharpe ratio PER STRATEGY
```

### 0.3 Wynik oczekiwany
- **WIN RATE per strategy** (po fees!)
- **Profit Factor** per strategy
- **Max Drawdown** per strategy
- **Sharpe Ratio** per strategy
- **Korelacja** między strategiami (czy są redundantne?)

**DECYZJA:** Na podstawie backtesta — WYRZUCIĆ strategie z negative expectancy.

---

## FAZA 1: PYTHON ML SERVICE (3-5 dni)

### 1.1 Feature Engineering (KRYTYCZNE)

Feature engineering jest 10x ważniejszy niż model. Dobry XGBoost z dobrymi features > duży Transformer z złymi features.

```python
# ml_features.py
import numpy as np
import pandas as pd
from ta import add_all_ta_features  # python-ta library

def extract_features(df, lookback=200):
    """
    Extract PROVEN features for crypto price prediction.
    Based on academic literature + industry practice.
    """
    features = {}
    close = df['close'].values
    volume = df['volume'].values
    
    # === GROUP 1: PRICE MOMENTUM (co-integrated) ===
    for period in [5, 10, 20, 50]:
        features[f'return_{period}'] = (close[-1] / close[-period] - 1)
        features[f'volatility_{period}'] = np.std(np.diff(np.log(close[-period:])))
    
    # === GROUP 2: MEAN REVERSION ===
    sma20 = np.mean(close[-20:])
    sma50 = np.mean(close[-50:])
    features['price_sma20_ratio'] = close[-1] / sma20 - 1
    features['price_sma50_ratio'] = close[-1] / sma50 - 1
    features['sma20_sma50_ratio'] = sma20 / sma50 - 1
    
    # === GROUP 3: VOLATILITY REGIME ===
    vol_short = np.std(np.diff(np.log(close[-10:])))
    vol_long = np.std(np.diff(np.log(close[-50:])))
    features['vol_ratio'] = vol_short / (vol_long + 1e-8)
    features['atr_pct'] = np.mean(df['high'].values[-14:] - df['low'].values[-14:]) / close[-1]
    
    # === GROUP 4: VOLUME PROFILE ===
    avg_vol = np.mean(volume[-20:])
    features['vol_ratio_20'] = volume[-1] / (avg_vol + 1e-8)
    features['vol_trend'] = np.mean(volume[-5:]) / (np.mean(volume[-20:]) + 1e-8)
    
    # === GROUP 5: MICROSTRUCTURE ===
    features['rsi_14'] = compute_rsi(close, 14)
    features['macd_hist'] = compute_macd_histogram(close)
    features['bb_pctb'] = compute_bb_pctb(close, 20)
    
    # === GROUP 6: REGIME INDICATORS ===
    # Hurst exponent — determines trending vs mean-reverting
    features['hurst'] = compute_hurst_exponent(close[-100:])
    
    # ADX — trend strength (INDUSTRY STANDARD)
    features['adx_14'] = compute_adx(df, 14)
    
    # === GROUP 7: TIME FEATURES ===
    features['hour_sin'] = np.sin(2 * np.pi * df.index[-1].hour / 24)
    features['hour_cos'] = np.cos(2 * np.pi * df.index[-1].hour / 24)
    features['day_of_week'] = df.index[-1].dayofweek / 6
    
    # === GROUP 8: ORDER FLOW (jeśli dostępne z OKX) ===
    # funding rate, open interest, liquidations
    
    return features  # ~30-40 features total
```

### 1.2 Model — XGBoost Ensemble (Industry Standard)

Dlaczego XGBoost a nie Deep Learning?
1. **Profesjonalne firmy quant** (Renaissance, Two Sigma) używają principally tree-based models
2. XGBoost z 30 features > Deep Learning z 30 features (przy małych datasets)
3. Training: sekundy vs godziny
4. Interpretability: feature importance → wiesz CO model widzi
5. Inference: 1-5ms vs 100-5000ms
6. Brak overfitting: regularization built-in (L1/L2, max_depth, min_child_weight)

```python
# ml_model.py
import xgboost as xgb
import lightgbm as lgb
from sklearn.model_selection import TimeSeriesSplit
import numpy as np

class TradingMLEnsemble:
    """
    Ensemble of 3 models for robust prediction:
    1. XGBoost — direction classification
    2. LightGBM — direction classification  
    3. XGBoost — return regression (for confidence)
    
    Final signal = weighted average of predictions
    """
    
    def __init__(self):
        self.xgb_clf = xgb.XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_weight=5,
            reg_alpha=0.1,
            reg_lambda=1.0,
            use_label_encoder=False,
            eval_metric='logloss',
            tree_method='gpu_hist',  # RTX 5070 Ti!
        )
        
        self.lgb_clf = lgb.LGBMClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_weight=5,
            reg_alpha=0.1,
            reg_lambda=1.0,
            device='gpu',  # RTX 5070 Ti!
        )
        
        self.xgb_reg = xgb.XGBRegressor(
            n_estimators=150,
            max_depth=5,
            learning_rate=0.05,
            tree_method='gpu_hist',
        )
        
        self.trained = False
        self.feature_importance = None
    
    def train(self, X, y_direction, y_return, eval_set=None):
        """
        Walk-forward training:
        - X: features DataFrame
        - y_direction: 1 (UP) / 0 (DOWN) / -1 (ignored NEUTRAL)
        - y_return: actual return (for regression)
        """
        # Filter out NEUTRAL labels
        mask = y_direction != -1  
        X_filtered = X[mask]
        y_filtered = y_direction[mask]
        y_ret_filtered = y_return[mask]
        
        # TimeSeriesSplit — CRITICAL: no future leaking
        tscv = TimeSeriesSplit(n_splits=5)
        
        self.xgb_clf.fit(X_filtered, y_filtered)
        self.lgb_clf.fit(X_filtered, y_filtered)
        self.xgb_reg.fit(X_filtered, y_ret_filtered)
        
        self.feature_importance = dict(zip(
            X.columns,
            (self.xgb_clf.feature_importances_ + self.lgb_clf.feature_importances_) / 2
        ))
        self.trained = True
    
    def predict(self, features):
        """
        Returns: { direction: 'UP'|'DOWN'|'NEUTRAL', confidence: 0-1, expected_return: float }
        """
        if not self.trained:
            return {'direction': 'NEUTRAL', 'confidence': 0.33, 'expected_return': 0}
        
        X = np.array([list(features.values())])
        
        xgb_proba = self.xgb_clf.predict_proba(X)[0]  # [P(DOWN), P(UP)]
        lgb_proba = self.lgb_clf.predict_proba(X)[0]
        xgb_return = self.xgb_reg.predict(X)[0]
        
        # Ensemble average
        avg_proba = (xgb_proba + lgb_proba) / 2
        
        # Direction with confidence
        if avg_proba[1] > 0.55:  # UP
            direction = 'UP'
            confidence = avg_proba[1]
        elif avg_proba[0] > 0.55:  # DOWN
            direction = 'DOWN'
            confidence = avg_proba[0]
        else:
            direction = 'NEUTRAL'
            confidence = max(avg_proba)
        
        # Fee-adjusted: don't trade if expected return < 2x fees
        min_return = 0.002  # 0.2% (2x round-trip fees of 0.1%)
        if abs(xgb_return) < min_return:
            direction = 'NEUTRAL'
        
        return {
            'direction': direction,
            'confidence': float(confidence),
            'expected_return': float(xgb_return),
            'xgb_proba': xgb_proba.tolist(),
            'lgb_proba': lgb_proba.tolist(),
            'feature_importance': {k: float(v) for k, v in 
                sorted(self.feature_importance.items(), key=lambda x: -x[1])[:10]}
        }
    
    def retrain_online(self, new_X, new_y_dir, new_y_ret):
        """
        Incremental retraining — co 24h z nowymi danymi.
        Walk-forward: trenuj na [T-90d, T-1d], waliduj na [T-1d, T].
        """
        # XGBoost incremental: load existing model, train additional trees
        self.xgb_clf.fit(new_X, new_y_dir, xgb_model=self.xgb_clf.get_booster())
        self.lgb_clf.fit(new_X, new_y_dir, init_model=self.lgb_clf.booster_)
        self.xgb_reg.fit(new_X, new_y_ret, xgb_model=self.xgb_reg.get_booster())
```

### 1.3 Python ML Service (FastAPI)

```python
# ml_service.py — uruchamiany na lokalnym PC obok Ollama
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
import numpy as np
import json
import httpx  # for Ollama calls

app = FastAPI(title="Turbo-Bot ML Service", version="1.0.0")
model = TradingMLEnsemble()
feature_engine = FeatureExtractor()

OLLAMA_URL = "http://localhost:11434"
OLLAMA_MODEL = "mistral:7b-instruct"  # lub qwen2.5:7b

class PredictRequest(BaseModel):
    candles: list  # [{ open, high, low, close, volume, timestamp }, ...]
    portfolio_value: float = 10000
    has_position: bool = False
    current_regime: str = "UNKNOWN"

class PredictResponse(BaseModel):
    direction: str
    confidence: float
    expected_return: float
    ollama_validation: dict | None = None
    features_used: int
    inference_ms: float

@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    t0 = time.time()
    
    # 1. Extract features
    df = pd.DataFrame(req.candles)
    features = feature_engine.extract(df)
    
    # 2. ML prediction (1-5ms)
    ml_result = model.predict(features)
    
    # 3. Ollama validation (200-500ms) — ONLY for non-NEUTRAL signals
    ollama_result = None
    if ml_result['direction'] != 'NEUTRAL' and ml_result['confidence'] > 0.55:
        ollama_result = await validate_with_ollama(ml_result, features, req)
        
        # If Ollama disagrees with high confidence → downgrade
        if ollama_result and ollama_result.get('agrees') == False:
            if ollama_result.get('confidence', 0) > 0.7:
                ml_result['confidence'] *= 0.7  # 30% penalty
                ml_result['direction'] = 'NEUTRAL'  # Ollama veto
    
    elapsed = (time.time() - t0) * 1000
    
    return PredictResponse(
        direction=ml_result['direction'],
        confidence=ml_result['confidence'],
        expected_return=ml_result['expected_return'],
        ollama_validation=ollama_result,
        features_used=len(features),
        inference_ms=round(elapsed, 1)
    )

async def validate_with_ollama(ml_result, features, req):
    """
    Ollama NIE predykuje ceny. 
    Ollama WALIDUJE reasoning: "Czy ten BUY ma sens biorąc pod uwagę kontekst?"
    """
    prompt = f"""Jestem systemem ML tradingowym. Moj model XGBoost/LightGBM wygenerował sygnał:
    
SYGNAŁ: {ml_result['direction']} z confidence {ml_result['confidence']:.1%}
Expected return: {ml_result['expected_return']:.4%}

KONTEKST RYNKOWY:
- RSI(14): {features.get('rsi_14', 'N/A'):.1f}
- MACD histogram: {features.get('macd_hist', 'N/A'):.4f}
- Volatility ratio (short/long): {features.get('vol_ratio', 'N/A'):.2f}
- Price vs SMA20: {features.get('price_sma20_ratio', 'N/A'):.2%}
- Price vs SMA50: {features.get('price_sma50_ratio', 'N/A'):.2%}
- Volume ratio: {features.get('vol_ratio_20', 'N/A'):.2f}
- Hurst exponent: {features.get('hurst', 'N/A'):.2f}
- ADX: {features.get('adx_14', 'N/A'):.1f}
- Regime: {req.current_regime}
- Position open: {req.has_position}

Top 5 features driving this signal:
{json.dumps(dict(list(ml_result['feature_importance'].items())[:5]), indent=2)}

Odpowiedz TYLKO w JSON:
{{"agrees": true/false, "confidence": 0.0-1.0, "reasoning": "max 50 words", "risk_flag": null/"high_vol"/"counter_trend"/"exhaustion"}}
"""
    
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.post(f"{OLLAMA_URL}/api/generate", json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": 200}
            })
            result = resp.json()
            return json.loads(result.get('response', '{}'))
    except Exception as e:
        return None  # Ollama offline = ML signal goes through unchanged

@app.post("/train")
async def retrain(req: dict):
    """Walk-forward retraining co 24h"""
    # ... download latest data, retrain, validate
    pass

@app.post("/backtest")
async def backtest(req: dict):
    """On-demand backtest z current modelem"""
    pass

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_trained": model.trained,
        "gpu": "RTX 5070 Ti",
        "ollama": OLLAMA_MODEL,
        "features": feature_engine.feature_count
    }

if __name__ == "__main__":
    # Start: python ml_service.py
    uvicorn.run(app, host="0.0.0.0", port=4000)
```

---

## FAZA 2: INTEGRACJA Z BOTEM (2-3 dni)

### 2.1 Nowy moduł w Node.js: `ml_client.js`

```javascript
// trading-bot/src/core/ai/ml_client.js
'use strict';

/**
 * ML Client — communicates with Python ML Service on GPU PC
 * Replaces: GRU PricePredictor (3K params)
 * Protocol: HTTP POST to ML service via SSH tunnel
 */
class MLClient {
    constructor(config = {}) {
        this.serviceUrl = config.mlServiceUrl || process.env.ML_SERVICE_URL || 'http://127.0.0.1:4001';
        this.timeoutMs = config.timeoutMs || 3000;
        this.isOnline = false;
        this.lastPrediction = null;
        this.stats = { calls: 0, successes: 0, failures: 0, avgLatencyMs: 0 };
    }

    async predict(candles, portfolioValue, hasPosition, regime) {
        try {
            const result = await this._post('/predict', {
                candles: candles.slice(-200).map(c => ({
                    open: c.open, high: c.high, low: c.low,
                    close: c.close, volume: c.volume,
                    timestamp: c.timestamp
                })),
                portfolio_value: portfolioValue,
                has_position: hasPosition,
                current_regime: regime
            });
            
            this.isOnline = true;
            this.lastPrediction = result;
            this.stats.successes++;
            return result;
        } catch (e) {
            this.isOnline = false;
            this.stats.failures++;
            return null; // Fallback: bot uses ensemble without ML
        }
    }
    // ... HTTP helpers similar to RemoteGPUClient
}

module.exports = { MLClient };
```

### 2.2 Zmiana w bot.js — ML signal z Python zamiast GRU

```javascript
// W executeTradingCycle():
// STARE: const aiSignal = await this.neuralAI.generateAISignal(candles, hasPosition);
// NOWE:
let mlPrediction = null;
if (this.mlClient && this.mlClient.isOnline) {
    mlPrediction = await this.mlClient.predict(
        candles, portfolio.totalValue, hasPosition, this.neuralAI.currentRegime
    );
}
// ML prediction → dodaj jako sygnał do ensemble z wagą 0.30
if (mlPrediction && mlPrediction.direction !== 'NEUTRAL') {
    allSignals.set('PythonML', {
        action: mlPrediction.direction === 'UP' ? 'BUY' : 'SELL',
        confidence: mlPrediction.confidence,
        price: currentPrice,
        strategy: 'PythonML',
        metadata: { 
            expectedReturn: mlPrediction.expected_return,
            ollamaValidated: !!mlPrediction.ollama_validation,
            inferenceMs: mlPrediction.inference_ms
        }
    });
}
```

### 2.3 Uproszczony pipeline (z 10 do 5 warstw)

```
NOWY PIPELINE:
1. DataPipeline → candles
2. StrategyRunner(5) + PythonML → signals
3. EnsembleVoting (Thompson Sampling weights) → consensus
4. RiskManager (circuit breaker + drawdown) → approve/reject
5. ExecutionEngine → OKX order

USUNIĘTE:
- Skynet Override Gate (redundant z Python ML)
- Defense Mode BUY block (przenieść do RiskManager)
- Starvation Override (nie potrzebny z uproszczonym pipeline)
- PRIME Gate (7 rules → zmniejszyć do 3 w RiskManager)
- QDV (Quantum Decision Verifier → zastąpić prostym VaR check)
```

---

## FAZA 3: OLLAMA JAKO STRATEGY REASONER (2-3 dni)

### 3.1 NOWA rola Ollama — nie decyduje, MYŚLI

Ollama nie powinien generować sygnałów BUY/SELL. Ollama powinien:

1. **Walidować** sygnały ML: "Czy ten BUY ma sens?"
2. **Generować reasoning** do logów: "Kupuję bo RSI oversold + volume spike + trend up"
3. **Wykrywać edge cases** których ML nie widzi: wiadomości, major events, wzorce behawioralne
4. **Post-trade analysis**: "Dlaczego ten trade stracił?"

### 3.2 Wybór modelu Ollama

| Model | VRAM | Speed | Trading quality | Rekomendacja |
|-------|------|-------|-----------------|-------------|
| llama3.2:3b | 2GB | 50 tok/s | ⚠️ Za mały — hallucynuje dużo | ❌ Pomiń |
| mistral:7b-instruct | 4GB | 30 tok/s | ✅ Dobry reasoning | ✅ REKOMENDOWANY |
| qwen2.5:7b | 4GB | 30 tok/s | ✅ Dobry na liczby | ✅ Alternatywa |
| deepseek-r1:8b | 5GB | 25 tok/s | ✅ Dobry chain-of-thought | 🟡 Opcja |
| llama3.1:8b | 5GB | 25 tok/s | ✅ Solid all-round | 🟡 Opcja |
| mistral:14b | 8GB | 15 tok/s | ✅✅ Najlepszy reasoning | 🟡 Jeśli VRAM ok |

**REKOMENDACJA:** `mistral:7b-instruct` — najlepszy stosunek jakość/VRAM/speed.
Na RTX 5070 Ti (16GB): 4GB model + 2GB XGBoost GPU = 6GB użyte, 10GB wolne.

### 3.3 Ollama Structured Output (krytyczne!)

```python
# Zamiast free-text, wymuś JSON output
VALIDATION_PROMPT = """You are a trading signal validator. 
Respond ONLY in valid JSON. No explanations outside JSON.
{"agrees": bool, "confidence": float, "reasoning": "max 30 words", "risk_flag": null|string}
"""

# Użyj Ollama /api/generate z format="json" (Ollama 0.1.23+)
resp = await client.post(f"{OLLAMA_URL}/api/generate", json={
    "model": "mistral:7b-instruct",
    "prompt": prompt,
    "format": "json",  # WYMUSZA JSON output
    "stream": False,
    "options": {"temperature": 0.1, "num_predict": 150}
})
```

---

## FAZA 4: REGIME DETECTION — PRAWIDŁOWA (1-2 dni)

### 4.1 Wyrzucić circular-reasoning neural regime detector

**Problem:** MarketRegimeDetector (200 params) trenuje się na etykietach ze swojej heurystyki.

**Rozwiązanie:** Statystyczne metody regime detection (industry standard):

```python
# regime_detection.py — w Python ML service
import numpy as np
from scipy import stats

def detect_regime(returns, prices, lookback=100):
    """
    Statistical regime detection — NO neural networks, NO circular reasoning.
    Based on: Hurst exponent + volatility clustering + trend statistics.
    """
    
    # 1. HURST EXPONENT — trending vs mean-reverting
    # H > 0.5 = trending, H < 0.5 = mean-reverting, H ≈ 0.5 = random walk
    hurst = compute_hurst_exponent(prices[-lookback:])
    
    # 2. VOLATILITY REGIME — GARCH(1,1) conditional volatility
    vol_short = np.std(returns[-10:]) * np.sqrt(252)  # annualized
    vol_long = np.std(returns[-50:]) * np.sqrt(252)
    vol_ratio = vol_short / (vol_long + 1e-8)
    
    # 3. TREND STRENGTH — linear regression R²
    x = np.arange(lookback)
    slope, _, r_value, p_value, _ = stats.linregress(x, prices[-lookback:])
    trend_r2 = r_value ** 2
    trend_direction = 1 if slope > 0 else -1
    
    # 4. ADX — Average Directional Index
    adx = compute_adx_value(prices, lookback=14)
    
    # REGIME CLASSIFICATION (statistical, not ML)
    if vol_ratio > 2.0 or vol_short > 0.60:
        regime = 'HIGH_VOLATILITY'
        confidence = min(0.95, 0.5 + vol_ratio * 0.15)
    elif adx > 25 and trend_r2 > 0.3 and hurst > 0.55:
        if trend_direction > 0:
            regime = 'TRENDING_UP'
        else:
            regime = 'TRENDING_DOWN'
        confidence = min(0.90, 0.5 + trend_r2 * 0.4)
    else:
        regime = 'RANGING'
        confidence = min(0.85, 0.5 + (1 - trend_r2) * 0.3)
    
    return {
        'regime': regime,
        'confidence': confidence,
        'statistics': {
            'hurst': hurst,           # <0.5=mean-revert, >0.5=trending
            'vol_ratio': vol_ratio,   # >2.0=high vol event
            'trend_r2': trend_r2,     # >0.3=significant trend
            'adx': adx,              # >25=trending, <20=ranging
            'p_value': p_value,       # <0.05=statistically significant trend
        }
    }

def compute_hurst_exponent(prices, max_lag=20):
    """Rescaled range (R/S) analysis — Hurst exponent"""
    lags = range(2, max_lag)
    tau = [np.sqrt(np.std(np.subtract(prices[lag:], prices[:-lag]))) for lag in lags]
    poly = np.polyfit(np.log(lags), np.log(tau), 1)
    return poly[0] * 2.0
```

---

## FAZA 5: CO ZOSTAWIĆ, CO WYRZUCIĆ

### ✅ ZOSTAWIĆ (dobre):
| Komponent | Dlaczego |
|-----------|----------|
| Thompson Sampling | Jedyny real Bayesian ML — poprawna implementacja |
| Feature Pipeline (RSI, MACD, BB, ATR) | Przydatne jako input do XGBoost |
| Risk Manager (circuit breaker + drawdown) | Solidna ochrona kapital |
| Execution Engine (Chandelier SL, partial TP) | Dobre position management |
| Experience Buffer (priority replay) | Przydatny do online retraining |
| Megatron Chat (komendy, status) | Dobry UX |
| Ollama integration (LLMRouter) | Infrastructure for Ollama validator |

### ❌ WYRZUCIĆ/ZASTĄPIĆ:
| Komponent | Problem | Zastępstwo |
|-----------|---------|----------|
| GRU PricePredictor (3K params) | Za mały, nic nie predykuje | Python XGBoost ensemble |
| MarketRegimeDetector (neural) | Circular reasoning | Statistical regime detection |
| NeuralRiskManager (50 params) | Model uczy się formułę Kelly | Kelly Criterion bezpośrednio |
| QDV (6 quantum checks) | Death spiral, zbyt restrykcyjny | Prosty VaR check w RiskManager |
| Skynet Override Gate | Redundant z ML | Usunąć |
| Defense Mode BUY Block | Powoduje starvation | Przenieść do RiskManager jako sizing reduction (nie block) |
| PRIME Gate (7 rules) | 4 rules redundant z innymi layers | Zostawić 3 krytyczne (drawdown, counter-trend, duplicate) |
| Quantum Monte Carlo (CPU) | Klasyczna symulacja z kwantowymi nazwami, zero advantage | Prosty historical VaR |
| VQC (4-qubit classifier) | 36 params classifier, circular training | Usunąć — regime detection w Python |
| QAOA | Simulated annealing w przebraniu | Thompson Sampling wystarczy |

### 🟡 UPROŚCIĆ:
| Komponent | Uproszczenie |
|-----------|-------------|
| Starvation Override | Niepotrzebny jeśli pipeline ma 5 warstw zamiast 10 |
| Config Evolution | Zostawić ale BEZ nazwy "Skynet" — to proste adaptive params |
| NeuronAI Fallback Rules | Uprościć do 3 reguł zamiast 100 linii if/else |

---

## HARMONOGRAM WDROŻENIA

```
TYDZIEŃ 1: FUNDAMENTY
├── Dzień 1-2: Backtest infrastructure + dane historyczne
├── Dzień 3:   Backtest ALL 5 strategii → DECYZJA co zostawić
├── Dzień 4-5: Python ML service (XGBoost + feature engineering)
└── Dzień 5:   Setup Ollama mistral:7b-instruct na local PC

TYDZIEŃ 2: INTEGRACJA
├── Dzień 6-7: ml_client.js + integracja z bot.js
├── Dzień 8:   Statistical regime detection w Python
├── Dzień 9:   Uproszczenie pipeline (10 → 5 warstw)
└── Dzień 10:  Ollama validator integration

TYDZIEŃ 3: WALIDACJA
├── Dzień 11-12: Walk-forward backtest Z NOWYM pipeline
├── Dzień 13:    Paper trading start (live OKX data, simulated execution)
├── Dzień 14:    Monitoring + bug fixing
└──             Minimum 2 TYGODNIE paper trading przed real money
```

---

## METRYKI SUKCESU (czy nowy system działa?)

| Metryka | Target minimum | Target good | Jak mierzyć |
|---------|---------------|-------------|-------------|
| Win Rate (after fees) | > 45% | > 52% | backtest + paper trading |
| Profit Factor | > 1.3 | > 1.8 | sum(wins) / sum(losses) |
| Sharpe Ratio (annualized) | > 0.8 | > 1.5 | mean(daily returns) / std(daily returns) * √252 |
| Max Drawdown | < 15% | < 10% | max peak-to-trough |
| Trades per day | 3-8 | 5-12 | actual count |
| ML prediction accuracy | > 52% | > 55% | directional accuracy after fees |
| Ollama validation rate | > 70% agrees | > 80% | % times Ollama agrees with ML |
| Average trade hold time | 30min - 4h | 1-2h | median hold time |
| Fee-adjusted expectancy per trade | > $0.50 | > $2.00 | avg PnL after all fees |

---

## KOSZTY REALNE

| Koszt | Kwota | Cel |
|-------|-------|-----|
| VPS (DigitalOcean) | ~$24/mies | Bot hosting |
| Local PC electricity | ~$15/mies | GPU (RTX 5070 Ti) 24/7 |
| OKX data | $0 | Free REST API |
| Ollama | $0 | Open source, local |
| XGBoost/LightGBM | $0 | Open source |
| GitHub API (GPT-4o) | $0 (free tier) | Optional backup LLM |
| **TOTAL** | **~$39/mies** | **Full professional setup** |

---

## PODSUMOWANIE — CO SIĘ ZMIENIA

| Aspekt | TERAZ | DOCELOWO |
|--------|-------|----------|
| **ML Model** | GRU 3K params (zabawka) | XGBoost + LightGBM ensemble (industry standard) |
| **Regime Detection** | Neural 200 params (circular) | Statistical (Hurst + ADX + regression) |
| **Decision Making** | 10-layer pipeline, ~7% pass rate | 5-layer pipeline, ~30-40% pass rate |
| **GPU Usage** | Quantum simulation (no advantage) | XGBoost training + Ollama validation |
| **Ollama Role** | Last-resort LLM fallback | Active trade validator (structured JSON) |
| **Backtesting** | ZERO | Walk-forward with proper fee accounting |
| **Evidence** | None | Sharpe, PF, win rate, max DD — measured |
| **"Quantum"** | Marketing name for classical math | Removed (honest naming) |
| **"Skynet"** | Marketing name for if/else + 3K GRU | Removed — replaced with "ML Ensemble" |
| **Training** | 5 epochs online on tiny buffer | Daily walk-forward retrain on GPU |
| **Inference speed** | ~100ms (GRU) / ~1-5s (LLM) | ~5ms (XGBoost) + ~300ms (Ollama optional) |

---

## KOŃCOWA REKOMENDACJA

**Zacznij od FAZY 0 (backtest).** Jeśli żadna z 5 strategii nie ma positive expectancy po fees → cała reszta jest akademicka. 

Backtest pokaże:
1. Które strategie zarabiają (zachować)
2. Które strategie tracą (wyrzucić)
3. Jaki jest baseline win rate bez ML (punkt odniesienia)
4. Czy ML może dodać alpha (porównanie ML vs no-ML)

**Bez backtesta, budowanie ML service = budowanie na piasku.**

---

*Plan oparty na krytycznej analizie kodu linia po linii + industry best practices z quant trading.*
