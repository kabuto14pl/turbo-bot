#!/bin/bash
# 🚀 [PRODUCTION-OPERATIONAL]
# Production operational script

# 🚀 [PRODUCTION-OPERATIONAL]
# BATCH FLAGGING SCRIPT
# Systematyczne dodawanie flag do wszystkich plików projektu
# Production operational tool for code classification compliance

set -euo pipefail

echo "🚀 Starting batch flagging process..."

# Funkcja flagowania plików testowych
flag_test_files() {
    echo "📝 Flagging test files..."
    
    # Znajdź wszystkie pliki testowe bez flag
    find /workspaces/turbo-bot -name "test_*.ts" -o -name "test_*.js" -o -name "*_test.ts" -o -name "*_test.js" | while read -r file; do
        if [[ -f "$file" ]]; then
            # Sprawdź czy plik ma już flagę
            if ! grep -q "\[TESTING-FRAMEWORK\]" "$file" 2>/dev/null; then
                echo "   Adding flag to: $file"
                
                # Backup pliku
                cp "$file" "$file.bak"
                
                # Dodaj flagę do pliku TypeScript
                if [[ "$file" == *.ts ]]; then
                    sed -i '1,10 s|/\*\*|/**\n * 🧪 [TESTING-FRAMEWORK]|' "$file" || true
                    sed -i '1,10 s|^/\*|/**\n * 🧪 [TESTING-FRAMEWORK]\n *|' "$file" || true
                fi
                
                # Dodaj flagę do pliku JavaScript
                if [[ "$file" == *.js ]]; then
                    sed -i '1,10 s|/\*\*|/**\n * 🧪 [TESTING-FRAMEWORK]|' "$file" || true
                    sed -i '1,10 s|^/\*|/**\n * 🧪 [TESTING-FRAMEWORK]\n *|' "$file" || true
                fi
            fi
        fi
    done
}

# Funkcja flagowania plików w src/
flag_src_files() {
    echo "📝 Flagging src/ files..."
    
    find /workspaces/turbo-bot/src -name "*.ts" -o -name "*.js" | while read -r file; do
        if [[ -f "$file" && ! $(grep -q "\[.*\]" "$file" 2>/dev/null) ]]; then
            echo "   Adding SHARED-INFRASTRUCTURE flag to: $file"
            
            # Backup pliku
            cp "$file" "$file.bak" 2>/dev/null || true
            
            # Dodaj flagę SHARED-INFRASTRUCTURE
            if [[ "$file" == *.ts ]]; then
                sed -i '1 i /**\n * 🔧 [SHARED-INFRASTRUCTURE]\n * Shared infrastructure component\n */' "$file" 2>/dev/null || true
            elif [[ "$file" == *.js ]]; then
                sed -i '1 i /**\n * 🔧 [SHARED-INFRASTRUCTURE]\n * Shared infrastructure component\n */' "$file" 2>/dev/null || true
            fi
        fi
    done
}

# Funkcja flagowania plików konfiguracyjnych
flag_config_files() {
    echo "📝 Flagging config files..."
    
    # package.json files
    find /workspaces/turbo-bot -name "package*.json" | while read -r file; do
        if [[ -f "$file" && ! $(head -5 "$file" | grep -q "PRODUCTION-CONFIG" 2>/dev/null) ]]; then
            echo "   Adding flag to config: $file"
            # For JSON files, add comment at the top if possible
            sed -i '1 i // 🔧 [PRODUCTION-CONFIG] Package configuration for trading bot system' "$file" 2>/dev/null || true
        fi
    done
    
    # Docker files
    find /workspaces/turbo-bot -name "Dockerfile*" -o -name "docker-compose*.yml" | while read -r file; do
        if [[ -f "$file" && ! $(head -5 "$file" | grep -q "PRODUCTION-CONFIG" 2>/dev/null) ]]; then
            echo "   Adding flag to Docker file: $file"
            sed -i '1 i # 🔧 [PRODUCTION-CONFIG] Docker configuration for trading bot system' "$file" 2>/dev/null || true
        fi
    done
}

# Funkcja flagowania skryptów bash
flag_bash_scripts() {
    echo "📝 Flagging bash scripts..."
    
    find /workspaces/turbo-bot -name "*.sh" | while read -r file; do
        if [[ -f "$file" && ! $(head -5 "$file" | grep -q "\[.*\]" 2>/dev/null) ]]; then
            echo "   Adding flag to script: $file"
            
            # Sprawdź typ skryptu i dodaj odpowiednią flagę
            if grep -q "production\|deploy\|start.*bot" "$file" 2>/dev/null; then
                sed -i '2 i # 🚀 [PRODUCTION-OPERATIONAL]\n# Production operational script' "$file" 2>/dev/null || true
            else
                sed -i '2 i # 🔧 [DEVELOPMENT-TOOL]\n# Development tool script' "$file" 2>/dev/null || true
            fi
        fi
    done
}

# Uruchom flagowanie
flag_test_files
flag_src_files
flag_config_files
flag_bash_scripts

echo "✅ Batch flagging completed!"
echo "📊 Running validation..."
bash /workspaces/turbo-bot/scripts/validate-flagging.sh