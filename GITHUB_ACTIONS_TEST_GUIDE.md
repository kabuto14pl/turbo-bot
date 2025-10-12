# 🚀 GitHub Actions Extended Test - Instrukcje

## 📋 Przegląd

Automatyczny test trading bota w GitHub Actions, który działa **bez potrzeby Codespace**! Test działa 2 godziny (lub dowolny czas) z live dashboardem i pełnym monitoringiem.

---

## ✨ Funkcje

✅ **Automatyczny test 2h** (48h symulacji przy 24x przyspieszeniu)
✅ **Live dashboard** działający równolegle z testem
✅ **Zero kosztów Codespace** - wszystko w GitHub Actions (bezpłatne!)
✅ **Pełny monitoring** - metryki co 2 minuty
✅ **Snapshoty portfolio** - co 10 minut
✅ **Automatyczne raporty** - po zakończeniu testu
✅ **Artifacts** - wszystkie logi i dane dostępne do pobrania

---

## 🚀 Jak Uruchomić Test

### **Metoda 1: Ręczne Uruchomienie (GitHub UI)**

1. **Otwórz zakładkę Actions** w repozytorium GitHub
2. **Znajdź workflow:** `🚀 Extended Trading Bot Test (2h) with Live Dashboard`
3. **Kliknij "Run workflow"** (przycisk po prawej)
4. **Ustaw parametry** (opcjonalnie):
   - `test_duration`: Czas testu w godzinach (domyślnie: 2)
   - `time_multiplier`: Przyspieszenie symulacji (domyślnie: 24x)
5. **Kliknij "Run workflow"** (zielony przycisk)

### **Metoda 2: Automatyczne Uruchomienie**

Test uruchamia się automatycznie:
- **Codziennie o 3:00 UTC** (harmonogram)
- **Przy push do master/main** (jeśli zmiany w `trading-bot/`)

### **Metoda 3: GitHub CLI**

```bash
# Uruchom z domyślnymi parametrami
gh workflow run extended-test.yml

# Uruchom z custom parametrami
gh workflow run extended-test.yml \
  -f test_duration=4 \
  -f time_multiplier=12
```

---

## 📊 Jak Monitorować Test

### **1. Live Status w GitHub Actions**

1. Otwórz zakładkę **Actions**
2. Kliknij na running workflow
3. Zobacz real-time logi dla każdego kroku

### **2. Test Progress Log**

W kroku `📈 Run Extended Test with Monitoring` zobaczysz:

```
⏰ [1] Progress: 2% | Elapsed: 120s | Sim: 0.8h | Mem: 450MB | Trades: 0 | $10000 | Errors: 5 | Remaining: 7080s
⏰ [2] Progress: 4% | Elapsed: 240s | Sim: 1.6h | Mem: 455MB | Trades: 2 | $10050 | Errors: 7 | Remaining: 6960s
...
```

### **3. Dashboard (podczas testu)**

Dashboard działa na `localhost:8080` w środowisku GitHub Actions. Nie jest dostępny publicznie, ale:
- Zapisuje wszystkie metryki do `logs/monitoring.csv`
- API działa na `localhost:3001`
- Pełne logi w artifacts po zakończeniu

---

## 📥 Jak Pobrać Wyniki

### **Po zakończeniu testu:**

1. **Otwórz zakończony workflow** w zakładce Actions
2. **Scroll do sekcji "Artifacts"** (na dole strony)
3. **Pobierz artifacts:**
   - `test-results-XXX` - pełne wyniki testu (logi, dane, raport)
   - `bot-logs-XXX` - szczegółowe logi bota
   - `dashboard-logs-XXX` - logi dashboardu

### **Co znajdziesz w artifacts:**

```
test-results-XXX/
├── logs/
│   ├── bot.log              # Pełne logi bota (2h)
│   ├── dashboard.log        # Logi dashboard server
│   └── monitoring.csv       # Metryki co 2 minuty
├── data/
│   ├── snapshot_4h.json     # Snapshot po 4h symulacji
│   ├── snapshot_8h.json     # Snapshot po 8h symulacji
│   └── ...
└── test_report.md           # Podsumowanie testu
```

---

## 📊 Test Report

Po zakończeniu testu automatycznie generowany jest raport:

