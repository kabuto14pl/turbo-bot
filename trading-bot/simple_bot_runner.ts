/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading infrastructure component
 */
/**
 * 🚀 SIMPLE BOT RUNNER WITH PROMETHEUS
 * Quick startup for Grafana dashboard testing
 */

import { AutonomousTradingBot } from './autonomous_trading_bot';

class SimpleBotRunner {
  private bot?: AutonomousTradingBot;

  async start() {
    console.log('🚀 Starting Autonomous Trading Bot for Grafana Dashboard...');
    
    try {
      // Initialize the main bot
      console.log('🤖 Initializing autonomous trading bot...');
      this.bot = new AutonomousTradingBot();
      
      // Start the bot - this will automatically start Prometheus on port 9090
      console.log('⚡ Starting bot with Prometheus metrics...');
      await this.bot.start();
      
      console.log('✅ Bot started successfully!');
      console.log('📊 Prometheus metrics available at: http://localhost:9090/metrics');
      console.log('🔧 Grafana can now connect to bot metrics');
      
      // Keep the process running
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
      
    } catch (error) {
      console.error('❌ Failed to start bot:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down bot...');
    
    if (this.bot) {
      try {
        await this.bot.stop();
        console.log('✅ Bot stopped successfully');
      } catch (error) {
        console.error('❌ Error stopping bot:', error);
      }
    }
    
    process.exit(0);
  }
}

// Start the bot runner
const runner = new SimpleBotRunner();
runner.start().catch(console.error);
