"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const fs = require("fs");
const path = require("path");

class Logger {
    constructor(logFile) {
        this.fileStream = null;
        if (logFile) {
            const logDir = path.dirname(logFile);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            this.fileStream = fs.createWriteStream(logFile, { flags: 'a' });
        }
    }
    info(message, data) {
        const msg = '[INFO] ' + new Date().toISOString() + ': ' + message + (data ? ' ' + JSON.stringify(data) : '');
        console.log(msg);
        if (this.fileStream) this.fileStream.write(msg + '\n');
    }
    success(message, data) {
        const msg = '[SUCCESS] ' + new Date().toISOString() + ': ' + message + (data ? ' ' + JSON.stringify(data) : '');
        console.log(msg);
        if (this.fileStream) this.fileStream.write(msg + '\n');
    }
    warn(message, data) {
        const msg = '[WARN] ' + new Date().toISOString() + ': ' + message + (data ? ' ' + JSON.stringify(data) : '');
        console.warn(msg);
        if (this.fileStream) this.fileStream.write(msg + '\n');
    }
    error(message, error) {
        const msg = '[ERROR] ' + new Date().toISOString() + ': ' + message + (error ? ' ' + JSON.stringify(error) : '');
        console.error(msg);
        if (this.fileStream) this.fileStream.write(msg + '\n');
    }
    debug(message, data) {
        const msg = '[DEBUG] ' + new Date().toISOString() + ': ' + message + (data ? ' ' + JSON.stringify(data) : '');
        console.debug(msg);
        if (this.fileStream) this.fileStream.write(msg + '\n');
    }
    close() {
        if (this.fileStream) { this.fileStream.end(); }
    }
}
exports.Logger = Logger;
