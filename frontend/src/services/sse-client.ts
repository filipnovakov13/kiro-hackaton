/**
 * SSE (Server-Sent Events) client for streaming chat messages.
 * Handles connection, event parsing, and error recovery.
 */

import type { SSEEvent, Source, FocusContext } from "../types/chat";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ============================================================================
// SSE Client
// ============================================================================

export class SSEClient {
  private eventSource: EventSource | null = null;
  private baseURL: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000; // ms

  // Callbacks
  private onTokenCallback?: (token: string) => void;
  private onSourceCallback?: (source: Source) => void;
  private onDoneCallback?: (metadata?: {
    tokens: number;
    cost: number;
  }) => void;
  private onErrorCallback?: (error: string) => void;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Connect to SSE endpoint and start streaming
   */
  connect(
    sessionId: string,
    message: string,
    focusContext?: FocusContext,
  ): EventSource {
    const url = `${this.baseURL}/api/chat/sessions/${sessionId}/messages`;

    // Create request body
    const body = focusContext
      ? { message, focus_context: focusContext }
      : { message };

    // EventSource doesn't support POST, so we need to use fetch with SSE
    // We'll use a workaround: send POST request and handle SSE manually
    this.eventSource = this.createEventSource(url, body);

    this.setupEventListeners();

    return this.eventSource;
  }

  /**
   * Create EventSource with POST support (using fetch)
   */
  private createEventSource(
    url: string,
    body: Record<string, unknown>,
  ): EventSource {
    // For SSE with POST, we need to use fetch API
    // This is a simplified version - in production, consider using a library like eventsource-parser

    const eventSource = new EventSource(url);

    // Send the POST request separately
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
    }).catch((error) => {
      this.handleError(`Connection failed: ${error.message}`);
    });

    return eventSource;
  }

  /**
   * Setup event listeners for SSE events
   */
  private setupEventListeners(): void {
    if (!this.eventSource) return;

    // Token event
    this.eventSource.addEventListener("token", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (this.onTokenCallback) {
          this.onTokenCallback(data);
        }
      } catch (error) {
        console.error("Failed to parse token event:", error);
      }
    });

    // Source event
    this.eventSource.addEventListener("source", (event: MessageEvent) => {
      try {
        const source: Source = JSON.parse(event.data);
        if (this.onSourceCallback) {
          this.onSourceCallback(source);
        }
      } catch (error) {
        console.error("Failed to parse source event:", error);
      }
    });

    // Done event
    this.eventSource.addEventListener("done", (event: MessageEvent) => {
      try {
        const metadata = event.data ? JSON.parse(event.data) : undefined;
        if (this.onDoneCallback) {
          this.onDoneCallback(metadata);
        }
        this.close();
      } catch (error) {
        console.error("Failed to parse done event:", error);
      }
    });

    // Error event
    this.eventSource.addEventListener("error", (event: MessageEvent) => {
      try {
        const errorData = JSON.parse(event.data);
        this.handleError(errorData.message || "Unknown error");
      } catch (error) {
        // If we can't parse the error, it might be a connection error
        this.handleConnectionError();
      }
    });

    // Native error handler (connection errors)
    this.eventSource.onerror = () => {
      this.handleConnectionError();
    };
  }

  /**
   * Handle connection errors with reconnection logic
   */
  private handleConnectionError(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
      );

      setTimeout(() => {
        // Reconnection would need session and message context
        // For now, just notify the error callback
        this.handleError("Connection lost. Please try again.");
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      this.handleError("Connection failed after multiple attempts.");
      this.close();
    }
  }

  /**
   * Handle error events
   */
  private handleError(error: string): void {
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
    this.close();
  }

  /**
   * Register callback for token events
   */
  onToken(callback: (token: string) => void): void {
    this.onTokenCallback = callback;
  }

  /**
   * Register callback for source events
   */
  onSource(callback: (source: Source) => void): void {
    this.onSourceCallback = callback;
  }

  /**
   * Register callback for done events
   */
  onDone(
    callback: (metadata?: { tokens: number; cost: number }) => void,
  ): void {
    this.onDoneCallback = callback;
  }

  /**
   * Register callback for error events
   */
  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Close the SSE connection
   */
  close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.reconnectAttempts = 0;
  }

  /**
   * Check if connection is active
   */
  isConnected(): boolean {
    return (
      this.eventSource !== null &&
      this.eventSource.readyState === EventSource.OPEN
    );
  }
}
