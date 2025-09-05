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
exports.MarketRegimeDetector = void 0;
const fs = __importStar(require("fs"));
class MarketRegimeDetector {
    constructor(options = {}) {
        this.emaShort = [];
        this.emaLong = [];
        this.adxValues = [];
        this.atrValues = [];
        this.bollingerUpper = [];
        this.bollingerLower = [];
        this.bollingerMiddle = [];
        this.prices = [];
        this.options = {
            emaShortPeriod: options.emaShortPeriod || 50,
            emaLongPeriod: options.emaLongPeriod || 200,
            adxPeriod: options.adxPeriod || 14,
            adxTrendThreshold: options.adxTrendThreshold || 25,
            adxConsolidationThreshold: options.adxConsolidationThreshold || 20,
            atrPeriod: options.atrPeriod || 14,
            volatilityThreshold: options.volatilityThreshold || 0.03, // 3%
            bollingerPeriod: options.bollingerPeriod || 20,
            bollingerStdDev: options.bollingerStdDev || 2,
        };
    }
    update(price, high, low) {
        this.prices.push(price);
        // Zachowaj tylko ostatnie wartości dla obliczeń
        const maxPeriod = Math.max(this.options.emaLongPeriod, this.options.adxPeriod, this.options.atrPeriod, this.options.bollingerPeriod);
        if (this.prices.length > maxPeriod) {
            this.prices = this.prices.slice(-maxPeriod);
        }
        // Oblicz wskaźniki
        this.calculateEMA();
        this.calculateATR(high, low);
        this.calculateBollingerBands();
        // ADX będzie obliczane w detectRegime()
    }
    calculateEMA() {
        if (this.prices.length < this.options.emaShortPeriod)
            return;
        // EMA krótkoterminowa
        if (this.emaShort.length === 0) {
            this.emaShort.push(this.prices[0]);
        }
        else {
            const multiplier = 2 / (this.options.emaShortPeriod + 1);
            const newEMA = (this.prices[this.prices.length - 1] * multiplier) +
                (this.emaShort[this.emaShort.length - 1] * (1 - multiplier));
            this.emaShort.push(newEMA);
        }
        // EMA długoterminowa
        if (this.emaLong.length === 0) {
            this.emaLong.push(this.prices[0]);
        }
        else {
            const multiplier = 2 / (this.options.emaLongPeriod + 1);
            const newEMA = (this.prices[this.prices.length - 1] * multiplier) +
                (this.emaLong[this.emaLong.length - 1] * (1 - multiplier));
            this.emaLong.push(newEMA);
        }
    }
    calculateATR(high, low) {
        if (this.prices.length < 2)
            return;
        const trueRange = Math.max(high - low, Math.abs(high - this.prices[this.prices.length - 2]), Math.abs(low - this.prices[this.prices.length - 2]));
        if (this.atrValues.length === 0) {
            this.atrValues.push(trueRange);
        }
        else {
            const multiplier = 2 / (this.options.atrPeriod + 1);
            const newATR = (trueRange * multiplier) +
                (this.atrValues[this.atrValues.length - 1] * (1 - multiplier));
            this.atrValues.push(newATR);
        }
    }
    calculateBollingerBands() {
        if (this.prices.length < this.options.bollingerPeriod)
            return;
        const period = this.options.bollingerPeriod;
        const stdDev = this.options.bollingerStdDev;
        const recentPrices = this.prices.slice(-period);
        const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
        const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
        const standardDeviation = Math.sqrt(variance);
        this.bollingerMiddle.push(sma);
        this.bollingerUpper.push(sma + (standardDeviation * stdDev));
        this.bollingerLower.push(sma - (standardDeviation * stdDev));
    }
    detectRegime() {
        if (this.prices.length < Math.max(this.options.emaLongPeriod, this.options.adxPeriod)) {
            return {
                regime: 'CONSOLIDATION',
                confidence: 0.5,
                trendStrength: 0,
                volatilityLevel: 0.5,
                supportResistanceLevel: 0.5
            };
        }
        const currentPrice = this.prices[this.prices.length - 1];
        const emaShort = this.emaShort[this.emaShort.length - 1];
        const emaLong = this.emaLong[this.emaLong.length - 1];
        const atr = this.atrValues[this.atrValues.length - 1];
        // Oblicz ADX (uproszczona wersja)
        const adx = this.calculateADX();
        // Oblicz zmienność
        const volatility = this.calculateVolatility();
        // Określ położenie względem Bollinger Bands
        const bbPosition = this.calculateBBPosition(currentPrice);
        // Logika klasyfikacji
        let regime;
        let confidence = 0.5;
        let trendStrength = 0;
        let volatilityLevel = volatility;
        let supportResistanceLevel = bbPosition;
        // Klasyfikacja na podstawie ADX i położenia EMA
        if (adx > this.options.adxTrendThreshold) {
            // Silny trend
            if (currentPrice > emaShort && emaShort > emaLong) {
                regime = 'STRONG_UPTREND';
                trendStrength = Math.min(1, adx / 50);
                confidence = 0.8;
            }
            else if (currentPrice < emaShort && emaShort < emaLong) {
                regime = 'STRONG_DOWNTREND';
                trendStrength = Math.min(1, adx / 50);
                confidence = 0.8;
            }
            else {
                regime = 'WEAK_UPTREND';
                trendStrength = Math.min(0.7, adx / 40);
                confidence = 0.6;
            }
        }
        else if (adx < this.options.adxConsolidationThreshold) {
            // Konsolidacja
            if (volatility > this.options.volatilityThreshold) {
                regime = 'HIGH_VOLATILITY';
                confidence = 0.7;
            }
            else {
                regime = 'CONSOLIDATION';
                confidence = 0.8;
            }
        }
        else {
            // Słaby trend
            if (currentPrice > emaShort) {
                regime = 'WEAK_UPTREND';
                trendStrength = 0.3;
                confidence = 0.6;
            }
            else {
                regime = 'WEAK_DOWNTREND';
                trendStrength = 0.3;
                confidence = 0.6;
            }
        }
        return {
            regime,
            confidence,
            trendStrength,
            volatilityLevel,
            supportResistanceLevel
        };
    }
    calculateADX() {
        if (this.prices.length < this.options.adxPeriod + 1)
            return 20;
        // Uproszczona implementacja ADX
        const period = this.options.adxPeriod;
        const recentPrices = this.prices.slice(-period - 1);
        let plusDM = 0;
        let minusDM = 0;
        let trueRangeSum = 0;
        for (let i = 1; i < recentPrices.length; i++) {
            const highDiff = recentPrices[i] - recentPrices[i - 1];
            const lowDiff = recentPrices[i - 1] - recentPrices[i];
            if (highDiff > lowDiff && highDiff > 0) {
                plusDM += highDiff;
            }
            if (lowDiff > highDiff && lowDiff > 0) {
                minusDM += lowDiff;
            }
            trueRangeSum += Math.abs(recentPrices[i] - recentPrices[i - 1]);
        }
        const plusDI = (plusDM / trueRangeSum) * 100;
        const minusDI = (minusDM / trueRangeSum) * 100;
        const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
        return Math.min(100, dx);
    }
    calculateVolatility() {
        if (this.atrValues.length === 0)
            return 0.5;
        const currentATR = this.atrValues[this.atrValues.length - 1];
        const currentPrice = this.prices[this.prices.length - 1];
        return Math.min(1, (currentATR / currentPrice) / this.options.volatilityThreshold);
    }
    calculateBBPosition(price) {
        if (this.bollingerUpper.length === 0)
            return 0.5;
        const upper = this.bollingerUpper[this.bollingerUpper.length - 1];
        const lower = this.bollingerLower[this.bollingerLower.length - 1];
        const middle = this.bollingerMiddle[this.bollingerMiddle.length - 1];
        if (price >= upper)
            return 1; // Na górnej bandzie
        if (price <= lower)
            return 0; // Na dolnej bandzie
        if (price === middle)
            return 0.5; // Na środkowej linii
        // Normalizuj pozycję między 0 a 1
        return (price - lower) / (upper - lower);
    }
    /**
     * Rolling/batch detekcja reżimów rynku dla serii świec (np. do rolling eksportu, raportów, strategii)
     */
    static detectRegimesBatch(candles, options = {}) {
        const detector = new MarketRegimeDetector(options);
        const result = [];
        for (const c of candles) {
            detector.update(c.close, c.high, c.low);
            const ctx = detector.detectRegime();
            result.push({ timestamp: c.time, context: ctx });
        }
        return result;
    }
    /**
     * Eksportuje rolling reżimy rynku do pliku CSV
     */
    static exportRollingRegimesToCSV(regimes, outputPath) {
        const header = 'timestamp,regime,confidence,trendStrength,volatilityLevel,supportResistanceLevel';
        const lines = [header];
        for (const r of regimes) {
            const c = r.context;
            lines.push(`${r.timestamp},${c.regime},${c.confidence},${c.trendStrength},${c.volatilityLevel},${c.supportResistanceLevel}`);
        }
        fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
    }
    // Metody pomocnicze dla strategii
    isTrending() {
        const context = this.detectRegime();
        return context.regime.includes('TREND');
    }
    isUptrend() {
        const context = this.detectRegime();
        return context.regime.includes('UPTREND');
    }
    isDowntrend() {
        const context = this.detectRegime();
        return context.regime.includes('DOWNTREND');
    }
    isConsolidation() {
        const context = this.detectRegime();
        return context.regime === 'CONSOLIDATION';
    }
    isHighVolatility() {
        const context = this.detectRegime();
        return context.regime === 'HIGH_VOLATILITY';
    }
    getTrendStrength() {
        const context = this.detectRegime();
        return context.trendStrength;
    }
    getVolatilityLevel() {
        const context = this.detectRegime();
        return context.volatilityLevel;
    }
}
exports.MarketRegimeDetector = MarketRegimeDetector;
