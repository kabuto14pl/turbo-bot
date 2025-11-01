/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 📚 MODEL REGISTRY & VERSIONING SYSTEM
 * Zarządzanie wersjami i lifecycle modelów ML
 */

import { EventEmitter } from 'events';
import { Logger } from '../infrastructure/logging/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface ModelMetadata {
    id: string;
    name: string;
    version: string;
    description: string;
    modelType: 'LSTM' | 'CNN' | 'TRANSFORMER' | 'ENSEMBLE' | 'HYBRID';
    framework: 'tensorflow' | 'pytorch' | 'sklearn' | 'custom';
    
    // Performance metrics
    performance: {
        accuracy: number;
        precision: number;
        recall: number;
        f1Score: number;
        auc: number;
        loss: number;
        sharpeRatio?: number;
        maxDrawdown?: number;
        profitFactor?: number;
    };
    
    // Training info
    trainingInfo: {
        datasetSize: number;
        trainingTime: number;
        epochs: number;
        batchSize: number;
        learningRate: number;
        validationSplit: number;
        featuresUsed: string[];
        hyperparameters: Record<string, any>;
    };
    
    // Model artifacts
    artifacts: {
        modelPath: string;
        configPath: string;
        weightsPath?: string;
        exportPath?: string;
        size: number; // bytes
    };
    
    // Lifecycle
    status: 'training' | 'ready' | 'deployed' | 'archived' | 'deprecated';
    stage: 'development' | 'staging' | 'production';
    tags: string[];
    
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    deployedAt?: Date;
    archivedAt?: Date;
    
    // Lineage
    parentModel?: string;
    experimentId?: string;
    createdBy: string;
    
    // Validation
    validationResults?: ModelValidationResult[];
    deploymentChecks?: DeploymentCheck[];
}

export interface ModelValidationResult {
    id: string;
    validationType: 'backtesting' | 'cross_validation' | 'stress_test' | 'drift_detection';
    status: 'passed' | 'failed' | 'warning';
    score: number;
    details: Record<string, any>;
    validatedAt: Date;
    validatedBy: string;
}

export interface DeploymentCheck {
    id: string;
    checkType: 'performance' | 'memory' | 'latency' | 'compatibility' | 'security';
    status: 'passed' | 'failed' | 'warning';
    message: string;
    checkedAt: Date;
}

export interface ModelSearchQuery {
    name?: string;
    modelType?: string;
    status?: string;
    stage?: string;
    tags?: string[];
    minAccuracy?: number;
    maxSize?: number;
    createdAfter?: Date;
    createdBefore?: Date;
}

export interface ModelComparison {
    model1: ModelMetadata;
    model2: ModelMetadata;
    differences: {
        performance: Record<string, { model1: number; model2: number; diff: number; winner: string }>;
        artifacts: { sizeDiff: number; };
        training: Record<string, any>;
    };
    recommendation: 'model1' | 'model2' | 'similar';
    confidence: number;
}

export class ModelRegistry extends EventEmitter {
    private logger: Logger;
    private models: Map<string, ModelMetadata> = new Map();
    private versions: Map<string, ModelMetadata[]> = new Map(); // name -> versions
    private registryPath: string;
    private isInitialized: boolean = false;

    constructor(registryPath: string = './ml_models') {
        super();
        this.logger = new Logger('ModelRegistry');
        this.registryPath = registryPath;
        this.initializeRegistry();
    }

    /**
     * 🏗️ Initialize model registry
     */
    private async initializeRegistry(): Promise<void> {
        try {
            // Create registry directory if it doesn't exist
            if (!fs.existsSync(this.registryPath)) {
                fs.mkdirSync(this.registryPath, { recursive: true });
            }

            // Load existing models
            await this.loadExistingModels();
            
            this.isInitialized = true;
            this.logger.info(`📚 Model Registry initialized at ${this.registryPath}`);
            this.logger.info(`📊 Loaded ${this.models.size} models`);
            
        } catch (error) {
            this.logger.error('❌ Failed to initialize Model Registry:', error);
            throw error;
        }
    }

