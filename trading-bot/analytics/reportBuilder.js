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
exports.buildReport = buildReport;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
const stats_1 = require("./stats");
const charts_1 = require("./charts");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const advanced_metrics_1 = require("./advanced_metrics");
function buildReport(trades, outputDir, analytics, initialCapital = 10000) {
    const curve = (0, stats_1.generateEquityCurve)(trades);
    const stats = (0, stats_1.calculateStats)(trades, analytics);
    fs.mkdirSync(outputDir, { recursive: true });
    (0, charts_1.generateEquityCurveHtml)(curve, path.join(outputDir, 'equity_curve.html'));
    fs.writeFileSync(path.join(outputDir, 'stats.json'), JSON.stringify(stats, null, 2), 'utf-8');
    // Generowanie rozszerzonych metryk, jeśli dostępna historia NAV
    if (analytics && analytics.getNavHistory) {
        const navHistory = analytics.getNavHistory();
        const extendedMetrics = (0, advanced_metrics_1.generateExtendedMetricsReport)(trades, navHistory, initialCapital, outputDir);
        // Dodajemy rozszerzone metryki do zwracanych statystyk
        return {
            ...stats,
            sortinoRatio: extendedMetrics.sortinoRatio,
            calmarRatio: extendedMetrics.calmarRatio,
            ulcerIndex: extendedMetrics.ulcerIndex,
            recoveryFactor: extendedMetrics.recoveryFactor,
            expectancy: extendedMetrics.expectancy
        };
    }
    // Dodaj generowanie kolejnych wykresów/raportów
    return stats;
}
