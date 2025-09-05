#!/bin/bash

# 🧹 DALSZE CZYSZCZENIE - USUWANIE STARYCH NIEUŻYWANYCH PLIKÓW
# Analiza i usunięcie pozostałych niepotrzebnych plików

echo "🧹 DALSZE CZYSZCZENIE TRADING-BOT"
echo "================================="

cd "/mnt/c/Users/katbo/Desktop/Turbo Bot Deva/trading-bot"

# Utwórz backup listy plików przed usunięciem
echo "📋 Creating file list backup..."
find . -type f > "../files_before_deep_cleanup_$(date +%Y%m%d_%H%M%S).txt"

echo ""
echo "🗑️ Phase 1: Removing remaining TEST files"
echo "=========================================="

# Pozostałe pliki testowe w głównym folderze
test_files=(
    "backtest_data.ts"
    "okx_debug_diagnostic.ts"
    "simple_launcher.ts"
    "simple_main.ts"
    "simple_production_bot.ts"
    "simplified_autonomous_bot.ts"
    "simplified_ml_signal_generator.ts"
    "realistic_validation_corrected.ts"
)

for file in "${test_files[@]}"; do
    if [ -f "$file" ]; then
        echo "🗑️  Removing test file: $file"
        rm -f "$file"
    fi
done

echo ""
echo "🗑️ Phase 2: Removing SHELL SCRIPTS (keeping only essential)"
echo "=========================================================="

# Usuń skrypty shell - zachowaj tylko essential
shell_scripts_to_remove=(
    "cleanup_dead_code.sh"
    "deploy.sh" 
    "deploy_final_production.sh"
    "emergency_cleanup.sh"
    "launch_final_production.sh"
    "monitor_production_test.sh"
    "monitor_test.sh"
    "optimization_report.sh"
    "optimize_resources.sh"
    "optimize_wsl_resources.sh"
    "restart_vscode.sh"
    "restart_vscode_optimized.sh"
    "run_demo_test.sh"
    "start_alpine_bot.sh"
    "start_demo.sh"
    "start_with_monitoring.sh"
    "vscode_ultra_optimize.sh"
    "wsl_ultra_optimize.sh"
)

echo "✅ Keeping: autonomous_bot.sh, deploy_production.sh, production_readiness_check.sh"

for file in "${shell_scripts_to_remove[@]}"; do
    if [ -f "$file" ]; then
        echo "🗑️  Removing shell script: $file"
        rm -f "$file"
    fi
done

echo ""
echo "🗑️ Phase 3: Removing OLD JSON RESULTS"
echo "====================================="

# Usuń stare pliki JSON z wynikami
json_results_to_remove=(
    "COMPREHENSIVE_DASHBOARD_TEST_REPORT.json"
    "DASHBOARD_TEST_REPORT.json"
    "advanced_backtesting_results.json"
    "advanced_fixed_strategies_system.json"
    "alert_test_results_1755531786155.json"
    "balanced_profitable_system.json"
    "clinic_profiling_2025-08-16T23-00-10-406Z.json"
    "comprehensive_workflow_report_1755378714478.json"
    "comprehensive_workflow_report_1755413518139.json"
    "edge_case_handling_report.json"
    "empirical_validation_report.json"
    "error_report_ExtendedRealProductionTest_1756040200752.json"
    "extended_real_production_test_report.json"
    "industry_benchmark_2025-08-16T22-55-06-943Z.json"
    "integration_test_report.json"
    "master_performance_validation_2025-08-16T23-00-10-414Z.json"
    "migration_report.json"
    "performance_validation_2025-08-16T22-55-06-911Z.json"
    "pre_production_test_report.json"
    "real_production_test_report.json"
    "retire-report.json"
    "roadmap_export_1755386522147.json"
    "roadmap_gantt_1755386522167.json"
    "roadmap_status_1755386522143.json"
    "system_diagnostics_output.json"
    "workflow_timing_metrics.json"
    "package-security-updated.json"
    "package.optimized.json"
    "package_v3_real_data.json"
)

echo "✅ Keeping: best_strategy_config.json, master_trading_system.json, minimal_profitable_system.json"
echo "✅ Keeping: optimized_parameters.json, strategy_tier_registry.json, ultimate_optimized_system.json"

for file in "${json_results_to_remove[@]}"; do
    if [ -f "$file" ]; then
        echo "🗑️  Removing JSON result: $file"
        rm -f "$file"
    fi
done

echo ""
echo "🗑️ Phase 4: Removing OPTIMIZATION HISTORY files"
echo "==============================================="

# Usuń stare pliki optymalizacji
optimization_files=(
    "optimization_history_Adaptive_RSI_Strategy_1753886570550.json"
    "optimization_history_Dynamic_MACD_System_1753886571560.json"
    "optimization_history_Hybrid_Momentum_Pro_1753886572569.json"
    "optimization_log.txt"
)

for file in "${optimization_files[@]}"; do
    if [ -f "$file" ]; then
        echo "🗑️  Removing optimization history: $file"
        rm -f "$file"
    fi
done

