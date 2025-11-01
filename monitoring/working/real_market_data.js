/**
 * 🚀 [PRODUCTION-OPERATIONAL]
 * Production monitoring component
 */
/**
 * 🚀 [PRODUCTION-OPERATIONAL]
 * Production monitoring component
 */
const axios = require('axios');
const WebSocket = require('ws');

/**
 * 🌐 REAL MARKET DATA PROVIDER
 * Pobiera realne dane z Binance API (publiczne endpointy - bez kluczy)
 */
class RealMarketDataProvider {
    constructor() {
        this.baseUrl = 'https://api.binance.com';
        this.wsUrl = 'wss://stream.binance.com:9443/ws';
        this.currentPrices = {};
        this.ws = null;
        this.isConnected = false;
        this.subscribers = [];
        
        console.log('🌐 Real Market Data Provider initialized');
    }

    /**
     * Pobieranie bieżących cen (REST API)
     */
    async getCurrentPrices(symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']) {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v3/ticker/price`);
            const allPrices = response.data;
            
            const prices = {};
            symbols.forEach(symbol => {
                const ticker = allPrices.find(t => t.symbol === symbol);
                if (ticker) {
                    prices[symbol] = parseFloat(ticker.price);
                }
            });
            
            this.currentPrices = { ...this.currentPrices, ...prices };
            console.log('✅ Real prices updated:', prices);
            return prices;
            
        } catch (error) {
            console.error('❌ Failed to fetch real prices:', error.message);
            return this.currentPrices;
        }
    }

    /**
     * Pobieranie świeczek OHLCV (historyczne i aktualne)
     */
    async getCandles(symbol = 'BTCUSDT', interval = '1m', limit = 100) {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v3/klines`, {
                params: {
                    symbol: symbol,
                    interval: interval,
                    limit: limit
                }
            });
            
            const candles = response.data.map(kline => ({
                timestamp: kline[0],
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
                volume: parseFloat(kline[5]),
                closeTime: kline[6],
                symbol: symbol
            }));
            
            console.log(`✅ Real candles for ${symbol}: ${candles.length} candles`);
            return candles;
            
        } catch (error) {
            console.error(`❌ Failed to fetch candles for ${symbol}:`, error.message);
            return [];
        }
    }

    /**
     * Pobieranie 24h statystyk
     */
    async get24hStats(symbol = 'BTCUSDT') {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v3/ticker/24hr`, {
                params: { symbol: symbol }
            });
            
            const stats = {
                symbol: response.data.symbol,
                price: parseFloat(response.data.lastPrice),
                change24h: parseFloat(response.data.priceChangePercent),
                volume24h: parseFloat(response.data.volume),
                high24h: parseFloat(response.data.highPrice),
                low24h: parseFloat(response.data.lowPrice),
                count: parseInt(response.data.count)
            };
            
            console.log(`✅ 24h stats for ${symbol}:`, stats);
            return stats;
            
        } catch (error) {
            console.error(`❌ Failed to fetch 24h stats for ${symbol}:`, error.message);
            return null;
        }
    }

    /**
     * WebSocket stream dla real-time cen
     */
    startRealTimeStream(symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']) {
        try {
            const streams = symbols.map(symbol => `${symbol.toLowerCase()}@ticker`).join('/');
            const wsUrl = `${this.wsUrl}/${streams}`;
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.on('open', () => {
                console.log('🔥 Real-time WebSocket connected to Binance');
                this.isConnected = true;
            });
            
            this.ws.on('message', (data) => {
                try {
                    const ticker = JSON.parse(data);
                    
                    // Handle array of tickers or single ticker
                    const tickers = Array.isArray(ticker) ? ticker : [ticker];
                    
                    tickers.forEach(t => {
                        if (t.s && t.c) {
                            const symbol = t.s;
                            const price = parseFloat(t.c);
                            const change24h = parseFloat(t.P);
                            
                            this.currentPrices[symbol] = price;
                            
                            // Notify subscribers
                            this.notifySubscribers({
                                symbol: symbol,
                                price: price,
                                change24h: change24h,
                                timestamp: Date.now()
                            });
                        }
                    });
                    
                } catch (error) {
                    console.error('❌ WebSocket message parse error:', error.message);
                }
            });
            
            this.ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error.message);
                this.isConnected = false;
            });
            
            this.ws.on('close', () => {
                console.log('⚠️ WebSocket connection closed, reconnecting in 5s...');
                this.isConnected = false;
                setTimeout(() => this.startRealTimeStream(symbols), 5000);
            });
            
        } catch (error) {
            console.error('❌ Failed to start WebSocket stream:', error.message);
        }
    }

    /**
     * Subskrypcja na zmiany cen
     */
    subscribe(callback) {
        this.subscribers.push(callback);
        console.log('✅ New price subscriber added');
    }

    /**
     * Powiadomienie subskrybentów
     */
    notifySubscribers(priceData) {
        this.subscribers.forEach(callback => {
            try {
                callback(priceData);
            } catch (error) {
                console.error('❌ Subscriber callback error:', error.message);
            }
        });
    }

    /**
     * Sprawdzenie połączenia z API
     */
    async testConnection() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v3/ping`);
            console.log('✅ Binance API connection test successful');
            return true;
        } catch (error) {
            console.error('❌ Binance API connection test failed:', error.message);
            return false;
        }
    }

    /**
     * Czyszczenie zasobów
     */
    cleanup() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.subscribers = [];
        console.log('🧹 Market data provider cleaned up');
    }
}

module.exports = RealMarketDataProvider;
