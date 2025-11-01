/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
import * as fs from 'fs';
import * as path from 'path';
import { PythonShell } from 'python-shell';
import { IOptimizer, OptimizationConfig, OptimizationResult, ErrorType } from '../core/types';
import { SimpleErrorManager, SimpleHealthMonitor } from '../core/error-handling/simple-error-manager';

/**
 * Interface representing the search space configuration for optimization
 */
export interface SearchSpaceParameter {
    type: 'int' | 'float' | 'categorical';
    min?: number;
    max?: number;
    values?: any[];
}

/**
 * Interface for the Ray+Optuna optimizer configuration
 */
export interface RayOptunaOptimizerConfig {
    strategy_name: string;
    search_space: Record<string, SearchSpaceParameter>;
    num_trials: number;
    metric: string;
    mode: 'max' | 'min';
    num_workers: number;
    output_dir: string;
}

/**
 * Interface for progress updates from the Python optimizer
 */
interface ProgressUpdate {
    status: 'progress' | 'error' | 'warning';
    message: string;
}

/**
 * Optimizer that leverages Ray and Optuna for distributed parameter optimization
 * Falls back to Optuna-only implementation if Ray is not available
 */
export class RayOptunaOptimizer implements IOptimizer {
    private pythonScriptPath: string;
    private implementation: 'ray_optuna' | 'optuna_only' | null = null;
    private errorManager: SimpleErrorManager;
    private healthMonitor: SimpleHealthMonitor;

    /**
     * Creates a new instance of the Ray+Optuna optimizer
     */
    constructor() {
        // Initialize error management and health monitoring
        this.errorManager = new SimpleErrorManager();
        this.healthMonitor = new SimpleHealthMonitor();
        
        // Path to the Python optimizer script
        this.pythonScriptPath = path.join(__dirname, './python/ray_optuna_optimizer.py');
        
        // Make sure the script exists (but don't fail if Python is missing)
        if (!fs.existsSync(this.pythonScriptPath)) {
            console.warn(`Python optimizer script not found at: ${this.pythonScriptPath}`);
        }
    }

    /**
     * Test the Python integration to make sure it's working
     * @returns Promise resolving to test results
     */
    async testPythonIntegration(): Promise<any> {
        return await this.errorManager.executeWithRetry(
            async () => {
                const command = {
                    action: 'test'
                };

                const result = await this.runPythonScript(command);
                
                // Validate result structure
                if (!result || typeof result !== 'object') {
                    throw new Error('Invalid Python integration response format');
                }

                return result;
            },
            ErrorType.OPTIMIZATION_FAILURE,
            { 
                component: 'ray-optuna-optimizer',
                operation: 'test-integration' 
            },
            'optimization-service'
        );
    }

    /**
     * Run optimization with the given configuration
     * @param config Optimization configuration
     * @returns Promise resolving to optimization results
     */
    async runOptimization(config: OptimizationConfig): Promise<OptimizationResult> {
        return await this.errorManager.executeWithRetry(
            async () => {
                console.log(`Starting optimization for strategy: ${config.strategyName}`);
                
                // Validate configuration
                this.validateOptimizationConfig(config);
                
                // Check health before starting
                const systemHealth = await this.healthMonitor.performHealthCheck();
                if (systemHealth.overall === 'CRITICAL') {
                    throw new Error('System health is critical, aborting optimization');
                }
                
                // Convert the general optimization config to the specific format expected by our Python script
                const rayOptunaConfig: RayOptunaOptimizerConfig = this.convertConfig(config);
                
                // Create command for the Python script
                const command = {
                    action: 'run_optimization',
                    config: rayOptunaConfig
                };

                // Run the Python script with timeout
                const result = await this.runPythonScript(command);
                
                // Validate result
                this.validateOptimizationResult(result);
                
                // Store which implementation was used (Ray+Optuna or Optuna-only)
                this.implementation = result.implementation;
                
                // Convert the result to the format expected by our system
                return this.convertResult(result.results);
            },
            ErrorType.OPTIMIZATION_FAILURE,
            {
                component: 'ray-optuna-optimizer',
                operation: 'run-optimization',
                strategy: config.strategyName,
                numTrials: config.numTrials
            },
            'optimization-service'
        );
    }

