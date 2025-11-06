// Mock fetch globally for node environment
global.fetch = jest.fn()

// Extend Jest matchers
require('@testing-library/jest-dom')

// Setup test environment
beforeEach(() => {
  if (global.fetch && typeof global.fetch.mockClear === 'function') {
    global.fetch.mockClear()
  }
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific log levels
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
}