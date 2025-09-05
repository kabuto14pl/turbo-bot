// ============================================================================
//  experiment_manager.ts - ZARZĄDZANIE EKSPERYMENTAMI OPTYMALIZACJI
//  Ten moduł implementuje system zarządzania i porównywania eksperymentów
//  optymalizacji strategii. Przechowuje historię optymalizacji, najlepsze
//  parametry i umożliwia porównanie różnych zestawów parametrów.
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

export interface OptimizationExperiment {
    id: string;
    strategy: string;
    startTime: number;
    endTime: number;
    bestParams: any;
    metrics: {
        sharpeRatio: number;
        sortinoRatio: number;
        calmarRatio: number;
        maxDrawdown: number;
        totalPnl: number;
        winRate: number;
        // Inne metryki...
    };
    configuration: {
        initialCapital: number;
        timeframe: string;
        dateRange: {
            start: number;
            end: number;
        };
        // Inne konfiguracje...
    };
}

export class ExperimentManager {
    private experiments: OptimizationExperiment[] = [];
    private dbPath: string;
    
    constructor(dbPath?: string) {
        this.dbPath = dbPath || path.join('results', 'experiments', 'experiments_db.json');
        this.loadExperiments();
    }
    
    private loadExperiments() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const data = fs.readFileSync(this.dbPath, 'utf8');
                this.experiments = JSON.parse(data);
                console.log(`Załadowano ${this.experiments.length} eksperymentów z bazy danych.`);
            } else {
                // Upewnij się, że katalog istnieje
                const dir = path.dirname(this.dbPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                this.experiments = [];
                fs.writeFileSync(this.dbPath, JSON.stringify(this.experiments, null, 2));
                console.log(`Utworzono nową bazę danych eksperymentów: ${this.dbPath}`);
            }
        } catch (error) {
            console.error(`Błąd podczas ładowania eksperymentów:`, error);
            this.experiments = [];
        }
    }
    
    saveExperiment(experiment: OptimizationExperiment) {
        // Sprawdź, czy eksperyment o takim ID już istnieje
        const existingIndex = this.experiments.findIndex(e => e.id === experiment.id);
        
        if (existingIndex >= 0) {
            // Aktualizuj istniejący
            this.experiments[existingIndex] = experiment;
        } else {
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
        } catch (error) {
            console.error(`Błąd podczas zapisywania eksperymentu:`, error);
        }
    }
    
    getExperiments(): OptimizationExperiment[] {
        return [...this.experiments];
    }
    
    getExperimentById(id: string): OptimizationExperiment | undefined {
        return this.experiments.find(e => e.id === id);
    }
    
    findBestExperiments(strategy: string, metric: string = 'sharpeRatio', limit: number = 10) {
        return this.experiments
            .filter(e => e.strategy === strategy)
            .sort((a, b) => (b.metrics as any)[metric] - (a.metrics as any)[metric])
            .slice(0, limit);
    }
    
    compareExperiments(experimentIds: string[]) {
        const experiments = experimentIds
            .map(id => this.getExperimentById(id))
            .filter(e => e !== undefined) as OptimizationExperiment[];
            
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
    
    generateComparisonReport(experimentIds: string[], outputDir: string) {
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
    analyzeParameterStability(strategy: string) {
        const experiments = this.experiments
            .filter(e => e.strategy === strategy)
            .sort((a, b) => a.startTime - b.startTime);
            
        if (experiments.length < 2) {
            console.warn(`Za mało eksperymentów dla strategii ${strategy} do analizy stabilności.`);
            return null;
        }
        
        // Zbierz wszystkie unikalne nazwy parametrów
        const allParamNames = new Set<string>();
        experiments.forEach(exp => {
            Object.keys(exp.bestParams).forEach(paramName => {
                allParamNames.add(paramName);
            });
        });
        
        // Analiza stabilności każdego parametru
        const stabilityAnalysis: Record<string, any> = {};
        
        allParamNames.forEach(paramName => {
            const values = experiments
                .map(exp => exp.bestParams[paramName])
                .filter(val => val !== undefined);
                
            if (values.length < 2) return;
            
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
