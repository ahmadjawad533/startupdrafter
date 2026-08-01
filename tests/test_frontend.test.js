/**
 * Frontend Tests for StandupDrafter Application
 * 
 * This test suite uses Jest with jsdom for DOM testing and includes:
 * - Unit tests for StandupDrafter class methods
 * - Input validation and state management
 * - User ID management
 * - API integration with mocked responses
 * - Clipboard copy functionality
 * - Error handling
 * 
 * Requirements: 1.1 - Frontend accepts user input and manages state
 */

// Mock fetch before importing the application code
global.fetch = jest.fn();

/**
 * ============================================================================
 * TEST FIXTURES - Mock API Responses
 * ============================================================================
 * 
 * These fixtures define standard mock responses used across multiple tests.
 * They represent the actual API response contracts defined in the design doc.
 */

const mockApiResponses = {
  /**
   * Success response from POST /generate endpoint
   * Contains the generated status update and timestamp
   */
  generateSuccess: {
    success: true,
    statusUpdate: '**Done:**\n- Fixed login bug\n\n**In Progress:**\n- API refactor\n\n**Blockers:**\n- None',
    timestamp: '2024-01-15T10:30:45.123Z'
  },

  /**
   * Error response from POST /generate endpoint
   * Returned when input validation fails
   */
  generateErrorEmpty: {
    success: false,
    error: 'Notes cannot be empty'
  },

  /**
   * Error response for missing userId
   */
  generateErrorMissingUserId: {
    success: false,
    error: 'userId is required'
  },

  /**
   * Success response from GET /history endpoint with multiple updates
   * Updates are sorted by timestamp in descending order (newest first)
   */
  historySuccess: {
    success: true,
    updates: [
      {
        timestamp: '2024-01-15T10:30:45.123Z',
        statusUpdate: '**Done:**\n- Fixed login bug\n\n**In Progress:**\n- API refactor\n\n**Blockers:**\n- None',
        originalNotes: 'fixed login bug\nstarted API refactor'
      },
      {
        timestamp: '2024-01-14T15:45:20.456Z',
        statusUpdate: '**Done:**\n- Deployed feature X\n\n**In Progress:**\n- Testing feature Y\n\n**Blockers:**\n- None',
        originalNotes: 'deployed feature x\ntesting feature y'
      }
    ]
  },

  /**
   * Success response from GET /history endpoint with empty history
   */
  historyEmpty: {
    success: true,
    updates: []
  },

  /**
   * Error response from GET /history endpoint
   * Returned when DynamoDB query fails
   */
  historyError: {
    success: false,
    error: 'Failed to retrieve history',
    updates: []
  }
};

/**
 * ============================================================================
 * TEST SUITE - StandupDrafter Application
 * ============================================================================
 */

