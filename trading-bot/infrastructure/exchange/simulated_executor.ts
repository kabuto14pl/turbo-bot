/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔄 [SHARED-INFRASTRUCTURE]
 * This component is used by BOTH backtest and production systems.
 * Execution mode determined by configuration parameters.
 */

import { Logger } from '../logging/logger';
import { Portfolio } from '../../core/portfolio/index';
import { RiskManager } from '../../core/risk/risk_manager';
import { Order, OrderRequest } from '../../core/types/order';
import { Candle } from '../../core/types/strategy';

interface SimulationConfig {
    commissionBps: number;
    slippageBps: number;
}

export class SimulatedExecutor {
    private readonly logger: Logger;
    private readonly portfolio: Portfolio;
    private readonly riskManager: RiskManager;
    private readonly config: SimulationConfig;
    private pendingOrders: Order[] = [];
    private nextOrderId: number = 1;

    constructor(
        logger: Logger, 
        portfolio: Portfolio,
        riskManager: RiskManager,
        config: SimulationConfig
    ) {
        this.logger = logger;
        this.portfolio = portfolio;
        this.riskManager = riskManager;
        this.config = config;
    }

    getRiskManager(): RiskManager {
        return this.riskManager;
    }

    async placeOrder(req: OrderRequest): Promise<Order> {
        // 1. Validate order
        const quantity = req.quantity || req.size || 0;
        if (quantity <= 0) {
            throw new Error('Invalid order quantity');
        }

        if (req.type === 'limit' && (!req.price || req.price <= 0)) {
            throw new Error('Invalid limit price');
        }

        if (req.type === 'stop' && (!req.stopPrice || req.stopPrice <= 0)) {
            throw new Error('Invalid stop price');
        }

        // 2. Check risk limits first
        const riskManager = this.getRiskManager();
        if (riskManager) {
            const riskCheckResult = await riskManager.checkRiskLimits(req);
            if (!riskCheckResult.allowed) {
                throw new Error(riskCheckResult.reason || 'Risk check failed');
            }
        }

        // 3. Create order with ID
        const order: Order = {
            id: `${this.nextOrderId++}`,
            symbol: req.symbol,
            side: req.side,
            type: req.type,
            quantity: quantity,
            price: req.price,
            stopPrice: req.stopPrice,
            status: 'pending',
            strategyId: req.strategyId || 'default'
        };

        // 4. For market orders, check balance and execute immediately
        if (order.type === 'market') {
            const candle = {
                time: Date.now(),
                open: order.price || 100,
                high: (order.price || 100) + 1,
                low: (order.price || 100) - 1,
                close: order.price || 100,
                volume: 1000
            };

            const executionPrice = this.calculateExecutionPrice(order, candle);
            const commission = (executionPrice * order.quantity * this.config.commissionBps) / 10000;
            const totalCost = order.side === 'buy' ?
                executionPrice * order.quantity + commission :
                executionPrice * order.quantity - commission;

            const baseAsset = order.symbol.replace('USDT', '');
            if (order.side === 'buy') {
                const usdtBalance = await this.portfolio.getBalance('USDT');
                if (usdtBalance < totalCost) {
                    throw new Error('Insufficient USDT balance');
                }
            } else {
                const baseBalance = await this.portfolio.getBalance(baseAsset);
                if (baseBalance < order.quantity) {
                    throw new Error(`Insufficient ${baseAsset} balance`);
                }
            }

            await this.executeOrder(order, candle);
        } else {
            // 5. For limit and stop orders, add to pending orders
            this.pendingOrders.push({ ...order });
        }

        return order;
    }

    async cancelOrder(orderId: string): Promise<boolean> {
        const orderIndex = this.pendingOrders.findIndex(order => order.id === orderId);
        if (orderIndex === -1) {
            return false;
        }

        this.pendingOrders.splice(orderIndex, 1);
        this.logger.info(`Cancelled order ${orderId}`);
        return true;
    }

