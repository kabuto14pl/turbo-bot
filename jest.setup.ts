// Jest setup file
jest.setTimeout(30000); // 30 second timeout for tests

// Initialize test environment  
beforeAll(() => {
  console.log('Test environment initialized');
});

afterAll(() => {
  console.log('Test cleanup completed');
});
