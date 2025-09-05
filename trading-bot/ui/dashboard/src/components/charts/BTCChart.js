"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const material_1 = require("@mui/material");
const BTCChart = ({ height = 300 }) => {
    const [interval, setInterval] = (0, react_1.useState)('1d');
    // Mock BTC price data based on interval
    const generateMockData = (intervalType) => {
        const dataPoints = intervalType === '1m' ? 60 : intervalType === '1h' ? 24 : 30;
        const basePrice = 43500;
        const data = [];
        for (let i = 0; i < dataPoints; i++) {
            const variance = (Math.random() - 0.5) * 2000; // ±1000 USDT variance
            const price = basePrice + variance + (Math.sin(i / 5) * 500); // Add some trend
            data.push({
                time: i,
                price: Math.max(40000, Math.min(47000, price)), // Keep within realistic range
                volume: Math.random() * 1000000 + 500000
            });
        }
        return data;
    };
    const [chartData] = (0, react_1.useState)(generateMockData(interval));
    const handleIntervalChange = (newInterval) => {
        setInterval(newInterval);
        console.log('BTC Chart interval changed to:', newInterval);
        // In real app, this would fetch new data
    };
    const currentPrice = chartData[chartData.length - 1]?.price || 43500;
    const previousPrice = chartData[chartData.length - 2]?.price || 43400;
    const priceChange = currentPrice - previousPrice;
    const priceChangePercent = (priceChange / previousPrice) * 100;
    const maxPrice = Math.max(...chartData.map(d => d.price));
    const minPrice = Math.min(...chartData.map(d => d.price));
    return ((0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "BTC/USDT Chart" }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "h4", color: priceChange >= 0 ? 'success.main' : 'error.main', children: ["$", currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })] }), (0, jsx_runtime_1.jsx)(material_1.Chip, { label: `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)} (${priceChangePercent.toFixed(2)}%)`, color: priceChange >= 0 ? 'success' : 'error', size: "small" })] })] }), (0, jsx_runtime_1.jsxs)(material_1.FormControl, { size: "small", sx: { minWidth: 100 }, children: [(0, jsx_runtime_1.jsx)(material_1.InputLabel, { children: "Interval" }), (0, jsx_runtime_1.jsxs)(material_1.Select, { value: interval, onChange: (e) => handleIntervalChange(e.target.value), label: "Interval", children: [(0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "1m", children: "1m" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "5m", children: "5m" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "15m", children: "15m" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "1h", children: "1h" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "4h", children: "4h" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "1d", children: "1d" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "1w", children: "1w" })] })] })] }), (0, jsx_runtime_1.jsx)(material_1.Box, { sx: {
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        p: 2,
                        borderRadius: 2,
                        height: height
                    }, children: (0, jsx_runtime_1.jsxs)("svg", { width: "100%", height: "100%", viewBox: "0 0 800 260", children: [(0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsx)("pattern", { id: "btcGrid", width: "50", height: "26", patternUnits: "userSpaceOnUse", children: (0, jsx_runtime_1.jsx)("path", { d: "M 50 0 L 0 0 0 26", fill: "none", stroke: "rgba(255,255,255,0.1)", strokeWidth: "0.5" }) }) }), (0, jsx_runtime_1.jsx)("rect", { width: "100%", height: "100%", fill: "url(#btcGrid)" }), chartData.map((point, index) => {
                                const x = (index / (chartData.length - 1)) * 760 + 20;
                                const normalizedPrice = ((point.price - minPrice) / (maxPrice - minPrice)) * 200 + 30;
                                const y = 260 - normalizedPrice;
                                return ((0, jsx_runtime_1.jsxs)("g", { children: [index > 0 && ((0, jsx_runtime_1.jsx)("line", { x1: (index - 1) / (chartData.length - 1) * 760 + 20, y1: 260 - (((chartData[index - 1].price - minPrice) / (maxPrice - minPrice)) * 200 + 30), x2: x, y2: y, stroke: "#ffa726", strokeWidth: "2" })), (0, jsx_runtime_1.jsx)("circle", { cx: x, cy: y, r: "3", fill: "#ffa726", opacity: "0.8" })] }, index));
                            }), (0, jsx_runtime_1.jsxs)("text", { x: "20", y: "20", fill: "#888", fontSize: "12", children: ["High: $", maxPrice.toFixed(0)] }), (0, jsx_runtime_1.jsxs)("text", { x: "20", y: "250", fill: "#888", fontSize: "12", children: ["Low: $", minPrice.toFixed(0)] }), (0, jsx_runtime_1.jsx)("text", { x: "680", y: "140", fill: "#888", fontSize: "12", children: "BTC/USDT" })] }) }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', justifyContent: 'space-around', mt: 2 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "text.secondary", children: "24h High" }), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "h6", color: "success.main", children: ["$", maxPrice.toFixed(0)] })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "text.secondary", children: "24h Low" }), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "h6", color: "error.main", children: ["$", minPrice.toFixed(0)] })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "text.secondary", children: "Volume" }), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "h6", children: [(chartData[chartData.length - 1]?.volume / 1000000).toFixed(2), "M"] })] })] })] }) }));
};
exports.default = BTCChart;
