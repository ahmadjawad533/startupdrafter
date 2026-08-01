/**
 * StandupDrafter Frontend Application
 *
 * Data models (for reference):
 *
 * interface UserIdentifier {
 *   userId: string;  // UUID v4 format
 *   createdAt: string;  // ISO 8601 timestamp
 * }
 *
 * interface GenerateRequest {
 *   userId: string;
 *   notes: string;
 * }
 *
 * interface GenerateResponse {
 *   success: boolean;
 *   statusUpdate?: string;
 *   timestamp?: string;
 *   error?: string;
 * }
 *
 * interface HistoryResponse {
 *   success: boolean;
 *   updates: UpdateRecord[];
 *   error?: string;
 * }
 *
 * interface UpdateRecord {
 *   timestamp: string;
 *   statusUpdate: string;
 *   originalNotes: string;
 * }
 */

class StandupDrafter {
  /**
   * @param {string} apiBaseUrl - Base URL for the API Gateway endpoint
   */
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;

    // Initialize DOM element references
    this.notesInput = document.getElementById('notesInput');
    this.generateBtn = document.getElementById('generateBtn');
    this.outputArea = document.getElementById('outputArea');
    this.copyBtn = document.getElementById('copyBtn');
    this.historyList = document.getElementById('historyList');
    this.errorMessage = document.getElementById('errorMessage');
    this.loadingIndicator = document.getElementById('loadingIndicator');

    // Initialize persistent user ID
    this.userId = this.getOrCreateUserId();

    // Set initial button state based on textarea content (disabled when empty)
    this.generateBtn.disabled = !this.validateNotes(this.notesInput.value);

    // Enable/disable Generate button as the user types
    this.notesInput.addEventListener('input', () => {
      this.generateBtn.disabled = !this.validateNotes(this.notesInput.value);
    });

    // Copy button: copy output area text to clipboard
    this.copyBtn.addEventListener('click', async () => {
      const text = this.outputArea.innerText || this.outputArea.textContent || '';
      await this.copyToClipboard(text);
    });

