#!/bin/bash

# 🚀 [PRODUCTION-OPERATIONAL]
# FINAL BATCH FLAGGING SCRIPT
# Trzecia faza flagowania - dokończenie wszystkich pozostałych plików
# Production operational tool for 100% code classification completion

set -euo pipefail

echo "🚀 Starting FINAL batch flagging process..."

# Funkcja flagowania wszystkich plików w src/enterprise/
flag_enterprise_files() {
    echo "📝 Flagging src/enterprise/ files..."
    
    find /workspaces/turbo-bot/src/enterprise -name "*.ts" -o -name "*.js" | while read -r file; do
        if [[ -f "$file" && ! $(grep -q "\[.*\]" "$file" 2>/dev/null) ]]; then
            filename=$(basename "$file")
            echo "   Adding PRODUCTION flag to enterprise file: $filename"
            
            if [[ "$file" == *"test"* || "$file" == *"__tests__"* ]]; then
                flag="🧪 [TESTING-FRAMEWORK]"
                description="Enterprise testing component"
            else
                flag="🚀 [PRODUCTION-API]"  
                description="Production enterprise component"
            fi
            
            sed -i "1 i /**\n * $flag\n * $description\n */" "$file" 2>/dev/null || true
        fi
    done
}

# Funkcja flagowania plików monitoringu
flag_monitoring_files() {
    echo "📝 Flagging monitoring/ files..."
    
    find /workspaces/turbo-bot/monitoring -name "*.ts" -o -name "*.js" | while read -r file; do
        if [[ -f "$file" && ! $(grep -q "\[.*\]" "$file" 2>/dev/null) ]]; then
            filename=$(basename "$file")
            echo "   Adding PRODUCTION flag to monitoring file: $filename"
            
            flag="🚀 [PRODUCTION-OPERATIONAL]"
            description="Production monitoring component"
            
            sed -i "1 i /**\n * $flag\n * $description\n */" "$file" 2>/dev/null || true
        fi
    done
}

# Funkcja flagowania pozostałych plików testowych w głównym katalogu
flag_remaining_test_files() {
    echo "📝 Flagging remaining test files in root..."
    
    local test_files=(
        "test_phase_c1_realtime_data.ts" "test_phase_c1_realtime_data.js"
        "test_phase_c2_strategy_orchestration.ts" "test_phase_c2_strategy_orchestration.js"
        "test_phase_c2_strategy_orchestrator.ts" "test_phase_c2_strategy_orchestrator.js"
        "test_phase_c3_monitoring_system.ts" "test_phase_c3_monitoring_system.js"
        "test_enterprise_ml_system.ts" "test_enterprise_ml_system.js"
        "test_enterprise_ml_system_fixed.ts"
        "test_enterprise_ml_integration.ts" "test_enterprise_ml_integration.js"
        "test_enterprise_ml_strategy_final.ts" "test_enterprise_ml_strategy_final.js"
        "test_phase_b.ts" "test_phase_b.js"
        "test_quick_integration.ts" "test_quick_integration.js"
        "test_var_calculations.ts" "test_var_calculations.js"
        "enterprise_ml_test.js" "enterprise_ml_test.ts"
        "full_enterprise_ml_test.js" "full_enterprise_ml_test.ts"
    )
    
    for file in "${test_files[@]}"; do
        if [[ -f "/workspaces/turbo-bot/$file" ]]; then
            if ! grep -q "\[.*\]" "/workspaces/turbo-bot/$file" 2>/dev/null; then
                echo "   Adding TESTING flag to: $file"
                
                flag="🧪 [TESTING-FRAMEWORK]"
                description="Testing framework component for enterprise validation"
                
                sed -i "1 i /**\n * $flag\n * $description\n */" "/workspaces/turbo-bot/$file" 2>/dev/null || true
            fi
        fi
    done
}

# Funkcja flagowania wszystkich plików w trading-bot/core/
flag_trading_bot_core() {
    echo "📝 Flagging trading-bot/core/ files..."
    
    find /workspaces/turbo-bot/trading-bot/core -name "*.ts" -o -name "*.js" | while read -r file; do
        if [[ -f "$file" && ! $(grep -q "\[.*\]" "$file" 2>/dev/null) ]]; then
            dirname=$(dirname "$file")
            filename=$(basename "$file")
            echo "   Adding flag to core file: $filename"
            
            # Determine flag based on subdirectory
            if [[ "$dirname" == *"test"* || "$filename" == *"test"* ]]; then
                flag="🧪 [TESTING-FRAMEWORK]"
                description="Trading bot testing component"
            elif [[ "$dirname" == *"production"* || "$dirname" == *"execution"* ]]; then
                flag="🚀 [PRODUCTION-FINAL]"
                description="Production trading bot core component"
            else
                flag="🔧 [SHARED-INFRASTRUCTURE]"
                description="Shared trading bot infrastructure"
            fi
            
            sed -i "1 i /**\n * $flag\n * $description\n */" "$file" 2>/dev/null || true
        fi
    done
}

