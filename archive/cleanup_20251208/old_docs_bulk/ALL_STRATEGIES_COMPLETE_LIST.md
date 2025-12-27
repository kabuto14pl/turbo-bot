# 📊 WSZYSTKIE STRATEGIE W BOCIE - KOMPLETNA LISTA

**Data**: 2025-12-06

═══════════════════════════════════════════════════════════════════════════

## ✅ AKTYWNE STRATEGIE (UŻYWANE PRZEZ LIVE BOT)

**Bot używa TYLKO 2 strategie** zakodowane inline w `autonomous_trading_bot_final.ts`:

### **1. AdvancedAdaptive** (linie 1060-1118)
```
Status: ✅ AKTYWNA - LIVE PRODUCTION
Typ: Multi-wskaźnikowa, trend-following
Lokalizacja: autonomous_trading_bot_final.ts (inline)

Wskaźniki:
- SMA 20/50 (trend)
- RSI 14 (momentum)
- MACD (signal + histogram)
- Bollinger Bands (volatility)
- Volume Profile (confirmation)

Logika:
- Liczy bullish/bearish signals (6 wskaźników)
- BUY: ≥3 bullish signals dominujące
- SELL: ≥3 bearish signals dominujące
- Confidence: 0.6-0.95 (zależnie od liczby sygnałów)
```

### **2. RSITurbo** (linie 1132-1166)
```
Status: ✅ AKTYWNA - LIVE PRODUCTION
Typ: RSI-based z moving average confirmation
Lokalizacja: autonomous_trading_bot_final.ts (inline)

Wskaźniki:
- RSI 14 (core)
- RSI MA 5 (smoothed trend)

Logika:
- BUY: RSI < 25 AND RSI > RSI_MA (oversold reversal)
- SELL: RSI > 75 AND RSI < RSI_MA (overbought reversal)
- Confidence: 0.8 fixed
```

═══════════════════════════════════════════════════════════════════════════

## ⏸️ STRATEGIE CLASS-BASED (NIEUŻYWANE - 32 PLIKI)

**Wszystkie poniższe strategie są GOTOWE ale NIE używane przez live bot.**

Bot używa inline strategies zamiast importowania class-based versions.

---

### **MOMENTUM STRATEGIES (5)**

```
3. EnhancedRSITurbo                (enhanced_rsi_turbo.ts)
   Import: main.ts, tools/
   Wskaźniki: RSI + MACD + SMA trend

4. EnhancedRSITurboSentiment       (enhanced_rsi_turbo_sentiment.ts)
   Dodatkowo: sentiment analysis

5. RSITurbo                        (rsi_turbo.ts)
   Prostsza wersja enhanced

6. MomentumPro                     (momentum_pro.ts)
   Import: main.ts, tools/
   Extends: BaseStrategy

7. MomentumConfirmation            (momentum_confirmation.ts)
   Import: main.ts
```

### **TREND-FOLLOWING STRATEGIES (4)**

```
8. AdvancedAdaptiveStrategyFixed   (advanced_adaptive_strategy_fixed.ts)
   Import: main.ts
   "Fixed" version strategii z błędami

9. SuperTrend                      (supertrend.ts)
   Import: main.ts, tools/
   Wskaźniki: SuperTrend + ATR

10. MACrossover                    (ma_crossover.ts)
    Import: main.ts, tools/
    Extends: BaseStrategy
    Wskaźniki: SMA crossovers

11. AdvancedAdaptiveStrategy       (advanced_adaptive_strategy.ts)
    ❌ DISABLED - błędy kompilacji
```

### **MEAN REVERSION STRATEGIES (5)**

```
12. BollingerBands                 (bollinger_bands.ts)
    Wskaźniki: Bollinger Bands (upper/lower/middle)

13. PairsTrading                   (pairs_trading.ts)
    Import: kafka_real_time_streaming_final.ts
    Typ: Statistical arbitrage

14. PairsTradingClean              (pairs_trading_clean.ts)
    ⚠️ DUPLIKAT - "clean" version

15. PairsTradingFixed              (pairs_trading_fixed.ts)
    ⚠️ DUPLIKAT - "fixed" version

16. PairsTradingOld                (pairs_trading_old.ts)
    ⚠️ DUPLIKAT - "old" version
```

