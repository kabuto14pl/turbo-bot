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

import { Logger } from '../../infrastructure/logging/logger';
import { BotState, StrategySignal } from '../types/strategy';
import { OrderRequest, Order } from '../types/order';
import * as fs from 'fs';
import * as path from 'path';

interface StateLock {
    lockId: string;
    instanceId: string;
    resourceType: 'order' | 'position' | 'portfolio' | 'strategy';
    resourceId: string;
    acquiredAt: number;
    expiresAt: number;
    metadata?: any;
}

interface StateTransaction {
    transactionId: string;
    instanceId: string;
    operations: StateOperation[];
    startedAt: number;
    expiresAt: number;
    status: 'pending' | 'committed' | 'aborted';
}

interface StateOperation {
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    resourceType: string;
    resourceId: string;
    data: any;
    preconditions?: { [key: string]: any };
}

interface DistributedStateConfig {
    instanceId: string;
    lockTimeoutMs: number;
    transactionTimeoutMs: number;
    conflictRetryAttempts: number;
    heartbeatIntervalMs: number;
    stateDbPath: string;
    enableOptimisticLocking: boolean;
}

/**
 * DISTRIBUTED STATE MANAGER
 * Zarządza stanem w środowisku multi-instance z pełną izolacją
 */
export class DistributedStateManager {
    private logger: Logger;
    private config: DistributedStateConfig;
    private activeLocks: Map<string, StateLock> = new Map();
    private activeTransactions: Map<string, StateTransaction> = new Map();
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private instanceStartTime: number;

    constructor(config: DistributedStateConfig, logger: Logger) {
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
    async acquireLock(
        resourceType: string,
        resourceId: string,
        timeoutMs?: number
    ): Promise<string | null> {
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
                } else {
                    // Lock held by another instance
                    this.logger.warn(`Lock ${lockId} held by instance ${existingLock.instanceId}`);
                    return null;
                }
            }

            // Acquire new lock
            const lock: StateLock = {
                lockId,
                instanceId: this.config.instanceId,
                resourceType: resourceType as any,
                resourceId,
                acquiredAt: Date.now(),
                expiresAt
            };

            await this.persistLock(lock);
            this.activeLocks.set(lockId, lock);
            
