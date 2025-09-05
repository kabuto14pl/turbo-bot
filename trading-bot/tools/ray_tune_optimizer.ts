import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// Globalne ścieżki - czyste Ubuntu/Linux
const ROOT_DIR = path.resolve(__dirname, '..');
const PYTHON_DIR = path.resolve(__dirname, './python');

// 🐧 CZYSTE UBUNTU - używamy bezpośrednio Python systemowy
const PYTHON_VENV_PATH = 'python3.10'; // Ubuntu Python 3.10.18

// Interfejsy do konfiguracji
export interface RayTuneConfig {
    experimentName: string;
    metric: string;
    mode: 'min' | 'max';
    numSamples: number;
    maxConcurrentTrials?: number;
    cpusPerTrial?: number;
    resourcesPerTrial?: { [key: string]: number };
    timeoutPerTrial?: number;
    maxFailures?: number;
    storageDirectory?: string;
    verbose?: boolean;
    globalTimeout?: number;  // ✅ NOWE: Globalny timeout w sekundach
}

export interface ParameterSpace {
    [key: string]: ParameterConfig;
}

export type ParameterConfig = 
    | { type: 'uniform', min: number, max: number }
    | { type: 'choice', values: (number | string | boolean)[] }
    | { type: 'randint', min: number, max: number }
    | { type: 'loguniform', min: number, max: number }
    | { type: 'grid', values: (number | string | boolean)[] }
    | { type: 'fixed', value: number | string | boolean };

export interface OptimizationResult {
    bestParameters: { [key: string]: any };
    bestParams?: { [key: string]: any };  // Alias dla kompatybilności
    bestScore: number;
    numTrials?: number;  // Liczba wykonanych trials
    allTrials: {
        parameters: { [key: string]: any };
        score: number;
        status: string;
    }[];
    trials?: any[];  // Alias dla kompatybilności
    experimentId: string;
    experimentPath: string;
    isPartial?: boolean;  // Czy to częściowe wyniki
}

// Funkcja pomocnicza do logowania z datą
function logWithTime(message: string): void {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`[${timestamp}] ${message}`);
}

// Główna klasa optymalizatora
export class RayTuneOptimizer {
    private experimentId: string;
    private configPath: string;
    private resultsPath: string;
    private pythonScript: string;
    private config: RayTuneConfig;
    
    constructor(config: RayTuneConfig) {
        this.experimentId = uuidv4();
        this.config = config;
        
        // Generuj ścieżki plików
        const tempDir = path.resolve(PYTHON_DIR, 'temp');
        fs.mkdirSync(tempDir, { recursive: true });
        
        this.configPath = path.resolve(tempDir, `config_${this.experimentId}.json`);
        this.resultsPath = path.resolve(tempDir, `results_${this.experimentId}.json`);
        this.pythonScript = path.resolve(PYTHON_DIR, 'ray_tune_optimizer.py');
        
        // Upewnij się, że skrypt Pythona istnieje
        if (!fs.existsSync(this.pythonScript)) {
            throw new Error(`Skrypt Ray Tune nie istnieje: ${this.pythonScript}`);
        }
    }
    
    /**
     * Optymalizuje funkcję celu z podaną przestrzenią parametrów
     */
    async optimize(
        objectiveFunction: (params: any) => Promise<number>,
        parameterSpace: ParameterSpace
    ): Promise<OptimizationResult> {
        // ✅ NOWE: Globalny timeout wrapper
        if (this.config.globalTimeout) {
            const timeoutSeconds = this.config.globalTimeout;
            logWithTime(`⏰ Ustawiono globalny timeout: ${timeoutSeconds} sekund (${Math.round(timeoutSeconds/60)} minut)`);
            
            return new Promise((resolve, reject) => {
                let isCompleted = false;
                
                const timeoutHandle = setTimeout(async () => {
                    if (!isCompleted) {
                        logWithTime(`⏰ Osiągnięto globalny timeout ${timeoutSeconds}s - próbuję zwrócić częściowe wyniki`);
                        try {
                            // Spróbuj odczytać częściowe wyniki
                            const partialResults = await this.getPartialResults();
                            if (partialResults) {
                                logWithTime(`✅ Zwracam częściowe wyniki po timeout (${partialResults.numTrials || 0} trials)`);
                                resolve(partialResults);
                            } else {
                                logWithTime(`❌ Brak częściowych wyników po timeout`);
                                reject(new Error(`Optymalizacja przekroczyła globalny timeout ${timeoutSeconds} sekund - brak wyników`));
                            }
                        } catch (error) {
                            logWithTime(`❌ Błąd podczas odczytu częściowych wyników: ${error}`);
                            reject(new Error(`Optymalizacja przekroczyła globalny timeout ${timeoutSeconds} sekund`));
                        }
                    }
                }, timeoutSeconds * 1000);
                
                this.runOptimization(objectiveFunction, parameterSpace)
                    .then(result => {
                        isCompleted = true;
                        clearTimeout(timeoutHandle);
                        logWithTime(`✅ Optymalizacja zakończona przed timeout`);
                        resolve(result);
                    })
                    .catch(error => {
                        isCompleted = true;
                        clearTimeout(timeoutHandle);
                        reject(error);
                    });
            });
        } else {
            // Bez globalnego timeout - standardowe działanie
            return this.runOptimization(objectiveFunction, parameterSpace);
        }
    }

