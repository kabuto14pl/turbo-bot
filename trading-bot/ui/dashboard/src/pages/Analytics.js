"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const ProfitChart_1 = __importDefault(require("../components/charts/ProfitChart"));
const VolumeChart_1 = __importDefault(require("../components/charts/VolumeChart"));
const BTCChart_1 = __importDefault(require("../components/charts/BTCChart"));
const Analytics = () => {
    const [timeframe, setTimeframe] = (0, react_1.useState)('1d');
    // Mock analytics data based on timeframe
    const getAnalyticsData = (tf) => {
        const baseData = {
            overview: {
                totalTrades: 156,
                winningTrades: 108,
                losingTrades: 48,
                winRate: 69.2,
                totalPnL: 3450.80,
                avgTradeSize: 850,
                maxDrawdown: 245.60,
                sharpeRatio: 1.85
            },
            performance: {
                daily: 125.50,
                weekly: 890.20,
                monthly: 3450.80,
                yearToDate: 12890.45
            },
            symbols: [
                { symbol: 'BTCUSDT', trades: 45, pnl: 1250.80, winRate: 72.1 },
                { symbol: 'ETHUSDT', trades: 38, pnl: 890.50, winRate: 68.4 },
                { symbol: 'BNBUSDT', trades: 32, pnl: 650.30, winRate: 65.6 },
                { symbol: 'ADAUSDT', trades: 25, pnl: 445.20, winRate: 60.0 },
                { symbol: 'DOTUSDT', trades: 16, pnl: 214.00, winRate: 62.5 }
            ],
            strategies: [
                { name: 'Enhanced RSI Turbo', trades: 68, pnl: 1890.45, winRate: 71.2, status: 'active' },
                { name: 'MACD Crossover', trades: 45, pnl: 980.30, winRate: 66.7, status: 'active' },
                { name: 'Bollinger Bands', trades: 32, pnl: 456.80, winRate: 59.4, status: 'paused' },
                { name: 'Moving Average', trades: 11, pnl: 123.25, winRate: 54.5, status: 'testing' }
            ]
        };
        // Adjust data based on timeframe
        const multipliers = {
            '1h': 0.1,
            '4h': 0.4,
            '1d': 1,
            '1w': 7,
            '1m': 30
        };
        const multiplier = multipliers[tf] || 1;
        return {
            ...baseData,
            overview: {
                ...baseData.overview,
                totalTrades: Math.round(baseData.overview.totalTrades * multiplier),
                totalPnL: baseData.overview.totalPnL * multiplier
            }
        };
    };
    const analyticsData = getAnalyticsData(timeframe);
    const handleTimeframeChange = (newTimeframe) => {
        setTimeframe(newTimeframe);
        console.log('Timeframe changed to:', newTimeframe);
        // Here you would typically fetch new data from an API
    };
    const formatCurrency = (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatPercent = (value) => `${value.toFixed(1)}%`;
    return ((0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { p: 3 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h4", gutterBottom: true, children: "Analytics & Reports" }), (0, jsx_runtime_1.jsxs)(material_1.FormControl, { size: "small", sx: { minWidth: 120 }, children: [(0, jsx_runtime_1.jsx)(material_1.InputLabel, { children: "Timeframe" }), (0, jsx_runtime_1.jsxs)(material_1.Select, { value: timeframe, onChange: (e) => handleTimeframeChange(e.target.value), label: "Timeframe", children: [(0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "1h", children: "1 Hour" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "4h", children: "4 Hours" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "1d", children: "1 Day" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "1w", children: "1 Week" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "1m", children: "1 Month" })] })] })] }), (0, jsx_runtime_1.jsxs)(material_1.Grid, { container: true, spacing: 3, sx: { mb: 4 }, children: [(0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 3, children: (0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsx)(material_1.CardContent, { children: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { color: "textSecondary", gutterBottom: true, children: "Total P&L" }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h5", color: "success.main", children: formatCurrency(analyticsData.overview.totalPnL) })] }), (0, jsx_runtime_1.jsx)(material_1.Avatar, { sx: { bgcolor: 'success.main' }, children: (0, jsx_runtime_1.jsx)(icons_material_1.TrendingUp, {}) })] }) }) }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 3, children: (0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsx)(material_1.CardContent, { children: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { color: "textSecondary", gutterBottom: true, children: "Win Rate" }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h5", color: "primary.main", children: formatPercent(analyticsData.overview.winRate) }), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "body2", color: "textSecondary", children: [analyticsData.overview.winningTrades, "/", analyticsData.overview.totalTrades, " trades"] })] }), (0, jsx_runtime_1.jsx)(material_1.Avatar, { sx: { bgcolor: 'primary.main' }, children: (0, jsx_runtime_1.jsx)(icons_material_1.Assessment, {}) })] }) }) }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 3, children: (0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsx)(material_1.CardContent, { children: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { color: "textSecondary", gutterBottom: true, children: "Sharpe Ratio" }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h5", color: "info.main", children: analyticsData.overview.sharpeRatio }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "textSecondary", children: "Risk-adjusted return" })] }), (0, jsx_runtime_1.jsx)(material_1.Avatar, { sx: { bgcolor: 'info.main' }, children: (0, jsx_runtime_1.jsx)(icons_material_1.Timeline, {}) })] }) }) }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 3, children: (0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsx)(material_1.CardContent, { children: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { color: "textSecondary", gutterBottom: true, children: "Max Drawdown" }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h5", color: "error.main", children: formatCurrency(analyticsData.overview.maxDrawdown) }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "textSecondary", children: "Peak to trough" })] }), (0, jsx_runtime_1.jsx)(material_1.Avatar, { sx: { bgcolor: 'error.main' }, children: (0, jsx_runtime_1.jsx)(icons_material_1.TrendingDown, {}) })] }) }) }) })] }), (0, jsx_runtime_1.jsxs)(material_1.Grid, { container: true, spacing: 3, sx: { mb: 4 }, children: [(0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, lg: 6, children: (0, jsx_runtime_1.jsx)(BTCChart_1.default, {}) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, lg: 6, children: (0, jsx_runtime_1.jsx)(ProfitChart_1.default, {}) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, lg: 12, children: (0, jsx_runtime_1.jsx)(VolumeChart_1.default, {}) })] }), (0, jsx_runtime_1.jsxs)(material_1.Grid, { container: true, spacing: 3, sx: { mb: 4 }, children: [(0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 6, children: (0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Performance by Timeframe" }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { mb: 2 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", children: "Daily" }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "success.main", children: formatCurrency(analyticsData.performance.daily) })] }), (0, jsx_runtime_1.jsx)(material_1.LinearProgress, { variant: "determinate", value: 25, color: "success", sx: { mb: 2 } })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { mb: 2 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", children: "Weekly" }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "success.main", children: formatCurrency(analyticsData.performance.weekly) })] }), (0, jsx_runtime_1.jsx)(material_1.LinearProgress, { variant: "determinate", value: 45, color: "success", sx: { mb: 2 } })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { mb: 2 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", children: "Monthly" }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "success.main", children: formatCurrency(analyticsData.performance.monthly) })] }), (0, jsx_runtime_1.jsx)(material_1.LinearProgress, { variant: "determinate", value: 75, color: "success", sx: { mb: 2 } })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", children: "Year to Date" }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "success.main", children: formatCurrency(analyticsData.performance.yearToDate) })] }), (0, jsx_runtime_1.jsx)(material_1.LinearProgress, { variant: "determinate", value: 100, color: "success" })] })] }) }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 6, children: (0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Top Performing Symbols" }), (0, jsx_runtime_1.jsx)(material_1.TableContainer, { children: (0, jsx_runtime_1.jsxs)(material_1.Table, { size: "small", children: [(0, jsx_runtime_1.jsx)(material_1.TableHead, { children: (0, jsx_runtime_1.jsxs)(material_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Symbol" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: "Trades" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: "P&L" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: "Win Rate" })] }) }), (0, jsx_runtime_1.jsx)(material_1.TableBody, { children: analyticsData.symbols.map((symbol, index) => ((0, jsx_runtime_1.jsxs)(material_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(material_1.TableCell, { children: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center' }, children: [(0, jsx_runtime_1.jsx)(material_1.Avatar, { sx: { width: 20, height: 20, mr: 1, fontSize: '0.6rem' }, children: symbol.symbol.slice(0, 2) }), symbol.symbol] }) }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: symbol.trades }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: (0, jsx_runtime_1.jsx)(material_1.Typography, { color: "success.main", children: formatCurrency(symbol.pnl) }) }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: (0, jsx_runtime_1.jsx)(material_1.Chip, { label: formatPercent(symbol.winRate), color: "primary", size: "small", variant: "outlined" }) })] }, index))) })] }) })] }) }) })] }), (0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Strategy Performance Analysis" }), (0, jsx_runtime_1.jsx)(material_1.TableContainer, { component: material_1.Paper, children: (0, jsx_runtime_1.jsxs)(material_1.Table, { children: [(0, jsx_runtime_1.jsx)(material_1.TableHead, { children: (0, jsx_runtime_1.jsxs)(material_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Strategy" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: "Trades" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: "P&L" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: "Win Rate" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Status" })] }) }), (0, jsx_runtime_1.jsx)(material_1.TableBody, { children: analyticsData.strategies.map((strategy, index) => ((0, jsx_runtime_1.jsxs)(material_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(material_1.TableCell, { children: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center' }, children: [(0, jsx_runtime_1.jsx)(material_1.Avatar, { sx: { width: 24, height: 24, mr: 1 }, children: (0, jsx_runtime_1.jsx)(icons_material_1.ShowChart, {}) }), strategy.name] }) }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: strategy.trades }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: (0, jsx_runtime_1.jsx)(material_1.Typography, { color: "success.main", children: formatCurrency(strategy.pnl) }) }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: formatPercent(strategy.winRate) }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: (0, jsx_runtime_1.jsx)(material_1.Chip, { label: strategy.status, color: strategy.status === 'active' ? 'success' :
                                                            strategy.status === 'paused' ? 'warning' : 'info', size: "small" }) })] }, index))) })] }) })] }) })] }));
};
exports.default = Analytics;
