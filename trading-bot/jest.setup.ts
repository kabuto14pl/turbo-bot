/**
 * 🔧 [PRODUCTION-CONFIG]
 * Production configuration component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading infrastructure component
 */
// Jest setup file for trading bot tests
// Configure global test environment and mocks

// Mock external dependencies that might not be available in test environment
jest.mock('../infrastructure/logging/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

// Set up global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MODE = 'backtest';

export {};
