#!/bin/bash
# FINAL CLEANUP SCRIPT - TURBO-BOT STRUCTURE OPTIMIZATION
# Generated: 26 December 2025

set -e  # Exit on error

echo "🚀 Starting FINAL CLEANUP - Structure Optimization"
echo "=================================================="

# KROK 1: Remove duplicate bot versions
echo "📌 KROK 1: Removing duplicate bot versions..."
rm -f trading-bot/autonomous_trading_bot.ts
rm -f trading-bot/autonomous_trading_bot.js
rm -f trading-bot/autonomous_trading_bot_final.js
rm -f trading-bot/ULTIMATE_ARCHITECTURE_V2.ts
rm -f trading-bot/simple_bot_runner.ts
rm -f trading-bot/simple_bot_runner.js
rm -f trading-bot/optimized_bot_runner.ts
rm -f trading-bot/optimized_bot_runner.js
rm -f trading-bot/minimal_bot_grafana.ts
rm -f trading-bot/minimal_bot_grafana.js
echo "✅ Removed 5 duplicate bot versions"

# KROK 2: Create docs/ structure
echo "📌 KROK 2: Creating organized docs/ structure..."
mkdir -p docs/deployment
mkdir -p docs/faza-reports

# Move FAZA reports
mv FAZA_1_1_REGULARIZATION_REPORT.md docs/faza-reports/ 2>/dev/null || true
mv FAZA_1_2_STRATEGIES_FIX_REPORT.md docs/faza-reports/ 2>/dev/null || true
mv FAZA_2_1_MULTI_ASSET_IMPLEMENTATION.md docs/faza-reports/ 2>/dev/null || true
mv FAZA_2_3_BLACK_LITTERMAN_COMPLETE.md docs/faza-reports/ 2>/dev/null || true
mv FAZA_3_1_DYNAMIC_RISK_COMPLETE.md docs/faza-reports/ 2>/dev/null || true
mv FAZA_3_3_AUTO_RETRAIN_COMPLETE.md docs/faza-reports/ 2>/dev/null || true

# Move deployment guides
mv DEPLOYMENT_GUIDE_v4.1.md docs/deployment/ 2>/dev/null || true
mv DEPLOYMENT_GUIDE_FAZA_3_COMPLETE.md docs/deployment/ 2>/dev/null || true
mv deploy_faza3.sh docs/deployment/ 2>/dev/null || true

echo "✅ Documentation organized in docs/"

# KROK 3: Remove demo/test/example files
echo "📌 KROK 3: Removing demo/test/example files..."
rm -f trading-bot/data_ingestion_demo.ts
rm -f trading-bot/data_ingestion_demo.js
rm -f trading-bot/core/automatic_strategy_generation_demo.ts
rm -f trading-bot/core/automatic_strategy_generation_demo.js
rm -f trading-bot/core/simplified_parallel_demo.ts
rm -f trading-bot/core/parallel_optimization_demo.ts
rm -f trading-bot/core/simple_optimization_demo.ts
rm -f trading-bot/core/hedging/auto_hedging_demo.ts
rm -f trading-bot/core/hedging/auto_hedging_demo.js
rm -f trading-bot/core/periodic_reoptimization_demo.js
rm -f src/advanced_signals_demo.ts
rm -f src/advanced_signals_demo.js
rm -rf trading-bot/examples/
rm -f src/enterprise/integration/example_strategies.ts
rm -f src/enterprise/integration/example_strategies.js
rm -f logs/bot_demo.log
rm -f logs/demo_bot.log
rm -f trading-bot/pre_production_test_log.txt
rm -f .env.test
rm -f data/ml_checkpoints/checkpoint_test_model_*.json
echo "✅ Removed ~30 demo/test/example files"

# KROK 4: Remove empty directories
echo "📌 KROK 4: Removing empty directories..."
find . -type d -empty ! -path "./node_modules/*" ! -path "./.git/*" ! -path "./archive/*" ! -path "./backups/*" -delete 2>/dev/null || true
echo "✅ Removed empty directories"

# KROK 5: Remove compiled JS from src/
echo "📌 KROK 5: Removing compiled JS from src/enterprise/..."
find src -name "*.js" -type f ! -name "*.config.js" -delete 2>/dev/null || true
echo "✅ Removed ~50 compiled JS files from src/"

# KROK 6: Move /core/ to trading-bot/core/legacy/
echo "📌 KROK 6: Consolidating /core/ directory..."
if [ -d "core" ]; then
    mkdir -p trading-bot/core/legacy
    mv core/* trading-bot/core/legacy/ 2>/dev/null || true
    rmdir core/ 2>/dev/null || true
    echo "✅ Moved /core/ to trading-bot/core/legacy/"
fi

# KROK 7: Remove old deployment systems
echo "📌 KROK 7: Removing old deployment systems..."
rm -f trading-bot/DEPLOYMENT_SYSTEMS.ts
rm -f trading-bot/DEPLOYMENT_SYSTEMS.js
rm -f trading-bot/kafka_real_time_streaming_final.ts
rm -f trading-bot/kafka_real_time_streaming_final.js
echo "✅ Removed old deployment systems (2,400+ LOC)"

# KROK 8: Update .gitignore
echo "📌 KROK 8: Updating .gitignore..."
cat >> .gitignore << 'EOF'

# === TURBO-BOT SPECIFIC RULES ===
# Compiled JavaScript (TypeScript output)
*.js
*.js.map

# Exceptions - Config files
!jest.setup.js
!ecosystem.config.js
!*.config.js
!dashboard/**/*.js
!scripts/**/*.js

# Build outputs
dist/
build/
out/

# Enterprise compiled output
src/**/*.js
trading-bot/**/*.js
!trading-bot/config/**/*.js

# Keep dashboard build artifacts
!dashboard/dist/**/*.js
!dashboard/src/**/*.js

# Temporary files
*.tmp
*.temp
.cache/

EOF
echo "✅ Updated .gitignore"

# KROK 9: Remove all compiled JS (now in gitignore)
echo "📌 KROK 9: Removing all compiled JS files..."
find . -name "*.js" -type f \
    ! -path "./node_modules/*" \
    ! -path "./dashboard/*" \
    ! -path "./.git/*" \
    ! -path "./archive/*" \
    ! -path "./backups/*" \
    ! -name "ecosystem.config.js" \
    ! -name "jest.setup.js" \
    ! -name "*.config.js" \
    -delete 2>/dev/null || true
echo "✅ Removed ~420 compiled JS files"

# FINAL SUMMARY
echo ""
echo "=================================================="
echo "✅ FINAL CLEANUP COMPLETED!"
echo "=================================================="
echo ""
echo "📊 FINAL STATISTICS:"
echo "-------------------"
echo "TypeScript files: $(find . -name "*.ts" ! -path "./node_modules/*" ! -path "./archive/*" | wc -l)"
echo "JavaScript files: $(find . -name "*.js" ! -path "./node_modules/*" ! -path "./archive/*" ! -path "./dashboard/*" | wc -l)"
echo "Markdown docs:    $(find . -name "*.md" -maxdepth 1 | wc -l)"
echo "Empty dirs:       $(find . -type d -empty ! -path "./node_modules/*" ! -path "./.git/*" 2>/dev/null | wc -l)"
echo ""
echo "📁 New structure:"
echo "   ├── docs/deployment/        (3 files)"
echo "   ├── docs/faza-reports/      (6 reports)"
echo "   └── trading-bot/            (Clean TS only)"
echo ""
echo "🚀 Bot entry point: trading-bot/AutonomousTradingBot.ts"
echo ""
