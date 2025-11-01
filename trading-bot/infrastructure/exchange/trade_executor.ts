/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
import { Logger } from '../logging';
import { Portfolio } from '../../core/portfolio';
import { AbstractRiskManager } from '../../core/risk/abstract_risk_manager';
import { NewOrderRequest, Order } from '../../core/types/order';
import { Candle } from '../../core/indicators/multi_timeframe_synchronizer';

export abstract class TradeExecutor {
    constructor(
        protected logger: Logger,
        protected portfolioManager: Portfolio,
        protected riskManager: AbstractRiskManager,
        protected commission: number = 0.001,
        protected slippageMultiplier: number = 0.2
    ) {}

    // Metoda abstrakcyjna, którą muszą zaimplementować klasy podrzędne
    abstract processOrderRequest(request: NewOrderRequest, candle: Candle): Promise<Order | null>;
    
    // Można tu zostawić wspólną logikę, np. do obliczeń, jeśli jest potrzebna
    protected _calculateSlippage(atr: number, size: number): number {
        return atr * this.slippageMultiplier * Math.abs(size);
    }

    getRiskManager(): AbstractRiskManager {
        return this.riskManager;
    }

    // Usunięto stare metody executeBuy, executeSell, executeClose
}
