# 🧠 ML Learning System - Kompletny Przewodnik

## 📋 Spis Treści
1. [Zbieranie Danych](#zbieranie-danych)
2. [Experience Replay Buffer](#experience-replay-buffer)
3. [Proces Uczenia](#proces-uczenia)
4. [Monitorowanie](#monitorowanie)
5. [API Endpoints](#api-endpoints)
6. [Analiza Danych](#analiza-danych)

---

## 📊 Zbieranie Danych

Bot zbiera **500+ features** co **30 sekund** podczas tradingu:

### Kategorie Danych:

#### 1. Technical Indicators (200+ features)
```typescript
{
  rsi_14, rsi_21, rsi_30,              // RSI w różnych okresach
  ema_9, ema_21, ema_50, ema_200,      // Exponential Moving Averages
  sma_20, sma_50, sma_200,             // Simple Moving Averages
  macd, macd_signal, macd_histogram,   // MACD indicators
  bollinger_upper, bollinger_middle, bollinger_lower,  // Bollinger Bands
  stochastic_k, stochastic_d,          // Stochastic oscillator
  williams_r, cci, momentum, roc,      // Momentum indicators
  adx, atr,                            // Trend + Volatility
  volatility_1h, volatility_4h, volatility_1d  // Multi-timeframe volatility
}
```

#### 2. Volume Indicators (30+ features)
```typescript
{
  volume_sma_20,        // Volume moving average
  vwap,                 // Volume-Weighted Average Price
  obv,                  // On-Balance Volume
  volume_ratio,         // Current vs average volume
  buying_pressure,      // Buy volume ratio
  selling_pressure      // Sell volume ratio
}
```

#### 3. Price Patterns (20+ features)
```typescript
{
  doji, hammer, shooting_star,           // Candlestick patterns
  engulfing_bullish, engulfing_bearish,  // Reversal patterns
  three_white_soldiers, three_black_crows // Continuation patterns
}
```

#### 4. Cross-Asset Correlations (100+ features)
```typescript
{
  btc_eth_correlation,     // BTC-ETH price correlation
  dollar_index,            // USD strength
  sp500, nasdaq,           // Stock market indices
  gold_price, oil_price,   // Commodities
  total_crypto_mcap,       // Crypto market cap
  defi_tvl                 // DeFi Total Value Locked
}
```

#### 5. Sentiment Indicators (50+ features)
```typescript
{
  news_sentiment,          // News sentiment score
  social_sentiment,        // Social media sentiment
  fear_greed_index,        // Crypto Fear & Greed Index
  reddit_mentions,         // Reddit mentions count
  twitter_volume,          // Twitter activity
  google_trends            // Google search trends
}
```

#### 6. Temporal Features (50+ features)
```typescript
{
  hour_of_day,            // 0-23
  day_of_week,            // 0-6 (Sunday=0)
  month_of_year,          // 1-12
  market_session,         // 'asian'/'european'/'american'
  is_weekend,             // boolean
  is_holiday,             // boolean
  days_since_halving      // Bitcoin-specific
}
```

### Przykład Realnego Market State:

```json
{
  "timestamp": 1765176337496,
  "price": 91607.3,
  "volume": 1234567.89,
  "indicators": {
    "rsi_14": 45.2,
    "ema_21": 91450.5,
    "macd": 12.3,
    "macd_signal": 8.7,
    "macd_histogram": 3.6,
    "bollinger_upper": 92100,
    "bollinger_middle": 91400,
    "bollinger_lower": 90800,
    "atr": 850.2,
    "adx": 28.5
  },
  "sentiment": {
    "fear_greed_index": 52
  },
  "temporal": {
    "hour_of_day": 14,
    "day_of_week": 0,
    "market_session": "american"
  }
}
```

---

## 💾 Experience Replay Buffer

Bot przechowuje **100,000 experiences** w zaawansowanym bufferze z **prioritized sampling**.

### Struktura Experience:

```typescript
interface Experience {
  state: Float32Array;        // 500+ features current market state
  action: DeepRLAction;       // { type: 'BUY'|'SELL'|'HOLD', confidence, size }
  reward: number;             // P&L-based reward
  next_state: Float32Array;   // 500+ features next market state
  done: boolean;              // Episode finished?
  
  td_error?: number;          // Temporal Difference error (for priority)
  priority?: number;          // Sampling priority (0-1)
  timestamp: number;          // Unix timestamp
  market_regime?: string;     // 'bull'|'bear'|'sideways'
  reasoning?: string;         // Human-readable explanation
}
```

### Przykład Experience:

```json
{
  "state": [91607.3, 45.2, 1234567, ...],  // 500 numbers
  "action": {
    "type": "BUY",
    "confidence": 0.68,
    "position_size": 0.002729,
    "reasoning": "RSI oversold + volume spike"
  },
  "reward": -0.25,  // Trading fees (positive after profitable close)
  "next_state": [91627.3, 47.8, 1100000, ...],
  "done": false,
  "td_error": 0.12,
  "priority": 0.85,
  "timestamp": 1765176337496,
  "market_regime": "sideways"
}
```

### Prioritized Sampling:

Bot NIE uczy się równomiernie ze wszystkich doświadczeń. Używa **Prioritized Experience Replay**:

```
priority = |TD_error|^0.6 + ε

gdzie:
- TD_error = |predicted_reward - actual_reward|
- ε = 0.000001 (małe epsilon zapobiega zero priority)
- 0.6 = exponent (balans między uniformity a greedy)
```

**Znaczenie:**
- Experiences z **wysokim TD_error** (model się mylił) → **wyższy priorytet** → częściej używane do uczenia
- Experiences z **niskim TD_error** (model miał rację) → **niższy priorytet** → rzadziej używane

### Buffer Statistics (po 100 trades):

```
High priority (>0.9):   23 experiences  → Most valuable for learning
Medium priority (0.5-0.9): 65 experiences  → Standard learning data
Low priority (<0.5):    12 experiences  → Already learned patterns
```

---

## 🎓 Proces Uczenia

### 6-Stopniowy Cykl Uczenia:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. COLLECT MARKET DATA (every 30s)                         │
│    → 500+ features from market, indicators, sentiment      │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ML DECISION                                              │
│    → enterpriseML.processStep(price, rsi, volume, position)│
│    → Returns: { type: 'BUY', confidence: 0.68, size: X }   │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. EXECUTE TRADE                                            │
│    → BUY 0.002729 BTC @ $91607.3                           │
│    → Track: entry_price, entry_time, fees                  │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. CALCULATE REWARD (after trade close)                    │
│    → PnL: +$15                                              │
│    → Duration: 2 hours                                      │
│    → Volatility: 0.02                                       │
│    → reward = log(1 + 15) - 0.1 + 0 = 2.67 ✅             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. STORE IN BUFFER                                          │
│    → experience = { state, action, reward, next_state }    │
│    → priority = calculatePriority(td_error)                │
│    → buffer.addExperience(experience)                      │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. TRAIN MODEL (every 5 minutes OR after 10 trades)        │
│    → batch = buffer.samplePrioritized(32)                  │
│    → predictions = model.forward(batch.states)             │
│    → loss = mean(|predictions - rewards|²)                 │
│    → gradients = backward(loss)                            │
│    → weights -= learning_rate * gradients                  │
│    → buffer.updatePriorities(new_td_errors)                │
│    ✅ MODEL UPDATED!                                       │
└─────────────────────────────────────────────────────────────┘
```

### Reward Calculation Formula:

```typescript
function calculateReward(pnl, duration, marketConditions) {
  // Base reward (logarithmic for stability)
  const baseReward = pnl > 0 
    ? Math.log(1 + pnl) 
    : -Math.log(1 + Math.abs(pnl));
  
  // Duration penalty (encourage faster trades)
  const durationPenalty = duration > 3600 ? -0.1 : 0;
  
  // Volatility bonus (reward trading in volatile markets)
  const volatilityBonus = marketConditions.volatility > 0.03 ? 0.1 : 0;
  
  return baseReward + durationPenalty + volatilityBonus;
}
```

### Przykłady Kalkulacji:

**Trade #1: Profitable Long**
```
PnL: +$15
Duration: 7200s (2 hours)
Volatility: 0.02

baseReward = log(1 + 15) = log(16) = 2.77
durationPenalty = 7200 > 3600 ? -0.1 : 0 = -0.1
volatilityBonus = 0.02 > 0.03 ? 0.1 : 0 = 0

Final Reward: 2.77 - 0.1 + 0 = 2.67 ✅ POSITIVE
```

**Trade #2: Small Loss**
```
PnL: -$8
Duration: 1800s (30 min)
Volatility: 0.05

baseReward = -log(1 + 8) = -log(9) = -2.20
durationPenalty = 1800 > 3600 ? -0.1 : 0 = 0
volatilityBonus = 0.05 > 0.03 ? 0.1 : 0 = 0.1

Final Reward: -2.20 + 0 + 0.1 = -2.10 ❌ NEGATIVE
```

### Learning Rate Schedule:

```
Episodes 0-100:    learning_rate = 0.001  (aggressive learning)
Episodes 100-500:  learning_rate = 0.0005 (fine-tuning)
Episodes 500+:     learning_rate = 0.0001 (stable operation)
```

---

## 📊 Monitorowanie

### 1. Przez API Endpoints

```bash
# Performance metrics
curl http://localhost:3001/api/ml/performance

# Response:
{
  "episodes": 150,
  "totalReward": 15.2,
  "averageReward": 0.101,
  "winRate": 0.58,
  "sharpeRatio": 1.42,
  "maxDrawdown": -0.125,
  "explorationRate": 0.15,
  "learningPhase": "LEARNING"
}

# Buffer status
curl http://localhost:3001/api/ml/buffer/status

# Response:
{
  "size": 150,
  "capacity": 100000,
  "utilizationPercent": "0.15",
  "totalSamples": 4800,
  "avgPriority": 0.78
}

# Recent experiences
curl http://localhost:3001/api/ml/experiences?limit=10

# Export all data
curl http://localhost:3001/api/ml/experiences/export > data.json
```

### 2. Przez Logi

```bash
# Real-time monitoring
tail -f logs/autonomous_bot.log | grep "ML Learning"

# Zobaczysz:
[INFO] 📚 ML Learning: PnL=15.0000, Reward=2.6700
[DEBUG] 🧠 ML Action: BUY (confidence: 0.680)
[INFO] ⚖️ Weights adjusted: deep_rl=0.28, xgboost=0.22
[DEBUG] 📊 Buffer status: 150/100000 (0.15%), avg_priority=0.78
```

### 3. Przez Dashboard

```
http://localhost:3001/dashboard

Zobaczysz:
- Win rate over time
- Reward progression
- Learning phase
- Top patterns discovered
```

---

## 🌐 API Endpoints

### Complete List:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ml/performance` | GET | Performance metrics (win rate, sharpe, etc) |
| `/api/ml/buffer/status` | GET | Experience buffer statistics |
| `/api/ml/experiences?limit=N` | GET | Last N experiences |
| `/api/ml/patterns` | GET | Discovered profitable patterns |
| `/api/ml/experiences/export` | GET | Export all experiences as JSON |
| `/api/ml/metrics/history` | GET | Export metrics as CSV |

### Usage Examples:

**1. Check Learning Progress:**
```bash
watch -n 30 'curl -s http://localhost:3001/api/ml/performance | jq'
```

**2. Monitor Buffer Growth:**
```bash
while true; do
  curl -s http://localhost:3001/api/ml/buffer/status | jq '.size, .utilizationPercent'
  sleep 60
done
```

**3. Export for Analysis:**
```bash
# Export experiences
curl http://localhost:3001/api/ml/experiences/export > experiences_$(date +%Y%m%d).json

# Export metrics
curl http://localhost:3001/api/ml/metrics/history > metrics_$(date +%Y%m%d).csv
```

---

## 📈 Analiza Danych

### Python Analysis Script:

```python
import pandas as pd
import json
import matplotlib.pyplot as plt
import numpy as np

# ==============================
# 1. LOAD DATA
# ==============================

with open('experiences.json') as f:
    data = json.load(f)

df = pd.DataFrame(data)

# ==============================
# 2. BASIC STATISTICS
# ==============================

print(f"Total experiences: {len(df)}")
print(f"Win rate: {df[df.reward > 0].shape[0] / len(df):.2%}")
print(f"Avg reward: {df.reward.mean():.4f}")
print(f"High priority experiences: {df[df.priority > 0.9].shape[0]}")

# ==============================
# 3. REWARD DISTRIBUTION
# ==============================

plt.figure(figsize=(15, 5))

plt.subplot(131)
plt.hist(df.reward, bins=50, alpha=0.7)
plt.title('Reward Distribution')
plt.xlabel('Reward')
plt.ylabel('Frequency')

plt.subplot(132)
df.plot(y='reward', ax=plt.gca(), title='Rewards over Time')
plt.ylabel('Reward')
plt.xlabel('Experience #')

plt.subplot(133)
df['cumulative_reward'] = df.reward.cumsum()
df.plot(y='cumulative_reward', ax=plt.gca(), title='Cumulative Reward')
plt.ylabel('Cumulative Reward')
plt.xlabel('Experience #')

plt.tight_layout()
plt.show()

# ==============================
# 4. ACTION ANALYSIS
# ==============================

action_counts = df['action'].apply(lambda x: x['type']).value_counts()
print("\nAction Distribution:")
print(action_counts)

# Win rate by action
for action_type in ['BUY', 'SELL', 'HOLD']:
    action_df = df[df['action'].apply(lambda x: x['type'] == action_type)]
    if len(action_df) > 0:
        win_rate = action_df[action_df.reward > 0].shape[0] / len(action_df)
        avg_reward = action_df.reward.mean()
        print(f"{action_type}: Win Rate {win_rate:.2%}, Avg Reward {avg_reward:.4f}")

# ==============================
# 5. PRIORITY ANALYSIS
# ==============================

plt.figure(figsize=(10, 5))
plt.scatter(df.index, df.priority, c=df.reward, cmap='RdYlGn', alpha=0.6)
plt.colorbar(label='Reward')
plt.title('Experience Priority vs Reward')
plt.xlabel('Experience #')
plt.ylabel('Priority')
plt.show()

# ==============================
# 6. MARKET REGIME ANALYSIS
# ==============================

regime_performance = df.groupby('market_regime').agg({
    'reward': ['mean', 'std', 'count'],
    'priority': 'mean'
})
print("\nPerformance by Market Regime:")
print(regime_performance)

# ==============================
# 7. HIGH-VALUE PATTERNS
# ==============================

# Find experiences with high positive rewards
top_trades = df[df.reward > df.reward.quantile(0.9)]
print(f"\nTop 10% trades (n={len(top_trades)}):")
print(f"Avg reward: {top_trades.reward.mean():.4f}")
print(f"Avg priority: {top_trades.priority.mean():.4f}")

# Analyze their reasoning
print("\nMost common reasoning in profitable trades:")
reasoning_counts = top_trades['reasoning'].value_counts().head(5)
print(reasoning_counts)
```

### Export Script:

```bash
#!/bin/bash
# save_ml_data.sh

DATE=$(date +%Y%m%d_%H%M%S)
EXPORT_DIR="ml_exports/$DATE"

mkdir -p "$EXPORT_DIR"

echo "Exporting ML data to $EXPORT_DIR..."

# Export experiences
curl -s http://localhost:3001/api/ml/experiences/export > "$EXPORT_DIR/experiences.json"

# Export metrics
curl -s http://localhost:3001/api/ml/metrics/history > "$EXPORT_DIR/metrics.csv"

# Export performance
curl -s http://localhost:3001/api/ml/performance > "$EXPORT_DIR/performance.json"

# Export buffer status
curl -s http://localhost:3001/api/ml/buffer/status > "$EXPORT_DIR/buffer_status.json"

echo "Export complete!"
ls -lh "$EXPORT_DIR"
```

---

## 🎯 Discovered Patterns (Examples)

Bot może odkryć takie wzorce (przewidywane):

### Pattern #1: RSI Oversold Reversal
```
Rule: IF rsi < 30 AND volume > avg*1.5 AND macd_histogram > 0 THEN BUY
Discovered: Episode 23
Win Rate: 68%
Trades: 22
Avg Profit: $8.50
Confidence Evolution: 0.50 → 0.68 → 0.75
```

### Pattern #2: Bollinger Squeeze Breakout
```
Rule: IF bollinger_width < threshold AND volume_spike THEN BUY
Discovered: Episode 45
Win Rate: 61%
Trades: 18
Avg Profit: $12.30
Confidence Evolution: 0.45 → 0.61 → 0.72
```

### Pattern #3: Overbought Resistance Rejection
```
Rule: IF rsi > 70 AND near_resistance AND decreasing_volume THEN SELL
Discovered: Episode 67
Win Rate: 73%
Trades: 15
Avg Profit: $6.80
Confidence Evolution: 0.55 → 0.73 → 0.81
```

### Rejected Pattern: High Volatility Hold
```
Rule: IF volatility > 0.05 THEN HOLD
Discovered: Episode 34
Win Rate: 43% (below 50%)
Trades: 12
Status: Disabled after episode 52
Reason: Underperformance (win_rate < 50%)
```

---

## 📈 Learning Evolution

Przewidywana ewolucja wydajności:

```
Episode   | Win Rate | Sharpe | Avg Reward | Phase       | Status
----------|----------|--------|------------|-------------|------------------
10        | 42%      | 0.8    | -0.05      | WARMUP      | 🔴 Exploring
50        | 48%      | 1.1    | 0.02       | LEARNING    | 🟡 Improving
100       | 52%      | 1.3    | 0.08       | LEARNING    | 🟡 Pattern discovery
200       | 56%      | 1.5    | 0.12       | AUTONOMOUS  | 🟢 Optimization
500       | 62%      | 1.8    | 0.18       | AUTONOMOUS  | 🟢 Production ready
```

---

## 🚀 Quick Start

```bash
# 1. Start bot
docker run -d --name trading-bot \
  -p 3001:3001 -p 9090:9090 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  autonomous-trading-bot:4.1.3

# 2. Monitor learning
watch -n 30 'curl -s http://localhost:3001/api/ml/performance | jq'

# 3. Check logs
docker logs -f trading-bot | grep "ML Learning"

# 4. Export data daily
curl http://localhost:3001/api/ml/experiences/export > data_$(date +%Y%m%d).json

# 5. Analyze
python analyze_ml.py
```

---

## 📚 References

- **Experience Buffer**: `trading-bot/src/core/ml/experience_buffer_fixed.ts`
- **ML System**: `trading-bot/src/core/ml/enterprise_ml_system.ts`
- **Types**: `trading-bot/src/core/ml/types.ts` (MarketState interface)
- **Main Bot**: `trading-bot/autonomous_trading_bot_final.ts` (API endpoints)

---

## ❓ FAQ

**Q: Ile danych bot musi zebrać żeby zacząć być rentowny?**
A: Przewidywane ~200 episodes (transakcji) żeby osiągnąć >55% win rate.

**Q: Czy mogę wyeksportować dane i trenować własny model?**
A: Tak! Użyj `/api/ml/experiences/export` i trenuj w Python/PyTorch/TensorFlow.

**Q: Jak szybko bot uczy się nowych wzorców?**
A: Pierwsze wzorce pojawiają się po ~20-50 episodes. Optymalizacja trwa do ~500 episodes.

**Q: Czy mogę zobaczyć co bot aktualnie "myśli"?**
A: Tak! `/api/ml/experiences?limit=1` pokazuje ostatnią decyzję z reasoning.

**Q: Co jeśli chcę zresetować uczenie?**
A: Wyczyść experience buffer (restart bota z nowym wolumenem Docker).

---

**Autor:** Autonomous Trading Bot ML Team  
**Wersja:** 4.1.3  
**Data:** 2025-01-08