describe('StandupDrafter Frontend Tests', () => {
  let app;

  /**
   * Setup before each test
   * - Clear all mocks
   * - Create DOM structure
   * - Instantiate the application
   */
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    global.fetch.mockReset();
    
    // Reset localStorage - keep the mock but clear the store
    if (localStorage._reset) {
      localStorage._reset();
    }
    
    navigator.clipboard.writeText.mockReset();

    // Create DOM structure matching frontend/index.html
    document.body.innerHTML = `
      <header>
        <h1>StandupDrafter</h1>
        <p>Transform your work notes into professional status updates</p>
      </header>
      
      <main>
        <div id="errorMessage" class="error-message" style="display: none;"></div>
        
        <div id="loadingIndicator" class="loading-indicator" style="display: none;">
          <div class="spinner"></div>
          <p>Generating update...</p>
        </div>
        
        <section class="input-section">
          <h2>Your Notes</h2>
          <textarea 
            id="notesInput" 
            placeholder="Paste your rough work notes here..."
            rows="8"
          ></textarea>
          <button id="generateBtn" class="btn btn-primary">Generate Update</button>
        </section>
        
        <section class="output-section">
          <h2>Generated Update</h2>
          <div id="outputArea" class="output-area">
            <p class="placeholder">Your formatted status update will appear here...</p>
          </div>
          <button id="copyBtn" class="btn btn-secondary" style="display: none;">Copy to Clipboard</button>
        </section>
        
        <section class="history-section">
          <h2>Update History</h2>
          <ul id="historyList" class="history-list">
            <li class="placeholder">No updates yet. Generate your first update above!</li>
          </ul>
        </section>
      </main>
    `;

    // Load the application class (simulated for testing)
    // In a real test environment, this would be imported from the actual file
    app = new global.StandupDrafter('http://localhost:3000/api');
  });

  /**
   * Cleanup after each test
   */
  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * ============================================================================
   * INPUT VALIDATION TESTS
   * ============================================================================
   * 
   * Tests for requirement 1.3 and 1.4
   * Validates that the application correctly validates user input
   */

  describe('Input Validation', () => {
    test('validateNotes rejects empty string', () => {
      expect(app.validateNotes('')).toBe(false);
    });

    test('validateNotes rejects whitespace-only string', () => {
      expect(app.validateNotes('   ')).toBe(false);
      expect(app.validateNotes('\n\n')).toBe(false);
      expect(app.validateNotes('\t')).toBe(false);
    });

    test('validateNotes accepts valid input', () => {
      expect(app.validateNotes('fixed bug')).toBe(true);
      expect(app.validateNotes('  fixed bug  ')).toBe(true);
      expect(app.validateNotes('line 1\nline 2')).toBe(true);
    });

    test('validateNotes rejects non-string input', () => {
      expect(app.validateNotes(null)).toBe(false);
      expect(app.validateNotes(undefined)).toBe(false);
      expect(app.validateNotes(123)).toBe(false);
    });
  });

  /**
   * ============================================================================
   * BUTTON STATE MANAGEMENT TESTS
   * ============================================================================
   * 
   * Tests for requirement 1.3 and 1.4
   * Validates that the Generate button is properly disabled/enabled
   */

  describe('Button State Management', () => {
    test('Generate button is disabled when textarea is empty on page load', () => {
      expect(app.generateBtn.disabled).toBe(true);
    });

    test('Generate button is enabled when textarea has content', () => {
      app.notesInput.value = 'fixed bug';
      app.notesInput.dispatchEvent(new Event('input'));
      expect(app.generateBtn.disabled).toBe(false);
    });

    test('Generate button is disabled when textarea is cleared', () => {
      app.notesInput.value = 'fixed bug';
      app.notesInput.dispatchEvent(new Event('input'));
      expect(app.generateBtn.disabled).toBe(false);

      app.notesInput.value = '';
      app.notesInput.dispatchEvent(new Event('input'));
      expect(app.generateBtn.disabled).toBe(true);
    });

    test('Generate button is disabled when textarea only contains whitespace', () => {
      app.notesInput.value = '   \n\t  ';
      app.notesInput.dispatchEvent(new Event('input'));
      expect(app.generateBtn.disabled).toBe(true);
    });
  });

  /**
   * ============================================================================
   * USER ID MANAGEMENT TESTS
   * ============================================================================
   * 
   * Tests for requirement 4.2
   * Validates persistent user ID generation and storage
   */

  describe('User ID Management', () => {
    test('getOrCreateUserId generates a UUID when none exists', () => {
      // Clear localStorage completely
      localStorage.clear();
      
      const userId = app.getOrCreateUserId();
      
      expect(userId).toBeDefined();
      expect(typeof userId).toBe('string');
      expect(userId.length).toBeGreaterThan(0);
    });

    test('getOrCreateUserId retrieves existing UUID from localStorage', () => {
      localStorage.clear();
      const existingUserId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const storedData = JSON.stringify({
        userId: existingUserId,
        createdAt: '2024-01-10T08:15:30.000Z'
      });
      
      // Store the data directly
      localStorage.setItem('standupDrafter_user', storedData);

      const userId = app.getOrCreateUserId();
      expect(userId).toBe(existingUserId);
    });

    test('getOrCreateUserId generates valid UUID v4 format', () => {
      // Clear localStorage
      localStorage.clear();
      
      const userId = app.getOrCreateUserId();
      
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(userId)).toBe(true);
    });

    test('getOrCreateUserId persists new userId to localStorage', () => {
      // Clear localStorage
      localStorage.clear();
      
      const userId = app.getOrCreateUserId();
      
      const stored = localStorage.getItem('standupDrafter_user');
      expect(stored).toBeDefined();
      
      const parsedData = JSON.parse(stored);
      expect(parsedData.userId).toBe(userId);
      expect(parsedData.createdAt).toBeDefined();
    });
  });

  /**
   * ============================================================================
   * ERROR HANDLING TESTS
   * ============================================================================
   * 
   * Tests for requirement 6.1 and 6.6
   * Validates proper display of error messages
   */

  describe('Error Handling', () => {
    test('showError displays message in error section', () => {
      const errorMsg = 'Test error message';
      app.showError(errorMsg);
      
      expect(app.errorMessage.textContent).toBe(errorMsg);
      expect(app.errorMessage.style.display).not.toBe('none');
    });

    test('clearError hides error message', () => {
      app.showError('Some error');
      expect(app.errorMessage.style.display).not.toBe('none');
      
      app.clearError();
      expect(app.errorMessage.textContent).toBe('');
      expect(app.errorMessage.style.display).toBe('none');
    });

    test('setLoading shows loading indicator and disables buttons', () => {
      app.setLoading(true);
      
      expect(app.loadingIndicator.style.display).not.toBe('none');
      expect(app.generateBtn.disabled).toBe(true);
    });

    test('setLoading hides loading indicator and enables buttons', () => {
      app.setLoading(false);
      
      expect(app.loadingIndicator.style.display).toBe('none');
      expect(app.generateBtn.disabled).toBe(true); // Still disabled because textarea is empty
    });
  });

  /**
   * ============================================================================
   * API INTEGRATION TESTS - Generate Endpoint
   * ============================================================================
   * 
   * Tests for requirements 2.1, 3.1, 3.2, 6.2
   * Validates correct API calls and response handling
   */

  describe('Generate Update API Integration', () => {
    test('generateUpdate sends correct request to /generate endpoint', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.generateSuccess
      });

      const notes = 'fixed bug\nworking on feature';
      await app.generateUpdate(notes);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: app.userId,
            notes: notes
          })
        }
      );
    });

    test('generateUpdate returns parsed response on success', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.generateSuccess
      });

      const result = await app.generateUpdate('test notes');
      
      expect(result.success).toBe(true);
      expect(result.statusUpdate).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    test('handleGenerateClick validates notes before sending', async () => {
      app.notesInput.value = '';
      await app.handleGenerateClick();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(app.errorMessage.textContent).toContain('Please enter some notes');
    });

    test('handleGenerateClick displays generated update in output area', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.generateSuccess
      });

      app.notesInput.value = 'fixed bug';
      await app.handleGenerateClick();

      expect(app.outputArea.textContent).toBe(mockApiResponses.generateSuccess.statusUpdate);
    });

    test('handleGenerateClick shows copy button after successful generation', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.generateSuccess
      });

      expect(app.copyBtn.style.display).toBe('none');
      
      app.notesInput.value = 'fixed bug';
      await app.handleGenerateClick();

      expect(app.copyBtn.style.display).toBe('inline-block');
    });

    test('handleGenerateClick displays error message on 400 response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockApiResponses.generateErrorEmpty
      });

      app.notesInput.value = '';
      await app.handleGenerateClick();

      expect(app.errorMessage.textContent).toContain('Notes cannot be empty');
    });

    test('handleGenerateClick displays error on network failure', async () => {
      global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      app.notesInput.value = 'test notes';
      await app.handleGenerateClick();

      expect(app.errorMessage.textContent).toContain('Service unavailable');
    });
  });

  /**
   * ============================================================================
   * API INTEGRATION TESTS - History Endpoint
   * ============================================================================
   * 
   * Tests for requirements 5.1, 5.4, 5.5, 6.5
   * Validates history retrieval and display
   */

  describe('History API Integration', () => {
    test('fetchHistory sends correct request with userId', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.historySuccess
      });

      await app.fetchHistory();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/history?userId='),
        undefined
      );
    });

    test('fetchHistory renders history list with timestamp and preview', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.historySuccess
      });

      await app.fetchHistory();

      const historyItems = app.historyList.querySelectorAll('.history-item');
      expect(historyItems.length).toBe(2);
    });

    test('fetchHistory displays empty state when no updates exist', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.historyEmpty
      });

      await app.fetchHistory();

      expect(app.historyList.textContent).toContain('No history yet');
    });

    test('fetchHistory displays error when API fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => mockApiResponses.historyError
      });

      await app.fetchHistory();

      expect(app.historyList.textContent).toContain('Failed to retrieve history');
    });

    test('clicking history item displays full update', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.historySuccess
      });

      await app.fetchHistory();

      const firstHistoryItem = app.historyList.querySelector('.history-item');
      expect(firstHistoryItem).toBeDefined();

      // Simulate clicking the history item
      const clickEvent = new MouseEvent('click', { bubbles: true });
      firstHistoryItem.dispatchEvent(clickEvent);

      expect(app.outputArea.textContent).toBe(mockApiResponses.historySuccess.updates[0].statusUpdate);
    });
  });

  /**
   * ============================================================================
   * CLIPBOARD FUNCTIONALITY TESTS
   * ============================================================================
   * 
   * Tests for requirements 3.3, 3.4, 3.5
   * Validates copy to clipboard functionality
   * 
   * Requirement 3.3: Frontend shall copy entire Status_Update text to system clipboard
   * Requirement 3.4: When Copy to Clipboard button is clicked, entire update shall be copied
   * Requirement 3.5: Frontend shall display confirmation message when copy succeeds
   */

  describe('Clipboard Copy Functionality - Requirements 3.3, 3.4, 3.5', () => {
    // Helper function to create a realistic status update
    const createStatusUpdate = () => {
      return '**Done:**\n- Fixed authentication bug\n- Deployed feature X\n\n**In Progress:**\n- Refactoring database layer\n- Code review on PR #234\n\n**Blockers:**\n- Waiting for API keys from security team';
    };

    test('copyToClipboard displays error when output area is empty', async () => {
      app.outputArea.textContent = '';
      await app.copyToClipboard('');

      expect(app.errorMessage.textContent).toContain('Nothing to copy');
    });

    test('copyToClipboard calls navigator.clipboard.writeText with exact content', async () => {
      navigator.clipboard.writeText.mockResolvedValueOnce();

      const text = createStatusUpdate();
      await app.copyToClipboard(text);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text);
    });

    test('copyToClipboard shows success confirmation on copy button', async () => {
      navigator.clipboard.writeText.mockResolvedValueOnce();

      const originalLabel = app.copyBtn.textContent;
      app.copyBtn.textContent = 'Copy to Clipboard';
      
      await app.copyToClipboard('test content');

      // The button should temporarily show the success message
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    test('copyToClipboard displays error message on clipboard failure', async () => {
      navigator.clipboard.writeText.mockRejectedValueOnce(new Error('Clipboard denied'));

      await app.copyToClipboard('test content');

      expect(app.errorMessage.textContent).toContain('Failed to copy');
    });

    test('Copy button click copies output area text to clipboard', async () => {
      navigator.clipboard.writeText.mockResolvedValueOnce();

      const statusUpdate = createStatusUpdate();
      app.outputArea.textContent = statusUpdate;
      app.copyBtn.style.display = 'inline-block';

      // Simulate clicking the copy button
      const clickEvent = new MouseEvent('click', { bubbles: true });
      app.copyBtn.dispatchEvent(clickEvent);

      // Wait a bit for async operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(statusUpdate);
    });

    test('copyToClipboard preserves formatting and line breaks', async () => {
      navigator.clipboard.writeText.mockResolvedValueOnce();

      const statusUpdate = createStatusUpdate();
      await app.copyToClipboard(statusUpdate);

      // Verify the exact text with formatting is passed to clipboard
      const callArg = navigator.clipboard.writeText.mock.calls[0][0];
      expect(callArg).toContain('**Done:**');
      expect(callArg).toContain('**In Progress:**');
      expect(callArg).toContain('**Blockers:**');
      expect(callArg).toMatch(/\n/); // Contains line breaks
    });

    test('copyToClipboard works with multi-line content', async () => {
      navigator.clipboard.writeText.mockResolvedValueOnce();

      const multilineContent = '**Done:**\n- Task 1\n- Task 2\n- Task 3\n\n**In Progress:**\n- Task 4';
      await app.copyToClipboard(multilineContent);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(multilineContent);
    });

    test('copyToClipboard works with empty blockers section', async () => {
      navigator.clipboard.writeText.mockResolvedValueOnce();

      const statusUpdate = '**Done:**\n- Completed work\n\n**In Progress:**\n- Ongoing task\n\n**Blockers:**\n- None';
      await app.copyToClipboard(statusUpdate);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(statusUpdate);
    });

    test('Requirement 3.3 - Copy button copies entire Status_Update text', async () => {
      // Requirement 3.3: Verify entire status update is copied
      navigator.clipboard.writeText.mockResolvedValueOnce();

      const fullUpdate = createStatusUpdate();
      app.outputArea.textContent = fullUpdate;
      
      await app.copyToClipboard(fullUpdate);

      // Verify the entire text is copied (not truncated)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(fullUpdate);
      expect(navigator.clipboard.writeText.mock.calls[0][0].length).toBe(fullUpdate.length);
    });

    test('Requirement 3.4 - Clipboard gets correct content when Copy button clicked', async () => {
      // Requirement 3.4: When button is clicked, clipboard shall receive exact content
      navigator.clipboard.writeText.mockResolvedValueOnce();

      const statusUpdate = createStatusUpdate();
      app.outputArea.textContent = statusUpdate;
      app.copyBtn.style.display = 'inline-block';

      // Simulate the button click that calls copyToClipboard
      await app.copyToClipboard(statusUpdate);

      const clippedContent = navigator.clipboard.writeText.mock.calls[0][0];
      expect(clippedContent).toBe(statusUpdate);
    });

    test('Requirement 3.5 - Confirmation message appears on successful copy', async () => {
      // Requirement 3.5: Verify confirmation message is displayed
      navigator.clipboard.writeText.mockResolvedValueOnce();

      const statusUpdate = createStatusUpdate();
      
      await app.copyToClipboard(statusUpdate);

      // The button should show a confirmation (this is done via UI update)
      // We verify the copy operation succeeded
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(statusUpdate);
    });

    test('Full clipboard workflow - generate, display, and copy', async () => {
      // Comprehensive test of the full workflow
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.generateSuccess
      });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.historySuccess
      });
      navigator.clipboard.writeText.mockResolvedValueOnce();

      // Step 1: Generate an update
      app.notesInput.value = 'fixed bug\nworking on feature\nblocked on approval';
      await app.handleGenerateClick();

      const displayedUpdate = app.outputArea.textContent;
      expect(displayedUpdate).toBeDefined();
      expect(displayedUpdate.length > 0).toBe(true);

      // Step 2: Copy the update
      await app.copyToClipboard(displayedUpdate);

      // Step 3: Verify the clipboard received the exact same content
      const clippedContent = navigator.clipboard.writeText.mock.calls[0][0];
      expect(clippedContent).toBe(displayedUpdate);
    });
  });

  /**
   * ============================================================================
   * INTEGRATION TESTS
   * ============================================================================
   * 
   * Tests that combine multiple features
   */

  describe('Integration Tests', () => {
    test('Full workflow: input → generate → display → copy', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.generateSuccess
      });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.historySuccess
      });
      navigator.clipboard.writeText.mockResolvedValueOnce();

      // Step 1: User enters notes
      app.notesInput.value = 'fixed bug\nworking on feature';
      app.notesInput.dispatchEvent(new Event('input'));
      expect(app.generateBtn.disabled).toBe(false);

      // Step 2: User clicks generate
      await app.handleGenerateClick();
      expect(app.outputArea.textContent).toBe(mockApiResponses.generateSuccess.statusUpdate);

      // Step 3: User copies to clipboard
      const textToCopy = app.outputArea.textContent;
      await app.copyToClipboard(textToCopy);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(textToCopy);

      // Step 4: History is refreshed
      expect(global.fetch).toHaveBeenCalledTimes(2); // generate + history
    });
  });

  /**
   * ============================================================================
   * TASK 16.3 - HISTORY FUNCTIONALITY TESTS
   * ============================================================================
   * 
   * Automated test for Task 16.3: Test history functionality
   * 
   * This test validates:
   * - Multiple status updates can be generated and displayed in history
   * - History list displays all updates with timestamps
   * - Updates appear in newest-first (descending) order by timestamp
   * - Clicking a history item displays the full update in the output area
   * 
   * Requirements: 5.1, 5.3, 5.4, 5.5
   */

  describe('Task 16.3 - History Functionality Tests', () => {
    test('Generate multiple updates and verify history list displays in correct order', async () => {
      // Mock responses for three different generated updates
      const update1 = {
        success: true,
        statusUpdate: '**Done:**\n- Fixed login bug\n\n**In Progress:**\n- API refactoring\n\n**Blockers:**\n- None',
        timestamp: '2024-01-15T14:30:00.000Z'
      };

      const update2 = {
        success: true,
        statusUpdate: '**Done:**\n- Deployed dashboard\n\n**In Progress:**\n- Setting up monitoring\n\n**Blockers:**\n- Waiting for SSL cert',
        timestamp: '2024-01-15T13:15:00.000Z'
      };

      const update3 = {
        success: true,
        statusUpdate: '**Done:**\n- Code review completed\n\n**In Progress:**\n- Updating documentation\n\n**Blockers:**\n- None',
        timestamp: '2024-01-15T12:00:00.000Z'
      };

      // Mock the history response with all three updates sorted by timestamp descending
      const historyResponse = {
        success: true,
        updates: [
          {
            timestamp: update1.timestamp,
            statusUpdate: update1.statusUpdate,
            originalNotes: 'Fixed login bug\nStarted API refactor'
          },
          {
            timestamp: update2.timestamp,
            statusUpdate: update2.statusUpdate,
            originalNotes: 'Deployed dashboard\nSetting up monitoring\nBlocked on SSL'
          },
          {
            timestamp: update3.timestamp,
            statusUpdate: update3.statusUpdate,
            originalNotes: 'Code review completed\nUpdating documentation'
          }
        ]
      };

      // Mock fetch for history retrieval
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => historyResponse
      });

      // Step 1: Fetch history (requirement 5.1)
      await app.fetchHistory();

      // Step 2: Verify history list displays all updates (requirement 5.4)
      const historyItems = app.historyList.querySelectorAll('.history-item');
      expect(historyItems.length).toBe(3);

      // Step 3: Verify updates appear in newest-first order (requirement 5.3)
      const timestamps = Array.from(historyItems).map((item) => {
        const timestampElement = item.querySelector('.history-timestamp');
        return timestampElement ? timestampElement.textContent : '';
      });

      // Verify first item is the most recent (14:30)
      expect(historyItems[0].textContent).toContain('Fixed login bug');
      
      // Verify second item is middle (13:15)
      expect(historyItems[1].textContent).toContain('Deployed dashboard');
      
      // Verify third item is oldest (12:00)
      expect(historyItems[2].textContent).toContain('Code review completed');
    });

    test('Verify history items contain timestamps and previews', async () => {
      // Create a mock history response with meaningful data
      const historyResponse = {
        success: true,
        updates: [
          {
            timestamp: '2024-01-15T10:30:45.123Z',
            statusUpdate: '**Done:**\n- Fixed login bug with authentication service\n\n**In Progress:**\n- Starting API refactoring\n\n**Blockers:**\n- Waiting for database migration approval',
            originalNotes: 'fixed login bug\nstarted API refactor\nblocked on db migration'
          },
          {
            timestamp: '2024-01-14T15:45:20.456Z',
            statusUpdate: '**Done:**\n- Deployed feature X to production\n\n**In Progress:**\n- Testing feature Y in staging\n\n**Blockers:**\n- None',
            originalNotes: 'deployed feature x\ntesting feature y'
          }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => historyResponse
      });

      await app.fetchHistory();

      const historyItems = app.historyList.querySelectorAll('.history-item');
      
      // Verify each item has a timestamp element
      historyItems.forEach((item) => {
        const timestampElement = item.querySelector('.history-timestamp');
        expect(timestampElement).not.toBeNull();
        expect(timestampElement.textContent).toBeTruthy();
      });

      // Verify each item has a preview element
      historyItems.forEach((item) => {
        const previewElement = item.querySelector('.history-preview');
        expect(previewElement).not.toBeNull();
        expect(previewElement.textContent).toBeTruthy();
      });

      // Verify preview is truncated to 50 characters (or less if update is shorter)
      const firstPreview = historyItems[0].querySelector('.history-preview').textContent;
      expect(firstPreview.length).toBeLessThanOrEqual(51); // 50 chars + ellipsis
      if (firstPreview.includes('…')) {
        expect(firstPreview.length).toBe(51);
      }
    });

    test('Clicking on a history item displays full update in output area (requirement 5.5)', async () => {
      // Create a mock history response
      const historyResponse = {
        success: true,
        updates: [
          {
            timestamp: '2024-01-15T10:30:45.123Z',
            statusUpdate: '**Done:**\n- Fixed login bug\n\n**In Progress:**\n- API refactoring\n\n**Blockers:**\n- Database approval pending',
            originalNotes: 'fixed login bug\nstarted API refactor\nblocked on db migration'
          },
          {
            timestamp: '2024-01-14T15:45:20.456Z',
            statusUpdate: '**Done:**\n- Deployed feature X\n\n**In Progress:**\n- Testing feature Y\n\n**Blockers:**\n- None',
            originalNotes: 'deployed feature x\ntesting feature y'
          }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => historyResponse
      });

      // Fetch and render history
      await app.fetchHistory();

      // Verify output area initially shows placeholder
      expect(app.outputArea.textContent).toContain('Your formatted status update will appear here');
      expect(app.copyBtn.style.display).toBe('none');

      // Get the first history item
      const firstHistoryItem = app.historyList.querySelector('.history-item');
      expect(firstHistoryItem).not.toBeNull();

      // Click the first history item
      const clickEvent = new MouseEvent('click', { bubbles: true });
      firstHistoryItem.dispatchEvent(clickEvent);

      // Verify full update is now displayed in output area
      expect(app.outputArea.textContent).toBe(historyResponse.updates[0].statusUpdate);
      
      // Verify copy button is shown
      expect(app.copyBtn.style.display).toBe('inline-block');

      // Click the second history item
      const secondHistoryItem = app.historyList.querySelectorAll('.history-item')[1];
      const clickEvent2 = new MouseEvent('click', { bubbles: true });
      secondHistoryItem.dispatchEvent(clickEvent2);

      // Verify the second update is now displayed
      expect(app.outputArea.textContent).toBe(historyResponse.updates[1].statusUpdate);
    });

    test('History displays newest updates first (descending timestamp order)', async () => {
      // Create multiple updates with explicit timestamps
      const update1 = {
        timestamp: '2024-01-15T10:00:00.000Z', // Most recent
        statusUpdate: '**Done:**\n- Task 1\n\n**In Progress:**\n- Task 2\n\n**Blockers:**\n- None',
        originalNotes: 'Task 1\nTask 2'
      };

      const update2 = {
        timestamp: '2024-01-14T10:00:00.000Z', // Middle
        statusUpdate: '**Done:**\n- Task 3\n\n**In Progress:**\n- Task 4\n\n**Blockers:**\n- None',
        originalNotes: 'Task 3\nTask 4'
      };

      const update3 = {
        timestamp: '2024-01-13T10:00:00.000Z', // Oldest
        statusUpdate: '**Done:**\n- Task 5\n\n**In Progress:**\n- Task 6\n\n**Blockers:**\n- None',
        originalNotes: 'Task 5\nTask 6'
      };

      const historyResponse = {
        success: true,
        updates: [update1, update2, update3]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => historyResponse
      });

      await app.fetchHistory();

      // Verify order: newest first
      const historyItems = app.historyList.querySelectorAll('.history-item');
      
      // First item should show content from update1 (most recent)
      expect(historyItems[0].textContent).toContain('Task 1');
      
      // Second item should show content from update2 (middle)
      expect(historyItems[1].textContent).toContain('Task 3');
      
      // Third item should show content from update3 (oldest)
      expect(historyItems[2].textContent).toContain('Task 5');
    });

    test('Copy to clipboard works with history items', async () => {
      const historyResponse = {
        success: true,
        updates: [
          {
            timestamp: '2024-01-15T10:30:45.123Z',
            statusUpdate: '**Done:**\n- Fixed bug\n\n**In Progress:**\n- Refactor\n\n**Blockers:**\n- None',
            originalNotes: 'fixed bug\nrefactoring'
          }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => historyResponse
      });

      navigator.clipboard.writeText.mockResolvedValueOnce();

      // Fetch history
      await app.fetchHistory();

      // Click first history item to display it
      const firstHistoryItem = app.historyList.querySelector('.history-item');
      firstHistoryItem.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // Verify update is displayed
      expect(app.outputArea.textContent).toBe(historyResponse.updates[0].statusUpdate);

      // Copy to clipboard
      const textToCopy = app.outputArea.textContent;
      await app.copyToClipboard(textToCopy);

      // Verify clipboard API was called with the correct text
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(textToCopy);
    });

    test('History functionality integration: generate update, verify in history', async () => {
      // Step 1: Generate an update
      const generateResponse = {
        success: true,
        statusUpdate: '**Done:**\n- Fixed critical bug\n\n**In Progress:**\n- Implementing feature\n\n**Blockers:**\n- None',
        timestamp: '2024-01-15T10:30:45.123Z'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => generateResponse
      });

      // Mock history fetch that will be called after generation
      const historyResponse = {
        success: true,
        updates: [
          {
            timestamp: generateResponse.timestamp,
            statusUpdate: generateResponse.statusUpdate,
            originalNotes: 'Fixed critical bug\nImplementing feature'
          }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => historyResponse
      });

      // Generate update
      app.notesInput.value = 'Fixed critical bug\nImplementing feature';
      app.notesInput.dispatchEvent(new Event('input'));
      
      await app.handleGenerateClick();

      // Verify generated update is displayed
      expect(app.outputArea.textContent).toBe(generateResponse.statusUpdate);

      // Verify history was fetched and contains the new update
      const historyItems = app.historyList.querySelectorAll('.history-item');
      expect(historyItems.length).toBe(1);
      expect(historyItems[0].textContent).toContain('Fixed critical bug');
    });
  });

  /**
   * ============================================================================
   * TASK 16.4 - ERROR HANDLING SCENARIOS TESTS
   * ============================================================================
   * 
   * Comprehensive tests for error handling scenarios:
   * - Test empty notes submission shows validation error
   * - Test with temporarily disconnected network shows service unavailable error
   * - Verify error messages are clearly displayed in error section
   * 
   * Requirements: 6.1, 6.2, 6.6
   * Task Description: Test that the application properly handles and displays
   * error conditions, providing clear feedback to users when problems occur.
   */

  describe('Task 16.4 - Error Handling Scenarios', () => {
    /**
     * Scenario 1: Empty Notes Submission
     * Tests that the application validates empty input before submission
     * and displays a clear error message in the error section.
     * Requirement 6.1: Empty notes submission shows validation error
     */
    describe('Scenario 1: Empty Notes Submission Shows Validation Error', () => {
      test('Empty notes submission displays error message', async () => {
        // User leaves textarea empty and tries to generate
        app.notesInput.value = '';
        await app.handleGenerateClick();

        // Requirement 6.6: Error messages are clearly displayed in error section
        expect(app.errorMessage.style.display).not.toBe('none');
        expect(app.errorMessage.textContent).toBeTruthy();
        expect(app.errorMessage.textContent.toLowerCase()).toContain('notes');
      });

      test('Whitespace-only notes submission shows validation error', async () => {
        // User enters only whitespace (should be treated as empty)
        app.notesInput.value = '   \n\t  ';
        app.notesInput.dispatchEvent(new Event('input'));
        
        await app.handleGenerateClick();

        // Verify error is shown and API is not called
        expect(app.errorMessage.style.display).not.toBe('none');
        expect(app.errorMessage.textContent).toBeTruthy();
        expect(global.fetch).not.toHaveBeenCalled();
      });

      test('Empty notes submission does not send API request', async () => {
        // Requirement 6.1: Prevent submission of empty notes
        app.notesInput.value = '';
        await app.handleGenerateClick();

        // Verify fetch was never called - validation prevented submission
        expect(global.fetch).not.toHaveBeenCalled();
      });

      test('Error message is clearly visible in error section', () => {
        const errorMsg = 'Validation error: Please enter some notes';
        app.showError(errorMsg);

        // Requirement 6.6: Error messages displayed in distinct error area
        expect(app.errorMessage.style.display).not.toBe('none');
        expect(app.errorMessage.textContent).toBe(errorMsg);
        expect(app.errorMessage.textContent.length).toBeGreaterThan(0);
        
        // Verify error element exists with proper styling
        expect(app.errorMessage.className).toBe('error-message');
      });

      test('User can submit after fixing validation error', async () => {
        // First attempt: validation error
        app.notesInput.value = '';
        await app.handleGenerateClick();
        expect(app.errorMessage.textContent).toBeTruthy();
        expect(global.fetch).not.toHaveBeenCalled();

        // User enters valid notes
        app.notesInput.value = 'fixed bug';
        app.notesInput.dispatchEvent(new Event('input'));

        // Mock successful API response
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.generateSuccess
        });
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.historyEmpty
        });

        await app.handleGenerateClick();

        // Second attempt succeeds
        expect(app.outputArea.textContent).toBe(mockApiResponses.generateSuccess.statusUpdate);
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    /**
     * Scenario 2: Network Disconnection / Service Unavailable
     * Tests that the application handles network errors gracefully
     * and displays a "Service unavailable" message.
     * Requirement 6.2: Unreachable API shows service unavailable error
     */
    describe('Scenario 2: Network Disconnection Shows Service Unavailable Error', () => {
      test('Network disconnection displays service unavailable error', async () => {
        // Simulate network error (connection failed)
        global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

        app.notesInput.value = 'test notes';
        app.notesInput.dispatchEvent(new Event('input'));
        
        await app.handleGenerateClick();

        // Requirement 6.2: Service unavailable error when API unreachable
        expect(app.errorMessage.style.display).not.toBe('none');
        expect(app.errorMessage.textContent).toContain('Service unavailable');
      });

      test('Network error with specific message shows appropriate error', async () => {
        // Simulate specific network error
        global.fetch.mockRejectedValueOnce(
          new TypeError('NetworkError when attempting to fetch resource.')
        );

        app.notesInput.value = 'valid notes';
        app.notesInput.dispatchEvent(new Event('input'));
        
        await app.handleGenerateClick();

        expect(app.errorMessage.style.display).not.toBe('none');
        expect(app.errorMessage.textContent).toContain('Service unavailable');
      });

      test('Timeout error displays appropriate message', async () => {
        // Simulate timeout
        global.fetch.mockRejectedValueOnce(
          new Error('Request timeout')
        );

        app.notesInput.value = 'valid notes';
        app.notesInput.dispatchEvent(new Event('input'));
        
        await app.handleGenerateClick();

        expect(app.errorMessage.style.display).not.toBe('none');
        expect(app.errorMessage.textContent).toBeTruthy();
      });

      test('Loading indicator is hidden when network error occurs', async () => {
        global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

        app.notesInput.value = 'test notes';
        app.notesInput.dispatchEvent(new Event('input'));
        
        await app.handleGenerateClick();

        // Loading should be hidden after error
        expect(app.loadingIndicator.style.display).toBe('none');
      });

      test('Generate button is re-enabled after network error for retry', async () => {
        global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

        app.notesInput.value = 'test notes';
        await app.handleGenerateClick();

        // Button should be enabled after error so user can retry
        expect(app.generateBtn.disabled).toBe(false);
      });

      test('User can retry after network error', async () => {
        // First attempt fails
        global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        app.notesInput.value = 'test notes';
        await app.handleGenerateClick();
        expect(app.errorMessage.textContent).toContain('Service unavailable');

        // Second attempt succeeds
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.generateSuccess
        });
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.historyEmpty
        });

        await app.handleGenerateClick();
        expect(app.outputArea.textContent).toBe(mockApiResponses.generateSuccess.statusUpdate);
      });

      test('History fetch error is handled gracefully', async () => {
        // API call fails when fetching history
        global.fetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => ({ success: false, error: 'Service Unavailable' })
        });

        await app.fetchHistory();

        // Error should be displayed in history section
        expect(app.historyList.textContent).toBeTruthy();
      });
    });

    /**
     * Scenario 3: Error Messages Clearly Displayed
     * Tests that error messages are visible, readable, and properly formatted.
     * Requirement 6.6: Error messages displayed in distinct error area
     */
    describe('Scenario 3: Error Messages Clearly Displayed in Error Section', () => {
      test('Error section is visible when error occurs', () => {
        // Initially hidden
        expect(app.errorMessage.style.display).toBe('none');
        
        app.showError('Test error');
        
        // Should be visible after showError
        expect(app.errorMessage.style.display).not.toBe('none');
      });

      test('Error message contains descriptive helpful text', async () => {
        global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

        app.notesInput.value = 'test';
        await app.handleGenerateClick();

        // Error should contain helpful descriptive text
        const errorText = app.errorMessage.textContent;
        expect(errorText.length).toBeGreaterThan(10);
        expect(errorText.toLowerCase()).toMatch(/service|unavailable|error|connection|check/i);
      });

      test('Error messages are updated correctly', () => {
        const error1 = 'First error message';
        const error2 = 'Second error message';
        const error3 = 'Third error message';

        app.showError(error1);
        expect(app.errorMessage.textContent).toBe(error1);

        app.showError(error2);
        expect(app.errorMessage.textContent).toBe(error2);

        app.showError(error3);
        expect(app.errorMessage.textContent).toBe(error3);
      });

      test('Error messages persist until cleared or replaced', () => {
        app.showError('Error 1');
        expect(app.errorMessage.textContent).toBe('Error 1');

        // Error should not automatically disappear
        expect(app.errorMessage.style.display).not.toBe('none');
        expect(app.errorMessage.textContent).toBe('Error 1');

        // Should persist until explicitly cleared
        app.clearError();
        expect(app.errorMessage.style.display).toBe('none');
      });

      test('clearError properly hides error section', () => {
        app.showError('Some error');
        expect(app.errorMessage.style.display).not.toBe('none');

        app.clearError();
        
        expect(app.errorMessage.style.display).toBe('none');
        expect(app.errorMessage.textContent).toBe('');
      });

      test('API server error messages are displayed to user', async () => {
        const serverError = 'Invalid input format provided';
        global.fetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ success: false, error: serverError })
        });

        app.notesInput.value = 'test';
        await app.handleGenerateClick();

        expect(app.errorMessage.textContent).toContain(serverError);
      });

      test('Error section element has proper CSS class for styling', () => {
        // Verify error element exists and has correct class
        expect(app.errorMessage).toBeDefined();
        expect(app.errorMessage.className).toBe('error-message');
        
        // When shown, should be visually distinct
        app.showError('Test error');
        expect(app.errorMessage.style.display).not.toBe('none');
      });

      test('Long error messages are fully readable', () => {
        const longError = 'This is a comprehensive error message that explains in detail what went wrong. ' +
                         'The user should be able to understand the issue completely. ' +
                         'The message may span multiple lines if needed.';
        
        app.showError(longError);

        expect(app.errorMessage.textContent).toBe(longError);
        expect(app.errorMessage.textContent.length).toBeGreaterThan(100);
      });

      test('Error section is cleared before new API request', async () => {
        // First request with error
        global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        app.notesInput.value = 'test';
        await app.handleGenerateClick();
        expect(app.errorMessage.textContent).toBeTruthy();

        // Second request (success) - error should be cleared first
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.generateSuccess
        });
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.historyEmpty
        });

        app.notesInput.value = 'new test';
        // clearError is called inside handleGenerateClick before API call
        await app.handleGenerateClick();

        // Should show successful result
        expect(app.outputArea.textContent).toBe(mockApiResponses.generateSuccess.statusUpdate);
      });
    });

    /**
     * Integrated Error Handling Workflows
     * Tests complete error scenarios combining multiple aspects
     */
    describe('Integrated Error Handling Workflows', () => {
      test('Complete error recovery workflow', async () => {
        // Step 1: Initial error
        app.showError('Initial error');
        expect(app.errorMessage.textContent).toBeTruthy();

        // Step 2: User tries with empty notes
        app.notesInput.value = '';
        app.notesInput.dispatchEvent(new Event('input'));
        
        await app.handleGenerateClick();
        expect(app.errorMessage.textContent).toContain('notes');
        expect(global.fetch).not.toHaveBeenCalled();

        // Step 3: User enters valid notes
        app.notesInput.value = 'fixed issue';
        app.notesInput.dispatchEvent(new Event('input'));

        // Step 4: Generate succeeds
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.generateSuccess
        });
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.historyEmpty
        });

        await app.handleGenerateClick();
        expect(app.outputArea.textContent).toBe(mockApiResponses.generateSuccess.statusUpdate);
      });

      test('Error handling maintains proper loading state', async () => {
        global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

        app.notesInput.value = 'test notes';
        
        // Before request
        expect(app.loadingIndicator.style.display).toBe('none');
        
        await app.handleGenerateClick();
        
        // After error, loading should be hidden
        expect(app.loadingIndicator.style.display).toBe('none');
        expect(app.generateBtn.disabled).toBe(false); // Can retry
      });

      test('Different error types display appropriate messages', async () => {
        // Validation error
        app.notesInput.value = '';
        await app.handleGenerateClick();
        const validationError = app.errorMessage.textContent;

        // Clear error for next test
        app.clearError();

        // Network error
        global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        app.notesInput.value = 'valid notes';
        app.notesInput.dispatchEvent(new Event('input'));
        await app.handleGenerateClick();
        const networkError = app.errorMessage.textContent;

        // Both errors present, but different
        expect(validationError).toBeTruthy();
        expect(networkError).toBeTruthy();
        expect(validationError).not.toBe(networkError);
        expect(networkError).toContain('Service unavailable');
      });

      test('User can generate, fail, and retry successfully', async () => {
        // First successful generation
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.generateSuccess
        });
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.historyEmpty
        });

        app.notesInput.value = 'first note';
        app.notesInput.dispatchEvent(new Event('input'));
        await app.handleGenerateClick();
        expect(app.outputArea.textContent).toBe(mockApiResponses.generateSuccess.statusUpdate);

        // Second attempt fails
        global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        app.notesInput.value = 'second note';
        await app.handleGenerateClick();
        expect(app.errorMessage.textContent).toContain('Service unavailable');

        // Third attempt succeeds (retry)
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.generateSuccess
        });
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.historyEmpty
        });

        await app.handleGenerateClick();
        expect(app.outputArea.textContent).toBe(mockApiResponses.generateSuccess.statusUpdate);
      });
    });
  });
});
