/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🚀 ENHANCED STRATEGY SIGNAL
 * Extended signal type for sentiment-enhanced trading strategies
 */

export interface EnhancedStrategySignal {
    type: 'ENTER_LONG' | 'ENTER_SHORT' | 'EXIT_LONG' | 'EXIT_SHORT' | 'HOLD';
    price?: number;
    confidence: number;
    stopLoss?: number;
    takeProfit?: number;
    size?: number;
    reason?: string;
    indicators?: {
        [key: string]: number;
    };
    sentiment?: {
        influenced: boolean;
        multiplier: number;
        riskAdjustment: number;
        conflictDetected: boolean;
    };
}

export type SignalType = 'ENTER_LONG' | 'ENTER_SHORT' | 'EXIT_LONG' | 'EXIT_SHORT' | 'HOLD';
