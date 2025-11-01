/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// ============================================================================
//  experiment_integration.ts - INTEGRACJA SYSTEMU ŚLEDZENIA EKSPERYMENTÓW
//  Ten plik integruje nasz tracker eksperymentów z procesem optymalizacji
// ============================================================================

import { experimentTracker } from './experiment_tracker';
import { OptimizationProfile } from './optimization_profiles';
import { OptimizationMetric } from '../analytics/professional_optimizer';

/**
 * Interfejs przekaźnika eksperymentu, który integruje
 * tracker eksperymentów z procesem optymalizacji
 */
export interface ExperimentRelay {
    /**
     * Rozpoczyna nowy eksperyment
     */
    startExperiment(): void;
    
    /**
     * Zapisuje dane o iteracji
     */
    logIteration(iteration: number, params: any, metrics: any): void;
    
    /**
     * Kończy eksperyment sukcesem
     */
    completeExperiment(results: {
        metrics: Record<string, number>;
        bestParams: Record<string, any>;
    }): void;
    
    /**
     * Kończy eksperyment niepowodzeniem
     */
    failExperiment(error: string): void;
}

/**
 * Przekaźnik eksperymentu, który nie wykonuje żadnych akcji
 * Używany gdy śledzenie eksperymentów jest wyłączone
 */
export class NullExperimentRelay implements ExperimentRelay {
    startExperiment() {}
    logIteration() {}
    completeExperiment() {}
    failExperiment() {}
}

/**
 * Główny przekaźnik eksperymentu, który integruje
 * tracker eksperymentów z procesem optymalizacji
 */
export class TrackedExperimentRelay implements ExperimentRelay {
    private experimentId: string | null = null;
    
    constructor(
        private experimentName: string,
        private strategyName: string,
        private profile: OptimizationProfile,
        private description?: string,
        private tags?: string[]
    ) {}
    
    /**
     * Rozpoczyna nowy eksperyment
     */
    startExperiment(): void {
        this.experimentId = experimentTracker.createExperiment({
            name: this.experimentName,
            strategyName: this.strategyName,
            description: this.description,
            profile: this.profile,
            tags: this.tags
        });
        
        console.log(`[Experiment] Rozpoczęto eksperyment: ${this.experimentId}`);
    }
    
    /**
     * Zapisuje dane o iteracji
     */
    logIteration(iteration: number, params: any, metrics: any): void {
        if (!this.experimentId) {
            throw new Error('Eksperyment nie został rozpoczęty');
        }
        
        experimentTracker.logIteration(this.experimentId, iteration, params, metrics);
    }
    
    /**
     * Kończy eksperyment sukcesem
     */
    completeExperiment(results: {
        metrics: Record<string, number>;
        bestParams: Record<string, any>;
    }): void {
        if (!this.experimentId) {
            throw new Error('Eksperyment nie został rozpoczęty');
        }
        
        experimentTracker.completeExperiment(this.experimentId, results);
        console.log(`[Experiment] Zakończono eksperyment: ${this.experimentId}`);
        
        // Generuj i wyświetl raport
        const reportPath = experimentTracker.generateExperimentReport(this.experimentId);
        console.log(`[Experiment] Raport dostępny pod adresem: ${reportPath}`);
    }
    
    /**
     * Kończy eksperyment niepowodzeniem
     */
    failExperiment(error: string): void {
        if (!this.experimentId) {
            throw new Error('Eksperyment nie został rozpoczęty');
        }
        
        experimentTracker.failExperiment(this.experimentId, error);
        console.log(`[Experiment] Eksperyment zakończony niepowodzeniem: ${this.experimentId}`);
        console.log(`[Experiment] Błąd: ${error}`);
    }
}

/**
 * Fabryka przekaźników eksperymentów
 */
export class ExperimentRelayFactory {
    /**
     * Tworzy przekaźnik eksperymentu
     */
    static createExperimentRelay(
        params: {
            trackExperiments: boolean;
            experimentName: string;
            strategyName: string;
            profile: OptimizationProfile;
            description?: string;
            tags?: string[];
        }
    ): ExperimentRelay {
        if (!params.trackExperiments) {
            return new NullExperimentRelay();
        }
        
        return new TrackedExperimentRelay(
            params.experimentName,
            params.strategyName,
            params.profile,
            params.description,
            params.tags
        );
    }
}
