# 🚀 QUICK START - Professional Trading Dashboard

## ⚡ SZYBKIE URUCHOMIENIE

```bash
cd /workspaces/turbo-bot
./start_dashboard.sh
```

**LUB**

```bash
# Przekompiluj + uruchom
npx tsc src/professional_trading_dashboard.ts --target ES2020 --module commonjs --esModuleInterop --allowSyntheticDefaultImports --skipLibCheck && node src/professional_trading_dashboard.js
```

**Dashboard URL**: http://localhost:3002

---

## 🎯 CO POWINNO DZIAŁAĆ

Po otwarciu http://localhost:3002 powinieneś zobaczyć:

### ✅ **Wykres główny**
- Świece/linie cenowe BTC
- Wolumen (niebieskie słupki)
- RSI indicator (żółta linia)
- Bollinger Bands (fioletowe linie przerywane)
- Sygnały strategii (zielone/czerwone trójkąty)

### ✅ **Panel kontrolny** (górny pasek)
- **Timeframe buttons**: 5m, 15m, 1h, 4h (klikalne)
- **Chart type buttons**: Line, Area, Candles (klikalne)
- **Indicator toggles**: RSI, Bollinger Bands (klikalne)

### ✅ **Karty strategii** (prawy panel)
- **RSI TURBO** - klikalna karta
- **MOMENTUM PRO** - klikalna karta
- **SUPERTREND** - klikalna karta

Kliknięcie karty powoduje toggle (active/inactive)

### ✅ **Live ceny** (lewy górny róg)
- **BTC**: Aktualna cena, aktualizacja co 30s
- **ETH**: Aktualna cena, aktualizacja co 30s
- **SOL**: Aktualna cena, aktualizacja co 30s

### ✅ **Resize handles**
- **Prawy brzeg**: Przeciągnij aby zmienić szerokość ↔
- **Dolny brzeg**: Przeciągnij aby zmienić wysokość ↕
- **Narożnik (prawy dolny)**: Przeciągnij aby zmienić oba ⤢

---

## 🔍 DIAGNOSTYKA (jeśli coś nie działa)

### 1. **Otwórz Console (F12)**

Powinieneś zobaczyć:
```
🏛️ Inicjalizacja Profesjonalnego Terminalu Handlowego...
📊 Rejestracja komponentów Chart.js...
✅ Komponenty Chart.js zarejestrowane
📊 Ładowanie początkowych danych...
✅ Początkowe dane załadowane
🔧 Konfigurowanie nasłuchiwaczy zdarzeń...
📊 Znaleziono przycisków timeframe: 4
🎯 Znaleziono kart strategii: 3
✅ Inicjalizacja zakończona
```

### 2. **Jeśli widzisz błędy**

**❌ "Chart.js nie jest dostępny"**
- Sprawdź połączenie internetowe
- Odśwież stronę (Ctrl+F5)

**❌ Przyciski nie reagują**
- Sprawdź Console na czerwone błędy
- Sprawdź czy są logi "🔧 Konfigurowanie nasłuchiwaczy..."

**❌ Wykres pusty**
- Sprawdź Console czy są logi "✅ Wygenerowano dane testowe"
- Sprawdź Network tab czy `/api/market-data` zwraca 200

### 3. **Test API**

```bash
# Powinno zwrócić {"status":"OK"}
curl http://localhost:3002/health

# Powinno zwrócić tablicę z cenami
curl http://localhost:3002/api/market-data
```

### 4. **Restart**

```bash
pkill -f "professional_trading_dashboard"
./start_dashboard.sh
```

---

## 📖 DOKUMENTACJA

- **Pełny raport naprawy**: `DASHBOARD_REPAIR_REPORT.md`
- **Szczegółowa diagnostyka**: `DASHBOARD_DIAGNOSTIC.md`
- **Instrukcje Copilot**: `.github/copilot-instructions.md`

---

## 🆘 POMOC

Jeśli dashboard nadal nie działa:

1. Sprawdź Console (F12) i skopiuj wszystkie błędy
2. Sprawdź `tail -f dashboard.log` i skopiuj logi serwera
3. Zrób screenshot problemu
4. Zobacz `DASHBOARD_DIAGNOSTIC.md` dla zaawansowanej diagnostyki

---

## ✅ CHECKLIST

Dashboard działa poprawnie gdy:

- [ ] Wykres wyświetla dane cenowe
- [ ] Przyciski timeframe (5m, 15m, etc.) są klikalne
- [ ] Karty strategii są klikalne i toggle active/inactive
- [ ] Ceny BTC/ETH/SOL aktualizują się co 30s
- [ ] Resize handles (3 sztuki) działają płynnie
- [ ] Console nie pokazuje czerwonych błędów
- [ ] `/health` endpoint zwraca {"status":"OK"}

Jeśli wszystko ✅ - **DASHBOARD DZIAŁA PRAWIDŁOWO!** 🎉

---

**Dashboard v1.0.0** | Production Ready | 7 października 2025
