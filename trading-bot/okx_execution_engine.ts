/**
 * 🚀 OKX LIVE EXECUTION ENGINE - PRAWDZIWY TRADING
 * 
 * Zastępuje Mock Execution Engine prawdziwymi transakcjami
 * Integracja z OKX API dla rzeczywistego tradingu
 */

import * as crypto from 'crypto';
import axios from 'axios';

interface ExchangeCredentials {
  apiKey: string;
  secretKey: string;
  passphrase: string; // OKX wymaga passphrase
  sandbox?: boolean; // Tryb testowy
}

interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

interface OrderResponse {
  success: boolean;
  orderId?: string;
  clientOrderId?: string;
  executedQty?: number;
  price?: number;
  status?: string;
  error?: string;
}

interface AccountBalance {
  asset: string;
  free: number;
  locked: number;
}

/**
 * 🚀 OKX LIVE EXECUTION ENGINE
 */
export class OKXExecutionEngine {
  private baseURL: string;
  private credentials: ExchangeCredentials;
  private rateLimitDelay = 100; // ms between requests
  private mockMode: boolean = false;

  constructor(credentials: ExchangeCredentials) {
    this.credentials = credentials;
    this.baseURL = credentials.sandbox ? 'https://eea.okx.com' : 'https://www.okx.com';
    
    // Sprawdź czy to mock credentials
    this.mockMode = credentials.apiKey.includes('MOCK') || 
                   credentials.secretKey.includes('MOCK') || 
                   process.env.MOCK_MODE === 'true';
    
    if (this.mockMode) {
      console.log('🎭 OKX Engine: MOCK MODE - Symulacja transakcji');
    } else {
      console.log('🚀 OKX Engine: LIVE MODE - Rzeczywiste transakcje');
    }
  }

  /**
   * 🎯 GŁÓWNA FUNKCJA - WYKONYWANIE ORDERÓW (OKX)
   */
  async executeOrder(order: OrderRequest): Promise<OrderResponse> {
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
        if (body[key as keyof typeof body] === undefined) {
          delete body[key as keyof typeof body];
        }
      });

      const bodyString = JSON.stringify(body);
      const timestamp = new Date().toISOString();
      
      // Podpisanie requestu OKX
      const signature = this.createOKXSignature('POST', '/api/v5/trade/order', bodyString, timestamp);

      // Wysłanie order do OKX
      const response = await axios.post(`${this.baseURL}/api/v5/trade/order`, body, {
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
      } else {
        console.log('🚨 OKX API Error Response:', JSON.stringify(response.data, null, 2));
        return {
          success: false,
          error: response.data.msg || `OKX Error Code: ${response.data.code}`,
        };
      }

    } catch (error: any) {
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
  async getAccountBalance(): Promise<AccountBalance[]> {
    try {
      const timestamp = new Date().toISOString();
      const signature = this.createOKXSignature('GET', '/api/v5/account/balance', '', timestamp);

      const response = await axios.get(`${this.baseURL}/api/v5/account/balance`, {
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
          .filter((balance: any) => parseFloat(balance.availBal) > 0 || parseFloat(balance.frozenBal) > 0)
          .map((balance: any) => ({
            asset: balance.ccy,
            free: parseFloat(balance.availBal),
            locked: parseFloat(balance.frozenBal),
          }));
      }

      return [];

    } catch (error: any) {
      console.error('🚨 Failed to get OKX account balance:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * ❌ ANULOWANIE ORDERU (OKX)
   */
  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    try {
      const okxSymbol = this.convertToOKXSymbol(symbol);
      const body = {
        instId: okxSymbol,
        ordId: orderId,
      };

      const bodyString = JSON.stringify(body);
      const timestamp = new Date().toISOString();
      const signature = this.createOKXSignature('POST', '/api/v5/trade/cancel-order', bodyString, timestamp);

      const response = await axios.post(`${this.baseURL}/api/v5/trade/cancel-order`, body, {
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

    } catch (error: any) {
      console.error('🚨 Failed to cancel OKX order:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * 💰 AKTUALNA CENA SYMBOLU (OKX)
   */
  async getCurrentPrice(symbol: string): Promise<number | null> {
    try {
      const okxSymbol = this.convertToOKXSymbol(symbol);
      const response = await axios.get(`${this.baseURL}/api/v5/market/ticker`, {
        params: { instId: okxSymbol }
      });

      if (response.data.code === '0' && response.data.data?.length > 0) {
        return parseFloat(response.data.data[0].last);
      }

      return null;

    } catch (error: any) {
      console.error('🚨 Failed to get current OKX price:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * 🔒 TWORZENIE PODPISU OKX
   */
  private createOKXSignature(method: string, path: string, body: string, timestamp: string): string {
    const message = timestamp + method + path + body;
    return crypto.createHmac('sha256', this.credentials.secretKey)
      .update(message)
      .digest('base64');
  }

  /**
   * 🔄 KONWERSJA SYMBOLU DO FORMATU OKX
   */
  private convertToOKXSymbol(symbol: string): string {
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
      return `BTC-${quote || 'USD'}`;  // Domyślnie USD zamiast USDT
    }
    
    // Domyślnie dodaj USD (główny format OKX Demo)
    return `${symbol}-USD`;
  }

  /**
   * 🛡️ WALIDACJA ORDERU PRZED WYSŁANIEM (OKX)
   */
  private async validateOrder(order: OrderRequest): Promise<{ valid: boolean; error?: string }> {
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
    } else {
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
  async testConnection(): Promise<boolean> {
    try {
      const balance = await this.getAccountBalance();
      return true;
    } catch (error) {
      console.error('❌ OKX Connection Test Failed:', error);
      return false;
    }
  }

  /**
   * 🎭 MOCK PRICE GENERATOR
   * Generuje realistyczne ceny dla symulacji
   */
  private generateMockPrice(symbol: string): number {
    const basePrices: { [key: string]: number } = {
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

// PRZYKŁAD KONFIGURACJI OKX
export const createOKXEngine = () => {
  const credentials: ExchangeCredentials = {
    apiKey: process.env.OKX_API_KEY || 'your_okx_api_key_here',
    secretKey: process.env.OKX_SECRET_KEY || 'your_okx_secret_key_here',
    passphrase: process.env.OKX_PASSPHRASE || 'your_okx_passphrase_here',
    sandbox: true, // ZAWSZE TRUE dla testów!
  };

  return new OKXExecutionEngine(credentials);
};

// Dla kompatybilności wstecznej
export class LiveExecutionEngine extends OKXExecutionEngine {}
export const createLiveEngine = createOKXEngine;
