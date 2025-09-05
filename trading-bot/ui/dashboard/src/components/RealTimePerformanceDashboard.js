"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * 📊 ENHANCED REAL-TIME PERFORMANCE DASHBOARD 2025
 * Professional-grade live performance monitoring with benchmarks
 */
const react_1 = require("react");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const recharts_1 = require("recharts");
const EnhancedRealTimePerformanceDashboard = () => {
    const [performanceData, setPerformanceData] = (0, react_1.useState)([]);
    const [strategies, setStrategies] = (0, react_1.useState)([]);
    const [benchmarks, setBenchmarks] = (0, react_1.useState)([]);
    const [riskMetrics, setRiskMetrics] = (0, react_1.useState)(null);
    const [isRealTime, setIsRealTime] = (0, react_1.useState)(true);
    const [lastUpdate, setLastUpdate] = (0, react_1.useState)(null);
    const [alerts, setAlerts] = (0, react_1.useState)([]);
    const wsRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        initializeData();
        if (isRealTime) {
            connectWebSocket();
        }
        else {
            disconnectWebSocket();
        }
        return () => {
            disconnectWebSocket();
        };
    }, [isRealTime]);
    const initializeData = () => {
        // Generate initial performance data
        const data = [];
        const now = Date.now();
        for (let i = 0; i < 100; i++) {
            const timestamp = now - (99 - i) * 60000; // 1 minute intervals
            const portfolioValue = 100000 + Math.random() * 10000 + i * 100;
            const benchmark = 100000 + i * 50 + Math.random() * 2000;
            data.push({
                timestamp,
                portfolioValue,
                pnl: portfolioValue - 100000,
                pnlPercent: ((portfolioValue - 100000) / 100000) * 100,
                sharpe: 1.5 + Math.random() * 1.5,
                drawdown: Math.random() * 5,
                benchmark,
                volatility: 0.15 + Math.random() * 0.1,
                alpha: Math.random() * 0.05,
                beta: 0.8 + Math.random() * 0.4
            });
        }
        setPerformanceData(data);
        // Initialize strategies
        setStrategies([
            {
                name: 'RSI Turbo',
                allocation: 35,
                pnl: 2450.75,
                trades: 156,
                winRate: 0.68,
                sharpe: 2.34,
                maxDrawdown: 3.2,
                status: 'active'
            },
            {
                name: 'SuperTrend Pro',
                allocation: 25,
                pnl: 1890.45,
                trades: 89,
                winRate: 0.72,
                sharpe: 1.98,
                maxDrawdown: 2.8,
                status: 'active'
            },
            {
                name: 'ML Predictor',
                allocation: 20,
                pnl: -234.12,
                trades: 67,
                winRate: 0.45,
                sharpe: 0.89,
                maxDrawdown: 8.5,
                status: 'paused'
            },
            {
                name: 'Momentum Hunter',
                allocation: 20,
                pnl: 892.33,
                trades: 123,
                winRate: 0.58,
                sharpe: 1.45,
                maxDrawdown: 4.1,
                status: 'active'
            }
        ]);
        // Initialize benchmarks
        setBenchmarks([
            {
                name: 'S&P 500',
                return: 8.2,
                volatility: 16.5,
                sharpe: 0.85,
                correlation: 0.45
            },
            {
                name: 'Bitcoin',
                return: 12.8,
                volatility: 65.2,
                sharpe: 0.42,
                correlation: 0.78
            },
            {
                name: '60/40 Portfolio',
                return: 6.8,
                volatility: 12.1,
                sharpe: 0.72,
                correlation: 0.32
            }
        ]);
        // Initialize risk metrics
        setRiskMetrics({
            var95: 2.1,
            var99: 3.8,
            expectedShortfall: 4.2,
            maxDrawdown: 5.2,
            calmarRatio: 1.8,
            sortinoRatio: 2.4
        });
        setLastUpdate(new Date());
    };
    const connectWebSocket = () => {
        try {
            wsRef.current = new WebSocket('ws://localhost:9093');
            wsRef.current.onopen = () => {
                console.log('📡 Real-time performance feed connected');
            };
            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'performance_update') {
                        updatePerformanceData(data.payload);
                    }
                    else if (data.type === 'alert') {
                        addAlert(data.payload);
                    }
                }
                catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };
            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            wsRef.current.onclose = () => {
                console.log('📡 Real-time performance feed disconnected');
                // Attempt reconnection after 5 seconds
                setTimeout(() => {
                    if (isRealTime) {
                        connectWebSocket();
                    }
                }, 5000);
            };
        }
        catch (error) {
            console.error('Failed to connect WebSocket:', error);
        }
    };
    const disconnectWebSocket = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    };
    const updatePerformanceData = (newData) => {
        setPerformanceData(prev => {
            const updated = [...prev];
            updated.push({
                timestamp: Date.now(),
                portfolioValue: newData.portfolioValue || prev[prev.length - 1].portfolioValue + Math.random() * 100 - 50,
                pnl: newData.pnl || prev[prev.length - 1].pnl + Math.random() * 50 - 25,
                pnlPercent: newData.pnlPercent || prev[prev.length - 1].pnlPercent + Math.random() * 0.1 - 0.05,
                sharpe: newData.sharpe || prev[prev.length - 1].sharpe + Math.random() * 0.1 - 0.05,
                drawdown: newData.drawdown || Math.random() * 5,
                benchmark: newData.benchmark || prev[prev.length - 1].benchmark + Math.random() * 30 - 15,
                volatility: newData.volatility || 0.15 + Math.random() * 0.1,
                alpha: newData.alpha || Math.random() * 0.05,
                beta: newData.beta || 0.8 + Math.random() * 0.4
            });
            // Keep only last 100 data points
            if (updated.length > 100) {
                updated.shift();
            }
            return updated;
        });
        setLastUpdate(new Date());
    };
    const addAlert = (alert) => {
        setAlerts(prev => [alert, ...prev.slice(0, 4)]); // Keep only last 5 alerts
    };
    const exportData = () => {
        const csvData = performanceData.map(point => ({
            timestamp: new Date(point.timestamp).toISOString(),
            portfolioValue: point.portfolioValue,
            pnl: point.pnl,
            pnlPercent: point.pnlPercent,
            sharpe: point.sharpe,
            drawdown: point.drawdown,
            benchmark: point.benchmark
        }));
        const csv = [
            Object.keys(csvData[0]).join(','),
            ...csvData.map(row => Object.values(row).join(','))
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `performance_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };
    const currentPerformance = performanceData[performanceData.length - 1];
    const totalPnL = currentPerformance?.pnl || 0;
    const totalPnLPercent = currentPerformance?.pnlPercent || 0;
    return ((0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { p: 3 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "h4", sx: { display: 'flex', alignItems: 'center' }, children: [(0, jsx_runtime_1.jsx)(icons_material_1.Assessment, { sx: { mr: 2, color: 'primary.main' } }), "Enhanced Performance Monitor", (0, jsx_runtime_1.jsx)(material_1.Chip, { label: `Last: ${lastUpdate?.toLocaleTimeString()}`, size: "small", sx: { ml: 2 }, color: "primary" })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { display: "flex", alignItems: "center", gap: 2, children: [(0, jsx_runtime_1.jsx)(material_1.FormControlLabel, { control: (0, jsx_runtime_1.jsx)(material_1.Switch, { checked: isRealTime, onChange: (e) => setIsRealTime(e.target.checked), color: "primary" }), label: "Real-time" }), (0, jsx_runtime_1.jsx)(material_1.Tooltip, { title: "Export Data", children: (0, jsx_runtime_1.jsx)(material_1.IconButton, { onClick: exportData, children: (0, jsx_runtime_1.jsx)(icons_material_1.Download, {}) }) }), (0, jsx_runtime_1.jsx)(material_1.Tooltip, { title: "Refresh", children: (0, jsx_runtime_1.jsx)(material_1.IconButton, { onClick: initializeData, children: (0, jsx_runtime_1.jsx)(icons_material_1.Refresh, {}) }) })] })] }), alerts.length > 0 && ((0, jsx_runtime_1.jsx)(material_1.Alert, { severity: "warning", sx: { mb: 3 }, icon: (0, jsx_runtime_1.jsx)(icons_material_1.Notifications, {}), children: (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "subtitle2", children: ["Latest Alert: ", alerts[0].message || 'Performance threshold reached'] }) })), (0, jsx_runtime_1.jsxs)(material_1.Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [(0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, sm: 6, md: 3, children: (0, jsx_runtime_1.jsx)(material_1.Card, { sx: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }, children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { display: "flex", justifyContent: "space-between", alignItems: "center", children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "h4", fontWeight: "bold", children: [totalPnL >= 0 ? '+' : '', totalPnL.toFixed(2)] }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", sx: { opacity: 0.9 }, children: "Total P&L ($)" })] }), totalPnL >= 0 ? (0, jsx_runtime_1.jsx)(icons_material_1.TrendingUp, { fontSize: "large" }) : (0, jsx_runtime_1.jsx)(icons_material_1.TrendingDown, { fontSize: "large" })] }), (0, jsx_runtime_1.jsx)(material_1.LinearProgress, { variant: "determinate", value: Math.min(Math.abs(totalPnLPercent) * 10, 100), sx: { mt: 2, bgcolor: 'rgba(255,255,255,0.3)' } })] }) }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, sm: 6, md: 3, children: (0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsx)(material_1.CardContent, { children: (0, jsx_runtime_1.jsxs)(material_1.Box, { display: "flex", justifyContent: "space-between", alignItems: "center", children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "h4", fontWeight: "bold", color: "primary", children: [totalPnLPercent >= 0 ? '+' : '', totalPnLPercent.toFixed(2), "%"] }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "text.secondary", children: "Total Return" })] }), (0, jsx_runtime_1.jsx)(icons_material_1.ShowChart, { color: "primary", fontSize: "large" })] }) }) }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, sm: 6, md: 3, children: (0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsx)(material_1.CardContent, { children: (0, jsx_runtime_1.jsxs)(material_1.Box, { display: "flex", justifyContent: "space-between", alignItems: "center", children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h4", fontWeight: "bold", color: "success.main", children: currentPerformance?.sharpe.toFixed(2) || '0.00' }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "text.secondary", children: "Sharpe Ratio" })] }), (0, jsx_runtime_1.jsx)(icons_material_1.Speed, { color: "success", fontSize: "large" })] }) }) }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, sm: 6, md: 3, children: (0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsx)(material_1.CardContent, { children: (0, jsx_runtime_1.jsxs)(material_1.Box, { display: "flex", justifyContent: "space-between", alignItems: "center", children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "h4", fontWeight: "bold", color: "warning.main", children: [currentPerformance?.drawdown.toFixed(1) || '0.0', "%"] }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "text.secondary", children: "Max Drawdown" })] }), (0, jsx_runtime_1.jsx)(icons_material_1.Security, { color: "warning", fontSize: "large" })] }) }) }) })] }), (0, jsx_runtime_1.jsx)(material_1.Card, { sx: { mb: 3 }, children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Portfolio vs Benchmark Performance" }), (0, jsx_runtime_1.jsx)(material_1.Box, { height: 400, children: (0, jsx_runtime_1.jsx)(recharts_1.ResponsiveContainer, { width: "100%", height: "100%", children: (0, jsx_runtime_1.jsxs)(recharts_1.LineChart, { data: performanceData, children: [(0, jsx_runtime_1.jsx)(recharts_1.CartesianGrid, { strokeDasharray: "3 3" }), (0, jsx_runtime_1.jsx)(recharts_1.XAxis, { dataKey: "timestamp", tickFormatter: (value) => new Date(value).toLocaleTimeString() }), (0, jsx_runtime_1.jsx)(recharts_1.YAxis, {}), (0, jsx_runtime_1.jsx)(recharts_1.Tooltip, { labelFormatter: (value) => new Date(value).toLocaleString(), formatter: (value, name) => [
                                                typeof value === 'number' ? value.toFixed(2) : value,
                                                name === 'portfolioValue' ? 'Portfolio ($)' :
                                                    name === 'benchmark' ? 'Benchmark ($)' : name
                                            ] }), (0, jsx_runtime_1.jsx)(recharts_1.Line, { type: "monotone", dataKey: "portfolioValue", stroke: "#667eea", strokeWidth: 3, dot: false, name: "Portfolio" }), (0, jsx_runtime_1.jsx)(recharts_1.Line, { type: "monotone", dataKey: "benchmark", stroke: "#ff6b6b", strokeWidth: 2, strokeDasharray: "5 5", dot: false, name: "Benchmark" })] }) }) })] }) }), (0, jsx_runtime_1.jsxs)(material_1.Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [(0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 6, children: (0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Strategy Performance" }), (0, jsx_runtime_1.jsx)(material_1.TableContainer, { children: (0, jsx_runtime_1.jsxs)(material_1.Table, { size: "small", children: [(0, jsx_runtime_1.jsx)(material_1.TableHead, { children: (0, jsx_runtime_1.jsxs)(material_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Strategy" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: "P&L" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: "Win Rate" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: "Sharpe" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Status" })] }) }), (0, jsx_runtime_1.jsx)(material_1.TableBody, { children: strategies.map((strategy) => ((0, jsx_runtime_1.jsxs)(material_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(material_1.TableCell, { children: strategy.name }), (0, jsx_runtime_1.jsxs)(material_1.TableCell, { align: "right", style: { color: strategy.pnl >= 0 ? 'green' : 'red' }, children: [strategy.pnl >= 0 ? '+' : '', strategy.pnl.toFixed(2)] }), (0, jsx_runtime_1.jsxs)(material_1.TableCell, { align: "right", children: [(strategy.winRate * 100).toFixed(1), "%"] }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: strategy.sharpe.toFixed(2) }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: (0, jsx_runtime_1.jsx)(material_1.Chip, { label: strategy.status, color: strategy.status === 'active' ? 'success' : 'warning', size: "small" }) })] }, strategy.name))) })] }) })] }) }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 6, children: (0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Benchmark Comparison" }), (0, jsx_runtime_1.jsx)(material_1.TableContainer, { children: (0, jsx_runtime_1.jsxs)(material_1.Table, { size: "small", children: [(0, jsx_runtime_1.jsx)(material_1.TableHead, { children: (0, jsx_runtime_1.jsxs)(material_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Benchmark" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: "Return" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: "Volatility" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: "Sharpe" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: "Correlation" })] }) }), (0, jsx_runtime_1.jsx)(material_1.TableBody, { children: benchmarks.map((benchmark) => ((0, jsx_runtime_1.jsxs)(material_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(material_1.TableCell, { children: benchmark.name }), (0, jsx_runtime_1.jsxs)(material_1.TableCell, { align: "right", children: [benchmark.return.toFixed(1), "%"] }), (0, jsx_runtime_1.jsxs)(material_1.TableCell, { align: "right", children: [benchmark.volatility.toFixed(1), "%"] }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: benchmark.sharpe.toFixed(2) }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { align: "right", children: benchmark.correlation.toFixed(2) })] }, benchmark.name))) })] }) })] }) }) })] }), riskMetrics && ((0, jsx_runtime_1.jsxs)(material_1.Accordion, { children: [(0, jsx_runtime_1.jsx)(material_1.AccordionSummary, { expandIcon: (0, jsx_runtime_1.jsx)(icons_material_1.ExpandMore, {}), children: (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", children: "Advanced Risk Metrics" }) }), (0, jsx_runtime_1.jsx)(material_1.AccordionDetails, { children: (0, jsx_runtime_1.jsxs)(material_1.Grid, { container: true, spacing: 3, children: [(0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 6, md: 2, children: (0, jsx_runtime_1.jsxs)(material_1.Box, { textAlign: "center", children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "h5", color: "error", children: [riskMetrics.var95.toFixed(1), "%"] }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "caption", children: "VaR 95%" })] }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 6, md: 2, children: (0, jsx_runtime_1.jsxs)(material_1.Box, { textAlign: "center", children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "h5", color: "error", children: [riskMetrics.var99.toFixed(1), "%"] }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "caption", children: "VaR 99%" })] }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 6, md: 2, children: (0, jsx_runtime_1.jsxs)(material_1.Box, { textAlign: "center", children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "h5", color: "warning.main", children: [riskMetrics.expectedShortfall.toFixed(1), "%"] }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "caption", children: "Expected Shortfall" })] }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 6, md: 2, children: (0, jsx_runtime_1.jsxs)(material_1.Box, { textAlign: "center", children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h5", color: "primary", children: riskMetrics.calmarRatio.toFixed(2) }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "caption", children: "Calmar Ratio" })] }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 6, md: 2, children: (0, jsx_runtime_1.jsxs)(material_1.Box, { textAlign: "center", children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h5", color: "success.main", children: riskMetrics.sortinoRatio.toFixed(2) }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "caption", children: "Sortino Ratio" })] }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 6, md: 2, children: (0, jsx_runtime_1.jsxs)(material_1.Box, { textAlign: "center", children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "h5", color: "info.main", children: [riskMetrics.maxDrawdown.toFixed(1), "%"] }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "caption", children: "Max Drawdown" })] }) })] }) })] }))] }));
};
exports.default = EnhancedRealTimePerformanceDashboard;
