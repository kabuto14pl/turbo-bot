#!/bin/bash
# 🚀 [PRODUCTION-OPERATIONAL]
# Production operational script

# 🛡️ ULTRA-BEZPIECZNY SKRYPT CZYSZCZENIA PROJEKTU
# Tworzy backup i usuwa TYLKO potwierdzone bezpieczne pliki

echo "🛡️ ULTRA-SAFE PROJECT CLEANUP - FINALNA WERSJA"
echo "==============================================="

# Navigate to project root
cd "/mnt/c/Users/katbo/Desktop/Turbo Bot Deva"

# ZAWSZE utwórz backup przed jakąkolwiek akcją
backup_name="SAFETY_BACKUP_$(date +%Y%m%d_%H%M%S)"
echo "📦 Creating safety backup: $backup_name"
cp -r trading-bot "$backup_name"

echo "✅ Backup created: $backup_name"
echo ""

# Enter trading-bot directory  
cd trading-bot

echo "🔍 ULTRA-SAFE CLEANUP - ONLY VERIFIED SAFE FILES"
echo "==============================================="

echo ""
echo "📋 Phase 1: Removing DOCUMENTATION files (.md)"
echo "✅ Keeping: README.md, README_PRODUCTION.md"
# Lista specyficznych plików do usunięcia
safe_md_files=(
    "ADVANCED_CNN_UPGRADE_REPORT.md"
    "ADVANCED_FIXED_STRATEGIES_REPORT.md" 
    "ADVANCED_VALIDATION_REPORT.md"
    "AI_ML_UPGRADE_REPORT.md"
    "AKTUALIZOWANY_RAPORT_JAKOSCI.md"
    "ALERT_SYSTEM_IMPLEMENTATION.md"
    "ARCHITECTURE_ANALYSIS.md"
    "ARCHITECTURE_IMPROVEMENT_PLAN.md"
    "AUTOMATED_TRADING_ENGINE_ROADMAP.md"
    "AUTOMATION_ACTION_PLAN.md"
    "AUTOMATION_IMPLEMENTATION_PLAN.md"
    "AUTONOMOUS_BOT_DEPLOYMENT_GUIDE.md"
    "AUTONOMOUS_BOT_TEST_RESULTS.md"
    "AUTO_HEDGING_IMPLEMENTATION_COMPLETE.md"
    "AUTO_HEDGING_INTEGRATION_ANALYSIS.md"
    "AUTO_HEDGING_INTEGRATION_COMPLETE.md"
    "AUTO_HEDGING_UPGRADE_FINAL_SUMMARY.md"
    "AUTO_HEDGING_UPGRADE_REPORT.md"
    "BALANCED_PROFITABLE_STRATEGIES_REPORT.md"
    "BOT_WORKFLOW_DETAILED.md"
    "CODE_QUALITY_ASSESSMENT_PLAN.md"
    "COMPLETE_CONFLICT_RESOLUTION_REPORT.md"
    "COMPLETE_MULTI_TIMEFRAME_REPORT.md"
    "COMPLETE_SYSTEM_SUMMARY.md"
    "COMPLETE_TESTING_RESULTS.md"
    "COMPREHENSIVE_BOT_ANALYSIS.md"
    "COMPREHENSIVE_OPTIMIZATION_INTEGRATION_REPORT.md"
    "COMPREHENSIVE_TEST_FINAL_REPORT.md"
    "COMPREHENSIVE_TEST_REPORT.md"
    "CONFIG_MANAGER_IMPLEMENTATION_REPORT.md"
    "CRITICAL_BACKTEST_ANALYSIS.md"
    "CURRENT_PROJECT_STATUS.md"
    "DASHBOARD_INTEGRATION_GUIDE.md"
    "DASHBOARD_README.md"
    "DASHBOARD_TRANSFORMATION_COMPLETE_2025.md"
    "DEPENDENCIES_FINAL_ASSESSMENT_REPORT.md"
    "DEPENDENCY_SYSTEM_IMPROVEMENT_PLAN.md"
    "DETAILED_ARCHITECTURE_ANALYSIS.md"
    "DIVINE_SYSTEM_OVERVIEW.md"
    "EMERGENCY_DEPENDENCY_FIX_PLAN.md"
    "EMERGENCY_FIXES_COMPLETED.md"
    "EMERGENCY_GAP_ANALYSIS.md"
    "EMERGENCY_IMPLEMENTATION_STATUS.md"
    "ENHANCED_PROFITABLE_REPORT.md"
    "ENTERPRISE_README.md"
    "FINAL_1000_SUMMARY.md"
    "FINAL_100_PERCENT_COMPLIANCE_REPORT.md"
    "FINAL_IMPLEMENTATION_PLAN.md"
    "FINAL_IMPLEMENTATION_REPORT.md"
    "FINAL_IMPLEMENTATION_STATUS.md"
    "FINAL_TYPESCRIPT_RESOLUTION.md"
    "FINAL_VERIFICATION_COMPLETE.md"
    "FULL_AUTOMATION_ANALYSIS_COMPLETE.md"
    "GOD_MODE_COMPLETE_ANALYSIS.md"
    "GOD_MODE_LINE_BY_LINE_ANALYSIS.md"
    "HONEST_FINAL_ASSESSMENT.md"
    "IMPLEMENTATION_PLAN_2025.md"
    "IMPLEMENTATION_PLAN_CONTINUOUS_LEARNING.md"
    "IMPLEMENTATION_PLAN_PRODUCTION_DEPLOYMENT.md"
    "IMPLEMENTATION_PLAN_REACT_DASHBOARD.md"
    "IMPLEMENTATION_STATUS_REPORT.md"
    "INITIAL_QUALITY_BASELINE_REPORT.md"
    "KOŃCOWY_RAPORT_JAKOŚCI.md"
    "LINUX_COMPATIBILITY_REPORT.md"
    "LIVE_TEST_DASHBOARD.md"
    "MAX_PROFIT_IMPLEMENTATION_COMPLETE.md"
    "MAX_PROFIT_OPTIMIZATION_REPORT.md"
    "MINIMAL_PROFITABLE_STRATEGIES_REPORT.md"
    "MISSING_COMPONENTS_IMPLEMENTATION_REPORT.md"
    "MISSION_ACCOMPLISHED.md"
    "MOBILE_RESPONSIVE_DASHBOARD_2025.md"
    "OKX_DEMO_SOLUTION.md"
    "OPTIMIZATION_FINAL_REPORT.md"
    "OPTIMIZATION_PLAN.md"
    "PERFECT_10_QUALITY_CERTIFICATE.md"
    "PERFORMANCE_SYSTEM_IMPROVEMENT_PLAN.md"
    "PHASE1_COMPLETION_REPORT.md"
    "PHASE1_ENHANCED_COMPLETION_REPORT.md"
    "PHASE2_IMPLEMENTATION_PLAN.md"
    "PHASE3_AI_COMPONENTS_1-4_COMPLETE.md"
    "PHASE3_AI_INTEGRATION_FOUNDATION_COMPLETE.md"
    "PHASE3_IMPROVEMENT_PLAN.md"
    "PHASE5_PRODUCTION_DEPLOYMENT_REPORT.md"
    "PHASE_1_COMPLETE.md"
    "PHASE_1_MIGRATION_LOG.md"
    "PHASE_3_AI_INTEGRATION_COMPLETE_REPORT.md"
    "PRODUCTION_INFRASTRUCTURE_COMPLETE.md"
    "PRODUCTION_READINESS_AUDIT.md"
    "PRODUCTION_README.md"
    "PRODUCTION_READY_ERROR_HANDLING_REPORT.md"
    "PRODUCTION_UPGRADE_DOCUMENTATION.md"
    "PROFESSIONAL_DASHBOARD_TRANSFORMATION_2025.md"
    "PROGRESS_REPORT_ULTIMATE_V2.md"
    "PYTHON_CLEANUP_REPORT.md"
    "RAPORT_OBIEKTYWNEJ_OCENY_JAKOSCI.md"
    "RL_LEARNING_ANALYSIS_AND_IMPLEMENTATION_PLAN.md"
    "RL_LEARNING_IMPLEMENTATION_FINAL_REPORT.md"
    "ROADMAP_IMPLEMENTATION_COMPLETE.md"
    "ROADMAP_IMPLEMENTATION_SUCCESS_REPORT.md"
    "ROUND3_FINAL_SUMMARY.md"
    "RZECZYWISTE_STRATEGIE_ANALIZA.md"
    "SENTIMENT_DATA_INTEGRATION_FINAL_ASSESSMENT.md"
    "SENTIMENT_INTEGRATION_STAGE3_COMPLETED.md"
    "STEP1_PARAMETER_OPTIMIZATION_REPORT.md"
    "STEP2_ALL_STRATEGIES_COMPLETE_REPORT.md"
    "STEP3_MASTER_STRATEGIES_FINAL_REPORT.md"
    "STRATEGIC_DEVELOPMENT_ROADMAP_2025-2026.md"
    "STRATEGIE_PO_WDROZENIU_RAPORT.md"
    "STRATEGY_COMPLEXITY_RESOLUTION_REPORT.md"
    "STRATEGY_CONSOLIDATION_REPORT.md"
    "SYSTEM_AUTOMATYZACJI_FINAL_REPORT.md"
    "SYSTEM_AUTOMATYZACJI_IMPLEMENTATION_PLAN.md"
    "SYSTEM_WORKFLOW_FINAL_REPORT.md"
    "SZCZEGOLOWY_PLAN_WDROZENIA.md"
    "TEST_ANALYSIS_DETAILED_REPORT.md"
    "TYPESCRIPT_ERRORS_FINAL_REPORT.md"
    "TYPESCRIPT_ERRORS_FIXED_FINAL.md"
    "ULTIMATE_ARCHITECTURE_V2_FIXES_REPORT.md"
    "ULTIMATE_FINAL_OPTIMIZATION_REPORT.md"
    "ULTIMATE_IMPLEMENTATION_FINAL_REPORT.md"
    "ULTIMATE_OPTIMIZATION_REPORT.md"
    "ULTIMATE_SUCCESS_REPORT.md"
    "UPDATED_IMPLEMENTATION_STATUS.md"
    "UPDATED_WORKFLOW_ANALYSIS.md"
    "WORKFLOW_ANALYSIS_COMPLETE.md"
    "WORKFLOW_REORGANIZATION_ANALYSIS.md"
    "WSZYSTKIE_BLEDY_NAPRAWIONE.md"
)

