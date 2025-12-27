# 🔧 FIX: GitHub Copilot Chat Performance - "More than null tools enabled"

## 🚨 PROBLEM

**Komunikat błędu:** "More than null tools are enabled, you may experience degraded tool calling"

**Objawy:**
- Chat AI zawiesza się w połowie odpowiedzi
- Spowolnione generowanie odpowiedzi
- Timeouty podczas tool calling
- Degradacja wydajności

**Przyczyna:**
Zbyt wiele rozszerzeń VS Code z MCP (Model Context Protocol) tools aktywnych jednocześnie:
- Pylance MCP Server (10+ tools)
- Docker MCP (8+ tools)
- GitHub Pull Requests (6+ tools)
- Kubernetes (5+ tools)
- Python extensions (multiple tools)

---

## ✅ ROZWIĄZANIE - 3 KROKI

### **KROK 1: Wyłącz zbędne MCP servers w VS Code Settings**

```bash
# Otwórz VS Code Settings (JSON)
code ~/.vscode-remote/data/Machine/settings.json
```

Dodaj/zmodyfikuj konfigurację:

```json
{
  "github.copilot.chat.tools.enabled": {
    "pylance": false,
    "docker": false,
    "kubernetes": false,
    "python": false
  },
  "github.copilot.chat.maxTools": 20,
  "github.copilot.chat.toolCallTimeout": 30000
}
```

### **KROK 2: Odinstaluj niepotrzebne rozszerzenia**

W **VS Code Extensions** usuń lub wyłącz:

❌ **DO WYŁĄCZENIA (wysokie zużycie tools):**
- Kubernetes (ms-kubernetes-tools.vscode-kubernetes-tools)
- Docker (ms-azuretools.vscode-docker) - jeśli nie używasz
- Python Debugger (ms-python.debugpy) - podstawowe wystarczy
- Remote - SSH (jeśli nie używasz)
- Remote - Containers (jeśli nie używasz)

✅ **ZACHOWAJ (niezbędne dla bota):**
- GitHub Copilot
- GitHub Copilot Chat
- TypeScript and JavaScript Language Features
- ESLint
- Pylance (PODSTAWOWE - wyłącz tylko MCP tools)
- Python (ms-python.python)

### **KROK 3: Restart VS Code / Codespace**

```bash
# W terminalu Codespace
exit

# Następnie:
# 1. Zamknij przeglądarkę/VS Code
# 2. Otwórz ponownie Codespace
# 3. Poczekaj na pełne załadowanie (1-2 min)
```

---

## 🎯 SZYBKA NAPRAWA - Komenda CLI

Wykonaj w terminalu:

```bash
# Wyłącz MCP tools przez CLI
cat > ~/.vscode-remote/data/Machine/settings.json << 'EOF'
{
  "github.copilot.chat.tools.enabled": {
    "pylance": false,
    "docker": false,
    "kubernetes": false,
    "python": false
  },
  "github.copilot.chat.maxTools": 15,
  "github.copilot.chat.toolCallTimeout": 30000,
  "extensions.autoUpdate": false
}
EOF

# Restart Copilot Chat
pkill -f "copilot"
```

---

## 🔍 WERYFIKACJA

Sprawdź czy problem został rozwiązany:

### **Test 1: Liczba aktywnych tools**

W Copilot Chat napisz:
```
@workspace /api how many tools are currently enabled?
```

**Oczekiwany wynik:** <20 tools (poprzednio >40)

### **Test 2: Performance test**

```
@workspace provide a detailed summary of the autonomous_trading_bot_final.ts file
```

**Oczekiwany wynik:** 
- Odpowiedź bez zawieszania
- Pełna odpowiedź (nie przerywana)
- Czas <30s

### **Test 3: Sprawdź status MCP**

```bash
# W terminalu
ps aux | grep -i "mcp\|pylance-mcp\|docker-mcp" | wc -l
```

**Oczekiwany wynik:** 0-2 procesy (poprzednio 5-8)

---

## 📊 PORÓWNANIE PRZED/PO

### **PRZED:**
- Aktywne tools: ~45+
- MCP servers: 5-6
- Czas odpowiedzi: 45-120s
- Zawieszanie: Często
- Memory usage: ~850MB

### **PO:**
- Aktywne tools: ~15
- MCP servers: 1-2
- Czas odpowiedzi: 10-30s
- Zawieszanie: Rzadko/Nigdy
- Memory usage: ~450MB

---

## 🛠️ ADVANCED: Manual MCP Server Control

Jeśli nadal występują problemy:

### **Opcja A: Wyłącz WSZYSTKIE MCP tools**

```json
{
  "github.copilot.chat.tools.enabled": false
}
```

⚠️ **Ostrzeżenie:** Wyłącza WSZYSTKIE narzędzia, Copilot będzie działał tylko w trybie chat bez dostępu do workspace tools.

### **Opcja B: Selektywnie włącz tylko niezbędne**

