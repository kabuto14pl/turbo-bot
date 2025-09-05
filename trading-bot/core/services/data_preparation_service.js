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
exports.DataPreparationService = exports.DiagnosticsReporter = exports.MultiTimeframeSynchronizer = exports.TimeframeAggregator = exports.GapFiller = exports.OutlierDetector = exports.DataValidator = exports.DataLoader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const market_regime_detector_1 = require("../indicators/market_regime_detector");
// --- Moduły funkcjonalne (bazowe klasy) ---
class DataLoader {
    constructor(config) {
        this.config = config;
    }
    loadCandles(symbol, timeframe) {
        if (this.config.type === 'csv' && this.config.path) {
            const filePath = path.join(this.config.path, `${symbol}_${timeframe}.csv`);
            if (!fs.existsSync(filePath))
                throw new Error(`Brak pliku: ${filePath}`);
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
            // Zakładamy nagłówek: Unix,open,high,low,close,volume
            const candles = [];
            for (let i = 1; i < lines.length; ++i) {
                const [unixSeconds, open, high, low, close, volume] = lines[i].split(',');
                candles.push({
                    time: Number(unixSeconds) * 1000, // Konwertuj Unix (sekundy) na time (milisekundy)
                    open: Number(open),
                    high: Number(high),
                    low: Number(low),
                    close: Number(close),
                    volume: Number(volume),
                });
            }
            return candles;
        }
        // TODO: obsługa API/DB
        throw new Error('Nieobsługiwany typ źródła danych lub brak ścieżki');
    }
}
exports.DataLoader = DataLoader;
class DataValidator {
    validate(candles) {
        const errors = [];
        if (candles.length === 0)
            return { valid: false, errors: ['Brak świec'] };
        // Sprawdzenie ciągłości timestampów (zakładamy stały krok)
        const step = candles.length > 1 ? candles[1].time - candles[0].time : 0;
        for (let i = 1; i < candles.length; ++i) {
            if (candles[i].time <= candles[i - 1].time)
                errors.push(`Duplikat lub nieciągłość timestamp: ${candles[i].time}`);
            if (step > 0 && candles[i].time - candles[i - 1].time !== step)
                errors.push(`Brak świecy lub nieregularny krok: ${candles[i].time}`);
            for (const key of ['open', 'high', 'low', 'close', 'volume']) {
                if (typeof candles[i][key] !== 'number' || isNaN(candles[i][key]))
                    errors.push(`Nieprawidłowe pole ${key} w świecy ${i}`);
            }
        }
        return { valid: errors.length === 0, errors };
    }
}
exports.DataValidator = DataValidator;
class OutlierDetector {
    constructor(config = {}) {
        this.config = {
            zScoreThreshold: 3.0,
            iqrMultiplier: 1.5,
            madThreshold: 3.0,
            enableZScore: true,
            enableIQR: true,
            enableMAD: false,
            ...config
        };
    }
    /**
     * Detect outliers using Z-Score method
     */
    detectZScoreOutliers(data, threshold = this.config.zScoreThreshold) {
        if (data.length < 3) {
            return { outliers: [], cleanData: [...data], method: 'zscore', threshold, outliersCount: 0 };
        }
        const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
        const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
        const stdDev = Math.sqrt(variance);
        if (stdDev === 0) {
            return { outliers: [], cleanData: [...data], method: 'zscore', threshold, outliersCount: 0 };
        }
        const outliers = [];
        const cleanData = [];
        data.forEach((value, index) => {
            const zScore = Math.abs((value - mean) / stdDev);
            if (zScore > threshold) {
                outliers.push(index);
            }
            else {
                cleanData.push(value);
            }
        });
        return { outliers, cleanData, method: 'zscore', threshold, outliersCount: outliers.length };
    }
    /**
     * Detect outliers using Interquartile Range (IQR) method
     */
    detectIQROutliers(data, multiplier = this.config.iqrMultiplier) {
        if (data.length < 4) {
            return { outliers: [], cleanData: [...data], method: 'iqr', threshold: multiplier, outliersCount: 0 };
        }
        const sorted = [...data].sort((a, b) => a - b);
        const q1Index = Math.floor(sorted.length * 0.25);
        const q3Index = Math.floor(sorted.length * 0.75);
        const q1 = sorted[q1Index];
        const q3 = sorted[q3Index];
        const iqr = q3 - q1;
        const lowerBound = q1 - multiplier * iqr;
        const upperBound = q3 + multiplier * iqr;
        const outliers = [];
        const cleanData = [];
        data.forEach((value, index) => {
            if (value < lowerBound || value > upperBound) {
                outliers.push(index);
            }
            else {
                cleanData.push(value);
            }
        });
        return { outliers, cleanData, method: 'iqr', threshold: multiplier, outliersCount: outliers.length };
    }
    /**
     * Detect outliers using Median Absolute Deviation (MAD) method
     */
    detectMADOutliers(data, threshold = this.config.madThreshold) {
        if (data.length < 3) {
            return { outliers: [], cleanData: [...data], method: 'mad', threshold, outliersCount: 0 };
        }
        const sorted = [...data].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const deviations = data.map(value => Math.abs(value - median));
        const madValue = deviations.sort((a, b) => a - b)[Math.floor(deviations.length / 2)];
        if (madValue === 0) {
            return { outliers: [], cleanData: [...data], method: 'mad', threshold, outliersCount: 0 };
        }
        const outliers = [];
        const cleanData = [];
        data.forEach((value, index) => {
            const modifiedZScore = 0.6745 * Math.abs(value - median) / madValue;
            if (modifiedZScore > threshold) {
                outliers.push(index);
            }
            else {
                cleanData.push(value);
            }
        });
        return { outliers, cleanData, method: 'mad', threshold, outliersCount: outliers.length };
    }
    /**
     * Filter candles by removing price/volume outliers
     */
    filterCandles(candles, method = 'zscore') {
        if (candles.length < 4) {
            return { filteredCandles: [...candles], outlierIndices: [], summary: 'Insufficient data for outlier detection' };
        }
        // Extract price and volume data
        const prices = candles.map(c => c.close);
        const volumes = candles.map(c => c.volume);
        // Detect outliers in prices
        let priceOutliers;
        switch (method) {
            case 'iqr':
                priceOutliers = this.detectIQROutliers(prices);
                break;
            case 'mad':
                priceOutliers = this.detectMADOutliers(prices);
                break;
            default:
                priceOutliers = this.detectZScoreOutliers(prices);
        }
        // Detect outliers in volumes
        let volumeOutliers;
        switch (method) {
            case 'iqr':
                volumeOutliers = this.detectIQROutliers(volumes);
                break;
            case 'mad':
                volumeOutliers = this.detectMADOutliers(volumes);
                break;
            default:
                volumeOutliers = this.detectZScoreOutliers(volumes);
        }
        // Combine outlier indices
        const allOutliers = new Set([...priceOutliers.outliers, ...volumeOutliers.outliers]);
        const outlierIndices = Array.from(allOutliers).sort((a, b) => a - b);
        // Filter candles
        const filteredCandles = candles.filter((_, index) => !allOutliers.has(index));
        const summary = `Outlier detection (${method}): ${outlierIndices.length} outliers removed. Price outliers: ${priceOutliers.outliersCount}, Volume outliers: ${volumeOutliers.outliersCount}`;
        return { filteredCandles, outlierIndices, summary };
    }
    /**
     * Comprehensive outlier analysis
     */
    analyzeOutliers(candles) {
        const zscore = this.filterCandles(candles, 'zscore');
        const iqr = this.filterCandles(candles, 'iqr');
        const mad = this.filterCandles(candles, 'mad');
        // Determine best method based on outlier counts
        const methods = [
            { name: 'zscore', count: zscore.outlierIndices.length },
            { name: 'iqr', count: iqr.outlierIndices.length },
            { name: 'mad', count: mad.outlierIndices.length }
        ];
        const bestMethod = methods.sort((a, b) => a.count - b.count)[0];
        const recommendation = `Recommended method: ${bestMethod.name} (${bestMethod.count} outliers detected)`;
        return { zscore, iqr, mad, recommendation };
    }
}
exports.OutlierDetector = OutlierDetector;
class GapFiller {
    fillGaps(candles, method = 'forward') {
        if (candles.length < 2 || method === 'none')
            return candles;
        const step = candles[1].time - candles[0].time;
        const filled = [candles[0]];
        for (let i = 1; i < candles.length; ++i) {
            let expected = filled[filled.length - 1].time + step;
            while (candles[i].time > expected) {
                // Forward fill brakującej świecy
                const prev = filled[filled.length - 1];
                filled.push({ ...prev, time: expected });
                expected += step;
            }
            filled.push(candles[i]);
        }
        return filled;
    }
}
exports.GapFiller = GapFiller;
class TimeframeAggregator {
    aggregate(candles, targetTf) {
        // Przykład: targetTf = 'h1' => 4x15m = 1h (jeśli wejście to 15m)
        const tfMap = { 'm15': 15, 'h1': 60, 'h4': 240, 'd1': 1440 };
        const baseStep = candles.length > 1 ? (candles[1].time - candles[0].time) / 60000 : 15; // minuty
        const targetStep = tfMap[targetTf] || 60;
        const groupSize = Math.round(targetStep / baseStep);
        if (groupSize <= 1)
            return candles;
        const result = [];
        for (let i = 0; i < candles.length; i += groupSize) {
            const group = candles.slice(i, i + groupSize);
            if (group.length === 0)
                continue;
            result.push({
                time: group[group.length - 1].time,
                open: group[0].open,
                high: Math.max(...group.map(c => c.high)),
                low: Math.min(...group.map(c => c.low)),
                close: group[group.length - 1].close,
                volume: group.reduce((s, c) => s + c.volume, 0),
            });
        }
        return result;
    }
}
exports.TimeframeAggregator = TimeframeAggregator;
class MultiTimeframeSynchronizer {
    synchronize(base, ...other) {
        // Synchronizuje świece po timestampach (np. M15, H1, H4, D1)
        return base.map((b, i) => {
            const synced = { base: b };
            other.forEach((arr, idx) => {
                const match = arr.find(c => c.time <= b.time);
                synced[`tf${idx + 1}`] = match || null;
            });
            return synced;
        });
    }
}
exports.MultiTimeframeSynchronizer = MultiTimeframeSynchronizer;
class DiagnosticsReporter {
    report(candles) {
        let missingBars = 0;
        let duplicateTimestamps = 0;
        const anomalies = [];
        if (candles.length < 2)
            return { missingBars: 0, duplicateTimestamps: 0, anomalies };
        const step = candles[1].time - candles[0].time;
        for (let i = 1; i < candles.length; ++i) {
            if (candles[i].time === candles[i - 1].time)
                duplicateTimestamps++;
            if (candles[i].time - candles[i - 1].time !== step)
                missingBars++;
            for (const key of ['open', 'high', 'low', 'close', 'volume']) {
                if (typeof candles[i][key] !== 'number' || isNaN(candles[i][key]))
                    anomalies.push(`Nieprawidłowe pole ${key} w świecy ${i}`);
            }
        }
        return { missingBars, duplicateTimestamps, anomalies };
    }
}
exports.DiagnosticsReporter = DiagnosticsReporter;
// --- Główna klasa serwisu ---
class DataPreparationService {
    constructor(config) {
        this.config = config;
        this.loader = new DataLoader(config);
        this.validator = new DataValidator();
        this.gapFiller = new GapFiller();
        this.aggregator = new TimeframeAggregator();
        this.synchronizer = new MultiTimeframeSynchronizer();
        this.diagnostics = new DiagnosticsReporter();
        this.outlierDetector = new OutlierDetector();
    }
    /**
     * Przygotowuje kompletne dane rynkowe dla podanych symboli i TF.
     */
    prepareMarketData(symbols, timeframes) {
        const result = [];
        for (const symbol of symbols) {
            // 1. Ładowanie
            let candles = this.loader.loadCandles(symbol, timeframes[0]);
            // 2. Walidacja
            const validation = this.validator.validate(candles);
            // 3. Gap filling
            candles = this.gapFiller.fillGaps(candles);
            // 4. Agregacja
            const h1 = this.aggregator.aggregate(candles, 'h1');
            const h4 = this.aggregator.aggregate(candles, 'h4');
            const d1 = this.aggregator.aggregate(candles, 'd1');
            // 5. Diagnostyka
            const diagnostics = this.diagnostics.report(candles);
            // 6. Zwrócenie
            result.push({ symbol, candles, h1, h4, d1, diagnostics });
        }
        return result;
    }
    /**
     * Waliduje i generuje raport diagnostyczny dla świec.
     */
    validateAndDiagnose(candles) {
        const valid = this.validator.validate(candles);
        const report = this.diagnostics.report(candles);
        return { valid: valid.valid, report };
    }
    /**
     * Outlier detection and cleaning methods
     */
    detectOutliers(candles, method = 'zscore') {
        return this.outlierDetector.filterCandles(candles, method);
    }
    analyzeOutliers(candles) {
        return this.outlierDetector.analyzeOutliers(candles);
    }
    cleanDataWithOutlierDetection(candles, method = 'zscore') {
        const result = this.outlierDetector.filterCandles(candles, method);
        return {
            cleanedCandles: result.filteredCandles,
            outlierReport: result.summary,
            originalCount: candles.length,
            cleanedCount: result.filteredCandles.length
        };
    }
    /**
     * Synchronizuje świece z różnych TF (np. do joinedCandles)
     */
    joinTimeframes(market) {
        return this.synchronizer.synchronize(market.candles, market.h1, market.h4, market.d1);
    }
    /**
     * Przygotowuje dane dla jednej świecy (zgodnie z dotychczasowym pipeline)
     */
    prepareCandleData(market, candleIndex, joinedCandles) {
        const ctx = joinedCandles[candleIndex];
        if (!ctx.base) {
            throw new Error(`Brak danych M15 dla indeksu ${candleIndex}`);
        }
        // W tej wersji nie liczymy wskaźników, bo są liczone przez IndicatorProvider w strategiach
        return {
            context: ctx,
            indicators: {}, // lub null, jeśli niepotrzebne
            currentPrice: ctx.base.close,
            timestamp: ctx.base.time
        };
    }
    /**
     * Rolling detekcja reżimów rynku dla serii świec (np. do rolling eksportu, strategii, raportów)
     */
    getRollingMarketRegimes(candles, options = {}) {
        return market_regime_detector_1.MarketRegimeDetector.detectRegimesBatch(candles, options);
    }
    /**
     * Eksportuje rolling reżimy rynku do pliku CSV
     */
    exportRollingMarketRegimesToCSV(regimes, outputPath) {
        market_regime_detector_1.MarketRegimeDetector.exportRollingRegimesToCSV(regimes, outputPath);
    }
}
exports.DataPreparationService = DataPreparationService;
