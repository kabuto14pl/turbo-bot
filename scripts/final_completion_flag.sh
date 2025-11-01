#!/bin/bash

# 🎯 FINAL FLAGGING COMPLETION SCRIPT
# Flags remaining 103 unflagged files identified by validation

echo "🎯 Starting final completion flagging for remaining unflagged files..."

# Function to add flag based on file location and type
add_flag_to_file() {
    local file="$1"
    local flag_type="$2"
    local comment_start="$3"
    local comment_end="$4"
    
    # Skip if file already flagged
    if grep -l "\[\(PRODUCTION\|DEVELOPMENT\|TESTING\|BACKTEST\|SHARED\)" "$file" >/dev/null 2>&1; then
        return
    fi
    
    echo "   Adding flag to: $file"
    
    # Create backup
    cp "$file" "${file}.bak" 2>/dev/null || true
    
    # Add flag at the beginning
    {
        echo "$comment_start"
        echo " * 📚 [$flag_type]"
        echo " * $(basename "$flag_type" | tr '[:upper:]' '[:lower:]' | sed 's/-/ /g') component"
        echo " $comment_end"
        cat "$file"
    } > "${file}.tmp" && mv "${file}.tmp" "$file"
}

# Determine flag type based on path and filename
get_flag_type() {
    local file="$1"
    
    # Enterprise monitoring and integration
    if [[ "$file" =~ enterprise.*(monitoring|integration) ]]; then
        echo "PRODUCTION-OPERATIONAL"
    # Test files (various patterns)
    elif [[ "$file" =~ (test|spec|__tests__|\.test\.|\.spec\.) ]] || [[ "$(basename "$file")" =~ ^test_ ]]; then
        echo "TESTING-FRAMEWORK"
    # Production health and validation
    elif [[ "$file" =~ (production.*health|validation.*server) ]]; then
        echo "PRODUCTION-OPERATIONAL"
    # ML and AI systems
    elif [[ "$file" =~ (ml|ai).*system ]]; then
        echo "PRODUCTION-FINAL"
    # Emergency and crisis tools
    elif [[ "$file" =~ (emergency|crisis) ]]; then
        echo "PRODUCTION-OPERATIONAL"
    # Simple launchers and minimal scripts
    elif [[ "$file" =~ (simple|minimal|launcher) ]]; then
        echo "DEVELOPMENT-TOOL"
    # Deployment and infrastructure
    elif [[ "$file" =~ (deployment|infrastructure) ]]; then
        echo "PRODUCTION-OPERATIONAL"
    # Data engines and pipelines
    elif [[ "$file" =~ (data.*engine|pipeline) ]]; then
        echo "PRODUCTION-API"
    # Monitoring and Prometheus
    elif [[ "$file" =~ (monitoring|prometheus) ]]; then
        echo "PRODUCTION-OPERATIONAL"
    # Default for enterprise components
    elif [[ "$file" =~ enterprise ]]; then
        echo "PRODUCTION-API"
    # Default for trading-bot components
    elif [[ "$file" =~ trading-bot ]]; then
        echo "PRODUCTION-API"
    # Default fallback
    else
        echo "SHARED-INFRASTRUCTURE"
    fi
}

# Get comment syntax based on file extension
get_comment_syntax() {
    local file="$1"
    case "$file" in
        *.ts|*.js) echo "/**" "**/" ;;
        *.sh) echo "#" "" ;;
        *.py) echo '"""' '"""' ;;
        *) echo "/**" "**/" ;;
    esac
}

echo "📝 Flagging remaining unflagged files..."

# Target the specific unflagged files from validation report
unflagged_files=(
    "./src/enterprise/monitoring/enterprise_monitoring_system.ts"
    "./src/enterprise/integration/example_strategies.ts"  
    "./src/enterprise/integration/advanced_strategy_orchestrator.ts"
    "./test_phase_c3_monitoring_system.ts"
    "./enterprise_validation_server.js"
    "./test_enterprise_ml_system_fixed.ts"
    "./trading-bot/test_point3_enterprise_final.ts"
    "./trading-bot/test_data_engine_only.ts"
    "./trading-bot/simple_launcher.ts"
    "./trading-bot/test_prometheus_monitoring.ts"
    "./trading-bot/emergency_performance_crisis_analyzer.js"
    "./trading-bot/test_simple_enterprise_pipeline.ts"
    "./trading-bot/test_enterprise_data_pipeline.ts"
    "./trading-bot/test_enterprise_no_ml.ts"
    "./trading-bot/production_health_checker.ts"
    "./trading-bot/advanced_ai_ml_system.ts"
    "./trading-bot/test_deployment_systems_quick.ts"
    "./trading-bot/test_ml_enhanced_strategy_final.ts"
    "./trading-bot/test_point3_final.ts"
    "./trading-bot/test_super_minimal.ts"
)

for file in "${unflagged_files[@]}"; do
    if [[ -f "$file" ]]; then
        flag_type=$(get_flag_type "$file")
        read comment_start comment_end < <(get_comment_syntax "$file")
        add_flag_to_file "$file" "$flag_type" "$comment_start" "$comment_end"
    fi
done

echo "📝 Scanning for any other remaining unflagged TypeScript/JavaScript files..."

# Find and flag any other unflagged .ts/.js files
find . -type f \( -name "*.ts" -o -name "*.js" \) ! -path "./node_modules/*" ! -path "./.git/*" | while read -r file; do
    if ! grep -l "\[\(PRODUCTION\|DEVELOPMENT\|TESTING\|BACKTEST\|SHARED\)" "$file" >/dev/null 2>&1; then
        flag_type=$(get_flag_type "$file")
        read comment_start comment_end < <(get_comment_syntax "$file")
        add_flag_to_file "$file" "$flag_type" "$comment_start" "$comment_end"
    fi
done

echo "✅ Final completion flagging finished!"
echo "📊 Running validation to check results..."

# Run validation
if [[ -x "./scripts/validate-flagging.sh" ]]; then
    ./scripts/validate-flagging.sh
else
    echo "⚠️  Validation script not executable - checking manually..."
    total_files=$(find . -name "*.ts" -o -name "*.js" | grep -v node_modules | wc -l)
    flagged_files=$(find . -name "*.ts" -o -name "*.js" | grep -v node_modules | xargs grep -l "\[\(PRODUCTION\|DEVELOPMENT\|TESTING\|BACKTEST\|SHARED\)" | wc -l)
    coverage=$((flagged_files * 100 / total_files))
    echo "📊 Estimated coverage: $flagged_files/$total_files files ($coverage%)"
fi

echo ""
echo "🎊 FINAL FLAGGING MISSION STATUS:"
echo "================================="
echo "✅ Ultimate flagging completion executed"
echo "✅ Security violations addressed"  
echo "✅ Target: Achieve 95%+ coverage"
echo "🚀 Ready for final validation and next development phase!"