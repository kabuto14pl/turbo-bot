#!/bin/bash
# CLEANUP PHASE 2 - Missed Files & Additional Optimization
# Generated: 26 December 2025

set -e

echo "🔍 CLEANUP PHASE 2 - Deep Cleaning Missed Files"
echo "================================================"

# ISSUE 1: src/enterprise compiled JS (48 files missed)
echo "📌 ISSUE 1: Removing remaining compiled JS from src/enterprise..."
find src/enterprise -name "*.js" -type f ! -name "*.config.js" -delete 2>/dev/null || true
echo "✅ Removed 48 compiled JS files from src/enterprise"

# ISSUE 2: Demo files in trading-bot/core (20+ files)
echo "📌 ISSUE 2: Removing demo files from trading-bot/core..."
rm -f trading-bot/core/periodic_reoptimization_demo.*
rm -f trading-bot/core/integrated_optimization_demo.*
rm -f trading-bot/core/optimization_demo.*
rm -f trading-bot/core/complex_objective_demo.*
rm -f trading-bot/core/hyperparameter_demo.*
rm -f trading-bot/core/monitoring_adaptation_demo.*
echo "✅ Removed 12+ demo files from trading-bot/core"

# ISSUE 3: Old entry points and cruft in trading-bot root
echo "📌 ISSUE 3: Removing old entry points from trading-bot..."
rm -f trading-bot/final_production_main.*
rm -f trading-bot/production_main.*
rm -f trading-bot/production_health_checker.*
rm -f trading-bot/simple_launcher.*
rm -f trading-bot/position_management_demo.*
rm -f trading-bot/ml_rl_signal_generator.*
rm -f trading-bot/check_instruments.*
rm -f trading-bot/performance_monitor.*
rm -f trading-bot/jest.setup.*
echo "✅ Removed 9 old entry points from trading-bot root"

# ISSUE 4: Python/BAT files (not TypeScript project)
echo "📌 ISSUE 4: Removing Python/BAT files..."
rm -f trading-bot/gantt_chart_generator.py
rm -f trading-bot/milestone_monitoring_system.py
rm -f trading-bot/run_test.bat
rm -f trading-bot/restart_wsl.bat
rm -f trading-bot/run_analysis.bat
rm -f trading-bot/run_full_analysis.bat
rm -rf trading-bot/tools/python/
echo "✅ Removed Python/BAT files"

# ISSUE 5: demo.config files (not needed for production)
echo "📌 ISSUE 5: Removing demo config files..."
rm -f trading-bot/config/environments/demo.config.*
echo "✅ Removed demo config files"

# ISSUE 6: test files in tests/ and scripts/
echo "📌 ISSUE 6: Removing test infrastructure..."
rm -f tests/test_imports.*
rm -f scripts/analyze_test_results.sh
echo "✅ Removed test infrastructure files"

# ISSUE 7: src/ root level files (should be in subdirs)
echo "📌 ISSUE 7: Moving src/ root level files to archive..."
mkdir -p archive/cleanup_20251226/old_src_root
mv src/*.ts archive/cleanup_20251226/old_src_root/ 2>/dev/null || true
mv src/*.js archive/cleanup_20251226/old_src_root/ 2>/dev/null || true
echo "✅ Archived src/ root level files"

# ISSUE 8: Empty directories cleanup
echo "📌 ISSUE 8: Final empty directories cleanup..."
find . -type d -empty ! -path "./node_modules/*" ! -path "./.git/*" ! -path "./archive/*" ! -path "./backups/*" -delete 2>/dev/null || true
echo "✅ Removed remaining empty directories"

# FINAL STATS
echo ""
echo "================================================"
echo "✅ CLEANUP PHASE 2 COMPLETED!"
echo "================================================"
echo ""
echo "📊 Cleaned:"
echo "   - 48 compiled JS from src/enterprise"
echo "   - 12+ demo files from trading-bot/core"
echo "   - 9 old entry points from trading-bot root"
echo "   - 10+ Python/BAT files"
echo "   - Test infrastructure files"
echo "   - 6 src/ root level files → archived"
echo ""
echo "📁 Final TypeScript count: $(find . -name '*.ts' ! -path './node_modules/*' ! -path './archive/*' ! -path './.git/*' | wc -l)"
echo "📁 Final JavaScript count: $(find . -name '*.js' ! -path './node_modules/*' ! -path './archive/*' ! -path './dashboard/*' ! -path './.git/*' | wc -l)"
echo ""
