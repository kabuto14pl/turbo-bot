/**
 * 🚀 [PRODUCTION-API]
 * Production API component
 */
/**
 * 📊 TRADING BOT DASHBOARD - TYPE DEFINITIONS
 * 
 * Centralized type definitions for the React dashboard application
 */

export interface Portfolio {
  totalValue: number;
  availableBalance: number;
  totalPnL: number;
  dailyPnL: number;
  totalPnLPercent: number;
  dailyPnLPercent: number;
  positions: Position[];
  equity: number;
  margin: number;
  marginLevel: number;
}

export interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  currentPrice: number;
  markPrice: number;
  pnl: number;
  pnlPercent: number;
  marginUsed: number;
  leverage: number;
  liquidationPrice?: number;
  timestamp: number;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  amount: number;
  price: number;
  timestamp: number;
  commission: number;
  pnl?: number;
  strategy: string;
  status: 'FILLED' | 'PENDING' | 'CANCELLED';
}

export interface Strategy {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  symbol: string;
  pnl: number;
  pnlPercent: number;
  tradesCount: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  lastSignal?: TradingSignal;
  parameters: Record<string, any>;
  performance: StrategyPerformance;
}

export interface TradingSignal {
  id: string;
  strategy: string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  timestamp: number;
  reasoning: string;
  indicators: Record<string, number>;
}

export interface StrategyPerformance {
  totalReturn: number;
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export interface RiskMetrics {
  portfolioVaR: number;
  portfolioVaR99: number;
  expectedShortfall: number;
  betaToMarket: number;
  correlationToMarket: number;
  portfolioVolatility: number;
  concentrationRisk: number;
  leverageRatio: number;
  liquidityRisk: number;
  stressTestResults: StressTestResult[];
}

export interface StressTestResult {
  scenario: string;
  portfolioImpact: number;
  timeHorizon: string;
  probability: number;
  description: string;
}

export interface Alert {
  id: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: number;
  source: string;
  acknowledged: boolean;
  data?: any;
}

export interface SystemStatus {
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR';
  uptime: number;
  version: string;
  lastUpdate: number;
  services: ServiceStatus[];
  performance: SystemPerformance;
}

export interface ServiceStatus {
  name: string;
  status: 'RUNNING' | 'STOPPED' | 'ERROR';
  uptime: number;
  lastCheck: number;
  url?: string;
  metrics?: Record<string, number>;
}

export interface SystemPerformance {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  activeConnections: number;
  requestsPerSecond: number;
  errorRate: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
  bid: number;
  ask: number;
  spread: number;
}

export interface ChartData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DashboardSettings {
  theme: 'light' | 'dark' | 'auto';
  refreshInterval: number;
  defaultTimeframe: string;
  notifications: {
    browser: boolean;
    sound: boolean;
    email: boolean;
  };
  charts: {
    defaultType: 'line' | 'candlestick' | 'area';
    showVolume: boolean;
    showIndicators: boolean;
  };
  layout: {
    sidebarCollapsed: boolean;
    gridLayout: GridLayoutItem[];
  };
}

export interface GridLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface WebSocketMessage {
  type: 'PORTFOLIO_UPDATE' | 'TRADE_UPDATE' | 'SIGNAL_UPDATE' | 'ALERT_UPDATE' | 'SYSTEM_UPDATE' | 'MARKET_DATA';
  data: any;
  timestamp: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  symbol?: string;
  strategy?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

// Chart.js specific types
export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  scales?: any;
  plugins?: any;
  animation?: any;
}

export interface ChartDataset {
  label: string;
  data: number[];
  borderColor?: string;
  backgroundColor?: string;
  fill?: boolean;
  tension?: number;
}

// Material-UI theme extensions
declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      profit: string;
      loss: string;
      neutral: string;
    };
  }
  
  interface ThemeOptions {
    custom?: {
      profit?: string;
      loss?: string;
      neutral?: string;
    };
  }
}
