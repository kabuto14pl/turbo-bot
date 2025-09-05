"use strict";
// ============================================================================
//  experiment_integration.ts - INTEGRACJA SYSTEMU ŚLEDZENIA EKSPERYMENTÓW
//  Ten plik integruje nasz tracker eksperymentów z procesem optymalizacji
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperimentRelayFactory = exports.TrackedExperimentRelay = exports.NullExperimentRelay = void 0;
const experiment_tracker_1 = require("./experiment_tracker");
/**
 * Przekaźnik eksperymentu, który nie wykonuje żadnych akcji
 * Używany gdy śledzenie eksperymentów jest wyłączone
 */
class NullExperimentRelay {
    startExperiment() { }
    logIteration() { }
    completeExperiment() { }
    failExperiment() { }
}
exports.NullExperimentRelay = NullExperimentRelay;
/**
 * Główny przekaźnik eksperymentu, który integruje
 * tracker eksperymentów z procesem optymalizacji
 */
class TrackedExperimentRelay {
    constructor(experimentName, strategyName, profile, description, tags) {
        this.experimentName = experimentName;
        this.strategyName = strategyName;
        this.profile = profile;
        this.description = description;
        this.tags = tags;
        this.experimentId = null;
    }
    /**
     * Rozpoczyna nowy eksperyment
     */
    startExperiment() {
        this.experimentId = experiment_tracker_1.experimentTracker.createExperiment({
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
    logIteration(iteration, params, metrics) {
        if (!this.experimentId) {
            throw new Error('Eksperyment nie został rozpoczęty');
        }
        experiment_tracker_1.experimentTracker.logIteration(this.experimentId, iteration, params, metrics);
    }
    /**
     * Kończy eksperyment sukcesem
     */
    completeExperiment(results) {
        if (!this.experimentId) {
            throw new Error('Eksperyment nie został rozpoczęty');
        }
        experiment_tracker_1.experimentTracker.completeExperiment(this.experimentId, results);
        console.log(`[Experiment] Zakończono eksperyment: ${this.experimentId}`);
        // Generuj i wyświetl raport
        const reportPath = experiment_tracker_1.experimentTracker.generateExperimentReport(this.experimentId);
        console.log(`[Experiment] Raport dostępny pod adresem: ${reportPath}`);
    }
    /**
     * Kończy eksperyment niepowodzeniem
     */
    failExperiment(error) {
        if (!this.experimentId) {
            throw new Error('Eksperyment nie został rozpoczęty');
        }
        experiment_tracker_1.experimentTracker.failExperiment(this.experimentId, error);
        console.log(`[Experiment] Eksperyment zakończony niepowodzeniem: ${this.experimentId}`);
        console.log(`[Experiment] Błąd: ${error}`);
    }
}
exports.TrackedExperimentRelay = TrackedExperimentRelay;
/**
 * Fabryka przekaźników eksperymentów
 */
class ExperimentRelayFactory {
    /**
     * Tworzy przekaźnik eksperymentu
     */
    static createExperimentRelay(params) {
        if (!params.trackExperiments) {
            return new NullExperimentRelay();
        }
        return new TrackedExperimentRelay(params.experimentName, params.strategyName, params.profile, params.description, params.tags);
    }
}
exports.ExperimentRelayFactory = ExperimentRelayFactory;