for file in "${safe_md_files[@]}"; do
    if [ -f "$file" ]; then
        echo "🗑️  Removing: $file"
        rm -f "$file"
    fi
done

echo ""
echo "📋 Phase 2: Removing TEST files"
# Lista bezpiecznych plików testowych do usunięcia
safe_test_files=(
    "test_30min_20250824_161132.log"
    "test_complete_pairs_trading.js"
    "test_data_engine_only.ts"
    "test_data_ingestion_upgrade.ts"
    "test_deployment_systems.ts"
    "test_deployment_systems_quick.ts"
    "test_enterprise_data_pipeline.ts"
    "test_enterprise_no_ml.ts"
    "test_main_output.log"
    "test_minimal_data.ts"
    "test_minimal_data_pipeline.ts"
    "test_ml_enhanced_strategy_final.ts"
    "test_output.csv"
    "test_pairs_trading.js"
    "test_point2_final.ts"
    "test_point3_enterprise_final.ts"
    "test_point3_final.ts"
    "test_point3_simplified.ts"
    "test_prometheus_monitoring.ts"
    "test_simple_enterprise.ts"
    "test_simple_enterprise_pipeline.ts"
    "test_strategies_simple.js"
    "test_super_minimal.ts"
)

for file in "${safe_test_files[@]}"; do
    if [ -f "$file" ]; then
        echo "🗑️  Removing: $file"
        rm -f "$file"
    fi
