/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * NEWS SENTIMENT ANALYZER
 * Advanced sentiment analysis for trading news using multiple sources and ML models
 * 
 * Features:
 * - Multiple news API integration (NewsAPI, Alpha Vantage, Financial News)
 * - Hugging Face Transformers for sentiment scoring
 * - Real-time news processing pipeline
 * - Symbol-specific sentiment tracking
 * - Sentiment impact scoring for trading decisions
 */

import axios from 'axios';

// --- INTERFACES ---
export interface NewsData {
  id: string;
  title: string;
  description: string;
  content: string;
  source: string;
  publishedAt: Date;
  url: string;
  symbols: string[];
  sentiment?: SentimentScore;
}

export interface SentimentScore {
  score: number; // -1 to +1
  confidence: number; // 0 to 1
  label: 'positive' | 'negative' | 'neutral';
  magnitude: number; // 0 to 1
  breakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export interface MarketSentiment {
  symbol: string;
  timestamp: number;
  overallSentiment: number; // -1 to +1
  newsCount: number;
  confidence: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  impactScore: number; // 0 to 1
  sources: string[];
  topNews: NewsData[];
}

export interface NewsApiConfig {
  newsApiKey?: string;
  alphaVantageKey?: string;
  huggingFaceKey?: string;
  enableNewsAPI: boolean;
  enableAlphaVantage: boolean;
  enableHuggingFace: boolean;
  updateInterval: number; // minutes
  maxNewsPerSymbol: number;
  sentimentThreshold: number;
}

// --- MAIN CLASS ---
export class NewsSentimentAnalyzer {
  private config: NewsApiConfig;
  private newsCache: Map<string, NewsData[]> = new Map();
  private sentimentCache: Map<string, MarketSentiment> = new Map();
  private lastUpdate: Map<string, number> = new Map();

  constructor(config: Partial<NewsApiConfig> = {}) {
    this.config = {
      newsApiKey: process.env.NEWS_API_KEY || '',
      alphaVantageKey: process.env.ALPHA_VANTAGE_API_KEY || '',
      huggingFaceKey: process.env.HUGGING_FACE_API_KEY || '',
      enableNewsAPI: true,
      enableAlphaVantage: true,
      enableHuggingFace: true,
      updateInterval: 15, // 15 minutes
      maxNewsPerSymbol: 50,
      sentimentThreshold: 0.1,
      ...config
    };
  }

  /**
   * Fetch news from multiple sources for given symbols
   */
  async fetchNews(symbols: string[]): Promise<NewsData[]> {
    const allNews: NewsData[] = [];

    for (const symbol of symbols) {
      try {
        // Check cache first
        const lastUpdateTime = this.lastUpdate.get(symbol) || 0;
        const now = Date.now();
        
        if (now - lastUpdateTime < this.config.updateInterval * 60 * 1000) {
          const cached = this.newsCache.get(symbol);
          if (cached) {
            allNews.push(...cached);
            continue;
          }
        }

        const news: NewsData[] = [];

        // NewsAPI.org
        if (this.config.enableNewsAPI && this.config.newsApiKey) {
          const newsApiData = await this.fetchFromNewsAPI(symbol);
          news.push(...newsApiData);
        }

        // Alpha Vantage News
        if (this.config.enableAlphaVantage && this.config.alphaVantageKey) {
          const alphaNews = await this.fetchFromAlphaVantage(symbol);
          news.push(...alphaNews);
        }

        // Limit and cache
        const limitedNews = news.slice(0, this.config.maxNewsPerSymbol);
        this.newsCache.set(symbol, limitedNews);
        this.lastUpdate.set(symbol, now);
        
        allNews.push(...limitedNews);

      } catch (error) {
        console.error(`Error fetching news for ${symbol}:`, error);
      }
    }

    return allNews;
  }

