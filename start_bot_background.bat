@echo off
cd /d %~dp0
set MODE=simulation
set ENABLE_REAL_TRADING=false
set NODE_ENV=production
echo Starting bot in simulation mode...
npm exec ts-node trading-bot/autonomous_trading_bot_final.ts >> logs/bot_persistent_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.log 2>&1
