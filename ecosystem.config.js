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
};
