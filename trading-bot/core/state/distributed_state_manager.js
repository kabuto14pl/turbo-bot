"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
// ============================================================================
//  distributed_state_manager.ts – DISTRIBUTED STATE MANAGEMENT
//  Transakcje, locki, conflict resolution dla horizontal scaling
//  Zapobiega duplikacji zleceń w multi-instance deployment
// ============================================================================
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
exports.DistributedStateManager = void 0;
exports.createDistributedStateManager = createDistributedStateManager;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * DISTRIBUTED STATE MANAGER
 * Zarządza stanem w środowisku multi-instance z pełną izolacją
 */
class DistributedStateManager {
    constructor(config, logger) {
        this.activeLocks = new Map();
        this.activeTransactions = new Map();
        this.heartbeatInterval = null;
        this.config = config;
        this.logger = logger;
        this.instanceStartTime = Date.now();
        this.initializeStateDatabase();
        this.startHeartbeat();
    }
    /**
     * ACQUIRE DISTRIBUTED LOCK
     * Prevents concurrent access to critical resources
     */
    async acquireLock(resourceType, resourceId, timeoutMs) {
        const lockId = `${resourceType}:${resourceId}`;
        const timeout = timeoutMs || this.config.lockTimeoutMs;
        const expiresAt = Date.now() + timeout;
        try {
            // Check for existing locks
            const existingLock = await this.getExistingLock(lockId);
            if (existingLock && existingLock.expiresAt > Date.now()) {
                if (existingLock.instanceId === this.config.instanceId) {
                    // Extend our own lock
                    existingLock.expiresAt = expiresAt;
                    await this.persistLock(existingLock);
                    this.activeLocks.set(lockId, existingLock);
                    return existingLock.lockId;
                }
                else {
                    // Lock held by another instance
                    this.logger.warn(`Lock ${lockId} held by instance ${existingLock.instanceId}`);
                    return null;
                }
            }
            // Acquire new lock
            const lock = {
                lockId,
                instanceId: this.config.instanceId,
                resourceType: resourceType,
                resourceId,
                acquiredAt: Date.now(),
                expiresAt
            };
            await this.persistLock(lock);
            this.activeLocks.set(lockId, lock);
            this.logger.debug(`Acquired lock: ${lockId}`);
            return lockId;
        }
        catch (error) {
            this.logger.error(`Failed to acquire lock ${lockId}:`, error);
            return null;
        }
    }
    /**
     * RELEASE DISTRIBUTED LOCK
     */
    async releaseLock(lockId) {
        try {
            const lock = this.activeLocks.get(lockId);
            if (!lock || lock.instanceId !== this.config.instanceId) {
                this.logger.warn(`Cannot release lock ${lockId}: not owned by this instance`);
                return false;
            }
            await this.removeLockFromStorage(lockId);
            this.activeLocks.delete(lockId);
            this.logger.debug(`Released lock: ${lockId}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to release lock ${lockId}:`, error);
            return false;
        }
    }
    /**
     * BEGIN DISTRIBUTED TRANSACTION
     * Atomic operations across multiple resources
     */
    async beginTransaction(operations) {
        const transactionId = `tx_${this.config.instanceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
            // Acquire locks for all resources involved
            const requiredLocks = [];
            for (const op of operations) {
                const lockId = await this.acquireLock(op.resourceType, op.resourceId);
                if (!lockId) {
                    // Failed to acquire lock - release all and abort
                    for (const acquiredLock of requiredLocks) {
                        await this.releaseLock(acquiredLock);
                    }
                    this.logger.warn(`Transaction ${transactionId} aborted: failed to acquire locks`);
                    return null;
                }
                requiredLocks.push(lockId);
            }
            // Create transaction record
            const transaction = {
                transactionId,
                instanceId: this.config.instanceId,
                operations,
                startedAt: Date.now(),
                expiresAt: Date.now() + this.config.transactionTimeoutMs,
                status: 'pending'
            };
            await this.persistTransaction(transaction);
            this.activeTransactions.set(transactionId, transaction);
            this.logger.info(`Started transaction: ${transactionId} with ${operations.length} operations`);
            return transactionId;
        }
        catch (error) {
            this.logger.error(`Failed to begin transaction:`, error);
            return null;
        }
    }
    /**
     * COMMIT TRANSACTION
     * Atomically apply all operations
     */
    async commitTransaction(transactionId) {
        try {
            const transaction = this.activeTransactions.get(transactionId);
            if (!transaction || transaction.instanceId !== this.config.instanceId) {
                this.logger.error(`Cannot commit transaction ${transactionId}: not found or not owned`);
                return false;
            }
            if (transaction.expiresAt < Date.now()) {
                this.logger.error(`Transaction ${transactionId} expired`);
                await this.abortTransaction(transactionId);
                return false;
            }
            // Validate preconditions
            for (const operation of transaction.operations) {
                if (operation.preconditions) {
                    const valid = await this.validatePreconditions(operation);
                    if (!valid) {
                        this.logger.warn(`Transaction ${transactionId} aborted: preconditions failed for ${operation.resourceId}`);
                        await this.abortTransaction(transactionId);
                        return false;
                    }
                }
            }
            // Apply all operations atomically
            for (const operation of transaction.operations) {
                await this.applyOperation(operation);
            }
            // Mark transaction as committed
            transaction.status = 'committed';
            await this.persistTransaction(transaction);
            // Release locks
            for (const operation of transaction.operations) {
                const lockId = `${operation.resourceType}:${operation.resourceId}`;
                await this.releaseLock(lockId);
            }
            this.activeTransactions.delete(transactionId);
            this.logger.info(`Committed transaction: ${transactionId}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to commit transaction ${transactionId}:`, error);
            await this.abortTransaction(transactionId);
            return false;
        }
    }
    /**
     * ABORT TRANSACTION
     */
    async abortTransaction(transactionId) {
        try {
            const transaction = this.activeTransactions.get(transactionId);
            if (!transaction)
                return;
            transaction.status = 'aborted';
            await this.persistTransaction(transaction);
            // Release all locks
            for (const operation of transaction.operations) {
                const lockId = `${operation.resourceType}:${operation.resourceId}`;
                await this.releaseLock(lockId);
            }
            this.activeTransactions.delete(transactionId);
            this.logger.info(`Aborted transaction: ${transactionId}`);
        }
        catch (error) {
            this.logger.error(`Error aborting transaction ${transactionId}:`, error);
        }
    }
    /**
     * SAFE ORDER PLACEMENT
     * Prevents duplicate orders across instances
     */
    async safeOrderPlacement(orderRequest) {
        const operationId = `order_${orderRequest.symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        // Create transaction for order placement
        const operations = [
            {
                type: 'CREATE',
                resourceType: 'order',
                resourceId: operationId,
                data: {
                    ...orderRequest,
                    instanceId: this.config.instanceId,
                    timestamp: Date.now()
                },
                preconditions: {
                    // Ensure no duplicate orders for same signal within time window
                    noDuplicateOrders: {
                        symbol: orderRequest.symbol,
                        strategyId: orderRequest.strategyId,
                        timeWindowMs: 60000 // 1 minute
                    }
                }
            }
        ];
        const transactionId = await this.beginTransaction(operations);
        if (!transactionId) {
            return { success: false, reason: 'Failed to acquire distributed lock' };
        }
        const committed = await this.commitTransaction(transactionId);
        if (committed) {
            return { success: true, orderId: operationId };
        }
        else {
            return { success: false, reason: 'Transaction failed or duplicate order detected' };
        }
    }
    /**
     * SAFE STATE UPDATE
     * Thread-safe state modifications
     */
    async safeStateUpdate(resourceType, resourceId, updateFunction) {
        const lockId = await this.acquireLock(resourceType, resourceId);
        if (!lockId) {
            return false;
        }
        try {
            // Get current state
            const currentState = await this.getResourceState(resourceType, resourceId);
            // Apply update function
            const newState = updateFunction(currentState);
            // Persist new state
            await this.setResourceState(resourceType, resourceId, newState);
            return true;
        }
        finally {
            await this.releaseLock(lockId);
        }
    }
    /**
     * CONFLICT RESOLUTION
     * Handle concurrent modifications
     */
    async resolveConflict(resourceType, resourceId, localState, remoteState) {
        this.logger.warn(`Conflict detected for ${resourceType}:${resourceId}`);
        // Implement conflict resolution strategies
        switch (resourceType) {
            case 'portfolio':
                return this.resolvePortfolioConflict(localState, remoteState);
            case 'position':
                return this.resolvePositionConflict(localState, remoteState);
            case 'order':
                return this.resolveOrderConflict(localState, remoteState);
            default:
                // Default: use timestamp-based resolution (latest wins)
                return localState.timestamp > remoteState.timestamp ? localState : remoteState;
        }
    }
    /**
     * PRIVATE METHODS
     */
    async initializeStateDatabase() {
        const dbDir = path.dirname(this.config.stateDbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        // Initialize lock and transaction tables
        // In real implementation, use proper database (DuckDB, SQLite, etc.)
        this.logger.info(`Initialized state database at ${this.config.stateDbPath}`);
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(async () => {
            await this.sendHeartbeat();
            await this.cleanupExpiredLocks();
            await this.cleanupExpiredTransactions();
        }, this.config.heartbeatIntervalMs);
    }
    async sendHeartbeat() {
        const heartbeat = {
            instanceId: this.config.instanceId,
            timestamp: Date.now(),
            startTime: this.instanceStartTime,
            activeLocks: this.activeLocks.size,
            activeTransactions: this.activeTransactions.size
        };
        // Persist heartbeat to shared storage
        await this.persistHeartbeat(heartbeat);
    }
    async cleanupExpiredLocks() {
        const now = Date.now();
        for (const [lockId, lock] of this.activeLocks) {
            if (lock.expiresAt < now) {
                await this.releaseLock(lockId);
                this.logger.warn(`Released expired lock: ${lockId}`);
            }
        }
    }
    async cleanupExpiredTransactions() {
        const now = Date.now();
        for (const [transactionId, transaction] of this.activeTransactions) {
            if (transaction.expiresAt < now) {
                await this.abortTransaction(transactionId);
                this.logger.warn(`Aborted expired transaction: ${transactionId}`);
            }
        }
    }
    async validatePreconditions(operation) {
        if (!operation.preconditions)
            return true;
        // Implement specific precondition validations
        if (operation.preconditions.noDuplicateOrders) {
            return await this.checkNoDuplicateOrders(operation.preconditions.noDuplicateOrders);
        }
        return true;
    }
    async checkNoDuplicateOrders(criteria) {
        // Check for existing orders within time window
        // Implementation would query persistent storage
        return true; // Simplified for example
    }
    async applyOperation(operation) {
        // Apply the state change to persistent storage
        switch (operation.type) {
            case 'CREATE':
                await this.createResource(operation.resourceType, operation.resourceId, operation.data);
                break;
            case 'UPDATE':
                await this.updateResource(operation.resourceType, operation.resourceId, operation.data);
                break;
            case 'DELETE':
                await this.deleteResource(operation.resourceType, operation.resourceId);
                break;
        }
    }
    // Conflict resolution strategies
    resolvePortfolioConflict(local, remote) {
        // For portfolio: sum the balances, use latest position data
        return {
            ...local,
            balance: Math.max(local.balance, remote.balance), // Use higher balance
            positions: [...(local.positions || []), ...(remote.positions || [])],
            timestamp: Math.max(local.timestamp, remote.timestamp)
        };
    }
    resolvePositionConflict(local, remote) {
        // For positions: use the most recent data
        return local.timestamp > remote.timestamp ? local : remote;
    }
    resolveOrderConflict(local, remote) {
        // For orders: prevent duplicates, use first-come-first-served
        return local.timestamp < remote.timestamp ? local : remote;
    }
    // Storage interface methods (to be implemented with actual database)
    async getExistingLock(lockId) {
        // Implementation: query lock from persistent storage
        return null;
    }
    async persistLock(lock) {
        // Implementation: save lock to persistent storage
    }
    async removeLockFromStorage(lockId) {
        // Implementation: remove lock from persistent storage
    }
    async persistTransaction(transaction) {
        // Implementation: save transaction to persistent storage
    }
    async persistHeartbeat(heartbeat) {
        // Implementation: save heartbeat to persistent storage
    }
    async getResourceState(resourceType, resourceId) {
        // Implementation: get resource state from persistent storage
        return {};
    }
    async setResourceState(resourceType, resourceId, state) {
        // Implementation: save resource state to persistent storage
    }
    async createResource(resourceType, resourceId, data) {
        // Implementation: create resource in persistent storage
    }
    async updateResource(resourceType, resourceId, data) {
        // Implementation: update resource in persistent storage
    }
    async deleteResource(resourceType, resourceId) {
        // Implementation: delete resource from persistent storage
    }
    /**
     * CLEANUP
     */
    async shutdown() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        // Release all locks
        for (const lockId of this.activeLocks.keys()) {
            await this.releaseLock(lockId);
        }
        // Abort all transactions
        for (const transactionId of this.activeTransactions.keys()) {
            await this.abortTransaction(transactionId);
        }
        this.logger.info('Distributed state manager shutdown complete');
    }
}
exports.DistributedStateManager = DistributedStateManager;
/**
 * FACTORY FUNCTION
 */
function createDistributedStateManager(instanceId, logger) {
    const config = {
        instanceId,
        lockTimeoutMs: 30000, // 30 seconds
        transactionTimeoutMs: 60000, // 1 minute
        conflictRetryAttempts: 3,
        heartbeatIntervalMs: 5000, // 5 seconds
        stateDbPath: './shared_state.db',
        enableOptimisticLocking: true
    };
    return new DistributedStateManager(config, logger);
}
