import * as fs from 'fs';
import * as path from 'path';

export class Logger {
    private fileStream: fs.WriteStream | null = null;

    constructor(logFilePath?: string) {
        if (logFilePath) {
            this.fileStream = fs.createWriteStream(logFilePath, { flags: 'a' });
        }
    }

    logInfo(message: string, data?: any): void {
        const msg = `[INFO] ${new Date().toISOString()}: ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
        console.log(msg);
        this.fileStream?.write(msg + '\n');
    }

    logWarn(message: string, data?: any): void {
        const msg = `[WARN] ${new Date().toISOString()}: ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
        console.warn(msg);
        this.fileStream?.write(msg + '\n');
    }

    logError(message: string, error?: any): void {
        const msg = `[ERROR] ${new Date().toISOString()}: ${message}${error ? ' ' + JSON.stringify(error) : ''}`;
        console.error(msg);
        this.fileStream?.write(msg + '\n');
    }

    close(): void {
        if (this.fileStream) {
            this.fileStream.end();
            this.fileStream = null;
        }
    }
}

// Factory function do tworzenia loggera z plikiem
export function createFileLogger(logFile: string): Logger {
    return new Logger(logFile);
}