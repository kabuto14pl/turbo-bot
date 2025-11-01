/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading infrastructure component
 */
/**
 * 🌐 REAL MARKET DATA ADAPTER FOR TRADING BOT
 * Adapter do połączenia bota z realnymi danymi Binance
 */

const RealMarketDataProvider = require('../monitoring/working/real_market_data');

class TradingBotMarketAdapter {
    constructor(config = {}) {
        this.provider = new RealMarketDataProvider();
        this.config = {
            symbol: config.symbol || 'BTCUSDT',
            interval: config.interval || '1m',
            ...config
        };
        
        this.currentCandle = null;
        this.historicalData = [];
        this.isInitialized = false;
        
        console.log('🔌 Trading Bot Market Adapter initialized');
    }

    /**
     * Inicjalizacja adaptera z realnymi danymi
     */
    async initialize() {
        try {
            console.log('🌐 Connecting to real market data...');
            
            // Test connection
            const connected = await this.provider.testConnection();
            if (!connected) {
                throw new Error('Cannot connect to market data provider');
            }
            
            // Get initial historical data
            const candles = await this.provider.getCandles(this.config.symbol, this.config.interval, 100);
            this.historicalData = candles;
            this.currentCandle = candles[candles.length - 1];
            
            console.log(`✅ Historical data loaded: ${candles.length} candles for ${this.config.symbol}`);
            
            // Start real-time updates
            this.provider.startRealTimeStream([this.config.symbol]);
            this.provider.subscribe((priceData) => {
                if (priceData.symbol === this.config.symbol) {
                    this.updateCurrentCandle(priceData);
                }
            });
            
            this.isInitialized = true;
            console.log('🚀 Trading Bot connected to REAL market data!');
            
        } catch (error) {
            console.error('❌ Failed to initialize market adapter:', error.message);
            this.isInitialized = false;
        }
    }

    /**
     * Aktualizacja bieżącej świeczki z real-time danymi
     */
    updateCurrentCandle(priceData) {
        if (!this.currentCandle) return;
        
        const now = Date.now();
        const candleStart = Math.floor(now / 60000) * 60000; // 1-minute candle
        
        // If new candle period, create new candle
        if (this.currentCandle.timestamp < candleStart) {
            // Close previous candle
            this.historicalData.push({ ...this.currentCandle });
            
            // Keep only last 100 candles
            if (this.historicalData.length > 100) {
                this.historicalData.shift();
            }
            
            // Start new candle
            this.currentCandle = {
                timestamp: candleStart,
                open: priceData.price,
                high: priceData.price,
                low: priceData.price,
                close: priceData.price,
                volume: 0,
                symbol: priceData.symbol
            };
            
            console.log(`📊 New candle started for ${priceData.symbol}: $${priceData.price}`);
        } else {
            // Update current candle
            this.currentCandle.high = Math.max(this.currentCandle.high, priceData.price);
            this.currentCandle.low = Math.min(this.currentCandle.low, priceData.price);
            this.currentCandle.close = priceData.price;
            this.currentCandle.closeTime = now;
        }
    }

    /**
     * Pobranie danych rynkowych dla ML (kompatybilne z botem)
     */
    getMarketData() {
        if (!this.isInitialized || !this.currentCandle) {
            console.log('⚠️ Market adapter not initialized, using default data');
            return [{
                timestamp: Date.now(),
                open: 45000,
                high: 45500,
                low: 44500,
                close: 45000,
                volume: 1000,
                symbol: this.config.symbol
            }];
        }
        
        // Return historical data + current candle for ML analysis
        const allData = [...this.historicalData];
        if (this.currentCandle) {
            allData.push(this.currentCandle);
        }
        
        return allData;
    }

    /**
     * Pobranie aktualnej ceny
     */
    getCurrentPrice() {
        return this.currentCandle ? this.currentCandle.close : 45000;
    }

    /**
     * Pobranie statystyk 24h
     */
    async get24hStats() {
        if (!this.isInitialized) return null;
        return await this.provider.get24hStats(this.config.symbol);
    }

    /**
     * Sprawdzenie czy adapter jest gotowy
     */
    isReady() {
        return this.isInitialized && this.currentCandle !== null;
    }

    /**
     * Czyszczenie zasobów
     */
    cleanup() {
        if (this.provider) {
            this.provider.cleanup();
        }
        console.log('🧹 Trading Bot Market Adapter cleaned up');
    }
}

module.exports = TradingBotMarketAdapter;
