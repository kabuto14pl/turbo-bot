"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// ============================================================================
//  optimization_profiles.ts - PROFILE OPTYMALIZACJI
//  Ten moduł definiuje gotowe profile optymalizacji, które można łatwo
//  wykorzystać bez szczegółowej konfiguracji każdego parametru.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROBUSTNESS_PROFILE = exports.FULL_SCALE_PROFILE = exports.STANDARD_PROFILE = exports.FAST_TRACK_PROFILE = void 0;
exports.getProfileByName = getProfileByName;
const professional_optimizer_1 = require("../analytics/professional_optimizer");
/**
 * Szybki profil optymalizacji - do szybkiego testowania i debugowania
 */
exports.FAST_TRACK_PROFILE = {
    name: "fast-track",
    description: "Szybka optymalizacja do testowania i debugowania. Używa mniejszej liczby prób i prostszej walidacji.",
    trials: 20,
    walkForward: false,
    walkForwardPeriods: 0,
    primaryMetric: professional_optimizer_1.OptimizationMetric.SHARPE_RATIO,
    secondaryMetrics: [professional_optimizer_1.OptimizationMetric.PROFIT_FACTOR, professional_optimizer_1.OptimizationMetric.MAX_DRAWDOWN],
    saveIntermediateResults: false,
    enableVisualization: true,
    enableCrossValidation: false,
    enableParameterAnalysis: false,
    dataSubsetSize: 5000,
    timeoutMinutes: 10
};
/**
 * Standardowy profil optymalizacji - dobry balans między dokładnością a czasem
 */
exports.STANDARD_PROFILE = {
    name: "standard",
    description: "Standardowa optymalizacja z dobrym balansem między dokładnością a czasem wykonania.",
    trials: 100,
    walkForward: true,
    walkForwardPeriods: 3,
    primaryMetric: professional_optimizer_1.OptimizationMetric.SHARPE_RATIO,
    secondaryMetrics: [
        professional_optimizer_1.OptimizationMetric.SORTINO_RATIO,
        professional_optimizer_1.OptimizationMetric.PROFIT_FACTOR,
        professional_optimizer_1.OptimizationMetric.MAX_DRAWDOWN
    ],
    saveIntermediateResults: true,
    enableVisualization: true,
    enableCrossValidation: true,
    enableParameterAnalysis: true,
    dataSubsetSize: 10000,
    timeoutMinutes: 60
};
/**
 * Pełny profil optymalizacji - maksymalna dokładność, długi czas wykonania
 */
exports.FULL_SCALE_PROFILE = {
    name: "full-scale",
    description: "Pełna, wyczerpująca optymalizacja z maksymalną dokładnością. Wymaga dużo czasu.",
    trials: 300,
    walkForward: true,
    walkForwardPeriods: 5,
    primaryMetric: professional_optimizer_1.OptimizationMetric.BALANCED_METRIC,
    secondaryMetrics: [
        professional_optimizer_1.OptimizationMetric.SHARPE_RATIO,
        professional_optimizer_1.OptimizationMetric.SORTINO_RATIO,
        professional_optimizer_1.OptimizationMetric.CALMAR_RATIO,
        professional_optimizer_1.OptimizationMetric.ROBUST_METRIC,
        professional_optimizer_1.OptimizationMetric.PROFIT_FACTOR,
        professional_optimizer_1.OptimizationMetric.MAX_DRAWDOWN,
        professional_optimizer_1.OptimizationMetric.RECOVERY_FACTOR
    ],
    saveIntermediateResults: true,
    enableVisualization: true,
    enableCrossValidation: true,
    enableParameterAnalysis: true,
    dataSubsetSize: undefined, // Używa pełnego zestawu danych
    timeoutMinutes: undefined // Bez limitu czasu
};
/**
 * Profil do optymalizacji odporności strategii - skupia się na stabilności
 */
exports.ROBUSTNESS_PROFILE = {
    name: "robustness",
    description: "Optymalizacja skupiona na odporności i stabilności strategii.",
    trials: 150,
    walkForward: true,
    walkForwardPeriods: 5,
    primaryMetric: professional_optimizer_1.OptimizationMetric.ROBUST_METRIC,
    secondaryMetrics: [
        professional_optimizer_1.OptimizationMetric.CALMAR_RATIO,
        professional_optimizer_1.OptimizationMetric.RECOVERY_FACTOR,
        professional_optimizer_1.OptimizationMetric.MAX_DRAWDOWN,
        professional_optimizer_1.OptimizationMetric.SHARPE_RATIO
    ],
    saveIntermediateResults: true,
    enableVisualization: true,
    enableCrossValidation: true,
    enableParameterAnalysis: true,
    dataSubsetSize: undefined,
    timeoutMinutes: 120
};
/**
 * Funkcja pomocnicza do pobierania profilu na podstawie nazwy
 */
function getProfileByName(name) {
    const normalizedName = name.toLowerCase().trim();
    switch (normalizedName) {
        case "fast-track":
        case "fast":
            return exports.FAST_TRACK_PROFILE;
        case "standard":
        case "default":
            return exports.STANDARD_PROFILE;
        case "full-scale":
        case "full":
            return exports.FULL_SCALE_PROFILE;
        case "robustness":
        case "robust":
            return exports.ROBUSTNESS_PROFILE;
        default:
            console.warn(`Nieznany profil: ${name}. Używam profilu standardowego.`);
            return exports.STANDARD_PROFILE;
    }
}
