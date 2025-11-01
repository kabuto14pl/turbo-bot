"use strict";
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
exports.Logger = void 0;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
        const msg = `[INFO] ${new Date().toISOString()}: ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
        console.log(msg);
        this.fileStream?.write(msg + '\n');
    }
    success(message, data) {
        const msg = `[SUCCESS] ${new Date().toISOString()}: ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
        console.log(`\x1b[32m${msg}\x1b[0m`); // Green color
        this.fileStream?.write(msg + '\n');
    }
    warn(message, data) {
        const msg = `[WARN] ${new Date().toISOString()}: ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
        console.warn(msg);
        this.fileStream?.write(msg + '\n');
    }
    error(message, error) {
        const msg = `[ERROR] ${new Date().toISOString()}: ${message}${error ? ' ' + JSON.stringify(error) : ''}`;
        console.error(msg);
        this.fileStream?.write(msg + '\n');
    }
    debug(message, data) {
        const msg = `[DEBUG] ${new Date().toISOString()}: ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
        console.debug(msg);
        this.fileStream?.write(msg + '\n');
    }
    close() {
        if (this.fileStream) {
            this.fileStream.end();
        }
    }
}
exports.Logger = Logger;
