"use strict";
/**
 * LOGGER UTILITY - Simple logging utility for the trading bot
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor(prefix = 'TradingBot') {
        this.prefix = prefix;
    }
    info(message) {
        console.log(`[${new Date().toISOString()}] [INFO] [${this.prefix}] ${message}`);
    }
    warn(message) {
        console.warn(`[${new Date().toISOString()}] [WARN] [${this.prefix}] ${message}`);
    }
    error(message) {
        console.error(`[${new Date().toISOString()}] [ERROR] [${this.prefix}] ${message}`);
    }
    debug(message) {
        console.debug(`[${new Date().toISOString()}] [DEBUG] [${this.prefix}] ${message}`);
    }
}
exports.Logger = Logger;