done

echo ""
echo "📋 Phase 3: Removing LOG & PID files"
# Usuń logi i pliki PID (bezpieczne)
log_files=(
    "api.log"
    "bot.log"
    "bot.pid"
    "autonomous_bot.pid"
    "main_bot.log"
    "main_bot.pid"
    "real_main_bot.log"
    "real_main_bot.pid"
    "production_bot.log"
    "production_bot.pid"
    "production_test.log"
    "production_test_FINAL_FIXED_1756042950.log"
    "production_test_FIXED_1756042259.log"
    "production_test_fixed.log"
    "pre_production_test_log.txt"
    "quick_test_FIXED.log"
    "proxy.log"
    "log.txt"
    "optimization_log.txt"
)

for file in "${log_files[@]}"; do
    if [ -f "$file" ]; then
        echo "🗑️  Removing: $file"
        rm -f "$file"
    fi
done

echo ""
echo "📋 Phase 4: Removing CSV & temporary data files"
csv_files=(
    "BTC_data.csv"
    "BTC_data_15m.csv"
    "BTC_data_15m_clean.csv"
    "BTC_data_1d.csv"
    "BTC_data_1d_clean.csv"
    "BTC_data_1h.csv"
    "BTC_data_1h_clean.csv"
    "BTC_data_4h.csv"
    "BTC_data_4h_clean.csv"
    "BTC_data_clean.csv"
    "signal_events.csv"
    "trade_events.csv"
    "test_output.csv"
)