    /**
     * Validate optimization configuration
     */
    private validateOptimizationConfig(config: OptimizationConfig): void {
        if (!config.strategyName || config.strategyName.trim().length === 0) {
            throw new Error('Strategy name is required');
        }

        if (!config.parameters || Object.keys(config.parameters).length === 0) {
            throw new Error('At least one parameter is required for optimization');
        }

        if (config.numTrials && (config.numTrials < 1 || config.numTrials > 10000)) {
            throw new Error('Number of trials must be between 1 and 10000');
        }

        // Validate parameter definitions
        Object.entries(config.parameters).forEach(([paramName, paramConfig]) => {
            if (!paramConfig.type) {
                throw new Error(`Parameter ${paramName} is missing type definition`);
            }

            if ((paramConfig.type === 'integer' || paramConfig.type === 'float') &&
                (paramConfig.min === undefined || paramConfig.max === undefined)) {
                throw new Error(`Parameter ${paramName} is missing min/max values`);
            }

            if (paramConfig.type === 'categorical' && (!paramConfig.values || paramConfig.values.length === 0)) {
                throw new Error(`Parameter ${paramName} is missing categorical values`);
            }
        });
    }

    /**
     * Validate optimization result
     */
    private validateOptimizationResult(result: any): void {
        if (!result || typeof result !== 'object') {
            throw new Error('Invalid optimization result format');
        }

        if (result.status === 'error') {
            throw new Error(`Python optimization error: ${result.message || 'Unknown error'}`);
        }

        if (!result.results) {
            throw new Error('Optimization result is missing results data');
        }

        const requiredFields = ['best_parameters', 'best_metrics', 'completed_trials'];
        requiredFields.forEach(field => {
            if (!(field in result.results)) {
                throw new Error(`Optimization result is missing required field: ${field}`);
            }
        });
    }

    /**
     * Get the implementation used for the last optimization run
     * @returns The implementation used ('ray_optuna' or 'optuna_only') or null if no optimization has been run
     */
    getImplementation(): 'ray_optuna' | 'optuna_only' | null {
        return this.implementation;
    }

    /**
     * Convert the general optimization config to the format expected by our Python script
     * @param config General optimization configuration
     * @returns Ray+Optuna specific configuration
     */
    private convertConfig(config: OptimizationConfig): RayOptunaOptimizerConfig {
        // Create search space for parameters
        const searchSpace: Record<string, SearchSpaceParameter> = {};
        
        // Add parameters to search space
        for (const [paramName, paramConfig] of Object.entries(config.parameters)) {
            if (paramConfig.type === 'integer') {
                searchSpace[paramName] = {
                    type: 'int',
                    min: paramConfig.min as number,
                    max: paramConfig.max as number
                };
            } else if (paramConfig.type === 'float' || paramConfig.type === 'number') {
                searchSpace[paramName] = {
                    type: 'float',
                    min: paramConfig.min as number,
                    max: paramConfig.max as number
                };
            } else if (paramConfig.type === 'categorical') {
                searchSpace[paramName] = {
                    type: 'categorical',
                    values: paramConfig.values
                };
            }
        }

        // Convert to Ray+Optuna config format
        return {
            strategy_name: config.strategyName,
            search_space: searchSpace,
            num_trials: config.numTrials || 100,
            metric: config.optimizationMetric || 'profit_factor',
            mode: config.optimizationMode || 'max',
            num_workers: config.numWorkers || 4,
            output_dir: config.outputDir || './results/optimization'
        };
    }

    /**
     * Convert the Python result to the format expected by our system
     * @param result Result from Python optimization
     * @returns Optimization result in the format expected by our system
     */
    private convertResult(result: any): OptimizationResult {
        return {
            bestParameters: result.best_parameters,
            bestMetrics: result.best_metrics,
            allTrials: result.all_trials,
            completedTrials: result.completed_trials,
            runtimeSeconds: result.runtime_seconds,
            timestamp: result.timestamp,
            strategyName: result.strategy_name
        };
    }

