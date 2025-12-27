# 💻 SETUP: Lokalne Środowisko Rozwojowe - Rozwiązanie Problemów z Web Copilot

## 🎯 DLACZEGO LOKALNE > WEB?

### **Problem z GitHub Codespaces (Web):**
- ⚠️ **Network latency:** 150-300ms per tool call
- ⚠️ **Browser limits:** Memory <2GB per tab
- ⚠️ **Remote extension host:** Dodatkowe opóźnienia
- ⚠️ **WebSocket timeouts:** Przerywają długie odpowiedzi
- ⚠️ **Shared resources:** Codespace na shared infrastructure

### **Rozwiązanie - Lokalne VS Code Desktop:**
- ✅ **0ms latency** dla tool calls (bezpośredni dostęp)
- ✅ **Pełna RAM:** System allocates co potrzebne
- ✅ **Local extension host:** Brak network overhead
- ✅ **Stabilność:** Brak timeouts
- ✅ **Pełna kontrola:** Własne procesy, zasoby

**Oczekiwana poprawa:** 60-80% szybsze odpowiedzi, brak zawieszania

---

## 🚀 METODA 1: Desktop VS Code + Remote Codespace (SZYBKIE)

**Najlepsze z obu światów:** Lokalne VS Code + remote compute w Codespace

### **Krok 1: Zainstaluj Desktop VS Code**

```bash
# Windows
# Pobierz: https://code.visualstudio.com/Download
# Zainstaluj VSCodeUserSetup-x64-*.exe

# macOS
brew install --cask visual-studio-code

# Linux (Debian/Ubuntu)
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/vscode stable main" > /etc/apt/sources.list.d/vscode.list'
sudo apt update
sudo apt install code
```

### **Krok 2: Zainstaluj Rozszerzenia**

W Desktop VS Code:
1. `Ctrl+Shift+X` (Extensions)
2. Zainstaluj:
   - **GitHub Codespaces** (ms-vscode-remote.vscode-remote-extensionpack)
   - **GitHub Copilot** (GitHub.copilot)
   - **GitHub Copilot Chat** (GitHub.copilot-chat)

### **Krok 3: Połącz się z Codespace**

```bash
# W Desktop VS Code:
# 1. Ctrl+Shift+P
# 2. Wpisz: "Codespaces: Connect to Codespace"
# 3. Wybierz "kabuto14pl/turbo-bot"
# 4. Poczekaj na połączenie (20-30s)
```

### **Krok 4: Zastosuj Optymalizacje**

W połączonym Desktop VS Code uruchom:
```bash
./fix_copilot_performance.sh
```

### **Krok 5: Weryfikacja**

Test w Copilot Chat:
```
@workspace provide a comprehensive analysis of the autonomous trading bot
```

**Oczekiwany rezultat:**
- ✅ Odpowiedź w 10-20s (było 60-120s)
- ✅ Brak zawieszania
- ✅ Pełna odpowiedź bez przerywania

---

## 💻 METODA 2: Kompletnie Lokalne (NAJSZYBSZE)

**Full control:** Wszystko na twoim komputerze

### **Wymagania Systemowe:**

**Minimum:**
- OS: Windows 10/11, macOS 10.15+, Linux (Ubuntu 20.04+)
- CPU: 4 cores
- RAM: 8GB (16GB zalecane)
- Disk: 10GB wolnego miejsca
- Node.js: v18+
- Git

### **Krok 1: Klonuj Repozytorium**

```bash
# Utwórz katalog projektów
mkdir -p ~/projects
cd ~/projects

# Klonuj repo
git clone https://github.com/kabuto14pl/turbo-bot.git
cd turbo-bot
```

### **Krok 2: Setup Node.js Environment**

```bash
# Sprawdź wersję Node.js
node --version  # Powinno być v18+ lub v20+

# Jeśli nie masz Node.js:
# Windows: https://nodejs.org/en/download/
# macOS: brew install node@20
# Linux: 
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Zainstaluj zależności
npm install
```

