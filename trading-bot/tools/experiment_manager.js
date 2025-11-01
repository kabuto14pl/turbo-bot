"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// ============================================================================
//  experiment_manager.ts - ZARZĄDZANIE EKSPERYMENTAMI OPTYMALIZACJI
//  Ten moduł implementuje system zarządzania i porównywania eksperymentów
//  optymalizacji strategii. Przechowuje historię optymalizacji, najlepsze
//  parametry i umożliwia porównanie różnych zestawów parametrów.
// ============================================================================
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
exports.ExperimentManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ExperimentManager {
    constructor(dbPath) {
        this.experiments = [];
        this.dbPath = dbPath || path.join('results', 'experiments', 'experiments_db.json');
        this.loadExperiments();
    }
    loadExperiments() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const data = fs.readFileSync(this.dbPath, 'utf8');
                this.experiments = JSON.parse(data);
                console.log(`Załadowano ${this.experiments.length} eksperymentów z bazy danych.`);
            }
            else {
                // Upewnij się, że katalog istnieje
                const dir = path.dirname(this.dbPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                this.experiments = [];
                fs.writeFileSync(this.dbPath, JSON.stringify(this.experiments, null, 2));
                console.log(`Utworzono nową bazę danych eksperymentów: ${this.dbPath}`);
            }
        }
        catch (error) {
            console.error(`Błąd podczas ładowania eksperymentów:`, error);
            this.experiments = [];
        }
    }
    saveExperiment(experiment) {
        // Sprawdź, czy eksperyment o takim ID już istnieje
        const existingIndex = this.experiments.findIndex(e => e.id === experiment.id);
        if (existingIndex >= 0) {
            // Aktualizuj istniejący
            this.experiments[existingIndex] = experiment;
        }
        else {
            // Dodaj nowy
            this.experiments.push(experiment);
        }
        // Zapisz do pliku
        try {
            const dir = path.dirname(this.dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.dbPath, JSON.stringify(this.experiments, null, 2));
            console.log(`Zapisano eksperyment ${experiment.id} do bazy danych.`);
        }
        catch (error) {
            console.error(`Błąd podczas zapisywania eksperymentu:`, error);
        }
    }
    getExperiments() {
        return [...this.experiments];
    }
    getExperimentById(id) {
        return this.experiments.find(e => e.id === id);
    }
    findBestExperiments(strategy, metric = 'sharpeRatio', limit = 10) {
        return this.experiments
            .filter(e => e.strategy === strategy)
            .sort((a, b) => b.metrics[metric] - a.metrics[metric])
            .slice(0, limit);
    }
    compareExperiments(experimentIds) {
        const experiments = experimentIds
            .map(id => this.getExperimentById(id))
            .filter(e => e !== undefined);
        if (experiments.length === 0) {
            console.warn('Nie znaleziono eksperymentów do porównania.');
            return [];
        }
        // Porównaj metryki
        const comparisonResults = experiments.map(exp => ({
            id: exp.id,
            strategy: exp.strategy,
            params: exp.bestParams,
            metrics: exp.metrics
        }));
        return comparisonResults;
    }
    generateComparisonReport(experimentIds, outputDir) {
        const comparison = this.compareExperiments(experimentIds);
        if (comparison.length === 0) {
            console.warn('Brak danych do wygenerowania raportu porównawczego.');
            return;
        }
        // Upewnij się, że katalog istnieje
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        // Zapisz porównanie jako JSON
        const reportFile = path.join(outputDir, `experiment_comparison_${Date.now()}.json`);
        fs.writeFileSync(reportFile, JSON.stringify(comparison, null, 2));
        console.log(`Raport porównawczy zapisany w: ${reportFile}`);
        // W pełnej implementacji, tutaj moglibyśmy generować wykresy porównawcze
        // za pomocą biblioteki do wizualizacji
        return reportFile;
    }
    // Dodatkowa funkcja do analizy stabilności parametrów
    analyzeParameterStability(strategy) {
        const experiments = this.experiments
            .filter(e => e.strategy === strategy)
            .sort((a, b) => a.startTime - b.startTime);
        if (experiments.length < 2) {
            console.warn(`Za mało eksperymentów dla strategii ${strategy} do analizy stabilności.`);
            return null;
        }
        // Zbierz wszystkie unikalne nazwy parametrów
        const allParamNames = new Set();
        experiments.forEach(exp => {
            Object.keys(exp.bestParams).forEach(paramName => {
                allParamNames.add(paramName);
            });
        });
        // Analiza stabilności każdego parametru
        const stabilityAnalysis = {};
        allParamNames.forEach(paramName => {
            const values = experiments
                .map(exp => exp.bestParams[paramName])
                .filter(val => val !== undefined);
            if (values.length < 2)
                return;
            // Oblicz podstawowe statystyki
            const min = Math.min(...values);
            const max = Math.max(...values);
            const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
            // Oblicz odchylenie standardowe
            const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
            const stdDev = Math.sqrt(variance);
            // Współczynnik zmienności (CV) - miara relatywnej zmienności
            const cv = stdDev / avg;
            stabilityAnalysis[paramName] = {
                values,
                min,
                max,
                avg,
                stdDev,
                cv,
                stability: cv < 0.1 ? 'Wysoka' : cv < 0.25 ? 'Średnia' : 'Niska'
            };
        });
        return stabilityAnalysis;
    }
}
exports.ExperimentManager = ExperimentManager;
