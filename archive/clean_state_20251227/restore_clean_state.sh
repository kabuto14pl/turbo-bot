#!/bin/bash

# 🔄 RESTORE CLEAN STATE SCRIPT
# Przywraca czysty stan projektu z backupu

set -e  # Exit on error

BACKUP_DIR="/workspaces/turbo-bot/archive/clean_state_20251227"
PROJECT_ROOT="/workspaces/turbo-bot"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║        🔄 RESTORE CLEAN STATE - TRADING BOT                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "⚠️  UWAGA: Ten skrypt przywróci projekt do czystego stanu!"
echo "⚠️  Data backupu: 27.12.2025"
echo "⚠️  Commit: 3852369"
echo ""
read -p "Czy chcesz kontynuować? (tak/nie): " confirm

if [ "$confirm" != "tak" ]; then
    echo "❌ Anulowano restore"
    exit 0
fi

echo ""
echo "📦 ETAP 1: Weryfikacja backupu"
echo "==============================="

# Check if backup exists
if [ ! -f "$BACKUP_DIR/project_clean_state.tar.gz" ]; then
    echo "❌ BŁĄD: Nie znaleziono pliku backupu!"
    echo "Oczekiwano: $BACKUP_DIR/project_clean_state.tar.gz"
    exit 1
fi

echo "✅ Backup znaleziony: $(du -h "$BACKUP_DIR/project_clean_state.tar.gz" | cut -f1)"

# Check manifest
if [ ! -f "$BACKUP_DIR/MANIFEST.txt" ]; then
    echo "⚠️  OSTRZEŻENIE: Brak manifestu plików"
else
    FILE_COUNT=$(wc -l < "$BACKUP_DIR/MANIFEST.txt")
    echo "✅ Manifest: $FILE_COUNT plików"
fi

echo ""
echo "💾 ETAP 2: Backup obecnego stanu"
echo "================================="

SAFETY_BACKUP="$PROJECT_ROOT/archive/before_restore_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$SAFETY_BACKUP"

echo "📁 Tworzenie safety backup w: $SAFETY_BACKUP"
tar -czf "$SAFETY_BACKUP/current_state.tar.gz" \
    --exclude="node_modules" \
    --exclude="logs" \
    --exclude=".git" \
    --exclude="archive" \
    --exclude="*.log" \
    --exclude="data/*" \
    -C "$PROJECT_ROOT" . 2>/dev/null

echo "✅ Safety backup utworzony: $(du -h "$SAFETY_BACKUP/current_state.tar.gz" | cut -f1)"

echo ""
echo "🗑️  ETAP 3: Usuwanie bieżących plików"
echo "======================================"

cd "$PROJECT_ROOT"

# List of files/dirs to remove (excluding critical ones)
echo "Usuwanie plików z root directory..."
find . -maxdepth 1 -type f \
    ! -name ".gitignore" \
    ! -name ".env" \
    ! -name ".env.example" \
    -exec rm -f {} \; 2>/dev/null

echo "Usuwanie katalogów (zachowując archive, .git, node_modules)..."
for dir in core dashboard data docs monitoring reports scripts src trading-bot tests tools; do
    if [ -d "$dir" ]; then
        echo "  Usuwanie: $dir"
        rm -rf "$dir" 2>/dev/null
    fi
done

echo "✅ Pliki usunięte"

echo ""
echo "📦 ETAP 4: Rozpakowanie clean state"
echo "===================================="

tar -xzf "$BACKUP_DIR/project_clean_state.tar.gz" -C "$PROJECT_ROOT"

echo "✅ Clean state rozpakowany"

echo ""
echo "📊 ETAP 5: Weryfikacja"
echo "======================"

# Count files
CURRENT_FILES=$(find . -type f \
    ! -path "./node_modules/*" \
    ! -path "./logs/*" \
    ! -path "./.git/*" \
    ! -path "./archive/*" \
    ! -name "*.log" \
    ! -path "./data/*" \
    | wc -l)

echo "Pliki w projekcie: $CURRENT_FILES"
echo "Pliki w manifeście: $FILE_COUNT"

if [ -f "package.json" ]; then
    echo "✅ package.json obecny"
else
    echo "❌ BŁĄD: Brak package.json!"
    exit 1
fi

if [ -f "main_enterprise.ts" ]; then
    echo "✅ main_enterprise.ts obecny"
fi

if [ -d "trading-bot" ]; then
    echo "✅ trading-bot/ obecny"
else
    echo "❌ BŁĄD: Brak katalogu trading-bot!"
    exit 1
fi

echo ""
echo "📦 ETAP 6: Instalacja zależności"
echo "================================="

if [ -f "package.json" ]; then
    echo "Uruchamianie npm install..."
    npm install --quiet
    echo "✅ Zależności zainstalowane"
else
    echo "⚠️  Pominięto - brak package.json"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              ✅ RESTORE ZAKOŃCZONY SUKCESEM ✅               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 PODSUMOWANIE:"
echo "================"
echo "✅ Przywrócono czysty stan z 27.12.2025"
echo "✅ Commit: 3852369"
echo "✅ Plików: $CURRENT_FILES"
echo "✅ Safety backup: $SAFETY_BACKUP"
echo ""
echo "🔍 NASTĘPNE KROKI:"
echo "=================="
echo "1. Sprawdź git status: git status"
echo "2. Sprawdź strukturę: ls -la"
echo "3. Uruchom bota: npm start"
echo ""
echo "💾 SAFETY BACKUP:"
echo "Jeśli coś poszło nie tak, przywróć poprzedni stan:"
echo "tar -xzf $SAFETY_BACKUP/current_state.tar.gz"
echo ""
echo "✅ Gotowe!"
