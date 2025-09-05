/**
 * MARKET DATA TYPES - Required types for market data and trading
 */

export interface MarketData {
  timestamp: number;
  symbol: string;
  price: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  close: number;
  
  // Technical indicators
  sma_20?: number;
  sma_50?: number;
  ema_12?: number;
  ema_26?: number;
  rsi?: number;
  macd?: number;
  signal?: number;
  histogram?: number;
  bb_upper?: number;
  bb_middle?: number;
  bb_lower?: number;
  
  // Additional market data
  bid?: number;
  ask?: number;
  spread?: number;
  trades_count?: number;
}

export interface MarketState {
  timestamp: number;
  primary: MarketData;
  
  // Cross-asset correlations
  crossAsset: {
    btcEthCorrelation: number;
    dollarIndex: number;
    bondYields: number;
    vixLevel: number;
    goldPrice: number;
    oilPrice: number;
    defiTvl: number;
    stablecoinSupply: number;
    exchangeInflows: number;
    exchangeOutflows: number;
    sp500: number;
    nasdaq: number;
    eur_usd: number;
    gbp_usd: number;
  };
  
  // Market sentiment
  sentiment: {
    fearGreedIndex: number;
    socialSentiment: number;
    newssentiment: number;
    optionsFlow: number;
  };
  
  // Market structure
  orderbook: {
    bid_depth: number;
    ask_depth: number;
    spread: number;
    imbalance: number;
  };
}