```markdown
# 📊 Extended Test Report

**Test Duration:** 2 hours
**Time Multiplier:** 24x
**Simulated Time:** 48 hours

## 💰 Final Results
- **Portfolio Value:** $10,523.45
- **Total Trades:** 15
- **Total Errors:** 23

## 📊 Performance Metrics
- **Average Memory:** 452.3MB
- **Peak Memory:** 487.1MB

## ⚠️ Error Summary
[Last 20 errors from logs]
```

---

## ⚙️ Konfiguracja

### **Zmiana Parametrów Domyślnych**

Edytuj `.github/workflows/extended-test.yml`:

```yaml
workflow_dispatch:
  inputs:
    test_duration:
      default: '4'  # 4 godziny zamiast 2
    time_multiplier:
      default: '12' # 12x zamiast 24x
```

### **Zmiana Harmonogramu**

```yaml
schedule:
  - cron: '0 3 * * *'  # Codziennie o 3:00 UTC
  # '0 */6 * * *'      # Co 6 godzin
  # '0 0 * * 0'        # Raz w tygodniu (niedziela)
```

### **Wyłączenie Auto-Run**

Usuń sekcję `schedule` i `push` z workflow, pozostaw tylko `workflow_dispatch`.

---

## 🔧 Troubleshooting

### **Test się nie uruchamia**

1. Sprawdź czy workflow jest **enabled** w Settings → Actions
2. Sprawdź limity GitHub Actions (2000 min/miesiąc dla free plan)
3. Sprawdź czy branch to `master` lub `main`

### **Test crashuje po starcie**

1. Pobierz `bot-logs-XXX` artifact
2. Sprawdź ostatnie linie w `bot.log`
3. Najczęstsze problemy:
   - Brak zależności npm (sprawdź `npm ci`)
   - Błędy kompilacji TypeScript (sprawdź `npm run build`)
   - Port 3001 zajęty (nie powinno się zdarzyć w GitHub Actions)

### **Brak danych w monitoring.csv**

1. Sprawdź czy bot się uruchomił (health check passed)
2. Sprawdź czy `CHECK_INTERVAL` nie jest za duży
3. Sprawdź logi w `dashboard-logs-XXX`

---

## 💰 Koszty

### **GitHub Actions Free Plan:**
- **2000 minut/miesiąc** bezpłatnie
- Ten test: **~2.5h = 150 minut**
- Możesz uruchomić **~13 testów/miesiąc** za darmo!

### **GitHub Actions Paid Plans:**
- Pro: $4/miesiąc + więcej minut
- Team: $4/user/miesiąc + więcej minut
- Enterprise: Custom pricing

---

## 📈 Skalowanie

### **Dłuższe Testy**

```bash
# 4 godziny (96h symulacji przy 24x)
gh workflow run extended-test.yml -f test_duration=4

# 8 godzin (192h symulacji)
gh workflow run extended-test.yml -f test_duration=8
```

### **Wolniejsza Symulacja (więcej danych)**

```bash
# 2h test z 12x przyspieszeniem = 24h symulacji
gh workflow run extended-test.yml -f time_multiplier=12
```

### **Matrix Testing (wiele równoległych testów)**

Edytuj workflow:

```yaml
strategy:
  matrix:
    test_config:
      - { duration: 2, multiplier: 24 }
      - { duration: 4, multiplier: 12 }
      - { duration: 1, multiplier: 48 }
```

---

## 🎯 Następne Kroki

### **Integracja z Notifications:**

1. **Slack/Discord Notifications:**
   ```yaml
   - name: 📢 Notify Slack
     uses: slackapi/slack-github-action@v1
     with:
       payload: |
         {
           "text": "Test completed! Portfolio: ${{ env.FINAL_PORTFOLIO }}"
         }
   ```

2. **Email Notifications:**
   Skonfiguruj w Settings → Notifications

3. **GitHub Releases:**
   Automatyczne tworzenie release z wynikami testu

---

## 📚 Przydatne Linki

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub Actions Pricing](https://github.com/pricing)

---

## 🚀 Quick Start Commands

```bash
# Status workflow
gh workflow list

# Uruchom test
gh workflow run extended-test.yml

# Zobacz running workflows
gh run list

# Zobacz szczegóły last run
gh run view

# Pobierz artifacts z last run
gh run download
```

---

**🎉 Gotowe! Test działa w chmurze bez Codespace!** 🚀