    /**
     * Właściwa implementacja optymalizacji (wydzielona dla timeout wrapper)
     */
    private async runOptimization(
        objectiveFunction: (params: any) => Promise<number>,
        parameterSpace: ParameterSpace
    ): Promise<OptimizationResult> {
        // Utwórz plik konfiguracyjny dla Pythona
        const fullConfig = {
            experiment_id: this.experimentId,
            parameter_space: parameterSpace,
            config: this.config
        };
        
        fs.writeFileSync(this.configPath, JSON.stringify(fullConfig, null, 2));
        
        // Uruchom skrypt Pythona
        logWithTime(`🚀 Uruchamianie optymalizacji Ray Tune (ID: ${this.experimentId})...`);
        
        // Funkcja do obsługi komunikacji z procesem Pythona
        const handlePythonProcess = () => {
            return new Promise<void>((resolve, reject) => {
                // Konwersja ścieżek Windows -> WSL jeśli potrzeba
                let wslPythonScript = this.pythonScript;
                let wslConfigPath = this.configPath;
                let wslResultsPath = this.resultsPath;
                
                if (/^[A-Za-z]:\\/.test(wslPythonScript)) {
                    wslPythonScript = '/mnt/' + wslPythonScript[0].toLowerCase() + wslPythonScript.slice(2).replace(/\\/g, '/');
                }
                if (/^[A-Za-z]:\\/.test(wslConfigPath)) {
                    wslConfigPath = '/mnt/' + wslConfigPath[0].toLowerCase() + wslConfigPath.slice(2).replace(/\\/g, '/');
                }
                if (/^[A-Za-z]:\\/.test(wslResultsPath)) {
                    wslResultsPath = '/mnt/' + wslResultsPath[0].toLowerCase() + wslResultsPath.slice(2).replace(/\\/g, '/');
                }
                
                const rayProcess = spawn(PYTHON_VENV_PATH, [
                    wslPythonScript,
                    '--config', wslConfigPath,
                    '--results', wslResultsPath,
                    '--ts-bridge'
                ]);
                
                // Nasłuchuj wyjścia
                rayProcess.stdout.on('data', async (data) => {
                    const output = data.toString().trim();
                    
                    // Sprawdź, czy proces Pythona prosi o ewaluację funkcji celu
                    if (output.startsWith('EVALUATE:')) {
                        try {
                            const paramsJson = output.substring('EVALUATE:'.length);
                            const params = JSON.parse(paramsJson);
                            
                            // Wywołaj funkcję celu
                            const score = await objectiveFunction(params);
                            
                            // Wyślij wynik z powrotem do procesu Pythona
                            rayProcess.stdin.write(`RESULT:${score}\n`);
                        } catch (error) {
                            console.error('Błąd podczas ewaluacji:', error);
                            rayProcess.stdin.write(`ERROR:${error}\n`);
                        }
                    } else {
                        // Zwykłe dane wyjściowe
                        process.stdout.write(output + '\n');
                    }
                });
                
                rayProcess.stderr.on('data', (data) => {
                    process.stderr.write(data.toString());
                });
                
                rayProcess.on('close', (code) => {
                    if (code === 0) {
                        logWithTime(`✅ Optymalizacja Ray Tune zakończona pomyślnie!`);
                        resolve();
                    } else {
                        logWithTime(`❌ Optymalizacja Ray Tune nie powiodła się (kod: ${code})`);
                        reject(new Error(`Optymalizacja Ray Tune nie powiodła się (kod: ${code})`));
                    }
                });
            });
        };
        
        // Uruchom proces i poczekaj na wynik
        await handlePythonProcess();
        
        // Wczytaj wyniki
        if (!fs.existsSync(this.resultsPath)) {
            throw new Error(`Nie znaleziono pliku wyników: ${this.resultsPath}`);
        }
        
        const rawResults = JSON.parse(fs.readFileSync(this.resultsPath, 'utf-8'));
        
        // Zwróć sformatowane wyniki
        return {
            bestParameters: rawResults.best_parameters,
            bestScore: rawResults.best_score,
            allTrials: rawResults.all_trials.map((trial: any) => ({
                parameters: trial.parameters,
                score: trial.score,
                status: trial.status
            })),
            experimentId: this.experimentId,
            experimentPath: rawResults.experiment_path
        };
    }
    
