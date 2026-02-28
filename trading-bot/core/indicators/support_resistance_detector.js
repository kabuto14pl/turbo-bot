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
exports.SupportResistanceDetector = void 0;
const fs = __importStar(require("fs"));
class SupportResistanceDetector {
    /**
     * Rolling detekcja pivot high/low (swingów) jako wsparcia/opory
     * window - liczba świec do przodu i do tyłu do potwierdzenia pivotu
     */
    static detectLevelsRolling(candles, window = 5) {
        const levels = [];
        for (let i = window; i < candles.length - window; i++) {
            const pivotHigh = candles.slice(i - window, i + window + 1).every((c, idx, arr) => {
                if (idx === window)
                    return true;
                return c.high < arr[window].high;
            });
            if (pivotHigh) {
                levels.push({
                    timestamp: candles[i].time,
                    price: candles[i].high,
                    type: 'resistance',
                    strength: 1 // można rozbudować o liczbę testów
                });
            }
            const pivotLow = candles.slice(i - window, i + window + 1).every((c, idx, arr) => {
                if (idx === window)
                    return true;
                return c.low > arr[window].low;
            });
            if (pivotLow) {
                levels.push({
                    timestamp: candles[i].time,
                    price: candles[i].low,
                    type: 'support',
                    strength: 1
                });
            }
        }
        return levels;
    }
    /**
     * Eksportuje rolling poziomy wsparcia/oporu do CSV
     */
    static exportLevelsToCSV(levels, outputPath) {
        const header = 'timestamp,price,type,strength';
        const lines = [header];
        for (const l of levels) {
            lines.push(`${l.timestamp},${l.price},${l.type},${l.strength}`);
        }
        fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
    }
    /**
     * Pobiera najbliższy poziom wsparcia/oporu dla danej świecy
     * direction: 'support' (szukaj poniżej ceny) lub 'resistance' (szukaj powyżej ceny)
     */
    static getNearestLevel(levels, price, direction) {
        const filtered = levels.filter(l => l.type === direction && (direction === 'support' ? l.price <= price : l.price >= price));
        if (filtered.length === 0)
            return null;
        if (direction === 'support') {
            return filtered.reduce((a, b) => (a.price > b.price ? a : b));
        }
        else {
            return filtered.reduce((a, b) => (a.price < b.price ? a : b));
        }
    }
}
exports.SupportResistanceDetector = SupportResistanceDetector;
