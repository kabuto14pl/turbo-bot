# ✅ MUST-PASS TESTING CHECKLIST - Trading Bot

**Data:** 1 Listopada 2025  
**Projekt:** Autonomous Trading Bot  
**Status:** Pre-Production Validation

---

## 🎯 KRYTYCZNE WYMAGANIA PRE-PRODUCTION

### 1. ✅ IDEMPOTENCJA ORDERÓW

**Cel:** Zapewnienie, że retry nie powoduje duplikatów zleceń.

**Testy:**
- **TC-IDP-001:** Retry po timeout - order ID musi być identyczny
- **TC-IDP-002:** Network failure podczas wysyłki - sprawdź czy order nie został zduplikowany
- **TC-IDP-003:** Broker zwraca duplicate response - system ignoruje

**Scenariusz testowy:**
```typescript
// 1. Wysłanie order (id: "ORD-123")
// 2. Timeout po 3s (brak response)
// 3. Retry z tym samym ID
// 4. Broker zwraca "already exists"
// 5. System weryfikuje status existingOrder
// PASS: Tylko 1 order w systemie
```

**Kryteria PASS:**
- Zero duplicate orders w DB
- Każdy order ma unique ID (UUID/timestamp)
- Retry używa tego samego ID
- System query status przed retry

---

### 2. 🛡️ OGRANICZENIA RYZYKA

**Cel:** Enforcement limitów ekspozycji i drawdown.

**Testy:**
- **TC-RISK-001:** Max drawdown 15% - system blokuje nowe zlecenia
- **TC-RISK-002:** Single trade przekracza 2% kapitału - odrzucony
- **TC-RISK-003:** Total exposure >100% kapitału - circuit breaker

**Scenariusz testowy:**
```typescript
// Initial: Portfolio = 10000 USD
// Trade 1: Loss -1500 USD (15% drawdown)
// Trade 2: System próbuje otworzyć pozycję
// PASS: Trade 2 rejected z logiem "Max drawdown reached"
```

**Kryteria PASS:**
- Risk checks przed każdym order
- Max drawdown enforced (15%)
- Max position size enforced (2%)
- Emergency stop aktywny przy breach

**Metryki:**
- Risk check latency <10ms
- 100% orders przechodzą risk validation
- 0 breaches w production logs

---

### 3. 💾 RECOVERY Z CHECKPOINT

**Cel:** Bezstratne przywrócenie stanu po crash.

**Testy:**
- **TC-REC-001:** Bot crash mid-cycle - restart z checkpoint
- **TC-REC-002:** DB snapshot restore - portfolio state match
- **TC-REC-003:** Replay missed market data z Kafka

**Scenariusz testowy:**
```typescript
// 1. Bot running: 3 open positions, balance: 9500
// 2. Simulate crash (kill -9)
// 3. Restart bot
// 4. Load state z DB checkpoint
// PASS: Portfolio = 9500, positions = 3 (exact match)
```

**Kryteria PASS:**
- Checkpoint zapisywany co 30s
- Zero data loss po recovery
- Open positions restored correctly
- Resume trading cycle w <10s

**Data Integrity:**
- Portfolio balance ±0.01 tolerance
- Position count exact match
- Trade history complete

---

### 4. 🔐 BRAK LEAKÓW SECRETS

**Cel:** API keys nigdy nie w logach, errors, responses.

**Testy:**
- **TC-SEC-001:** Scan logs for API key patterns (regex)
- **TC-SEC-002:** Error messages - check for exposed credentials
- **TC-SEC-003:** API responses - verify no secrets in JSON
- **TC-SEC-004:** Git history - no committed secrets

**Scenariusz testowy:**
```bash
# Scan all logs for secret patterns
grep -rE "api[_-]?key.*[:=].*[A-Za-z0-9]{20,}" logs/
# PASS: 0 matches found

# Check error stack traces
grep -rE "(password|secret|token|key)" logs/errors.log
# PASS: Only sanitized references
```

**Kryteria PASS:**
- 0 secrets w logs (30-day scan)
- Environment variables używane dla keys
- Error messages sanitized
- Git-secrets hook aktywny

**Tools:**
- `git-secrets` dla pre-commit checks
- `truffleHog` dla historical scan
- Custom regex scanner w CI

---

### 5. 💰 WALIDACJA PROWIZJI

**Cel:** Dokładne obliczanie kosztów transakcji.

**Testy:**
- **TC-FEE-001:** Maker fee 0.02% - precision check
- **TC-FEE-002:** Taker fee 0.05% - precision check
- **TC-FEE-003:** Rounding błąd tolerance <0.0001%
- **TC-FEE-004:** Różne fee tiers (VIP, regular)

**Scenariusz testowy:**
```typescript
// Order: BUY 0.1 BTC @ 50000 USD
// Notional: 5000 USD
// Taker fee: 0.05%
// Expected commission: 2.50 USD
const commission = calculateCommission(5000, 0.0005);
assert(Math.abs(commission - 2.50) < 0.0001);
// PASS: commission = 2.5000
```

**Kryteria PASS:**
- Commission calculation precision: 4 decimals
- Different fee structures supported
- PnL accuracy including fees
- Backtesting fees match live

**Tolerances:**
- Rounding error <0.01%
- Backtest vs live fees <2% difference

---

### 6. ⚡ LATENCY p99 < 100ms

**Cel:** Niskie latencje dla kluczowych operacji.

**Testy:**
- **TC-PERF-001:** Order placement latency p99
- **TC-PERF-002:** Market data processing p99
- **TC-PERF-003:** Risk check latency p99
- **TC-PERF-004:** DB write latency p99

