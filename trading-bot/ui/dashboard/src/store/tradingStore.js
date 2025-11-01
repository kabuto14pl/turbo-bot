"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTradingSelectors = exports.useTradingStore = exports.TradingProvider = void 0;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
const React = __importStar(require("react"));
// Initial state
const initialState = {
    portfolio: null,
    trades: [],
    strategies: [],
    prices: {},
    systemStatus: null,
    alerts: []
};
// Reducer
function tradingReducer(state, action) {
    switch (action.type) {
        case 'SET_PORTFOLIO':
            return { ...state, portfolio: action.payload };
        case 'ADD_TRADE':
            return {
                ...state,
                trades: [action.payload, ...state.trades].slice(0, 100) // Keep only last 100 trades
            };
        case 'UPDATE_STRATEGY':
            const existingStrategyIndex = state.strategies.findIndex(s => s.id === action.payload.id);
            if (existingStrategyIndex >= 0) {
                const updatedStrategies = [...state.strategies];
                updatedStrategies[existingStrategyIndex] = action.payload;
                return { ...state, strategies: updatedStrategies };
            }
            else {
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
                alerts: [action.payload, ...state.alerts].slice(0, 50) // Keep only last 50 alerts
            };
        case 'MARK_ALERT_READ':
            return {
                ...state,
                alerts: state.alerts.map(alert => alert.id === action.payload ? { ...alert, read: true } : alert)
            };
        default:
            return state;
    }
}
const TradingContext = React.createContext(undefined);
// Provider
const TradingProvider = ({ children }) => {
    const [state, dispatch] = React.useReducer(tradingReducer, initialState);
    const setPortfolio = (portfolio) => {
        dispatch({ type: 'SET_PORTFOLIO', payload: portfolio });
    };
    const addTrade = (trade) => {
        dispatch({ type: 'ADD_TRADE', payload: trade });
    };
    const updateStrategy = (strategy) => {
        dispatch({ type: 'UPDATE_STRATEGY', payload: strategy });
    };
    const updatePrice = (priceData) => {
        dispatch({ type: 'UPDATE_PRICE', payload: priceData });
    };
    const setSystemStatus = (status) => {
        dispatch({ type: 'SET_SYSTEM_STATUS', payload: status });
    };
    const addAlert = (alert) => {
        dispatch({ type: 'ADD_ALERT', payload: alert });
    };
    const markAlertRead = (alertId) => {
        dispatch({ type: 'MARK_ALERT_READ', payload: alertId });
    };
    const contextValue = {
        state,
        setPortfolio,
        addTrade,
        updateStrategy,
        updatePrice,
        setSystemStatus,
        addAlert,
        markAlertRead
    };
    return React.createElement(TradingContext.Provider, { value: contextValue }, children);
};
exports.TradingProvider = TradingProvider;
// Hook
const useTradingStore = () => {
    const context = React.useContext(TradingContext);
    if (context === undefined) {
        throw new Error('useTradingStore must be used within a TradingProvider');
    }
    return context;
};
exports.useTradingStore = useTradingStore;
// Selectors for easy access
const useTradingSelectors = () => {
    const { state } = (0, exports.useTradingStore)();
    return {
        portfolio: state.portfolio,
        strategies: state.strategies,
        systemStatus: state.systemStatus,
        prices: state.prices,
        trades: state.trades,
        alerts: state.alerts
    };
};
exports.useTradingSelectors = useTradingSelectors;
