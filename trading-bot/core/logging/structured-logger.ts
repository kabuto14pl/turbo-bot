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

import * as fs from 'fs';
import * as path from 'path';

enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    FATAL = 'fatal'
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    service: string;
    traceId?: string;
    userId?: string;
    metadata?: Record<string, any>;
}

interface LoggerConfig {
    level: LogLevel;
    service: string;
    outputFile?: string;
    enableConsole: boolean;
    enableFile: boolean;
    enableElastic: boolean;
    maxFileSize: number;
    maxFiles: number;
}

class StructuredLogger {
    private config: LoggerConfig;
    private currentLogFile?: string;

    constructor(config: Partial<LoggerConfig> = {}) {
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

    private ensureLogDirectory(): void {
        const logDir = path.dirname(this.config.outputFile || './logs/app.log');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    private initializeLogFile(): void {
        if (this.config.enableFile) {
            const timestamp = new Date().toISOString().split('T')[0];
            this.currentLogFile = this.config.outputFile || `./logs/trading-bot-${timestamp}.log`;
        }
    }

    private shouldLog(level: LogLevel): boolean {
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
        const currentIndex = levels.indexOf(this.config.level);
        const messageIndex = levels.indexOf(level);
        return messageIndex >= currentIndex;
    }

    private formatLogEntry(entry: LogEntry): string {
        return JSON.stringify(entry) + '\n';
    }

    private async writeToFile(logEntry: LogEntry): Promise<void> {
        if (!this.config.enableFile || !this.currentLogFile) return;

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
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    private async rotateLogFile(): Promise<void> {
        if (!this.currentLogFile) return;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = this.currentLogFile.replace('.log', `-${timestamp}.log`);
        
        try {
            fs.renameSync(this.currentLogFile, rotatedFile);
            this.cleanupOldLogs();
        } catch (error) {
            console.error('Failed to rotate log file:', error);
        }
    }

    private cleanupOldLogs(): void {
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
            } catch (error) {
                console.error(`Failed to delete old log file ${file.name}:`, error);
            }
        });
    }

    private log(level: LogLevel, message: string, metadata?: Record<string, any>, traceId?: string, userId?: string): void {
        if (!this.shouldLog(level)) return;

        const logEntry: LogEntry = {
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

    private logToConsole(entry: LogEntry): void {
        const colorCodes = {
            [LogLevel.DEBUG]: '\x1b[36m', // Cyan
            [LogLevel.INFO]: '\x1b[32m',  // Green
            [LogLevel.WARN]: '\x1b[33m',  // Yellow
            [LogLevel.ERROR]: '\x1b[31m', // Red
            [LogLevel.FATAL]: '\x1b[35m'  // Magenta
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

    private async sendToElastic(entry: LogEntry): Promise<void> {
        // In production, integrate with Elasticsearch
        // This is a placeholder for actual Elasticsearch integration
    }

    // Public logging methods
    debug(message: string, metadata?: Record<string, any>, traceId?: string, userId?: string): void {
        this.log(LogLevel.DEBUG, message, metadata, traceId, userId);
    }

    info(message: string, metadata?: Record<string, any>, traceId?: string, userId?: string): void {
        this.log(LogLevel.INFO, message, metadata, traceId, userId);
    }

    warn(message: string, metadata?: Record<string, any>, traceId?: string, userId?: string): void {
        this.log(LogLevel.WARN, message, metadata, traceId, userId);
    }

    error(message: string, metadata?: Record<string, any>, traceId?: string, userId?: string): void {
        this.log(LogLevel.ERROR, message, metadata, traceId, userId);
    }

    fatal(message: string, metadata?: Record<string, any>, traceId?: string, userId?: string): void {
        this.log(LogLevel.FATAL, message, metadata, traceId, userId);
    }

    // Trading-specific logging methods
    logTrade(action: string, symbol: string, quantity: number, price: number, metadata?: Record<string, any>): void {
        this.info(`Trade ${action}: ${symbol}`, {
            action,
            symbol,
            quantity,
            price,
            ...metadata
        });
    }

    logError(error: Error, context?: string, metadata?: Record<string, any>): void {
        this.error(`${context || 'Error'}: ${error.message}`, {
            error: error.name,
            stack: error.stack,
            ...metadata
        });
    }

    logPerformance(operation: string, durationMs: number, metadata?: Record<string, any>): void {
        this.info(`Performance: ${operation} completed in ${durationMs}ms`, {
            operation,
            duration: durationMs,
            ...metadata
        });
    }

    // Utility methods
    createTraceId(): string {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    setLogLevel(level: LogLevel): void {
        this.config.level = level;
    }

    getLogLevel(): LogLevel {
        return this.config.level;
    }
}

// Global logger instance
const logger = new StructuredLogger({
    service: 'trading-bot',
    level: LogLevel.INFO,
    enableConsole: true,
    enableFile: true,
    outputFile: './logs/trading-bot.log'
});

export { StructuredLogger, LogLevel, LogEntry, LoggerConfig, logger };
