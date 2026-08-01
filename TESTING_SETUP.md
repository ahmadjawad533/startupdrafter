# Frontend Testing Framework Setup

This document describes the Jest testing framework setup for the StandupDrafter frontend.

## Overview

Jest is configured as a multi-project test runner supporting both:
- **Frontend Tests**: JavaScript tests with jsdom for DOM simulation
- **Infrastructure Tests**: TypeScript CDK infrastructure tests with Node environment

## Installation & Setup

### Dependencies Installed

```
- jest (^29.7.0) - Testing framework
- jsdom (^30.0.1) - DOM implementation for Node.js
- jest-environment-jsdom (^29.7.0) - Jest environment for DOM testing
- ts-jest (^29.1.2) - TypeScript support for Jest
```

### Configuration Files

#### `jest.config.js`
- Defines multi-project configuration with separate projects for frontend and infrastructure
- Frontend project uses `jsdom` test environment
- Infrastructure project uses `node` test environment
- Includes setup file for frontend tests at `tests/setup.js`

#### `tests/setup.js`
- Creates mocks for browser APIs (localStorage, Clipboard API, crypto)
- Loads and initializes the StandupDrafter class from `frontend/app.js`
- Removes DOMContentLoaded event handler to allow manual class instantiation in tests

#### `tests/test_frontend.test.js`
- Comprehensive test suite with 33 test cases
- Tests organized in describe blocks by feature area
- Uses mock API responses from test fixtures

## Test Coverage

### Test Suites

1. **Input Validation** (4 tests)
   - Tests for empty input validation
   - Tests for whitespace-only input validation
   - Tests for valid input acceptance
   - Tests for non-string input rejection

2. **Button State Management** (4 tests)
   - Tests that Generate button is disabled on page load
   - Tests that Generate button enables when content is present
   - Tests that Generate button disables when content is cleared
   - Tests that Generate button disables with whitespace-only input

3. **User ID Management** (4 tests)
   - Tests UUID generation when none exists
   - Tests UUID retrieval from localStorage
   - Tests UUID format validation (UUID v4)
   - Tests UUID persistence to localStorage

4. **Error Handling** (4 tests)
   - Tests error message display
   - Tests error message clearing
   - Tests loading indicator management

5. **Generate Update API Integration** (7 tests)
   - Tests correct API request structure
   - Tests response parsing
   - Tests pre-submission validation
   - Tests update display in output area
   - Tests copy button visibility after generation
   - Tests error handling for 400 responses
   - Tests network error handling

6. **History API Integration** (5 tests)
   - Tests history API requests
   - Tests history list rendering
   - Tests empty history display
   - Tests error display in history
   - Tests clicking history items

7. **Clipboard Copy Functionality** (4 tests)
   - Tests error when output area is empty
   - Tests clipboard write function calls
   - Tests success confirmation display
   - Tests clipboard failure handling

8. **Integration Tests** (1 test)
   - Tests full workflow from input to clipboard copy

### Test Fixtures

The test file includes mock API response fixtures:

```javascript
mockApiResponses = {
  generateSuccess,    // Successful status update generation
  generateErrorEmpty, // Error for empty notes
  historySuccess,     // History with multiple updates
  historyEmpty,       // Empty history
  historyError        // History retrieval error
}
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Frontend Tests Only

```bash
npm run test:frontend
```

### Run Infrastructure Tests Only

```bash
npm run test:infrastructure
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Specific Test File

```bash
npm test -- tests/test_frontend.test.js --no-coverage
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="validateNotes"
```

## Test Environment

### jsdom Configuration

The frontend tests run in a jsdom environment which provides:
- DOM API simulation (document, window, etc.)
- localStorage API mock
- navigator API mock
- Clipboard API mock

### Setup File (`tests/setup.js`)

The setup file performs the following before each test:

1. Creates a localStorage mock with jest functions
2. Mocks the Clipboard API (navigator.clipboard)
3. Mocks crypto.randomUUID for UUID generation
4. Loads `frontend/app.js` and exposes the `StandupDrafter` class
5. Removes the DOMContentLoaded event listener to prevent auto-initialization

### Test Context

Each test:
1. Receives a fresh DOM structure
2. Gets a new instance of StandupDrafter
3. Has reset mocks for all browser APIs
4. Can stub fetch responses

## Mocking & Fixtures

### Global Fetch Mock

```javascript
global.fetch = jest.fn();
```

Used to mock API responses in tests.