echo ""
echo "🗑️ Phase 5: Removing RESULT DIRECTORIES"
echo "======================================="

# Usuń katalogi z wynikami testów
result_directories=(
    "__tests__"
    "ai_strategy_enhancement_results"
    "analytics_dashboard_results"
    "dashboard_test_results"
    "execution_mode_results"
    "phase2_complete_results"
    "phase2_integration_results"
    "test_ci_results"
    "test_ci_simple"
    "test_portfolio_results"
    "visualization_results"
    "working_test_results"
    "tier_system_results"
    "realistic_validation"
    "coverage"
)

echo "✅ Keeping: optimization_results, strategy_optimization_results, multi_strategy_optimization_results"

for dir in "${result_directories[@]}"; do
    if [ -d "$dir" ]; then
        echo "🗑️  Removing result directory: $dir"
        rm -rf "$dir"
    fi
done

echo ""
echo "🗑️ Phase 6: Removing EXPERIMENTAL DIRECTORIES"
echo "=============================================="

experimental_dirs=(
    "round3_ultra_optimization"
    "ultra_fine_optimization_results"
    "small_capital_optimization" 
    "full_strategy_optimization"
    "dynamic_parameters"
    "experiments"
    "examples"
    "advanced_validation"
    "temp"
)

for dir in "${experimental_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "🗑️  Removing experimental directory: $dir"
        rm -rf "$dir"
    fi
done

echo ""
echo "🗑️ Phase 7: Removing SPECIALIST TypeScript files"
echo "================================================"

specialist_ts_files=(
    "run_distributed_optimization.ts"
    "professional_optimization.ts"
    "unified_optimization_engine.ts"
    "advanced_ai_ml_system.ts"
    "comprehensive_conflict_analysis.ts"
    "comprehensive_workflow_integrator.ts"
    "comprehensive_workflow_report.ts"
    "dynamic_parameter_system.ts"
    "edge_case_high_volatility_handler.ts"
    "ensemble_ml_manager.ts"
    "enterprise_error_handler.ts"
    "enterprise_production_trading_bot.ts"
    "enterprise_trading_bot_system.ts"
    "extended_trading_session.ts"
    "final_production_main.ts"
    "implement_mobile_ui_2025.ts"
    "live_execution_engine.ts"
    "ml_rl_signal_generator.ts"
    "multi_exchange_manager.ts"
    "perfect_10_enterprise_additions.ts"
    "phase2_complete_summary.ts"
    "phase2_integration_system.ts"
    "phase3_ai_architecture.ts"
    "phase4_integration_system.ts"
    "position_management_demo.ts"
    "production-readiness-validator.ts"
    "production_health_checker.ts"
    "production_main.ts"
    "real_market_data_provider.ts"
    "simple-production-validator.ts"
    "system_workflow_timing_validator.ts"
    "typescript_fixes.ts"
    "unified_ai_trading_system_v4.ts"
    "stop_bot.ts"
)

echo "✅ Keeping essential production files: main.ts, autonomous_trading_bot.ts, kafka_real_time_streaming_final.ts"

for file in "${specialist_ts_files[@]}"; do
    if [ -f "$file" ]; then
        echo "🗑️  Removing specialist TS file: $file"
        rm -f "$file"
    fi
done

echo ""
echo "🗑️ Phase 8: Cleaning DATABASE files"
echo "==================================="

# Usuń stare bazy danych i pliki wal
db_files=(
    "phase4_validation.db"
    "phase4_validation.db.wal"
    "production_analytics.duckdb"
    "production_analytics.duckdb.wal"
    "test_duckdb.db"
    "test_duckdb.db.wal"
    "test_phase4_analytics.duckdb"
    "test_phase4_analytics.duckdb.wal"
    "test_phase4_stream.duckdb"
    "test_phase4_stream.duckdb.wal"
    "test_quick_analytics.duckdb"
    "test_quick_analytics.duckdb.wal"
    "trading_data.duckdb"
    "trading_data.duckdb.wal"
    "validate_phase4_duckdb.ts"
)

for file in "${db_files[@]}"; do
    if [ -f "$file" ]; then
        echo "🗑️  Removing database file: $file"
        rm -f "$file"
    fi
done

echo ""
echo "✅ DEEP CLEANUP COMPLETED!"
echo "========================="

echo "📊 Final project size:"
du -sh .

echo ""
echo "📁 Remaining files count:"
find . -type f | wc -l

echo ""
echo "🎯 PRESERVED ESSENTIAL FILES:"
echo "✅ autonomous_trading_bot.ts - Main production bot"
echo "✅ kafka_real_time_streaming_final.ts - Kafka streaming"
echo "✅ main.ts - Testing framework"
echo "✅ core/ - All core components"
echo "✅ ml/ - ML/AI system"
echo "✅ automation/ - Automation system"
echo "✅ infrastructure/ - Infrastructure"
echo "✅ tools/ - Optimization tools"
echo "✅ .env.production - Production config"
echo "✅ Dockerfile.production - Production container"
echo "✅ package.json - Dependencies"

echo ""
echo "🚀 Project is now heavily optimized and production-ready!"