    /**
     * Bezpośrednio optymalizuje funkcję używając Pythona
     * Uwaga: Ta funkcja przekazuje całą logikę do Pythona
     */
    async optimizeWithPython(
        objectiveFunctionPath: string,
        parameterSpace: ParameterSpace,
        additionalArgs: Record<string, any> = {}
    ): Promise<OptimizationResult> {
        // Utwórz plik konfiguracyjny dla Pythona
        const fullConfig = {
            experiment_id: this.experimentId,
            parameter_space: parameterSpace,
            objective_function_path: objectiveFunctionPath,
            additional_args: additionalArgs,
            config: this.config
        };
        
        fs.writeFileSync(this.configPath, JSON.stringify(fullConfig, null, 2));
        
        // Uruchom skrypt Pythona
        logWithTime(`🚀 Uruchamianie optymalizacji Ray Tune z Pythonem (ID: ${this.experimentId})...`);
        
        return new Promise<OptimizationResult>((resolve, reject) => {
            // Konwersja ścieżek Windows -> WSL jeśli potrzeba
            let wslPythonScript = this.pythonScript;
            let wslConfigPath = this.configPath;
            let wslResultsPath = this.resultsPath;
            
            if (/^[A-Za-z]:\\/.test(wslPythonScript)) {
                wslPythonScript = '/mnt/' + wslPythonScript[0].toLowerCase() + wslPythonScript.slice(2).replace(/\\/g, '/');
            }
            if (/^[A-Za-z]:\\/.test(wslConfigPath)) {
                wslConfigPath = '/mnt/' + wslConfigPath[0].toLowerCase() + wslConfigPath.slice(2).replace(/\\/g, '/');
            }
            if (/^[A-Za-z]:\\/.test(wslResultsPath)) {
                wslResultsPath = '/mnt/' + wslResultsPath[0].toLowerCase() + wslResultsPath.slice(2).replace(/\\/g, '/');
            }
            
            const rayProcess = spawn(PYTHON_VENV_PATH, [
                wslPythonScript,
                '--config', wslConfigPath,
                '--results', wslResultsPath
            ]);
            
            rayProcess.stdout.on('data', (data) => {
                process.stdout.write(data.toString());
            });
            
            rayProcess.stderr.on('data', (data) => {
                process.stderr.write(data.toString());
            });
            
            rayProcess.on('close', (code) => {
                if (code === 0) {
                    logWithTime(`✅ Optymalizacja Ray Tune zakończona pomyślnie!`);
                    
                    try {
                        if (!fs.existsSync(this.resultsPath)) {
                            reject(new Error(`Nie znaleziono pliku wyników: ${this.resultsPath}`));
                            return;
                        }
                        
                        const rawResults = JSON.parse(fs.readFileSync(this.resultsPath, 'utf-8'));
                        
                        // Zwróć sformatowane wyniki
                        resolve({
                            bestParameters: rawResults.best_parameters,
                            bestScore: rawResults.best_score,
                            allTrials: rawResults.all_trials.map((trial: any) => ({
                                parameters: trial.parameters,
                                score: trial.score,
                                status: trial.status
                            })),
                            experimentId: this.experimentId,
                            experimentPath: rawResults.experiment_path
                        });
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    logWithTime(`❌ Optymalizacja Ray Tune nie powiodła się (kod: ${code})`);
                    reject(new Error(`Optymalizacja Ray Tune nie powiodła się (kod: ${code})`));
                }
            });
        });
    }
    
    /**
     * Czyści pliki tymczasowe
     */
    cleanup(): void {
        try {
            if (fs.existsSync(this.configPath)) {
                fs.unlinkSync(this.configPath);
            }
            if (fs.existsSync(this.resultsPath)) {
                fs.unlinkSync(this.resultsPath);
            }
        } catch (error) {
            console.error('Błąd podczas czyszczenia plików:', error);
        }
    }

    /**
     * Próbuje odczytać częściowe wyniki z przerwanych eksperymentów
     */
    private async getPartialResults(): Promise<OptimizationResult | null> {
        try {
            // Sprawdź najpierw standardowe miejsce wyników
            if (fs.existsSync(this.resultsPath)) {
                const rawData = fs.readFileSync(this.resultsPath, 'utf8');
                const rawResults = JSON.parse(rawData);
                
                if (rawResults && rawResults.trials && rawResults.trials.length > 0) {
                    return this.processResults(rawResults);
                }
            }
            
            // Jeśli nie ma standardowych wyników, sprawdź katalog Ray Results
            const rayResultsPath = '/home/katbo/ray_results';
            if (fs.existsSync(rayResultsPath)) {
                const experiments = fs.readdirSync(rayResultsPath)
                    .filter(dir => dir.includes(this.config.experimentName) || dir.includes('simple_objective'))
                    .sort()
                    .reverse(); // Najnowsze jako pierwsze
                
                for (const experiment of experiments.slice(0, 3)) { // Sprawdź 3 najnowsze
                    try {
                        const expPath = path.join(rayResultsPath, experiment);
                        const trials = await this.readRayTrials(expPath);
                        
                        if (trials.length > 0) {
                            logWithTime(`📁 Znaleziono ${trials.length} trials w ${experiment}`);
                            return this.processTrialsToResult(trials);
                        }
                    } catch (error) {
                        logWithTime(`⚠️ Błąd przy odczycie ${experiment}: ${error}`);
                    }
                }
            }
            
            return null;
        } catch (error) {
            logWithTime(`❌ Błąd podczas odczytu częściowych wyników: ${error}`);
            return null;
        }
    }

    /**
     * Odczytuje trials z katalogu Ray Results
     */
    private async readRayTrials(experimentPath: string): Promise<any[]> {
        const trials: any[] = [];
        
        if (!fs.existsSync(experimentPath)) return trials;
        
        const trialDirs = fs.readdirSync(experimentPath)
            .filter(dir => dir.includes('simple_objective_') || dir.includes(this.config.experimentName))
            .filter(dir => fs.statSync(path.join(experimentPath, dir)).isDirectory());
        
        for (const trialDir of trialDirs) {
            try {
                const trialPath = path.join(experimentPath, trialDir);
                const resultPath = path.join(trialPath, 'result.json');
                const paramsPath = path.join(trialPath, 'params.json');
                
                if (fs.existsSync(resultPath) && fs.existsSync(paramsPath)) {
                    const resultData = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
                    const paramsData = JSON.parse(fs.readFileSync(paramsPath, 'utf8'));
                    
                    if (resultData.score !== undefined) {
                        trials.push({
                            config: paramsData,
                            metrics: { score: resultData.score },
                            status: 'TERMINATED'
                        });
                    }
                }
            } catch (error) {
                // Pomijaj uszkodzone trials
            }
        }
        
        return trials;
    }

    /**
     * Przetwarza trials na wynik optymalizacji
     */
    private processTrialsToResult(trials: any[]): OptimizationResult {
        const completedTrials = trials.filter(trial => 
            trial.status === 'TERMINATED' && trial.metrics && trial.metrics.score !== undefined
        );
        
        if (completedTrials.length === 0) {
            throw new Error('Brak zakończonych trials');
        }
        
        const bestTrial = completedTrials.reduce((best: any, current: any) => {
            const currentScore = current.metrics.score;
            const bestScore = best.metrics.score;
            
            if (this.config.mode === 'min') {
                return currentScore < bestScore ? current : best;
            } else {
                return currentScore > bestScore ? current : best;
            }
        });

        return {
            bestParameters: bestTrial.config,
            bestParams: bestTrial.config,
            bestScore: bestTrial.metrics.score,
            numTrials: trials.length,
            allTrials: trials.map((trial: any) => ({
                parameters: trial.config,
                score: trial.metrics?.score,
                status: trial.status
            })),
            trials: trials.map((trial: any) => ({
                params: trial.config,
                score: trial.metrics?.score,
                status: trial.status
            })),
            experimentId: this.experimentId,
            experimentPath: '/home/katbo/ray_results',
            isPartial: true
        };
    }

    /**
     * Przetwarza standardowe wyniki
     */
    private processResults(rawResults: any): OptimizationResult {
        const completedTrials = rawResults.trials.filter((trial: any) => 
            trial.status === 'TERMINATED' && trial.metrics && trial.metrics.score !== undefined
        );
        
        if (completedTrials.length > 0) {
            const bestTrial = completedTrials.reduce((best: any, current: any) => {
                const currentScore = current.metrics.score;
                const bestScore = best.metrics.score;
                
                if (this.config.mode === 'min') {
                    return currentScore < bestScore ? current : best;
                } else {
                    return currentScore > bestScore ? current : best;
                }
            });

            return {
                bestParameters: bestTrial.config,
                bestParams: bestTrial.config,
                bestScore: bestTrial.metrics.score,
                numTrials: rawResults.trials.length,
                allTrials: rawResults.trials.map((trial: any) => ({
                    parameters: trial.config,
                    score: trial.metrics?.score,
                    status: trial.status
                })),
                trials: rawResults.trials.map((trial: any) => ({
                    params: trial.config,
                    score: trial.metrics?.score,
                    status: trial.status
                })),
                experimentId: this.experimentId,
                experimentPath: rawResults.experiment_path,
                isPartial: true
            };
        }
        
        throw new Error('Brak zakończonych trials');
    }
}