### localStorage Mock

Fully implements Storage API with jest mock functions:
- `getItem(key)`
- `setItem(key, value)`
- `removeItem(key)`
- `clear()`
- `_reset()` - Custom method to reset state for tests

### Clipboard API Mock

```javascript
navigator.clipboard.writeText = jest.fn(() => Promise.resolve());
```

### UUID Generation Mock

```javascript
crypto.randomUUID = jest.fn(() => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');
```

## Test Data

### Mock API Responses

Test fixtures include complete API response objects that match the design specification:

- **Generate Response**: Contains success flag, statusUpdate, and timestamp
- **History Response**: Contains success flag and updates array
- **Error Responses**: Contain success flag and error message

Example:

```javascript
{
  success: true,
  statusUpdate: '**Done:**\n- Fixed login bug\n\n**In Progress:**\n- API refactor\n\n**Blockers:**\n- None',
  timestamp: '2024-01-15T10:30:45.123Z'
}
```

## Debugging Tests

### Enable Specific Test Only

Use `.only` to run a single test:

```javascript
test.only('specific test', () => {
  // This test will run in isolation
});
```

### Skip Test

Use `.skip` to skip a test:

```javascript
test.skip('test to skip', () => {
  // This test will be skipped
});
```

### View Console Output

Console output from tests will be displayed. Add `console.log()` statements to debug.

### Use Jest Debugger

```bash
node --inspect-brk node_modules/.bin/jest --runInBand tests/test_frontend.test.js
```

Then open `chrome://inspect` in Chrome DevTools.

## Continuous Integration

The test setup is designed to work in CI/CD pipelines:

```bash
npm test -- --coverage --testPathPattern=frontend
```

This will:
- Run tests
- Generate coverage reports
- Exit with appropriate status code

## Extending Tests

### Adding New Tests

1. Create a new test case within an appropriate describe block
2. Use descriptive test names explaining what is being tested
3. Follow the AAA pattern (Arrange, Act, Assert)

Example:

```javascript
test('specific functionality works correctly', () => {
  // Arrange: Set up test data and mocks
  const testData = { /* ... */ };
  
  // Act: Execute the code being tested
  const result = someFunction(testData);
  
  // Assert: Verify the result
  expect(result).toBe(expectedValue);
});
```

### Adding Test Fixtures

Add new fixtures to the `mockApiResponses` object in the test file:

```javascript
const mockApiResponses = {
  // ... existing fixtures
  newFixture: {
    // fixture data
  }
};
```

## Troubleshooting

### Tests Not Running

Ensure all required packages are installed:

```bash
npm install
```

### Class Not Found

If `StandupDrafter is not defined`, check:
1. `tests/setup.js` is being loaded (check jest.config.js)
2. `frontend/app.js` file exists and contains the class definition
3. No syntax errors in the setup file

### Mock Not Working

Ensure mocks are reset between tests:

```javascript
beforeEach(() => {
  jest.clearAllMocks();
  localStorage._reset();
  navigator.clipboard.writeText.mockReset();
});
```

### Async Test Timeouts

If async tests timeout, increase the timeout:

```javascript
test('async operation', async () => {
  // test code
}, 10000); // 10 second timeout
```

## Performance

Current test execution time:
- Full test suite: ~5-10 seconds
- Single test file: ~2-5 seconds

Tests are optimized to run quickly by:
- Using mocked APIs instead of actual network calls
- Reusing test environment between tests
- Minimal DOM manipulation per test

## Future Improvements

Possible enhancements to the testing setup:

1. **E2E Tests**: Add Playwright or Cypress for end-to-end testing
2. **Coverage Thresholds**: Set minimum coverage requirements
3. **Visual Regression**: Add visual testing with Percy or similar
4. **Performance Tests**: Monitor test execution time
5. **API Contract Tests**: Validate against actual API schema

## References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [jsdom Documentation](https://github.com/jsdom/jsdom)
- [Testing Best Practices](https://jestjs.io/docs/tutorial-react)

## Requirements Alignment

This testing framework fulfills **Requirement 1.1** - Frontend accepts user input and manages state.

The test suite verifies:
- ✅ Input validation (empty, whitespace, valid input)
- ✅ Button state management (enable/disable)
- ✅ User identification (UUID generation and storage)
- ✅ API integration (requests and responses)
- ✅ Error handling (validation and network errors)
- ✅ History management
- ✅ Clipboard functionality

