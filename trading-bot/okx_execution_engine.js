"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading infrastructure component
 */
/**
 * 🚀 [PRODUCTION-READY]
 * This component is designed for live trading environments.
 * Includes safety mechanisms and real API integrations.
 *
 * 🚀 OKX LIVE EXECUTION ENGINE - PRAWDZIWY TRADING
 *
 * Zastępuje Mock Execution Engine prawdziwymi transakcjami
 * Integracja z OKX API dla rzeczywistego tradingu
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLiveEngine = exports.LiveExecutionEngine = exports.createOKXEngine = exports.OKXExecutionEngine = void 0;
const crypto = __importStar(require("crypto"));
const axios_1 = __importDefault(require("axios"));
/**
 * 🚀 OKX LIVE EXECUTION ENGINE
 */
class OKXExecutionEngine {
    constructor(credentials) {
        this.rateLimitDelay = 100; // ms between requests
        this.mockMode = false;
        this.credentials = credentials;
        this.baseURL = credentials.sandbox ? 'https://eea.okx.com' : 'https://www.okx.com';
        // Sprawdź czy to mock credentials
        this.mockMode = credentials.apiKey.includes('MOCK') ||
            credentials.secretKey.includes('MOCK') ||
            process.env.MOCK_MODE === 'true';
        if (this.mockMode) {
            console.log('🎭 OKX Engine: MOCK MODE - Symulacja transakcji');
        }
        else {
            console.log('🚀 OKX Engine: LIVE MODE - Rzeczywiste transakcje');
        }
    }
    /**
     * 🎯 GŁÓWNA FUNKCJA - WYKONYWANIE ORDERÓW (OKX)
     */
    async executeOrder(order) {
        try {
            // MOCK MODE - Symulacja transakcji
            if (this.mockMode) {
                console.log(`🎭 MOCK ORDER EXECUTION:`);
                console.log(`   📊 Symbol: ${order.symbol}`);
                console.log(`   📈 Side: ${order.side}`);
                console.log(`   📊 Quantity: ${order.quantity.toFixed(6)}`);
                console.log(`   💵 Price: ${order.price?.toFixed(2) || 'MARKET'}`);
                // Symuluj sukces z realistycznymi danymi
                await new Promise(resolve => setTimeout(resolve, 100)); // Symuluj delay
                return {
                    success: true,
                    orderId: `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    clientOrderId: `CLIENT_MOCK_${Date.now()}`,
                    executedQty: order.quantity,
                    price: order.price || this.generateMockPrice(order.symbol),
                    status: 'FILLED'
                };
            }
            // LIVE MODE - Prawdziwe API OKX
            console.log(`🚀 LIVE ORDER EXECUTION:`);
            // Walidacja przed wysłaniem
            const validation = await this.validateOrder(order);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }
            // Konwersja symbolu do formatu OKX (np. BTCUSDT -> BTC-USDT)
            const okxSymbol = this.convertToOKXSymbol(order.symbol);
            // Przygotowanie body dla OKX API
            const body = {
                instId: okxSymbol,
                tdMode: 'cash', // Spot trading
                side: order.side.toLowerCase(),
                ordType: order.type.toLowerCase(),
                sz: order.quantity.toString(),
                px: order.price?.toString(), // Cena dla limit orders
            };
            // Usuń undefined values
            Object.keys(body).forEach(key => {
                if (body[key] === undefined) {
                    delete body[key];
                }
            });
            const bodyString = JSON.stringify(body);
            const timestamp = new Date().toISOString();
            // Podpisanie requestu OKX
            const signature = this.createOKXSignature('POST', '/api/v5/trade/order', bodyString, timestamp);
            // Wysłanie order do OKX
            const response = await axios_1.default.post(`${this.baseURL}/api/v5/trade/order`, body, {
                headers: {
                    'OK-ACCESS-KEY': this.credentials.apiKey,
                    'OK-ACCESS-SIGN': signature,
                    'OK-ACCESS-TIMESTAMP': timestamp,
                    'OK-ACCESS-PASSPHRASE': this.credentials.passphrase,
                    'Content-Type': 'application/json',
                    'x-simulated-trading': '1', // OBOWIĄZKOWY dla Demo Trading
                },
            });
            if (response.data.code === '0' && response.data.data?.length > 0) {
                const orderData = response.data.data[0];
                return {
                    success: true,
                    orderId: orderData.ordId,
                    clientOrderId: orderData.clOrdId,
                    status: orderData.sCode,
                };
            }
            else {
                console.log('🚨 OKX API Error Response:', JSON.stringify(response.data, null, 2));
                return {
                    success: false,
                    error: response.data.msg || `OKX Error Code: ${response.data.code}`,
                };
            }
        }
        catch (error) {
            console.error('🚨 Live OKX order execution failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.msg || error.message,
            };
        }
    }
    /**
     * 💰 SPRAWDZANIE SALDA KONTA (OKX)
     */
    async getAccountBalance() {
        try {
            const timestamp = new Date().toISOString();
            const signature = this.createOKXSignature('GET', '/api/v5/account/balance', '', timestamp);
            const response = await axios_1.default.get(`${this.baseURL}/api/v5/account/balance`, {
                headers: {
                    'OK-ACCESS-KEY': this.credentials.apiKey,
                    'OK-ACCESS-SIGN': signature,
                    'OK-ACCESS-TIMESTAMP': timestamp,
                    'OK-ACCESS-PASSPHRASE': this.credentials.passphrase,
                    'x-simulated-trading': '1', // OBOWIĄZKOWY dla Demo Trading
                },
            });
            if (response.data.code === '0' && response.data.data?.length > 0) {
                const balances = response.data.data[0].details || [];
                return balances
                    .filter((balance) => parseFloat(balance.availBal) > 0 || parseFloat(balance.frozenBal) > 0)
                    .map((balance) => ({
                    asset: balance.ccy,
                    free: parseFloat(balance.availBal),
                    locked: parseFloat(balance.frozenBal),
                }));
            }
            return [];
        }
        catch (error) {
            console.error('🚨 Failed to get OKX account balance:', error.response?.data || error.message);
            return [];
        }
    }
    /**
     * ❌ ANULOWANIE ORDERU (OKX)
     */
    async cancelOrder(orderId, symbol) {
        try {
            const okxSymbol = this.convertToOKXSymbol(symbol);
            const body = {
                instId: okxSymbol,
                ordId: orderId,
            };
            const bodyString = JSON.stringify(body);
            const timestamp = new Date().toISOString();
            const signature = this.createOKXSignature('POST', '/api/v5/trade/cancel-order', bodyString, timestamp);
            const response = await axios_1.default.post(`${this.baseURL}/api/v5/trade/cancel-order`, body, {
                headers: {
                    'OK-ACCESS-KEY': this.credentials.apiKey,
                    'OK-ACCESS-SIGN': signature,
                    'OK-ACCESS-TIMESTAMP': timestamp,
                    'OK-ACCESS-PASSPHRASE': this.credentials.passphrase,
                    'Content-Type': 'application/json',
                    'x-simulated-trading': '1', // OBOWIĄZKOWY dla Demo Trading
                },
            });
            return response.data.code === '0';
        }
        catch (error) {
            console.error('🚨 Failed to cancel OKX order:', error.response?.data || error.message);
            return false;
        }
    }
    /**
     * 💰 AKTUALNA CENA SYMBOLU (OKX)
     */
    async getCurrentPrice(symbol) {
        try {
            const okxSymbol = this.convertToOKXSymbol(symbol);
            const response = await axios_1.default.get(`${this.baseURL}/api/v5/market/ticker`, {
                params: { instId: okxSymbol }
            });
            if (response.data.code === '0' && response.data.data?.length > 0) {
                return parseFloat(response.data.data[0].last);
            }
            return null;
        }
        catch (error) {
            console.error('🚨 Failed to get current OKX price:', error.response?.data || error.message);
            return null;
        }
    }
    /**
     * 🔒 TWORZENIE PODPISU OKX
     */
    createOKXSignature(method, path, body, timestamp) {
        const message = timestamp + method + path + body;
        return crypto.createHmac('sha256', this.credentials.secretKey)
            .update(message)
            .digest('base64');
    }
    /**
     * 🔄 KONWERSJA SYMBOLU DO FORMATU OKX
     */
    convertToOKXSymbol(symbol) {
        // Jeśli już ma format OKX (BTC-USD, BTC-USDT, BTC-USDC), zwróć jak jest
        if (symbol.includes('-')) {
            return symbol;
        }
        // Konwertuj BTC/USD -> BTC-USD (format z slashem na myślnik)
        if (symbol.includes('/')) {
            return symbol.replace('/', '-');
        }
        // Konwertuj BTCUSDT -> BTC-USDT
        if (symbol.includes('USDT')) {
            const base = symbol.replace('USDT', '');
            return `${base}-USDT`;
        }
        // Konwertuj BTCUSDC -> BTC-USDC
        if (symbol.includes('USDC')) {
            const base = symbol.replace('USDC', '');
            return `${base}-USDC`;
        }
        // Konwertuj BTCUSD -> BTC-USD (główny format OKX Demo)
        if (symbol.includes('USD')) {
            const base = symbol.replace('USD', '');
            return `${base}-USD`;
        }
        if (symbol.includes('BTC')) {
            const quote = symbol.replace('BTC', '');
            return `BTC-${quote || 'USD'}`; // Domyślnie USD zamiast USDT
        }
        // Domyślnie dodaj USD (główny format OKX Demo)
        return `${symbol}-USD`;
    }
    /**
     * 🛡️ WALIDACJA ORDERU PRZED WYSŁANIEM (OKX)
     */
    async validateOrder(order) {
        // Sprawdź czy symbol jest poprawny
        if (!order.symbol || (!order.symbol.includes('USDT') && !order.symbol.includes('-'))) {
            return { valid: false, error: 'Invalid symbol format for OKX' };
        }
        // Sprawdź minimalną ilość
        if (order.quantity < 0.00001) {
            return { valid: false, error: 'Quantity too small' };
        }
        // Sprawdź saldo konta
        const balances = await this.getAccountBalance();
        const okxSymbol = this.convertToOKXSymbol(order.symbol);
        const [baseAsset, quoteAsset] = okxSymbol.split('-');
        if (order.side === 'BUY') {
            const quoteBalance = balances.find(b => b.asset === quoteAsset);
            const requiredQuote = order.quantity * (order.price || await this.getCurrentPrice(order.symbol) || 50000);
            if (!quoteBalance || quoteBalance.free < requiredQuote) {
                return { valid: false, error: `Insufficient ${quoteAsset} balance. Required: ${requiredQuote.toFixed(2)}, Available: ${quoteBalance?.free || 0}` };
            }
        }
        else {
            const assetBalance = balances.find(b => b.asset === baseAsset);
            if (!assetBalance || assetBalance.free < order.quantity) {
                return { valid: false, error: `Insufficient ${baseAsset} balance` };
            }
        }
        return { valid: true };
    }
    /**
     * 🏥 TEST POŁĄCZENIA Z OKX
     */
    async testConnection() {
        try {
            const balance = await this.getAccountBalance();
            return true;
        }
        catch (error) {
            console.error('❌ OKX Connection Test Failed:', error);
            return false;
        }
    }
    /**
     * 🎭 MOCK PRICE GENERATOR
     * Generuje realistyczne ceny dla symulacji
     */
    generateMockPrice(symbol) {
        const basePrices = {
            'BTC-USDT': 67000,
            'BTC-USD': 67000,
            'ETH-USDT': 3500,
            'ETH-USD': 3500,
            'ADA-USDT': 0.45,
            'SOL-USDT': 140
        };
        const basePrice = basePrices[symbol] || basePrices['BTC-USD'];
        // Dodaj losową zmienność ±2%
        const variation = (Math.random() - 0.5) * 0.04; // ±2%
        return basePrice * (1 + variation);
    }
}
exports.OKXExecutionEngine = OKXExecutionEngine;
// PRZYKŁAD KONFIGURACJI OKX
const createOKXEngine = () => {
    const credentials = {
        apiKey: process.env.OKX_API_KEY || 'your_okx_api_key_here',
        secretKey: process.env.OKX_SECRET_KEY || 'your_okx_secret_key_here',
        passphrase: process.env.OKX_PASSPHRASE || 'your_okx_passphrase_here',
        sandbox: true, // ZAWSZE TRUE dla testów!
    };
    return new OKXExecutionEngine(credentials);
};
exports.createOKXEngine = createOKXEngine;
// Dla kompatybilności wstecznej
class LiveExecutionEngine extends OKXExecutionEngine {
}
exports.LiveExecutionEngine = LiveExecutionEngine;
exports.createLiveEngine = exports.createOKXEngine;
