import { MarketData } from './market_data';
import { Position } from './position';
import { Regime } from './regime';
import { IndicatorSet } from './indicator_set';
import { OptimizationScheduler } from '../optimization/optimization_scheduler';
import { UnifiedSentimentIntegration } from '../analysis/unified_sentiment_integration';

export interface TimeframeData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface BotState {
    portfolio: {
        cash: number;
        btc: number;
        totalValue: number;
        unrealizedPnL: number;
        realizedPnL: number;
        averageEntryPrice?: number;
    };
    timestamp: number;
    equity: number;
    prices: {
        m15: TimeframeData;
        h1: TimeframeData | null;
        h4: TimeframeData | null;
        d1: TimeframeData | null;
    };
    indicators: {
        m15: IndicatorSet;
        h1: IndicatorSet | null;
        h4: IndicatorSet | null;
        d1: IndicatorSet | null;
    };
    positions: Position[];
    marketData: MarketData;
    regime: Regime;
    marketContext?: {
        symbol: string;
        timeframe: string;
        calendar?: any;
        sessionManager?: any;
    };
    // 🚀 SENTIMENT DATA INTEGRATION
    sentiment?: {
        overall: number; // -1 to +1
        confidence: number; // 0 to 1
        trend: 'bullish' | 'bearish' | 'neutral';
        strength: 'strong' | 'moderate' | 'weak';
        tradingSignal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
        signalConfidence: number;
        riskLevel: 'low' | 'medium' | 'high';
        newsCount: number;
        socialMentions: number;
        influencerActivity: number;
        viralityPotential: number;
        lastUpdated: number;
    };
    // 🚀 OPTIMIZATION CYCLE INTEGRATION
    optimizationScheduler?: OptimizationScheduler;
    // 🚀 SENTIMENT ANALYSIS INTEGRATION  
    sentimentAnalyzer?: UnifiedSentimentIntegration;
}