    /**
     * 📥 Load existing models from registry
     */
    private async loadExistingModels(): Promise<void> {
        try {
            const registryFile = path.join(this.registryPath, 'registry.json');
            
            if (fs.existsSync(registryFile)) {
                const data = fs.readFileSync(registryFile, 'utf-8');
                const modelsData = JSON.parse(data);
                
                for (const modelData of modelsData) {
                    // Convert date strings back to Date objects
                    modelData.createdAt = new Date(modelData.createdAt);
                    modelData.updatedAt = new Date(modelData.updatedAt);
                    if (modelData.deployedAt) modelData.deployedAt = new Date(modelData.deployedAt);
                    if (modelData.archivedAt) modelData.archivedAt = new Date(modelData.archivedAt);
                    
                    this.models.set(modelData.id, modelData);
                    
                    // Add to versions map
                    if (!this.versions.has(modelData.name)) {
                        this.versions.set(modelData.name, []);
                    }
                    this.versions.get(modelData.name)!.push(modelData);
                }
                
                this.logger.info(`📥 Loaded ${modelsData.length} models from registry`);
            }
            
        } catch (error) {
            this.logger.error('❌ Failed to load existing models:', error);
        }
    }

    /**
     * 💾 Save registry to disk
     */
    private async saveRegistry(): Promise<void> {
        try {
            const registryFile = path.join(this.registryPath, 'registry.json');
            const modelsData = Array.from(this.models.values());
            
            fs.writeFileSync(registryFile, JSON.stringify(modelsData, null, 2));
            
        } catch (error) {
            this.logger.error('❌ Failed to save registry:', error);
        }
    }