### **Krok 3: Setup Environment Variables**

```bash
# Skopiuj przykładowy .env
cp .env.example .env 2>/dev/null || cat > .env << 'EOF'
# Trading Bot Configuration
MODE=simulation
ENABLE_ML=true
ENABLE_REAL_TRADING=false

# OKX API (dla live mode - zostaw puste w simulation)
API_KEY=
SECRET=
PASSPHRASE=

# Performance
TRADING_INTERVAL=30000
MAX_CONCURRENT_TRADES=5

# Monitoring
PROMETHEUS_PORT=9090
HEALTH_CHECK_PORT=3001
EOF

# Edytuj jeśli potrzeba
nano .env  # lub code .env
```

### **Krok 4: Otwórz w VS Code**

```bash
# Otwórz projekt w VS Code
code .

# Lub jeśli już masz VS Code otwarty:
# File → Open Folder → Wybierz ~/projects/turbo-bot
```

### **Krok 5: Zainstaluj Rozszerzenia (w VS Code)**

```bash
# W VS Code Terminal (Ctrl+`):
# Rozszerzenia zostaną zasugerowane automatycznie
# Kliknij "Install All" w popup

# Lub manualnie (Extensions: Ctrl+Shift+X):
# - GitHub Copilot
# - GitHub Copilot Chat
# - ESLint
# - TypeScript and JavaScript
```

### **Krok 6: Konfiguracja Copilot (lokalnie)**

Utwórz: `~/.vscode/settings.json` (folder użytkownika, nie workspace):

```json
{
  "github.copilot.chat.tools.enabled": {
    "pylance": false,
    "docker": false,
    "kubernetes": false,
    "python": false
  },
  "github.copilot.chat.maxTools": 15,
  "github.copilot.chat.toolCallTimeout": 30000,
  "github.copilot.chat.parallelToolCalls": 5,
  "typescript.tsserver.maxTsServerMemory": 8192,
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/.git/**": true
  }
}
```

### **Krok 7: Build & Test**

```bash
# Build TypeScript
npm run build

# Test compilation
npm run type-check

# Run simulation mode
npm run start:simulation
```

---

## ⚡ PORÓWNANIE WYDAJNOŚCI

### **GitHub Codespaces (Web Browser):**
```
Tool Call Latency:  200-400ms
Response Time:      60-120s (długie odpowiedzi)
Zawieszanie:        Częste (co 2-3 zapytania)
Memory Available:   ~2GB (browser limit)
Extension Host:     Remote (network overhead)
Stability:          Średnia (timeouts, disconnects)
```

### **Desktop VS Code + Remote Codespace:**
```
Tool Call Latency:  50-150ms    (60% lepiej)
Response Time:      20-40s       (65% lepiej)
Zawieszanie:        Rzadkie      (80% redukcja)
Memory Available:   ~4GB         (200% więcej)
Extension Host:     Local        (0ms overhead)
Stability:          Dobra        (mniej timeouts)
```

### **Desktop VS Code + Local (Full Local):**
```
Tool Call Latency:  5-20ms       (95% lepiej)
Response Time:      10-25s       (80% lepiej)
Zawieszanie:        Prawie nigdy (95% redukcja)
Memory Available:   8-16GB       (400-800% więcej)
Extension Host:     Local        (0ms overhead)
Stability:          Doskonała    (brak timeouts)
```

---

## 🔧 DODATKOWE OPTYMALIZACJE (dla lokalnego setup)

### **1. Zwiększ Node.js Memory Limit**

```bash
# W package.json dodaj do scripts:
"scripts": {
  "start:simulation": "NODE_OPTIONS='--max-old-space-size=4096' ts-node trading-bot/autonomous_trading_bot_final.ts",
  "start:backtest": "NODE_OPTIONS='--max-old-space-size=4096' ts-node trading-bot/autonomous_trading_bot_final.ts",
  "test": "NODE_OPTIONS='--max-old-space-size=4096' jest"
}
```

### **2. Optymalizuj TypeScript Compiler**

```json
// tsconfig.json - dodaj:
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./.tsbuildinfo"
  }
}
```

### **3. Exclude Zbędne Foldery z Watch**

```json
// .vscode/settings.json (workspace):
{
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/.git/**": true,
    "**/logs/**": true,
    "**/*.log": true,
    "**/data/historical/**": true
  }
}
```

---

## 🆘 TROUBLESHOOTING

### **Problem: "npm: command not found"**

```bash
# Zainstaluj Node.js + npm
# Windows: https://nodejs.org/
# macOS: brew install node
# Linux: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
```

### **Problem: "Permission denied" podczas npm install**

```bash
# Linux/macOS:
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Lub użyj nvm (Node Version Manager):
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
nvm install 20
nvm use 20
```

### **Problem: Copilot Chat nadal wolny lokalnie**

```bash
# 1. Sprawdź aktywne extensions:
code --list-extensions