    // Generate button: trigger full generate flow (Requirement 2.1)
    this.generateBtn.addEventListener('click', () => this.handleGenerateClick());
  }

  /**
   * Retrieve an existing userId from localStorage, or generate and persist a new one.
   * The stored object has shape: { userId: string, createdAt: string }
   *
   * @returns {string} UUID v4 user identifier
   */
  getOrCreateUserId() {
    const STORAGE_KEY = 'standupDrafter_user';

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.userId) {
          return parsed.userId;
        }
      }
    } catch (e) {
      // If parsing fails, fall through to generate a new ID
      console.warn('Failed to parse stored userId, generating new one:', e);
    }

    // Generate a UUID v4
    const userId = this._generateUUIDv4();
    const createdAt = new Date().toISOString();

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, createdAt }));
    } catch (e) {
      console.warn('Failed to persist userId to localStorage:', e);
    }

    return userId;
  }

  /**
   * Generate a RFC 4122 UUID v4.
   * Uses crypto.randomUUID() when available, with a manual fallback.
   *
   * @returns {string} UUID v4 string
   * @private
   */
  _generateUUIDv4() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    // Fallback: manual UUID v4 construction
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Validate that notes are non-empty and non-whitespace.
   *
   * @param {string} notes
   * @returns {boolean}
   */
  validateNotes(notes) {
    return typeof notes === 'string' && notes.trim().length > 0;
  }

  /**
   * Handle the Generate button click: validate, call the API, and update the UI.
   * Wired up in the constructor via addEventListener.
   */
  async handleGenerateClick() {
    const notes = this.notesInput.value;

    // Requirement 6.1 – validate before sending
    if (!this.validateNotes(notes)) {
      this.showError('Please enter some notes before generating an update.');
      return;
    }

    this.clearError();
    this.setLoading(true);

    try {
      // Requirement 2.1 – send notes to the API
      const response = await fetch(`${this.apiBaseUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId, notes }),
      });

      let data;
      try {
        data = await response.json();
      } catch (_) {
        // Response body is not valid JSON
        throw new Error('Received an unexpected response from the server.');
      }

      if (!response.ok || !data.success) {
        // Requirement 6.2 – handle 400/500 error responses
        const errorMsg = data.error || `Request failed (${response.status}).`;
        this.showError(errorMsg);
        return;
      }

      // Requirement 3.1 – display statusUpdate in output area
      // Requirement 3.2 – preserve formatting (use textContent + pre-wrap via CSS)
      this.outputArea.textContent = data.statusUpdate;

      // Show the copy button now that there is content
      this.copyBtn.style.display = 'inline-block';

      // Refresh history after a successful generation (Requirement 5.1)
      await this.fetchHistory();

    } catch (err) {
      // Requirement 6.2 – network / fetch errors → "Service unavailable"
      if (err.name === 'TypeError' || err.message.toLowerCase().includes('failed to fetch') ||
          err.message.toLowerCase().includes('network')) {
        this.showError('Service unavailable. Please check your connection and try again.');
      } else {
        this.showError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Call the /generate endpoint to produce a formatted status update.
   * Returns the parsed JSON response (used by tests / external callers).
   *
   * @param {string} notes - Raw user notes
   * @returns {Promise<GenerateResponse>}
   */
  async generateUpdate(notes) {
    const response = await fetch(`${this.apiBaseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: this.userId, notes }),
    });
    return response.json();
  }

  /**
   * Fetch the user's update history from the API and render it in the history list.
   * - Displays a timestamp and 50-character preview for each update.
   * - Clicking a history item loads the full update into the output area.
   * - Displays "No history yet" when the list is empty.
   * - Displays an error message inside the history section on API failure.
   *
   * Satisfies Requirements: 5.1, 5.4, 5.5, 6.5
   *
   * @returns {Promise<void>}
   */
  async fetchHistory() {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/history?userId=${encodeURIComponent(this.userId)}`
      );

      let data;
      try {
        data = await response.json();
      } catch {
        this._renderHistoryError('Failed to parse history response.');
        return;
      }

      // 6.5 – API errors return an empty list; surface the error message in the
      // history section rather than the global error area.
      if (!response.ok || !data.success) {
        this._renderHistoryError(
          data.error || `Error loading history (HTTP ${response.status}).`
        );
        return;
      }

      const updates = Array.isArray(data.updates) ? data.updates : [];

      // 5.4 – Empty history
      if (updates.length === 0) {
        this.historyList.innerHTML =
          '<li class="history-empty">No history yet.</li>';
        return;
      }

      // 5.4 – Render list items with timestamp + 50-char preview
      this.historyList.innerHTML = '';
      updates.forEach((update) => {
        const li = document.createElement('li');
        li.className = 'history-item';

        // Format the ISO timestamp into a human-readable local string.
        let formattedDate = update.timestamp;
        try {
          formattedDate = new Date(update.timestamp).toLocaleString();
        } catch {
          // Leave the raw timestamp if parsing fails.
        }

        const preview = (update.statusUpdate || '').substring(0, 50);
        const previewText =
          (update.statusUpdate || '').length > 50 ? `${preview}…` : preview;

        li.innerHTML = `
          <span class="history-timestamp">${formattedDate}</span>
          <span class="history-preview">${previewText}</span>
        `;

        // 5.5 – Clicking an item displays the full update in the output area.
        li.addEventListener('click', () => {
          this._displayUpdate(update.statusUpdate);
        });

        this.historyList.appendChild(li);
      });
    } catch (err) {
      // Network-level failure
      this._renderHistoryError('Unable to load history. Please check your connection.');
      console.error('fetchHistory error:', err);
    }
  }

  /**
   * Display the full text of a status update in the output area.
   * Reuses the same rendering path as generateUpdate() so the UI stays consistent.
   *
   * @param {string} statusUpdate
   * @private
   */
  _displayUpdate(statusUpdate) {
    this.outputArea.textContent = statusUpdate;
    this.copyBtn.style.display = 'inline-block';
  }

  /**
   * Render an error message inside the history list section.
   *
   * @param {string} message
   * @private
   */
  _renderHistoryError(message) {
    this.historyList.innerHTML = `<li class="history-error">${message}</li>`;
  }

  /**
   * Copy text to the system clipboard and show a confirmation or error message.
   * Uses the Clipboard API when available; shows an error message on failure.
   *
   * @param {string} text - Text to copy
   * @returns {Promise<void>}
   */
  async copyToClipboard(text) {
    if (!text || !text.trim()) {
      this.showError('Nothing to copy — generate an update first.');
      return;
    }

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for environments where Clipboard API is unavailable
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!success) {
          throw new Error('execCommand copy failed');
        }
      }

      // Show success confirmation on the Copy button itself
      const originalLabel = this.copyBtn.textContent;
      this.copyBtn.textContent = '✓ Copied!';
      this.copyBtn.classList.add('btn-copy-success');
      setTimeout(() => {
        this.copyBtn.textContent = originalLabel;
        this.copyBtn.classList.remove('btn-copy-success');
      }, 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      this.showError('Failed to copy to clipboard. Please copy the text manually.');
    }
  }

  /**
   * Display an error message in the error section.
   *
   * @param {string} message
   */
  showError(message) {
    this.errorMessage.textContent = message;
    this.errorMessage.style.display = 'block';
  }

  /**
   * Hide the error message section.
   */
  clearError() {
    this.errorMessage.textContent = '';
    this.errorMessage.style.display = 'none';
  }

  /**
   * Show or hide the loading indicator, and disable/enable interactive controls.
   *
   * @param {boolean} isLoading
   */
  setLoading(isLoading) {
    this.loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    this.generateBtn.disabled = isLoading;
    this.copyBtn.disabled = isLoading;
  }
}

// Instantiate the app once the DOM is ready.
// The API base URL is injected by the CDK deployment; fall back to an empty
// string during local development so relative paths are used.
document.addEventListener('DOMContentLoaded', () => {
  const apiBaseUrl =
    typeof window.__API_BASE_URL__ !== 'undefined'
      ? window.__API_BASE_URL__
      : '';

  window.standupDrafter = new StandupDrafter(apiBaseUrl);

  // Requirement 5.1 – fetch history as soon as the page loads.
  window.standupDrafter.fetchHistory();
});
