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
exports.RayOptunaOptimizer = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const python_shell_1 = require("python-shell");
const types_1 = require("../core/types");
const simple_error_manager_1 = require("../core/error-handling/simple-error-manager");
/**
 * Optimizer that leverages Ray and Optuna for distributed parameter optimization
 * Falls back to Optuna-only implementation if Ray is not available
 */
class RayOptunaOptimizer {
    /**
     * Creates a new instance of the Ray+Optuna optimizer
     */
    constructor() {
        this.implementation = null;
        // Initialize error management and health monitoring
        this.errorManager = new simple_error_manager_1.SimpleErrorManager();
        this.healthMonitor = new simple_error_manager_1.SimpleHealthMonitor();
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
    async testPythonIntegration() {
        return await this.errorManager.executeWithRetry(async () => {
            const command = {
                action: 'test'
            };
            const result = await this.runPythonScript(command);
            // Validate result structure
            if (!result || typeof result !== 'object') {
                throw new Error('Invalid Python integration response format');
            }
            return result;
        }, types_1.ErrorType.OPTIMIZATION_FAILURE, {
            component: 'ray-optuna-optimizer',
            operation: 'test-integration'
        }, 'optimization-service');
    }
    /**
     * Run optimization with the given configuration
     * @param config Optimization configuration
     * @returns Promise resolving to optimization results
     */
    async runOptimization(config) {
        return await this.errorManager.executeWithRetry(async () => {
            console.log(`Starting optimization for strategy: ${config.strategyName}`);
            // Validate configuration
            this.validateOptimizationConfig(config);
            // Check health before starting
            const systemHealth = await this.healthMonitor.performHealthCheck();
            if (systemHealth.overall === 'CRITICAL') {
                throw new Error('System health is critical, aborting optimization');
            }
            // Convert the general optimization config to the specific format expected by our Python script
            const rayOptunaConfig = this.convertConfig(config);
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
        }, types_1.ErrorType.OPTIMIZATION_FAILURE, {
            component: 'ray-optuna-optimizer',
            operation: 'run-optimization',
            strategy: config.strategyName,
            numTrials: config.numTrials
        }, 'optimization-service');
    }
    /**
     * Validate optimization configuration
     */
    validateOptimizationConfig(config) {
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
    validateOptimizationResult(result) {
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
    getImplementation() {
        return this.implementation;
    }
    /**
     * Convert the general optimization config to the format expected by our Python script
     * @param config General optimization configuration
     * @returns Ray+Optuna specific configuration
     */
    convertConfig(config) {
        // Create search space for parameters
        const searchSpace = {};
        // Add parameters to search space
        for (const [paramName, paramConfig] of Object.entries(config.parameters)) {
            if (paramConfig.type === 'integer') {
                searchSpace[paramName] = {
                    type: 'int',
                    min: paramConfig.min,
                    max: paramConfig.max
                };
            }
            else if (paramConfig.type === 'float' || paramConfig.type === 'number') {
                searchSpace[paramName] = {
                    type: 'float',
                    min: paramConfig.min,
                    max: paramConfig.max
                };
            }
            else if (paramConfig.type === 'categorical') {
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
    convertResult(result) {
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
    async runPythonScript(command) {
        return new Promise((resolve, reject) => {
            let timeoutId;
            let pyshell = null;
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
                let availablePython = null;
                for (const pythonPath of pythonPaths) {
                    try {
                        if (fs.existsSync(pythonPath)) {
                            availablePython = pythonPath;
                            break;
                        }
                    }
                    catch (e) {
                        // Continue checking next path
                    }
                }
                if (!availablePython) {
                    throw new Error('Python not found. Please install Python 3.8+ or set proper Python path. ' +
                        'This is expected in environments without Python installed.');
                }
                // Options for PythonShell
                const options = {
                    mode: 'text',
                    pythonPath: availablePython,
                    pythonOptions: ['-u'], // Unbuffered output
                    scriptPath: path.dirname(this.pythonScriptPath),
                    args: []
                };
                // Create a Python shell instance
                pyshell = new python_shell_1.PythonShell(path.basename(this.pythonScriptPath), options);
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
                            const update = data;
                            console.log(`[Python] ${update.message}`);
                        }
                        else {
                            // It's the final result
                            resultData = message;
                        }
                    }
                    catch (error) {
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
                        }
                        else if (err.message.includes('EACCES')) {
                            errorMessage = 'Permission denied accessing Python script';
                        }
                        else if (errorData.trim()) {
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
                    }
                    catch (parseError) {
                        const parseErrMsg = parseError instanceof Error ? parseError.message : String(parseError);
                        reject(new Error(`Failed to parse Python result: ${parseErrMsg}\n` +
                            `Raw output: ${resultData}\n` +
                            `Error output: ${errorData}`));
                    }
                });
            }
            catch (setupError) {
                clearTimeout(timeoutId);
                const setupErrMsg = setupError instanceof Error ? setupError.message : String(setupError);
                reject(new Error(`Failed to setup Python shell: ${setupErrMsg}`));
            }
        });
    }
}
exports.RayOptunaOptimizer = RayOptunaOptimizer;
// Export default instance
exports.default = new RayOptunaOptimizer();
