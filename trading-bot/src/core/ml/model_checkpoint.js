"use strict";
/**
 * 🧠 ML Model Checkpoint System
 * Purpose: Persist ML model state between bot restarts
 * Author: Enterprise ML Team
 * Date: December 9, 2025
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
exports.ModelCheckpointManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Model Checkpoint Manager
 * Handles saving and loading ML model state
 */
class ModelCheckpointManager {
    constructor(checkpointDir = './data/ml_checkpoints', maxCheckpoints = 10) {
        this.checkpointDir = checkpointDir;
        this.maxCheckpoints = maxCheckpoints;
        this.autoSaveInterval = null;
        // Create checkpoint directory if doesn't exist
        if (!fs.existsSync(this.checkpointDir)) {
            fs.mkdirSync(this.checkpointDir, { recursive: true });
            console.log(`✅ Created checkpoint directory: ${this.checkpointDir}`);
        }
    }
    /**
     * Save ML model checkpoint
     */
    async saveCheckpoint(checkpoint) {
        try {
            const filename = this.generateFilename(checkpoint.modelId, checkpoint.timestamp);
            const filepath = path.join(this.checkpointDir, filename);
            // Add metadata
            const fullCheckpoint = {
                ...checkpoint,
                version: '1.0',
                timestamp: checkpoint.timestamp || Date.now(),
                metadata: {
                    ...checkpoint.metadata,
                    savedAt: new Date().toISOString(),
                    nodeVersion: process.version
                }
            };
            // Write to file
            fs.writeFileSync(filepath, JSON.stringify(fullCheckpoint, null, 2), 'utf-8');
            console.log(`💾 [CHECKPOINT] Saved: ${filename}`);
            console.log(`   Episodes: ${checkpoint.episodes}, Reward: ${checkpoint.totalReward.toFixed(2)}, Win Rate: ${(checkpoint.performance.winRate * 100).toFixed(1)}%`);
            // Cleanup old checkpoints
            await this.cleanupOldCheckpoints(checkpoint.modelId);
            return {
                success: true,
                message: `Checkpoint saved: ${filename}`,
                checkpoint: fullCheckpoint
            };
        }
        catch (error) {
            console.error(`❌ [CHECKPOINT] Save failed: ${error.message}`);
            return {
                success: false,
                message: 'Failed to save checkpoint',
                error: error.message
            };
        }
    }
    /**
     * Load latest ML model checkpoint
     */
    async loadLatestCheckpoint(modelId) {
        try {
            const checkpoints = this.listCheckpoints(modelId);
            if (checkpoints.length === 0) {
                return {
                    success: false,
                    message: `No checkpoints found for model: ${modelId}`
                };
            }
            // Get latest checkpoint (sorted by timestamp descending)
            const latestFile = checkpoints[0];
            const filepath = path.join(this.checkpointDir, latestFile);
            const data = fs.readFileSync(filepath, 'utf-8');
            const checkpoint = JSON.parse(data);
            console.log(`📂 [CHECKPOINT] Loaded: ${latestFile}`);
            console.log(`   Episodes: ${checkpoint.episodes}, Reward: ${checkpoint.totalReward.toFixed(2)}, Win Rate: ${(checkpoint.performance.winRate * 100).toFixed(1)}%`);
            return {
                success: true,
                message: `Checkpoint loaded: ${latestFile}`,
                checkpoint
            };
        }
        catch (error) {
            console.error(`❌ [CHECKPOINT] Load failed: ${error.message}`);
            return {
                success: false,
                message: 'Failed to load checkpoint',
                error: error.message
            };
        }
    }
    /**
     * Enable auto-save (save checkpoint every N milliseconds)
     */
    enableAutoSave(intervalMs, saveCallback) {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        this.autoSaveInterval = intervalMs;
        this.autoSaveTimer = setInterval(async () => {
            const checkpoint = saveCallback();
            await this.saveCheckpoint(checkpoint);
        }, intervalMs);
        console.log(`⏰ [CHECKPOINT] Auto-save enabled: every ${intervalMs / 1000}s`);
    }
    /**
     * Disable auto-save
     */
    disableAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = undefined;
            console.log(`⏸️ [CHECKPOINT] Auto-save disabled`);
        }
    }
    /**
     * List all checkpoints for a model (sorted by timestamp descending)
     */
    listCheckpoints(modelId) {
        if (!fs.existsSync(this.checkpointDir)) {
            return [];
        }
        const files = fs.readdirSync(this.checkpointDir);
        const checkpointFiles = files
            .filter(f => f.startsWith(`checkpoint_${modelId}_`) && f.endsWith('.json'))
            .sort((a, b) => {
            // Extract timestamp from filename and sort descending
            const timestampA = parseInt(a.split('_')[2].replace('.json', ''));
            const timestampB = parseInt(b.split('_')[2].replace('.json', ''));
            return timestampB - timestampA;
        });
        return checkpointFiles;
    }
    /**
     * Cleanup old checkpoints (keep only maxCheckpoints)
     */
    async cleanupOldCheckpoints(modelId) {
        const checkpoints = this.listCheckpoints(modelId);
        if (checkpoints.length > this.maxCheckpoints) {
            const toDelete = checkpoints.slice(this.maxCheckpoints);
            for (const file of toDelete) {
                const filepath = path.join(this.checkpointDir, file);
                fs.unlinkSync(filepath);
                console.log(`🗑️ [CHECKPOINT] Deleted old: ${file}`);
            }
        }
    }
    /**
     * Generate checkpoint filename
     */
    generateFilename(modelId, timestamp) {
        return `checkpoint_${modelId}_${timestamp}.json`;
    }
    /**
     * Get checkpoint statistics
     */
    getStats(modelId) {
        const checkpoints = this.listCheckpoints(modelId);
        if (checkpoints.length === 0) {
            return {
                totalCheckpoints: 0,
                latestTimestamp: null,
                oldestTimestamp: null
            };
        }
        const latestTimestamp = parseInt(checkpoints[0].split('_')[2].replace('.json', ''));
        const oldestTimestamp = parseInt(checkpoints[checkpoints.length - 1].split('_')[2].replace('.json', ''));
        return {
            totalCheckpoints: checkpoints.length,
            latestTimestamp,
            oldestTimestamp
        };
    }
    /**
     * Delete all checkpoints for a model
     */
    async deleteAllCheckpoints(modelId) {
        const checkpoints = this.listCheckpoints(modelId);
        for (const file of checkpoints) {
            const filepath = path.join(this.checkpointDir, file);
            fs.unlinkSync(filepath);
        }
        console.log(`🗑️ [CHECKPOINT] Deleted ${checkpoints.length} checkpoints for ${modelId}`);
    }
}
exports.ModelCheckpointManager = ModelCheckpointManager;
