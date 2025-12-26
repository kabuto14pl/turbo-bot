"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * 🚀 TIER 2.2: Trading History Panel
 * Trade history table with filtering and export
 */
const react_1 = require("react");
const card_1 = require("@/components/ui/card");
const badge_1 = require("@/components/ui/badge");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const select_1 = require("@/components/ui/select");
const TradingHistoryPanel = () => {
    const [trades, setTrades] = (0, react_1.useState)([]);
    const [filteredTrades, setFilteredTrades] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // Filters
    const [strategyFilter, setStrategyFilter] = (0, react_1.useState)('all');
    const [actionFilter, setActionFilter] = (0, react_1.useState)('all');
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        const fetchTrades = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/trades');
                if (!response.ok)
                    throw new Error('Failed to fetch trades');
                const data = await response.json();
                setTrades(data.trades || []);
                setLoading(false);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };
        fetchTrades();
        const interval = setInterval(fetchTrades, 15000); // Update every 15s
        return () => clearInterval(interval);
    }, []);
    // Apply filters
    (0, react_1.useEffect)(() => {
        let filtered = [...trades];
        if (strategyFilter !== 'all') {
            filtered = filtered.filter(t => t.strategy === strategyFilter);
        }
        if (actionFilter !== 'all') {
            filtered = filtered.filter(t => t.action === actionFilter);
        }
        if (searchQuery) {
            filtered = filtered.filter(t => t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.id.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        // Sort by timestamp descending
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        setFilteredTrades(filtered.slice(0, 50)); // Show last 50 trades
    }, [trades, strategyFilter, actionFilter, searchQuery]);
    const formatCurrency = (value) => `$${value.toFixed(2)}`;
    const formatDateTime = (timestamp) => new Date(timestamp).toLocaleString();
    const getPnLColor = (pnl) => {
        return pnl >= 0 ? 'text-green-600' : 'text-red-600';
    };
    const getActionBadge = (action) => {
        return action === 'BUY' ?
            (0, jsx_runtime_1.jsx)(badge_1.Badge, { variant: "success", children: "BUY" }) :
            (0, jsx_runtime_1.jsx)(badge_1.Badge, { variant: "destructive", children: "SELL" });
    };
    const getStatusBadge = (status) => {
        const variants = {
            FILLED: 'success',
            PARTIAL: 'warning',
            CANCELLED: 'destructive'
        };
        return (0, jsx_runtime_1.jsx)(badge_1.Badge, { variant: variants[status], children: status });
    };
    const exportToCSV = () => {
        const headers = ['ID', 'Timestamp', 'Symbol', 'Action', 'Price', 'Quantity', 'PnL', 'Strategy', 'Commission', 'Status'];
        const csvData = filteredTrades.map(t => [
            t.id,
            formatDateTime(t.timestamp),
            t.symbol,
            t.action,
            t.price,
            t.quantity,
            t.pnl,
            t.strategy,
            t.commission,
            t.status
        ]);
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trading_history_${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };
    const uniqueStrategies = Array.from(new Set(trades.map(t => t.strategy)));
    const totalPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalCommissions = filteredTrades.reduce((sum, t) => sum + t.commission, 0);
    const winningTrades = filteredTrades.filter(t => t.pnl > 0).length;
    const losingTrades = filteredTrades.filter(t => t.pnl < 0).length;
    if (loading) {
        return ((0, jsx_runtime_1.jsxs)(card_1.Card, { children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { children: (0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "\uD83D\uDCDC Trading History" }) }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: (0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center h-64", children: (0, jsx_runtime_1.jsx)("div", { className: "text-gray-500", children: "Loading trading history..." }) }) })] }));
    }
    if (error) {
        return ((0, jsx_runtime_1.jsxs)(card_1.Card, { children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { children: (0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "\uD83D\uDCDC Trading History" }) }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: (0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center h-64", children: (0, jsx_runtime_1.jsxs)("div", { className: "text-red-500", children: ["Error: ", error] }) }) })] }));
    }
    return ((0, jsx_runtime_1.jsxs)(card_1.Card, { children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { children: (0, jsx_runtime_1.jsxs)(card_1.CardTitle, { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { children: "\uD83D\uDCDC Trading History" }), (0, jsx_runtime_1.jsxs)(badge_1.Badge, { variant: "outline", children: [filteredTrades.length, " Trades"] })] }) }), (0, jsx_runtime_1.jsxs)(card_1.CardContent, { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-3", children: [(0, jsx_runtime_1.jsx)(input_1.Input, { placeholder: "Search symbol or ID...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value) }), (0, jsx_runtime_1.jsxs)(select_1.Select, { value: strategyFilter, onValueChange: setStrategyFilter, children: [(0, jsx_runtime_1.jsx)(select_1.SelectTrigger, { children: (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: "All Strategies" }) }), (0, jsx_runtime_1.jsxs)(select_1.SelectContent, { children: [(0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "all", children: "All Strategies" }), uniqueStrategies.map(s => ((0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: s, children: s }, s)))] })] }), (0, jsx_runtime_1.jsxs)(select_1.Select, { value: actionFilter, onValueChange: setActionFilter, children: [(0, jsx_runtime_1.jsx)(select_1.SelectTrigger, { children: (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: "All Actions" }) }), (0, jsx_runtime_1.jsxs)(select_1.SelectContent, { children: [(0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "all", children: "All Actions" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "BUY", children: "BUY" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "SELL", children: "SELL" })] })] }), (0, jsx_runtime_1.jsx)(button_1.Button, { onClick: exportToCSV, variant: "outline", children: "\uD83D\uDCE5 Export CSV" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs text-gray-600", children: "Total PnL" }), (0, jsx_runtime_1.jsx)("p", { className: `text-lg font-bold ${getPnLColor(totalPnL)}`, children: formatCurrency(totalPnL) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs text-gray-600", children: "Win Rate" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-lg font-bold", children: [((winningTrades / (winningTrades + losingTrades) * 100) || 0).toFixed(1), "%"] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs text-gray-600", children: "Winning Trades" }), (0, jsx_runtime_1.jsx)("p", { className: "text-lg font-bold text-green-600", children: winningTrades })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs text-gray-600", children: "Losing Trades" }), (0, jsx_runtime_1.jsx)("p", { className: "text-lg font-bold text-red-600", children: losingTrades })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "overflow-x-auto", children: (0, jsx_runtime_1.jsxs)("table", { className: "w-full text-sm", children: [(0, jsx_runtime_1.jsx)("thead", { className: "bg-gray-100 border-b", children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { className: "text-left p-2", children: "Time" }), (0, jsx_runtime_1.jsx)("th", { className: "text-left p-2", children: "Symbol" }), (0, jsx_runtime_1.jsx)("th", { className: "text-left p-2", children: "Action" }), (0, jsx_runtime_1.jsx)("th", { className: "text-right p-2", children: "Price" }), (0, jsx_runtime_1.jsx)("th", { className: "text-right p-2", children: "Qty" }), (0, jsx_runtime_1.jsx)("th", { className: "text-right p-2", children: "PnL" }), (0, jsx_runtime_1.jsx)("th", { className: "text-left p-2", children: "Strategy" }), (0, jsx_runtime_1.jsx)("th", { className: "text-left p-2", children: "Status" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: filteredTrades.length === 0 ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: 8, className: "text-center p-8 text-gray-500", children: "No trades found matching filters" }) })) : (filteredTrades.map((trade) => ((0, jsx_runtime_1.jsxs)("tr", { className: "border-b hover:bg-gray-50", children: [(0, jsx_runtime_1.jsx)("td", { className: "p-2 text-xs", children: formatDateTime(trade.timestamp) }), (0, jsx_runtime_1.jsx)("td", { className: "p-2 font-semibold", children: trade.symbol }), (0, jsx_runtime_1.jsx)("td", { className: "p-2", children: getActionBadge(trade.action) }), (0, jsx_runtime_1.jsx)("td", { className: "p-2 text-right", children: formatCurrency(trade.price) }), (0, jsx_runtime_1.jsx)("td", { className: "p-2 text-right", children: trade.quantity.toFixed(4) }), (0, jsx_runtime_1.jsx)("td", { className: `p-2 text-right font-semibold ${getPnLColor(trade.pnl)}`, children: formatCurrency(trade.pnl) }), (0, jsx_runtime_1.jsx)("td", { className: "p-2 text-xs", children: trade.strategy }), (0, jsx_runtime_1.jsx)("td", { className: "p-2", children: getStatusBadge(trade.status) })] }, trade.id)))) })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "text-xs text-gray-500 text-center pt-2", children: ["Showing last ", filteredTrades.length, " trades", filteredTrades.length === 50 && ' (limited to 50 most recent)'] })] })] }));
};
exports.default = TradingHistoryPanel;
