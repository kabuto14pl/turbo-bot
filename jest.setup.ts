// Jest setup file
// Global test configuration and mocks

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.OKX_API_KEY = 'test_api_key';
process.env.OKX_SECRET_KEY = 'test_secret_key';
process.env.OKX_PASSPHRASE = 'test_passphrase';
process.env.OKX_SANDBOX = 'true';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods in tests
global.console = {
  ...console,
  // Uncomment to hide logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
