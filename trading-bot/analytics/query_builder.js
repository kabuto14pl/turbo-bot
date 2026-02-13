"use strict";
/**
 * 🚀 TIER 2.3: DuckDB Query Builder
 * Advanced query abstractions for analytics and reporting
 *
 * Features:
 * - Performance aggregations (daily/weekly/monthly)
 * - Strategy comparison queries
 * - Drawdown analysis
 * - Win/loss streaks
 * - Time-weighted returns
 * - Correlation analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBuilder = void 0;
class QueryBuilder {
    constructor(db) {
        this.db = db;
    }
    /**
     * Get performance aggregation by time period
     */
    async getPerformanceByPeriod(period, limit = 30) {
        const truncFunction = period === 'daily' ? 'day' :
            period === 'weekly' ? 'week' : 'month';
        // This is a simplified query - in production use proper private method access
        const query = `
            WITH period_data AS (
                SELECT 
                    DATE_TRUNC('${truncFunction}', to_timestamp(t.timestamp / 1000)) as period,
                    t.pnl,
                    t.timestamp,
                    ROW_NUMBER() OVER (PARTITION BY DATE_TRUNC('${truncFunction}', to_timestamp(t.timestamp / 1000)) ORDER BY t.timestamp) as trade_num
                FROM trades t
                WHERE t.status = 'FILLED'
            ),
            portfolio_values AS (
                SELECT 
                    DATE_TRUNC('${truncFunction}', to_timestamp(timestamp / 1000)) as period,
                    AVG(sharpe_ratio) as avg_sharpe,
                    MIN(drawdown) as max_dd
                FROM portfolio_history
                GROUP BY period
            )
            SELECT 
                pd.period::VARCHAR as period,
                COUNT(*) as total_trades,
                SUM(CASE WHEN pd.pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
                SUM(CASE WHEN pd.pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
                ROUND(SUM(CASE WHEN pd.pnl > 0 THEN 1 ELSE 0 END)::DOUBLE / COUNT(*) * 100, 2) as win_rate,
                ROUND(SUM(pd.pnl), 2) as total_pnl,
                ROUND(AVG(pd.pnl), 2) as avg_pnl,
                ROUND(MAX(pd.pnl), 2) as max_pnl,
                ROUND(MIN(pd.pnl), 2) as min_pnl,
                COALESCE(ROUND(pv.avg_sharpe, 2), 0) as sharpe_ratio,
                COALESCE(ROUND(ABS(pv.max_dd), 4), 0) as max_drawdown
            FROM period_data pd
            LEFT JOIN portfolio_values pv ON pd.period = pv.period
            GROUP BY pd.period, pv.avg_sharpe, pv.max_dd
            ORDER BY pd.period DESC
            LIMIT ${limit};
        `;
        return await this.db.query(query);
    }
    /**
     * Get comprehensive strategy comparison
     */
    async getStrategyComparison() {
        const query = `
            SELECT 
                strategy,
                COUNT(*) as total_trades,
                ROUND(SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::DOUBLE / COUNT(*) * 100, 2) as win_rate,
                ROUND(SUM(pnl), 2) as total_pnl,
                ROUND(AVG(CASE WHEN pnl > 0 THEN pnl ELSE NULL END), 2) as avg_win,
                ROUND(AVG(CASE WHEN pnl < 0 THEN pnl ELSE NULL END), 2) as avg_loss,
                ROUND(
                    ABS(SUM(CASE WHEN pnl > 0 THEN pnl ELSE 0 END) / 
                    NULLIF(SUM(CASE WHEN pnl < 0 THEN pnl ELSE 0 END), 0)), 2
                ) as profit_factor,
                0.0 as sharpe_ratio
            FROM trades
            WHERE status = 'FILLED'
            GROUP BY strategy
            ORDER BY total_pnl DESC;
        `;
        return await this.db.query(query);
    }
    /**
     * Analyze drawdown periods
     */
    async getDrawdownPeriods(threshold = 0.05) {
        const query = `
            WITH drawdown_events AS (
                SELECT 
                    timestamp,
                    drawdown,
                    CASE 
                        WHEN drawdown < -${threshold} AND LAG(drawdown) OVER (ORDER BY timestamp) >= -${threshold} 
                        THEN timestamp 
                        ELSE NULL 
                    END as dd_start,
                    CASE 
                        WHEN drawdown >= -${threshold} AND LAG(drawdown) OVER (ORDER BY timestamp) < -${threshold} 
                        THEN timestamp 
                        ELSE NULL 
                    END as dd_end,
                    MIN(drawdown) OVER (
                        ORDER BY timestamp 
                        ROWS BETWEEN CURRENT ROW AND 1000 FOLLOWING
                    ) as max_dd_forward
                FROM portfolio_history
            )
            SELECT 
                dd_start as start_timestamp,
                LEAD(dd_end) OVER (ORDER BY dd_start) as end_timestamp,
                ROUND((LEAD(dd_end) OVER (ORDER BY dd_start) - dd_start) / 3600000.0, 2) as duration_hours,
                ROUND(max_dd_forward, 4) as max_drawdown,
                NULL::BIGINT as recovery_timestamp
            FROM drawdown_events
            WHERE dd_start IS NOT NULL
            ORDER BY dd_start DESC
            LIMIT 10;
        `;
        return await this.db.query(query);
    }
    /**
     * Find win/loss streaks
     */
    async getWinLossStreaks(minStreakLength = 3) {
        const query = `
            WITH trade_results AS (
                SELECT 
                    timestamp,
                    pnl,
                    CASE WHEN pnl > 0 THEN 'WIN' ELSE 'LOSS' END as result,
                    LAG(CASE WHEN pnl > 0 THEN 'WIN' ELSE 'LOSS' END) OVER (ORDER BY timestamp) as prev_result
                FROM trades
                WHERE status = 'FILLED'
                ORDER BY timestamp
            ),
            streak_groups AS (
                SELECT 
                    timestamp,
                    pnl,
                    result,
                    SUM(CASE WHEN result != prev_result OR prev_result IS NULL THEN 1 ELSE 0 END) 
                        OVER (ORDER BY timestamp) as streak_id
                FROM trade_results
            )
            SELECT 
                result as type,
                COUNT(*) as count,
                MIN(timestamp) as start_timestamp,
                MAX(timestamp) as end_timestamp,
                ROUND(SUM(pnl), 2) as total_pnl
            FROM streak_groups
            GROUP BY result, streak_id
            HAVING COUNT(*) >= ${minStreakLength}
            ORDER BY count DESC, start_timestamp DESC
            LIMIT 20;
        `;
        return await this.db.query(query);
    }
    /**
     * Calculate time-weighted returns
     */
    async getTimeWeightedReturns(days = 30) {
        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        const query = `
            WITH daily_returns AS (
                SELECT 
                    DATE_TRUNC('day', to_timestamp(timestamp / 1000)) as day,
                    total_value,
                    LAG(total_value) OVER (ORDER BY timestamp) as prev_value
                FROM portfolio_history
                WHERE timestamp >= ${cutoffTime}
            )
            SELECT 
                EXP(SUM(LN((total_value / NULLIF(prev_value, 0))))) - 1 as twr
            FROM daily_returns
            WHERE prev_value IS NOT NULL AND prev_value > 0;
        `;
        const result = await this.db.query(query);
        return result.length > 0 ? (result[0].twr || 0) : 0;
    }
    /**
     * Get hourly trade distribution
     */
    async getHourlyTradeDistribution() {
        const query = `
            SELECT 
                EXTRACT(HOUR FROM to_timestamp(timestamp / 1000)) as hour,
                COUNT(*) as trade_count,
                SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
                ROUND(AVG(pnl), 2) as avg_pnl,
                ROUND(SUM(pnl), 2) as total_pnl
            FROM trades
            WHERE status = 'FILLED'
            GROUP BY hour
            ORDER BY hour;
        `;
        return await this.db.query(query);
    }
    /**
     * Get strategy correlation matrix
     */
    async getStrategyCorrelation() {
        const query = `
            WITH strategy_daily_pnl AS (
                SELECT 
                    DATE_TRUNC('day', to_timestamp(timestamp / 1000)) as day,
                    strategy,
                    SUM(pnl) as daily_pnl
                FROM trades
                WHERE status = 'FILLED'
                GROUP BY day, strategy
            )
            SELECT 
                s1.strategy as strategy1,
                s2.strategy as strategy2,
                ROUND(CORR(s1.daily_pnl, s2.daily_pnl), 3) as correlation
            FROM strategy_daily_pnl s1
            JOIN strategy_daily_pnl s2 ON s1.day = s2.day
            WHERE s1.strategy < s2.strategy
            GROUP BY s1.strategy, s2.strategy
            HAVING COUNT(*) >= 5
            ORDER BY ABS(correlation) DESC;
        `;
        return await this.db.query(query);
    }
    /**
     * Get monthly performance summary
     */
    async getMonthlyPerformanceSummary() {
        const query = `
            SELECT 
                DATE_TRUNC('month', to_timestamp(timestamp / 1000))::VARCHAR as month,
                COUNT(*) as trades,
                ROUND(SUM(pnl), 2) as pnl,
                ROUND(AVG(pnl), 2) as avg_pnl,
                ROUND(SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::DOUBLE / COUNT(*) * 100, 1) as win_rate
            FROM trades
            WHERE status = 'FILLED'
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12;
        `;
        return await this.db.query(query);
    }
    /**
     * Get risk-adjusted performance metrics
     */
    async getRiskAdjustedMetrics(days = 30) {
        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        const query = `
            WITH metrics AS (
                SELECT 
                    AVG(var_parametric) as avg_var,
                    AVG(kelly_adjusted) as avg_kelly,
                    AVG(mc_max_drawdown) as avg_mc_dd
                FROM risk_metrics
                WHERE timestamp >= ${cutoffTime}
            ),
            portfolio AS (
                SELECT 
                    AVG(sharpe_ratio) as avg_sharpe,
                    MIN(drawdown) as max_dd,
                    AVG(win_rate) as avg_win_rate
                FROM portfolio_history
                WHERE timestamp >= ${cutoffTime}
            )
            SELECT 
                ROUND(m.avg_var * 100, 2) as avg_var_pct,
                ROUND(m.avg_kelly * 100, 2) as avg_kelly_pct,
                ROUND(ABS(m.avg_mc_dd) * 100, 2) as avg_mc_dd_pct,
                ROUND(p.avg_sharpe, 2) as avg_sharpe,
                ROUND(ABS(p.max_dd) * 100, 2) as max_dd_pct,
                ROUND(p.avg_win_rate, 2) as avg_win_rate
            FROM metrics m, portfolio p;
        `;
        const result = await this.db.query(query);
        return result.length > 0 ? result[0] : null;
    }
}
exports.QueryBuilder = QueryBuilder;
