/**
 * 🧠 AI INSIGHTS DASHBOARD WIDGET 2025
 * Professional AI-powered analytics panel
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Avatar,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  TrendingUp,
  Psychology,
  Warning,
  CheckCircle,
  Timeline,
  SmartToy,
  Analytics,
  Lightbulb
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar } from 'recharts';

interface AIInsights {
  sentimentPredictions: {
    nextHour: number;
    next4Hours: number;
    nextDay: number;
    accuracy: number;
    confidence: number;
  };
  tradingRecommendations: {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasoning: string[];
    expectedReturn: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  marketRegime: {
    current: 'trend' | 'volatility' | 'momentum';
    strength: number;
    stability: number;
    transitionProbability: number;
  };
  performanceInsights: {
    topStrategy: string;
    winRateTrend: number;
    sentimentImpact: number;
    riskScore: number;
  };
}

interface SentimentHistory {
  timestamp: string;
  sentiment: number;
  accuracy: number;
  prediction: number;
  actual?: number;
}

const AIInsightsDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [sentimentHistory, setSentimentHistory] = useState<SentimentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch AI insights
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        // Updated to use the new API endpoint
        const response = await fetch('http://localhost:9093/api/ai/insights');
        if (!response.ok) throw new Error('Failed to fetch AI insights');
        const data = await response.json();
        setInsights(data);
        
        // Generate sample sentiment history for visualization
        const history: SentimentHistory[] = [];
        for (let i = 0; i < 24; i++) {
          history.push({
            timestamp: new Date(Date.now() - (23 - i) * 3600000).toLocaleTimeString(),
            sentiment: 0.3 + Math.random() * 0.4,
            accuracy: 0.7 + Math.random() * 0.2,
            prediction: 0.4 + Math.random() * 0.2
          });
        }
        setSentimentHistory(history);
        
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
    const interval = setInterval(fetchInsights, 10000); // Update every 10 seconds for real-time feel

    return () => clearInterval(interval);
  }, []);

  // Mock sentiment history data
  useEffect(() => {
    const generateSentimentHistory = () => {
      const data: SentimentHistory[] = [];
      const now = Date.now();
      
      for (let i = 23; i >= 0; i--) {
        const timestamp = new Date(now - i * 60 * 60 * 1000).toISOString();
        data.push({
          timestamp,
          sentiment: 0.3 + Math.random() * 0.4,
          accuracy: 0.6 + Math.random() * 0.3,
          prediction: 0.4 + Math.random() * 0.3,
          actual: i > 0 ? 0.35 + Math.random() * 0.3 : undefined
        });
      }
      
      setSentimentHistory(data);
    };

    generateSentimentHistory();
  }, []);

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return theme.palette.success.main;
    if (confidence >= 0.6) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getActionColor = (action: string): 'success' | 'error' | 'default' => {
    switch (action) {
      case 'BUY': return 'success';
      case 'SELL': return 'error';
      default: return 'default';
    }
  };

  const getRiskLevelColor = (risk: string): 'success' | 'warning' | 'error' => {
    switch (risk) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
      default: return 'warning';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <SmartToy color="primary" />
            <Typography variant="h6">AI Insights</Typography>
          </Box>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" icon={<Warning />}>
            Failed to load AI insights: {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!insights) return null;

  return (
    <Grid container spacing={2}>
      {/* Header */}
      <Grid size={12}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <SmartToy />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    AI-Powered Trading Insights
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Real-time ML predictions and market analysis
                  </Typography>
                </Box>
              </Box>
              <Chip
                icon={<CheckCircle />}
                label="AI Active"
                color="success"
                variant="outlined"
              />
            </Box>
            
            <Box mt={2}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                variant={isMobile ? "scrollable" : "standard"}
                scrollButtons="auto"
              >
                <Tab 
                  icon={<Psychology />} 
                  label="Sentiment Predictions" 
                  iconPosition="start"
                />
                <Tab 
                  icon={<TrendingUp />} 
                  label="Trading Recommendations" 
                  iconPosition="start"
                />
                <Tab 
                  icon={<Timeline />} 
                  label="Market Regime" 
                  iconPosition="start"
                />
                <Tab 
                  icon={<Analytics />} 
                  label="Performance Analytics" 
                  iconPosition="start"
                />
              </Tabs>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Sentiment Predictions Tab */}
      {activeTab === 0 && (
        <>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 Sentiment Predictions
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={4}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary.main">
                        {(insights.sentimentPredictions.nextHour * 100).toFixed(0)}%
                      </Typography>
                      <Typography variant="caption">Next Hour</Typography>
                    </Box>
                  </Grid>
                  <Grid size={4}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="secondary.main">
                        {(insights.sentimentPredictions.next4Hours * 100).toFixed(0)}%
                      </Typography>
                      <Typography variant="caption">Next 4 Hours</Typography>
                    </Box>
                  </Grid>
                  <Grid size={4}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="warning.main">
                        {(insights.sentimentPredictions.nextDay * 100).toFixed(0)}%
                      </Typography>
                      <Typography variant="caption">Next Day</Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                <Box mt={2}>
                  <Typography variant="body2" gutterBottom>
                    Prediction Accuracy
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress
                      variant="determinate"
                      value={insights.sentimentPredictions.accuracy * 100}
                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                      color="success"
                    />
                    <Typography variant="body2" fontWeight="bold">
                      {(insights.sentimentPredictions.accuracy * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>

                <Box mt={2}>
                  <Typography variant="body2" gutterBottom>
                    Confidence Level
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress
                      variant="determinate"
                      value={insights.sentimentPredictions.confidence * 100}
                      sx={{ 
                        flexGrow: 1, 
                        height: 8, 
                        borderRadius: 4,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getConfidenceColor(insights.sentimentPredictions.confidence)
                        }
                      }}
                    />
                    <Typography variant="body2" fontWeight="bold">
                      {(insights.sentimentPredictions.confidence * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📈 Sentiment History (24h)
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={sentimentHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).getHours() + ':00'}
                    />
                    <YAxis domain={[0, 1]} />
                    <RechartsTooltip 
                      labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                      formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Sentiment']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sentiment" 
                      stroke={theme.palette.primary.main}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="prediction" 
                      stroke={theme.palette.secondary.main}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}

      {/* Trading Recommendations Tab */}
      {activeTab === 1 && (
        <>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🎯 Trading Recommendation
                </Typography>
                
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Chip
                    label={insights.tradingRecommendations.action}
                    color={getActionColor(insights.tradingRecommendations.action)}
                    variant="filled"
                    size="medium"
                  />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Confidence
                    </Typography>
                    <Typography variant="h6" color={getConfidenceColor(insights.tradingRecommendations.confidence)}>
                      {(insights.tradingRecommendations.confidence * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" gutterBottom>
                    Expected Return: {insights.tradingRecommendations.expectedReturn.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.abs(insights.tradingRecommendations.expectedReturn) * 10}
                    color={insights.tradingRecommendations.expectedReturn > 0 ? "success" : "error"}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>

                <Box mb={2}>
                  <Chip
                    label={`Risk: ${insights.tradingRecommendations.riskLevel}`}
                    color={getRiskLevelColor(insights.tradingRecommendations.riskLevel)}
                    variant="outlined"
                    size="small"
                  />
                </Box>

                <Typography variant="body2" gutterBottom fontWeight="bold">
                  AI Reasoning:
                </Typography>
                {insights.tradingRecommendations.reasoning.map((reason, index) => (
                  <Box key={index} display="flex" alignItems="center" gap={1} mb={1}>
                    <Lightbulb fontSize="small" color="primary" />
                    <Typography variant="body2">{reason}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 Risk-Return Analysis
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={[
                    { subject: 'Profit Potential', A: insights.tradingRecommendations.expectedReturn * 10, fullMark: 50 },
                    { subject: 'Confidence', A: insights.tradingRecommendations.confidence * 100, fullMark: 100 },
                    { subject: 'Market Sentiment', A: insights.sentimentPredictions.nextHour * 100, fullMark: 100 },
                    { subject: 'Trend Strength', A: insights.marketRegime.strength * 100, fullMark: 100 },
                    { subject: 'Stability', A: insights.marketRegime.stability * 100, fullMark: 100 }
                  ]}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={18} domain={[0, 100]} />
                    <Radar
                      name="Analysis"
                      dataKey="A"
                      stroke={theme.palette.primary.main}
                      fill={theme.palette.primary.main}
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}

      {/* Market Regime Tab */}
      {activeTab === 2 && (
        <>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🌊 Market Regime Analysis
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Box textAlign="center" p={2} border={1} borderColor="divider" borderRadius={2}>
                      <Typography variant="h4" color="primary.main" gutterBottom>
                        {insights.marketRegime.current.toUpperCase()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Current Regime
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Box textAlign="center" p={2} border={1} borderColor="divider" borderRadius={2}>
                      <Typography variant="h4" color="success.main" gutterBottom>
                        {(insights.marketRegime.strength * 100).toFixed(0)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Regime Strength
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Box textAlign="center" p={2} border={1} borderColor="divider" borderRadius={2}>
                      <Typography variant="h4" color="warning.main" gutterBottom>
                        {(insights.marketRegime.stability * 100).toFixed(0)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Stability Score
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Box mt={3}>
                  <Typography variant="body2" gutterBottom>
                    Transition Probability: {(insights.marketRegime.transitionProbability * 100).toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={insights.marketRegime.transitionProbability * 100}
                    color={insights.marketRegime.transitionProbability > 0.3 ? "warning" : "success"}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Lower values indicate more stable market conditions
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ⚠️ Regime Alerts
                </Typography>
                
                {insights.marketRegime.transitionProbability > 0.3 ? (
                  <Alert severity="warning" icon={<Warning />}>
                    High transition probability detected. Market regime may change soon.
                  </Alert>
                ) : (
                  <Alert severity="success" icon={<CheckCircle />}>
                    Market regime is stable. Current conditions likely to persist.
                  </Alert>
                )}

                <Box mt={2}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Regime Characteristics:
                  </Typography>
                  {insights.marketRegime.current === 'trend' && (
                    <Typography variant="body2">
                      • Strong directional movement<br/>
                      • Lower volatility<br/>
                      • Momentum strategies favored
                    </Typography>
                  )}
                  {insights.marketRegime.current === 'volatility' && (
                    <Typography variant="body2">
                      • High price swings<br/>
                      • Mean reversion opportunities<br/>
                      • Range trading strategies
                    </Typography>
                  )}
                  {insights.marketRegime.current === 'momentum' && (
                    <Typography variant="body2">
                      • Accelerating trends<br/>
                      • Breakout patterns<br/>
                      • Momentum strategies optimal
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}

      {/* Performance Analytics Tab */}
      {activeTab === 3 && (
        <>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🏆 Performance Insights
                </Typography>
                
                <Box mb={3}>
                  <Typography variant="body2" gutterBottom>
                    Top Performing Strategy
                  </Typography>
                  <Chip
                    label={insights.performanceInsights.topStrategy}
                    color="primary"
                    variant="filled"
                    size="medium"
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Box textAlign="center">
                      <Typography variant="h5" color={insights.performanceInsights.winRateTrend > 0 ? "success.main" : "error.main"}>
                        {insights.performanceInsights.winRateTrend > 0 ? "+" : ""}{insights.performanceInsights.winRateTrend.toFixed(1)}%
                      </Typography>
                      <Typography variant="caption">Win Rate Trend</Typography>
                    </Box>
                  </Grid>
                  <Grid size={6}>
                    <Box textAlign="center">
                      <Typography variant="h5" color="info.main">
                        {insights.performanceInsights.sentimentImpact.toFixed(1)}%
                      </Typography>
                      <Typography variant="caption">Sentiment Impact</Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Box mt={2}>
                  <Typography variant="body2" gutterBottom>
                    Risk Score
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress
                      variant="determinate"
                      value={insights.performanceInsights.riskScore * 10}
                      color={insights.performanceInsights.riskScore < 5 ? "success" : insights.performanceInsights.riskScore < 7 ? "warning" : "error"}
                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" fontWeight="bold">
                      {insights.performanceInsights.riskScore.toFixed(1)}/10
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 AI Performance Metrics
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { name: 'Prediction Accuracy', value: insights.sentimentPredictions.accuracy * 100 },
                    { name: 'Confidence Level', value: insights.sentimentPredictions.confidence * 100 },
                    { name: 'Market Regime', value: insights.marketRegime.strength * 100 },
                    { name: 'Strategy Performance', value: 85 } // Mock data
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis domain={[0, 100]} />
                    <RechartsTooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Bar dataKey="value" fill={theme.palette.primary.main} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={12}>
            <Card>
              <CardContent>
                <Alert severity="info" icon={<SmartToy />}>
                  <Typography variant="body2">
                    <strong>AI Performance Summary:</strong> The AI system is operating at {(insights.sentimentPredictions.accuracy * 100).toFixed(1)}% accuracy 
                    with high confidence levels. Sentiment analysis is providing significant value to trading decisions with a {insights.performanceInsights.sentimentImpact.toFixed(1)}% 
                    positive impact on performance.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}
    </Grid>
  );
};

export default AIInsightsDashboard;
