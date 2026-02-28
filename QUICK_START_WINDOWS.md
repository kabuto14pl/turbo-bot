# 🚀 QUICK START - Uruchomienie Bota (Windows)

## ⚡ SZYBKIE URUCHOMIENIE

### Krok 1: Otwórz PowerShell w katalogu projektu

```powershell
cd C:\Users\dudzi\turbo-bot-local
```

### Krok 2: Uruchom skrypt automatyczny

```powershell
.\start_bot_auto.ps1
```

**To wszystko!** Skrypt automatycznie:
- ✅ Poczeka na zakończenie `npm install` (jeśli trwa)
- ✅ Ustawi zmienne środowiskowe dla simulation mode
- ✅ Utworzy katalog logs
- ✅ Uruchomi bota w trybie symulacji 48h

---

## 📊 CO ZOBACZYSZ

Po uruchomieniu bota (kilka pierwszych linii):

```
🚀 [instance_1] Autonomous Trading Bot Starting...
✅ [instance_1] Configuration loaded - Mode: SIMULATION
✅ [instance_1] Enterprise ML System initialized
✅ [instance_1] Real features enabled (no Math.random)
✅ [instance_1] Periodic retraining: ACTIVE (every 1h)
🧠 [instance_1] ML Learning Phase: WARMUP
📊 [instance_1] Starting autonomous trading cycle...
```

Każde ~30 sekund(trading cycle):

```
📊 [instance_1] Processing candle #237
🧠 [instance_1] ML action: BUY, confidence: 0.752
📈 [instance_1] Enterprise ML Signal: BUY (75.2% confidence)
✅ [instance_1] Trade executed: BUY BTCUSDT @ $45,234.56
💰 [instance_1] P&L: +$156.78 (+1.57%)
``

Co godzinę (ML retraining):

```
🔄 [instance_1] Starting periodic retraining...
📊 Experiences collected: 127 trades
📈 Win rate before: 84.2%
✅ Retraining complete! Win rate after: 85.1%
```

---

## 🛑 JAK ZATRZYMAĆ BOTA

Naciśnij **Ctrl + C** w PowerShell

Bot zatrzyma się gracefully (zapisze stan)

---

## 📁 LOGI I MONITORING

### Logi real-time (w czasie rzeczywistym):

```powershell
Get-Content logs/simulation_48h/bot_output.log -Wait -Tail 50
```

### Sprawdź API health (w osobnej PowerShell):

```powershell
curl http://localhost:3000/health
```

### Sprawdź metryki Prometheus:

```powershell
curl http://localhost:9090/metrics
```

### Sprawdź portfolio status:

```powershell
curl http://localhost:3000/api/portfolio
```

---

## 🔍 MONITORING W TRAKCIE 48H

### Opcja 1: Ręczne sprawdzanie co godzinę

```powershell
# Liczba transakcji
Select-String -Path "logs/simulation_48h/bot_output.log" -Pattern "Trade executed" | Measure-Object

# Ostatnie 10 ML signals
Select-String -Path "logs/simulation_48h/bot_output.log" -Pattern "ML Signal" | Select-Object -Last 10

# Poziom pewności ML
Select-String -Path "logs/simulation_48h/bot_output.log" -Pattern "confidence:" | Select-Object -Last 20
```

### Opcja 2: Automatyczny monitoring script

Otwórz DRUGĄ PowerShell i uruchom:

```powershell
cd C:\Users\dudzi\turbo-bot-local