# Funkcja flagowania wszystkich plików w trading-bot/__tests__/
flag_trading_bot_tests() {
    echo "📝 Flagging trading-bot/__tests__/ files..."
    
    find /workspaces/turbo-bot/trading-bot/__tests__ -name "*.ts" -o -name "*.js" 2>/dev/null | while read -r file; do
        if [[ -f "$file" && ! $(grep -q "\[.*\]" "$file" 2>/dev/null) ]]; then
            filename=$(basename "$file")
            echo "   Adding TESTING flag to test file: $filename"
            
            flag="🧪 [TESTING-FRAMEWORK]"
            description="Unit testing component"
            
            sed -i "1 i /**\n * $flag\n * $description\n */" "$file" 2>/dev/null || true
        fi
    done
}

# Funkcja flagowania pozostałych głównych plików
flag_remaining_main_files() {
    echo "📝 Flagging remaining main files..."
    
    local main_files=(
        "enterprise_ml_production_integration.js" "enterprise_ml_production_integration.ts"
        "basic_enterprise_test.js" "basic_enterprise_test.ts"
    )
    
    for file in "${main_files[@]}"; do
        if [[ -f "/workspaces/turbo-bot/$file" ]]; then
            if ! grep -q "\[.*\]" "/workspaces/turbo-bot/$file" 2>/dev/null; then
                echo "   Adding flag to: $file"
                
                if [[ "$file" == *"test"* ]]; then
                    flag="🧪 [TESTING-FRAMEWORK]"
                    description="Testing framework component"
                else
                    flag="🚀 [PRODUCTION-API]"
                    description="Production enterprise component"
                fi
                
                sed -i "1 i /**\n * $flag\n * $description\n */" "/workspaces/turbo-bot/$file" 2>/dev/null || true
            fi
        fi
    done
}

# Funkcja flagowania konfiguracji TypeScript
flag_config_files() {
    echo "📝 Flagging configuration files..."
    
    # tsconfig.json - już nie można dodać komentarzy do JSON
    if [[ -f "/workspaces/turbo-bot/tsconfig.json" ]]; then
        echo "   Configuration file tsconfig.json noted (JSON can't have comments)"
    fi
    
    # nginx.conf
    if [[ -f "/workspaces/turbo-bot/nginx.conf" ]]; then
        if ! grep -q "\[.*\]" "/workspaces/turbo-bot/nginx.conf" 2>/dev/null; then
            echo "   Adding flag to nginx.conf"
            sed -i "1 i # 🚀 [PRODUCTION-CONFIG]\n# Production nginx configuration" "/workspaces/turbo-bot/nginx.conf" 2>/dev/null || true
        fi
    fi
}

# Uruchom final flagowanie
flag_enterprise_files
flag_monitoring_files
flag_remaining_test_files
flag_trading_bot_core
flag_trading_bot_tests
flag_remaining_main_files
flag_config_files

echo "✅ FINAL batch flagging completed!"
echo "📊 Running final validation check..."

# Final validation count
total_files=$(find /workspaces/turbo-bot -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.sh" | grep -v node_modules | wc -l)
flagged_files=$(find /workspaces/turbo-bot -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.sh" | grep -v node_modules | xargs grep -l "\[.*\]" 2>/dev/null | wc -l)
percentage=$((flagged_files * 100 / total_files))

echo ""
echo "📈 FINAL PROGRESS REPORT:"
echo "========================"
echo "Total files scanned: $total_files"
echo "Flagged files: $flagged_files" 
echo "Coverage: $percentage%"
echo ""

if [[ $percentage -ge 90 ]]; then
    echo "🎉 EXCELLENT! Over 90% coverage achieved!"
    echo "🚀 Ready for final validation and security check."
elif [[ $percentage -ge 80 ]]; then
    echo "✅ GOOD! Over 80% coverage achieved!"
    echo "🔄 Minor cleanup needed for 90%+ target."
else
    echo "🔄 PROGRESS MADE! $percentage% coverage achieved."
    echo "📝 Additional flagging may be needed for remaining files."
fi

echo ""
echo "🔍 Run './scripts/validate-flagging.sh' for complete validation report."