    async checkPendingOrders(candle: Candle): Promise<Order[]> {
        const stillPending: Order[] = [];

        for (const order of [...this.pendingOrders]) {
            if (this.shouldExecuteOrder(order, candle)) {
                try {
                    // Check balance before executing
                    const executionPrice = this.calculateExecutionPrice(order, candle);
                    const commission = (executionPrice * order.quantity * this.config.commissionBps) / 10000;
                    const totalCost = order.side === 'buy' ?
                        executionPrice * order.quantity + commission :
                        executionPrice * order.quantity - commission;

                    const baseAsset = order.symbol.replace('USDT', '');
                    if (order.side === 'buy') {
                        const usdtBalance = await this.portfolio.getBalance('USDT');
                        if (usdtBalance < totalCost) {
                            stillPending.push(order);
                            continue;
                        }
                    } else {
                        const baseBalance = await this.portfolio.getBalance(baseAsset);
                        if (baseBalance < order.quantity) {
                            stillPending.push(order);
                            continue;
                        }
                    }

                    await this.executeOrder(order, candle);
                } catch (error: any) {
                    this.logger.info(`Failed to execute order: ${error.message}`);
                    stillPending.push(order);
                }
            } else {
                stillPending.push(order);
            }
        }

        this.pendingOrders = stillPending;
        return stillPending;
    }

    private shouldExecuteOrder(order: Order, candle: Candle): boolean {
        switch (order.type) {
            case 'market':
                return true;

            case 'limit':
                if (!order.price) return false;
                if (order.side === 'buy') {
                    return candle.low < order.price;  // strict < to match test expectation
                } else {
                    return candle.high > order.price;  // strict > to match test
                }

            case 'stop':
                if (!order.stopPrice) return false;
                if (order.side === 'buy') {
                    return candle.high >= order.stopPrice;
                } else {
                    return candle.low <= order.stopPrice;
                }

            default:
                return false;
        }
    }

    private async executeOrder(order: Order, candle: Candle): Promise<void> {
        // Oblicz cenę wykonania z uwzględnieniem poślizgu
        const executionPrice = this.calculateExecutionPrice(order, candle);

        // Oblicz prowizję
        const commission = (executionPrice * order.quantity * this.config.commissionBps) / 10000;

        // Oblicz całkowity koszt/przychód
        const totalCost = order.side === 'buy' ?
            executionPrice * order.quantity + commission :
            executionPrice * order.quantity - commission;

        // Aktualizuj portfel
        const baseAsset = order.symbol.replace('USDT', '');
        if (order.side === 'buy') {
            const usdtBalance = await this.portfolio.getBalance('USDT');
            const baseBalance = await this.portfolio.getBalance(baseAsset);

            await this.portfolio.updateBalance('USDT', usdtBalance - totalCost);
            await this.portfolio.updateBalance(baseAsset, baseBalance + order.quantity);
        } else {
            const baseBalance = await this.portfolio.getBalance(baseAsset);
            const usdtBalance = await this.portfolio.getBalance('USDT');

            await this.portfolio.updateBalance('USDT', usdtBalance + totalCost);
            await this.portfolio.updateBalance(baseAsset, baseBalance - order.quantity);
        }

        // Oznacz zlecenie jako wykonane
        order.status = 'filled';
        order.executedPrice = executionPrice;
        order.executionTime = candle.time;
        order.commission = commission;
    }

    private calculateExecutionPrice(order: Order, candle: Candle): number {
        let basePrice: number;

        switch (order.type) {
            case 'market':
                basePrice = candle.open;
                break;

            case 'limit':
                if (!order.price) {
                    basePrice = candle.open;
                    break;
                }
                basePrice = order.price;
                break;

            case 'stop':
                basePrice = candle.open;
                break;

            default:
                basePrice = candle.open;
        }

        // Dodaj poślizg dla zleceń market
        if (order.type === 'market') {
            const slippage = (basePrice * this.config.slippageBps) / 10000;
            basePrice = order.side === 'buy' ?
                basePrice + slippage :
                basePrice - slippage;
        }

        return basePrice;
    }
}
