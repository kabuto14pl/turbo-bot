module.exports = {
  apps: [{
    name: 'turbo-bot',
    script: 'npx',
    args: 'ts-node trading-bot/AutonomousTradingBot.ts',
    cwd: '/workspaces/turbo-bot',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      MODE: 'simulation'
    },
    error_file: '/workspaces/turbo-bot/logs/pm2-error.log',
    out_file: '/workspaces/turbo-bot/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    kill_timeout: 10000,  // 10s dla async checkpoint save
    restart_delay: 3000
  }]
};
