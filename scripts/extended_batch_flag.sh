#!/bin/bash

# 🚀 [PRODUCTION-OPERATIONAL]
# EXTENDED BATCH FLAGGING SCRIPT
# Drugą faza flagowania - pozostałe główne komponenty
# Production operational tool for comprehensive code classification

set -euo pipefail

echo "🚀 Starting extended batch flagging process..."

# Funkcja flagowania głównych plików JS/TS bez flag
flag_main_files() {
    echo "📝 Flagging main TypeScript and JavaScript files..."
    
    # Główne pliki w katalogu głównym
    local main_files=(
        "main_modular_clean.js" "main_modular_clean.ts"
        "main_modular_fixed.js" "main_modular_fixed.ts"
        "main_modular.ts"
        "enterprise_ml_test.js" "enterprise_ml_test.ts"
        "enterprise_ml_production_integration.js" "enterprise_ml_production_integration.ts"
        "full_enterprise_ml_test.js" "full_enterprise_ml_test.ts"
        "simple_ml_test.ts"
        "ultra_simple_test.js" "ultra_simple_test.ts"
        "safe_var_test.js" "safe_var_test.ts"
        "test_cache_system.js" "test_cache_system.ts"
        "jest.setup.js" "jest.setup.ts"
        "debug_dashboard.js"
        "mock_trading_bot_api.js"
        "enterprise_validation_server.js"
        "check_ml_infrastructure.js" "check_ml_infrastructure.ts"
        "basic_enterprise_test.js" "basic_enterprise_test.ts"
    )
    
    for file in "${main_files[@]}"; do
        if [[ -f "/workspaces/turbo-bot/$file" ]]; then
            if ! grep -q "\[.*\]" "/workspaces/turbo-bot/$file" 2>/dev/null; then
                echo "   Adding flag to main file: $file"
                
                # Determine appropriate flag based on filename
                if [[ "$file" == *"test"* || "$file" == *"debug"* || "$file" == *"mock"* ]]; then
                    flag="🧪 [TESTING-FRAMEWORK]"
                    description="Testing framework component for validation and development"
                elif [[ "$file" == *"enterprise"* || "$file" == *"production"* ]]; then
                    flag="🚀 [PRODUCTION-API]"
                    description="Production enterprise component"
                else
                    flag="🔧 [SHARED-INFRASTRUCTURE]"
                    description="Shared infrastructure component"
                fi
                
                # Add flag based on file type
                if [[ "$file" == *.ts ]]; then
                    sed -i "1 i /**\n * $flag\n * $description\n */" "/workspaces/turbo-bot/$file" 2>/dev/null || true
                elif [[ "$file" == *.js ]]; then
                    sed -i "1 i /**\n * $flag\n * $description\n */" "/workspaces/turbo-bot/$file" 2>/dev/null || true
                fi
            fi
        fi
    done
}

# Funkcja flagowania plików w trading-bot głównym katalogu
flag_trading_bot_main() {
    echo "📝 Flagging trading-bot main files..."
    
    find /workspaces/turbo-bot/trading-bot -maxdepth 1 -name "*.ts" -o -name "*.js" | while read -r file; do
        if [[ -f "$file" && ! $(grep -q "\[.*\]" "$file" 2>/dev/null) ]]; then
            filename=$(basename "$file")
            echo "   Adding flag to trading-bot file: $filename"
            
            # Determine flag based on filename pattern
            if [[ "$filename" == *"production"* || "$filename" == *"final"* || "$filename" == "autonomous_trading_bot"* ]]; then
                flag="🚀 [PRODUCTION-FINAL]"
                description="Final production trading bot component"
            elif [[ "$filename" == *"test"* || "$filename" == *"demo"* ]]; then
                flag="🧪 [TESTING-FRAMEWORK]"
                description="Testing framework component"
            else
                flag="🔧 [SHARED-INFRASTRUCTURE]"
                description="Shared trading infrastructure component"
            fi
            
            sed -i "1 i /**\n * $flag\n * $description\n */" "$file" 2>/dev/null || true
        fi
    done
}

# Funkcja flagowania plików Python
flag_python_files() {
    echo "📝 Flagging Python files..."
    
    find /workspaces/turbo-bot -name "*.py" | while read -r file; do
        if [[ -f "$file" && ! $(head -5 "$file" | grep -q "\[.*\]" 2>/dev/null) ]]; then
            echo "   Adding flag to Python file: $file"
            
            if [[ "$file" == *"optimize"* || "$file" == *"metrics"* ]]; then
                sed -i "1 i # 🔧 [DEVELOPMENT-TOOL]\n# Python development tool for optimization and metrics" "$file" 2>/dev/null || true
            else
                sed -i "1 i # 🔧 [SHARED-INFRASTRUCTURE]\n# Python infrastructure component" "$file" 2>/dev/null || true
            fi
        fi
    done
}

# Funkcja flagowania plików YAML/YML
flag_yaml_files() {
    echo "📝 Flagging YAML configuration files..."
    
    find /workspaces/turbo-bot -name "*.yml" -o -name "*.yaml" | while read -r file; do
        if [[ -f "$file" && ! $(head -5 "$file" | grep -q "\[.*\]" 2>/dev/null) ]]; then
            echo "   Adding flag to YAML file: $file"
            
            if [[ "$file" == *"docker-compose"* || "$file" == *"k8s"* || "$file" == *"deployment"* ]]; then
                sed -i "1 i # 🚀 [PRODUCTION-CONFIG]\n# Production deployment configuration" "$file" 2>/dev/null || true
            else
                sed -i "1 i # 🔧 [DEVELOPMENT-TOOL]\n# Development configuration file" "$file" 2>/dev/null || true
            fi
        fi
    done
}

# Funkcja flagowania plików JSON (nie package.json)
flag_json_files() {
    echo "📝 Flagging JSON configuration files..."
    
    find /workspaces/turbo-bot -name "*.json" ! -name "package*.json" ! -path "*/node_modules/*" | while read -r file; do
        if [[ -f "$file" && ! $(head -2 "$file" | grep -q "\[.*\]" 2>/dev/null) ]]; then
            echo "   Adding flag to JSON file: $file"
            
            # JSON files can't have comments, but we'll add them as the first line when possible
            if [[ "$file" == *"dashboard"* || "$file" == *"grafana"* ]]; then
                echo "Adding dashboard flag to $file (JSON files can't have comments)"
                # For JSON files, we can't actually add comments, but we document the classification
                continue
            fi
        fi
    done
}

# Uruchom extended flagowanie
flag_main_files
flag_trading_bot_main
flag_python_files
flag_yaml_files
flag_json_files

echo "✅ Extended batch flagging completed!"
echo "📊 Running validation check..."

# Quick validation count
echo "📈 PROGRESS UPDATE:"
total_files=$(find /workspaces/turbo-bot -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.sh" | wc -l)
flagged_files=$(find /workspaces/turbo-bot -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.sh" | xargs grep -l "\[.*\]" 2>/dev/null | wc -l)
percentage=$((flagged_files * 100 / total_files))

echo "Total files scanned: $total_files"
echo "Flagged files: $flagged_files"
echo "Coverage: $percentage%"

if [[ $percentage -ge 85 ]]; then
    echo "🎉 Excellent progress! Ready for final validation."
else
    echo "🔄 Continue flagging remaining files..."
fi