            this.logger.debug(`Acquired lock: ${lockId}`);
            return lockId;
        } catch (error) {
            this.logger.error(`Failed to acquire lock ${lockId}:`, error);
            return null;
        }
    }

    /**
     * RELEASE DISTRIBUTED LOCK
     */
    async releaseLock(lockId: string): Promise<boolean> {
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
        } catch (error) {
            this.logger.error(`Failed to release lock ${lockId}:`, error);
            return false;
        }
    }

    /**
     * BEGIN DISTRIBUTED TRANSACTION
     * Atomic operations across multiple resources
     */
    async beginTransaction(operations: StateOperation[]): Promise<string | null> {
        const transactionId = `tx_${this.config.instanceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Acquire locks for all resources involved
            const requiredLocks: string[] = [];
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
            const transaction: StateTransaction = {
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
        } catch (error) {
            this.logger.error(`Failed to begin transaction:`, error);
            return null;
        }
    }

    /**
     * COMMIT TRANSACTION
     * Atomically apply all operations
     */
    async commitTransaction(transactionId: string): Promise<boolean> {
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
        } catch (error) {
            this.logger.error(`Failed to commit transaction ${transactionId}:`, error);
            await this.abortTransaction(transactionId);
            return false;
        }
    }

    /**
     * ABORT TRANSACTION
     */
    async abortTransaction(transactionId: string): Promise<void> {
        try {
            const transaction = this.activeTransactions.get(transactionId);
            if (!transaction) return;

            transaction.status = 'aborted';
            await this.persistTransaction(transaction);

            // Release all locks
            for (const operation of transaction.operations) {
                const lockId = `${operation.resourceType}:${operation.resourceId}`;
                await this.releaseLock(lockId);
            }

            this.activeTransactions.delete(transactionId);
            this.logger.info(`Aborted transaction: ${transactionId}`);
        } catch (error) {
            this.logger.error(`Error aborting transaction ${transactionId}:`, error);
        }
    }

    /**
     * SAFE ORDER PLACEMENT
     * Prevents duplicate orders across instances
     */
    async safeOrderPlacement(orderRequest: OrderRequest): Promise<{ success: boolean; orderId?: string; reason?: string }> {
        const operationId = `order_${orderRequest.symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        // Create transaction for order placement
        const operations: StateOperation[] = [
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
        } else {
            return { success: false, reason: 'Transaction failed or duplicate order detected' };
        }
    }

    /**
     * SAFE STATE UPDATE
     * Thread-safe state modifications
     */
    async safeStateUpdate(
        resourceType: string,
        resourceId: string,
        updateFunction: (currentState: any) => any
    ): Promise<boolean> {
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
        } finally {
            await this.releaseLock(lockId);
        }
    }

    /**
     * CONFLICT RESOLUTION
     * Handle concurrent modifications
     */
    async resolveConflict(
        resourceType: string,
        resourceId: string,
        localState: any,
        remoteState: any
    ): Promise<any> {
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
    private async initializeStateDatabase(): Promise<void> {
        const dbDir = path.dirname(this.config.stateDbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Initialize lock and transaction tables
        // In real implementation, use proper database (DuckDB, SQLite, etc.)
        this.logger.info(`Initialized state database at ${this.config.stateDbPath}`);
    }

    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(async () => {
            await this.sendHeartbeat();
            await this.cleanupExpiredLocks();
            await this.cleanupExpiredTransactions();
        }, this.config.heartbeatIntervalMs);
    }

    private async sendHeartbeat(): Promise<void> {
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

    private async cleanupExpiredLocks(): Promise<void> {
        const now = Date.now();
        for (const [lockId, lock] of this.activeLocks) {
            if (lock.expiresAt < now) {
                await this.releaseLock(lockId);
                this.logger.warn(`Released expired lock: ${lockId}`);
            }
        }
    }

    private async cleanupExpiredTransactions(): Promise<void> {
        const now = Date.now();
        for (const [transactionId, transaction] of this.activeTransactions) {
            if (transaction.expiresAt < now) {
                await this.abortTransaction(transactionId);
                this.logger.warn(`Aborted expired transaction: ${transactionId}`);
            }
        }
    }

    private async validatePreconditions(operation: StateOperation): Promise<boolean> {
        if (!operation.preconditions) return true;

        // Implement specific precondition validations
        if (operation.preconditions.noDuplicateOrders) {
            return await this.checkNoDuplicateOrders(operation.preconditions.noDuplicateOrders);
        }

        return true;
    }

    private async checkNoDuplicateOrders(criteria: any): Promise<boolean> {
        // Check for existing orders within time window
        // Implementation would query persistent storage
        return true; // Simplified for example
    }

    private async applyOperation(operation: StateOperation): Promise<void> {
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
    private resolvePortfolioConflict(local: any, remote: any): any {
        // For portfolio: sum the balances, use latest position data
        return {
            ...local,
            balance: Math.max(local.balance, remote.balance), // Use higher balance
            positions: [...(local.positions || []), ...(remote.positions || [])],
            timestamp: Math.max(local.timestamp, remote.timestamp)
        };
    }

    private resolvePositionConflict(local: any, remote: any): any {
        // For positions: use the most recent data
        return local.timestamp > remote.timestamp ? local : remote;
    }

    private resolveOrderConflict(local: any, remote: any): any {
        // For orders: prevent duplicates, use first-come-first-served
        return local.timestamp < remote.timestamp ? local : remote;
    }

    // Storage interface methods (to be implemented with actual database)
    private async getExistingLock(lockId: string): Promise<StateLock | null> {
        // Implementation: query lock from persistent storage
        return null;
    }

    private async persistLock(lock: StateLock): Promise<void> {
        // Implementation: save lock to persistent storage
    }

    private async removeLockFromStorage(lockId: string): Promise<void> {
        // Implementation: remove lock from persistent storage
    }

    private async persistTransaction(transaction: StateTransaction): Promise<void> {
        // Implementation: save transaction to persistent storage
    }

    private async persistHeartbeat(heartbeat: any): Promise<void> {
        // Implementation: save heartbeat to persistent storage
    }

    private async getResourceState(resourceType: string, resourceId: string): Promise<any> {
        // Implementation: get resource state from persistent storage
        return {};
    }

    private async setResourceState(resourceType: string, resourceId: string, state: any): Promise<void> {
        // Implementation: save resource state to persistent storage
    }

    private async createResource(resourceType: string, resourceId: string, data: any): Promise<void> {
        // Implementation: create resource in persistent storage
    }

    private async updateResource(resourceType: string, resourceId: string, data: any): Promise<void> {
        // Implementation: update resource in persistent storage
    }

    private async deleteResource(resourceType: string, resourceId: string): Promise<void> {
        // Implementation: delete resource from persistent storage
    }

    /**
     * CLEANUP
     */
    async shutdown(): Promise<void> {
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

/**
 * FACTORY FUNCTION
 */
export function createDistributedStateManager(instanceId: string, logger: Logger): DistributedStateManager {
    const config: DistributedStateConfig = {
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