**Scenariusz testowy:**
```bash
# Load test: 1000 orders w 60s
k6 run --vus 10 --duration 60s load_test.js

# Expected metrics:
# p50: <20ms
# p95: <50ms
# p99: <100ms
```

**Kryteria PASS:**
- Order placement: p99 <100ms
- Market data tick processing: p99 <50ms
- Risk validation: p99 <10ms
- Portfolio update: p99 <30ms

**Degradation Thresholds:**
- p99 <150ms: Warning (monitorować)
- p99 >200ms: Critical (blokuje deployment)
- p99 >500ms: Emergency (rollback)

---

## 📊 METODY WALIDACJI

### Automated Testing Pipeline

```bash
# Pre-commit hooks
npm run test:unit          # Unit tests (90% coverage)
npm run test:lint          # Linting + security scan

# CI Pipeline (GitHub Actions)
npm run test:integration   # Integration tests
npm run test:e2e           # E2E scenarios
npm run test:security      # Secret scan + SAST
npm run test:performance   # Load testing

# Nightly Builds
npm run test:chaos         # Chaos engineering
npm run test:stress        # Stress testing
npm run backtest:validate  # Backtest regression
```

### Manual Verification

**Pre-Production Checklist:**
- [ ] Wszystkie must-pass testy: GREEN
- [ ] Code review approved (2 reviewers)
- [ ] Security scan: 0 critical issues
- [ ] Performance benchmarks met
- [ ] Staging deployment successful
- [ ] Rollback plan tested
- [ ] Monitoring dashboards ready
- [ ] On-call rotation scheduled

---

## 🔥 PRIORITIZATION MATRIX

| Test Category  | Blocking? | CI Stage   | Frequency    |
| -------------- | --------- | ---------- | ------------ |
| Idempotencja   | ✅ YES     | Pre-merge  | Every commit |
| Risk Limits    | ✅ YES     | Pre-merge  | Every commit |
| Recovery       | ✅ YES     | Nightly    | Daily        |
| Secret Leaks   | ✅ YES     | Pre-commit | Every commit |
| Fee Validation | ✅ YES     | Pre-merge  | Every commit |
| Latency p99    | ⚠️ Warning | Post-merge | Nightly      |

---

## 📝 TEST EVIDENCE REQUIREMENTS

### Każdy test musi zawierać:

1. **Logs:**
   - Timestamp, trace_id, operation, result
   - Example: `[2025-11-01T10:30:15.123Z] [trace:abc123] [OrderManager] Order placed: ORD-456`

2. **DB Snapshots:**
   - Stan przed testem (initial state)
   - Stan po teście (final state)
   - Diff showing expected changes

3. **Metrics:**
   - Prometheus metrics screenshot
   - Latency histogram
   - Error rate graph

4. **Assertions:**
   ```typescript
   expect(portfolio.balance).toBe(9998.00);
   expect(trades.length).toBe(1);
   expect(logs).toContain("Order executed");
   ```

---

## 🚨 FAILURE HANDLING

### Co robić gdy test fails:

1. **Immediate:**
   - Block merge/deployment
   - Notify team (Slack alert)
   - Triage priority (P0/P1/P2)

2. **Investigation:**
   - Collect logs, metrics, traces
   - Reproduce locally
   - Root cause analysis

3. **Resolution:**
   - Fix code OR update test (jeśli false positive)
   - Verify fix with test re-run
   - Document lesson learned

---

## 📈 SUCCESS METRICS

### Definition of Done:

- ✅ All 6 must-pass categories: 100% PASS
- ✅ Zero P0/P1 bugs open
- ✅ Code coverage ≥90%
- ✅ Performance benchmarks met
- ✅ Security audit approved
- ✅ Staging soak test: 7 days no issues

### Production Readiness Score:

| Category     | Weight   | Score | Weighted   |
| ------------ | -------- | ----- | ---------- |
| Idempotencja | 25%      | 100%  | 25%        |
| Risk Limits  | 25%      | 100%  | 25%        |
| Recovery     | 20%      | 100%  | 20%        |
| Security     | 15%      | 100%  | 15%        |
| Fees         | 10%      | 100%  | 10%        |
| Performance  | 5%       | 95%   | 4.75%      |
| **TOTAL**    | **100%** | -     | **99.75%** |

**Threshold:** ≥95% = READY FOR PRODUCTION

---

## 🎯 QUICK REFERENCE

### Komendy Testowe:

```bash
# Must-pass suite (5 min)
npm run test:must-pass

# Pełny suite (30 min)
npm run test:all

# Specific category
npm run test:idempotency
npm run test:risk
npm run test:recovery
npm run test:security
npm run test:fees
npm run test:performance

# Continuous monitoring
npm run monitor:production
```

### Alerting Thresholds:

- **Idempotency violation:** P0 - Immediate rollback
- **Risk breach:** P0 - Emergency stop
- **Recovery failure:** P1 - Manual intervention w 15min
- **Secret leak:** P0 - Rotate keys immediately
- **Fee mismatch >1%:** P1 - Investigate w 1h
- **Latency p99 >200ms:** P2 - Optimize w 24h

---

## ✅ FINAL SIGN-OFF

**Before Production Deployment:**

```
[ ] QA Lead approval
[ ] Security team approval
[ ] Engineering Manager approval
[ ] Product Owner approval
[ ] All must-pass tests: PASS
[ ] Performance benchmarks: MET
[ ] Rollback plan: TESTED
[ ] Monitoring: ACTIVE
[ ] On-call: STAFFED

Approved by: ________________
Date: ______________________
```

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-11-01  
**Next Review:** 2025-11-15
