/**
 * SOCIAL SENTIMENT ANALYZER
 * Advanced social media sentiment analysis for cryptocurrency trading
 * 
 * Features:
 * - Twitter/X sentiment monitoring
 * - Influencer tracking and weighted sentiment
 * - Hashtag trend analysis
 * - Real-time social mentions tracking
 * - Community sentiment scoring
 * - Integration with trading signals
 */

import axios from 'axios';

// --- INTERFACES ---
export interface Tweet {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  authorFollowers: number;
  createdAt: Date;
  publicMetrics: {
    retweetCount: number;
    likeCount: number;
    replyCount: number;
    quoteCount: number;
  };
  sentiment?: SocialSentimentScore;
  symbols: string[];
  hashtags: string[];
  influence: number; // 0-1 based on author followers/engagement
}

export interface SocialSentimentScore {
  score: number; // -1 to +1
  confidence: number; // 0 to 1
  label: 'bullish' | 'bearish' | 'neutral';
  magnitude: number;
  engagement: number; // weighted by likes/retweets
  virality: number; // potential to go viral
}

export interface InfluencerData {
  username: string;
  followers: number;
  verified: boolean;
  influence: number; // 0-1 score
  avgEngagement: number;
  sentimentHistory: number[]; // last 10 sentiments
  category: 'crypto' | 'finance' | 'trader' | 'analyst' | 'other';
}

export interface HashtagTrend {
  hashtag: string;
  mentions: number;
  sentiment: number;
  trendScore: number; // increase in mentions
  relatedSymbols: string[];
  timeframe: '1h' | '24h' | '7d';
}

export interface SocialSentimentData {
  symbol: string;
  timestamp: number;
  overallSentiment: number; // -1 to +1
  confidence: number;
  tweetCount: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  viralityScore: number; // potential viral content impact
  influencerSentiment: number; // weighted by influencer scores
  communitySize: number; // active discussants
  topTweets: Tweet[];
  trendingHashtags: HashtagTrend[];
  influencerBreakdown: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
  momentum: 'increasing' | 'decreasing' | 'stable';
}

export interface SocialApiConfig {
  twitterBearerToken?: string;
  enableTwitter: boolean;
  updateInterval: number; // minutes
  maxTweetsPerSymbol: number;
  influencerMinFollowers: number;
  sentimentThreshold: number;
  viralityThreshold: number;
  trackInfluencers: boolean;
  monitorHashtags: boolean;
}

// --- MAIN CLASS ---
export class SocialSentimentAnalyzer {
  private config: SocialApiConfig;
  private tweetCache: Map<string, Tweet[]> = new Map();
  private sentimentCache: Map<string, SocialSentimentData> = new Map();
  private influencerCache: Map<string, InfluencerData> = new Map();
  private hashtagCache: Map<string, HashtagTrend[]> = new Map();
  private lastUpdate: Map<string, number> = new Map();

  // Crypto influencers list (can be expanded)
  private readonly CRYPTO_INFLUENCERS = [
    'elonmusk', 'michael_saylor', 'cz_binance', 'VitalikButerin',
    'aantonop', 'naval', 'APompliano', 'woonomic', 'cmsholdings',
    'TheCryptoDog', 'CryptoCobain', 'PentoshiCrypto', 'CryptoCapo_',
    'rektcapital', 'CryptoCred', 'TechDev_52', 'CryptoWelson'
  ];

  constructor(config: Partial<SocialApiConfig> = {}) {
    this.config = {
      twitterBearerToken: process.env.TWITTER_BEARER_TOKEN || '',
      enableTwitter: true,
      updateInterval: 10, // 10 minutes
      maxTweetsPerSymbol: 100,
      influencerMinFollowers: 10000,
      sentimentThreshold: 0.15,
      viralityThreshold: 0.7,
      trackInfluencers: true,
      monitorHashtags: true,
      ...config
    };

    // Initialize influencer data
    this.initializeInfluencers();
  }

