"use strict";
/**
 * 🚀 OKX EXECUTOR ADAPTER
 *
 * Adapter zapewniający kompatybilność między OKXExecutionEngine
 * a interfejsem używanym w main.ts (SimulatedExecutor-like interface)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OKXExecutorAdapter = void 0;
const okx_execution_engine_1 = require("./okx_execution_engine");
/**
 * 🛡️ OKX EXECUTOR ADAPTER
 *
 * Provides SimulatedExecutor-compatible interface for OKX live trading
 */
class OKXExecutorAdapter {
    constructor(logger, portfolio, riskManager, config) {
        this.pendingOrders = [];
        this.nextOrderId = 1;
        this.logger = logger;
        this.portfolio = portfolio;
        this.riskManager = riskManager;
        // Initialize OKX Engine
        this.okxEngine = new okx_execution_engine_1.OKXExecutionEngine({
            apiKey: config.apiKey,
            secretKey: config.secretKey,
            passphrase: config.passphrase,
            sandbox: config.sandbox
        });
    }
    getRiskManager() {
        return this.riskManager;
    }
    /**
     * 🎯 MAIN ORDER PLACEMENT METHOD
     *
     * Converts OrderRequest to OKX format and executes via OKX API
     */
    async placeOrder(req) {
        try {
            this.logger.info(`🚀 [OKX LIVE] Placing ${req.type} order: ${req.side} ${req.quantity} ${req.symbol} @ ${req.price || 'MARKET'}`);
            // Validate order
            const quantity = req.quantity || req.size || 0;
            if (quantity <= 0) {
                throw new Error('Invalid order quantity');
            }
            // Convert OrderRequest to OKX format
            const okxOrderRequest = {
                symbol: req.symbol,
                side: req.side.toUpperCase(),
                type: req.type.toUpperCase(),
                quantity: quantity,
                price: req.price,
                stopPrice: req.stopPrice
            };
            // Execute order via OKX API
            const okxResponse = await this.okxEngine.executeOrder(okxOrderRequest);
            if (!okxResponse.success) {
                this.logger.error(`❌ [OKX LIVE] Order failed: ${okxResponse.error}`);
                throw new Error(`OKX Order Failed: ${okxResponse.error}`);
            }
            // Convert OKX response to Order format
            const order = {
                id: okxResponse.orderId || `okx_${this.nextOrderId++}`,
                symbol: req.symbol,
                side: req.side,
                type: req.type,
                quantity: quantity,
                size: quantity,
                price: req.price,
                stopPrice: req.stopPrice,
                status: okxResponse.status === '0' ? 'filled' : 'pending',
                strategyId: req.strategyId || 'okx_live',
                executedAt: Date.now(),
                executedPrice: okxResponse.price || req.price,
                pnl: null // Will be calculated by portfolio
            };
            // Update portfolio if order was filled
            if (order.status === 'filled') {
                this.updatePortfolioFromOrder(order);
                this.logger.info(`✅ [OKX LIVE] Order filled: ${order.id} at ${order.executedPrice}`);
            }
            else {
                // Add to pending orders for tracking
                this.pendingOrders.push(order);
                this.logger.info(`⏳ [OKX LIVE] Order pending: ${order.id}`);
            }
            return order;
        }
        catch (error) {
            this.logger.error(`❌ [OKX LIVE] Order placement failed: ${error}`);
            throw error;
        }
    }
    /**
     * 🚫 CANCEL ORDER
     */
    async cancelOrder(orderId) {
        try {
            this.logger.info(`🚫 [OKX LIVE] Cancelling order: ${orderId}`);
            // Remove from pending orders
            const orderIndex = this.pendingOrders.findIndex(o => o.id === orderId);
            if (orderIndex >= 0) {
                this.pendingOrders.splice(orderIndex, 1);
                this.logger.info(`✅ [OKX LIVE] Order cancelled: ${orderId}`);
                return true;
            }
            return false;
        }
        catch (error) {
            this.logger.error(`❌ [OKX LIVE] Cancel order failed: ${error}`);
            return false;
        }
    }
    /**
     * 📊 CHECK PENDING ORDERS
     *
     * For live trading, this would typically query OKX API for order status
     */
    async checkPendingOrders(candle) {
        const executedOrders = [];
        // In a real implementation, we would:
        // 1. Query OKX API for order status updates
        // 2. Update order statuses
        // 3. Return filled orders
        // For now, we'll return empty array as OKX orders are typically filled immediately
        // or handled via websocket feeds in production
        return executedOrders;
    }
    /**
     * 📈 UPDATE PORTFOLIO FROM ORDER
     */
    updatePortfolioFromOrder(order) {
        try {
            // This would typically be handled by the Portfolio class
            // Here we just log the trade for tracking
            this.logger.info(`💰 [OKX LIVE] Portfolio update: ${order.side} ${order.size} ${order.symbol} @ ${order.executedPrice}`);
        }
        catch (error) {
            this.logger.error(`❌ [OKX LIVE] Portfolio update failed: ${error}`);
        }
    }
    /**
     * 🔍 GET ACCOUNT BALANCE (OKX API)
     */
    async getAccountBalance() {
        try {
            return await this.okxEngine.getAccountBalance();
        }
        catch (error) {
            this.logger.error(`❌ [OKX LIVE] Get balance failed: ${error}`);
            throw error;
        }
    }
    /**
     * 🧹 CLEANUP
     */
    async cleanup() {
        this.logger.info('🧹 [OKX LIVE] Cleaning up OKX connections...');
        // Cleanup any persistent connections, websockets, etc.
    }
}
exports.OKXExecutorAdapter = OKXExecutorAdapter;
exports.default = OKXExecutorAdapter;