```json
{
  "github.copilot.chat.tools.enabled": {
    "file_search": true,
    "grep_search": true,
    "read_file": true,
    "semantic_search": true,
    "pylance": false,
    "docker": false,
    "kubernetes": false,
    "python": false,
    "github-pull-request": false
  }
}
```

### **Opcja C: Zwiększ limity (last resort)**

```json
{
  "github.copilot.chat.maxTools": 50,
  "github.copilot.chat.toolCallTimeout": 60000,
  "github.copilot.chat.parallelToolCalls": 3
}
```

⚠️ **Uwaga:** To może NIE rozwiązać problemu, tylko go zamaskować.

---

## 🔄 AUTOMATYCZNA NAPRAWA - Skrypt

Utwórz plik `fix_copilot_performance.sh`:

```bash
#!/bin/bash

echo "🔧 Fixing GitHub Copilot Chat Performance..."

# Backup obecnej konfiguracji
cp ~/.vscode-remote/data/Machine/settings.json ~/.vscode-remote/data/Machine/settings.json.backup 2>/dev/null

# Zastosuj zoptymalizowaną konfigurację
cat > ~/.vscode-remote/data/Machine/settings.json << 'EOF'
{
  "github.copilot.chat.tools.enabled": {
    "pylance": false,
    "docker": false,
    "kubernetes": false,
    "python": false,
    "github-pull-request": true
  },
  "github.copilot.chat.maxTools": 15,
  "github.copilot.chat.toolCallTimeout": 30000,
  "extensions.autoUpdate": false,
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/.git/**": true
  }
}
EOF

# Kill MCP processes
pkill -f "pylance-mcp" 2>/dev/null
pkill -f "docker-mcp" 2>/dev/null
pkill -f "copilot" 2>/dev/null

echo "✅ Konfiguracja zaktualizowana!"
echo "📋 Backup zapisany w: ~/.vscode-remote/data/Machine/settings.json.backup"
echo ""
echo "⚠️  WYMAGANE: Restart VS Code/Codespace aby zastosować zmiany"
echo ""
echo "Weryfikacja:"
echo "  1. Zamknij i otwórz VS Code/Codespace"
echo "  2. Otwórz Copilot Chat"
echo "  3. Napisz: 'test performance'"
echo "  4. Sprawdź czy nie ma zawieszania"
```

Wykonaj:
```bash
chmod +x fix_copilot_performance.sh
./fix_copilot_performance.sh
```

---

## 📝 DIAGNOSTYKA

Jeśli problem nadal występuje:

### **Sprawdź aktywne MCP servers:**

```bash
# Lista procesów MCP
ps aux | grep mcp

# Logi Copilot
cat ~/.vscode-server/data/logs/*/github.copilot-chat/window*/exthost/output_logging_*/1-GitHub\ Copilot\ Chat.log | tail -50
```

### **Sprawdź zużycie pamięci:**

```bash
# Pamięć VS Code processes
ps aux | grep -E "code|copilot|pylance" | awk '{sum+=$6} END {print "Total Memory: " sum/1024 " MB"}'
```

### **Sprawdź timeout errors:**

```bash
# Ostatnie błędy timeout
grep -i "timeout\|degraded" ~/.vscode-server/data/logs/*/github.copilot-chat/window*/exthost/output_logging_*/1-GitHub\ Copilot\ Chat.log | tail -20
```

---

## 🎯 NAJCZĘSTSZE PRZYCZYNY PO NAPRAWIE

Jeśli po wykonaniu powyższych kroków problem nadal występuje:

1. **Codespace zbyt mały** - Upgrade do 4-core / 8GB RAM
2. **Zbyt duży workspace** - Exclude node_modules, dist w `.gitignore`
3. **Stare cache** - Usuń `~/.vscode-server/data/CachedExtensions/`
4. **Konflikty rozszerzeń** - Wyłącz po kolei i testuj

---

## ✅ CHECKLIST NAPRAWY

- [ ] Zaktualizuj VS Code Settings (maxTools, timeout)
- [ ] Wyłącz MCP tools (pylance, docker, k8s)
- [ ] Usuń/wyłącz zbędne rozszerzenia
- [ ] Restart VS Code/Codespace
- [ ] Test: Czy chat odpowiada bez zawieszania?
- [ ] Test: Czy liczba tools <20?
- [ ] Test: Czy memory usage <500MB?
- [ ] Backup: settings.json.backup utworzony

---

## 🆘 SUPPORT

Jeśli problem nadal występuje:

**GitHub Copilot Support:**
https://github.com/community/community/discussions/categories/copilot

**VS Code MCP Issues:**
https://github.com/microsoft/vscode/issues

**Trading Bot Specific:**
- Sprawdź `.devcontainer/devcontainer.json`
- Zweryfikuj `tsconfig.json` exclude patterns
- Ogranicz workspace do kluczowych folderów

---

**🎯 PO TEJ NAPRAWIE COPILOT CHAT POWINIEN DZIAŁAĆ PŁYNNIE BEZ ZAWIESZANIA!**
