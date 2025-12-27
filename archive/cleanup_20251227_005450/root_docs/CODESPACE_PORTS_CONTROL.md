<!-- 📚 [SHARED-INFRASTRUCTURE] -->
<!-- Documentation component -->
# 🚀 CODESPACE - KONTROLA PORTÓW

## Problem: 12 portów automatycznie forwardowanych

### Rozwiązanie zaimplementowane:

## ✅ 1. Ograniczone automatyczne wykrywanie portów
```json
// .devcontainer/devcontainer.json
{
  "forwardPorts": [3000, 3001],  // TYLKO te 2 porty
  "settings": {
    "remote.autoForwardPorts": false,
    "remote.autoForwardPortsSource": "hybrid"
  }
}
```

## ✅ 2. VS Code workspace settings
```json
// .vscode/settings.json
{
  "remote.autoForwardPorts": false,
  "remote.autoForwardPortsSource": "process"
}
```

## ✅ 3. Uproszczony setup.sh
- Usunięto automatyczne instalacje Python packages
- Usunięto automatic TypeScript builds
- Usunięto automatic npm global installs
- Usunięto Docker Compose installations

## ✅ 4. Ręczne uruchomienie
```bash
# Zamiast automatycznego startu:
./start_bot.sh

# To otworzy TYLKO:
# - Port 3000: Dashboard
# - Port 3001: Bot API
```

## 🔧 Jeśli nadal widzisz 12 portów:

### 1. Sprawdź forwardowane porty w VS Code:
- Ctrl+Shift+P → "Ports: Focus on Ports View"
- Zakończ niepotrzebne forwardy

### 2. Sprawdź aktywne porty:
```bash
netstat -tulpn | grep LISTEN
ps aux | grep node | grep -v grep
```

### 3. Większość portów to VS Code internals:
- `16634`, `16635` - VS Code server
- `35801`, `38113` - rozszerzenia
- `5786` - Python language server
- `2000` - Codespace proxy

### 4. Tylko aplikacyjne porty to:
- `3000` - Trading Dashboard  
- `3001` - Bot API

## 🎯 Oczekiwany wynik po naprawce:
Tylko **2 porty aplikacyjne** + porty systemowe VS Code (których nie można wyłączyć)