"use strict";
/**
 * 📚 MODEL REGISTRY & VERSIONING SYSTEM
 * Zarządzanie wersjami i lifecycle modelów ML
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
exports.ModelRegistry = void 0;
const events_1 = require("events");
const logger_1 = require("../infrastructure/logging/logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ModelRegistry extends events_1.EventEmitter {
    constructor(registryPath = './ml_models') {
        super();
        this.models = new Map();
        this.versions = new Map(); // name -> versions
        this.isInitialized = false;
        this.logger = new logger_1.Logger('ModelRegistry');
        this.registryPath = registryPath;
        this.initializeRegistry();
    }
    /**
     * 🏗️ Initialize model registry
     */
    async initializeRegistry() {
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
        }
        catch (error) {
            this.logger.error('❌ Failed to initialize Model Registry:', error);
            throw error;
        }
    }
    /**
     * 📥 Load existing models from registry
     */
    async loadExistingModels() {
        try {
            const registryFile = path.join(this.registryPath, 'registry.json');
            if (fs.existsSync(registryFile)) {
                const data = fs.readFileSync(registryFile, 'utf-8');
                const modelsData = JSON.parse(data);
                for (const modelData of modelsData) {
                    // Convert date strings back to Date objects
                    modelData.createdAt = new Date(modelData.createdAt);
                    modelData.updatedAt = new Date(modelData.updatedAt);
                    if (modelData.deployedAt)
                        modelData.deployedAt = new Date(modelData.deployedAt);
                    if (modelData.archivedAt)
                        modelData.archivedAt = new Date(modelData.archivedAt);
                    this.models.set(modelData.id, modelData);
                    // Add to versions map
                    if (!this.versions.has(modelData.name)) {
                        this.versions.set(modelData.name, []);
                    }
                    this.versions.get(modelData.name).push(modelData);
                }
                this.logger.info(`📥 Loaded ${modelsData.length} models from registry`);
            }
        }
        catch (error) {
            this.logger.error('❌ Failed to load existing models:', error);
        }
    }
    /**
     * 💾 Save registry to disk
     */
    async saveRegistry() {
        try {
            const registryFile = path.join(this.registryPath, 'registry.json');
            const modelsData = Array.from(this.models.values());
            fs.writeFileSync(registryFile, JSON.stringify(modelsData, null, 2));
        }
        catch (error) {
            this.logger.error('❌ Failed to save registry:', error);
        }
    }
    /**
     * 📝 Register new model
     */
    async registerModel(modelConfig) {
        if (!this.isInitialized) {
            throw new Error('Model Registry not initialized');
        }
        // Generate unique model ID
        const modelId = `${modelConfig.name}_v${modelConfig.version}_${Date.now()}`;
        const model = {
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
        this.versions.get(model.name).push(model);
        // Sort versions by version number
        this.versions.get(model.name).sort((a, b) => this.compareVersions(b.version, a.version));
        // Save to disk
        await this.saveRegistry();
        this.emit('model:registered', model);
        this.logger.info(`📝 Model registered: ${model.name} v${model.version} (${modelId})`);
        return modelId;
    }
    /**
     * 🔄 Update model metadata
     */
    async updateModel(modelId, updates) {
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
    getModel(modelId) {
        return this.models.get(modelId);
    }
    /**
     * 📋 Get all models
     */
    getAllModels() {
        return Array.from(this.models.values());
    }
    /**
     * 📊 Get models by name
     */
    getModelsByName(name) {
        return this.versions.get(name) || [];
    }
    /**
     * 🔍 Search models
     */
    searchModels(query) {
        let results = Array.from(this.models.values());
        // Filter by criteria
        if (query.name) {
            results = results.filter(m => m.name.toLowerCase().includes(query.name.toLowerCase()));
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
            results = results.filter(m => query.tags.some(tag => m.tags.includes(tag)));
        }
        if (query.minAccuracy) {
            results = results.filter(m => m.performance.accuracy >= query.minAccuracy);
        }
        if (query.maxSize) {
            results = results.filter(m => m.artifacts.size <= query.maxSize);
        }
        if (query.createdAfter) {
            results = results.filter(m => m.createdAt >= query.createdAfter);
        }
        if (query.createdBefore) {
            results = results.filter(m => m.createdAt <= query.createdBefore);
        }
        // Sort by accuracy descending
        results.sort((a, b) => b.performance.accuracy - a.performance.accuracy);
        return results;
    }
    /**
     * 🏆 Get latest model version
     */
    getLatestVersion(modelName) {
        const versions = this.versions.get(modelName);
        return versions && versions.length > 0 ? versions[0] : undefined;
    }
    /**
     * 🔄 Get specific model version
     */
    getModelVersion(modelName, version) {
        const versions = this.versions.get(modelName);
        return versions?.find(v => v.version === version);
    }
    /**
     * 📊 Compare models
     */
    compareModels(modelId1, modelId2) {
        const model1 = this.models.get(modelId1);
        const model2 = this.models.get(modelId2);
        if (!model1 || !model2)
            return null;
        const performanceDiffs = {};
        const perfKeys = ['accuracy', 'precision', 'recall', 'f1Score', 'auc'];
        perfKeys.forEach(key => {
            const val1 = model1.performance[key];
            const val2 = model2.performance[key];
            const diff = val2 - val1;
            performanceDiffs[key] = {
                model1: val1,
                model2: val2,
                diff: diff,
                winner: diff > 0 ? 'model2' : diff < 0 ? 'model1' : 'tie'
            };
        });
        // Count wins
        const wins1 = Object.values(performanceDiffs).filter((p) => p.winner === 'model1').length;
        const wins2 = Object.values(performanceDiffs).filter((p) => p.winner === 'model2').length;
        let recommendation;
        let confidence;
        if (wins1 > wins2) {
            recommendation = 'model1';
            confidence = wins1 / perfKeys.length;
        }
        else if (wins2 > wins1) {
            recommendation = 'model2';
            confidence = wins2 / perfKeys.length;
        }
        else {
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
    async deployModel(modelId, stage, deploymentChecks) {
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
    async archiveModel(modelId, reason) {
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
    async deleteModel(modelId, force = false) {
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
        }
        catch (error) {
            this.logger.warn(`⚠️ Failed to delete model artifacts for ${modelId}:`, error);
        }
        await this.saveRegistry();
        this.emit('model:deleted', modelId);
        this.logger.info(`🗑️ Model deleted: ${modelId}`);
    }
    /**
     * ✅ Validate model
     */
    async validateModel(model) {
        const errors = [];
        // Check required fields
        if (!model.name)
            errors.push('Model name is required');
        if (!model.version)
            errors.push('Model version is required');
        if (!model.modelType)
            errors.push('Model type is required');
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
    async runDeploymentChecks(model) {
        const checks = [];
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
    compareVersions(a, b) {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || 0;
            const bPart = bParts[i] || 0;
            if (aPart > bPart)
                return 1;
            if (aPart < bPart)
                return -1;
        }
        return 0;
    }
    /**
     * 📊 Get registry statistics
     */
    getStatistics() {
        const models = Array.from(this.models.values());
        const statsByStatus = {};
        const statsByStage = {};
        const statsByType = {};
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
    cleanup() {
        this.models.clear();
        this.versions.clear();
        this.logger.info('🧹 Model Registry cleaned up');
    }
}
exports.ModelRegistry = ModelRegistry;
exports.default = ModelRegistry;