  /**
   * Initialize known crypto influencers
   */
  private initializeInfluencers(): void {
    this.CRYPTO_INFLUENCERS.forEach(username => {
      this.influencerCache.set(username, {
        username,
        followers: 0, // Will be updated when fetching
        verified: false,
        influence: 0.8, // Default high influence for known influencers
        avgEngagement: 0,
        sentimentHistory: [],
        category: 'crypto'
      });
    });
  }

  /**
   * Monitor Twitter for specific symbols
   */
  async monitorTwitter(symbols: string[]): Promise<Tweet[]> {
    if (!this.config.enableTwitter || !this.config.twitterBearerToken) {
      console.warn('Twitter monitoring disabled or no bearer token provided');
      return [];
    }

    const allTweets: Tweet[] = [];

    for (const symbol of symbols) {
      try {
        // Check cache first
        const lastUpdateTime = this.lastUpdate.get(symbol) || 0;
        const now = Date.now();
        
        if (now - lastUpdateTime < this.config.updateInterval * 60 * 1000) {
          const cached = this.tweetCache.get(symbol);
          if (cached) {
            allTweets.push(...cached);
            continue;
          }
        }

        const tweets = await this.fetchTweetsForSymbol(symbol);
        
        // Analyze sentiment for each tweet
        const tweetsWithSentiment = await Promise.all(
          tweets.map(async (tweet) => {
            tweet.sentiment = await this.analyzeTweetSentiment(tweet);
            return tweet;
          })
        );

        // Cache results
        this.tweetCache.set(symbol, tweetsWithSentiment);
        this.lastUpdate.set(symbol, now);
        
        allTweets.push(...tweetsWithSentiment);

      } catch (error) {
        console.error(`Error monitoring Twitter for ${symbol}:`, error);
      }
    }

    return allTweets;
  }

  /**
   * Fetch tweets for a specific symbol
   */
  private async fetchTweetsForSymbol(symbol: string): Promise<Tweet[]> {
    const query = this.buildTwitterQuery(symbol);
    
    try {
      const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
        headers: {
          'Authorization': `Bearer ${this.config.twitterBearerToken}`
        },
        params: {
          query,
          max_results: Math.min(this.config.maxTweetsPerSymbol, 100),
          'tweet.fields': 'author_id,created_at,public_metrics,lang',
          'user.fields': 'username,public_metrics,verified',
          'expansions': 'author_id'
        },
        timeout: 15000
      });

      const tweets = response.data.data || [];
      const users = response.data.includes?.users || [];
      const userMap = new Map(users.map((user: any) => [user.id, user]));

