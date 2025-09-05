#!/usr/bin/env bash

# Ten skrypt tworzy środowisko Python i testuje Ray Tune

echo "🚀 Uruchamiam testy Ray Tune..."

# Ustawienie zmiennych
PROJECT_ROOT=$(realpath $(dirname "$0")/..)
VENV_DIR="$PROJECT_ROOT/.venv"
PYTHON_SCRIPT="$PROJECT_ROOT/tools/python/test_ray_installation.py"
REQUIREMENTS="$PROJECT_ROOT/tools/python/requirements.txt"

# Sprawdź czy środowisko istnieje
if [ ! -d "$VENV_DIR" ]; then
    echo "⚠️ Tworzę nowe środowisko Python..."
    python3 -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install --upgrade pip
    "$VENV_DIR/bin/pip" install -r "$REQUIREMENTS"
else
    echo "✅ Środowisko Python istnieje"
fi

# Uruchom test Ray Tune
echo "🧪 Testowanie instalacji Ray Tune..."
"$VENV_DIR/bin/python" "$PYTHON_SCRIPT" --json "$PROJECT_ROOT/tools/python/ray_test_results.json"

# Uruchom demo
echo "🚀 Uruchamianie demo Ray Tune..."
cd "$PROJECT_ROOT"
npx ts-node tools/ray_tune_demo.ts

echo "✅ Testy zakończone!"
