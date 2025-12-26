/**
 * 🧠 ML Model Checkpoint System
 * Purpose: Persist ML model state between bot restarts
 * Author: Enterprise ML Team
 * Date: December 9, 2025
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * ML Model checkpoint data structure
 */
export interface MLCheckpoint {
  version: string;
  timestamp: number;
  modelId: string;
  
  // Learning state
  episodes: number;
  totalReward: number;
  averageReward: number;
  explorationRate: number;
  
  // Performance metrics
  performance: {
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    totalTrades: number;
    profitableTrades: number;
  };
  
  // Model weights (simplified - can be extended for TensorFlow/PyTorch)
  modelWeights?: any;
  
  // Configuration
  config: {
    algorithm: string;
    learningRate: number;
    gamma: number;
    epsilon: number;
  };
  
  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Checkpoint save/load result
 */
export interface CheckpointResult {
  success: boolean;
  message: string;
  checkpoint?: MLCheckpoint;
  error?: string;
}

/**
 * Model Checkpoint Manager
 * Handles saving and loading ML model state
 */
export class ModelCheckpointManager {
  private checkpointDir: string;
  private maxCheckpoints: number;
  private autoSaveInterval: number | null;
  private autoSaveTimer?: NodeJS.Timeout;
  
  constructor(
    checkpointDir: string = './data/ml_checkpoints',
    maxCheckpoints: number = 10
  ) {
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
  async saveCheckpoint(checkpoint: MLCheckpoint): Promise<CheckpointResult> {
    try {
      const filename = this.generateFilename(checkpoint.modelId, checkpoint.timestamp);
      const filepath = path.join(this.checkpointDir, filename);
      
      // Add metadata
      const fullCheckpoint: MLCheckpoint = {
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
      fs.writeFileSync(
        filepath,
        JSON.stringify(fullCheckpoint, null, 2),
        'utf-8'
      );
      
      console.log(`💾 [CHECKPOINT] Saved: ${filename}`);
      console.log(`   Episodes: ${checkpoint.episodes}, Reward: ${checkpoint.totalReward.toFixed(2)}, Win Rate: ${(checkpoint.performance.winRate * 100).toFixed(1)}%`);
      
      // Cleanup old checkpoints
      await this.cleanupOldCheckpoints(checkpoint.modelId);
      
      return {
        success: true,
        message: `Checkpoint saved: ${filename}`,
        checkpoint: fullCheckpoint
      };
      
    } catch (error) {
      console.error(`❌ [CHECKPOINT] Save failed: ${(error as Error).message}`);
      return {
        success: false,
        message: 'Failed to save checkpoint',
        error: (error as Error).message
      };
    }
  }
  
  /**
   * Load latest ML model checkpoint
   */
  async loadLatestCheckpoint(modelId: string): Promise<CheckpointResult> {
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
      const checkpoint: MLCheckpoint = JSON.parse(data);
      
      console.log(`📂 [CHECKPOINT] Loaded: ${latestFile}`);
      console.log(`   Episodes: ${checkpoint.episodes}, Reward: ${checkpoint.totalReward.toFixed(2)}, Win Rate: ${(checkpoint.performance.winRate * 100).toFixed(1)}%`);
      
      return {
        success: true,
        message: `Checkpoint loaded: ${latestFile}`,
        checkpoint
      };
      
    } catch (error) {
      console.error(`❌ [CHECKPOINT] Load failed: ${(error as Error).message}`);
      return {
        success: false,
        message: 'Failed to load checkpoint',
        error: (error as Error).message
      };
    }
  }
  
  /**
   * Enable auto-save (save checkpoint every N milliseconds)
   */
  enableAutoSave(intervalMs: number, saveCallback: () => MLCheckpoint): void {
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
  disableAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
      console.log(`⏸️ [CHECKPOINT] Auto-save disabled`);
    }
  }
  
  /**
   * List all checkpoints for a model (sorted by timestamp descending)
   */
  private listCheckpoints(modelId: string): string[] {
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
  private async cleanupOldCheckpoints(modelId: string): Promise<void> {
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
  private generateFilename(modelId: string, timestamp: number): string {
    return `checkpoint_${modelId}_${timestamp}.json`;
  }
  
  /**
   * Get checkpoint statistics
   */
  getStats(modelId: string): {
    totalCheckpoints: number;
    latestTimestamp: number | null;
    oldestTimestamp: number | null;
  } {
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
  async deleteAllCheckpoints(modelId: string): Promise<void> {
    const checkpoints = this.listCheckpoints(modelId);
    
    for (const file of checkpoints) {
      const filepath = path.join(this.checkpointDir, file);
      fs.unlinkSync(filepath);
    }
    
    console.log(`🗑️ [CHECKPOINT] Deleted ${checkpoints.length} checkpoints for ${modelId}`);
  }
}
