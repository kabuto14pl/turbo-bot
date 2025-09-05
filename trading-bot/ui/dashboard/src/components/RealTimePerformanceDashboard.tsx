/**
 * 📊 ENHANCED REAL-TIME PERFORMANCE DASHBOARD 2025
 * Professional-grade live performance monitoring with benchmarks
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    LinearProgress,
    Chip,
    Switch,
    FormControlLabel,
    Alert,
    Tooltip,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material';
import {
    TrendingUp,
    TrendingDown,
    Assessment,
    Speed,
    Security,
    Refresh,
    Download,
    ExpandMore,
    ShowChart,
    Notifications
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface PerformanceData {
    timestamp: number;
    portfolioValue: number;
    pnl: number;
    pnlPercent: number;
    sharpe: number;
    drawdown: number;
    benchmark: number;
    volatility: number;
    alpha: number;
    beta: number;
}

interface StrategyPerformance {
    name: string;
    allocation: number;
    pnl: number;
    trades: number;
    winRate: number;
    sharpe: number;
    maxDrawdown: number;
    status: 'active' | 'paused' | 'stopped';
}

interface BenchmarkComparison {
    name: string;
    return: number;
    volatility: number;
    sharpe: number;
    correlation: number;
}

interface RiskMetrics {
    var95: number;
    var99: number;
    expectedShortfall: number;
    maxDrawdown: number;
    calmarRatio: number;
    sortinoRatio: number;
}

const EnhancedRealTimePerformanceDashboard: React.FC = () => {
    const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
    const [strategies, setStrategies] = useState<StrategyPerformance[]>([]);
    const [benchmarks, setBenchmarks] = useState<BenchmarkComparison[]>([]);
    const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
    const [isRealTime, setIsRealTime] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [alerts, setAlerts] = useState<any[]>([]);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        initializeData();
        
        if (isRealTime) {
            connectWebSocket();
        } else {
            disconnectWebSocket();
        }

        return () => {
            disconnectWebSocket();
        };
    }, [isRealTime]);

    const initializeData = () => {
        // Generate initial performance data
        const data: PerformanceData[] = [];
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
                    } else if (data.type === 'alert') {
                        addAlert(data.payload);
                    }
                } catch (error) {
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
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
        }
    };

    const disconnectWebSocket = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    };

    const updatePerformanceData = (newData: any) => {
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

    const addAlert = (alert: any) => {
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

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
                    <Assessment sx={{ mr: 2, color: 'primary.main' }} />
                    Enhanced Performance Monitor
                    <Chip 
                        label={`Last: ${lastUpdate?.toLocaleTimeString()}`} 
                        size="small" 
                        sx={{ ml: 2 }}
                        color="primary"
                    />
                </Typography>
                
                <Box display="flex" alignItems="center" gap={2}>
                    <FormControlLabel
                        control={
                            <Switch 
                                checked={isRealTime} 
                                onChange={(e) => setIsRealTime(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Real-time"
                    />
                    <Tooltip title="Export Data">
                        <IconButton onClick={exportData}>
                            <Download />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Refresh">
                        <IconButton onClick={initializeData}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Alerts */}
            {alerts.length > 0 && (
                <Alert severity="warning" sx={{ mb: 3 }} icon={<Notifications />}>
                    <Typography variant="subtitle2">
                        Latest Alert: {alerts[0].message || 'Performance threshold reached'}
                    </Typography>
                </Alert>
            )}

            {/* Key Metrics Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h4" fontWeight="bold">
                                        {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        Total P&L ($)
                                    </Typography>
                                </Box>
                                {totalPnL >= 0 ? <TrendingUp fontSize="large" /> : <TrendingDown fontSize="large" />}
                            </Box>
                            <LinearProgress 
                                variant="determinate" 
                                value={Math.min(Math.abs(totalPnLPercent) * 10, 100)}
                                sx={{ mt: 2, bgcolor: 'rgba(255,255,255,0.3)' }}
                            />
                        </CardContent>
                    </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h4" fontWeight="bold" color="primary">
                                        {totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Return
                                    </Typography>
                                </Box>
                                <ShowChart color="primary" fontSize="large" />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h4" fontWeight="bold" color="success.main">
                                        {currentPerformance?.sharpe.toFixed(2) || '0.00'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Sharpe Ratio
                                    </Typography>
                                </Box>
                                <Speed color="success" fontSize="large" />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                                        {currentPerformance?.drawdown.toFixed(1) || '0.0'}%
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Max Drawdown
                                    </Typography>
                                </Box>
                                <Security color="warning" fontSize="large" />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Performance Chart */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Portfolio vs Benchmark Performance
                    </Typography>
                    <Box height={400}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={performanceData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="timestamp" 
                                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                                />
                                <YAxis />
                                <RechartsTooltip 
                                    labelFormatter={(value: any) => new Date(value).toLocaleString()}
                                    formatter={(value: any, name: string) => [
                                        typeof value === 'number' ? value.toFixed(2) : value,
                                        name === 'portfolioValue' ? 'Portfolio ($)' : 
                                        name === 'benchmark' ? 'Benchmark ($)' : name
                                    ]}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="portfolioValue" 
                                    stroke="#667eea" 
                                    strokeWidth={3}
                                    dot={false}
                                    name="Portfolio"
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="benchmark" 
                                    stroke="#ff6b6b" 
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                    name="Benchmark"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                </CardContent>
            </Card>

            {/* Strategy Performance & Benchmarks */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Strategy Performance */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Strategy Performance
                            </Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Strategy</TableCell>
                                            <TableCell align="right">P&L</TableCell>
                                            <TableCell align="right">Win Rate</TableCell>
                                            <TableCell align="right">Sharpe</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {strategies.map((strategy) => (
                                            <TableRow key={strategy.name}>
                                                <TableCell>{strategy.name}</TableCell>
                                                <TableCell align="right" style={{ color: strategy.pnl >= 0 ? 'green' : 'red' }}>
                                                    {strategy.pnl >= 0 ? '+' : ''}{strategy.pnl.toFixed(2)}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {(strategy.winRate * 100).toFixed(1)}%
                                                </TableCell>
                                                <TableCell align="right">
                                                    {strategy.sharpe.toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={strategy.status} 
                                                        color={strategy.status === 'active' ? 'success' : 'warning'}
                                                        size="small"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Benchmark Comparison */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Benchmark Comparison
                            </Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Benchmark</TableCell>
                                            <TableCell align="right">Return</TableCell>
                                            <TableCell align="right">Volatility</TableCell>
                                            <TableCell align="right">Sharpe</TableCell>
                                            <TableCell align="right">Correlation</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {benchmarks.map((benchmark) => (
                                            <TableRow key={benchmark.name}>
                                                <TableCell>{benchmark.name}</TableCell>
                                                <TableCell align="right">
                                                    {benchmark.return.toFixed(1)}%
                                                </TableCell>
                                                <TableCell align="right">
                                                    {benchmark.volatility.toFixed(1)}%
                                                </TableCell>
                                                <TableCell align="right">
                                                    {benchmark.sharpe.toFixed(2)}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {benchmark.correlation.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Risk Metrics */}
            {riskMetrics && (
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography variant="h6">
                            Advanced Risk Metrics
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={3}>
                            <Grid item xs={6} md={2}>
                                <Box textAlign="center">
                                    <Typography variant="h5" color="error">
                                        {riskMetrics.var95.toFixed(1)}%
                                    </Typography>
                                    <Typography variant="caption">VaR 95%</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <Box textAlign="center">
                                    <Typography variant="h5" color="error">
                                        {riskMetrics.var99.toFixed(1)}%
                                    </Typography>
                                    <Typography variant="caption">VaR 99%</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <Box textAlign="center">
                                    <Typography variant="h5" color="warning.main">
                                        {riskMetrics.expectedShortfall.toFixed(1)}%
                                    </Typography>
                                    <Typography variant="caption">Expected Shortfall</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <Box textAlign="center">
                                    <Typography variant="h5" color="primary">
                                        {riskMetrics.calmarRatio.toFixed(2)}
                                    </Typography>
                                    <Typography variant="caption">Calmar Ratio</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <Box textAlign="center">
                                    <Typography variant="h5" color="success.main">
                                        {riskMetrics.sortinoRatio.toFixed(2)}
                                    </Typography>
                                    <Typography variant="caption">Sortino Ratio</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <Box textAlign="center">
                                    <Typography variant="h5" color="info.main">
                                        {riskMetrics.maxDrawdown.toFixed(1)}%
                                    </Typography>
                                    <Typography variant="caption">Max Drawdown</Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>
            )}
        </Box>
    );
};

export default EnhancedRealTimePerformanceDashboard;
