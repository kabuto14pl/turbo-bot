export class RiskManager {
    constructor(config: Record<string, unknown>, portfolioManager: unknown);
    pm: unknown;
    config: Record<string, unknown>;
    circuitBreaker: {
        isTripped: boolean;
        consecutiveLosses: number;
        maxConsecutiveLosses: number;
        emergencyStopTriggered: boolean;
        lastResetTime: number;
        tripCount: number;
    };
    softPauseActive: boolean;
    dailyTradeCount: number;

    isCircuitBreakerTripped(): boolean;
    tripCircuitBreaker(reason: string): void;
    resetCircuitBreaker(): void;
    recordTradeResult(pnl: number): void;
    checkOvertradingLimit(): boolean;
    calculateDynamicRisk(symbol: string, atr: number, currentPrice: number): number;
    calculateOptimalQuantity(price: number, confidence: number, atr: number, symbol: string, regime?: string): number;
    checkMaxDrawdown(): boolean;
    applyRuntimeRiskCheck(params: {
        action: string;
        confidence: number;
        drawdown: number;
    }): {
        approved: boolean;
        confidence: number;
        reason: string;
    };
    calculateMarketVolatility(marketDataHistory: Array<{ close: number }>): number;
    calculateRiskLevel(confidence: number): number;
    getCircuitBreakerStatus(): Record<string, unknown>;
    exportState(): Record<string, unknown>;
    restoreState(state: Record<string, unknown>): void;
}
