/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
import * as fs from 'fs';
import * as path from 'path';

export class Logger {
    private readonly fileStream: fs.WriteStream | null = null;

    constructor(logFile?: string) {
        if (logFile) {
            const logDir = path.dirname(logFile);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            this.fileStream = fs.createWriteStream(logFile, { flags: 'a' });
        }
    }

    info(message: string, data?: any): void {
        const msg = `[INFO] ${new Date().toISOString()}: ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
        console.log(msg);
        this.fileStream?.write(msg + '\n');
    }

    success(message: string, data?: any): void {
        const msg = `[SUCCESS] ${new Date().toISOString()}: ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
        console.log(`\x1b[32m${msg}\x1b[0m`); // Green color
        this.fileStream?.write(msg + '\n');
    }

    warn(message: string, data?: any): void {
        const msg = `[WARN] ${new Date().toISOString()}: ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
        console.warn(msg);
        this.fileStream?.write(msg + '\n');
    }

    error(message: string, error?: any): void {
        const msg = `[ERROR] ${new Date().toISOString()}: ${message}${error ? ' ' + JSON.stringify(error) : ''}`;
        console.error(msg);
        this.fileStream?.write(msg + '\n');
    }

    debug(message: string, data?: any): void {
        const msg = `[DEBUG] ${new Date().toISOString()}: ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
        console.debug(msg);
        this.fileStream?.write(msg + '\n');
    }

    close(): void {
        if (this.fileStream) {
            this.fileStream.end();
        }
    }
} 