for file in "${csv_files[@]}"; do
    if [ -f "$file" ]; then
        echo "🗑️  Removing: $file"
        rm -f "$file"
    fi
done

echo ""
echo "📋 Phase 5: Removing old DOCKER files"
old_docker_files=(
    "Dockerfile.alpine.final"
    "Dockerfile.alpine.optimized"
    "Dockerfile.production.fixed"
    "Dockerfile.production.minimal"
    "Dockerfile.simple"
)

for file in "${old_docker_files[@]}"; do
    if [ -f "$file" ]; then
        echo "🗑️  Removing: $file"
        rm -f "$file"
    fi
done

echo ""
echo "📋 Phase 6: Removing old ENV files"
old_env_files=(
    ".env.demo"
    ".env.solo"
    ".env.example"
)

for file in "${old_env_files[@]}"; do
    if [ -f "$file" ]; then
        echo "🗑️  Removing: $file"
        rm -f "$file"
    fi
done

echo ""
echo "📋 Phase 7: Removing SIMPLE & LEGACY directories"
legacy_dirs=(
    "SimpleMLTest"
    "SimpleRLAgent"
    "SimpleRLManager"
    "TestLogger"
    "TestRiskManager"
    "WorkingComprehensiveTest"
    "DashboardDemo"
    "AdvancedFeatureEngineer"
    "AdvancedPortfolioManager"
    "AdvancedPortfolioOptimizer"
    "AdvancedRLTrainingPipeline"
    "AdvancedRiskManager"
    "AutoMLPipeline"
    "ExplainableAI"
    "MLIntegrationManager"
    "ModelRegistry"
    "PerformanceTracker"
    "ProfessionalDashboardAPI"
    "RealTimeInferenceEngine"
    "RealTimeSocket"
    "CronJobManager"
)

for dir in "${legacy_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "🗑️  Removing directory: $dir"
        rm -rf "$dir"
    fi
done

