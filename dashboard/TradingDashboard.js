"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * 🚀 TIER 2.2: Enterprise Trading Dashboard - Main Component
 * Real-time portfolio monitoring with advanced risk analytics
 */
const react_1 = require("react");
const recharts_1 = require("recharts");
const card_1 = require("@/components/ui/card");
const alert_1 = require("@/components/ui/alert");
const RiskMetricsPanel_1 = __importDefault(require("./RiskMetricsPanel"));
const StrategyPerformancePanel_1 = __importDefault(require("./StrategyPerformancePanel"));
const TradingHistoryPanel_1 = __importDefault(require("./TradingHistoryPanel"));
const TradingDashboard = () => {
    const [portfolio, setPortfolio] = (0, react_1.useState)(null);
    const [varMetrics, setVarMetrics] = (0, react_1.useState)(null);
    const [kellyMetrics, setKellyMetrics] = (0, react_1.useState)(null);
    const [healthStatus, setHealthStatus] = (0, react_1.useState)(null);
    const [portfolioHistory, setPortfolioHistory] = (0, react_1.useState)([]);
    const [wsConnected, setWsConnected] = (0, react_1.useState)(false);
    const [alerts, setAlerts] = (0, react_1.useState)([]);
    // WebSocket connection for real-time updates
    (0, react_1.useEffect)(() => {
        const ws = new WebSocket('ws://localhost:3001/ws');
        ws.onopen = () => {
            console.log('✅ WebSocket connected to trading bot');
            setWsConnected(true);
        };
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'portfolio_update':
                    setPortfolio(data.payload);
                    setPortfolioHistory(prev => [...prev.slice(-100), data.payload]);
                    break;
                case 'var_update':
                    setVarMetrics(data.payload);
                    checkVaRAlerts(data.payload);
                    break;
                case 'kelly_update':
                    setKellyMetrics(data.payload);
                    checkKellyAlerts(data.payload);
                    break;
                case 'health_update':
                    setHealthStatus(data.payload);
                    break;
                case 'alert':
                    setAlerts(prev => [...prev.slice(-5), data.message]);
                    break;
            }
        };
        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            setWsConnected(false);
        };
        ws.onclose = () => {
            console.log('🔌 WebSocket disconnected');
            setWsConnected(false);
            // Attempt reconnection after 5 seconds
            setTimeout(() => window.location.reload(), 5000);
        };
        return () => ws.close();
    }, []);
    // Polling fallback if WebSocket fails
    (0, react_1.useEffect)(() => {
        if (wsConnected)
            return;
        const fetchData = async () => {
            try {
                const [portfolioRes, healthRes] = await Promise.all([
                    fetch('http://localhost:3001/api/portfolio'),
                    fetch('http://localhost:3001/health')
                ]);
                const portfolioData = await portfolioRes.json();
                const healthData = await healthRes.json();
                setPortfolio(portfolioData);
                setHealthStatus(healthData);
                setPortfolioHistory(prev => [...prev.slice(-100), portfolioData]);
            }
            catch (error) {
                console.error('❌ Failed to fetch data:', error);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [wsConnected]);
    const checkVaRAlerts = (0, react_1.useCallback)((metrics) => {
        const varThreshold = 0.05; // 5% daily VaR limit
        if (metrics.parametric > varThreshold) {
            setAlerts(prev => [
                ...prev.slice(-4),
                `⚠️ Parametric VaR (${(metrics.parametric * 100).toFixed(2)}%) exceeds ${varThreshold * 100}% threshold`
            ]);
        }
        if (metrics.historical > varThreshold) {
            setAlerts(prev => [
                ...prev.slice(-4),
                `⚠️ Historical VaR (${(metrics.historical * 100).toFixed(2)}%) exceeds ${varThreshold * 100}% threshold`
            ]);
        }
    }, []);
    const checkKellyAlerts = (0, react_1.useCallback)((metrics) => {
        if (metrics.adjustedFraction < 0.01) {
            setAlerts(prev => [
                ...prev.slice(-4),
                `⚠️ Kelly Criterion suggests reducing position size (${(metrics.adjustedFraction * 100).toFixed(2)}%)`
            ]);
        }
        if (metrics.optimalFraction < 0) {
            setAlerts(prev => [
                ...prev.slice(-4),
                `🚨 Negative Kelly fraction - strategy losing edge!`
            ]);
        }
    }, []);
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(value);
    };
    const formatPercent = (value) => {
        return `${(value * 100).toFixed(2)}%`;
    };
    const getHealthColor = (status) => {
        switch (status) {
            case 'healthy': return 'text-green-600 bg-green-50';
            case 'degraded': return 'text-yellow-600 bg-yellow-50';
            case 'unhealthy': return 'text-red-600 bg-red-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "min-h-screen bg-gray-100 p-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-6", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-3xl font-bold text-gray-900", children: "\uD83D\uDE80 Autonomous Trading Bot - Enterprise Dashboard" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4 mt-2", children: [(0, jsx_runtime_1.jsx)("div", { className: `px-3 py-1 rounded-full text-sm font-medium ${wsConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`, children: wsConnected ? '🟢 Live Connection' : '🔴 Polling Mode' }), healthStatus && ((0, jsx_runtime_1.jsxs)("div", { className: `px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(healthStatus.status)}`, children: ["Status: ", healthStatus.status.toUpperCase()] })), healthStatus && ((0, jsx_runtime_1.jsxs)("div", { className: "text-sm text-gray-600", children: ["Uptime: ", Math.floor(healthStatus.uptime / 3600), "h ", Math.floor((healthStatus.uptime % 3600) / 60), "m"] }))] })] }), alerts.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "mb-6 space-y-2", children: alerts.map((alert, index) => ((0, jsx_runtime_1.jsx)(alert_1.Alert, { variant: "destructive", children: (0, jsx_runtime_1.jsx)(alert_1.AlertDescription, { children: alert }) }, index))) })), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [(0, jsx_runtime_1.jsxs)(card_1.Card, { className: "lg:col-span-2", children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { children: (0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "Portfolio Performance" }) }), (0, jsx_runtime_1.jsxs)(card_1.CardContent, { children: [portfolio && ((0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-600", children: "Total Value" }), (0, jsx_runtime_1.jsx)("p", { className: "text-2xl font-bold", children: formatCurrency(portfolio.totalValue) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-600", children: "Unrealized PnL" }), (0, jsx_runtime_1.jsx)("p", { className: `text-2xl font-bold ${portfolio.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`, children: formatCurrency(portfolio.unrealizedPnL) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-600", children: "Realized PnL" }), (0, jsx_runtime_1.jsx)("p", { className: `text-2xl font-bold ${portfolio.realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`, children: formatCurrency(portfolio.realizedPnL) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-600", children: "Win Rate" }), (0, jsx_runtime_1.jsx)("p", { className: "text-2xl font-bold", children: formatPercent(portfolio.winRate) })] })] })), portfolioHistory.length > 0 && ((0, jsx_runtime_1.jsx)(recharts_1.ResponsiveContainer, { width: "100%", height: 300, children: (0, jsx_runtime_1.jsxs)(recharts_1.LineChart, { data: portfolioHistory, children: [(0, jsx_runtime_1.jsx)(recharts_1.CartesianGrid, { strokeDasharray: "3 3" }), (0, jsx_runtime_1.jsx)(recharts_1.XAxis, { dataKey: "timestamp", tickFormatter: (ts) => new Date(ts).toLocaleTimeString() }), (0, jsx_runtime_1.jsx)(recharts_1.YAxis, { tickFormatter: (val) => `$${(val / 1000).toFixed(1)}k` }), (0, jsx_runtime_1.jsx)(recharts_1.Tooltip, { labelFormatter: (ts) => new Date(ts).toLocaleString(), formatter: (value) => formatCurrency(value) }), (0, jsx_runtime_1.jsx)(recharts_1.Legend, {}), (0, jsx_runtime_1.jsx)(recharts_1.Line, { type: "monotone", dataKey: "totalValue", stroke: "#8884d8", name: "Total Value" }), (0, jsx_runtime_1.jsx)(recharts_1.Line, { type: "monotone", dataKey: "unrealizedPnL", stroke: "#82ca9d", name: "Unrealized PnL" }), (0, jsx_runtime_1.jsx)(recharts_1.Line, { type: "monotone", dataKey: "realizedPnL", stroke: "#ffc658", name: "Realized PnL" })] }) }))] })] }), (0, jsx_runtime_1.jsx)(RiskMetricsPanel_1.default, { varMetrics: varMetrics, kellyMetrics: kellyMetrics, portfolio: portfolio })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6", children: [(0, jsx_runtime_1.jsx)(StrategyPerformancePanel_1.default, {}), (0, jsx_runtime_1.jsx)(TradingHistoryPanel_1.default, {})] }), portfolioHistory.length > 0 && ((0, jsx_runtime_1.jsxs)(card_1.Card, { className: "mt-6", children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { children: (0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "Drawdown Analysis" }) }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: (0, jsx_runtime_1.jsx)(recharts_1.ResponsiveContainer, { width: "100%", height: 200, children: (0, jsx_runtime_1.jsxs)(recharts_1.LineChart, { data: portfolioHistory, children: [(0, jsx_runtime_1.jsx)(recharts_1.CartesianGrid, { strokeDasharray: "3 3" }), (0, jsx_runtime_1.jsx)(recharts_1.XAxis, { dataKey: "timestamp", tickFormatter: (ts) => new Date(ts).toLocaleTimeString() }), (0, jsx_runtime_1.jsx)(recharts_1.YAxis, { tickFormatter: (val) => formatPercent(val), domain: [-0.3, 0] }), (0, jsx_runtime_1.jsx)(recharts_1.Tooltip, { labelFormatter: (ts) => new Date(ts).toLocaleString(), formatter: (value) => formatPercent(value) }), (0, jsx_runtime_1.jsx)(recharts_1.Legend, {}), (0, jsx_runtime_1.jsx)(recharts_1.Line, { type: "monotone", dataKey: "drawdown", stroke: "#ff4444", name: "Current Drawdown", strokeWidth: 2 })] }) }) })] }))] }));
};
exports.default = TradingDashboard;
