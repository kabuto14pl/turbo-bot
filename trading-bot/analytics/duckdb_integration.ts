/**
 * 🚀 TIER 2.3: DuckDB Analytics Integration
 * OLAP database for advanced analytics, time-series queries, and performance aggregations
 * 
 * Features:
 * - Trade history persistence
 * - Portfolio snapshots
 * - Risk metrics time series
 * - Performance aggregations (daily/weekly/monthly)
 * - Strategy comparison queries
 * - Sharpe ratio calculations
 * - Drawdown analysis
 */

import * as duckdb from 'duckdb';
import * as path from 'path';
import * as fs from 'fs';

export interface TradeRecord {
    id: string;
    timestamp: number;
    symbol: string;
    action: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    pnl: number;
    strategy: string;
    commission: number;
    status: 'FILLED' | 'PARTIAL' | 'CANCELLED';
}

export interface PortfolioSnapshot {
    timestamp: number;
    total_value: number;
    unrealized_pnl: number;
    realized_pnl: number;
    drawdown: number;
    sharpe_ratio: number;
    win_rate: number;
    total_trades: number;
}

export interface RiskMetricsSnapshot {
    timestamp: number;
    var_parametric: number;
    var_historical: number;
    var_monte_carlo: number;
    kelly_optimal: number;
    kelly_adjusted: number;
    mc_mean_return: number;
    mc_std_dev: number;
    mc_max_drawdown: number;
}

export class DuckDBIntegration {
    private db?: duckdb.Database;
    private conn?: duckdb.Connection;
    private dbPath: string;
    private isInitialized: boolean = false;

    constructor(dbPath: string = './data/analytics.duckdb') {
        this.dbPath = dbPath;
    }

