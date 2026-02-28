"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🚀 OPTIMIZATION TOOLS ADAPTER
 * Unified interface for Ray Tune and Optuna optimization tools
 */
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
exports.OptimizationToolsAdapter = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const events_1 = require("events");
const logger_1 = require("../utils/logger");
class OptimizationToolsAdapter extends events_1.EventEmitter {
    constructor(toolsPath) {
        super();
        this.runningProcesses = new Map();
        this.logger = new logger_1.Logger();
        this.toolsPath = toolsPath;
        this.executionContext = {
            workingDirectory: toolsPath,
            pythonPath: process.env.PYTHON_PATH || 'python3',
            environmentVariables: {
                ...process.env,
                PYTHONPATH: toolsPath,
                RAY_DISABLE_IMPORT_WARNING: '1',
                OPTUNA_LOG_LEVEL: 'WARNING'
            },
            tempDirectory: path.join(toolsPath, 'temp')
        };
        this.setupTempDirectory();
    }
    /**
     * Execute Ray Tune optimization
     */
    async executeRayOptimization(task) {
        this.logger.info(`Starting Ray Tune optimization for task ${task.id}`);
        const startTime = performance.now();
        const rayScript = path.join(this.toolsPath, 'ray_tune_optimizer.ts');
        try {
            // Prepare task configuration
            const taskConfig = this.prepareTaskConfig(task);
            const configPath = await this.writeTaskConfig(task.id, taskConfig);
            // Execute Ray optimization
            const result = await this.executeOptimizationScript(rayScript, task.id, configPath, task.config?.ray?.timeoutMinutes || 30);
            const executionTime = performance.now() - startTime;
            if (result.success) {
                this.logger.info(`Ray optimization completed successfully for task ${task.id}`);
                return {
                    ...result,
                    executionTime,
                    taskId: task.id
                };
            }
            else {
                throw new Error(result.error || 'Ray optimization failed');
            }
        }
        catch (error) {
            this.logger.error(`Ray optimization failed for task ${task.id}:`, error);
            return this.createErrorResult(task.id, performance.now() - startTime, error);
        }
    }
    /**
     * Execute Optuna optimization
     */
    async executeOptunaOptimization(task) {
        this.logger.info(`Starting Optuna optimization for task ${task.id}`);
        const startTime = performance.now();
        const optunaScript = path.join(this.toolsPath, 'optuna_optimizer.ts');
        try {
            // Prepare task configuration
            const taskConfig = this.prepareTaskConfig(task);
            const configPath = await this.writeTaskConfig(task.id, taskConfig);
            // Execute Optuna optimization
            const result = await this.executeOptimizationScript(optunaScript, task.id, configPath, task.config?.optuna?.timeoutSeconds || 1800);
            const executionTime = performance.now() - startTime;
            if (result.success) {
                this.logger.info(`Optuna optimization completed successfully for task ${task.id}`);
                return {
                    ...result,
                    executionTime,
                    taskId: task.id
                };
            }
            else {
                throw new Error(result.error || 'Optuna optimization failed');
            }
        }
        catch (error) {
            this.logger.error(`Optuna optimization failed for task ${task.id}:`, error);
            return this.createErrorResult(task.id, performance.now() - startTime, error);
        }
    }
    /**
     * Execute hybrid Ray + Optuna optimization
     */
    async executeHybridOptimization(task) {
        this.logger.info(`Starting hybrid optimization for task ${task.id}`);
        const startTime = performance.now();
        try {
            let rayResult = null;
            let optunaResult = null;
            // Execute Ray first if configured
            if (task.config?.hybrid?.useRayFirst) {
                try {
                    rayResult = await this.executeRayOptimization(task);
                }
                catch (error) {
                    this.logger.warn(`Ray optimization failed in hybrid mode: ${error}`);
                    if (!task.config?.hybrid?.fallbackToOptuna) {
                        throw error;
                    }
                }
            }
            // Execute Optuna (either as fallback or parallel)
            if (!rayResult?.success || task.config?.hybrid?.parallelExecution) {
                try {
                    optunaResult = await this.executeOptunaOptimization(task);
                }
                catch (error) {
                    this.logger.warn(`Optuna optimization failed in hybrid mode: ${error}`);
                    if (!rayResult?.success) {
                        throw error;
                    }
                }
            }
            // Select best result
            const bestResult = this.selectBestResult(rayResult, optunaResult);
            if (!bestResult) {
                throw new Error('Both Ray and Optuna optimizations failed');
            }
            const executionTime = performance.now() - startTime;
            this.logger.info(`Hybrid optimization completed for task ${task.id}`);
            return {
                ...bestResult,
                executionTime,
                taskId: task.id,
                metadata: {
                    rayResult: rayResult?.success ? rayResult : null,
                    optunaResult: optunaResult?.success ? optunaResult : null,
                    selectedTool: rayResult?.success &&
                        (!optunaResult?.success || rayResult.bestScore > optunaResult.bestScore)
                        ? 'ray' : 'optuna'
                }
            };
        }
        catch (error) {
            this.logger.error(`Hybrid optimization failed for task ${task.id}:`, error);
            return this.createErrorResult(task.id, performance.now() - startTime, error);
        }
    }
    /**
     * Cancel running optimization task
     */
    async cancelOptimization(taskId) {
        const process = this.runningProcesses.get(taskId);
        if (process) {
            this.logger.info(`Cancelling optimization task ${taskId}`);
            process.kill('SIGTERM');
            this.runningProcesses.delete(taskId);
            // Cleanup temp files
            await this.cleanupTaskFiles(taskId);
            return true;
        }
        return false;
    }
    /**
     * Get running optimization status
     */
    getRunningOptimizations() {
        return Array.from(this.runningProcesses.keys());
    }
    /**
     * Check if tools are available and properly configured
     */
    async validateTools() {
        const errors = [];
        let rayAvailable = false;
        let optunaAvailable = false;
        try {
            // Check Ray availability
            const rayCheck = await this.checkPythonPackage('ray');
            rayAvailable = rayCheck.available;
            if (!rayAvailable) {
                errors.push(`Ray not available: ${rayCheck.error}`);
            }
            // Check Optuna availability  
            const optunaCheck = await this.checkPythonPackage('optuna');
            optunaAvailable = optunaCheck.available;
            if (!optunaAvailable) {
                errors.push(`Optuna not available: ${optunaCheck.error}`);
            }
            // Check tools directory
            const toolsExist = await this.checkToolsDirectory();
            if (!toolsExist) {
                errors.push('Optimization tools directory not found or incomplete');
            }
        }
        catch (error) {
            errors.push(`Validation error: ${error}`);
        }
        return { ray: rayAvailable, optuna: optunaAvailable, errors };
    }
    // Private helper methods
    createErrorResult(taskId, executionTime, error) {
        return {
            taskId,
            success: false,
            bestParameters: {},
            bestScore: 0,
            totalTrials: 0,
            executionTime,
            convergenceInfo: {
                converged: false,
                improvementHistory: [],
                finalImprovement: 0
            },
            convergenceMetrics: {
                improvement: 0,
                convergence: false,
                iterations: 0
            },
            resourceUsage: {
                maxMemoryMb: 0,
                avgCpuUsage: 0
            },
            error: error instanceof Error ? error.message : String(error)
        };
    }
    async setupTempDirectory() {
        try {
            await fs.mkdir(this.executionContext.tempDirectory, { recursive: true });
        }
        catch (error) {
            this.logger.error('Failed to create temp directory:', error);
        }
    }
    prepareTaskConfig(task) {
        return {
            strategy: task.strategy,
            parameters: task.parameters,
            config: task.config,
            metadata: {
                taskId: task.id,
                createdAt: task.createdAt.toISOString(),
                priority: task.priority
            }
        };
    }
    async writeTaskConfig(taskId, config) {
        const configPath = path.join(this.executionContext.tempDirectory, `config_${taskId}.json`);
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        return configPath;
    }
    async executeOptimizationScript(scriptPath, taskId, configPath, timeoutSeconds) {
        return new Promise((resolve, reject) => {
            const args = ['--transpile-only', scriptPath, '--config', configPath, '--task-id', taskId];
            const process = (0, child_process_1.spawn)('npx', ['ts-node', ...args], {
                cwd: this.executionContext.workingDirectory,
                env: this.executionContext.environmentVariables,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            this.runningProcesses.set(taskId, process);
            let stdout = '';
            let stderr = '';
            process.stdout.on('data', (data) => {
                stdout += data.toString();
                this.emit('progress', { taskId, data: data.toString() });
            });
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            const timeout = setTimeout(() => {
                process.kill('SIGTERM');
                reject(new Error(`Optimization timed out after ${timeoutSeconds} seconds`));
            }, timeoutSeconds * 1000);
            process.on('close', (code) => {
                clearTimeout(timeout);
                this.runningProcesses.delete(taskId);
                if (code === 0) {
                    try {
                        // Parse result from stdout
                        const resultMatch = stdout.match(/OPTIMIZATION_RESULT:(.+)/);
                        if (resultMatch) {
                            const result = JSON.parse(resultMatch[1]);
                            resolve(result);
                        }
                        else {
                            reject(new Error('No optimization result found in output'));
                        }
                    }
                    catch (error) {
                        reject(new Error(`Failed to parse optimization result: ${error}`));
                    }
                }
                else {
                    reject(new Error(`Optimization process exited with code ${code}: ${stderr}`));
                }
            });
            process.on('error', (error) => {
                clearTimeout(timeout);
                this.runningProcesses.delete(taskId);
                reject(error);
            });
        });
    }
    selectBestResult(rayResult, optunaResult) {
        if (!rayResult && !optunaResult)
            return null;
        if (!rayResult)
            return optunaResult;
        if (!optunaResult)
            return rayResult;
        // Select based on best score
        return rayResult.bestScore > optunaResult.bestScore ? rayResult : optunaResult;
    }
    async cleanupTaskFiles(taskId) {
        try {
            const configPath = path.join(this.executionContext.tempDirectory, `config_${taskId}.json`);
            await fs.unlink(configPath).catch(() => { }); // Ignore errors
            const resultPath = path.join(this.executionContext.tempDirectory, `result_${taskId}.json`);
            await fs.unlink(resultPath).catch(() => { }); // Ignore errors
        }
        catch (error) {
            this.logger.warn(`Failed to cleanup files for task ${taskId}:`, error);
        }
    }
    async checkPythonPackage(packageName) {
        return new Promise((resolve) => {
            const process = (0, child_process_1.spawn)(this.executionContext.pythonPath, ['-c', `import ${packageName}; print('OK')`], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            let output = '';
            let error = '';
            process.stdout.on('data', (data) => output += data.toString());
            process.stderr.on('data', (data) => error += data.toString());
            process.on('close', (code) => {
                if (code === 0 && output.includes('OK')) {
                    resolve({ available: true });
                }
                else {
                    resolve({ available: false, error: error || 'Package not found' });
                }
            });
            process.on('error', (err) => {
                resolve({ available: false, error: err.message });
            });
        });
    }
    async checkToolsDirectory() {
        try {
            const requiredFiles = [
                'ray_tune_optimizer.ts',
                'optuna_optimizer.ts',
                'ray_optuna_optimizer.ts'
            ];
            for (const file of requiredFiles) {
                const filePath = path.join(this.toolsPath, file);
                await fs.access(filePath);
            }
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.OptimizationToolsAdapter = OptimizationToolsAdapter;
