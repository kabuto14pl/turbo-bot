/**
 * PM2 ECOSYSTEM CONFIGURATION - PATCH #43: GPU-ONLY Architecture
 *
 * Dashboard URL: http://64.226.70.149:8080/
 * Bot Health API: http://64.226.70.149:3001/
 *
 * GPU: RTX 5070 Ti on local PC via SSH tunnel (VPS:4001 -> Local:4000)
 *
 * Start all:    pm2 start ecosystem.config.js
 * Restart all:  pm2 restart all
 * Logs:         pm2 logs turbo-bot --lines 50
 * Monitor:      pm2 monit
 */

// P#204e: Per-pair PM2 instances — each pair runs independently (Board5: Viktor Novak)
const PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];
const BASE_ENV = {
  NODE_ENV: 'production',
  MODE: 'simulation',
  // PATCH #43: GPU-ONLY - Remote GPU via SSH tunnel
  GPU_REMOTE_URL: 'http://127.0.0.1:4001',
  GPU_TIMEOUT_MS: '3000',
};

const botApps = PAIRS.map(pair => ({
  name: `turbo-${pair.replace('USDT', '').toLowerCase()}`,
  script: 'node',
  args: 'trading-bot/src/modules/bot.js',
  cwd: '/root/turbo-bot',
  instances: 1,
  exec_mode: 'fork',
  autorestart: true,
  watch: false,
  max_memory_restart: '512M',
  env: {
    ...BASE_ENV,
    TRADING_SYMBOL: pair,
    INSTANCE_ID: pair,
  },
  error_file: `/root/turbo-bot/logs/${pair}-error.log`,
  out_file: `/root/turbo-bot/logs/${pair}-out.log`,
  log_date_format: 'YYYY-MM-DD HH:mm:ss',
  merge_logs: true,
  kill_timeout: 10000,
  restart_delay: 3000,
}));

module.exports = {
  apps: [...botApps, {
    name: 'dashboard',
    script: 'node',
    args: 'dashboard-server.js',
    cwd: '/root/turbo-bot',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',
    env: {
      DASHBOARD_PORT: 8080
    },
    error_file: '/root/turbo-bot/logs/dashboard-error.log',
    out_file: '/root/turbo-bot/logs/dashboard-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true
  }]
};
