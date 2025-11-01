"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * UNIFIED SENTIMENT INTEGRATION
 * Combines news sentiment, social sentiment, and market data for comprehensive analysis
 *
 * Features:
 * - Multi-source sentiment aggregation
 * - Weighted sentiment scoring
 * - Real-time sentiment pipeline
 * - Trading signal generation based on sentiment
 * - Integration with existing trading strategies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedSentimentIntegration = void 0;
const news_sentiment_analyzer_1 = require("./news_sentiment_analyzer");
const social_sentiment_analyzer_1 = require("./social_sentiment_analyzer");
const data_preparation_service_1 = require("../services/data_preparation_service");
// --- MAIN CLASS ---
class UnifiedSentimentIntegration {
    constructor(config = {}) {
        this.sentimentCache = new Map();
        this.signalHistory = new Map();
        this.lastUpdate = new Map();
        this.config = {
            newsWeight: 0.4,
            socialWeight: 0.4,
            technicalWeight: 0.2,
            sentimentThreshold: 0.15,
            signalThreshold: 0.6,
            updateInterval: 10, // 10 minutes
            enableRealTime: true,
            enableOutlierDetection: true,
            ...config
        };
        // Validate weights sum to 1
        const totalWeight = this.config.newsWeight + this.config.socialWeight + this.config.technicalWeight;
        if (Math.abs(totalWeight - 1.0) > 0.01) {
            console.warn(`Sentiment weights don't sum to 1.0 (${totalWeight}), normalizing...`);
            this.config.newsWeight /= totalWeight;
            this.config.socialWeight /= totalWeight;
            this.config.technicalWeight /= totalWeight;
        }
        // Initialize analyzers
        this.newsAnalyzer = new news_sentiment_analyzer_1.NewsSentimentAnalyzer();
        this.socialAnalyzer = new social_sentiment_analyzer_1.SocialSentimentAnalyzer();
        this.outlierDetector = new data_preparation_service_1.OutlierDetector();
    }
    /**
     * Generate unified sentiment score for a symbol
     */
    async generateUnifiedSentiment(symbol) {
        try {
            // Check cache first
            if (this.shouldUseCachedData(symbol)) {
                const cached = this.sentimentCache.get(symbol);
                if (cached)
                    return cached;
            }
            // Fetch sentiment data from all sources
            const [marketSentiment, socialSentiment] = await Promise.all([
                this.newsAnalyzer.calculateMarketSentiment(symbol),
                this.socialAnalyzer.generateSocialSentimentData(symbol)
            ]);
            // Calculate technical sentiment from price action (simplified)
            const technicalSentiment = this.calculateTechnicalSentiment(symbol);
            // Apply outlier detection if enabled
            let newsSentimentScore = marketSentiment.overallSentiment;
            let socialSentimentScore = socialSentiment.overallSentiment;
            if (this.config.enableOutlierDetection) {
                const sentimentData = [newsSentimentScore, socialSentimentScore, technicalSentiment];
                const outlierResult = this.outlierDetector.detectZScoreOutliers(sentimentData, 2.0);
                if (outlierResult.outliers.length > 0) {
                    console.log(`Outlier detected in sentiment data for ${symbol}, using cleaned data`);
                    const cleanedData = outlierResult.cleanData;
                    if (cleanedData.length > 0) {
                        newsSentimentScore = cleanedData.includes(newsSentimentScore) ? newsSentimentScore : 0;
                        socialSentimentScore = cleanedData.includes(socialSentimentScore) ? socialSentimentScore : 0;
                    }
                }
            }
            // Calculate weighted overall sentiment
            const overallSentiment = (newsSentimentScore * this.config.newsWeight) +
                (socialSentimentScore * this.config.socialWeight) +
                (technicalSentiment * this.config.technicalWeight);
            // Calculate overall confidence
            const confidence = this.calculateOverallConfidence(marketSentiment, socialSentiment);
            // Determine trend and strength
            const trend = this.determineTrend(overallSentiment);
            const strength = this.determineStrength(overallSentiment, confidence);
            // Generate trading signal
            const { tradingSignal, signalConfidence, riskLevel } = this.generateTradingSignal(overallSentiment, confidence, marketSentiment, socialSentiment);
            // Create unified sentiment score
            const unifiedScore = {
                symbol,
                timestamp: Date.now(),
                overallSentiment,
                confidence,
                trend,
                strength,
                newsSentiment: newsSentimentScore,
                socialSentiment: socialSentimentScore,
                technicalSentiment,
                newsWeight: this.config.newsWeight,
                socialWeight: this.config.socialWeight,
                technicalWeight: this.config.technicalWeight,
                newsCount: marketSentiment.newsCount,
                socialMentions: socialSentiment.tweetCount,
                influencerActivity: socialSentiment.influencerSentiment,
                viralityPotential: socialSentiment.viralityScore,
                tradingSignal,
                signalConfidence,
                riskLevel,
                newsSources: marketSentiment.sources,
                topHashtags: socialSentiment.trendingHashtags.slice(0, 5).map(ht => ht.hashtag),
                keyInfluencers: this.extractKeyInfluencers(socialSentiment)
            };
            // Cache result
            this.sentimentCache.set(symbol, unifiedScore);
            this.lastUpdate.set(symbol, Date.now());
            // Generate sentiment signal if threshold met
            if (signalConfidence >= this.config.signalThreshold) {
                this.generateSentimentSignal(unifiedScore);
            }
            return unifiedScore;
        }
        catch (error) {
            console.error(`Error generating unified sentiment for ${symbol}:`, error);
            return this.createNeutralSentiment(symbol);
        }
    }
    /**
     * Calculate technical sentiment from price action
     */
    calculateTechnicalSentiment(symbol) {
        // This would integrate with existing technical analysis
        // For now, return neutral (can be enhanced with actual price data)
        // In real implementation, this would analyze:
        // - Price momentum
        // - Volume patterns
        // - Support/resistance levels
        // - Technical indicators (RSI, MACD, etc.)
        return 0; // Neutral for now
    }
    /**
     * Calculate overall confidence from multiple sources
     */
    calculateOverallConfidence(marketSentiment, socialSentiment) {
        const newsConfidence = marketSentiment.confidence;
        const socialConfidence = socialSentiment.confidence;
        const dataQuality = this.assessDataQuality(marketSentiment, socialSentiment);
        // Weighted average confidence adjusted by data quality
        const weightedConfidence = (newsConfidence * this.config.newsWeight) +
            (socialConfidence * this.config.socialWeight) +
            (0.5 * this.config.technicalWeight); // Neutral tech confidence
        return Math.min(1, weightedConfidence * dataQuality);
    }
    /**
     * Assess data quality based on source diversity and volume
     */
    assessDataQuality(marketSentiment, socialSentiment) {
        let quality = 0.5; // Base quality
        // News data quality
        if (marketSentiment.newsCount > 5)
            quality += 0.1;
        if (marketSentiment.sources.length > 2)
            quality += 0.1;
        if (marketSentiment.newsCount > 20)
            quality += 0.1;
        // Social data quality
        if (socialSentiment.tweetCount > 10)
            quality += 0.1;
        if (socialSentiment.communitySize > 5)
            quality += 0.1;
        if (socialSentiment.influencerSentiment !== 0)
            quality += 0.1;
        return Math.min(1, quality);
    }
    /**
     * Determine sentiment trend
     */
    determineTrend(sentiment) {
        if (sentiment > this.config.sentimentThreshold)
            return 'bullish';
        if (sentiment < -this.config.sentimentThreshold)
            return 'bearish';
        return 'neutral';
    }
    /**
     * Determine sentiment strength
     */
    determineStrength(sentiment, confidence) {
        const magnitude = Math.abs(sentiment);
        const strengthScore = magnitude * confidence;
        if (strengthScore > 0.7)
            return 'strong';
        if (strengthScore > 0.4)
            return 'moderate';
        return 'weak';
    }
    /**
     * Generate trading signal based on sentiment
     */
    generateTradingSignal(overallSentiment, confidence, marketSentiment, socialSentiment) {
        const magnitude = Math.abs(overallSentiment);
        const signalStrength = magnitude * confidence;
        // Determine risk level
        let riskLevel = 'medium';
        if (socialSentiment.viralityScore > 0.8)
            riskLevel = 'high'; // High viral content = high risk
        else if (marketSentiment.newsCount > 20 && confidence > 0.8)
            riskLevel = 'low'; // Good news coverage = low risk
        // Generate signal
        let tradingSignal = 'hold';
        if (overallSentiment > 0.6 && signalStrength > 0.7) {
            tradingSignal = 'strong_buy';
        }
        else if (overallSentiment > 0.3 && signalStrength > 0.5) {
            tradingSignal = 'buy';
        }
        else if (overallSentiment < -0.6 && signalStrength > 0.7) {
            tradingSignal = 'strong_sell';
        }
        else if (overallSentiment < -0.3 && signalStrength > 0.5) {
            tradingSignal = 'sell';
        }
        return {
            tradingSignal,
            signalConfidence: signalStrength,
            riskLevel
        };
    }
    /**
     * Extract key influencers from social sentiment
     */
    extractKeyInfluencers(socialSentiment) {
        return socialSentiment.topTweets
            .filter(tweet => tweet.influence > 0.5)
            .map(tweet => tweet.authorUsername)
            .slice(0, 5);
    }
    /**
     * Generate sentiment signal for strategy integration
     */
    generateSentimentSignal(unifiedScore) {
        const signal = {
            symbol: unifiedScore.symbol,
            timestamp: unifiedScore.timestamp,
            type: unifiedScore.trend === 'bullish' ? 'sentiment_bullish' :
                unifiedScore.trend === 'bearish' ? 'sentiment_bearish' : 'sentiment_neutral',
            strength: Math.abs(unifiedScore.overallSentiment),
            confidence: unifiedScore.signalConfidence,
            sources: [...unifiedScore.newsSources, 'social_media'],
            reasoning: this.generateSignalReasoning(unifiedScore),
            duration: this.estimateSignalDuration(unifiedScore)
        };
        // Add to signal history
        if (!this.signalHistory.has(unifiedScore.symbol)) {
            this.signalHistory.set(unifiedScore.symbol, []);
        }
        const history = this.signalHistory.get(unifiedScore.symbol);
        history.push(signal);
        // Keep only last 50 signals
        if (history.length > 50) {
            history.splice(0, history.length - 50);
        }
        console.log(`🎯 Sentiment Signal Generated: ${signal.type} for ${signal.symbol} (confidence: ${(signal.confidence * 100).toFixed(1)}%)`);
    }
    /**
     * Generate human-readable signal reasoning
     */
    generateSignalReasoning(unifiedScore) {
        const reasons = [];
        if (Math.abs(unifiedScore.newsSentiment) > 0.3) {
            reasons.push(`News sentiment: ${unifiedScore.newsSentiment > 0 ? 'positive' : 'negative'} (${unifiedScore.newsCount} articles)`);
        }
        if (Math.abs(unifiedScore.socialSentiment) > 0.3) {
            reasons.push(`Social sentiment: ${unifiedScore.socialSentiment > 0 ? 'bullish' : 'bearish'} (${unifiedScore.socialMentions} mentions)`);
        }
        if (unifiedScore.influencerActivity !== 0) {
            reasons.push(`Influencer activity: ${unifiedScore.influencerActivity > 0 ? 'positive' : 'negative'}`);
        }
        if (unifiedScore.viralityPotential > 0.7) {
            reasons.push('High viral potential detected');
        }
        return reasons.join(', ') || 'Neutral sentiment across all sources';
    }
    /**
     * Estimate signal duration based on sentiment characteristics
     */
    estimateSignalDuration(unifiedScore) {
        // News-driven signals tend to last longer
        if (unifiedScore.newsCount > 10 && Math.abs(unifiedScore.newsSentiment) > 0.5) {
            return 'long';
        }
        // Social-driven signals can be short-lived but intense
        if (unifiedScore.viralityPotential > 0.8) {
            return 'short';
        }
        // Balanced signals tend to be medium duration
        return 'medium';
    }
    /**
     * Check if cached data should be used
     */
    shouldUseCachedData(symbol) {
        const lastUpdateTime = this.lastUpdate.get(symbol) || 0;
        const now = Date.now();
        return now - lastUpdateTime < this.config.updateInterval * 60 * 1000;
    }
    /**
     * Create neutral sentiment fallback
     */
    createNeutralSentiment(symbol) {
        return {
            symbol,
            timestamp: Date.now(),
            overallSentiment: 0,
            confidence: 0,
            trend: 'neutral',
            strength: 'weak',
            newsSentiment: 0,
            socialSentiment: 0,
            technicalSentiment: 0,
            newsWeight: this.config.newsWeight,
            socialWeight: this.config.socialWeight,
            technicalWeight: this.config.technicalWeight,
            newsCount: 0,
            socialMentions: 0,
            influencerActivity: 0,
            viralityPotential: 0,
            tradingSignal: 'hold',
            signalConfidence: 0,
            riskLevel: 'medium',
            newsSources: [],
            topHashtags: [],
            keyInfluencers: []
        };
    }
    /**
     * Get recent sentiment signals for a symbol
     */
    getRecentSignals(symbol, limit = 10) {
        const signals = this.signalHistory.get(symbol) || [];
        return signals.slice(-limit);
    }
    /**
     * Get cached unified sentiment
     */
    getCachedSentiment(symbol) {
        return this.sentimentCache.get(symbol) || null;
    }
    /**
     * Bulk sentiment analysis for multiple symbols
     */
    async analyzeBulkSentiment(symbols) {
        const results = new Map();
        const promises = symbols.map(async (symbol) => {
            const sentiment = await this.generateUnifiedSentiment(symbol);
            results.set(symbol, sentiment);
        });
        await Promise.all(promises);
        return results;
    }
    /**
     * Get sentiment integration summary for dashboard
     */
    getSentimentSummary() {
        const sentiments = Array.from(this.sentimentCache.values());
        if (sentiments.length === 0) {
            return {
                totalSymbols: 0,
                bullishSignals: 0,
                bearishSignals: 0,
                neutralSignals: 0,
                avgConfidence: 0,
                highRiskSymbols: 0,
                viralContent: 0,
                lastUpdate: 0
            };
        }
        const bullishSignals = sentiments.filter(s => s.trend === 'bullish').length;
        const bearishSignals = sentiments.filter(s => s.trend === 'bearish').length;
        const neutralSignals = sentiments.filter(s => s.trend === 'neutral').length;
        const avgConfidence = sentiments.reduce((sum, s) => sum + s.confidence, 0) / sentiments.length;
        const highRiskSymbols = sentiments.filter(s => s.riskLevel === 'high').length;
        const viralContent = sentiments.filter(s => s.viralityPotential > 0.7).length;
        const lastUpdate = Math.max(...sentiments.map(s => s.timestamp));
        return {
            totalSymbols: sentiments.length,
            bullishSignals,
            bearishSignals,
            neutralSignals,
            avgConfidence,
            highRiskSymbols,
            viralContent,
            lastUpdate
        };
    }
}
exports.UnifiedSentimentIntegration = UnifiedSentimentIntegration;
