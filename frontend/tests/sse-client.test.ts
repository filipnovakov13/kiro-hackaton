/**
 * Unit tests for SSEClient
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SSEClient } from "../src/services/sse-client";
import type { Source } from "../src/types/chat";

// Mock EventSource
class MockEventSource {
  url: string;
  readyState: number = 1; // OPEN
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  private listeners: Map<string, ((event: MessageEvent) => void)[]> = new Map();

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(
    type: string,
    listener: (event: MessageEvent) => void,
  ): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(
    type: string,
    listener: (event: MessageEvent) => void,
  ): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  dispatchEvent(event: MessageEvent): boolean {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }
    return true;
  }

  close(): void {
    this.readyState = MockEventSource.CLOSED;
  }

  // Helper method to simulate events
  simulateEvent(type: string, data: string): void {
    const event = new MessageEvent(type, { data });
    this.dispatchEvent(event);
  }
}

describe("SSEClient", () => {
  let sseClient: SSEClient;
  let mockEventSource: MockEventSource;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sseClient = new SSEClient("http://localhost:8000");

    // Mock EventSource
    mockEventSource = new MockEventSource("");
    global.EventSource = vi.fn(() => mockEventSource) as any;

    // Ensure static constants are available
    (global.EventSource as any).CONNECTING = 0;
    (global.EventSource as any).OPEN = 1;
    (global.EventSource as any).CLOSED = 2;

    // Mock fetch
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    sseClient.close();
    vi.clearAllMocks();
  });

  describe("connect", () => {
    it("should create EventSource connection", () => {
      const sessionId = "session-123";
      const message = "Hello";

      sseClient.connect(sessionId, message);

      expect(global.EventSource).toHaveBeenCalledWith(
        "http://localhost:8000/api/chat/sessions/session-123/messages",
      );
    });

    it("should send POST request with message", () => {
      const sessionId = "session-123";
      const message = "Hello";

      sseClient.connect(sessionId, message);

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/chat/sessions/session-123/messages",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ message }),
        }),
      );
    });

    it("should include focus_context when provided", () => {
      const sessionId = "session-123";
      const message = "Hello";
      const focusContext = {
        start_char: 0,
        end_char: 100,
        context_text: "Some context",
      };

      sseClient.connect(sessionId, message, focusContext);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ message, focus_context: focusContext }),
        }),
      );
    });
  });

  describe("event handling", () => {
    it("should handle token events", async () => {
      const tokenPromise = new Promise<string>((resolve) => {
        sseClient.onToken((token) => resolve(token));
      });

      sseClient.connect("session-123", "test");
      mockEventSource.simulateEvent("token", '"Hello"');

      const token = await tokenPromise;
      expect(token).toBe("Hello");
    });

    it("should handle source events", async () => {
      const mockSource: Source = {
        chunk_id: "chunk-1",
        document_id: "doc-1",
        similarity: 0.95,
        text: "Source text",
      };

      const sourcePromise = new Promise<Source>((resolve) => {
        sseClient.onSource((source) => resolve(source));
      });

      sseClient.connect("session-123", "test");
      mockEventSource.simulateEvent("source", JSON.stringify(mockSource));

      const source = await sourcePromise;
      expect(source).toEqual(mockSource);
    });

    it("should handle done events without metadata", async () => {
      const donePromise = new Promise<any>((resolve) => {
        sseClient.onDone((metadata) => resolve(metadata));
      });

      sseClient.connect("session-123", "test");
      mockEventSource.simulateEvent("done", "");

      const metadata = await donePromise;
      expect(metadata).toBeUndefined();
    });

    it("should handle done events with metadata", async () => {
      const expectedMetadata = { tokens: 100, cost: 0.001 };

      const donePromise = new Promise<any>((resolve) => {
        sseClient.onDone((meta) => resolve(meta));
      });

      sseClient.connect("session-123", "test");
      mockEventSource.simulateEvent("done", JSON.stringify(expectedMetadata));

      const metadata = await donePromise;
      expect(metadata).toEqual(expectedMetadata);
    });

    it("should handle error events", async () => {
      const errorPromise = new Promise<string>((resolve) => {
        sseClient.onError((error) => resolve(error));
      });

      sseClient.connect("session-123", "test");
      mockEventSource.simulateEvent(
        "error",
        JSON.stringify({ message: "Test error" }),
      );

      const error = await errorPromise;
      expect(error).toBe("Test error");
    });

    it("should handle multiple token events", () => {
      const tokens: string[] = [];

      sseClient.onToken((token) => {
        tokens.push(token);
      });

      sseClient.connect("session-123", "test");
      mockEventSource.simulateEvent("token", '"Hello"');
      mockEventSource.simulateEvent("token", '" "');
      mockEventSource.simulateEvent("token", '"World"');

      expect(tokens).toEqual(["Hello", " ", "World"]);
    });
  });

  describe("connection management", () => {
    it("should close connection", () => {
      sseClient.connect("session-123", "test");
      expect(sseClient.isConnected()).toBe(true);

      sseClient.close();
      expect(mockEventSource.readyState).toBe(MockEventSource.CLOSED);
      expect(sseClient.isConnected()).toBe(false);
    });

    it("should close connection after done event", async () => {
      const donePromise = new Promise<void>((resolve) => {
        sseClient.onDone(() => {
          setTimeout(() => {
            expect(sseClient.isConnected()).toBe(false);
            resolve();
          }, 10);
        });
      });

      sseClient.connect("session-123", "test");
      mockEventSource.simulateEvent("done", "");

      await donePromise;
    });

    it("should close connection after error event", async () => {
      const errorPromise = new Promise<void>((resolve) => {
        sseClient.onError(() => {
          setTimeout(() => {
            expect(sseClient.isConnected()).toBe(false);
            resolve();
          }, 10);
        });
      });

      sseClient.connect("session-123", "test");
      mockEventSource.simulateEvent(
        "error",
        JSON.stringify({ message: "Error" }),
      );

      await errorPromise;
    });

    it("should check connection status", () => {
      expect(sseClient.isConnected()).toBe(false);

      sseClient.connect("session-123", "test");
      expect(sseClient.isConnected()).toBe(true);

      sseClient.close();
      expect(sseClient.isConnected()).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should handle JSON parse errors gracefully", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      sseClient.onToken(() => {
        // Should not be called
        throw new Error("Should not reach here");
      });

      sseClient.connect("session-123", "test");
      mockEventSource.simulateEvent("token", "invalid json");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to parse token event:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it("should handle connection errors", async () => {
      const errorPromise = new Promise<string>((resolve) => {
        sseClient.onError((error) => resolve(error));
      });

      sseClient.connect("session-123", "test");

      // Simulate connection error
      if (mockEventSource.onerror) {
        mockEventSource.onerror(new Event("error"));
      }

      const error = await errorPromise;
      expect(error).toContain("Connection");
    });

    it("should handle fetch errors", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const errorPromise = new Promise<string>((resolve) => {
        sseClient.onError((error) => resolve(error));
      });

      sseClient.connect("session-123", "test");

      // Wait for async error handling
      await new Promise((resolve) => setTimeout(resolve, 10));

      const error = await errorPromise;
      expect(error).toContain("Connection failed");
    });
  });

  describe("callback registration", () => {
    it("should allow registering callbacks before connecting", async () => {
      const tokenPromise = new Promise<string>((resolve) => {
        sseClient.onToken((token) => resolve(token));
      });

      sseClient.connect("session-123", "message");
      mockEventSource.simulateEvent("token", '"test"');

      const token = await tokenPromise;
      expect(token).toBe("test");
    });

    it("should allow registering multiple callbacks", () => {
      const tokens: string[] = [];
      const sources: Source[] = [];

      sseClient.onToken((token) => tokens.push(token));
      sseClient.onSource((source) => sources.push(source));

      sseClient.connect("session-123", "test");

      mockEventSource.simulateEvent("token", '"Hello"');
      mockEventSource.simulateEvent(
        "source",
        JSON.stringify({
          chunk_id: "chunk-1",
          document_id: "doc-1",
          similarity: 0.9,
          text: "text",
        }),
      );

      expect(tokens).toHaveLength(1);
      expect(sources).toHaveLength(1);
    });
  });
});