    /**
     * Initialize DuckDB connection and create tables
     */
    async initialize(): Promise<void> {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Create database connection
            this.db = new duckdb.Database(this.dbPath);
            this.conn = this.db.connect();

            console.log(`✅ [DuckDB] Connected to database: ${this.dbPath}`);

            // Create tables
            await this.createTables();

            // Create indexes for performance
            await this.createIndexes();

            // Create views for common queries
            await this.createViews();

            this.isInitialized = true;
            console.log(`✅ [DuckDB] Initialization complete`);

        } catch (error: any) {
            console.error(`❌ [DuckDB] Initialization failed:`, error.message);
            throw error;
        }
    }

    /**
     * Create database tables
     */
    private async createTables(): Promise<void> {
        if (!this.conn) throw new Error('Database not connected');

        // 1. Trades table
        await this.runQuery(`
            CREATE TABLE IF NOT EXISTS trades (
                id VARCHAR PRIMARY KEY,
                timestamp BIGINT NOT NULL,
                symbol VARCHAR NOT NULL,
                action VARCHAR NOT NULL,
                price DOUBLE NOT NULL,
                quantity DOUBLE NOT NULL,
                pnl DOUBLE NOT NULL,
                strategy VARCHAR NOT NULL,
                commission DOUBLE NOT NULL,
                status VARCHAR NOT NULL
            );
        `);

        // 2. Portfolio history table
        await this.runQuery(`
            CREATE TABLE IF NOT EXISTS portfolio_history (
                timestamp BIGINT PRIMARY KEY,
                total_value DOUBLE NOT NULL,
                unrealized_pnl DOUBLE NOT NULL,
                realized_pnl DOUBLE NOT NULL,
                drawdown DOUBLE NOT NULL,
                sharpe_ratio DOUBLE NOT NULL,
                win_rate DOUBLE NOT NULL,
                total_trades INTEGER NOT NULL
            );
        `);

        // 3. Risk metrics table
        await this.runQuery(`
            CREATE TABLE IF NOT EXISTS risk_metrics (
                timestamp BIGINT PRIMARY KEY,
                var_parametric DOUBLE NOT NULL,
                var_historical DOUBLE NOT NULL,
                var_monte_carlo DOUBLE NOT NULL,
                kelly_optimal DOUBLE NOT NULL,
                kelly_adjusted DOUBLE NOT NULL,
                mc_mean_return DOUBLE NOT NULL,
                mc_std_dev DOUBLE NOT NULL,
                mc_max_drawdown DOUBLE NOT NULL
            );
        `);

        console.log(`✅ [DuckDB] Tables created`);
    }

    /**
     * Create indexes for query performance
     */
    private async createIndexes(): Promise<void> {
        if (!this.conn) throw new Error('Database not connected');

        try {
            // Trades indexes
            await this.runQuery(`CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp);`);
            await this.runQuery(`CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategy);`);
            await this.runQuery(`CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);`);

            // Portfolio history index
            await this.runQuery(`CREATE INDEX IF NOT EXISTS idx_portfolio_timestamp ON portfolio_history(timestamp);`);

            // Risk metrics index
            await this.runQuery(`CREATE INDEX IF NOT EXISTS idx_risk_timestamp ON risk_metrics(timestamp);`);

            console.log(`✅ [DuckDB] Indexes created`);
        } catch (error: any) {
            console.warn(`⚠️  [DuckDB] Index creation warning:`, error.message);
        }
    }

    /**
     * Create views for common queries
     */
    private async createViews(): Promise<void> {
        if (!this.conn) throw new Error('Database not connected');

        // Daily performance aggregation
        await this.runQuery(`
            CREATE OR REPLACE VIEW daily_performance AS
            SELECT 
                DATE_TRUNC('day', to_timestamp(timestamp / 1000)) as day,
                COUNT(*) as total_trades,
                SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
                SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
                SUM(pnl) as total_pnl,
                AVG(pnl) as avg_pnl,
                MAX(pnl) as max_pnl,
                MIN(pnl) as min_pnl,
                STDDEV(pnl) as pnl_stddev
            FROM trades
            WHERE status = 'FILLED'
            GROUP BY day
            ORDER BY day DESC;
        `);

        // Strategy comparison
        await this.runQuery(`
            CREATE OR REPLACE VIEW strategy_performance AS
            SELECT 
                strategy,
                COUNT(*) as total_trades,
                SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
                ROUND(SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::DOUBLE / COUNT(*) * 100, 2) as win_rate,
                SUM(pnl) as total_pnl,
                AVG(pnl) as avg_pnl,
                AVG(CASE WHEN pnl > 0 THEN pnl ELSE NULL END) as avg_win,
                AVG(CASE WHEN pnl < 0 THEN pnl ELSE NULL END) as avg_loss,
                MAX(pnl) as max_win,
                MIN(pnl) as min_loss
            FROM trades
            WHERE status = 'FILLED'
            GROUP BY strategy
            ORDER BY total_pnl DESC;
        `);

        console.log(`✅ [DuckDB] Views created`);
    }

    /**
     * Run SQL query with promise wrapper
     */
    private runQuery(sql: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.conn) {
                reject(new Error('Database not connected'));
                return;
            }

            this.conn.run(sql, (err: Error | null) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Query data with promise wrapper
     */
    private query<T = any>(sql: string): Promise<T[]> {
        return new Promise((resolve, reject) => {
            if (!this.conn) {
                reject(new Error('Database not connected'));
                return;
            }

            this.conn.all(sql, (err: Error | null, rows: any) => {
                if (err) reject(err);
                else resolve((rows || []) as T[]);
            });
        });
    }

    /**
     * Insert trade record
     */
    async insertTrade(trade: TradeRecord): Promise<void> {
        if (!this.isInitialized) {
            console.warn(`⚠️  [DuckDB] Not initialized, skipping trade insert`);
            return;
        }

        const sql = `
            INSERT INTO trades VALUES (
                '${trade.id}',
                ${trade.timestamp},
                '${trade.symbol}',
                '${trade.action}',
                ${trade.price},
                ${trade.quantity},
                ${trade.pnl},
                '${trade.strategy}',
                ${trade.commission},
                '${trade.status}'
            ) ON CONFLICT (id) DO NOTHING;
        `;

        try {
            await this.runQuery(sql);
        } catch (error: any) {
            console.error(`❌ [DuckDB] Failed to insert trade:`, error.message);
        }
    }

    /**
     * Insert portfolio snapshot
     */
    async insertPortfolioSnapshot(snapshot: PortfolioSnapshot): Promise<void> {
        if (!this.isInitialized) {
            console.warn(`⚠️  [DuckDB] Not initialized, skipping portfolio snapshot`);
            return;
        }

        const sql = `
            INSERT INTO portfolio_history VALUES (
                ${snapshot.timestamp},
                ${snapshot.total_value},
                ${snapshot.unrealized_pnl},
                ${snapshot.realized_pnl},
                ${snapshot.drawdown},
                ${snapshot.sharpe_ratio},
                ${snapshot.win_rate},
                ${snapshot.total_trades}
            ) ON CONFLICT (timestamp) DO UPDATE SET
                total_value = EXCLUDED.total_value,
                unrealized_pnl = EXCLUDED.unrealized_pnl,
                realized_pnl = EXCLUDED.realized_pnl,
                drawdown = EXCLUDED.drawdown,
                sharpe_ratio = EXCLUDED.sharpe_ratio,
                win_rate = EXCLUDED.win_rate,
                total_trades = EXCLUDED.total_trades;
        `;

        try {
            await this.runQuery(sql);
        } catch (error: any) {
            console.error(`❌ [DuckDB] Failed to insert portfolio snapshot:`, error.message);
        }
    }

    /**
     * Insert risk metrics snapshot
     */
    async insertRiskMetrics(metrics: RiskMetricsSnapshot): Promise<void> {
        if (!this.isInitialized) {
            console.warn(`⚠️  [DuckDB] Not initialized, skipping risk metrics`);
            return;
        }

        const sql = `
            INSERT INTO risk_metrics VALUES (
                ${metrics.timestamp},
                ${metrics.var_parametric},
                ${metrics.var_historical},
                ${metrics.var_monte_carlo},
                ${metrics.kelly_optimal},
                ${metrics.kelly_adjusted},
                ${metrics.mc_mean_return},
                ${metrics.mc_std_dev},
                ${metrics.mc_max_drawdown}
            ) ON CONFLICT (timestamp) DO UPDATE SET
                var_parametric = EXCLUDED.var_parametric,
                var_historical = EXCLUDED.var_historical,
                var_monte_carlo = EXCLUDED.var_monte_carlo,
                kelly_optimal = EXCLUDED.kelly_optimal,
                kelly_adjusted = EXCLUDED.kelly_adjusted,
                mc_mean_return = EXCLUDED.mc_mean_return,
                mc_std_dev = EXCLUDED.mc_std_dev,
                mc_max_drawdown = EXCLUDED.mc_max_drawdown;
        `;

        try {
            await this.runQuery(sql);
        } catch (error: any) {
            console.error(`❌ [DuckDB] Failed to insert risk metrics:`, error.message);
        }
    }

    /**
     * Get daily performance aggregation
     */
    async getDailyPerformance(days: number = 30): Promise<any[]> {
        const sql = `
            SELECT * FROM daily_performance
            LIMIT ${days};
        `;

        return await this.query(sql);
    }

    /**
     * Get strategy performance comparison
     */
    async getStrategyPerformance(): Promise<any[]> {
        const sql = `SELECT * FROM strategy_performance;`;
        return await this.query(sql);
    }

    /**
     * Get recent trades
     */
    async getRecentTrades(limit: number = 50): Promise<TradeRecord[]> {
        const sql = `
            SELECT * FROM trades
            ORDER BY timestamp DESC
            LIMIT ${limit};
        `;

        return await this.query<TradeRecord>(sql);
    }

    /**
     * Get portfolio time series
     */
    async getPortfolioTimeSeries(hours: number = 24): Promise<PortfolioSnapshot[]> {
        const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
        
        const sql = `
            SELECT * FROM portfolio_history
            WHERE timestamp >= ${cutoffTime}
            ORDER BY timestamp ASC;
        `;

        return await this.query<PortfolioSnapshot>(sql);
    }

    /**
     * Get risk metrics time series
     */
    async getRiskMetricsTimeSeries(hours: number = 24): Promise<RiskMetricsSnapshot[]> {
        const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
        
        const sql = `
            SELECT * FROM risk_metrics
            WHERE timestamp >= ${cutoffTime}
            ORDER BY timestamp ASC;
        `;

        return await this.query<RiskMetricsSnapshot>(sql);
    }

    /**
     * Calculate Sharpe ratio from portfolio history
     */
    async calculateSharpeRatio(days: number = 30): Promise<number> {
        const sql = `
            SELECT 
                AVG((total_value - LAG(total_value) OVER (ORDER BY timestamp)) / LAG(total_value) OVER (ORDER BY timestamp)) as avg_return,
                STDDEV((total_value - LAG(total_value) OVER (ORDER BY timestamp)) / LAG(total_value) OVER (ORDER BY timestamp)) as std_return
            FROM portfolio_history
            WHERE timestamp >= ${Date.now() - (days * 24 * 60 * 60 * 1000)}
        `;

        const result = await this.query(sql);
        
        if (result.length === 0 || !result[0].std_return || result[0].std_return === 0) {
            return 0;
        }

        const riskFreeRate = 0.0; // Assume 0% risk-free rate
        const sharpe = (result[0].avg_return - riskFreeRate) / result[0].std_return;
        
        return sharpe * Math.sqrt(252); // Annualized
    }

    /**
     * Get maximum drawdown
     */
    async getMaxDrawdown(days: number = 30): Promise<number> {
        const sql = `
            SELECT MIN(drawdown) as max_drawdown
            FROM portfolio_history
            WHERE timestamp >= ${Date.now() - (days * 24 * 60 * 60 * 1000)}
        `;

        const result = await this.query(sql);
        return result.length > 0 ? Math.abs(result[0].max_drawdown || 0) : 0;
    }

    /**
     * Close database connection
     */
    async close(): Promise<void> {
        if (this.conn) {
            this.conn.close();
            console.log(`✅ [DuckDB] Connection closed`);
        }
    }

    /**
     * Check if database is initialized
     */
    isReady(): boolean {
        return this.isInitialized;
    }
}
