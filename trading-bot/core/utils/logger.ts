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
export class Logger {
    info(message: string, meta?: any): void {
        console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta) : '');
    }

    warn(message: string, meta?: any): void {
        console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta) : '');
    }

    error(message: string, meta?: any): void {
        console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta) : '');
    }

    debug(message: string, meta?: any): void {
        console.debug(`[DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
    }
}

/**
 * Create a file logger (simplified implementation)
 */
export function createFileLogger(filePath: string): Logger {
    return new Logger(); // For now, just return console logger
}
