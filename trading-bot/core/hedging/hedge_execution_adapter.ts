/**
 * 🔗 HEDGE EXECUTION ADAPTER
 * 
 * Adapter that allows any executor (OKXExecutorAdapter, SimulatedExecutor) 
 * to work as HedgeExecutionEngine for the Auto-Hedging System.
 * 
 * This enables seamless integration between hedging system and live/simulated execution.
 */

import { Logger } from '../../infrastructure/logging/logger';
import { HedgeExecutionEngine } from './auto_hedging_engine';
import { OrderRequest, Order } from '../types/order';

/**
 * Generic executor interface that covers both OKXExecutorAdapter and SimulatedExecutor
 */
export interface GenericExecutor {
    placeOrder(request: OrderRequest): Promise<Order>;
    cancelOrder(orderId: string): Promise<boolean>;
}

/**
 * Hedge Execution Adapter - bridges any executor to hedge execution engine
 */
export class HedgeExecutionAdapter implements HedgeExecutionEngine {
    private logger: Logger;
    private executor: GenericExecutor;

    constructor(logger: Logger, executor: GenericExecutor) {
        this.logger = logger;
        this.executor = executor;
    }

    /**
     * Execute hedge order via the underlying executor
     */
    async placeOrder(request: OrderRequest): Promise<Order> {
        try {
            this.logger.info(`🛡️ [HEDGE] Executing hedge order: ${request.side} ${request.quantity} ${request.symbol}`);
            
            // Add hedge identifier to strategy ID
            const hedgeRequest: OrderRequest = {
                ...request,
                strategyId: request.strategyId || 'auto_hedge'
            };

            const result = await this.executor.placeOrder(hedgeRequest);
            
            this.logger.info(`✅ [HEDGE] Hedge order executed: ${result.id} status: ${result.status}`);
            return result;
            
        } catch (error: any) {
            this.logger.error(`❌ [HEDGE] Hedge order execution failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Cancel hedge order via the underlying executor
     */
    async cancelOrder(orderId: string): Promise<boolean> {
        try {
            this.logger.info(`🚫 [HEDGE] Cancelling hedge order: ${orderId}`);
            
            const result = await this.executor.cancelOrder(orderId);
            
            if (result) {
                this.logger.info(`✅ [HEDGE] Hedge order cancelled: ${orderId}`);
            } else {
                this.logger.warn(`⚠️ [HEDGE] Failed to cancel hedge order: ${orderId}`);
            }
            
            return result;
            
        } catch (error: any) {
            this.logger.error(`❌ [HEDGE] Cancel hedge order failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Get information about the underlying executor
     */
    getExecutorInfo(): { type: string; isLive: boolean } {
        const executorName = this.executor.constructor.name;
        return {
            type: executorName,
            isLive: executorName.includes('OKX')
        };
    }
}

export default HedgeExecutionAdapter;
