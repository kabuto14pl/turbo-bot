/**
 * 🚀 OPTIMIZATION TOOLS ADAPTER
 * Unified interface for Ray Tune and Optuna optimization tools
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { OptimizationConfig, ParameterConfig } from './optimization_config';

export interface OptimizationTask {
    id: string;
    type: 'ray' | 'optuna' | 'hybrid';
    strategy: string;
    parameters: Record<string, ParameterConfig>;
    config: Partial<OptimizationConfig>;
    priority: number;
    createdAt: Date;
}

export interface OptimizationResult {
    taskId: string;
    success: boolean;
    bestParameters: Record<string, any>;
    bestScore: number;
    totalTrials: number;
    executionTime: number;
    convergenceInfo: {
        converged: boolean;
        improvementHistory: number[];
        finalImprovement: number;
    };
    convergenceMetrics: {
        improvement: number;
        convergence: boolean;
        iterations: number;
    };
    resourceUsage: {
        maxMemoryMb: number;
        avgCpuUsage: number;
        totalGpuTime?: number;
    };
    metadata?: any;
    error?: string;
}

export interface ToolExecutionContext {
    workingDirectory: string;
    pythonPath: string;
    environmentVariables: Record<string, string>;
    tempDirectory: string;
}

export class OptimizationToolsAdapter extends EventEmitter {
    private readonly logger: Logger;
    private readonly toolsPath: string;
    private readonly executionContext: ToolExecutionContext;
    private runningProcesses: Map<string, ChildProcess> = new Map();
    
    constructor(toolsPath: string) {
        super();
        this.logger = new Logger();
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
    async executeRayOptimization(task: OptimizationTask): Promise<OptimizationResult> {
        this.logger.info(`Starting Ray Tune optimization for task ${task.id}`);
        
        const startTime = performance.now();
        const rayScript = path.join(this.toolsPath, 'ray_tune_optimizer.ts');
        
        try {
            // Prepare task configuration
            const taskConfig = this.prepareTaskConfig(task);
            const configPath = await this.writeTaskConfig(task.id, taskConfig);
            
            // Execute Ray optimization
            const result = await this.executeOptimizationScript(
                rayScript,
                task.id,
                configPath,
                task.config?.ray?.timeoutMinutes || 30
            );
            
            const executionTime = performance.now() - startTime;
            
            if (result.success) {
                this.logger.info(`Ray optimization completed successfully for task ${task.id}`);
                return {
                    ...result,
                    executionTime,
                    taskId: task.id
                };
            } else {
                throw new Error(result.error || 'Ray optimization failed');
            }
            
        } catch (error) {
            this.logger.error(`Ray optimization failed for task ${task.id}:`, error);
            return this.createErrorResult(task.id, performance.now() - startTime, error);
        }
    }
    
    /**
     * Execute Optuna optimization
     */
    async executeOptunaOptimization(task: OptimizationTask): Promise<OptimizationResult> {
        this.logger.info(`Starting Optuna optimization for task ${task.id}`);
        
        const startTime = performance.now();
        const optunaScript = path.join(this.toolsPath, 'optuna_optimizer.ts');
        
        try {
            // Prepare task configuration
            const taskConfig = this.prepareTaskConfig(task);
            const configPath = await this.writeTaskConfig(task.id, taskConfig);
            
            // Execute Optuna optimization
            const result = await this.executeOptimizationScript(
                optunaScript,
                task.id,
                configPath,
                task.config?.optuna?.timeoutSeconds || 1800
            );
            
            const executionTime = performance.now() - startTime;
            
            if (result.success) {
                this.logger.info(`Optuna optimization completed successfully for task ${task.id}`);
                return {
                    ...result,
                    executionTime,
                    taskId: task.id
                };
            } else {
                throw new Error(result.error || 'Optuna optimization failed');
            }
            
        } catch (error) {
            this.logger.error(`Optuna optimization failed for task ${task.id}:`, error);
            return this.createErrorResult(task.id, performance.now() - startTime, error);
        }
    }
    
    /**
     * Execute hybrid Ray + Optuna optimization
     */
    async executeHybridOptimization(task: OptimizationTask): Promise<OptimizationResult> {
        this.logger.info(`Starting hybrid optimization for task ${task.id}`);
        
        const startTime = performance.now();
        
        try {
            let rayResult: OptimizationResult | null = null;
            let optunaResult: OptimizationResult | null = null;
            
            // Execute Ray first if configured
            if (task.config?.hybrid?.useRayFirst) {
                try {
                    rayResult = await this.executeRayOptimization(task);
                } catch (error) {
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
                } catch (error) {
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
            
        } catch (error) {
            this.logger.error(`Hybrid optimization failed for task ${task.id}:`, error);
            return this.createErrorResult(task.id, performance.now() - startTime, error);
        }
    }
    
    /**
     * Cancel running optimization task
     */
    async cancelOptimization(taskId: string): Promise<boolean> {
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
    getRunningOptimizations(): string[] {
        return Array.from(this.runningProcesses.keys());
    }
    
    /**
     * Check if tools are available and properly configured
     */
    async validateTools(): Promise<{ ray: boolean; optuna: boolean; errors: string[] }> {
        const errors: string[] = [];
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
            
        } catch (error) {
            errors.push(`Validation error: ${error}`);
        }
        
        return { ray: rayAvailable, optuna: optunaAvailable, errors };
    }
    
    // Private helper methods
    
    private createErrorResult(taskId: string, executionTime: number, error: any): OptimizationResult {
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

    private async setupTempDirectory(): Promise<void> {
        try {
            await fs.mkdir(this.executionContext.tempDirectory, { recursive: true });
        } catch (error) {
            this.logger.error('Failed to create temp directory:', error);
        }
    }
    
    private prepareTaskConfig(task: OptimizationTask): any {
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
    
    private async writeTaskConfig(taskId: string, config: any): Promise<string> {
        const configPath = path.join(this.executionContext.tempDirectory, `config_${taskId}.json`);
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        return configPath;
    }
    
    private async executeOptimizationScript(
        scriptPath: string,
        taskId: string,
        configPath: string,
        timeoutSeconds: number
    ): Promise<OptimizationResult> {
        return new Promise((resolve, reject) => {
            const args = ['--transpile-only', scriptPath, '--config', configPath, '--task-id', taskId];
            
            const process = spawn('npx', ['ts-node', ...args], {
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
                        } else {
                            reject(new Error('No optimization result found in output'));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse optimization result: ${error}`));
                    }
                } else {
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
    
    private selectBestResult(
        rayResult: OptimizationResult | null, 
        optunaResult: OptimizationResult | null
    ): OptimizationResult | null {
        if (!rayResult && !optunaResult) return null;
        if (!rayResult) return optunaResult;
        if (!optunaResult) return rayResult;
        
        // Select based on best score
        return rayResult.bestScore > optunaResult.bestScore ? rayResult : optunaResult;
    }
    
    private async cleanupTaskFiles(taskId: string): Promise<void> {
        try {
            const configPath = path.join(this.executionContext.tempDirectory, `config_${taskId}.json`);
            await fs.unlink(configPath).catch(() => {}); // Ignore errors
            
            const resultPath = path.join(this.executionContext.tempDirectory, `result_${taskId}.json`);
            await fs.unlink(resultPath).catch(() => {}); // Ignore errors
        } catch (error) {
            this.logger.warn(`Failed to cleanup files for task ${taskId}:`, error);
        }
    }
    
    private async checkPythonPackage(packageName: string): Promise<{ available: boolean; error?: string }> {
        return new Promise((resolve) => {
            const process = spawn(this.executionContext.pythonPath, ['-c', `import ${packageName}; print('OK')`], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let output = '';
            let error = '';
            
            process.stdout.on('data', (data) => output += data.toString());
            process.stderr.on('data', (data) => error += data.toString());
            
            process.on('close', (code) => {
                if (code === 0 && output.includes('OK')) {
                    resolve({ available: true });
                } else {
                    resolve({ available: false, error: error || 'Package not found' });
                }
            });
            
            process.on('error', (err) => {
                resolve({ available: false, error: err.message });
            });
        });
    }
    
    private async checkToolsDirectory(): Promise<boolean> {
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
        } catch (error) {
            return false;
        }
    }
}
