import { Logger } from '../../infrastructure/logging/logger';
import { AbstractRiskManager } from './abstract_risk_manager';
import { StrategySignal } from '../types/strategy';
import { OrderRequest } from '../types/order';

interface RiskConfig {
    maxDrawdown: number;
    maxPositionSize: number;
    maxCorrelation: number;
    maxVolatilityMultiplier: number;
    useKellyCriterion: boolean;
    useMultipleTrailingStops: boolean;
    minLiquidity: number;
    targetVaR: number;
    rollingVaR: number;
}

export class RiskManager implements AbstractRiskManager {
    private readonly logger: Logger;
    private readonly config: RiskConfig;
    private rollingVaR: number;
    private targetVaR: number;

    constructor(logger: Logger, config: Partial<RiskConfig> = {}) {
        this.logger = logger;
        this.config = {
            maxDrawdown: config.maxDrawdown || 0.2,
            maxPositionSize: config.maxPositionSize || 1.0,
            maxCorrelation: config.maxCorrelation || 0.7,
            maxVolatilityMultiplier: config.maxVolatilityMultiplier || 2.0,
            useKellyCriterion: config.useKellyCriterion || false,
            useMultipleTrailingStops: config.useMultipleTrailingStops || false,
            minLiquidity: config.minLiquidity || 1000000,
            targetVaR: config.targetVaR || 0.01,
            rollingVaR: config.rollingVaR || 0.01
        };
        this.rollingVaR = this.config.rollingVaR;
        this.targetVaR = this.config.targetVaR;
    }

    checkRisk(signal: StrategySignal): boolean {
        if (!signal || !signal.size) {
            return false;
        }

        // Sprawdź czy wielkość pozycji nie przekracza maksymalnej dozwolonej
        if (signal.size > this.getMaxPositionSize()) {
            this.logger.warn('[RiskManager] Signal size exceeds maximum position size', {
                signalSize: signal.size,
                maxAllowed: this.getMaxPositionSize()
            });
            return false;
        }

        return true;
    }

    setTargetVaR(value: number): void {
        this.targetVaR = value;
        this.logger.info(`Target VaR set to ${value}`);
    }

    setRollingVaR(value: number): void {
        this.rollingVaR = value;
        this.logger.info(`Rolling VaR set to ${value}`);
    }

    getMaxPositionSize(): number {
        // Jeśli rolling VaR jest większy niż target, zmniejsz pozycję
        if (this.rollingVaR > this.targetVaR) {
            const ratio = this.targetVaR / this.rollingVaR;
            return Math.min(this.config.maxPositionSize, ratio);
        }
        return this.config.maxPositionSize;
    }

    validatePosition(size: number, volatility: number): boolean {
        if (size > this.getMaxPositionSize()) {
            this.logger.warn(`Position size ${size} exceeds max allowed ${this.getMaxPositionSize()}`);
            return false;
        }

        if (volatility > this.config.maxVolatilityMultiplier) {
            this.logger.warn(`Volatility ${volatility} exceeds max allowed ${this.config.maxVolatilityMultiplier}`);
            return false;
        }

        return true;
    }

    calculateStopLoss(entryPrice: number, atr: number, direction: 'long' | 'short'): number {
        const multiplier = 2; // Standardowy mnożnik ATR
        if (direction === 'long') {
            return entryPrice - (atr * multiplier);
        } else {
            return entryPrice + (atr * multiplier);
        }
    }

    calculateTakeProfit(entryPrice: number, atr: number, direction: 'long' | 'short'): number {
        const multiplier = 3; // Większy mnożnik dla TP
        if (direction === 'long') {
            return entryPrice + (atr * multiplier);
        } else {
            return entryPrice - (atr * multiplier);
        }
    }

    getTrailingStopConfig(): { activation: number; distance: number } {
        return {
            activation: 0.01, // 1% zysku przed aktywacją
            distance: 0.005   // 0.5% od najwyższej/najniższej ceny
        };
    }

    checkPositionSizeLimit(quantity: number): boolean {
        return quantity <= this.getMaxPositionSize();
    }

    checkRiskPerTradeLimit(quantity: number, entryPrice: number, stopLoss: number): boolean {
        const riskPerTrade = Math.abs(entryPrice - stopLoss) * quantity;
        const maxRisk = this.config.maxDrawdown * entryPrice * quantity;
        return riskPerTrade <= maxRisk;
    }

    async checkRiskLimits(order: OrderRequest): Promise<{ allowed: boolean; reason?: string }> {
        // Check position size limit
        if (order.price && order.quantity && order.quantity * order.price > 1000000) {
            return {
                allowed: false,
                reason: 'Position size exceeds limit'
            };
        }

        // Check risk per trade limit
        if (order.stopLoss && order.price && order.quantity) {
            const riskAmount = Math.abs(order.price - order.stopLoss) * order.quantity;
            if (riskAmount > 10000) {
                return {
                    allowed: false,
                    reason: 'Trade risk exceeds limit'
                };
            }
        }

        return { allowed: true };
    }
}