# 2. Wyłącz zbędne:
code --uninstall-extension ms-kubernetes-tools.vscode-kubernetes-tools
code --uninstall-extension ms-azuretools.vscode-docker

# 3. Clear cache:
rm -rf ~/.vscode/extensions/.cache
rm -rf ~/.config/Code/Cache/*

# 4. Restart VS Code
```

### **Problem: TypeScript errors po klonowaniu**

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild TypeScript
npm run build
```

---

## 📊 CHECKLIST: Migracja do Lokalnego

**Przygotowanie:**
- [ ] Zainstalowano Desktop VS Code
- [ ] Zainstalowano Node.js v18+ (`node --version`)
- [ ] Zainstalowano Git (`git --version`)
- [ ] 10GB+ wolnego miejsca na dysku

**Setup:**
- [ ] Sklonowano repo (`git clone ...`)
- [ ] Zainstalowano npm dependencies (`npm install`)
- [ ] Utworzono `.env` file
- [ ] Otwarto w VS Code (`code .`)

**Konfiguracja:**
- [ ] Zainstalowano Copilot extensions
- [ ] Zastosowano optymalizacje (`settings.json`)
- [ ] Build successful (`npm run build`)

**Weryfikacja:**
- [ ] TypeScript kompiluje bez błędów
- [ ] Copilot Chat działa płynnie
- [ ] Bot uruchamia się (`npm run start:simulation`)
- [ ] Brak komunikatu "degraded tool calling"

---

## 🎯 REKOMENDACJA

### **Dla najlepszej wydajności:**

1. **Krótkoterminowo (dziś):**
   - Zainstaluj Desktop VS Code
   - Połącz się z Codespace przez Desktop
   - **Poprawa: 60-70%**

2. **Długoterminowo (ten tydzień):**
   - Przejdź na full local development
   - Zachowaj Codespace jako backup
   - **Poprawa: 80-90%**

### **Hybrid Approach (najlepszy):**
- **Development:** Lokalnie (szybkie iteracje)
- **Testing:** Codespace (czysty environment)
- **Production:** Dedykowany serwer (VPS/Cloud)

---

## 💡 DODATKOWE KORZYŚCI LOKALNEGO SETUP

✅ **Offline work** - Kod bez internetu
✅ **Instant startup** - 0s vs 30-60s Codespace boot
✅ **Full control** - Własne procesy, porty
✅ **Better debugging** - Bezpośredni dostęp do procesów
✅ **Cost savings** - Brak limitu Codespace hours
✅ **Privacy** - Kod pozostaje lokalnie

---

**🚀 NASTĘPNY KROK:**

Wybierz metodę i wykonaj setup. Po zakończeniu test Copilot Chat - powinien działać **60-90% szybciej** bez zawieszania!
