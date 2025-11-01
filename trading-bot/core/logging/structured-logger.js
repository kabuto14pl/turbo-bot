"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 📝 STRUCTURED LOGGER
 *
 * Production-grade structured logging system for trading bot
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = exports.StructuredLogger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "debug";
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
    LogLevel["FATAL"] = "fatal";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class StructuredLogger {
    constructor(config = {}) {
        this.config = {
            level: LogLevel.INFO,
            service: 'trading-bot',
            enableConsole: true,
            enableFile: true,
            enableElastic: false,
            maxFileSize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            ...config
        };
        this.ensureLogDirectory();
        this.initializeLogFile();
    }
    ensureLogDirectory() {
        const logDir = path.dirname(this.config.outputFile || './logs/app.log');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }
    initializeLogFile() {
        if (this.config.enableFile) {
            const timestamp = new Date().toISOString().split('T')[0];
            this.currentLogFile = this.config.outputFile || `./logs/trading-bot-${timestamp}.log`;
        }
    }
    shouldLog(level) {
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
        const currentIndex = levels.indexOf(this.config.level);
        const messageIndex = levels.indexOf(level);
        return messageIndex >= currentIndex;
    }
    formatLogEntry(entry) {
        return JSON.stringify(entry) + '\n';
    }
    async writeToFile(logEntry) {
        if (!this.config.enableFile || !this.currentLogFile)
            return;
        try {
            const logLine = this.formatLogEntry(logEntry);
            // Check file size and rotate if necessary
            if (fs.existsSync(this.currentLogFile)) {
                const stats = fs.statSync(this.currentLogFile);
                if (stats.size > this.config.maxFileSize) {
                    await this.rotateLogFile();
                }
            }
            fs.appendFileSync(this.currentLogFile, logLine);
        }
        catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    async rotateLogFile() {
        if (!this.currentLogFile)
            return;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = this.currentLogFile.replace('.log', `-${timestamp}.log`);
        try {
            fs.renameSync(this.currentLogFile, rotatedFile);
            this.cleanupOldLogs();
        }
        catch (error) {
            console.error('Failed to rotate log file:', error);
        }
    }
    cleanupOldLogs() {
        const logDir = path.dirname(this.currentLogFile || './logs');
        const files = fs.readdirSync(logDir)
            .filter(file => file.startsWith('trading-bot-') && file.endsWith('.log'))
            .map(file => ({
            name: file,
            path: path.join(logDir, file),
            time: fs.statSync(path.join(logDir, file)).mtime
        }))
            .sort((a, b) => b.time.getTime() - a.time.getTime());
        // Keep only the latest files
        const filesToDelete = files.slice(this.config.maxFiles);
        filesToDelete.forEach(file => {
            try {
                fs.unlinkSync(file.path);
            }
            catch (error) {
                console.error(`Failed to delete old log file ${file.name}:`, error);
            }
        });
    }
    log(level, message, metadata, traceId, userId) {
        if (!this.shouldLog(level))
            return;
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            service: this.config.service,
            traceId,
            userId,
            metadata
        };
        // Console output
        if (this.config.enableConsole) {
            this.logToConsole(logEntry);
        }
        // File output
        if (this.config.enableFile) {
            this.writeToFile(logEntry);
        }
        // Elasticsearch output (placeholder)
        if (this.config.enableElastic) {
            this.sendToElastic(logEntry);
        }
    }
    logToConsole(entry) {
        const colorCodes = {
            [LogLevel.DEBUG]: '\x1b[36m', // Cyan
            [LogLevel.INFO]: '\x1b[32m', // Green
            [LogLevel.WARN]: '\x1b[33m', // Yellow
            [LogLevel.ERROR]: '\x1b[31m', // Red
            [LogLevel.FATAL]: '\x1b[35m' // Magenta
        };
        const resetCode = '\x1b[0m';
        const color = colorCodes[entry.level] || '';
        const timestamp = entry.timestamp.substring(11, 19); // HH:MM:SS
        const levelPadded = entry.level.toUpperCase().padEnd(5);
        let output = `${color}[${timestamp}] ${levelPadded}${resetCode} ${entry.message}`;
        if (entry.traceId) {
            output += ` [trace:${entry.traceId}]`;
        }
        if (entry.metadata && Object.keys(entry.metadata).length > 0) {
            output += ` ${JSON.stringify(entry.metadata)}`;
        }
        console.log(output);
    }
    async sendToElastic(entry) {
        // In production, integrate with Elasticsearch
        // This is a placeholder for actual Elasticsearch integration
    }
    // Public logging methods
    debug(message, metadata, traceId, userId) {
        this.log(LogLevel.DEBUG, message, metadata, traceId, userId);
    }
    info(message, metadata, traceId, userId) {
        this.log(LogLevel.INFO, message, metadata, traceId, userId);
    }
    warn(message, metadata, traceId, userId) {
        this.log(LogLevel.WARN, message, metadata, traceId, userId);
    }
    error(message, metadata, traceId, userId) {
        this.log(LogLevel.ERROR, message, metadata, traceId, userId);
    }
    fatal(message, metadata, traceId, userId) {
        this.log(LogLevel.FATAL, message, metadata, traceId, userId);
    }
    // Trading-specific logging methods
    logTrade(action, symbol, quantity, price, metadata) {
        this.info(`Trade ${action}: ${symbol}`, {
            action,
            symbol,
            quantity,
            price,
            ...metadata
        });
    }
    logError(error, context, metadata) {
        this.error(`${context || 'Error'}: ${error.message}`, {
            error: error.name,
            stack: error.stack,
            ...metadata
        });
    }
    logPerformance(operation, durationMs, metadata) {
        this.info(`Performance: ${operation} completed in ${durationMs}ms`, {
            operation,
            duration: durationMs,
            ...metadata
        });
    }
    // Utility methods
    createTraceId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    setLogLevel(level) {
        this.config.level = level;
    }
    getLogLevel() {
        return this.config.level;
    }
}
exports.StructuredLogger = StructuredLogger;
// Global logger instance
const logger = new StructuredLogger({
    service: 'trading-bot',
    level: LogLevel.INFO,
    enableConsole: true,
    enableFile: true,
    outputFile: './logs/trading-bot.log'
});
exports.logger = logger;
