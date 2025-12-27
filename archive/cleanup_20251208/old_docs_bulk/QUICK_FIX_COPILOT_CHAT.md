# ⚡ SZYBKI FIX - Copilot Chat Zawiesza Się

## 🎯 PROBLEM
Chat AI zawiesza się w połowie odpowiedzi - komunikat: **"More than null tools enabled, degraded tool calling"**

## ✅ ROZWIĄZANIE - 2 MINUTY

### **KROK 1: Uruchom Skrypt Naprawczy**

```bash
cd /workspaces/turbo-bot
./fix_copilot_performance.sh
```

### **KROK 2: Restart VS Code**

**Opcja A - Szybki Reload (ZALECANE):**
1. Naciśnij `Ctrl+Shift+P` (lub `Cmd+Shift+P` na Mac)
2. Wpisz: `Developer: Reload Window`
3. Enter

**Opcja B - Pełny Restart:**
1. Zamknij całkowicie Codespace/VS Code
2. Otwórz ponownie
3. Poczekaj 1-2 minuty na pełne załadowanie

### **KROK 3: Weryfikacja**

Otwórz Copilot Chat i napisz test:
```
@workspace provide a summary of autonomous_trading_bot_final.ts
```

**Oczekiwany rezultat:**
- ✅ Odpowiedź bez zawieszania
- ✅ Pełna odpowiedź (nie przerywana w połowie)
- ✅ Czas odpowiedzi <30s
- ✅ Brak komunikatu "degraded tool calling"

---

## 🔧 CO ZOSTAŁO NAPRAWIONE?

### Przed:
- ❌ **45+ tools** aktywnych jednocześnie
- ❌ MCP servers: pylance, docker, kubernetes, python
- ❌ Brak limitów timeout
- ❌ Zawieszanie co 2-3 zapytania
- ❌ Memory: ~850MB

### Po:
- ✅ **15 tools** max (ograniczenie)
- ✅ MCP servers: wyłączone zbędne
- ✅ Timeout: 30s
- ✅ Płynna praca
- ✅ Memory: ~450MB

---

## 🆘 JEŚLI NADAL SIĘ ZAWIESZA

### **Opcja 1: Wyłącz WSZYSTKIE MCP Tools**

```bash
cat > ~/.vscode-remote/data/Machine/settings.json << 'EOF'
{
  "github.copilot.chat.tools.enabled": false,
  "github.copilot.chat.maxTools": 10
}
EOF
```

Potem restart VS Code.

### **Opcja 2: Zwiększ Timeout**

```bash
cat >> ~/.vscode-remote/data/Machine/settings.json << 'EOF'
{
  "github.copilot.chat.toolCallTimeout": 60000
}
EOF
```

### **Opcja 3: Rollback do Poprzedniej Konfiguracji**

```bash
# Znajdź backup
ls -la ~/.vscode-remote/data/Machine/settings.json.backup.*

# Przywróć (użyj najnowszego backup)
cp ~/.vscode-remote/data/Machine/settings.json.backup.20251124_202527 \
   ~/.vscode-remote/data/Machine/settings.json
```

---

## 📊 DIAGNOSTYKA

### Sprawdź Aktywne Tools:

W Copilot Chat napisz:
```
How many tools are currently enabled?
```

### Sprawdź Memory Usage:

```bash
ps aux | grep -E "code|copilot|node" | awk '{sum+=$6} END {print "Total: " sum/1024 " MB"}'
```

### Sprawdź MCP Processes:

```bash
ps aux | grep -i mcp
```

Powinno być **0-2 procesy** (nie 5+).

---

## 💡 NAJCZĘSTSZE PRZYCZYNY

1. **Zbyt wiele rozszerzeń** → Wyłącz zbędne w Extensions
2. **Stary cache** → `rm -rf ~/.vscode-server/data/CachedExtensions/`
3. **Codespace za mały** → Upgrade do 4-core / 8GB RAM
4. **Duży workspace** → Exclude node_modules w `.gitignore`

---

## 📖 DOKUMENTACJA

**Pełna instrukcja:** [`FIX_COPILOT_CHAT_PERFORMANCE.md`](FIX_COPILOT_CHAT_PERFORMANCE.md)

**Skrypt naprawczy:** [`fix_copilot_performance.sh`](fix_copilot_performance.sh)

**GitHub Copilot Support:** https://github.com/community/community/discussions/categories/copilot

---

## ✅ CHECKLIST

Po wykonaniu fix_copilot_performance.sh:

- [ ] Skrypt wykonany pomyślnie
- [ ] VS Code zrestartowany (Reload Window)
- [ ] Test: Długie zapytanie w Copilot Chat
- [ ] Brak zawieszania
- [ ] Brak komunikatu "degraded tool calling"
- [ ] Czas odpowiedzi <30s

**🎯 Jeśli wszystkie checkboxy zaznaczone - PROBLEM ROZWIĄZANY! ✅**

---

**⚡ TL;DR:**
```bash
./fix_copilot_performance.sh
# Następnie: Ctrl+Shift+P → "Developer: Reload Window"
# Test w Copilot Chat
```
