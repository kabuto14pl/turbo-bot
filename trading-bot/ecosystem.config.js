module.exports = {
  apps: [
    {
      name: "trading-bot",
      script: "autonomous_trading_bot.ts",
      interpreter: "npx",
      interpreter_args: "ts-node",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "2G",
      env: {
        NODE_ENV: "development"
      },
      env_production: {
        NODE_ENV: "production"
      }
    },
    {
      name: "performance-monitor",
      script: "performance_monitor.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "development"
      }
    }
  ]
};
