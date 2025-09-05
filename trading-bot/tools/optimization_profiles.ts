// ============================================================================
//  optimization_profiles.ts - PROFILE OPTYMALIZACJI
//  Ten moduł definiuje gotowe profile optymalizacji, które można łatwo
//  wykorzystać bez szczegółowej konfiguracji każdego parametru.
// ============================================================================

import { OptimizationMetric } from '../analytics/professional_optimizer';

/**
 * Interfejs definujący profil optymalizacji
 */
export interface OptimizationProfile {
    name: string;                 // Nazwa profilu
    description: string;          // Opis profilu
    trials: number;               // Liczba iteracji/prób
    walkForward: boolean;         // Czy używać walidacji walk-forward
    walkForwardPeriods: number;   // Liczba okresów walk-forward (jeśli włączone)
    primaryMetric: OptimizationMetric; // Główna metryka do optymalizacji
    secondaryMetrics: OptimizationMetric[]; // Dodatkowe metryki do monitorowania
    saveIntermediateResults: boolean; // Czy zapisywać wyniki pośrednie
    enableVisualization: boolean; // Czy generować wizualizacje
    enableCrossValidation: boolean; // Czy używać walidacji krzyżowej
    enableParameterAnalysis: boolean; // Czy analizować wrażliwość parametrów
    dataSubsetSize?: number;      // Opcjonalne ograniczenie wielkości danych (null = pełne dane)
    timeoutMinutes?: number;      // Opcjonalny timeout w minutach (null = brak limitu)
}

/**
 * Szybki profil optymalizacji - do szybkiego testowania i debugowania
 */
export const FAST_TRACK_PROFILE: OptimizationProfile = {
    name: "fast-track",
    description: "Szybka optymalizacja do testowania i debugowania. Używa mniejszej liczby prób i prostszej walidacji.",
    trials: 20,
    walkForward: false,
    walkForwardPeriods: 0,
    primaryMetric: OptimizationMetric.SHARPE_RATIO,
    secondaryMetrics: [OptimizationMetric.PROFIT_FACTOR, OptimizationMetric.MAX_DRAWDOWN],
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
export const STANDARD_PROFILE: OptimizationProfile = {
    name: "standard",
    description: "Standardowa optymalizacja z dobrym balansem między dokładnością a czasem wykonania.",
    trials: 100,
    walkForward: true,
    walkForwardPeriods: 3,
    primaryMetric: OptimizationMetric.SHARPE_RATIO,
    secondaryMetrics: [
        OptimizationMetric.SORTINO_RATIO,
        OptimizationMetric.PROFIT_FACTOR,
        OptimizationMetric.MAX_DRAWDOWN
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
export const FULL_SCALE_PROFILE: OptimizationProfile = {
    name: "full-scale",
    description: "Pełna, wyczerpująca optymalizacja z maksymalną dokładnością. Wymaga dużo czasu.",
    trials: 300,
    walkForward: true,
    walkForwardPeriods: 5,
    primaryMetric: OptimizationMetric.BALANCED_METRIC,
    secondaryMetrics: [
        OptimizationMetric.SHARPE_RATIO,
        OptimizationMetric.SORTINO_RATIO,
        OptimizationMetric.CALMAR_RATIO,
        OptimizationMetric.ROBUST_METRIC,
        OptimizationMetric.PROFIT_FACTOR,
        OptimizationMetric.MAX_DRAWDOWN,
        OptimizationMetric.RECOVERY_FACTOR
    ],
    saveIntermediateResults: true,
    enableVisualization: true,
    enableCrossValidation: true,
    enableParameterAnalysis: true,
    dataSubsetSize: undefined,  // Używa pełnego zestawu danych
    timeoutMinutes: undefined   // Bez limitu czasu
};

/**
 * Profil do optymalizacji odporności strategii - skupia się na stabilności
 */
export const ROBUSTNESS_PROFILE: OptimizationProfile = {
    name: "robustness",
    description: "Optymalizacja skupiona na odporności i stabilności strategii.",
    trials: 150,
    walkForward: true,
    walkForwardPeriods: 5,
    primaryMetric: OptimizationMetric.ROBUST_METRIC,
    secondaryMetrics: [
        OptimizationMetric.CALMAR_RATIO,
        OptimizationMetric.RECOVERY_FACTOR,
        OptimizationMetric.MAX_DRAWDOWN,
        OptimizationMetric.SHARPE_RATIO
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
export function getProfileByName(name: string): OptimizationProfile {
    const normalizedName = name.toLowerCase().trim();
    
    switch (normalizedName) {
        case "fast-track":
        case "fast":
            return FAST_TRACK_PROFILE;
        
        case "standard":
        case "default":
            return STANDARD_PROFILE;
        
        case "full-scale":
        case "full":
            return FULL_SCALE_PROFILE;
        
        case "robustness":
        case "robust":
            return ROBUSTNESS_PROFILE;
        
        default:
            console.warn(`Nieznany profil: ${name}. Używam profilu standardowego.`);
            return STANDARD_PROFILE;
    }
}
