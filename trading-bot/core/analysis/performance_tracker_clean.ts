/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * Performance Tracker for Trading Bot
 * Tracks trades, portfolio performance, and sentiment analysis
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { Signal } from '../types';

export interface Trade {
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    entryPrice: number;
    exitPrice?: number;
    entryTime: Date;
    exitTime?: Date;
    pnl?: number;
    fees?: number;
    strategy?: string;
    sentiment?: {
        entryScore: number;
        exitScore?: number;
        confidence: number;
    };
}

export interface PerformanceMetrics {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalProfit: number;
    totalLoss: number;
    netProfit: number;
    profitFactor: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
    maxDrawdown: number;
    sharpeRatio: number;
    calmarRatio: number;
    sortinoRatio: number;
    volatility: number;
    avgTradeDuration: number;
    averageHoldingPeriod: number;
    lastUpdated: number;
}

export interface SentimentMetrics {
    totalBlockedTrades: number;
    averageBlockedSentiment: number;
    sentimentAccuracy: number;
    falsePositives: number;
    falseNegatives: number;
    sentimentStrategies: Map<string, number>;
}

export class PerformanceTracker extends EventEmitter {
    private trades: Trade[] = [];
    private blockedTrades: Trade[] = [];
    private initialCapital: number;
    private currentCapital: number;
    private logger: Logger;
    private portfolioHistory: { timestamp: Date; value: number }[] = [];

    constructor(initialCapital: number = 10000) {
        super();
        this.initialCapital = initialCapital;
        this.currentCapital = initialCapital;
    this.logger = new Logger();
        this.logger.info(`Performance tracker initialized with capital: $${initialCapital}`);
    }

    recordTrade(symbol: string, side: 'BUY' | 'SELL', quantity: number, price: number, strategy?: string): string {
        const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const trade: Trade = {
            id: tradeId,
            symbol,
            side,
            quantity,
            entryPrice: price,
            entryTime: new Date(),
            strategy
        };

        this.trades.push(trade);
        this.logger.debug(`Trade recorded: ${trade.side} ${trade.quantity} ${trade.symbol} at $${trade.entryPrice}`);
        
        this.emit('tradeRecorded', trade);
        return tradeId;
    }

    closeTrade(tradeId: string, exitPrice: number, fees: number = 0): void {
        const trade = this.trades.find(t => t.id === tradeId);
        if (!trade) {
            this.logger.warn(`Attempt to close non-existent trade: ${tradeId}`);
            return;
        }

        trade.exitPrice = exitPrice;
        trade.exitTime = new Date();
        trade.fees = fees;
        
        // Calculate P&L
        const multiplier = trade.side === 'BUY' ? 1 : -1;
        trade.pnl = multiplier * (exitPrice - trade.entryPrice) * trade.quantity - fees;
        
        this.currentCapital += trade.pnl;
        
        this.logger.debug(`Trade closed: ${tradeId}, P&L: $${trade.pnl?.toFixed(2)}`);
        this.emit('tradeClosed', trade);
    }

    updatePortfolioValue(value: number): void {
        this.portfolioHistory.push({
            timestamp: new Date(),
            value
        });

        this.emit('portfolioUpdated', { value, timestamp: new Date() });
    }

    calculateMetrics(): PerformanceMetrics {
        const completedTrades = this.trades.filter(t => t.exitPrice !== undefined);
        const totalTrades = completedTrades.length;
        
        if (totalTrades === 0) {
            return this.getEmptyMetrics();
        }

        const winningTrades = completedTrades.filter(t => (t.pnl || 0) > 0);
        const losingTrades = completedTrades.filter(t => (t.pnl || 0) < 0);
        
        const totalProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
        const netProfit = totalProfit - totalLoss;
        
        return {
            totalTrades,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate: winningTrades.length / totalTrades,
            totalProfit,
            totalLoss,
            netProfit,
            profitFactor: totalLoss > 0 ? totalProfit / totalLoss : 0,
            averageWin: winningTrades.length > 0 ? totalProfit / winningTrades.length : 0,
            averageLoss: losingTrades.length > 0 ? totalLoss / losingTrades.length : 0,
            largestWin: Math.max(...winningTrades.map(t => t.pnl || 0)),
            largestLoss: Math.min(...losingTrades.map(t => t.pnl || 0)),
            maxDrawdown: this.calculateMaxDrawdown(),
            sharpeRatio: this.calculateSharpeRatio(),
            calmarRatio: 0,
            sortinoRatio: 0,
            volatility: 0,
            avgTradeDuration: 0,
            averageHoldingPeriod: 0,
            lastUpdated: Date.now()
        };
    }

