"use strict";
/**
 * 🚀 PERFORMANCE TRACKER - STAGE 4: Sentiment Performance Tracking
 * Comprehensive performance monitoring with sentiment analysis integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceTracker = void 0;
const events_1 = require("events");
const logger_1 = require("../utils/logger");
class PerformanceTracker extends events_1.EventEmitter {
    constructor(initialCapital = 10000) {
        super();
        this.trades = [];
        this.metricsCache = new Map();
        this.lastEquityCurve = [];
        this.initialCapital = initialCapital;
        this.logger = new logger_1.Logger();
        this.portfolio = {
            totalValue: initialCapital,
            cash: initialCapital,
            positions: new Map(),
            lastUpdated: new Date()
        };
    }
    /**
     * Add a trade to the tracker
     */
    addTrade(trade) {
        this.trades.push(trade);
        this.updatePortfolio(trade);
        this.invalidateCache();
        this.emit('tradeAdded', trade);
        this.logger.debug(`Trade added: ${trade.symbol} ${trade.side} ${trade.quantity}@${trade.entryPrice}`);
    }
    /**
     * Update an existing trade
     */
    updateTrade(tradeId, updates) {
        const trade = this.trades.find(t => t.id === tradeId);
        if (trade) {
            Object.assign(trade, updates);
            this.updatePortfolio(trade);
            this.invalidateCache();
            this.emit('tradeUpdated', trade);
        }
    }
    /**
     * Close a trade
     */
    closeTrade(tradeId, exitPrice, exitTime = new Date()) {
        const trade = this.trades.find(t => t.id === tradeId);
        if (trade && trade.status === 'OPEN') {
            trade.exitPrice = exitPrice;
            trade.exitTime = exitTime;
            trade.status = 'CLOSED';
            trade.pnl = this.calculatePnL(trade);
            this.updatePortfolio(trade);
            this.invalidateCache();
            this.emit('tradeClosed', trade);
            this.logger.info(`Trade closed: ${trade.symbol} PnL: ${trade.pnl?.toFixed(2)}`);
        }
    }
    /**
     * Calculate PnL for a trade
     */
    calculatePnL(trade) {
        if (!trade.exitPrice)
            return 0;
        const quantity = trade.quantity;
        const entryValue = quantity * trade.entryPrice;
        const exitValue = quantity * trade.exitPrice;
        let pnl;
        if (trade.side === 'BUY') {
            pnl = exitValue - entryValue;
        }
        else {
            pnl = entryValue - exitValue;
        }
        return pnl - trade.commission;
    }
    /**
     * Update portfolio based on trade
     */
    updatePortfolio(trade) {
        if (trade.status === 'CLOSED' && trade.pnl !== undefined) {
            this.portfolio.cash += trade.pnl;
            this.portfolio.totalValue = this.portfolio.cash + this.getPositionsValue();
        }
        this.portfolio.lastUpdated = new Date();
    }
    /**
     * Get current positions value
     */
    getPositionsValue() {
        let totalValue = 0;
        for (const position of this.portfolio.positions.values()) {
            totalValue += position.quantity * position.currentPrice;
        }
        return totalValue;
    }
    /**
     * Get all trades
     */
    getTrades() {
        return [...this.trades];
    }
    /**
     * Get closed trades only
     */
    getClosedTrades() {
        return this.trades.filter(t => t.status === 'CLOSED');
    }
    /**
     * Get open trades only
     */
    getOpenTrades() {
        return this.trades.filter(t => t.status === 'OPEN');
    }
    /**
     * Calculate comprehensive performance metrics
     */
    calculateMetrics(symbol) {
        const cacheKey = symbol || 'all';
        const cached = this.metricsCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 5000) {
            return cached.metrics;
        }
        const closedTrades = symbol
            ? this.trades.filter(t => t.symbol === symbol && t.status === 'CLOSED')
            : this.getClosedTrades();
        if (closedTrades.length === 0)
            return this.getEmptyMetrics();
        const totalReturn = this.calculateTotalReturn(closedTrades);
        const returns = this.calculateReturns(closedTrades);
        const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
        const losingTrades = closedTrades.filter(t => (t.pnl || 0) < 0);
        const metrics = {
            totalReturn,
            annualizedReturn: this.calculateAnnualizedReturn(returns),
            volatility: this.calculateVolatility(returns),
            sharpeRatio: this.calculateSharpeRatio(returns),
            maxDrawdown: this.calculateMaxDrawdown(closedTrades),
            winRate: winningTrades.length / closedTrades.length,
            profitFactor: this.calculateProfitFactor(winningTrades, losingTrades),
            totalTrades: closedTrades.length,
            avgTradeDuration: this.calculateAverageHoldingPeriod(closedTrades),
            averageWin: winningTrades.length > 0
                ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length
                : 0,
            averageLoss: losingTrades.length > 0
                ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length)
                : 0,
            calmarRatio: 0,
            sortinoRatio: this.calculateSortinoRatio(returns),
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl || 0)) : 0,
            largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl || 0)) : 0,
            averageHoldingPeriod: this.calculateAverageHoldingPeriod(closedTrades),
            lastUpdated: Date.now(),
            sentimentMetrics: this.calculateSentimentMetrics()
        };
        this.metricsCache.set(cacheKey, { metrics, timestamp: Date.now() });
        return metrics;
    }
    calculateTotalReturn(trades) {
        const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
        return (totalPnL / this.initialCapital) * 100;
    }
    calculateReturns(trades) {
        let runningCapital = this.initialCapital;
        return trades.map(trade => {
            const pnl = trade.pnl || 0;
            const returnPct = pnl / runningCapital;
            runningCapital += pnl;
            return returnPct;
        });
    }
    calculateAnnualizedReturn(returns) {
        if (returns.length === 0)
            return 0;
        const totalReturn = returns.reduce((product, r) => product * (1 + r), 1) - 1;
        const timespan = this.getTimespan();
        const yearsElapsed = timespan / (365 * 24 * 60 * 60 * 1000);
        return Math.pow(1 + totalReturn, 1 / yearsElapsed) - 1;
    }
    calculateVolatility(returns) {
        if (returns.length < 2)
            return 0;
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
        return Math.sqrt(variance) * Math.sqrt(252); // Annualized
    }
    calculateSharpeRatio(returns) {
        if (returns.length < 2)
            return 0;
        const averageReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const volatility = this.calculateVolatility(returns) / Math.sqrt(252); // Daily vol
        return volatility === 0 ? 0 : (averageReturn * 252) / volatility;
    }
    calculateSortinoRatio(returns) {
        if (returns.length < 2)
            return 0;
        const averageReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const downside = returns.filter(r => r < 0);
        if (downside.length === 0)
            return 0;
        const downsideDeviation = Math.sqrt(downside.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downside.length);
        return downsideDeviation === 0 ? 0 : (averageReturn * 252) / (downsideDeviation * Math.sqrt(252));
    }
    calculateMaxDrawdown(trades) {
        if (trades.length === 0)
            return 0;
        let peak = this.initialCapital;
        let maxDrawdown = 0;
        let runningCapital = this.initialCapital;
        for (const trade of trades) {
            runningCapital += trade.pnl || 0;
            if (runningCapital > peak) {
                peak = runningCapital;
            }
            const currentDrawdown = (peak - runningCapital) / peak;
            if (currentDrawdown > maxDrawdown) {
                maxDrawdown = currentDrawdown;
            }
        }
        return maxDrawdown;
    }
    calculateProfitFactor(winningTrades, losingTrades) {
        const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
        return grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss;
    }
    calculateAverageHoldingPeriod(trades) {
        const closedTrades = trades.filter(t => t.exitTime);
        if (closedTrades.length === 0)
            return 0;
        const totalHoldingTime = closedTrades.reduce((sum, trade) => {
            if (trade.exitTime) {
                return sum + (trade.exitTime.getTime() - trade.entryTime.getTime());
            }
            return sum;
        }, 0);
        return totalHoldingTime / closedTrades.length / (1000 * 60 * 60); // Hours
    }
    getTimespan() {
        if (this.trades.length === 0)
            return 1;
        const firstTrade = this.trades[0];
        const lastTrade = this.trades[this.trades.length - 1];
        const endTime = lastTrade.exitTime || new Date();
        return endTime.getTime() - firstTrade.entryTime.getTime();
    }
    invalidateCache() {
        this.metricsCache.clear();
    }
    getEmptyMetrics() {
        return {
            totalReturn: 0,
            annualizedReturn: 0,
            volatility: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            winRate: 0,
            profitFactor: 0,
            totalTrades: 0,
            avgTradeDuration: 0,
            averageWin: 0,
            averageLoss: 0,
            calmarRatio: 0,
            sortinoRatio: 0,
            winningTrades: 0,
            losingTrades: 0,
            largestWin: 0,
            largestLoss: 0,
            averageHoldingPeriod: 0,
            lastUpdated: Date.now()
        };
    }
    // 🚀 SENTIMENT PERFORMANCE TRACKING METHODS
    /**
     * Record a sentiment-blocked trade for analysis
     */
    recordBlockedTrade(symbol, side, quantity, price, sentimentScore, reason, strategy) {
        const blockedTrade = {
            id: `blocked_${Date.now()}_${Math.random()}`,
            symbol,
            side,
            quantity,
            entryPrice: price,
            entryTime: new Date(),
            commission: 0,
            strategy,
            status: 'CLOSED',
            pnl: 0,
            sentimentData: {
                entrysentiment: sentimentScore,
                wasBlocked: true,
                sentimentSource: 'composite',
                blockedReason: reason,
                savedLossEstimate: this.estimateSavedLoss(symbol, side, price)
            }
        };
        this.trades.push(blockedTrade);
        this.logger.info(`Recorded blocked trade: ${symbol} ${side} at ${price}, sentiment: ${sentimentScore}, reason: ${reason}`);
    }
    /**
     * Record a completed trade with all details
     */
    recordCompletedTrade(trade) {
        this.trades.push(trade);
        this.logger.info(`Recorded completed trade: ${trade.id} ${trade.symbol} ${trade.side} PnL: ${trade.pnl || 0}`);
    }
    /**
     * Add sentiment data to existing trade
     */
    addSentimentDataToTrade(tradeId, entrysentiment, exitSentiment, source = 'composite') {
        const trade = this.trades.find(t => t.id === tradeId);
        if (trade) {
            trade.sentimentData = {
                entrysentiment,
                exitSentiment,
                wasBlocked: false,
                sentimentSource: source
            };
            this.logger.debug(`Added sentiment data to trade ${tradeId}: entry=${entrysentiment}, exit=${exitSentiment || 'N/A'}`);
        }
    }
    /**
     * Calculate sentiment performance metrics
     */
    calculateSentimentMetrics() {
        const tradesWithSentiment = this.trades.filter(t => t.sentimentData);
        if (tradesWithSentiment.length === 0) {
            return {
                blockedTrades: 0,
                sentimentSavedLosses: 0,
                averageSentimentScore: 0,
                sentimentAccuracy: 0,
                sentimentProfitImpact: 0,
                highSentimentWinRate: 0,
                lowSentimentWinRate: 0,
                sentimentVsActualCorrelation: 0
            };
        }
        const blockedTrades = tradesWithSentiment.filter(t => t.sentimentData.wasBlocked);
        const executedTrades = tradesWithSentiment.filter(t => !t.sentimentData.wasBlocked);
        // Calculate saved losses from blocked trades
        const sentimentSavedLosses = blockedTrades.reduce((sum, t) => sum + (t.sentimentData.savedLossEstimate || 0), 0);
        // Average sentiment score
        const averageSentimentScore = tradesWithSentiment.reduce((sum, t) => sum + t.sentimentData.entrysentiment, 0) / tradesWithSentiment.length;
        // High vs Low sentiment performance
        const highSentimentTrades = executedTrades.filter(t => t.sentimentData.entrysentiment > 0.6);
        const lowSentimentTrades = executedTrades.filter(t => t.sentimentData.entrysentiment < 0.4);
        const highSentimentWinRate = highSentimentTrades.length > 0
            ? highSentimentTrades.filter(t => (t.pnl || 0) > 0).length / highSentimentTrades.length
            : 0;
        const lowSentimentWinRate = lowSentimentTrades.length > 0
            ? lowSentimentTrades.filter(t => (t.pnl || 0) > 0).length / lowSentimentTrades.length
            : 0;
        // Sentiment accuracy (how well sentiment predicted actual outcome)
        const sentimentAccuracy = this.calculateSentimentAccuracy(executedTrades);
        // Sentiment profit impact
        const sentimentProfitImpact = this.calculateSentimentProfitImpact(executedTrades);
        // Correlation between sentiment and actual results
        const sentimentVsActualCorrelation = this.calculateSentimentCorrelation(executedTrades);
        return {
            blockedTrades: blockedTrades.length,
            sentimentSavedLosses,
            averageSentimentScore,
            sentimentAccuracy,
            sentimentProfitImpact,
            highSentimentWinRate,
            lowSentimentWinRate,
            sentimentVsActualCorrelation
        };
    }
    /**
     * Get comprehensive sentiment performance report
     */
    getSentimentPerformanceReport() {
        const summary = this.calculateSentimentMetrics();
        const insights = [];
        const recommendations = [];
        if (!summary)
            return { summary, insights, recommendations };
        // Generate insights
        if (summary.blockedTrades > 0) {
            insights.push(`🛡️ Sentiment analysis blocked ${summary.blockedTrades} potentially losing trades`);
            if (summary.sentimentSavedLosses > 0) {
                insights.push(`💰 Estimated saved losses: $${summary.sentimentSavedLosses.toFixed(2)}`);
            }
        }
        if (summary.highSentimentWinRate > summary.lowSentimentWinRate) {
            insights.push(`📈 High sentiment trades perform better: ${(summary.highSentimentWinRate * 100).toFixed(1)}% vs ${(summary.lowSentimentWinRate * 100).toFixed(1)}% win rate`);
        }
        if (summary.sentimentAccuracy > 0.6) {
            insights.push(`🎯 Sentiment predictions are accurate: ${(summary.sentimentAccuracy * 100).toFixed(1)}%`);
        }
        else if (summary.sentimentAccuracy < 0.4) {
            insights.push(`⚠️ Sentiment predictions need improvement: ${(summary.sentimentAccuracy * 100).toFixed(1)}% accuracy`);
        }
        // Generate recommendations
        if (summary.sentimentAccuracy < 0.5) {
            recommendations.push("🔧 Consider adjusting sentiment analysis thresholds");
        }
        if (summary.lowSentimentWinRate > summary.highSentimentWinRate) {
            recommendations.push("🔄 Review sentiment scoring algorithm - low sentiment trades performing better");
        }
        if (summary.sentimentProfitImpact > 0.1) {
            recommendations.push("📊 Sentiment analysis is providing significant value - maintain current approach");
        }
        else if (summary.sentimentProfitImpact < 0.05) {
            recommendations.push("⚡ Consider increasing sentiment weight in trading decisions");
        }
        return { summary, insights, recommendations };
    }
    // Helper methods for sentiment calculations
    estimateSavedLoss(symbol, side, price) {
        // Simple estimation based on average loss for similar trades
        const similarTrades = this.trades.filter(t => t.symbol === symbol &&
            t.side === side &&
            t.status === 'CLOSED' &&
            (t.pnl || 0) < 0);
        if (similarTrades.length === 0)
            return 0;
        const averageLoss = Math.abs(similarTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / similarTrades.length);
        return averageLoss * 0.7; // Conservative estimate
    }
    calculateSentimentAccuracy(trades) {
        let correctPredictions = 0;
        for (const trade of trades) {
            if (!trade.sentimentData || trade.pnl === undefined)
                continue;
            const sentiment = trade.sentimentData.entrysentiment;
            const actualProfit = trade.pnl > 0;
            const predictedProfit = sentiment > 0.5;
            if (predictedProfit === actualProfit) {
                correctPredictions++;
            }
        }
        return trades.length > 0 ? correctPredictions / trades.length : 0;
    }
    calculateSentimentProfitImpact(trades) {
        if (trades.length === 0)
            return 0;
        const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const sentimentWeightedPnl = trades.reduce((sum, t) => {
            const sentiment = t.sentimentData?.entrysentiment || 0.5;
            return sum + (t.pnl || 0) * sentiment;
        }, 0);
        return Math.abs(totalPnl) > 0 ? Math.abs(sentimentWeightedPnl - totalPnl) / Math.abs(totalPnl) : 0;
    }
    calculateSentimentCorrelation(trades) {
        if (trades.length < 2)
            return 0;
        const sentiments = trades.map(t => t.sentimentData?.entrysentiment || 0.5);
        const returns = trades.map(t => t.pnl || 0);
        return this.calculateCorrelation(sentiments, returns);
    }
    calculateCorrelation(x, y) {
        const n = x.length;
        if (n === 0)
            return 0;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
        return denominator === 0 ? 0 : numerator / denominator;
    }
}
exports.PerformanceTracker = PerformanceTracker;