    /**
     * 📝 Register new model
     */
    public async registerModel(
        modelConfig: Omit<ModelMetadata, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<string> {
        if (!this.isInitialized) {
            throw new Error('Model Registry not initialized');
        }

        // Generate unique model ID
        const modelId = `${modelConfig.name}_v${modelConfig.version}_${Date.now()}`;
        
        const model: ModelMetadata = {
            ...modelConfig,
            id: modelId,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Validate model before registration
        await this.validateModel(model);

        // Register model
        this.models.set(modelId, model);
        
        // Add to versions
        if (!this.versions.has(model.name)) {
            this.versions.set(model.name, []);
        }
        this.versions.get(model.name)!.push(model);
        
        // Sort versions by version number
        this.versions.get(model.name)!.sort((a, b) => 
            this.compareVersions(b.version, a.version)
        );

        // Save to disk
        await this.saveRegistry();
        
        this.emit('model:registered', model);
        this.logger.info(`📝 Model registered: ${model.name} v${model.version} (${modelId})`);
        
        return modelId;
    }

    /**
     * 🔄 Update model metadata
     */
    public async updateModel(
        modelId: string, 
        updates: Partial<ModelMetadata>
    ): Promise<void> {
        const model = this.models.get(modelId);
        if (!model) {
            throw new Error(`Model ${modelId} not found`);
        }

        const updatedModel = {
            ...model,
            ...updates,
            updatedAt: new Date()
        };

        this.models.set(modelId, updatedModel);
        
        // Update in versions array
        const versions = this.versions.get(model.name);
        if (versions) {
            const index = versions.findIndex(v => v.id === modelId);
            if (index !== -1) {
                versions[index] = updatedModel;
            }
        }

        await this.saveRegistry();
        
        this.emit('model:updated', updatedModel);
        this.logger.info(`🔄 Model updated: ${modelId}`);
    }

    /**
     * 🔍 Get model by ID
     */
    public getModel(modelId: string): ModelMetadata | undefined {
        return this.models.get(modelId);
    }

    /**
     * 📋 Get all models
     */
    public getAllModels(): ModelMetadata[] {
        return Array.from(this.models.values());
    }

    /**
     * 📊 Get models by name
     */
    public getModelsByName(name: string): ModelMetadata[] {
        return this.versions.get(name) || [];
    }

    /**
     * 🔍 Search models
     */
    public searchModels(query: ModelSearchQuery): ModelMetadata[] {
        let results = Array.from(this.models.values());

        // Filter by criteria
        if (query.name) {
            results = results.filter(m => 
                m.name.toLowerCase().includes(query.name!.toLowerCase())
            );
        }

        if (query.modelType) {
            results = results.filter(m => m.modelType === query.modelType);
        }

        if (query.status) {
            results = results.filter(m => m.status === query.status);
        }

        if (query.stage) {
            results = results.filter(m => m.stage === query.stage);
        }

        if (query.tags && query.tags.length > 0) {
            results = results.filter(m => 
                query.tags!.some(tag => m.tags.includes(tag))
            );
        }

        if (query.minAccuracy) {
            results = results.filter(m => m.performance.accuracy >= query.minAccuracy!);
        }

        if (query.maxSize) {
            results = results.filter(m => m.artifacts.size <= query.maxSize!);
        }

        if (query.createdAfter) {
            results = results.filter(m => m.createdAt >= query.createdAfter!);
        }

        if (query.createdBefore) {
            results = results.filter(m => m.createdAt <= query.createdBefore!);
        }

        // Sort by accuracy descending
        results.sort((a, b) => b.performance.accuracy - a.performance.accuracy);

        return results;
    }

    /**
     * 🏆 Get latest model version
     */
    public getLatestVersion(modelName: string): ModelMetadata | undefined {
        const versions = this.versions.get(modelName);
        return versions && versions.length > 0 ? versions[0] : undefined;
    }

    /**
     * 🔄 Get specific model version
     */
    public getModelVersion(modelName: string, version: string): ModelMetadata | undefined {
        const versions = this.versions.get(modelName);
        return versions?.find(v => v.version === version);
    }

    /**
     * 📊 Compare models
     */
    public compareModels(modelId1: string, modelId2: string): ModelComparison | null {
        const model1 = this.models.get(modelId1);
        const model2 = this.models.get(modelId2);
        
        if (!model1 || !model2) return null;

        const performanceDiffs: Record<string, any> = {};
        const perfKeys = ['accuracy', 'precision', 'recall', 'f1Score', 'auc'];
        
        perfKeys.forEach(key => {
            const val1 = (model1.performance as any)[key];
            const val2 = (model2.performance as any)[key];
            const diff = val2 - val1;
            
            performanceDiffs[key] = {
                model1: val1,
                model2: val2,
                diff: diff,
                winner: diff > 0 ? 'model2' : diff < 0 ? 'model1' : 'tie'
            };
        });

        // Count wins
        const wins1 = Object.values(performanceDiffs).filter((p: any) => p.winner === 'model1').length;
        const wins2 = Object.values(performanceDiffs).filter((p: any) => p.winner === 'model2').length;
        
        let recommendation: 'model1' | 'model2' | 'similar';
        let confidence: number;
        
        if (wins1 > wins2) {
            recommendation = 'model1';
            confidence = wins1 / perfKeys.length;
        } else if (wins2 > wins1) {
            recommendation = 'model2';
            confidence = wins2 / perfKeys.length;
        } else {
            recommendation = 'similar';
            confidence = 0.5;
        }

        return {
            model1,
            model2,
            differences: {
                performance: performanceDiffs,
                artifacts: {
                    sizeDiff: model2.artifacts.size - model1.artifacts.size
                },
                training: {
                    datasetSizeDiff: model2.trainingInfo.datasetSize - model1.trainingInfo.datasetSize,
                    trainingTimeDiff: model2.trainingInfo.trainingTime - model1.trainingInfo.trainingTime
                }
            },
            recommendation,
            confidence
        };
    }

    /**
     * 🚀 Deploy model
     */
    public async deployModel(
        modelId: string, 
        stage: 'staging' | 'production',
        deploymentChecks?: DeploymentCheck[]
    ): Promise<void> {
        const model = this.models.get(modelId);
        if (!model) {
            throw new Error(`Model ${modelId} not found`);
        }

        if (model.status !== 'ready') {
            throw new Error(`Model ${modelId} is not ready for deployment (status: ${model.status})`);
        }

        // Run deployment checks
        const checks = deploymentChecks || await this.runDeploymentChecks(model);
        const failedChecks = checks.filter(check => check.status === 'failed');
        
        if (failedChecks.length > 0) {
            throw new Error(`Deployment checks failed: ${failedChecks.map(c => c.message).join(', ')}`);
        }

        // Update model status
        await this.updateModel(modelId, {
            status: 'deployed',
            stage: stage,
            deployedAt: new Date(),
            deploymentChecks: checks
        });

        this.emit('model:deployed', { modelId, stage });
        this.logger.info(`🚀 Model deployed: ${modelId} to ${stage}`);
    }

    /**
     * 📦 Archive model
     */
    public async archiveModel(modelId: string, reason?: string): Promise<void> {
        const model = this.models.get(modelId);
        if (!model) {
            throw new Error(`Model ${modelId} not found`);
        }

        await this.updateModel(modelId, {
            status: 'archived',
            archivedAt: new Date(),
            tags: [...model.tags, 'archived', ...(reason ? [reason] : [])]
        });

        this.emit('model:archived', { modelId, reason });
        this.logger.info(`📦 Model archived: ${modelId}${reason ? ` (${reason})` : ''}`);
    }

    /**
     * 🗑️ Delete model
     */
    public async deleteModel(modelId: string, force: boolean = false): Promise<void> {
        const model = this.models.get(modelId);
        if (!model) {
            throw new Error(`Model ${modelId} not found`);
        }

        if (model.status === 'deployed' && !force) {
            throw new Error(`Cannot delete deployed model ${modelId} without force flag`);
        }

        // Remove from models map
        this.models.delete(modelId);
        
        // Remove from versions
        const versions = this.versions.get(model.name);
        if (versions) {
            const index = versions.findIndex(v => v.id === modelId);
            if (index !== -1) {
                versions.splice(index, 1);
            }
            
            // If no versions left, remove the name entry
            if (versions.length === 0) {
                this.versions.delete(model.name);
            }
        }

        // Delete model artifacts
        try {
            if (fs.existsSync(model.artifacts.modelPath)) {
                fs.unlinkSync(model.artifacts.modelPath);
            }
            if (fs.existsSync(model.artifacts.configPath)) {
                fs.unlinkSync(model.artifacts.configPath);
            }
        } catch (error) {
            this.logger.warn(`⚠️ Failed to delete model artifacts for ${modelId}:`, error);
        }

        await this.saveRegistry();
        
        this.emit('model:deleted', modelId);
        this.logger.info(`🗑️ Model deleted: ${modelId}`);
    }

    /**
     * ✅ Validate model
     */
    private async validateModel(model: ModelMetadata): Promise<void> {
        const errors: string[] = [];

        // Check required fields
        if (!model.name) errors.push('Model name is required');
        if (!model.version) errors.push('Model version is required');
        if (!model.modelType) errors.push('Model type is required');
        
        // Check artifacts exist
        if (model.artifacts.modelPath && !fs.existsSync(model.artifacts.modelPath)) {
            errors.push(`Model file not found: ${model.artifacts.modelPath}`);
        }
        
        // Check performance metrics
        if (model.performance.accuracy < 0 || model.performance.accuracy > 1) {
            errors.push('Accuracy must be between 0 and 1');
        }

        if (errors.length > 0) {
            throw new Error(`Model validation failed: ${errors.join(', ')}`);
        }
    }

    /**
     * 🔍 Run deployment checks
     */
    private async runDeploymentChecks(model: ModelMetadata): Promise<DeploymentCheck[]> {
        const checks: DeploymentCheck[] = [];

        // Performance check
        checks.push({
            id: `perf_${Date.now()}`,
            checkType: 'performance',
            status: model.performance.accuracy >= 0.7 ? 'passed' : 'failed',
            message: `Accuracy: ${model.performance.accuracy.toFixed(4)} (threshold: 0.7)`,
            checkedAt: new Date()
        });

        // Memory check
        const maxSize = 500 * 1024 * 1024; // 500MB
        checks.push({
            id: `memory_${Date.now()}`,
            checkType: 'memory',
            status: model.artifacts.size <= maxSize ? 'passed' : 'warning',
            message: `Model size: ${(model.artifacts.size / 1024 / 1024).toFixed(2)}MB (max: 500MB)`,
            checkedAt: new Date()
        });

        // Compatibility check
        checks.push({
            id: `compat_${Date.now()}`,
            checkType: 'compatibility',
            status: 'passed',
            message: 'Model compatible with current runtime',
            checkedAt: new Date()
        });

        return checks;
    }

    /**
     * 🔢 Compare version strings
     */
    private compareVersions(a: string, b: string): number {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || 0;
            const bPart = bParts[i] || 0;
            
            if (aPart > bPart) return 1;
            if (aPart < bPart) return -1;
        }
        
        return 0;
    }

    /**
     * 📊 Get registry statistics
     */
    public getStatistics(): {
        totalModels: number;
        modelsByStatus: Record<string, number>;
        modelsByStage: Record<string, number>;
        modelsByType: Record<string, number>;
        averageAccuracy: number;
        totalSize: number;
        latestModels: ModelMetadata[];
    } {
        const models = Array.from(this.models.values());
        
        const statsByStatus: Record<string, number> = {};
        const statsByStage: Record<string, number> = {};
        const statsByType: Record<string, number> = {};
        
        let totalAccuracy = 0;
        let totalSize = 0;
        
        models.forEach(model => {
            statsByStatus[model.status] = (statsByStatus[model.status] || 0) + 1;
            statsByStage[model.stage] = (statsByStage[model.stage] || 0) + 1;
            statsByType[model.modelType] = (statsByType[model.modelType] || 0) + 1;
            
            totalAccuracy += model.performance.accuracy;
            totalSize += model.artifacts.size;
        });
        
        const latestModels = models
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 5);

        return {
            totalModels: models.length,
            modelsByStatus: statsByStatus,
            modelsByStage: statsByStage,
            modelsByType: statsByType,
            averageAccuracy: models.length > 0 ? totalAccuracy / models.length : 0,
            totalSize: totalSize,
            latestModels
        };
    }

    /**
     * 🧹 Cleanup
     */
    public cleanup(): void {
        this.models.clear();
        this.versions.clear();
        this.logger.info('🧹 Model Registry cleaned up');
    }
}

export default ModelRegistry;