    /**
     * Run the Python optimizer script with the given command
     * @param command Command to send to the Python script
     * @returns Promise resolving to the result from the Python script
     */
    private async runPythonScript(command: any): Promise<any> {
        return new Promise((resolve, reject) => {
            let timeoutId: NodeJS.Timeout;
            let pyshell: PythonShell | null = null;

            // Set up timeout (5 minutes default)
            const timeoutMs = 300000;
            timeoutId = setTimeout(() => {
                if (pyshell) {
                    pyshell.kill('SIGTERM');
                }
                reject(new Error(`Python script timeout after ${timeoutMs}ms`));
            }, timeoutMs);

            try {
                // Check if Python is available first
                const pythonPaths = ['/usr/bin/python3.10', '/usr/bin/python3', 'python3', 'python'];
                let availablePython: string | null = null;
                
                for (const pythonPath of pythonPaths) {
                    try {
                        if (fs.existsSync(pythonPath)) {
                            availablePython = pythonPath;
                            break;
                        }
                    } catch (e) {
                        // Continue checking next path
                    }
                }
                
                if (!availablePython) {
                    throw new Error(
                        'Python not found. Please install Python 3.8+ or set proper Python path. ' +
                        'This is expected in environments without Python installed.'
                    );
                }

                // Options for PythonShell
                const options = {
                    mode: 'text' as 'text',
                    pythonPath: availablePython,
                    pythonOptions: ['-u'], // Unbuffered output
                    scriptPath: path.dirname(this.pythonScriptPath),
                    args: []
                };

                // Create a Python shell instance
                pyshell = new PythonShell(path.basename(this.pythonScriptPath), options);
                
                // Send the command to the Python script
                pyshell.send(JSON.stringify(command));

                // Store accumulated data
                let resultData = '';
                let errorData = '';
                let messageCount = 0;
                
                // Handle progress updates from the Python script
                pyshell.on('message', (message) => {
                    messageCount++;
                    
                    // Prevent memory issues with too many messages
                    if (messageCount > 10000) {
                        pyshell?.kill('SIGTERM');
                        reject(new Error('Too many messages from Python script (possible infinite loop)'));
                        return;
                    }

                    try {
                        // Try to parse as JSON
                        const data = JSON.parse(message);
                        
                        // Check if it's a progress update
                        if (data.status === 'progress' || data.status === 'warning') {
                            const update = data as ProgressUpdate;
                            console.log(`[Python] ${update.message}`);
                        } else {
                            // It's the final result
                            resultData = message;
                        }
                    } catch (error) {
                        // Not valid JSON, treat as raw output
                        console.log(`[Python Raw] ${message}`);
                        
                        // If it looks like an error, accumulate it
                        if (message.toLowerCase().includes('error') || 
                            message.toLowerCase().includes('exception') ||
                            message.toLowerCase().includes('traceback')) {
                            errorData += message + '\n';
                        }
                    }
                });

                // Handle errors
                pyshell.on('stderr', (stderr) => {
                    errorData += stderr + '\n';
                    console.error(`[Python Error] ${stderr}`);
                    
                    // Check for specific error patterns
                    if (stderr.includes('ModuleNotFoundError')) {
                        pyshell?.kill('SIGTERM');
                        reject(new Error(`Python module missing: ${stderr}`));
                        return;
                    }
                    
                    if (stderr.includes('PermissionError')) {
                        pyshell?.kill('SIGTERM');
                        reject(new Error(`Python permission error: ${stderr}`));
                        return;
                    }
                });

                // Handle script end
                pyshell.end((err) => {
                    clearTimeout(timeoutId);
                    
                    if (err) {
                        console.error('Error running Python script:', err);
                        
                        // Categorize the error
                        let errorMessage = `Python script error: ${err.message}`;
                        
                        if (err.message.includes('ENOENT')) {
                            errorMessage = 'Python script file not found or Python not installed';
                        } else if (err.message.includes('EACCES')) {
                            errorMessage = 'Permission denied accessing Python script';
                        } else if (errorData.trim()) {
                            errorMessage += `\nStderr: ${errorData.trim()}`;
                        }
                        
                        reject(new Error(errorMessage));
                        return;
                    }

                    // Parse the result
                    try {
                        if (!resultData.trim()) {
                            reject(new Error('No result data received from Python script'));
                            return;
                        }

                        const result = JSON.parse(resultData);
                        
                        // Check for error status
                        if (result.status === 'error') {
                            reject(new Error(`Python error: ${result.message || 'Unknown error'}`));
                            return;
                        }
                        
                        resolve(result);
                    } catch (parseError) {
                        const parseErrMsg = parseError instanceof Error ? parseError.message : String(parseError);
                        reject(new Error(
                            `Failed to parse Python result: ${parseErrMsg}\n` +
                            `Raw output: ${resultData}\n` +
                            `Error output: ${errorData}`
                        ));
                    }
                });

            } catch (setupError) {
                clearTimeout(timeoutId);
                const setupErrMsg = setupError instanceof Error ? setupError.message : String(setupError);
                reject(new Error(`Failed to setup Python shell: ${setupErrMsg}`));
            }
        });
    }
}

// Export default instance
export default new RayOptunaOptimizer();