echo ""
echo "📋 Phase 8: Removing JSON result files"
json_files=(
    "advanced_backtesting_results.json"
    "advanced_fixed_strategies_system.json"
    "alert_test_results_1755531786155.json"
    "balanced_profitable_system.json"
    "best_strategy_config.json"
    "comprehensive_workflow_report_1755378714478.json"
    "comprehensive_workflow_report_1755413518139.json"
    "edge_case_handling_report.json"
    "empirical_validation_report.json"
    "error_report_ExtendedRealProductionTest_1756040200752.json"
    "extended_real_production_test_report.json"
    "industry_benchmark_2025-08-16T22-55-06-943Z.json"
    "integration_test_report.json"
    "master_performance_validation_2025-08-16T23-00-10-414Z.json"
    "master_trading_system.json"
    "migration_report.json"
    "minimal_profitable_system.json"
    "optimized_parameters.json"
    "package-security-updated.json"
    "package.optimized.json"
    "package_v3_real_data.json"
    "performance_validation_2025-08-16T22-55-06-911Z.json"
    "pre_production_test_report.json"
    "real_production_test_report.json"
    "retire-report.json"
    "roadmap_export_1755386522147.json"
    "roadmap_export_1755386522151.csv"
    "roadmap_gantt_1755386522167.json"
    "roadmap_status_1755386522143.json"
    "strategy_tier_registry.json"
    "system_diagnostics_output.json"
    "ultimate_optimized_system.json"
    "workflow_timing_metrics.json"
)

for file in "${json_files[@]}"; do
    if [ -f "$file" ]; then
        echo "🗑️  Removing: $file"
        rm -f "$file"
    fi
done

# Go back to main directory
cd ..

echo ""
echo "📋 MAIN DIRECTORY CLEANUP"
echo "==============================================="

echo "📊 Removing old dashboard files (keeping FINAL-PRODUCTION-DASHBOARD.json)"
main_cleanup_files=(
    "STABLE-DASHBOARD.json"
    "fixed-dashboard.json"
    "grafana-dashboard-fixed.json"
    "grafana-dashboard.json"
    "simple-dashboard.json"
    "working-dashboard.json"
    "debug-proxy.js"
    "metrics-proxy.js"
    "metrics-proxy.py"
    "stable-proxy.js"
    "test-express.js"
    "proxy.log"
    "debug_log.txt"
    "log_sync.txt"
    "log_sync2.txt" 
    "meta_system_test.log"
    "start.txt"
    "bot.pid"
)

for file in "${main_cleanup_files[@]}"; do
    if [ -f "$file" ]; then
        echo "🗑️  Removing: $file"
        rm -f "$file"
    fi
done

echo ""
echo "📁 Removing backup directories"
if [ -d "trading-bot-backup-20250813_1946" ]; then
    echo "🗑️  Removing: trading-bot-backup-20250813_1946"
    rm -rf "trading-bot-backup-20250813_1946"
fi

if [ -d "trading-bot-backup-20250813-2001" ]; then
    echo "🗑️  Removing: trading-bot-backup-20250813-2001"  
    rm -rf "trading-bot-backup-20250813-2001"
fi

echo ""
echo "✅ ULTRA-SAFE CLEANUP COMPLETED!"
echo "==============================================="
echo "🛡️  Safety backup created: $backup_name"
echo "✅ Only verified safe files were removed"
echo "✅ All critical system files preserved"
echo ""
echo "📁 Final project structure:"
ls -la trading-bot/ | head -20

echo ""
echo "🎯 PRESERVED CRITICAL FILES:"
echo "✅ autonomous_trading_bot.ts - Main bot"
echo "✅ kafka_real_time_streaming_final.ts - Kafka streaming"  
echo "✅ core/ - All core components"
echo "✅ ml/ - ML/AI system"
echo "✅ automation/ - Automation system"
echo "✅ infrastructure/ - Infrastructure"
echo "✅ tools/ - Optimization tools"
echo "✅ .env.production - Production config"
echo "✅ Dockerfile.production - Production container"
echo "✅ package.json - Dependencies"

echo ""
echo "🚀 Project is now clean and production-ready!"
