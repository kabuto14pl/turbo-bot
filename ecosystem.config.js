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

// P#234: Only active pairs — BNB 55% + SOL 45% (BTC/ETH/XRP have no edge)
const PAIRS = ['SOLUSDT', 'BNBUSDT'];
const BASE_ENV = {
  NODE_ENV: 'production',
  MODE: 'simulation',
  // P#229: Starting capital $1,000
  INITIAL_CAPITAL: '1000',
  // PATCH #43: GPU-ONLY - Remote GPU via SSH tunnel
  GPU_REMOTE_URL: 'http://127.0.0.1:4001',
  GPU_TIMEOUT_MS: '3000',
  // PATCH #188: OpenLIT AI Observability (set OPENLIT_ENABLED=true to activate on VPS)
  OPENLIT_ENABLED: process.env.OPENLIT_ENABLED || 'false',
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://127.0.0.1:4318',
  OTEL_DEPLOYMENT_ENVIRONMENT: 'production',
};

// Port offset per pair to avoid EADDRINUSE conflicts
const PAIR_PORTS = { 'SOLUSDT': 3001, 'BNBUSDT': 3002 };

// P#232: Per-pair SL/TP ATR multipliers (matched to Python pair_config.py)
const PAIR_SLTP = {
  'SOLUSDT': { SL_ATR_MULT: '2.0', TP_ATR_MULT: '4.0' },   // P#232: was 1.5/4.0, sweep winner for April 2026 regime
  'BNBUSDT': { SL_ATR_MULT: '1.25', TP_ATR_MULT: '2.75' },  // P#233: was 1.5/4.0 — sweep winner, matches Python base (PnL +$513 vs -$23)
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
    TRADING_SYMBOLS: pair,  // P#235: Single symbol per instance — prevents multi-pair cross-trading
    INSTANCE_ID: pair,
    BOT_STATE_FILE: `/root/turbo-bot/data/bot_state_${pair}.json`,  // P#235: Per-pair state persistence
    HEALTH_CHECK_PORT: String(PAIR_PORTS[pair] || 3001),
    ...(PAIR_SLTP[pair] || {}),
    OTEL_SERVICE_NAME: `turbo-bot-${pair.replace('USDT', '').toLowerCase()}`,
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