  /**
   * Fetch news from NewsAPI.org
   */
  private async fetchFromNewsAPI(symbol: string): Promise<NewsData[]> {
    const query = this.buildNewsQuery(symbol);
    const url = `https://newsapi.org/v2/everything`;
    
    try {
      const response = await axios.get(url, {
        params: {
          q: query,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: 20,
          apiKey: this.config.newsApiKey
        },
        timeout: 10000
      });

      return response.data.articles.map((article: any) => ({
        id: `newsapi_${Date.now()}_${Math.random()}`,
        title: article.title || '',
        description: article.description || '',
        content: article.content || article.description || '',
        source: `NewsAPI (${article.source?.name || 'Unknown'})`,
        publishedAt: new Date(article.publishedAt),
        url: article.url,
        symbols: [symbol]
      }));

    } catch (error) {
      console.error(`NewsAPI error for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Fetch news from Alpha Vantage
   */
  private async fetchFromAlphaVantage(symbol: string): Promise<NewsData[]> {
    const url = `https://www.alphavantage.co/query`;
    
    try {
      const response = await axios.get(url, {
        params: {
          function: 'NEWS_SENTIMENT',
          tickers: symbol,
          limit: 20,
          apikey: this.config.alphaVantageKey
        },
        timeout: 10000
      });

      const articles = response.data.feed || [];
      
      return articles.map((article: any) => ({
        id: `alphavantage_${article.url.split('/').pop()}`,
        title: article.title || '',
        description: article.summary || '',
        content: article.summary || '',
        source: `Alpha Vantage (${article.source || 'Unknown'})`,
        publishedAt: new Date(article.time_published),
        url: article.url,
        symbols: [symbol],
        sentiment: this.parseAlphaVantageSentiment(article)
      }));

    } catch (error) {
      console.error(`Alpha Vantage error for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Parse Alpha Vantage sentiment data
   */
  private parseAlphaVantageSentiment(article: any): SentimentScore | undefined {
    if (!article.overall_sentiment_score) return undefined;

    const score = parseFloat(article.overall_sentiment_score);
    const label = article.overall_sentiment_label?.toLowerCase() as 'positive' | 'negative' | 'neutral';
    
    return {
      score,
      confidence: 0.8, // Alpha Vantage provides reliable sentiment
      label: label || 'neutral',
      magnitude: Math.abs(score),
      breakdown: {
        positive: label === 'positive' ? 1 : 0,
        negative: label === 'negative' ? 1 : 0,
        neutral: label === 'neutral' ? 1 : 0
      }
    };
  }

  /**
   * Analyze sentiment using Hugging Face Transformers
   */
  async analyzeSentiment(text: string): Promise<SentimentScore> {
    if (!this.config.enableHuggingFace || !this.config.huggingFaceKey) {
      return this.fallbackSentimentAnalysis(text);
    }

    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/ProsusAI/finbert',
        { inputs: text },
        {
          headers: {
            'Authorization': `Bearer ${this.config.huggingFaceKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const result = response.data[0];
      
      if (Array.isArray(result)) {
        // Parse FinBERT results
        const sentiment = this.parseFinBERTResults(result);
        return sentiment;
      }

      return this.fallbackSentimentAnalysis(text);

    } catch (error) {
      console.error('Hugging Face sentiment analysis error:', error);
      return this.fallbackSentimentAnalysis(text);
    }
  }

  /**
   * Parse FinBERT sentiment results
   */
  private parseFinBERTResults(results: any[]): SentimentScore {
    const sentimentMap = new Map();
    
    results.forEach(item => {
      sentimentMap.set(item.label.toLowerCase(), item.score);
    });

    const positive = sentimentMap.get('positive') || 0;
    const negative = sentimentMap.get('negative') || 0;
    const neutral = sentimentMap.get('neutral') || 0;

    // Calculate overall score (-1 to +1)
    const score = positive - negative;
    
    // Determine label
    let label: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (positive > negative && positive > neutral) label = 'positive';
    else if (negative > positive && negative > neutral) label = 'negative';

    return {
      score,
      confidence: Math.max(positive, negative, neutral),
      label,
      magnitude: Math.abs(score),
      breakdown: { positive, negative, neutral }
    };
  }

  /**
   * Fallback sentiment analysis (rule-based)
   */
  private fallbackSentimentAnalysis(text: string): SentimentScore {
    const positiveWords = ['bull', 'rise', 'up', 'gain', 'growth', 'profit', 'buy', 'strong', 'positive', 'good', 'excellent', 'surge', 'rally', 'moon'];
    const negativeWords = ['bear', 'fall', 'down', 'loss', 'crash', 'sell', 'weak', 'negative', 'bad', 'terrible', 'dump', 'decline', 'drop'];
    
    const lowerText = text.toLowerCase();
    let positive = 0;
    let negative = 0;

    positiveWords.forEach(word => {
      const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
      positive += matches;
    });

    negativeWords.forEach(word => {
      const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
      negative += matches;
    });

    const total = positive + negative;
    if (total === 0) {
      return {
        score: 0,
        confidence: 0.1,
        label: 'neutral',
        magnitude: 0,
        breakdown: { positive: 0, negative: 0, neutral: 1 }
      };
    }

    const score = (positive - negative) / Math.max(total, 1);
    const label = score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral';

    return {
      score,
      confidence: 0.6,
      label,
      magnitude: Math.abs(score),
      breakdown: {
        positive: positive / total,
        negative: negative / total,
        neutral: 0
      }
    };
  }

  /**
   * Calculate market sentiment for a specific symbol
   */
  async calculateMarketSentiment(symbol: string): Promise<MarketSentiment> {
    try {
      // Get recent news
      const news = await this.fetchNews([symbol]);
      
      if (news.length === 0) {
        return this.createNeutralSentiment(symbol);
      }

      // Analyze sentiment for each news item
      const sentimentPromises = news.map(async (item) => {
        if (!item.sentiment) {
          item.sentiment = await this.analyzeSentiment(item.title + ' ' + item.description);
        }
        return item;
      });

      const newsWithSentiment = await Promise.all(sentimentPromises);

      // Calculate weighted average sentiment
      const totalWeight = newsWithSentiment.length;
      const weightedSentiment = newsWithSentiment.reduce((sum, item) => {
        const weight = item.sentiment!.confidence;
        return sum + (item.sentiment!.score * weight);
      }, 0) / totalWeight;

      // Calculate confidence
      const avgConfidence = newsWithSentiment.reduce((sum, item) => 
        sum + item.sentiment!.confidence, 0) / totalWeight;

      // Determine trend
      let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (weightedSentiment > this.config.sentimentThreshold) trend = 'bullish';
      else if (weightedSentiment < -this.config.sentimentThreshold) trend = 'bearish';

      // Calculate impact score based on news volume and sentiment strength
      const impactScore = Math.min(1, (news.length / 10) * Math.abs(weightedSentiment) * avgConfidence);

      const marketSentiment: MarketSentiment = {
        symbol,
        timestamp: Date.now(),
        overallSentiment: weightedSentiment,
        newsCount: news.length,
        confidence: avgConfidence,
        trend,
        impactScore,
        sources: Array.from(new Set(news.map(n => n.source))),
        topNews: newsWithSentiment
          .sort((a, b) => Math.abs(b.sentiment!.score) - Math.abs(a.sentiment!.score))
          .slice(0, 5)
      };

      // Cache result
      this.sentimentCache.set(symbol, marketSentiment);

      return marketSentiment;

    } catch (error) {
      console.error(`Error calculating market sentiment for ${symbol}:`, error);
      return this.createNeutralSentiment(symbol);
    }
  }

  /**
   * Create neutral sentiment fallback
   */
  private createNeutralSentiment(symbol: string): MarketSentiment {
    return {
      symbol,
      timestamp: Date.now(),
      overallSentiment: 0,
      newsCount: 0,
      confidence: 0,
      trend: 'neutral',
      impactScore: 0,
      sources: [],
      topNews: []
    };
  }

  /**
   * Build search query for news APIs
   */
  private buildNewsQuery(symbol: string): string {
    const baseSymbol = symbol.replace(/USDT|USD|BTC|ETH/g, '');
    const queries = [
      baseSymbol,
      `${baseSymbol} crypto`,
      `${baseSymbol} cryptocurrency`,
      `${baseSymbol} price`,
      `${baseSymbol} trading`
    ];
    
    return queries.join(' OR ');
  }

  /**
   * Get cached sentiment (for performance)
   */
  getCachedSentiment(symbol: string): MarketSentiment | null {
    const cached = this.sentimentCache.get(symbol);
    if (!cached) return null;

    // Check if cache is still valid (30 minutes)
    const maxAge = 30 * 60 * 1000;
    if (Date.now() - cached.timestamp > maxAge) {
      this.sentimentCache.delete(symbol);
      return null;
    }

    return cached;
  }

  /**
   * Bulk sentiment analysis for multiple symbols
   */
  async analyzeBulkSentiment(symbols: string[]): Promise<Map<string, MarketSentiment>> {
    const results = new Map<string, MarketSentiment>();
    
    const promises = symbols.map(async (symbol) => {
      const sentiment = await this.calculateMarketSentiment(symbol);
      results.set(symbol, sentiment);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get sentiment summary for dashboard
   */
  getSentimentSummary(): {
    totalSymbols: number;
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    avgConfidence: number;
    lastUpdate: number;
  } {
    const sentiments = Array.from(this.sentimentCache.values());
    
    if (sentiments.length === 0) {
      return {
        totalSymbols: 0,
        bullishCount: 0,
        bearishCount: 0,
        neutralCount: 0,
        avgConfidence: 0,
        lastUpdate: 0
      };
    }

    const bullishCount = sentiments.filter(s => s.trend === 'bullish').length;
    const bearishCount = sentiments.filter(s => s.trend === 'bearish').length;
    const neutralCount = sentiments.filter(s => s.trend === 'neutral').length;
    const avgConfidence = sentiments.reduce((sum, s) => sum + s.confidence, 0) / sentiments.length;
    const lastUpdate = Math.max(...sentiments.map(s => s.timestamp));

    return {
      totalSymbols: sentiments.length,
      bullishCount,
      bearishCount,
      neutralCount,
      avgConfidence,
      lastUpdate
    };
  }
}
