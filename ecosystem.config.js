<<<<<<< HEAD
module.exports = {
  apps: [{
    name: 'turbo-bot',
    script: 'npx',
    args: 'ts-node trading-bot/autonomous_trading_bot_final.ts',
    cwd: '/root/turbo-bot',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      MODE: 'simulation'
    },
    error_file: '/root/turbo-bot/logs/pm2-error.log',
    out_file: '/root/turbo-bot/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    kill_timeout: 10000,  // 10s dla async checkpoint save
    restart_delay: 3000
  }, {
    name: 'dashboard',
    script: 'node',
    args: 'dashboard-server.js',
    cwd: '/root/turbo-bot',
    instances: 1,
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
=======
/**
 * 🚀 PM2 ECOSYSTEM CONFIGURATION
 * Production-ready configuration for Turbo Bot
 * 
 * ⚠️ UWAGA: Dashboard działa na zewnętrznym VPS
 * Dashboard URL: http://64.226.70.149:8080/
 * Ten plik konfiguruje TYLKO trading bot
 */

module.exports = {
  apps: [
    // ==========================================
    // TRADING BOT - Cluster Mode (High Availability)
    // ==========================================
    {
      name: 'turbo-bot',
      script: 'npx',
      args: 'ts-node trading-bot/autonomous_trading_bot_final.ts',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        MODE: 'simulation',
        ENABLE_ML: 'true',
        ENABLE_REAL_TRADING: 'false'
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      kill_timeout: 5000,
      listen_timeout: 10000,
      watch: false
    }
  ],

  // ==========================================
  // PM2 DEPLOY CONFIGURATION (Optional)
  // ==========================================
  deploy: {
    production: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/master',
      repo: 'git@github.com:kabuto14pl/turbo-bot.git',
      path: '/workspaces/turbo-bot',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
>>>>>>> 778c3ec030ce07789c8d169fffd7d43833ed639b
};
