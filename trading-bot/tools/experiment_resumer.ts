/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
import * as fs from 'fs';
import * as path from 'path';
import { ExperimentTracker, ExperimentMetadata } from './experiment_tracker';

/**
 * Status eksperymentu
 */
export const ExperimentStatus = {
    RUNNING: 'running' as const,
    COMPLETED: 'completed' as const, 
    FAILED: 'failed' as const,
    INTERRUPTED: 'interrupted' as const,
    PAUSED: 'paused' as const
} as const;

export type ExperimentStatusType = typeof ExperimentStatus[keyof typeof ExperimentStatus];

/**
 * Konfiguracja dla wznawiania eksperymentów
 */
export interface ResumeConfig {
    checkpointInterval: number;     // Jak często zapisywać checkpoint (w sekundach)
    maxRetryAttempts: number;       // Maksymalna liczba prób wznowienia
    autoResumeOnStart: boolean;     // Czy automatycznie wznawiać przy starcie
    backupBeforeResume: boolean;    // Czy zrobić backup przed wznowieniem
}

/**
 * Punkt kontrolny eksperymentu
 */
export interface ExperimentCheckpoint {
    experimentId: string;
    timestamp: number;
    iteration: number;
    currentBestValue: number;
    currentBestParams: any;
    trialCount: number;
    elapsedTime: number;
    pythonState?: any;              // Stan po stronie Python
    optimizerState?: any;           // Stan optymalizatora
    metadata: any;                  // Dodatkowe metadane
}

/**
 * Status wznowienia
 */
export interface ResumeStatus {
    success: boolean;
    resumedFromCheckpoint: boolean;
    checkpointTimestamp: number;
    resumedIteration: number;
    message: string;
    error?: string;
}

/**
 * Klasa do zarządzania wznawianiem eksperymentów
 */
export class ExperimentResumer {
    private tracker: ExperimentTracker;
    private config: ResumeConfig;
    private activeCheckpoints: Map<string, NodeJS.Timeout> = new Map();
    private checkpointDirectory: string;

    constructor(
        tracker: ExperimentTracker,
        config: Partial<ResumeConfig> = {}
    ) {
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
    async resumeExperiment(experimentId: string): Promise<ResumeStatus> {
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
            if (experiment.status === ExperimentStatus.COMPLETED) {
                return {
                    success: false,
                    resumedFromCheckpoint: false,
                    checkpointTimestamp: 0,
                    resumedIteration: 0,
                    message: `Eksperyment ${experimentId} już został ukończony`,
                    error: 'ALREADY_COMPLETED'
                };
            }

            if (experiment.status === ExperimentStatus.RUNNING) {
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

        } catch (error) {
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
    async saveCheckpoint(
        experimentId: string,
        iteration: number,
        currentBestValue: number,
        currentBestParams: any,
        additionalData: any = {}
    ): Promise<void> {
        const checkpoint: ExperimentCheckpoint = {
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
    async getLatestCheckpoint(experimentId: string): Promise<ExperimentCheckpoint | null> {
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
            const checkpoint: ExperimentCheckpoint = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
            console.log(`📂 Znaleziono checkpoint: ${experimentId} iteracja ${checkpoint.iteration}`);
            return checkpoint;
        } catch (error) {
            console.error(`❌ Błąd odczytu checkpoint ${latestPath}:`, error);
            return null;
        }
    }

    /**
     * Zwraca wszystkie checkpointy dla eksperymentu
     */
    async getAllCheckpoints(experimentId: string): Promise<ExperimentCheckpoint[]> {
        const checkpointFiles = this.getCheckpointFiles(experimentId);
        const checkpoints: ExperimentCheckpoint[] = [];

        for (const filePath of checkpointFiles) {
            try {
                const checkpoint: ExperimentCheckpoint = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                checkpoints.push(checkpoint);
            } catch (error) {
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
    async autoResumeAll(): Promise<ResumeStatus[]> {
        if (!this.config.autoResumeOnStart) {
            return [];
        }

        console.log(`🔄 Automatyczne wznawianie przerwanych eksperymentów...`);

        const experiments = Object.values(this.tracker['experimentsCache'] as Record<string, ExperimentMetadata>);
        const interruptedExperiments = experiments.filter(exp => 
            exp.status === 'failed' || 
            exp.status === 'interrupted'
        );

        console.log(`📊 Znaleziono ${interruptedExperiments.length} przerwanych eksperymentów`);

        const results: ResumeStatus[] = [];
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
    startCheckpointMonitoring(experimentId: string): void {
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
                let partialResults: any[] = [];
                if (fs.existsSync(experimentFile)) {
                    try {
                        partialResults = JSON.parse(fs.readFileSync(experimentFile, 'utf8'));
                    } catch (e) {
                        // Ignoruj błędy odczytu
                    }
                }
                
                if (partialResults && partialResults.length > 0) {
                    const latest = partialResults[partialResults.length - 1];
                    await this.saveCheckpoint(
                        experimentId,
                        partialResults.length,
                        latest.value,
                        latest.params,
                        {
                            trialCount: partialResults.length,
                            elapsedTime: Date.now() - experiment.createdAt
                        }
                    );
                }
            } catch (error) {
                console.error(`❌ Błąd podczas automatycznego checkpoint ${experimentId}:`, error);
            }
        }, this.config.checkpointInterval * 1000);

        this.activeCheckpoints.set(experimentId, interval);
        console.log(`⏱️ Monitoring checkpointów rozpoczęty dla ${experimentId} (co ${this.config.checkpointInterval}s)`);
    }

    /**
     * Zatrzymuje monitoring checkpointów dla eksperymentu
     */
    stopCheckpointMonitoring(experimentId: string): void {
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
    private async createBackup(experimentId: string): Promise<void> {
        const experiment = this.tracker.getExperiment(experimentId);
        if (!experiment) return;

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
    private getCheckpointPath(experimentId: string, iteration: number): string {
        return path.join(this.checkpointDirectory, `${experimentId}_checkpoint_${iteration}.json`);
    }

    /**
     * Zwraca listę plików checkpoint dla eksperymentu
     */
    private getCheckpointFiles(experimentId: string): string[] {
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
    async cleanupOldCheckpoints(experimentId: string, keepLast: number = 5): Promise<void> {
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
    stopAllMonitoring(): void {
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
    getCheckpointStats(): any {
        const stats = {
            activeMonitorings: this.activeCheckpoints.size,
            totalCheckpoints: 0,
            experimentsWithCheckpoints: 0,
            oldestCheckpoint: null as Date | null,
            newestCheckpoint: null as Date | null
        };

        if (!fs.existsSync(this.checkpointDirectory)) {
            return stats;
        }

        const files = fs.readdirSync(this.checkpointDirectory);
        const checkpointFiles = files.filter(file => file.includes('_checkpoint_') && file.endsWith('.json'));
        
        stats.totalCheckpoints = checkpointFiles.length;
        
        const experimentIds = new Set(
            checkpointFiles.map(file => file.split('_checkpoint_')[0])
        );
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


