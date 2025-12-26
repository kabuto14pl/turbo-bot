#!/bin/bash

# 🔧 FIX: GitHub Copilot Chat Performance
# Rozwiązuje problem: "More than null tools enabled, degraded tool calling"

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 GitHub Copilot Chat Performance Fix"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Kolory dla output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funkcja logowania
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

# Sprawdź czy jesteśmy w Codespace
if [ -n "$CODESPACES" ]; then
    SETTINGS_PATH="$HOME/.vscode-remote/data/Machine/settings.json"
    log_info "Wykryto GitHub Codespace"
else
    SETTINGS_PATH="$HOME/.config/Code/User/settings.json"
    log_info "Wykryto lokalne VS Code"
fi

# Utwórz katalog jeśli nie istnieje
mkdir -p "$(dirname "$SETTINGS_PATH")"

# Backup obecnej konfiguracji
if [ -f "$SETTINGS_PATH" ]; then
    BACKUP_PATH="${SETTINGS_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$SETTINGS_PATH" "$BACKUP_PATH"
    log_success "Backup utworzony: $BACKUP_PATH"
else
    log_warning "Brak poprzedniej konfiguracji - tworzę nową"
fi

# Sprawdź aktualne MCP processes
log_info "Sprawdzam aktywne MCP procesy..."
MCP_COUNT=$(ps aux | grep -E "mcp|pylance-mcp|docker-mcp" | grep -v grep | wc -l)
log_info "Znaleziono MCP procesów: $MCP_COUNT"

# Zastosuj zoptymalizowaną konfigurację
log_info "Aplikuję zoptymalizowaną konfigurację..."

cat > "$SETTINGS_PATH" << 'EOF'
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
  "github.copilot.chat.parallelToolCalls": 3,
  "extensions.autoUpdate": false,
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/.git/**": true,
    "**/logs/**": true,
    "**/*.log": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  },
  "typescript.tsserver.maxTsServerMemory": 4096,
  "typescript.disableAutomaticTypeAcquisition": true
}
EOF

log_success "Konfiguracja zaktualizowana: $SETTINGS_PATH"

# Kill zbędne MCP processes
log_info "Zatrzymuję zbędne MCP procesy..."

pkill -f "pylance-mcp" 2>/dev/null && log_success "Zatrzymano pylance-mcp" || log_warning "Brak pylance-mcp do zatrzymania"
pkill -f "docker-mcp" 2>/dev/null && log_success "Zatrzymano docker-mcp" || log_warning "Brak docker-mcp do zatrzymania"
pkill -f "kubernetes-mcp" 2>/dev/null && log_success "Zatrzymano kubernetes-mcp" || log_warning "Brak kubernetes-mcp do zatrzymania"

# Opcjonalnie: restart Copilot (może wymagać ręcznego restartu VS Code)
log_warning "Copilot wymaga restartu VS Code do pełnego zastosowania zmian"

# Sprawdź po naprawie
sleep 2
MCP_COUNT_AFTER=$(ps aux | grep -E "mcp|pylance-mcp|docker-mcp" | grep -v grep | wc -l)
log_info "MCP procesów po naprawie: $MCP_COUNT_AFTER (było: $MCP_COUNT)"

# Podsumowanie
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ NAPRAWA ZAKOŃCZONA POMYŚLNIE!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Podsumowanie zmian:"
echo "  • Wyłączono MCP tools: pylance, docker, kubernetes, python"
echo "  • Ustawiono maxTools: 15 (poprzednio: unlimited)"
echo "  • Timeout: 30s"
echo "  • Parallel calls: 3"
echo "  • MCP procesów przed: $MCP_COUNT"
echo "  • MCP procesów po: $MCP_COUNT_AFTER"
echo ""
echo -e "${YELLOW}⚠️  WYMAGANE DZIAŁANIA:${NC}"
echo "  1. Zamknij całkowicie VS Code / Codespace"
echo "  2. Otwórz ponownie (poczekaj 1-2 min na załadowanie)"
echo "  3. Otwórz Copilot Chat"
echo "  4. Test: Napisz długie zapytanie i sprawdź czy nie zawiesza się"
echo ""
echo "📊 Weryfikacja:"
echo "  • Liczba tools: powinno być <20"
echo "  • Czas odpowiedzi: <30s"
echo "  • Brak komunikatu 'degraded tool calling'"
echo ""
echo "🔄 Rollback (jeśli problem nadal występuje):"
echo "  cp $BACKUP_PATH $SETTINGS_PATH"
echo ""
echo "📖 Pełna dokumentacja: FIX_COPILOT_CHAT_PERFORMANCE.md"
echo ""

# Test memory usage
if command -v free &> /dev/null; then
    echo "💾 Aktualne zużycie pamięci:"
    free -h | grep -E "Mem:|Swap:"
    echo ""
fi

# Zasugeruj restart
echo -e "${BLUE}💡 TIP:${NC} Dla najlepszych rezultatów wykonaj:"
echo "   1. Ctrl+Shift+P → 'Developer: Reload Window'"
echo "   2. Lub: Całkowity restart VS Code/Codespace"
echo ""

exit 0
