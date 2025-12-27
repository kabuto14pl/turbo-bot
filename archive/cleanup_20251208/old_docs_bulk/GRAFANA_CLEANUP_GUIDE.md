<!-- 📚 [SHARED-INFRASTRUCTURE] -->
<!-- Documentation component -->
# 🗑️ INSTRUKCJA USUWANIA DASHBOARDÓW Z GRAFANY

## 🎯 **PROBLEM:** Masz za dużo dashboardów trading bot i chcesz je usunąć

Lista Twoich dashboardów do usunięcia:
```
- Trading Bot Dashboard
- ✅ STABLE Trading Bot Dashboard  
- 🚀 Advanced Trading Bot Dashboard - Enterprise
- 🚀 Autonomous Trading Bot - Enterprise Dashboard
- 🚀 Autonomous Trading Bot - Live Dashboard
- 🚀 AUTONOMOUS TRADING BOT - Production Dashboard
- 🚀 AUTONOMOUS TRADING BOT - Production Dashboard1
- 🤖 Autonomous Trading Bot - Live Dashboard
- 🤖 FIXED Trading Bot Dashboard
- 🤖 Simple Trading Bot Dashboard
- 🤖 Working Trading Bot Dashboard
```

## 🔥 **METODA 1: MASS DELETE (NAJSZYBSZA)**

### **Krok 1: Przejdź do Home**
```
1. W Grafanie kliknij ikonę 🏠 (Home) w lewym górnym rogu
2. Zobaczysz listę wszystkich dashboardów
```

### **Krok 2: Usuń dashboardy masowo**
```
1. Na liście dashboardów znajdź każdy dashboard z "trading" w nazwie
2. Po prawej stronie każdego dashboardu jest ikona kosza 🗑️
3. Kliknij 🗑️ dla każdego dashboardu
4. Potwierdź usunięcie klikając "Delete"
```

**💡 PROTIP:** Możesz otworzyć kilka kart przeglądarki i usuwać równolegle!

## 🔥 **METODA 2: POJEDYNCZE USUWANIE**

### **Dla każdego dashboardu:**
```
1. Otwórz dashboard (kliknij na nazwę)
2. Kliknij ikonę ⚙️ (Dashboard Settings) w górnej belce
3. Przewiń w dół do sekcji "Danger Zone" (czerwona sekcja)
4. Kliknij "Delete Dashboard" 
5. Wpisz nazwę dashboardu dla potwierdzenia
6. Kliknij "Delete" ostatecznie
```

## 🎯 **METODA 3: FILTROWANIE I USUWANIE**

### **Użyj wyszukiwania:**
```
1. W Home, w polu Search wpisz "trading"
2. Zobaczysz tylko dashboardy z "trading" w nazwie
3. Usuń wszystkie po kolei używając ikony 🗑️
```

### **Lub wpisz specific tags:**
```
- Wyszukaj "bot" - znajdzie wszystkie z tag "bot"
- Wyszukaj "autonomous" - znajdzie enterprise dashboardy
- Wyszukaj "crypto" - znajdzie crypto dashboardy
```

## 📋 **ZALECANE DASHBOARDY DO ZACHOWANIA:**

**ZACHOWAJ TYLKO JEDEN Z TYCH:**
- `🚀 Trading Bot - KOMPATYBILNY Dashboard` (jeśli działający)
- `TRADING_BOT_COMPATIBLE_DASHBOARD` (z naszych plików)

**USUŃ WSZYSTKIE INNE!**

## ⚠️ **WAŻNE OSTRZEŻENIA:**

### **Sprawdź przed usunięciem:**
```
1. Otwórz dashboard
2. Sprawdź czy pokazuje dane (czy panels mają dane)
3. Jeśli NIE ma danych - USUŃ
4. Jeśli ma dane ale nie jest to ten główny - USUŃ
```

### **Backup (opcjonalnie):**
```
1. Przed usunięciem możesz wyeksportować dashboard
2. Dashboard Settings → JSON Model → Copy to Clipboard
3. Zapisz w pliku .json jako backup
```

## 🚀 **SZYBKI SKRYPT DO MASS DELETE (przez przeglądarkę)**

### **Otwórz Console w przeglądarce:**
```javascript
// 1. Idź do Home w Grafanie
// 2. Naciśnij F12 (Developer Tools)
// 3. Idź do tab "Console"
// 4. Wklej ten kod:

// Znajdź wszystkie ikony delete dla dashboardów z "trading"
const deleteButtons = Array.from(document.querySelectorAll('[aria-label*="Delete"]'))
  .filter(btn => {
    const dashboardName = btn.closest('li')?.textContent || '';
    return dashboardName.toLowerCase().includes('trading') || 
           dashboardName.toLowerCase().includes('bot');
  });

console.log(`Znaleziono ${deleteButtons.length} dashboardów do usunięcia`);

// UWAGA: Ten kod tylko znajdzie buttony, musisz kliknąć ręcznie!
deleteButtons.forEach((btn, index) => {
  console.log(`${index + 1}. ${btn.closest('li')?.textContent}`);
});
```

## 🎯 **KOŃCOWY CEL:**

**Po usunięciu powinieneś mieć:**
- ✅ **JEDEN działający dashboard** z danymi bota
- ✅ **Czysta lista** bez duplikatów
- ✅ **Łatwą nawigację** w Grafanie

## 🔧 **JEŚLI MASZ PROBLEMY:**

### **Dashboard się nie usuwa:**
```
1. Sprawdź czy masz uprawnienia admin
2. Spróbuj odświeżyć stronę (F5)
3. Wyloguj się i zaloguj ponownie
```

### **Nie widzisz ikony kosza:**
```
1. Sprawdź czy jesteś w Home (nie w folderze)
2. Sprawdź czy masz uprawnienia do edycji
3. Spróbuj przez Dashboard Settings → Delete
```

### **Chcesz zachować ustawienia:**
```
1. Przed usunięciem - Export JSON
2. Po wyczyszczeniu - Import najlepszego dashboardu
3. Ustaw jako favorite (gwiazdka ⭐)
```

## ✅ **PODSUMOWANIE KROKÓW:**

1. **Idź do Home** 🏠
2. **Znajdź dashboardy** z "trading/bot" w nazwie  
3. **Kliknij 🗑️** przy każdym niepotrzebnym
4. **Potwierdź Delete**
5. **Zachowaj tylko jeden działający**
6. **Sprawdź czy dane się wyświetlają** ✅

**Gotowe!** Będziesz miał czystą Grafanę z jednym działającym dashboardem! 🎉
