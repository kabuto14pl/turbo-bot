"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.createFileLogger = createFileLogger;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * Simple logger implementation for compatibility
 */
class Logger {
    info(message, meta) {
        console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta) : '');
    }
    warn(message, meta) {
        console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta) : '');
    }
    error(message, meta) {
        console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta) : '');
    }
    debug(message, meta) {
        console.debug(`[DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
    }
}
exports.Logger = Logger;
/**
 * Create a file logger (simplified implementation)
 */
function createFileLogger(filePath) {
    return new Logger(); // For now, just return console logger
}
