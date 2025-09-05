"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const material_1 = require("@mui/material");
// Mock data for demonstration
const mockData = [
    { strategy: 'RSI Pro', volume: 12500, trades: 28 },
    { strategy: 'MACD Dynamic', volume: 9800, trades: 22 },
    { strategy: 'Momentum Plus', volume: 15200, trades: 35 },
    { strategy: 'Scalping Ultra', volume: 6700, trades: 45 },
    { strategy: 'Trend Master', volume: 11300, trades: 19 },
    { strategy: 'Grid Trading', volume: 8900, trades: 31 },
];
const VolumeChart = ({ data = mockData }) => {
    const formatCurrency = (value) => {
        return `$${(value / 1000).toFixed(1)}k`;
    };
    const totalVolume = data.reduce((sum, item) => sum + item.volume, 0);
    const totalTrades = data.reduce((sum, item) => sum + item.trades, 0);
    const topStrategy = data.reduce((max, item) => item.volume > max.volume ? item : max, data[0]);
    const maxVolume = Math.max(...data.map(d => d.volume));
    const colors = ['#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#f44336', '#00bcd4'];
    return ((0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Strategy Volume" }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', justifyContent: 'space-around', mb: 3 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h5", color: "primary.main", children: formatCurrency(totalVolume) }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "text.secondary", children: "Total Volume" })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h5", color: "success.main", children: totalTrades }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "text.secondary", children: "Total Trades" })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", color: "warning.main", children: topStrategy?.strategy || 'N/A' }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "text.secondary", children: "Top Strategy" })] })] }), (0, jsx_runtime_1.jsx)(material_1.Box, { sx: {
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        p: 2,
                        borderRadius: 2,
                        height: 300
                    }, children: (0, jsx_runtime_1.jsxs)("svg", { width: "100%", height: "100%", viewBox: "0 0 800 260", children: [data.map((item, index) => {
                                const barWidth = 800 / data.length - 20;
                                const x = (index * (800 / data.length)) + 10;
                                const barHeight = (item.volume / maxVolume) * 200;
                                const y = 260 - barHeight - 30;
                                const color = colors[index % colors.length];
                                return ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("rect", { x: x, y: y, width: barWidth, height: barHeight, fill: color, opacity: 0.8, rx: "4" }), (0, jsx_runtime_1.jsx)("text", { x: x + barWidth / 2, y: y - 5, textAnchor: "middle", fill: "#fff", fontSize: "10", children: formatCurrency(item.volume) }), (0, jsx_runtime_1.jsx)("text", { x: x + barWidth / 2, y: 250, textAnchor: "middle", fill: "#888", fontSize: "10", transform: `rotate(-45 ${x + barWidth / 2} 250)`, children: item.strategy }), (0, jsx_runtime_1.jsx)("text", { x: x + barWidth / 2, y: y + barHeight / 2, textAnchor: "middle", fill: "white", fontSize: "12", fontWeight: "bold", children: item.trades })] }, index));
                            }), (0, jsx_runtime_1.jsx)("text", { x: "5", y: "20", fill: "#888", fontSize: "12", children: formatCurrency(maxVolume) }), (0, jsx_runtime_1.jsx)("text", { x: "5", y: "140", fill: "#888", fontSize: "12", children: formatCurrency(maxVolume / 2) }), (0, jsx_runtime_1.jsx)("text", { x: "5", y: "240", fill: "#888", fontSize: "12", children: "$0" })] }) }), (0, jsx_runtime_1.jsx)(material_1.Box, { sx: {
                        mt: 2,
                        maxHeight: 150,
                        overflowY: 'auto'
                    }, children: data.map((item, index) => ((0, jsx_runtime_1.jsxs)(material_1.Box, { sx: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            py: 1,
                            px: 2,
                            mb: 1,
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            borderRadius: 1,
                            borderLeft: 4,
                            borderLeftColor: colors[index % colors.length]
                        }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", fontWeight: "500", children: item.strategy }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { textAlign: 'right' }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "primary.main", children: formatCurrency(item.volume) }), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "caption", color: "text.secondary", children: [item.trades, " trades"] })] })] }, index))) })] }) }));
};
exports.default = VolumeChart;
