/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Unit testing component
 */
// ============================================================================
// helpers.test.ts - Tests for Utility Functions and Helper Methods
// Unit tests for the modularized helpers module
// ============================================================================

import {
  signal_events,
  trade_events,
  record_signal,
  record_trade,
  toCsv,
  calculateVolatility,
  determineTrend,
  validateCandles,
  formatTimestamp,
  getTimestampRange,
  calculateSharpeRatio,
  calculateMaxDrawdown
} from '../modules/helpers';

describe('Helpers Module', () => {
  beforeEach(() => {
    // Clear event arrays before each test
    signal_events.length = 0;
    trade_events.length = 0;
  });

  describe('Event Recording', () => {
    it('should record signal events correctly', () => {
      record_signal('RSITurbo', Date.now(), 'BUY', 50000, { confidence: 0.8 });
      
      expect(signal_events).toHaveLength(1);
      expect(signal_events[0].strategy).toBe('RSITurbo');
      expect(signal_events[0].type).toBe('BUY');
      expect(signal_events[0].price).toBe(50000);
      expect(signal_events[0].confidence).toBe(0.8);
    });

    it('should record trade events correctly', () => {
      record_trade('SuperTrend', 'OPEN', 'buy', Date.now(), 45000, 0.1, 44000, 47000, null);
      
      expect(trade_events).toHaveLength(1);
      expect(trade_events[0].strategy).toBe('SuperTrend');
      expect(trade_events[0].action).toBe('OPEN');
      expect(trade_events[0].side).toBe('buy');
      expect(trade_events[0].price).toBe(45000);
      expect(trade_events[0].size).toBe(0.1);
    });
  });

  describe('CSV Export', () => {
    it('should convert data to CSV format correctly', () => {
      const data = [
        { name: 'Test 1', value: 100, active: true },
        { name: 'Test 2', value: 200, active: false }
      ];
      const columns = ['name', 'value', 'active'];
      
      const csv = toCsv(data, columns);
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('name,value,active');
      expect(lines[1]).toBe('Test 1,100,true');
      expect(lines[2]).toBe('Test 2,200,false');
    });

    it('should handle CSV special characters', () => {
      const data = [
        { name: 'Test, with comma', description: 'Line\nbreak', quote: 'Has "quotes"' }
      ];
      const columns = ['name', 'description', 'quote'];
      
      const csv = toCsv(data, columns);
      const lines = csv.split('\n');
      
      expect(lines[1]).toContain('"Test, with comma"');
      expect(lines[1]).toContain('"Line\nbreak"');
      expect(lines[1]).toContain('"Has ""quotes"""');
    });
  });

  describe('Market Analysis Functions', () => {
    it('should calculate volatility correctly', () => {
      const prices = [100, 102, 99, 105, 103, 98, 107];
      const volatility = calculateVolatility(prices);
      
      expect(volatility).toBeGreaterThan(0);
      expect(typeof volatility).toBe('number');
    });

    it('should return 0 volatility for insufficient data', () => {
      const prices = [100];
      const volatility = calculateVolatility(prices);
      
      expect(volatility).toBe(0);
    });

    it('should determine bullish trend correctly', () => {
      const prices = [100, 102, 104, 106]; // >0.5% increase
      const trend = determineTrend(prices);
      
      expect(trend).toBe('bullish');
    });

    it('should determine bearish trend correctly', () => {
      const prices = [100, 98, 96, 94]; // >0.5% decrease
      const trend = determineTrend(prices);
      
      expect(trend).toBe('bearish');
    });

    it('should determine sideways trend correctly', () => {
      const prices = [100, 100.2, 99.8, 100.1]; // <0.5% change
      const trend = determineTrend(prices);
      
      expect(trend).toBe('sideways');
    });
  });

  describe('Data Validation', () => {
    it('should validate complete candles successfully', () => {
      const candles = [
        {
          timestamp: Date.now(),
          open: 100,
          high: 105,
          low: 98,
          close: 103,
          volume: 1000
        }
      ];
      
      const isValid = validateCandles(candles);
      expect(isValid).toBe(true);
    });

    it('should reject empty candles array', () => {
      const candles: any[] = [];
      const isValid = validateCandles(candles);
      
      expect(isValid).toBe(false);
    });

    it('should reject candles missing required fields', () => {
      const candles = [
        {
          timestamp: Date.now(),
          open: 100,
          high: 105,
          // missing low, close, volume
        }
      ];
      
      const isValid = validateCandles(candles);
      expect(isValid).toBe(false);
    });
  });

  describe('Timestamp Utilities', () => {
    it('should format timestamp to ISO string', () => {
      const timestamp = 1634567890000; // Fixed timestamp for testing
      const formatted = formatTimestamp(timestamp);
      
      expect(formatted).toBe('2021-10-18T12:58:10.000Z');
    });

    it('should get timestamp range from candles', () => {
      const candles = [
        { timestamp: 1000 },
        { timestamp: 2000 },
        { timestamp: 3000 }
      ];
      
      const range = getTimestampRange(candles);
      
      expect(range.start).toBe(1000);
      expect(range.end).toBe(3000);
    });

    it('should handle empty candles for timestamp range', () => {
      const candles: any[] = [];
      const range = getTimestampRange(candles);
      
      expect(range.start).toBe(0);
      expect(range.end).toBe(0);
    });
  });

  describe('Performance Calculations', () => {
    it('should calculate Sharpe ratio correctly', () => {
      const returns = [0.01, 0.02, -0.01, 0.03, 0.005];
      const sharpe = calculateSharpeRatio(returns, 0);
      
      expect(typeof sharpe).toBe('number');
      expect(sharpe).toBeGreaterThan(0);
    });

    it('should return 0 Sharpe ratio for empty returns', () => {
      const returns: number[] = [];
      const sharpe = calculateSharpeRatio(returns);
      
      expect(sharpe).toBe(0);
    });

    it('should calculate max drawdown correctly', () => {
      const equityCurve = [1000, 1100, 1050, 900, 950, 1200];
      const maxDD = calculateMaxDrawdown(equityCurve);
      
      expect(maxDD).toBeGreaterThan(0);
      expect(maxDD).toBeLessThanOrEqual(1);
    });

    it('should return 0 drawdown for empty equity curve', () => {
      const equityCurve: number[] = [];
      const maxDD = calculateMaxDrawdown(equityCurve);
      
      expect(maxDD).toBe(0);
    });

    it('should return 0 drawdown for monotonically increasing equity', () => {
      const equityCurve = [1000, 1100, 1200, 1300];
      const maxDD = calculateMaxDrawdown(equityCurve);
      
      expect(maxDD).toBe(0);
    });
  });
});