# Monitoring loop (co 5 minut)
while ($true) {
    Clear-Host
    Write-Host "=== BOT MONITORING ===" -ForegroundColor Cyan
    Write-Host "Time: $(Get-Date)" -ForegroundColor Green
    
    # Liczba transakcji
    $trades = (Select-String -Path "logs/simulation_48h/bot_output.log" -Pattern "Trade executed").Count
   Write-Host "Total Trades: $trades" -ForegroundColor Yellow
    
    # Ostatni ML signal
    $lastSignal = Select-String -Path "logs/simulation_48h/bot_output.log" -Pattern "ML Signal" | Select-Object -Last 1
    Write-Host "Last Signal: $lastSignal" -ForegroundColor Cyan
    
    # API Health
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 3
        Write-Host "API Status: ONLINE" -ForegroundColor Green
    } catch {
        Write-Host "API Status: OFFLINE" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 300  # 5 minutes
}
```

---

## ✅ SUCCESS INDICATORS (Po 48h)

### System Stability:
- [ ] Bot działał 48h non-stop (0 restartów)
- [ ] Brak error messages w logach
- [ ] API health zawsze OK

### ML Performance:
- [ ] Experience buffer > 500 trades
- [ ] ~48 retraining events (co godzinę)
- [ ] Win rate > 80%
- [ ] ML confidence wzrosła (0.17 → 0.25+)

### Trading Performance:
- [ ] > 100 trades wykonanych
- [ ] Positive overall P&L
- [ ] Max drawdown < 15%
- [ ] Sharpe ratio > 0.5

---

## 🚨 CO ZROBIĆ GDY...

### Bot się nie uruchamia:

```powershell
# 1. Sprawdź czy dependencies są zainstalowane
Test-Path "node_modules/dotenv"

# Jeśli FALSE, uruchom:
npm install

# 2. Sprawdź czy jesteś w właściwym katalogu
Get-Location  # Powinno być: C:\Users\dudzi\turbo-bot-local
```

### Bot crashuje po uruchomieniu:

```powershell
# Sprawdź logi error:
Select-String -Path "logs/simulation_48h/bot_output.log" -Pattern "ERROR|Error"

# Uruchom z pełnym debugowaniem:
$env:LOG_LEVEL="debug"
.\start_bot_auto.ps1
```

### API nie odpowiada:

```powershell
# Sprawdź czy port 3000 jest zajęty:
Get-NetTCPConnection -LocalPort 3000

# Zmień port w .env:
# PORT=3001
```

---

## 📊 PO 48 GODZINACH - ANALIZA

```powershell
# 1. Zatrzymaj bota (Ctrl+C)

# 2. Zbierz logi do archiwum
$date = Get-Date -Format "yyyyMMdd"
Copy-Item "logs/simulation_48h" -Destination "logs/ARCHIVE_48h_$date" -Recurse

# 3. Statystyki podstawowe
Write-Host "`n=== 48H SIMULATION REPORT ===" -ForegroundColor Cyan

# Liczba transakcji
$totalTrades = (Select-String -Path "logs/simulation_48h/bot_output.log" -Pattern "Trade executed").Count
Write-Host "Total Trades: $totalTrades" -ForegroundColor Green

# ML Retraining events
$retraining = (Select-String -Path "logs/simulation_48h/bot_output.log" -Pattern "Periodic retraining").Count
Write-Host "ML Retraining Events: $retraining / 48 expected" -ForegroundColor Cyan

# Błędy
$errors = (Select-String -Path "logs/simulation_48h/bot_output.log" -Pattern "ERROR").Count
Write-Host "Errors: $errors" -ForegroundColor $(if ($errors -gt 0) {"Red"} else {"Green"})

# Win rate final (ostatnie 10 linii z win_rate)
Write-Host "`nFinal Win Rates:" -ForegroundColor Yellow
Select-String -Path "logs/simulation_48h/bot_output.log" -Pattern "win_rate" | Select-Object -Last 10
```

---

## 🎯 GOTOWE!

Uruchom: `.\start_bot_auto.ps1` i obserwuj przez 48h! 🚀

**Bot jest w pełni autonomiczny** - nie wymaga ingerencji przez 48h.

Możesz zamknąć konsolę (bot będzie działał w tle) lub pozostawić otwartą do obserwacji logów.
