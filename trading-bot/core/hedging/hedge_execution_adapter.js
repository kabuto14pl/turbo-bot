"use strict";
/**
 * 🔗 HEDGE EXECUTION ADAPTER
 *
 * Adapter that allows any executor (OKXExecutorAdapter, SimulatedExecutor)
 * to work as HedgeExecutionEngine for the Auto-Hedging System.
 *
 * This enables seamless integration between hedging system and live/simulated execution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HedgeExecutionAdapter = void 0;
/**
 * Hedge Execution Adapter - bridges any executor to hedge execution engine
 */
class HedgeExecutionAdapter {
    constructor(logger, executor) {
        this.logger = logger;
        this.executor = executor;
    }
    /**
     * Execute hedge order via the underlying executor
     */
    async placeOrder(request) {
        try {
            this.logger.info(`🛡️ [HEDGE] Executing hedge order: ${request.side} ${request.quantity} ${request.symbol}`);
            // Add hedge identifier to strategy ID
            const hedgeRequest = {
                ...request,
                strategyId: request.strategyId || 'auto_hedge'
            };
            const result = await this.executor.placeOrder(hedgeRequest);
            this.logger.info(`✅ [HEDGE] Hedge order executed: ${result.id} status: ${result.status}`);
            return result;
        }
        catch (error) {
            this.logger.error(`❌ [HEDGE] Hedge order execution failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Cancel hedge order via the underlying executor
     */
    async cancelOrder(orderId) {
        try {
            this.logger.info(`🚫 [HEDGE] Cancelling hedge order: ${orderId}`);
            const result = await this.executor.cancelOrder(orderId);
            if (result) {
                this.logger.info(`✅ [HEDGE] Hedge order cancelled: ${orderId}`);
            }
            else {
                this.logger.warn(`⚠️ [HEDGE] Failed to cancel hedge order: ${orderId}`);
            }
            return result;
        }
        catch (error) {
            this.logger.error(`❌ [HEDGE] Cancel hedge order failed: ${error.message}`);
            return false;
        }
    }
    /**
     * Get information about the underlying executor
     */
    getExecutorInfo() {
        const executorName = this.executor.constructor.name;
        return {
            type: executorName,
            isLive: executorName.includes('OKX')
        };
    }
}
exports.HedgeExecutionAdapter = HedgeExecutionAdapter;
exports.default = HedgeExecutionAdapter;
