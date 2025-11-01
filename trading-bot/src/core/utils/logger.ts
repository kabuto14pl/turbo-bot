/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * LOGGER UTILITY - Simple logging utility for the trading bot
 */

export class Logger {
  private prefix: string;

  constructor(prefix: string = 'TradingBot') {
    this.prefix = prefix;
  }

  info(message: string): void {
    console.log(`[${new Date().toISOString()}] [INFO] [${this.prefix}] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[${new Date().toISOString()}] [WARN] [${this.prefix}] ${message}`);
  }

  error(message: string): void {
    console.error(`[${new Date().toISOString()}] [ERROR] [${this.prefix}] ${message}`);
  }

  debug(message: string): void {
    console.debug(`[${new Date().toISOString()}] [DEBUG] [${this.prefix}] ${message}`);
  }
}
