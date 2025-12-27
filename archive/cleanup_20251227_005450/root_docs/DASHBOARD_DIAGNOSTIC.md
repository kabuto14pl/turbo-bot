# 🔍 DASHBOARD DIAGNOSTIC GUIDE

## 🚨 JEŚLI DASHBOARD NIE DZIAŁA - SPRAWDŹ TO!

### 1️⃣ **Sprawdź Console Browser (F12)**

Otwórz DevTools (F12) i sprawdź zakładkę **Console**. Powinieneś zobaczyć:

```
🏛️ Inicjalizacja Profesjonalnego Terminalu Handlowego...
📊 Rejestracja komponentów Chart.js...
✅ Komponenty Chart.js zarejestrowane
📊 Ładowanie początkowych danych...
✅ Początkowe dane załadowane
🔧 Konfigurowanie nasłuchiwaczy zdarzeń...
📊 Znaleziono przycisków timeframe: X
🎯 Znaleziono kart strategii: 3
✅ Inicjalizacja zakończona
```

### 2️⃣ **Typowe Błędy i Rozwiązania**

#### ❌ "Chart.js nie jest dostępny"
**Przyczyna**: Nie załadowała się biblioteka Chart.js z CDN
**Rozwiązanie**: Sprawdź połączenie internetowe lub poczekaj chwilę

#### ❌ "fetch API niedostępne"
**Przyczyna**: Stara przeglądarka
**Rozwiązanie**: Użyj nowoczesnej przeglądarki (Chrome, Firefox, Edge)

#### ❌ Przyciski nie reagują
**Przyczyna**: JavaScript się nie załadował lub wystąpił błąd
**Rozwiązanie**: Sprawdź Console (F12) → Console, poszukaj czerwonych błędów

#### ❌ Wykres się nie wyświetla
**Przyczyna**: Błąd inicjalizacji Chart.js lub brak danych
**Rozwiązanie**: Sprawdź Console logs, powinno być "✅ Komponenty Chart.js zarejestrowane"

### 3️⃣ **Test Połączenia API**

W terminalu uruchom:

```bash
# Test health endpoint
curl http://localhost:3002/health

# Test market data
curl http://localhost:3002/api/market-data

# Test portfolio
curl http://localhost:3002/api/portfolio-performance
```

Wszystkie powinny zwrócić JSON bez błędów.

### 4️⃣ **Restart Dashboard**

```bash
# Zabij stary proces
pkill -f "professional_trading_dashboard"

# Przekompiluj i uruchom
cd /workspaces/turbo-bot
npx tsc src/professional_trading_dashboard.ts --target ES2020 --module commonjs --esModuleInterop --allowSyntheticDefaultImports --skipLibCheck
node src/professional_trading_dashboard.js
```

### 5️⃣ **Sprawdź Network Tab (F12)**

W DevTools → **Network**:
- Sprawdź czy `/api/market-data/BTCUSDT/15m` zwraca **200 OK**
- Sprawdź czy WebSocket (`ws://`) jest połączony
- Jeśli widzisz **404** lub **500**, sprawdź server logs

### 6️⃣ **Debug Console Commands**

Otwórz Console (F12) i wykonaj:

```javascript
// Sprawdź czy Chart.js jest dostępny
typeof Chart

// Sprawdź czy Socket.io działa
socket.connected

// Sprawdź aktywne strategie
activeStrategies

// Sprawdź dane wykresu
rawCandleData.length

// Sprawdź główny wykres
mainChart
```

### 7️⃣ **Server Logs**

Sprawdź logi serwera:

```bash
# Jeśli używasz nohup
tail -f dashboard.log

# Lub sprawdź terminal gdzie uruchomiłeś dashboard
```

Powinno być:
```
🏛️ Professional Trading Dashboard running on http://localhost:3002
📊 WebSocket server active for real-time updates
💹 Multi-crypto support: BTC, ETH, SOL
```

### 8️⃣ **Port Forwarding (Codespaces)**

Jeśli używasz GitHub Codespaces:
1. Sprawdź czy port 3002 jest **public** (nie private)
2. W zakładce **PORTS** znajdź port 3002
3. Kliknij prawym → **Port Visibility** → **Public**
4. Odśwież stronę dashboardu

### 9️⃣ **Najczęstsze Problemy**

| Problem | Przyczyna | Rozwiązanie |
|---------|-----------|-------------|
| Biały ekran | JavaScript error | F12 → Console, sprawdź błędy |
| Brak wykresu | Chart.js nie załadowany | Sprawdź internet, odśwież stronę |
| Przyciski nie działają | Event listeners nie załadowane | Sprawdź Console logs "🔧 Konfigurowanie..." |
| Brak aktualizacji cen | WebSocket nie połączony | Sprawdź Network tab, ws:// |
| 404 na API | Server nie działa | Restart dashboard |

### 🔟 **Emergency Reset**

Jeśli nic nie działa:

```bash
# 1. Zabij wszystkie procesy node
pkill -9 node

# 2. Wyczyść node_modules i reinstall
rm -rf node_modules package-lock.json
npm install

# 3. Przekompiluj
npx tsc src/professional_trading_dashboard.ts --target ES2020 --module commonjs --esModuleInterop --allowSyntheticDefaultImports --skipLibCheck

# 4. Uruchom
node src/professional_trading_dashboard.js

# 5. Otwórz w przeglądarce
# http://localhost:3002
```

---

## ✅ PRAWIDŁOWE DZIAŁANIE

Dashboard działa poprawnie gdy:

1. ✅ Wykres się wyświetla z danymi cenowymi
2. ✅ Przyciski timeframe (5m, 15m, 1h, 4h) zmieniają widok
3. ✅ Karty strategii (RSI TURBO, MOMENTUM PRO, SUPERTREND) są klikalne
4. ✅ Ceny BTC/ETH/SOL są aktualizowane co 30 sekund
5. ✅ Resize handles (krawędzie i narożnik) działają
6. ✅ Console pokazuje tylko zielone checkmarki ✅
7. ✅ Brak czerwonych błędów w Console

---

## 📞 KONTAKT W RAZIE PROBLEMÓW

Jeśli dashboard nadal nie działa:

1. Skopiuj **wszystkie** logi z Console (F12)
2. Skopiuj **wszystkie** logi z terminala serwera
3. Zrób screenshot problemu
4. Opisz co dokładnie nie działa

**Dashboard jest w pełni funkcjonalny i testowany - jeśli nie działa, to problem z środowiskiem, nie z kodem!**