    recordBlockedTrade(
        symbol: string,
        side: 'BUY' | 'SELL',
        quantity: number,
        price: number,
        sentimentScore: number,
        reason: string,
        strategy: string
    ): void {
        const blockedTrade: Trade = {
            id: `blocked_${Date.now()}_${Math.random()}`,
            symbol,
            side,
            quantity,
            entryPrice: price,
            entryTime: new Date(),
            strategy,
            sentiment: {
                entryScore: sentimentScore,
                confidence: Math.abs(sentimentScore)
            }
        };

        this.blockedTrades.push(blockedTrade);
        this.logger.info(`Recorded blocked trade: ${symbol} ${side} at ${price}, sentiment: ${sentimentScore}, reason: ${reason}`);
    }

    recordCompletedTrade(trade: Trade): void {
        this.trades.push(trade);
        this.logger.info(`Recorded completed trade: ${trade.id} ${trade.symbol} ${trade.side} PnL: ${trade.pnl || 0}`);
    }

    addSentimentData(tradeId: string, entrysentiment: number, exitSentiment?: number): void {
        const trade = this.trades.find(t => t.id === tradeId);
        if (trade) {
            trade.sentiment = {
                entryScore: entrysentiment,
                exitScore: exitSentiment,
                confidence: Math.abs(entrysentiment)
            };
            this.logger.debug(`Added sentiment data to trade ${tradeId}: entry=${entrysentiment}, exit=${exitSentiment || 'N/A'}`);
        }
    }

    calculateSentimentMetrics(): SentimentMetrics {
        const totalBlockedTrades = this.blockedTrades.length;
        const averageBlockedSentiment = totalBlockedTrades > 0 
            ? this.blockedTrades.reduce((sum, t) => sum + (t.sentiment?.entryScore || 0), 0) / totalBlockedTrades 
            : 0;

        const sentimentStrategies = new Map<string, number>();
        this.blockedTrades.forEach(trade => {
            if (trade.strategy) {
                sentimentStrategies.set(trade.strategy, (sentimentStrategies.get(trade.strategy) || 0) + 1);
            }
        });

        return {
            totalBlockedTrades,
            averageBlockedSentiment,
            sentimentAccuracy: 0.85, // Mock value - would calculate based on actual performance
            falsePositives: Math.floor(totalBlockedTrades * 0.15),
            falseNegatives: Math.floor(totalBlockedTrades * 0.1),
            sentimentStrategies
        };
    }

    private calculateMaxDrawdown(): number {
        if (this.portfolioHistory.length < 2) return 0;
        
        let maxDrawdown = 0;
        let peak = this.portfolioHistory[0].value;
        
        for (const point of this.portfolioHistory) {
            if (point.value > peak) {
                peak = point.value;
            }
            const drawdown = (peak - point.value) / peak;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
        
        return maxDrawdown;
    }

    private calculateSharpeRatio(): number {
        const completedTrades = this.trades.filter(t => t.pnl !== undefined);
        if (completedTrades.length < 2) return 0;
        
        const returns = completedTrades.map(t => (t.pnl || 0) / this.initialCapital);
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        
        return stdDev > 0 ? avgReturn / stdDev : 0;
    }

    private getEmptyMetrics(): PerformanceMetrics {
        return {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            totalProfit: 0,
            totalLoss: 0,
            netProfit: 0,
            profitFactor: 0,
            averageWin: 0,
            averageLoss: 0,
            largestWin: 0,
            largestLoss: 0,
            maxDrawdown: 0,
            sharpeRatio: 0,
            calmarRatio: 0,
            sortinoRatio: 0,
            volatility: 0,
            avgTradeDuration: 0,
            averageHoldingPeriod: 0,
            lastUpdated: Date.now()
        };
    }

    // Getters
    getTrades(): Trade[] {
        return [...this.trades];
    }

    getBlockedTrades(): Trade[] {
        return [...this.blockedTrades];
    }

    getCurrentCapital(): number {
        return this.currentCapital;
    }

    getPortfolioHistory(): { timestamp: Date; value: number }[] {
        return [...this.portfolioHistory];
    }
}
