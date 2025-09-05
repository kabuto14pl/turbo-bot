#!/bin/bash
# Skrypt aktywacji środowiska Python dla WSL/Linux
# Używamy lokalnego środowiska zamiast ścieżki Windows

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Sprawdź czy istnieje lokalne środowisko w $HOME
if [ -d "$HOME/.venv/trading-bot" ]; then
    echo "Aktywuję lokalne środowisko Python..."
    source "$HOME/.venv/trading-bot/bin/activate"
elif [ -d "$PROJECT_ROOT/.venv" ]; then
    echo "Aktywuję środowisko Python z projektu..."
    source "$PROJECT_ROOT/.venv/bin/activate"
else
    echo "⚠️ Nie znaleziono środowiska Python. Uruchom setup_python_env.sh"
    exit 1
fi

echo "✅ Środowisko Python aktywowane"
