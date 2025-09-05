import * as React from 'react';

// Types
export interface Portfolio {
  totalValue: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  positions?: Position[];
  availableBalance: number;
  lastUpdate: Date;
}

export interface Position {
  symbol: string;
  amount: number;
  value: number;
  pnl: number;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: Date;
  strategy?: string;
  pnl?: number;
  status: 'pending' | 'completed' | 'failed';
}

export interface Strategy {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'stopped';
  performance: number;
  totalTrades: number;
  winRate: number;
  symbol: string;
  params: Record<string, any>;
}

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  timestamp: number;
}

export interface SystemStatus {
  status: 'online' | 'offline' | 'maintenance';
  uptime: string;
  latency: number;
  ordersPerHour: number;
  activePairs: number;
  connectedExchanges: string[];
  lastUpdate: Date;
}

export interface Alert {
  id: string;
  type: 'price' | 'volume' | 'strategy' | 'system';
  message: string;
  level: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
}

// State
interface TradingState {
  portfolio: Portfolio | null;
  trades: Trade[];
  strategies: Strategy[];
  prices: Record<string, PriceData>;
  systemStatus: SystemStatus | null;
  alerts: Alert[];
}

// Actions
type TradingAction =
  | { type: 'SET_PORTFOLIO'; payload: Portfolio }
  | { type: 'ADD_TRADE'; payload: Trade }
  | { type: 'UPDATE_STRATEGY'; payload: Strategy }
  | { type: 'UPDATE_PRICE'; payload: PriceData }
  | { type: 'SET_SYSTEM_STATUS'; payload: SystemStatus }
  | { type: 'ADD_ALERT'; payload: Alert }
  | { type: 'MARK_ALERT_READ'; payload: string };

// Initial state
const initialState: TradingState = {
  portfolio: null,
  trades: [],
  strategies: [],
  prices: {},
  systemStatus: null,
  alerts: []
};

// Reducer
function tradingReducer(state: TradingState, action: TradingAction): TradingState {
  switch (action.type) {
    case 'SET_PORTFOLIO':
      return { ...state, portfolio: action.payload };
    
    case 'ADD_TRADE':
      return { 
        ...state, 
        trades: [action.payload, ...state.trades].slice(0, 100)
      };
    
    case 'UPDATE_STRATEGY':
      const existingStrategyIndex = state.strategies.findIndex(s => s.id === action.payload.id);
      if (existingStrategyIndex >= 0) {
        const updatedStrategies = [...state.strategies];
        updatedStrategies[existingStrategyIndex] = action.payload;
        return { ...state, strategies: updatedStrategies };
      } else {
        return { ...state, strategies: [...state.strategies, action.payload] };
      }
    
    case 'UPDATE_PRICE':
      return {
        ...state,
        prices: {
          ...state.prices,
          [action.payload.symbol]: action.payload
        }
      };
    
    case 'SET_SYSTEM_STATUS':
      return { ...state, systemStatus: action.payload };
    
    case 'ADD_ALERT':
      return {
        ...state,
        alerts: [action.payload, ...state.alerts].slice(0, 50)
      };
    
    case 'MARK_ALERT_READ':
      return {
        ...state,
        alerts: state.alerts.map(alert =>
          alert.id === action.payload ? { ...alert, read: true } : alert
        )
      };
    
    default:
      return state;
  }
}

// Context
interface TradingContextType {
  state: TradingState;
  setPortfolio: (portfolio: Portfolio) => void;
  addTrade: (trade: Trade) => void;
  updateStrategy: (strategy: Strategy) => void;
  updatePrice: (priceData: PriceData) => void;
  setSystemStatus: (status: SystemStatus) => void;
  addAlert: (alert: Alert) => void;
  markAlertRead: (alertId: string) => void;
}

const TradingContext = React.createContext<TradingContextType | undefined>(undefined);

// Provider
export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = React.useReducer(tradingReducer, initialState);

  const setPortfolio = React.useCallback((portfolio: Portfolio) => {
    dispatch({ type: 'SET_PORTFOLIO', payload: portfolio });
  }, []);

  const addTrade = React.useCallback((trade: Trade) => {
    dispatch({ type: 'ADD_TRADE', payload: trade });
  }, []);

  const updateStrategy = React.useCallback((strategy: Strategy) => {
    dispatch({ type: 'UPDATE_STRATEGY', payload: strategy });
  }, []);

  const updatePrice = React.useCallback((priceData: PriceData) => {
    dispatch({ type: 'UPDATE_PRICE', payload: priceData });
  }, []);

  const setSystemStatus = React.useCallback((status: SystemStatus) => {
    dispatch({ type: 'SET_SYSTEM_STATUS', payload: status });
  }, []);

  const addAlert = React.useCallback((alert: Alert) => {
    dispatch({ type: 'ADD_ALERT', payload: alert });
  }, []);

  const markAlertRead = React.useCallback((alertId: string) => {
    dispatch({ type: 'MARK_ALERT_READ', payload: alertId });
  }, []);

  const contextValue = React.useMemo(() => ({
    state,
    setPortfolio,
    addTrade,
    updateStrategy,
    updatePrice,
    setSystemStatus,
    addAlert,
    markAlertRead
  }), [state, setPortfolio, addTrade, updateStrategy, updatePrice, setSystemStatus, addAlert, markAlertRead]);

  return (
    <TradingContext.Provider value={contextValue}>
      {children}
    </TradingContext.Provider>
  );
};

// Hook
export const useTradingStore = () => {
  const context = React.useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTradingStore must be used within a TradingProvider');
  }
  return context;
};

// Selectors for easy access
export const useTradingSelectors = () => {
  const { state } = useTradingStore();
  
  return React.useMemo(() => ({
    portfolio: state.portfolio,
    strategies: state.strategies,
    systemStatus: state.systemStatus,
    prices: state.prices,
    trades: state.trades,
    alerts: state.alerts
  }), [state]);
};