      return tweets
        .filter((tweet: any) => tweet.lang === 'en') // English only
        .map((tweet: any) => {
          const author = userMap.get(tweet.author_id) as { username?: string; public_metrics?: { followers_count?: number }; verified?: boolean } || {};
          const followerCount = author.public_metrics?.followers_count || 0;
          
          return {
            id: tweet.id,
            text: tweet.text,
            authorId: tweet.author_id,
            authorUsername: author?.username || 'unknown',
            authorFollowers: followerCount,
            createdAt: new Date(tweet.created_at),
            publicMetrics: {
              retweetCount: tweet.public_metrics?.retweet_count || 0,
              likeCount: tweet.public_metrics?.like_count || 0,
              replyCount: tweet.public_metrics?.reply_count || 0,
              quoteCount: tweet.public_metrics?.quote_count || 0
            },
            symbols: [symbol],
            hashtags: this.extractHashtags(tweet.text),
            influence: this.calculateInfluence(followerCount, author?.verified || false)
          };
        });

    } catch (error) {
      console.error(`Twitter API error for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Build Twitter search query for symbol
   */
  private buildTwitterQuery(symbol: string): string {
    const baseSymbol = symbol.replace(/USDT|USD|BTC|ETH/g, '');
    const queries = [
      `$${baseSymbol}`,
      `#${baseSymbol}`,
      `${baseSymbol} crypto`,
      `${baseSymbol} price`,
      `${baseSymbol} pump`,
      `${baseSymbol} dump`
    ];
    
    return `(${queries.join(' OR ')}) -is:retweet lang:en`;
  }

  /**
   * Extract hashtags from tweet text
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : [];
  }

  /**
   * Calculate user influence score
   */
  private calculateInfluence(followers: number, verified: boolean): number {
    let influence = Math.min(1, followers / 1000000); // Max 1 for 1M+ followers
    if (verified) influence += 0.2;
    if (followers > this.config.influencerMinFollowers) influence += 0.1;
    return Math.min(1, influence);
  }

  /**
   * Analyze sentiment of individual tweet
   */
  private async analyzeTweetSentiment(tweet: Tweet): Promise<SocialSentimentScore> {
    const text = tweet.text;
    
    // Rule-based sentiment analysis for crypto tweets
    const bullishPatterns = [
      /moon|🌙|🚀|pump|bull|buy|hodl|diamond.*hands|💎|🙌|long|bullish/gi,
      /to.*the.*moon|rocket|lambo|gains|profit|surge|rally/gi,
      /breakout|support|resistance.*broken|new.*high/gi
    ];

    const bearishPatterns = [
      /dump|bear|sell|crash|dip|rekt|liquidat|short|bearish/gi,
      /falling|drop|decline|blood|red|panic|fear/gi,
      /resistance|rejection|breakdown|new.*low/gi
    ];

    const neutralPatterns = [
      /hold|waiting|watch|consolidat|sideways|range/gi
    ];

    let bullishScore = 0;
    let bearishScore = 0;
    let neutralScore = 0;

    // Count pattern matches
    bullishPatterns.forEach(pattern => {
      const matches = (text.match(pattern) || []).length;
      bullishScore += matches;
    });

    bearishPatterns.forEach(pattern => {
      const matches = (text.match(pattern) || []).length;
      bearishScore += matches;
    });

    neutralPatterns.forEach(pattern => {
      const matches = (text.match(pattern) || []).length;
      neutralScore += matches;
    });

    // Calculate engagement score
    const totalEngagement = tweet.publicMetrics.likeCount + 
                           tweet.publicMetrics.retweetCount * 2 + 
                           tweet.publicMetrics.replyCount;
    const engagement = Math.min(1, totalEngagement / 1000); // Normalize to 1000 interactions

    // Calculate virality potential
    const virality = Math.min(1, 
      (tweet.publicMetrics.retweetCount + tweet.publicMetrics.quoteCount) / 
      Math.max(1, tweet.publicMetrics.likeCount)
    );

    // Determine sentiment
    const total = bullishScore + bearishScore + neutralScore;
    if (total === 0) {
      return {
        score: 0,
        confidence: 0.1,
        label: 'neutral',
        magnitude: 0,
        engagement,
        virality
      };
    }

    let score: number;
    let label: 'bullish' | 'bearish' | 'neutral';
    
    if (bullishScore > bearishScore && bullishScore > neutralScore) {
      score = bullishScore / total;
      label = 'bullish';
    } else if (bearishScore > bullishScore && bearishScore > neutralScore) {
      score = -bearishScore / total;
      label = 'bearish';
    } else {
      score = 0;
      label = 'neutral';
    }

    // Adjust confidence based on influence and engagement
    const confidence = Math.min(1, 
      (total / 3) * tweet.influence * (1 + engagement)
    );

    return {
      score,
      confidence,
      label,
      magnitude: Math.abs(score),
      engagement,
      virality
    };
  }

  /**
   * Analyze hashtags for trending topics
   */
  async analyzeHashtags(symbol: string): Promise<HashtagTrend[]> {
    const cached = this.hashtagCache.get(symbol);
    if (cached) return cached;

    try {
      const tweets = this.tweetCache.get(symbol) || [];
      const hashtagCounts = new Map<string, { count: number; sentiment: number[] }>();

      // Count hashtags and collect sentiment
      tweets.forEach(tweet => {
        const sentiment = tweet.sentiment?.score || 0;
        tweet.hashtags.forEach(hashtag => {
          if (!hashtagCounts.has(hashtag)) {
            hashtagCounts.set(hashtag, { count: 0, sentiment: [] });
          }
          const data = hashtagCounts.get(hashtag)!;
          data.count++;
          data.sentiment.push(sentiment);
        });
      });

      // Convert to trends
      const trends: HashtagTrend[] = Array.from(hashtagCounts.entries())
        .map(([hashtag, data]) => ({
          hashtag,
          mentions: data.count,
          sentiment: data.sentiment.reduce((sum, s) => sum + s, 0) / data.sentiment.length,
          trendScore: Math.min(1, data.count / 50), // Normalize trend score
          relatedSymbols: [symbol],
          timeframe: '1h' as const
        }))
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 10);

      this.hashtagCache.set(symbol, trends);
      return trends;

    } catch (error) {
      console.error(`Error analyzing hashtags for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Calculate influencer sentiment with weighted scoring
   */
  calculateInfluencerSentiment(tweets: Tweet[]): {
    overall: number;
    breakdown: { bullish: number; bearish: number; neutral: number };
  } {
    const influencerTweets = tweets.filter(tweet => 
      this.influencerCache.has(tweet.authorUsername) || 
      tweet.influence > 0.5
    );

    if (influencerTweets.length === 0) {
      return {
        overall: 0,
        breakdown: { bullish: 0, bearish: 0, neutral: 0 }
      };
    }

    let weightedSentiment = 0;
    let totalWeight = 0;
    let bullish = 0, bearish = 0, neutral = 0;

    influencerTweets.forEach(tweet => {
      const weight = tweet.influence;
      const sentiment = tweet.sentiment?.score || 0;
      
      weightedSentiment += sentiment * weight;
      totalWeight += weight;

      if (sentiment > this.config.sentimentThreshold) bullish++;
      else if (sentiment < -this.config.sentimentThreshold) bearish++;
      else neutral++;
    });

    const overall = totalWeight > 0 ? weightedSentiment / totalWeight : 0;
    const total = bullish + bearish + neutral;

    return {
      overall,
      breakdown: {
        bullish: total > 0 ? bullish / total : 0,
        bearish: total > 0 ? bearish / total : 0,
        neutral: total > 0 ? neutral / total : 0
      }
    };
  }

  /**
   * Generate comprehensive social sentiment data
   */
  async generateSocialSentimentData(symbol: string): Promise<SocialSentimentData> {
    try {
      const tweets = await this.monitorTwitter([symbol]);
      const hashtags = await this.analyzeHashtags(symbol);
      const influencerSentiment = this.calculateInfluencerSentiment(tweets);

      if (tweets.length === 0) {
        return this.createNeutralSocialSentiment(symbol);
      }

      // Calculate overall sentiment
      const totalWeight = tweets.reduce((sum, tweet) => sum + tweet.influence, 0);
      const weightedSentiment = tweets.reduce((sum, tweet) => {
        return sum + (tweet.sentiment?.score || 0) * tweet.influence;
      }, 0) / Math.max(totalWeight, 1);

      // Calculate confidence
      const avgConfidence = tweets.reduce((sum, tweet) => 
        sum + (tweet.sentiment?.confidence || 0), 0) / tweets.length;

      // Calculate virality score
      const viralityScore = tweets.reduce((sum, tweet) => 
        sum + (tweet.sentiment?.virality || 0), 0) / tweets.length;

      // Determine trend
      let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (weightedSentiment > this.config.sentimentThreshold) trend = 'bullish';
      else if (weightedSentiment < -this.config.sentimentThreshold) trend = 'bearish';

      // Calculate momentum (simplified)
      const recentTweets = tweets.filter(t => 
        Date.now() - t.createdAt.getTime() < 3600000 // last hour
      );
      const momentum = recentTweets.length > tweets.length * 0.3 ? 'increasing' : 
                      recentTweets.length < tweets.length * 0.1 ? 'decreasing' : 'stable';

      const sentimentData: SocialSentimentData = {
        symbol,
        timestamp: Date.now(),
        overallSentiment: weightedSentiment,
        confidence: avgConfidence,
        tweetCount: tweets.length,
        trend,
        viralityScore,
        influencerSentiment: influencerSentiment.overall,
        communitySize: new Set(tweets.map(t => t.authorId)).size,
        topTweets: tweets
          .sort((a, b) => (b.sentiment?.magnitude || 0) - (a.sentiment?.magnitude || 0))
          .slice(0, 10),
        trendingHashtags: hashtags,
        influencerBreakdown: influencerSentiment.breakdown,
        momentum: momentum as 'increasing' | 'decreasing' | 'stable'
      };

      this.sentimentCache.set(symbol, sentimentData);
      return sentimentData;

    } catch (error) {
      console.error(`Error generating social sentiment for ${symbol}:`, error);
      return this.createNeutralSocialSentiment(symbol);
    }
  }

  /**
   * Create neutral social sentiment fallback
   */
  private createNeutralSocialSentiment(symbol: string): SocialSentimentData {
    return {
      symbol,
      timestamp: Date.now(),
      overallSentiment: 0,
      confidence: 0,
      tweetCount: 0,
      trend: 'neutral',
      viralityScore: 0,
      influencerSentiment: 0,
      communitySize: 0,
      topTweets: [],
      trendingHashtags: [],
      influencerBreakdown: { bullish: 0, bearish: 0, neutral: 0 },
      momentum: 'stable'
    };
  }

  /**
   * Get cached social sentiment
   */
  getCachedSocialSentiment(symbol: string): SocialSentimentData | null {
    const cached = this.sentimentCache.get(symbol);
    if (!cached) return null;

    // Check if cache is still valid (15 minutes)
    const maxAge = 15 * 60 * 1000;
    if (Date.now() - cached.timestamp > maxAge) {
      this.sentimentCache.delete(symbol);
      return null;
    }

    return cached;
  }

  /**
   * Get social sentiment summary for dashboard
   */
  getSocialSentimentSummary(): {
    totalSymbols: number;
    totalTweets: number;
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    avgVirality: number;
    topInfluencers: string[];
    trendingHashtags: string[];
  } {
    const sentiments = Array.from(this.sentimentCache.values());
    
    if (sentiments.length === 0) {
      return {
        totalSymbols: 0,
        totalTweets: 0,
        bullishCount: 0,
        bearishCount: 0,
        neutralCount: 0,
        avgVirality: 0,
        topInfluencers: [],
        trendingHashtags: []
      };
    }

    const totalTweets = sentiments.reduce((sum, s) => sum + s.tweetCount, 0);
    const bullishCount = sentiments.filter(s => s.trend === 'bullish').length;
    const bearishCount = sentiments.filter(s => s.trend === 'bearish').length;
    const neutralCount = sentiments.filter(s => s.trend === 'neutral').length;
    const avgVirality = sentiments.reduce((sum, s) => sum + s.viralityScore, 0) / sentiments.length;

    // Get top hashtags
    const allHashtags = sentiments.flatMap(s => s.trendingHashtags);
    const hashtagCounts = new Map<string, number>();
    allHashtags.forEach(ht => {
      hashtagCounts.set(ht.hashtag, (hashtagCounts.get(ht.hashtag) || 0) + ht.mentions);
    });
    const trendingHashtags = Array.from(hashtagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([hashtag]) => hashtag);

    return {
      totalSymbols: sentiments.length,
      totalTweets,
      bullishCount,
      bearishCount,
      neutralCount,
      avgVirality,
      topInfluencers: this.CRYPTO_INFLUENCERS.slice(0, 5),
      trendingHashtags
    };
  }
}
