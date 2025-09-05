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
exports.ExperimentResumer = exports.ExperimentStatus = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Status eksperymentu
 */
exports.ExperimentStatus = {
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    INTERRUPTED: 'interrupted',
    PAUSED: 'paused'
};
/**
 * Klasa do zarządzania wznawianiem eksperymentów
 */
class ExperimentResumer {
    constructor(tracker, config = {}) {
        this.activeCheckpoints = new Map();
        this.tracker = tracker;
        this.config = {
            checkpointInterval: config.checkpointInterval || 30, // Co 30 sekund
            maxRetryAttempts: config.maxRetryAttempts || 3,
            autoResumeOnStart: config.autoResumeOnStart || true,
            backupBeforeResume: config.backupBeforeResume || true
        };
        this.checkpointDirectory = path.join(process.cwd(), 'temp', 'checkpoints');
        if (!fs.existsSync(this.checkpointDirectory)) {
            fs.mkdirSync(this.checkpointDirectory, { recursive: true });
        }
    }
    /**
     * Wznawia eksperyment na podstawie ID
     */
    async resumeExperiment(experimentId) {
        console.log(`🔄 Próba wznowienia eksperymentu: ${experimentId}`);
        try {
            // Sprawdź czy eksperyment istnieje
            const experiment = this.tracker.getExperiment(experimentId);
            if (!experiment) {
                return {
                    success: false,
                    resumedFromCheckpoint: false,
                    checkpointTimestamp: 0,
                    resumedIteration: 0,
                    message: `Eksperyment ${experimentId} nie istnieje`,
                    error: 'EXPERIMENT_NOT_FOUND'
                };
            }
            // Sprawdź status eksperymentu
            if (experiment.status === exports.ExperimentStatus.COMPLETED) {
                return {
                    success: false,
                    resumedFromCheckpoint: false,
                    checkpointTimestamp: 0,
                    resumedIteration: 0,
                    message: `Eksperyment ${experimentId} już został ukończony`,
                    error: 'ALREADY_COMPLETED'
                };
            }
            if (experiment.status === exports.ExperimentStatus.RUNNING) {
                return {
                    success: false,
                    resumedFromCheckpoint: false,
                    checkpointTimestamp: 0,
                    resumedIteration: 0,
                    message: `Eksperyment ${experimentId} już jest uruchomiony`,
                    error: 'ALREADY_RUNNING'
                };
            }
            // Znajdź najnowszy checkpoint
            const checkpoint = await this.getLatestCheckpoint(experimentId);
            if (!checkpoint) {
                return {
                    success: false,
                    resumedFromCheckpoint: false,
                    checkpointTimestamp: 0,
                    resumedIteration: 0,
                    message: `Brak checkpointów dla eksperymentu ${experimentId}`,
                    error: 'NO_CHECKPOINT'
                };
            }
            // Backup przed wznowieniem
            if (this.config.backupBeforeResume) {
                await this.createBackup(experimentId);
            }
            // Aktualizuj status eksperymentu
            this.tracker.updateExperiment(experimentId, { status: 'running' });
            // Rozpocznij monitoring checkpointów
            this.startCheckpointMonitoring(experimentId);
            console.log(`✅ Eksperyment ${experimentId} wznowiony z checkpoint ${checkpoint.iteration}`);
            return {
                success: true,
                resumedFromCheckpoint: true,
                checkpointTimestamp: checkpoint.timestamp,
                resumedIteration: checkpoint.iteration,
                message: `Eksperyment wznowiony z iteracji ${checkpoint.iteration}`
            };
        }
        catch (error) {
            console.error(`❌ Błąd podczas wznawiania eksperymentu ${experimentId}:`, error);
            return {
                success: false,
                resumedFromCheckpoint: false,
                checkpointTimestamp: 0,
                resumedIteration: 0,
                message: `Błąd podczas wznawiania: ${error}`,
                error: 'RESUME_ERROR'
            };
        }
    }
    /**
     * Zapisuje checkpoint eksperymentu
     */
    async saveCheckpoint(experimentId, iteration, currentBestValue, currentBestParams, additionalData = {}) {
        const checkpoint = {
            experimentId,
            timestamp: Date.now(),
            iteration,
            currentBestValue,
            currentBestParams,
            trialCount: additionalData.trialCount || 0,
            elapsedTime: additionalData.elapsedTime || 0,
            pythonState: additionalData.pythonState,
            optimizerState: additionalData.optimizerState,
            metadata: additionalData.metadata || {}
        };
        const checkpointPath = this.getCheckpointPath(experimentId, iteration);
        fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
        console.log(`💾 Checkpoint zapisany: ${experimentId} iteracja ${iteration}`);
    }
    /**
     * Ładuje najnowszy checkpoint dla eksperymentu
     */
    async getLatestCheckpoint(experimentId) {
        const checkpointFiles = this.getCheckpointFiles(experimentId);
        if (checkpointFiles.length === 0) {
            return null;
        }
        // Sortuj według timestamp (najnowszy na początku)
        checkpointFiles.sort((a, b) => {
            const statsA = fs.statSync(a);
            const statsB = fs.statSync(b);
            return statsB.mtime.getTime() - statsA.mtime.getTime();
        });
        const latestPath = checkpointFiles[0];
        try {
            const checkpoint = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
            console.log(`📂 Znaleziono checkpoint: ${experimentId} iteracja ${checkpoint.iteration}`);
            return checkpoint;
        }
        catch (error) {
            console.error(`❌ Błąd odczytu checkpoint ${latestPath}:`, error);
            return null;
        }
    }
    /**
     * Zwraca wszystkie checkpointy dla eksperymentu
     */
    async getAllCheckpoints(experimentId) {
        const checkpointFiles = this.getCheckpointFiles(experimentId);
        const checkpoints = [];
        for (const filePath of checkpointFiles) {
            try {
                const checkpoint = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                checkpoints.push(checkpoint);
            }
            catch (error) {
                console.warn(`⚠️ Nie można odczytać checkpoint ${filePath}:`, error);
            }
        }
        // Sortuj według iteracji
        checkpoints.sort((a, b) => a.iteration - b.iteration);
        return checkpoints;
    }
    /**
     * Automatycznie wznawia wszystkie przerwane eksperymenty
     */
    async autoResumeAll() {
        if (!this.config.autoResumeOnStart) {
            return [];
        }
        console.log(`🔄 Automatyczne wznawianie przerwanych eksperymentów...`);
        const experiments = Object.values(this.tracker['experimentsCache']);
        const interruptedExperiments = experiments.filter(exp => exp.status === 'failed' ||
            exp.status === 'interrupted');
        console.log(`📊 Znaleziono ${interruptedExperiments.length} przerwanych eksperymentów`);
        const results = [];
        for (const experiment of interruptedExperiments) {
            const result = await this.resumeExperiment(experiment.id);
            results.push(result);
            // Pauza między wznawianiami
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return results;
    }
    /**
     * Rozpoczyna monitoring checkpointów dla eksperymentu
     */
    startCheckpointMonitoring(experimentId) {
        // Usuń poprzedni timer jeśli istnieje
        this.stopCheckpointMonitoring(experimentId);
        const interval = setInterval(async () => {
            try {
                // Sprawdź czy eksperyment nadal jest aktywny
                const experiment = this.tracker.getExperiment(experimentId);
                if (!experiment || experiment.status !== 'running') {
                    this.stopCheckpointMonitoring(experimentId);
                    return;
                }
                // Sprawdź czy są nowe wyniki do zapisania w checkpoint
                // Symulacja - w rzeczywistej implementacji to powinno być połączone z systemem optymalizacji
                const experimentFile = path.join(process.cwd(), 'temp', 'experiments', `${experimentId}_results.json`);
                let partialResults = [];
                if (fs.existsSync(experimentFile)) {
                    try {
                        partialResults = JSON.parse(fs.readFileSync(experimentFile, 'utf8'));
                    }
                    catch (e) {
                        // Ignoruj błędy odczytu
                    }
                }
                if (partialResults && partialResults.length > 0) {
                    const latest = partialResults[partialResults.length - 1];
                    await this.saveCheckpoint(experimentId, partialResults.length, latest.value, latest.params, {
                        trialCount: partialResults.length,
                        elapsedTime: Date.now() - experiment.createdAt
                    });
                }
            }
            catch (error) {
                console.error(`❌ Błąd podczas automatycznego checkpoint ${experimentId}:`, error);
            }
        }, this.config.checkpointInterval * 1000);
        this.activeCheckpoints.set(experimentId, interval);
        console.log(`⏱️ Monitoring checkpointów rozpoczęty dla ${experimentId} (co ${this.config.checkpointInterval}s)`);
    }
    /**
     * Zatrzymuje monitoring checkpointów dla eksperymentu
     */
    stopCheckpointMonitoring(experimentId) {
        const interval = this.activeCheckpoints.get(experimentId);
        if (interval) {
            clearInterval(interval);
            this.activeCheckpoints.delete(experimentId);
            console.log(`⏹️ Monitoring checkpointów zatrzymany dla ${experimentId}`);
        }
    }
    /**
     * Tworzy backup przed wznowieniem
     */
    async createBackup(experimentId) {
        const experiment = this.tracker.getExperiment(experimentId);
        if (!experiment)
            return;
        const backupDir = path.join(this.checkpointDirectory, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const backupPath = path.join(backupDir, `${experimentId}_backup_${Date.now()}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(experiment, null, 2));
        console.log(`💾 Backup utworzony: ${backupPath}`);
    }
    /**
     * Zwraca ścieżkę do pliku checkpoint
     */
    getCheckpointPath(experimentId, iteration) {
        return path.join(this.checkpointDirectory, `${experimentId}_checkpoint_${iteration}.json`);
    }
    /**
     * Zwraca listę plików checkpoint dla eksperymentu
     */
    getCheckpointFiles(experimentId) {
        if (!fs.existsSync(this.checkpointDirectory)) {
            return [];
        }
        const files = fs.readdirSync(this.checkpointDirectory);
        const checkpointFiles = files
            .filter(file => file.startsWith(`${experimentId}_checkpoint_`) && file.endsWith('.json'))
            .map(file => path.join(this.checkpointDirectory, file));
        return checkpointFiles;
    }
    /**
     * Czyści stare checkpointy (pozostawia ostatnie N)
     */
    async cleanupOldCheckpoints(experimentId, keepLast = 5) {
        const checkpointFiles = this.getCheckpointFiles(experimentId);
        if (checkpointFiles.length <= keepLast) {
            return;
        }
        // Sortuj według czasu modyfikacji (najstarsze na początku)
        checkpointFiles.sort((a, b) => {
            const statsA = fs.statSync(a);
            const statsB = fs.statSync(b);
            return statsA.mtime.getTime() - statsB.mtime.getTime();
        });
        const toDelete = checkpointFiles.slice(0, checkpointFiles.length - keepLast);
        for (const filePath of toDelete) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Usunięto stary checkpoint: ${path.basename(filePath)}`);
        }
        console.log(`🧹 Wyczyszczono ${toDelete.length} starych checkpointów dla ${experimentId}`);
    }
    /**
     * Zatrzymuje wszystkie aktywne monitoringi
     */
    stopAllMonitoring() {
        for (const experimentId of this.activeCheckpoints.keys()) {
            const interval = this.activeCheckpoints.get(experimentId);
            if (interval) {
                clearInterval(interval);
                console.log(`⏹️ Zatrzymano monitoring dla ${experimentId}`);
            }
        }
        this.activeCheckpoints.clear();
    }
    /**
     * Zwraca statystyki checkpointów
     */
    getCheckpointStats() {
        const stats = {
            activeMonitorings: this.activeCheckpoints.size,
            totalCheckpoints: 0,
            experimentsWithCheckpoints: 0,
            oldestCheckpoint: null,
            newestCheckpoint: null
        };
        if (!fs.existsSync(this.checkpointDirectory)) {
            return stats;
        }
        const files = fs.readdirSync(this.checkpointDirectory);
        const checkpointFiles = files.filter(file => file.includes('_checkpoint_') && file.endsWith('.json'));
        stats.totalCheckpoints = checkpointFiles.length;
        const experimentIds = new Set(checkpointFiles.map(file => file.split('_checkpoint_')[0]));
        stats.experimentsWithCheckpoints = experimentIds.size;
        // Znajdź najstarszy i najnowszy checkpoint
        let oldestTime = Infinity;
        let newestTime = 0;
        for (const file of checkpointFiles) {
            const filePath = path.join(this.checkpointDirectory, file);
            const stats_file = fs.statSync(filePath);
            const mtime = stats_file.mtime.getTime();
            if (mtime < oldestTime) {
                oldestTime = mtime;
                stats.oldestCheckpoint = new Date(mtime);
            }
            if (mtime > newestTime) {
                newestTime = mtime;
                stats.newestCheckpoint = new Date(mtime);
            }
        }
        return stats;
    }
}
exports.ExperimentResumer = ExperimentResumer;