### **MARKET MAKING & GRID (3)**

```
17. MarketMaking                   (market_making.ts)
    Typ: Liquidity provision (bid/ask spread)

18. GridTrading                    (grid_trading.ts)
    Typ: Buy/sell na grid levels

19. Scalping                       (scalping.ts)
    Typ: High-frequency scalping
```

### **ML/RL STRATEGIES (2)**

```
20. RLStrategy                     (rl_strategy.ts)
    Import: core/rl/rl_integration_manager.ts
    Typ: Reinforcement Learning (PPO/DQN)
    Imports: AbstractStrategy

21. MLEnhancedEnterpriseStrategyEngine (ml_enhanced_enterprise_strategy_engine.ts)
    Typ: Enterprise + ML enhancement
```

### **ENTERPRISE/META STRATEGIES (5)**

```
22. EnterpriseStrategyEngine       (enterprise_strategy_engine.ts)
    Typ: Multi-strategy orchestration
    Features: Signal aggregation, voting, performance tracking
    Extends: EventEmitter

23. EnterpriseStrategyEngineV2     (enterprise_strategy_engine_v2.ts)
    Newer version (v2)

24. EnterpriseStrategyManager      (enterprise_strategy_manager.ts)
    Typ: Strategy lifecycle management

25. MetaStrategySystem             (meta_strategy_system.ts)
    Import: main.ts, tools/test_scenarios.ts
    Typ: Meta-strategy (wybór najlepszej dynamicznie)

26. MetaModel                      (meta_model.ts)
    Typ: Meta-learning model
```

### **UTILITIES & BASE CLASSES (8)**

```
27. AdvancedSignalGenerator        (advanced_signal_generator.ts)
    Typ: Signal generation utilities

28. MultiTimeframeAnalyzer         (multi_timeframe_analyzer.ts)
    Extends: EventEmitter
    Features: Analiza 1m/5m/15m/1h/4h/1d

29. AbstractStrategy               (abstract_strategy.ts)
    Typ: Interface dla strategies
    Używane przez: rl_strategy, enterprise_ml_strategy

30. BaseStrategy                   (base_strategy.ts)
    Typ: Abstract base class
    Extends: Strategy interface
    Używane przez: ma_crossover, momentum_pro

31. BaseStrategy (CAPS)            (BaseStrategy.ts)
    ⚠️ DUPLIKAT różne wielkości liter?

32. BaseStrategyFixed              (base_strategy_fixed.ts)
    ⚠️ DUPLIKAT - "fixed" version

33. BaseStrategyFixedClean         (base_strategy_fixed_clean.ts)
    ⚠️ DUPLIKAT - "fixed clean" version

34. RsiAbove                       (conditions/RsiAbove.ts)
    Typ: RSI condition helper
```

═══════════════════════════════════════════════════════════════════════════

## 📊 PODSUMOWANIE STATYSTYK

```
TOTAL STRATEGII: 34

AKTYWNE (LIVE):           2  (inline w bot_final.ts)
CLASS-BASED READY:       28  (gotowe, nieużywane)
DUPLIKATY:                4  (pairs×3, base×3)
BŁĘDY KOMPILACJI:         1  (advanced_adaptive_strategy.ts)

PODZIAŁ WG TYPU:
- Momentum:               5
- Trend-following:        4
- Mean reversion:         5
- Market making/Grid:     3
- ML/RL:                  2
- Enterprise/Meta:        5
- Utilities/Base:         8
- Duplikaty:              4
```

═══════════════════════════════════════════════════════════════════════════

## 🎯 KLUCZOWE ODKRYCIE

**LIVE BOT NIE UŻYWA CLASS-BASED STRATEGIES!**

```typescript
autonomous_trading_bot_final.ts:
✅ Używa: 2 inline strategies (AdvancedAdaptive, RSITurbo)
❌ NIE importuje: Żadnej z 32 class-based strategies

main.ts (NIEAKTYWNY):
✅ Importuje: 11 class-based strategies
❌ NIE używany: Bot używa autonomous_bot_final.ts zamiast main.ts
```

═══════════════════════════════════════════════════════════════════════════

**Koniec Listy**  
**Total: 34 strategie** (2 aktywne + 28 ready + 4 duplikaty)
