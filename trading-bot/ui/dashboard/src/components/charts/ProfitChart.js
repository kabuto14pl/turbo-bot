"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const material_1 = require("@mui/material");
// Mock data for demonstration
const mockData = [
    { date: '09:00', profit: 150, cumulative: 150 },
    { date: '10:00', profit: -80, cumulative: 70 },
    { date: '11:00', profit: 220, cumulative: 290 },
    { date: '12:00', profit: 180, cumulative: 470 },
    { date: '13:00', profit: -120, cumulative: 350 },
    { date: '14:00', profit: 300, cumulative: 650 },
    { date: '15:00', profit: 95, cumulative: 745 },
    { date: '16:00', profit: -45, cumulative: 700 },
];
const ProfitChart = ({ data = mockData }) => {
    const formatCurrency = (value) => {
        return `$${value.toFixed(2)}`;
    };
    const latestProfit = data[data.length - 1];
    const totalProfit = latestProfit?.cumulative || 0;
    const lastTrade = latestProfit?.profit || 0;
    // Calculate some basic stats
    const maxProfit = Math.max(...data.map(d => d.cumulative));
    const minProfit = Math.min(...data.map(d => d.cumulative));
    const totalTrades = data.length;
    const profitableTrades = data.filter(d => d.profit > 0).length;
    const winRate = (profitableTrades / totalTrades) * 100;
    return ((0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Profit/Loss Chart" }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', justifyContent: 'space-around', mb: 3 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h4", color: totalProfit >= 0 ? 'success.main' : 'error.main', children: formatCurrency(totalProfit) }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "subtitle2", color: "text.secondary", children: "Total P&L" })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { textAlign: 'center' }, children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "h5", color: lastTrade >= 0 ? 'success.main' : 'error.main', children: [lastTrade >= 0 ? '+' : '', formatCurrency(lastTrade)] }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "subtitle2", color: "text.secondary", children: "Last Trade" })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { textAlign: 'center' }, children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "h5", color: "primary.main", children: [winRate.toFixed(1), "%"] }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "subtitle2", color: "text.secondary", children: "Win Rate" })] })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: {
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        p: 3,
                        borderRadius: 2,
                        position: 'relative',
                        height: 300
                    }, children: [(0, jsx_runtime_1.jsxs)("svg", { width: "100%", height: "100%", viewBox: "0 0 800 260", children: [(0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsx)("pattern", { id: "grid", width: "40", height: "26", patternUnits: "userSpaceOnUse", children: (0, jsx_runtime_1.jsx)("path", { d: "M 40 0 L 0 0 0 26", fill: "none", stroke: "rgba(255,255,255,0.1)", strokeWidth: "0.5" }) }) }), (0, jsx_runtime_1.jsx)("rect", { width: "100%", height: "100%", fill: "url(#grid)" }), data.map((point, index) => {
                                    const x = (index / (data.length - 1)) * 760 + 20;
                                    const normalizedCumulative = ((point.cumulative - minProfit) / (maxProfit - minProfit)) * 200 + 30;
                                    const y = 260 - normalizedCumulative;
                                    return ((0, jsx_runtime_1.jsxs)("g", { children: [index > 0 && ((0, jsx_runtime_1.jsx)("line", { x1: (index - 1) / (data.length - 1) * 760 + 20, y1: 260 - (((data[index - 1].cumulative - minProfit) / (maxProfit - minProfit)) * 200 + 30), x2: x, y2: y, stroke: "#4caf50", strokeWidth: "3" })), (0, jsx_runtime_1.jsx)("circle", { cx: x, cy: y, r: "4", fill: point.profit >= 0 ? "#4caf50" : "#f44336", stroke: "white", strokeWidth: "2" }), (0, jsx_runtime_1.jsx)("rect", { x: x - 8, y: point.profit >= 0 ? y - 15 : y + 5, width: "16", height: Math.abs(point.profit) * 0.1, fill: point.profit >= 0 ? "rgba(76, 175, 80, 0.6)" : "rgba(244, 67, 54, 0.6)" })] }, index));
                                }), (0, jsx_runtime_1.jsxs)("text", { x: "20", y: "20", fill: "#888", fontSize: "12", children: ["High: ", formatCurrency(maxProfit)] }), (0, jsx_runtime_1.jsxs)("text", { x: "20", y: "250", fill: "#888", fontSize: "12", children: ["Low: ", formatCurrency(minProfit)] })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: {
                                position: 'absolute',
                                bottom: 10,
                                right: 20,
                                display: 'flex',
                                gap: 2,
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                p: 1,
                                borderRadius: 1
                            }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 }, children: [(0, jsx_runtime_1.jsx)(material_1.Box, { sx: { width: 12, height: 3, backgroundColor: '#4caf50' } }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "caption", children: "Cumulative" })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 }, children: [(0, jsx_runtime_1.jsx)(material_1.Box, { sx: { width: 12, height: 3, backgroundColor: '#f44336' } }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "caption", children: "Individual" })] })] })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        mt: 2,
                        p: 2,
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: 1
                    }, children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "body2", color: "text.secondary", children: ["\uD83D\uDCCA ", totalTrades, " total trades"] }), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "body2", color: "success.main", children: ["\u2705 ", profitableTrades, " profitable"] }), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "body2", color: "error.main", children: ["\u274C ", totalTrades - profitableTrades, " losses"] })] })] }) }));
};
exports.default = ProfitChart;
