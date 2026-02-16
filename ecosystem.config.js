module.exports = {
  apps: [{
    name: 'turbo-bot',
    script: 'node',
    args: 'trading-bot/src/modules/bot.js',
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
    kill_timeout: 10000,
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
  // NOTE: quantum-scheduler removed  quantum computations run on LOCAL PC with GPU
  // Local PC pushes results via POST to http://64.226.70.149:3001/api/quantum/signal
};
