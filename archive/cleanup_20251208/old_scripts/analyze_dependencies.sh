#!/bin/bash
# 🚀 [PRODUCTION-OPERATIONAL]
# Production operational script

# 🔍 BEZPIECZNA ANALIZA ZALEŻNOŚCI AUTONOMOUS_TRADING_BOT.TS
# Sprawdza wszystkie pliki używane przez finalną wersję bota

echo "🔍 Analyzing dependencies for autonomous_trading_bot.ts..."

# Navigate to trading-bot directory
cd "/mnt/c/Users/katbo/Desktop/Turbo Bot Deva/trading-bot"

echo "📋 CRITICAL FILES USED BY AUTONOMOUS_TRADING_BOT.TS:"
echo "==============================================="

echo ""
echo "🔥 MAIN BOT FILE:"
echo "✅ autonomous_trading_bot.ts - GŁÓWNY PLIK BOTA"

echo ""
echo "📡 KAFKA & STREAMING:"
echo "✅ kafka_real_time_streaming_final.ts"

echo ""
echo "🏗️ CORE DIRECTORIES (MUST KEEP):"
echo "✅ core/ - wszystkie komponenty podstawowe"
echo "   ├── monitoring/prometheus_server.ts"
echo "   ├── types/strategy.ts"
echo "   ├── types/order.ts" 
echo "   ├── types/indicator_set.ts"
echo "   ├── types/bot_state.ts"
echo "   ├── risk/risk_manager.ts"
echo "   ├── risk/global_risk_manager.ts"
echo "   ├── risk/advanced_position_manager.ts"
echo "   ├── risk/advanced_stop_loss.ts"
echo "   ├── portfolio/portfolio.ts"
echo "   ├── performance/performance_tracker.ts"
echo "   ├── optimization/optimization_scheduler.ts"
echo "   ├── indicators/indicator_provider.ts"
echo "   ├── indicators/rsi.ts"
echo "   ├── indicators/ema.ts"
echo "   ├── indicators/adx.ts"
echo "   ├── indicators/atr.ts"
echo "   ├── alerts/alert_coordination_system.ts"
echo "   ├── ml/tensorflow_integration_v2.ts"
echo "   └── data/enterprise_real_time_data_pipeline.ts"
echo "   └── data/simplified_real_time_data_engine.ts"

echo ""
echo "🧠 ML/AI DIRECTORY (MUST KEEP):"
echo "✅ ml/ - system uczenia maszynowego"
echo "   ├── ml_integration_manager.ts"
echo "   ├── realtime_inference_engine.ts"
echo "   ├── model_registry.ts"
echo "   ├── automl_pipeline.ts"
echo "   └── explainable_ai_system.ts"

echo ""
echo "🤖 AUTOMATION DIRECTORY (MUST KEEP):"
echo "✅ automation/continuous_improvement_manager.ts"

echo ""
echo "🏗️ INFRASTRUCTURE DIRECTORY (MUST KEEP):"
echo "✅ infrastructure/logging/logger.ts"

echo ""
echo "⚠️ CONDITIONAL FILES (check if exist):"
# Check if these files exist before deciding
echo -n "📁 tools/ - "; if [ -d "tools" ]; then echo "EXISTS ✅"; else echo "MISSING ❌"; fi
echo -n "📁 strategies/ - "; if [ -d "strategies" ]; then echo "EXISTS ✅"; else echo "MISSING ❌"; fi

echo ""
echo "🐳 PRODUCTION FILES (MUST KEEP):"
echo "✅ Dockerfile.production"
echo "✅ .env.production"
echo "✅ package.json"
echo "✅ tsconfig.json"

echo ""
echo "❌ SAFE TO DELETE CATEGORIES:"
echo "==============================================="
echo "🗂️ Documentation (90+ .md files)"
echo "🧪 Test files (test_*.ts, *_demo.ts, simple_*.ts)"
echo "📋 Log files (*.log, *.pid)"
echo "💾 Temporary data (*.csv, *.duckdb)"
echo "🏗️ Backup directories (backup-*, *-backup-*)"
echo "🐳 Old Dockerfiles (Dockerfile.alpine.*, Dockerfile.simple)"
echo "🔒 Dev env files (.env.demo, .env.solo)"
echo "📊 Old dashboards (except FINAL-PRODUCTION-DASHBOARD.json)"

echo ""
echo "⚠️ FILES TO VERIFY BEFORE DELETION:"
echo "==============================================="

# Check for main.ts usage
echo -n "📄 main.ts - "
if grep -q "main.ts" autonomous_trading_bot.ts; then
    echo "REFERENCED IN AUTONOMOUS BOT ⚠️"
else
    echo "NOT REFERENCED - CHECK SEPARATELY ✅"
fi

# Check for any specific imports
echo "📋 Checking for any missed dependencies..."
grep "import.*from.*\\./" autonomous_trading_bot.ts | grep -v "//" | sort | uniq

echo ""
echo "🎯 RECOMMENDED SAFE CLEANUP STRATEGY:"
echo "==============================================="
echo "1. ✅ Keep all core/ directory"
echo "2. ✅ Keep all ml/ directory" 
echo "3. ✅ Keep automation/ directory"
echo "4. ✅ Keep infrastructure/ directory"
echo "5. ✅ Keep main bot files (autonomous_trading_bot.ts, kafka_real_time_streaming_final.ts)"
echo "6. ✅ Keep production configs (.env.production, Dockerfile.production)"
echo "7. ❌ Delete documentation (.md files except README)"
echo "8. ❌ Delete test files (test_*, demo_*, simple_*)"
echo "9. ❌ Delete logs and temp data"
echo "10. ❌ Delete backup directories"

echo ""
echo "🔍 Analysis completed. Review above before any deletion!"
