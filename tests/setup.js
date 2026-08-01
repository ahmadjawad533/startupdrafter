/**
 * Jest setup file for frontend tests
 * Configures the test environment for DOM testing with jsdom
 */

const fs = require('fs');
const path = require('path');

// Create a proper localStorage mock that can be reset in tests
const createLocalStorageMock = () => {
  let store = {};
  
  // Create jest mock functions with implementation
  const mockGetItem = jest.fn((key) => store[key] || null);
  const mockSetItem = jest.fn((key, value) => {
    store[key] = String(value);
  });
  const mockRemoveItem = jest.fn((key) => {
    delete store[key];
  });
  const mockClear = jest.fn(() => {
    store = {};
  });
  const mockKey = jest.fn((index) => Object.keys(store)[index] || null);
  
  // Set initial implementations
  mockGetItem.mockImplementation((key) => store[key] || null);
  mockSetItem.mockImplementation((key, value) => {
    store[key] = String(value);
  });
  mockRemoveItem.mockImplementation((key) => {
    delete store[key];
  });
  mockClear.mockImplementation(() => {
    store = {};
  });
  mockKey.mockImplementation((index) => Object.keys(store)[index] || null);
  
  return {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
    clear: mockClear,
    get length() {
      return Object.keys(store).length;
    },
    key: mockKey,
    _reset: function() {
      store = {};
      this.getItem.mockClear();
      this.setItem.mockClear();
      this.removeItem.mockClear();
      this.clear.mockClear();
      this.key.mockClear();
      // Restore default implementations
      this.getItem.mockImplementation((key) => store[key] || null);
      this.setItem.mockImplementation((key, value) => {
        store[key] = String(value);
      });
      this.removeItem.mockImplementation((key) => {
        delete store[key];
      });
      this.clear.mockImplementation(() => {
        store = {};
      });
      this.key.mockImplementation((index) => Object.keys(store)[index] || null);
    },
    _getStore: function() {
      return store;
    },
    _setStore: function(newStore) {
      store = { ...newStore };
    }
  };
};

global.localStorage = createLocalStorageMock();

// Mock the Clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve())
  }
});

// Mock crypto.randomUUID for UUID generation testing
if (!global.crypto) {
  global.crypto = {};
}
global.crypto.randomUUID = jest.fn(() => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

// Load the app.js file and expose the StandupDrafter class
const loadAppClass = () => {
  const appCode = fs.readFileSync(path.join(__dirname, '../frontend/app.js'), 'utf8');
  
  // Remove the DOMContentLoaded event listener so we can instantiate the class in tests
  const modifiedCode = appCode.replace(
    /document\.addEventListener\('DOMContentLoaded'[\s\S]*?\}\);/,
    ''
  );
  
  try {
    // Create a function that will run the code and make StandupDrafter global
    const func = new Function(modifiedCode + '; return StandupDrafter;');
    const StandupDrafterClass = func();
    global.StandupDrafter = StandupDrafterClass;
  } catch (error) {
    console.error('Error loading app class:', error);
  }
};

loadAppClass();

// Suppress console errors and warnings in tests (optional)
const originalError = console.error;
const originalWarn = console.warn;

global.console = {
  ...console,
  error: jest.fn(originalError),
  warn: jest.fn(originalWarn)
};
