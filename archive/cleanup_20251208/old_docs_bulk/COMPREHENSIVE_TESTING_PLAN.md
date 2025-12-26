# 🔬 COMPREHENSIVE TESTING PLAN - AUTONOMOUS TRADING BOT

**Wersja dokumentu:** 1.0.0  
**Data utworzenia:** 1 Listopada 2025  
**Projekt:** Turbo Bot - Autonomous Trading System  
**Autor:** QA Engineering Team  
**Status:** Final Enterprise-Grade Testing Framework

---

## 📋 SPIS TREŚCI

1. [Streszczenie Wykonawcze](#1-streszczenie-wykonawcze)
2. [Zakres i Architektura](#2-zakres-i-architektura)
3. [Cele Testów](#3-cele-testów)
4. [Rodzaje Testów](#4-rodzaje-testów)
5. [Szczegółowe Przypadki Testowe (80+)](#5-szczegółowe-przypadki-testowe)
6. [Dane Testowe i Mocki](#6-dane-testowe-i-mocki)
7. [Skrypty Automatyzacji](#7-skrypty-automatyzacji)
8. [Metryki i Kryteria Akceptacyjne](#8-metryki-i-kryteria-akceptacyjne)
9. [Plan Testów Regresyjnych i CI](#9-plan-testów-regresyjnych-i-ci)
10. [Szablon Raportu Testowego](#10-szablon-raportu-testowego)
11. [Checklist Must-Pass](#11-checklist-must-pass)
12. [Załączniki](#12-załączniki)

---

## 1. STRESZCZENIE WYKONAWCZE

### 1.1. Cel Dokumentu

Niniejszy dokument stanowi **kompleksowy, enterprise-grade plan testowania** dla autonomicznego bota tradingowego znajdującego się w finalnej fazie rozwoju przed wdrożeniem produkcyjnym. Plan obejmuje **wszystkie aspekty** systemu - od jednostkowych testów funkcjonalnych po kompleksowe testy odporności na awarie i zgodności regulacyjnej.

### 1.2. Krytyczne Wymagania Jakościowe

Bot tradingowy operuje na rzeczywistych środkach finansowych w środowisku 24/7, co wymaga:

- ✅ **Zero błędów krytycznych** w logice wykonywania zleceń
- ✅ **100% pokrycie** scenariuszy zarządzania ryzykiem
- ✅ **Pełna idempotencja** operacji zleceniowych
- ✅ **Deterministyczna odporność** na awarie sieci, brokera, bazy danych
- ✅ **Bezwzględna zgodność** z limitami ekspozycji i regulacjami
- ✅ **Audytowalna ścieżka** wszystkich operacji finansowych

### 1.3. Zakres Testowania

Plan testów pokrywa **10 modułów głównych** i **12 typów testów** z naciskiem na:

1. **Functional Correctness** - poprawność obliczeń, zleceń, prowizji
2. **System Resilience** - odporność na awarie, recovery, failover
3. **Security & Compliance** - bezpieczeństwo, secrets management, audit trail
4. **Performance at Scale** - latencje, throughput, concurrency
5. **Edge Cases & Anomalies** - scenariusze brzegowe, manipulacje, anomalie

---

## 2. ZAKRES I ARCHITEKTURA

### 2.1. Opis Architektury Bota Tradingowego

System składa się z następujących modułów (zgodnie z analizą kodu):

```
┌─────────────────────────────────────────────────────────────────┐
│                   AUTONOMOUS TRADING BOT                        │
│                   (AutonomousTradingBot)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
    ▼                         ▼                         ▼
┌─────────┐            ┌─────────┐              ┌─────────┐
│ Market  │            │Strategy │              │  Risk   │
│  Data   │            │ Engine  │              │ Manager │
│  Feed   │            │         │              │         │
└─────────┘            └─────────┘              └─────────┘
    │                         │                         │
    │                         ▼                         │
    │                  ┌─────────┐                     │
    │                  │   ML    │                     │
    │                  │ System  │                     │
    │                  │(EnterML)│                     │
    │                  └─────────┘                     │
    │                         │                         │
    └─────────────────────────┼─────────────────────────┘
                              │
                              ▼
                      ┌─────────────┐
                      │  Portfolio  │
                      │  Manager    │
                      └─────────────┘
                              │
                              ▼
                      ┌─────────────┐
                      │   Order     │
                      │  Manager    │
                      └─────────────┘
                              │
                              ▼
                      ┌─────────────┐
                      │  Execution  │
                      │   Adapter   │
                      │  (OKX/SIM)  │
                      └─────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
  ┌──────────┐        ┌──────────┐        ┌──────────┐
  │Monitoring│        │  Logging │        │    DB    │
  │Prometheus│        │  System  │        │Persistence│
  └──────────┘        └──────────┘        └──────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                              │
                              ▼
                       ┌────────────┐
                       │  REST API  │
                       │Health/Stats│
                       └────────────┘
```

### 2.2. Moduły do Testowania

| #   | Moduł                    | Klasa/Plik                                                         | Status        | Priorytet |
| --- | ------------------------ | ------------------------------------------------------------------ | ------------- | --------- |
| 1   | **Market Data Feed**     | `UnifiedDataPipeline`, `KafkaRealTimeStreamingEngine`              | ✅ Aktywny     | KRYTYCZNY |
| 2   | **Order Manager**        | `executeOrders()`, `SimulatedExecutor`, `OKXExecutionEngine`       | ✅ Aktywny     | BLOKUJĄCY |
| 3   | **Risk Manager**         | `GlobalRiskManager`, `AdvancedRiskManager`, `BasicRiskManager`     | ✅ Aktywny     | BLOKUJĄCY |
| 4   | **Strategy Engine**      | `MetaStrategySystem`, `AdvancedAdaptiveStrategy`, `RSITurbo`       | ✅ Aktywny     | KRYTYCZNY |
| 5   | **ML System**            | `EnterpriseMLAdapter`, `ProductionMLIntegrator`, `SimpleRLAdapter` | ⚠️ Częściowy   | KRYTYCZNY |
| 6   | **Portfolio Manager**    | `Portfolio`, `AdvancedPortfolioManager`                            | ✅ Aktywny     | KRYTYCZNY |
| 7   | **Execution Adapter**    | `SimulatedExecutor`, `OKXExecutionEngine`                          | ✅ Aktywny     | BLOKUJĄCY |
| 8   | **Persistence/DB**       | Portfolio state, trades history                                    | ✅ In-memory   | WYSOKI    |
| 9   | **Monitoring & Logging** | `PrometheusMonitoring`, health endpoints                           | ✅ Aktywny     | WYSOKI    |
| 10  | **Scheduler**            | `executeTradingCycle()`, main loop                                 | ✅ Aktywny     | KRYTYCZNY |
| 11  | **UI/API**               | Express endpoints `/health`, `/api/*`                              | ✅ Aktywny     | ŚREDNI    |
| 12  | **Backtester**           | Historical validation                                              | ⚠️ Ograniczony | ŚREDNI    |

### 2.3. Identyfikacja Trybów Operacyjnych

Bot działa w **3 trybach** (ENV: `MODE`):

1. **`simulation`** - Symulacja z mock danymi (domyślny, bezpieczny)
2. **`backtest`** - Historyczne dane z validacją (testowanie strategii)
3. **`live`** - Produkcja z rzeczywistym API brokera (wymaga walidacji kluczy)

### 2.4. Komponenty Krytyczne dla Bezpieczeństwa

| Komponent       | Ryzyko                              | Kontrola Testowa           |
| --------------- | ----------------------------------- | -------------------------- |
| Order Execution | Błędne zlecenia = utrata kapitału   | 100% pokrycie scenariuszy  |
| Risk Limits     | Przekroczenie drawdown = bankructwo | Stress testing + boundary  |
| Position Sizing | Błędne loty = błędna ekspozycja     | Precision tests (rounding) |
| API Keys        | Wyciek = kradzież środków           | Secret management audit    |
| Idempotency     | Duplikaty = podwójne zlecenia       | Retry chaos tests          |

---

## 3. CELE TESTÓW

### 3.1. Cele Biznesowe

1. **Zapewnienie Bezpieczeństwa Kapitału**
   - Weryfikacja wszystkich limitów ryzyka
   - Potwierdzenie działania circuit breakers
   - Walidacja mechanizmów emergency stop

2. **Gwarancja Poprawności Transakcji**
   - Precyzja obliczeń prowizji (do 0.0001%)
   - Poprawność wyliczania PnL
   - Zgodność backtest vs live (tolerance <2%)

3. **Zapewnienie Ciągłości Operacyjnej 24/7**
   - Recovery po awariach <5 sekund
   - Zero data loss w scenariuszach failover
   - Graceful degradation przy brakach danych

4. **Zgodność z Regulacjami**
   - Kompletny audit trail wszystkich operacji
   - Logi zawierające trace_id i context
   - Raportowanie zgodne z wymogami

### 3.2. Cele Techniczne

| Obszar            | Cel                         | Metryka Sukcesu         |
| ----------------- | --------------------------- | ----------------------- |
| **Correctness**   | Zero błędów w logice zleceń | 0 failed critical tests |
| **Resilience**    | Odporność na awarie         | 99.9% availability      |
| **Performance**   | Niska latencja              | p99 < 100ms             |
| **Security**      | Brak wycieków               | 0 exposed secrets       |
| **Observability** | Pełna transparentność       | 100% traced operations  |

### 3.3. Zakres Testów (Coverage Targets)

- **Unit Tests:** ≥90% code coverage
- **Integration Tests:** 100% komponentów głównych
- **E2E Tests:** 100% kritycznych przepływów
- **Performance Tests:** 100% endpointów API
- **Security Tests:** 100% punktów wejścia
- **Chaos Tests:** 100% scenariuszy awarii

---

## 4. RODZAJE TESTÓW

### 4.1. Unit Tests (Testy Jednostkowe)

**Cel:** Weryfikacja poprawności pojedynczych funkcji i metod w izolacji.

**Metodyka:**
- Testowanie każdej funkcji z różnymi wejściami (happy path, edge cases, invalid)
- Mockowanie wszystkich zależności zewnętrznych
- Weryfikacja precyzji obliczeń (rounding, floating point)
- Testy parametryczne dla różnych zakresów wartości

**Narzędzia:**
- **Framework:** Jest + TypeScript
- **Mocking:** jest.mock(), jest.spyOn()
- **Assertions:** expect(), toBe(), toBeCloseTo()
- **Coverage:** Istanbul/nyc

**Przykładowe Testy:**
- `calculatePositionSize()` z różnymi equity, risk%, leverage
- `calculateCommission()` dla różnych fee structures (maker/taker)
- `roundToLotSize()` dla różnych precision (0.001, 0.01, 1)
- `calculatePnL()` z long/short positions, różne entry/exit
- Funkcje wskaźników (RSI, MACD, Bollinger) dla known datasets

**Kryteria Akceptacji:**
- Wszystkie testy przechodzą (0 failures)
- Coverage ≥90% dla modułów core
- Czas wykonania <30s dla pełnego suite

---

### 4.2. Integration Tests (Testy Integracyjne)

**Cel:** Weryfikacja współpracy między modułami systemu.

**Metodyka:**
- Testowanie przepływu danych między komponentami
- Weryfikacja serializacji/deserializacji
- Sprawdzanie kontraktów API między modułami
- Testowanie event flow i message passing

**Narzędzia:**
- **Framework:** Jest + Supertest (dla HTTP)
- **Mock Services:** Testcontainers, in-memory DBs
- **Assertions:** HTTP status codes, response schemas
- **Tracing:** Correlation IDs weryfikacja

**Przykładowe Testy:**
- Market Data Feed → Strategy Engine (data flow)
- Strategy Engine → Order Manager (signal → order transformation)
- Order Manager → Risk Manager (pre-trade validation)
- Risk Manager → Execution Adapter (filtered order execution)
- Execution → Portfolio Manager (position update)
- Portfolio → Monitoring (metrics emission)

**Kryteria Akceptacji:**
- Wszystkie integracje przechodzą pomyślnie
- Brak data corruption w przepływach
- Correlation IDs preserved through pipeline

---

### 4.3. End-to-End Tests (Testy E2E)

**Cel:** Weryfikacja pełnych scenariuszy handlowych od początku do końca.

**Metodyka:**
- Symulacja rzeczywistych scenariuszy tradingu
- Uruchomienie pełnego systemu z mockami zewnętrznych API
- Weryfikacja stanu systemu, DB, logów po zakończeniu scenariusza
- Testy obejmujące wieloetapowe przepływy (wejście → zarządzanie → wyjście)

**Narzędzia:**
- **Framework:** Playwright/Cypress (dla UI), Jest (dla API)
- **Orchestration:** Docker Compose dla multi-service setups
- **Mocks:** WireMock, MockServer dla broker API
- **Assertions:** DB state, log entries, metrics snapshots

**Przykładowe Scenariusze:**
1. **Pełny Cykl Transakcji:**
   - Receive market data → Generate signal → Pass risk checks → Execute order → Update portfolio → Record trade
2. **Multi-Position Management:**
   - Open 3 positions → Monitor → Close 1 with profit → Hold 2 → Rebalance
3. **Risk Breach Scenario:**
   - Approach max drawdown → Block new orders → Emergency liquidation → Recovery

**Kryteria Akceptacji:**
- Wszystkie scenariusze kończą się expected state
- Brak orphaned transactions w DB
- Wszystkie logi zawierają complete context

---

### 4.4. Backtest vs Live-Data Regression Tests

**Cel:** Zapewnienie zgodności wyników backtestingu z rzeczywistym handlem.

**Metodyka:**
- Uruchomienie tej samej strategii na danych historycznych (backtest) i live replay
- Porównanie metryk: PnL, trades count, drawdown, win rate
- Dopuszczalna tolerancja różnic z powodu slippage/commissions
- Analiza divergence root causes

**Narzędzia:**
- **Replay Engine:** Historical data player z kontrolowanym timestampem
- **Comparison Tool:** Custom scripts porównujące metryki
- **Visualization:** Graficzne overlay backtest vs live

**Przykładowe Testy:**
- RSITurbo strategy: backtest (2024-01-01 to 2024-06-30) vs live replay
- Divergence analysis: trades executed at different prices
- Commission impact: backtest with 0 fees vs realistic fees

**Kryteria Akceptacji:**
- PnL difference <2% (due to slippage/fees)
- Trade count matches ±5%
- Drawdown patterns similar (cross-correlation >0.95)

---

### 4.5. Performance & Load Tests

**Cel:** Weryfikacja wydajności systemu pod obciążeniem.

**Metodyka:**
- Pomiar latencji dla kluczowych operacji (order placement, data processing)
- Testowanie throughput (liczba transakcji/sekundę)
- Testowanie concurrency (wiele równoległych strategii)
- Profiling memory leaks i CPU usage

**Narzędzia:**
- **Load Testing:** k6, Apache JMeter
- **Profiling:** Node.js built-in profiler, clinic.js
- **Metrics Collection:** Prometheus + Grafana
- **Tracing:** OpenTelemetry

**Przykładowe Testy:**
- **Latency Test:** Order placement latency przy różnych obciążeniach (10, 100, 1000 req/s)
- **Throughput Test:** Maximum orders/second before degradation
- **Concurrency Test:** 10 strategies running simultaneously
- **Memory Leak Test:** 24h run with memory monitoring

**Kryteria Akceptacji:**
- p50 latency <20ms, p95 <50ms, p99 <100ms
- Throughput ≥100 orders/second
- Memory stable over 24h (<5% growth)
- CPU usage <70% at peak load

---

### 4.6. Stress Tests & Scalability

**Cel:** Testowanie zachowania systemu w ekstremalnych warunkach.

**Metodyka:**
- Zwiększanie obciążenia powyżej normalnych poziomów
- Symulacja flash crashes, order floods
- Testowanie graceful degradation
- Weryfikacja recovery po przeciążeniu

**Narzędzia:**
- **Load Generator:** Gatling, Locust
- **Scenario Scripts:** Custom chaos scenarios
- **Monitoring:** Real-time dashboards dla metrics

**Przykładowe Scenariusze:**
- **Order Flood:** 10,000 orders w 1 sekundę
- **Flash Crash:** Cena spada 50% w 10 sekund
- **Market Data Spike:** 1000x normalny volume ticków
- **DB Saturation:** Pełny disk podczas zapisywania transakcji

**Kryteria Akceptacji:**
- System nie crashuje (graceful degradation)
- Circuit breakers activate przy przeciążeniu
- Recovery time <30 sekund po ustąpieniu stresu
- Żadne dane nie są lost (eventual consistency OK)

---

### 4.7. Chaos & Fault-Injection Tests

**Cel:** Weryfikacja odporności na awarie infrastruktury.

**Metodyka:**
- Symulacja awarii poszczególnych komponentów
- Testowanie behavior przy network issues
- Weryfikacja failover i recovery mechanisms
- Testowanie corner cases (clock drift, partial failures)

**Narzędzia:**
- **Chaos Engineering:** Chaos Monkey, Gremlin
- **Network Simulation:** tc (traffic control), toxiproxy
- **Time Manipulation:** libfaketime
- **Orchestration:** Kubernetes ChaosToolkit

**Przykładowe Scenariusze:**
1. **Broker Disconnect:**
   - Disconnect podczas order execution → Retry → Idempotency check
2. **Database Crash:**
   - DB unavailable → Queue writes → Replay on recovery
3. **Network Latency:**
   - Latency 5000ms → Timeout handling → Fallback mechanisms
4. **Clock Drift:**
   - System time skew +30 minutes → Timestamp validation → NTP sync

**Kryteria Akceptacji:**
- Zero data loss w scenarios z fault injection
- Recovery time <10 sekund
- Idempotency preserved (no duplicate orders)
- Wszystkie operacje są atomic lub rollback correctly

---

### 4.8. Security Tests

**Cel:** Zapewnienie bezpieczeństwa systemu i danych.

**Metodyka:**
- Testowanie uwierzytelnienia i autoryzacji
- Weryfikacja secrets management (klucze API nigdy nie w logach)
- Testowanie podatności (injection, exposure)
- Penetration testing API endpoints
- Rate limiting bypass attempts

**Narzędzia:**
- **SAST:** SonarQube, ESLint security plugins
- **DAST:** OWASP ZAP, Burp Suite
- **Secrets Scanning:** git-secrets, truffleHog
- **Fuzzing:** Peach Fuzzer, AFL

**Przykładowe Testy:**
- **API Key Exposure:** Scan logs for regex matching API keys
- **SQL Injection:** Test DB queries z malicious inputs
- **Rate Limiting:** Test 1000 requests/second bez auth
- **JWT Validation:** Expired tokens, tampered signatures
- **CORS:** Cross-origin requests validation

**Kryteria Akceptacji:**
- 0 exposed secrets w logach, configs, error messages
- Wszystkie API endpoints wymagają auth
- Rate limiting blocks >100 req/min z single IP
- Input validation prevents injection attacks

---

### 4.9. Compliance & Regulatory Tests

**Cel:** Zapewnienie zgodności z regulacjami finansowymi.

**Metodyka:**
- Weryfikacja audit trails (kompletność, niemutowalność)
- Testowanie reporting capabilities
- Weryfikacja enforcement limits (max exposure, drawdown)
- Sprawdzanie data retention policies

**Narzędzia:**
- **Audit Log Analyzer:** Custom scripts parsujące logi
- **Compliance Checker:** Automated rules engine
- **Reporting:** Template validators dla wymaganych raportów

**Przykładowe Testy:**
- **Audit Trail Completeness:** Every trade ma pełny context (timestamp, user, reason, price, quantity)
- **Max Exposure Enforcement:** Próba przekroczenia limitu → Block + alert
- **Drawdown Limits:** Osiągnięcie 15% DD → Emergency stop
- **Data Retention:** Trades older than 7 years → Archivize correctly

**Kryteria Akceptacji:**
- 100% trades mają complete audit trail
- 0 breaches limits regulations
- Raports generowane automatycznie (daily, monthly)
- Data retention policy enforced

---

### 4.10. Fuzzing & Mutation Tests

**Cel:** Wykrywanie podatności przez losowe/mutowane payloady.

**Metodyka:**
- Generowanie losowych inputs do API endpoints
- Mutowanie valid payloads (modyfikacja pól, usunięcie required)
- Testowanie boundary values (INT_MAX, negative, null, undefined)
- Crashowanie systemu i analiza stack traces

**Narzędzia:**
- **Fuzz Testing:** libFuzzer, AFL, Peach Fuzzer
- **Mutation Tools:** Custom scripts z faker.js
- **Crash Analysis:** Core dumps, stack trace analysis

**Przykładowe Testy:**
- **API Fuzzing:** POST /api/order z random JSON structures
- **Market Data Fuzzing:** Inject NaN, Infinity, negative prices
- **Boundary Values:** Order quantity = -1, 0, 1e100, null
- **Type Confusion:** Send string gdzie expected number

**Kryteria Akceptacji:**
- System nie crashuje na invalid inputs (graceful errors)
- Wszystkie edge cases zwracają 400 Bad Request z clear message
- Brak unhandled exceptions w logach

---

### 4.11. Usability & UI Tests (jeśli dostępne)

**Cel:** Weryfikacja użyteczności interfejsu użytkownika.

**Metodyka:**
- Testowanie responsywności UI
- Weryfikacja accessibility (WCAG compliance)
- Testowanie cross-browser compatibility
- User journey scenarios

**Narzędzia:**
- **UI Testing:** Selenium, Cypress, Playwright
- **Visual Regression:** Percy, Applitools
- **Accessibility:** axe, WAVE

**Przykładowe Testy:**
- **Dashboard Load:** Chart rendering <2 sekund
- **Real-time Updates:** Portfolio metryki update every 30s
- **Mobile Responsive:** UI działa na viewport 375x667
- **Keyboard Navigation:** Wszystkie features accessible via keyboard

**Kryteria Akceptacji:**
- UI load time <2 sekund
- WCAG AA compliance (accessibility)
- Zero visual regressions przy updates
- Cross-browser (Chrome, Firefox, Safari)

---

### 4.12. Recovery & Failover Tests

**Cel:** Weryfikacja mechanizmów recovery po awariach.

**Metodyka:**
- Testowanie restartów po crash
- Weryfikacja resume z checkpointów
- Testowanie state reconstruction z DB
- Failover między instancjami (load balancing)

**Narzędzia:**
- **Process Management:** PM2 restarts, Kubernetes liveness probes
- **State Persistence:** DB snapshots, file system checkpoints
- **Load Balancing:** HAProxy, Nginx tests

**Przykładowe Scenariusze:**
1. **Crash Recovery:**
   - Bot crashes mid-trading cycle → Restart → Resume z checkpoint
2. **Checkpoint Restore:**
   - Load state z DB → Verify portfolio, open positions match
3. **Failover Test:**
   - Primary instance down → Secondary takes over <5s
4. **Data Replay:**
   - Missed market data during downtime → Replay z Kafka

**Kryteria Akceptacji:**
- Recovery time <10 sekund
- Zero data loss (checkpoint consistency)
- Failover transparent dla users (zero downtime)
- State after recovery matches expected

---

## 5. SZCZEGÓŁOWE PRZYPADKI TESTOWE

*Uwaga: Poniżej znajduje się 80+ szczegółowych przypadków testowych w formacie tabelarycznym/JSON. Dla zwięzłości, przedstawię wybrane przykłady z każdej kategorii, a pełny JSON ze wszystkimi testami będzie dostępny jako załącznik.*

### 5.1. Format Przypadku Testowego

Każdy test case zawiera:
```json
{
  "id": "TC-001",
  "nazwa": "Market Order Execution - Happy Path",
  "komponent": "OrderManager",
  "typ_testu": "integration",
  "priorytet": "blokujący",
  "preconditions": {
    "portfolio_balance": 10000,
    "market_price": 50000,
    "spread": 10
  },
  "kroki": [
    "1. Generate BUY signal z Strategy Engine",
    "2. Calculate position size (2% risk)",
    "3. Submit market order do Execution Adapter",
    "4. Mock broker returns success (orderId: 123456)",
    "5. Update Portfolio z new position"
  ],
  "dane_testowe": {
    "signal": {
      "type": "ENTER_LONG",
      "price": 50000,
      "confidence": 0.85,
      "strategy": "RSITurbo"
    },
    "expected_position_size": 0.004,
    "expected_commission": 2.0
  },
  "oczekiwany_wynik": {
    "order_placed": true,
    "portfolio_position_count": 1,
    "portfolio_balance_usd": 9998.00,
    "db_trade_recorded": true,
    "log_contains": "Order executed successfully: 123456"
  },
  "kryteria_zaakceptowania": "PASS if all assertions met within 500ms",
  "uwagi": "Mock broker API with 100ms latency"
}
```

---

### 5.2. Przykładowe Przypadki Testowe (Kategoryzowane)

#### **KATEGORIA A: ORDER MANAGEMENT (ID: TC-001 to TC-015)**

**TC-001: Market Order Execution - Happy Path**
- **Komponent:** OrderManager
- **Typ:** integration
- **Priorytet:** blokujący
- **Preconditions:** Portfolio balance: 10000 USD, Market price: 50000, Spread: 10
- **Kroki:**
  1. Strategy Engine generates BUY signal (confidence: 0.85)
  2. Order Manager calculates position size (2% risk = 0.004 BTC)
  3. Submit market order to Execution Adapter
  4. Mock broker returns success (orderId: "ORD-123456", fillPrice: 50005)
  5. Portfolio Manager updates position