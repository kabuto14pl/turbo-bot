"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * 🚀 TIER 2.2: Strategy Performance Panel
 * Multi-strategy comparison, win rates, PnL analysis
 */
const react_1 = require("react");
const card_1 = require("@/components/ui/card");
const badge_1 = require("@/components/ui/badge");
const recharts_1 = require("recharts");
const StrategyPerformancePanel = () => {
    const [strategies, setStrategies] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const fetchStrategies = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/signals');
                if (!response.ok)
                    throw new Error('Failed to fetch strategy data');
                const data = await response.json();
                setStrategies(data.strategies || []);
                setLoading(false);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };
        fetchStrategies();
        const interval = setInterval(fetchStrategies, 10000); // Update every 10s
        return () => clearInterval(interval);
    }, []);
    const formatPercent = (value) => `${(value * 100).toFixed(2)}%`;
    const formatCurrency = (value) => `$${value.toFixed(2)}`;
    const getWinRateColor = (winRate) => {
        if (winRate >= 0.6)
            return 'bg-green-500';
        if (winRate >= 0.5)
            return 'bg-blue-500';
        if (winRate >= 0.4)
            return 'bg-yellow-500';
        return 'bg-red-500';
    };
    const getPnLColor = (pnl) => {
        return pnl >= 0 ? 'text-green-600' : 'text-red-600';
    };
    const getSignalBadge = (signal) => {
        if (!signal)
            return (0, jsx_runtime_1.jsx)(badge_1.Badge, { variant: "outline", children: "No Signal" });
        const variant = signal.action === 'BUY' ? 'success' :
            signal.action === 'SELL' ? 'destructive' : 'secondary';
        return ((0, jsx_runtime_1.jsxs)(badge_1.Badge, { variant: variant, children: [signal.action, " (", formatPercent(signal.confidence), ")"] }));
    };
    // Prepare data for bar chart
    const chartData = strategies.map(s => ({
        name: s.name,
        winRate: s.winRate * 100,
        totalTrades: s.totalTrades
    }));
    if (loading) {
        return ((0, jsx_runtime_1.jsxs)(card_1.Card, { children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { children: (0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "\u26A1 Strategy Performance" }) }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: (0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center h-64", children: (0, jsx_runtime_1.jsx)("div", { className: "text-gray-500", children: "Loading strategy data..." }) }) })] }));
    }
    if (error) {
        return ((0, jsx_runtime_1.jsxs)(card_1.Card, { children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { children: (0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "\u26A1 Strategy Performance" }) }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: (0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center h-64", children: (0, jsx_runtime_1.jsxs)("div", { className: "text-red-500", children: ["Error: ", error] }) }) })] }));
    }
    return ((0, jsx_runtime_1.jsxs)(card_1.Card, { children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { children: (0, jsx_runtime_1.jsxs)(card_1.CardTitle, { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { children: "\u26A1 Strategy Performance" }), (0, jsx_runtime_1.jsxs)(badge_1.Badge, { variant: "outline", children: [strategies.filter(s => s.isActive).length, " Active"] })] }) }), (0, jsx_runtime_1.jsxs)(card_1.CardContent, { className: "space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-semibold mb-3", children: "Win Rate Comparison" }), (0, jsx_runtime_1.jsx)(recharts_1.ResponsiveContainer, { width: "100%", height: 200, children: (0, jsx_runtime_1.jsxs)(recharts_1.BarChart, { data: chartData, children: [(0, jsx_runtime_1.jsx)(recharts_1.CartesianGrid, { strokeDasharray: "3 3" }), (0, jsx_runtime_1.jsx)(recharts_1.XAxis, { dataKey: "name", angle: -45, textAnchor: "end", height: 80 }), (0, jsx_runtime_1.jsx)(recharts_1.YAxis, { domain: [0, 100] }), (0, jsx_runtime_1.jsx)(recharts_1.Tooltip, { formatter: (value, name) => {
                                                if (name === 'winRate')
                                                    return [`${Number(value).toFixed(2)}%`, 'Win Rate'];
                                                return [value, name];
                                            } }), (0, jsx_runtime_1.jsx)(recharts_1.Legend, {}), (0, jsx_runtime_1.jsx)(recharts_1.Bar, { dataKey: "winRate", fill: "#10b981", name: "Win Rate %" })] }) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-semibold mb-3", children: "Strategy Details" }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: strategies.map((strategy) => ((0, jsx_runtime_1.jsxs)("div", { className: `p-4 rounded-lg border ${strategy.isActive ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("h4", { className: "font-semibold", children: strategy.name }), strategy.isActive && (0, jsx_runtime_1.jsx)(badge_1.Badge, { variant: "success", children: "Active" })] }), getSignalBadge(strategy.lastSignal)] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-3 gap-4 text-sm", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-gray-600", children: "Total Trades" }), (0, jsx_runtime_1.jsx)("p", { className: "font-semibold", children: strategy.totalTrades })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-gray-600", children: "Win Rate" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("p", { className: "font-semibold", children: formatPercent(strategy.winRate) }), (0, jsx_runtime_1.jsx)("div", { className: `w-2 h-2 rounded-full ${getWinRateColor(strategy.winRate)}` })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-gray-600", children: "Total PnL" }), (0, jsx_runtime_1.jsx)("p", { className: `font-semibold ${getPnLColor(strategy.totalPnL)}`, children: formatCurrency(strategy.totalPnL) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-4 mt-3 pt-3 border-t text-sm", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-gray-600", children: "Avg Win" }), (0, jsx_runtime_1.jsx)("p", { className: "font-semibold text-green-600", children: formatCurrency(strategy.avgWin) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-gray-600", children: "Avg Loss" }), (0, jsx_runtime_1.jsx)("p", { className: "font-semibold text-red-600", children: formatCurrency(strategy.avgLoss) })] })] }), strategy.lastSignal && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-3 pt-3 border-t text-xs text-gray-500", children: ["Last signal: ", new Date(strategy.lastSignal.timestamp).toLocaleString()] }))] }, strategy.name))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "pt-4 border-t", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-semibold mb-3", children: "\uD83D\uDCCA Overall Summary" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [(0, jsx_runtime_1.jsxs)("div", { className: "p-3 bg-gray-50 rounded-lg", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-gray-600", children: "Total Trades (All Strategies)" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xl font-bold", children: strategies.reduce((sum, s) => sum + s.totalTrades, 0) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "p-3 bg-gray-50 rounded-lg", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-gray-600", children: "Combined Win Rate" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xl font-bold", children: formatPercent(strategies.reduce((sum, s) => sum + (s.winRate * s.totalTrades), 0) /
                                                    strategies.reduce((sum, s) => sum + s.totalTrades, 0) || 0) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "p-3 bg-gray-50 rounded-lg", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-gray-600", children: "Total PnL (All Strategies)" }), (0, jsx_runtime_1.jsx)("p", { className: `text-xl font-bold ${getPnLColor(strategies.reduce((sum, s) => sum + s.totalPnL, 0))}`, children: formatCurrency(strategies.reduce((sum, s) => sum + s.totalPnL, 0)) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "p-3 bg-gray-50 rounded-lg", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-gray-600", children: "Best Performer" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xl font-bold", children: strategies.length > 0 ?
                                                    strategies.reduce((best, s) => s.totalPnL > best.totalPnL ? s : best).name :
                                                    'N/A' })] })] })] })] })] }));
};
exports.default = StrategyPerformancePanel;
