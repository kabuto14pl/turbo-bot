import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:9091/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API Service Functions
export const tradingApi = {
  // Portfolio endpoints
  async getPortfolio() {
    const response = await api.get('/portfolio');
    return response.data;
  },

  async getPortfolioHistory(timeframe: string = '1d') {
    const response = await api.get(`/portfolio/history?timeframe=${timeframe}`);
    return response.data;
  },

  // Trading endpoints
  async getTrades(limit: number = 50) {
    const response = await api.get(`/trades?limit=${limit}`);
    return response.data;
  },

  async getTradeHistory(symbol?: string, strategy?: string) {
    const params = new URLSearchParams();
    if (symbol) params.append('symbol', symbol);
    if (strategy) params.append('strategy', strategy);
    
    const response = await api.get(`/trades/history?${params.toString()}`);
    return response.data;
  },

  async executeTrade(tradeData: {
    symbol: string;
    side: 'buy' | 'sell';
    amount: number;
    type?: 'market' | 'limit';
    price?: number;
  }) {
    const response = await api.post('/trades/execute', tradeData);
    return response.data;
  },

  // Strategy endpoints
  async getStrategies() {
    const response = await api.get('/strategies');
    return response.data;
  },

  async getStrategyDetails(strategyId: string) {
    const response = await api.get(`/strategies/${strategyId}`);
    return response.data;
  },

  async updateStrategyStatus(strategyId: string, status: 'active' | 'paused' | 'stopped') {
    const response = await api.patch(`/strategies/${strategyId}/status`, { status });
    return response.data;
  },

  async updateStrategyParams(strategyId: string, params: Record<string, any>) {
    const response = await api.patch(`/strategies/${strategyId}/params`, params);
    return response.data;
  },

  // Market data endpoints
  async getMarketData(symbols: string[] = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT']) {
    const response = await api.get(`/market/prices?symbols=${symbols.join(',')}`);
    return response.data;
  },

  async getCandles(symbol: string, timeframe: string = '15m', limit: number = 100) {
    const response = await api.get(`/market/candles/${symbol}?timeframe=${timeframe}&limit=${limit}`);
    return response.data;
  },

  async getOrderBook(symbol: string, depth: number = 20) {
    const response = await api.get(`/market/orderbook/${symbol}?depth=${depth}`);
    return response.data;
  },

  // System endpoints
  async getSystemStatus() {
    const response = await api.get('/system/status');
    return response.data;
  },

  async getSystemMetrics() {
    const response = await api.get('/system/metrics');
    return response.data;
  },

  async getLogs(level: string = 'info', limit: number = 100) {
    const response = await api.get(`/system/logs?level=${level}&limit=${limit}`);
    return response.data;
  },

  // Alert endpoints
  async getAlerts(limit: number = 50) {
    const response = await api.get(`/alerts?limit=${limit}`);
    return response.data;
  },

  async createAlert(alertData: {
    type: 'price' | 'volume' | 'strategy';
    condition: string;
    threshold: number;
    symbol?: string;
    strategy?: string;
  }) {
    const response = await api.post('/alerts', alertData);
    return response.data;
  },

  async deleteAlert(alertId: string) {
    const response = await api.delete(`/alerts/${alertId}`);
    return response.data;
  },

  // Configuration endpoints
  async getConfig() {
    const response = await api.get('/config');
    return response.data;
  },

  async updateConfig(configData: Record<string, any>) {
    const response = await api.patch('/config', configData);
    return response.data;
  },

  // Backtest endpoints
  async runBacktest(params: {
    strategy: string;
    symbol: string;
    startDate: string;
    endDate: string;
    initialBalance: number;
    parameters?: Record<string, any>;
  }) {
    const response = await api.post('/backtest/run', params);
    return response.data;
  },

  async getBacktestResults(backtestId: string) {
    const response = await api.get(`/backtest/results/${backtestId}`);
    return response.data;
  }
};

// Health check function
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await axios.get('http://localhost:9091/health');
    return response.status === 200;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};

// Utility function to handle API errors
export const handleApiError = (error: any): string => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    switch (status) {
      case 400:
        return data.message || 'Bad request';
      case 401:
        return 'Unauthorized access';
      case 403:
        return 'Access forbidden';
      case 404:
        return 'Resource not found';
      case 500:
        return 'Server error';
      default:
        return data.message || `Server error (${status})`;
    }
  } else if (error.request) {
    // Network error
    return 'Network error - unable to connect to server';
  } else {
    // Other error
    return error.message || 'An unexpected error occurred';
  }
};

export default api;
