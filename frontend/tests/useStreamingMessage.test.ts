/**
 * Unit tests for useStreamingMessage hook
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStreamingMessage } from "../src/hooks/useStreamingMessage";
import { SSEClient } from "../src/services/sse-client";
import type { Source } from "../src/types/chat";

// Mock SSEClient
vi.mock("../src/services/sse-client", () => {
  return {
    SSEClient: vi.fn(),
  };
});

describe("useStreamingMessage", () => {
  let mockSSEClient: {
    connect: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    onToken: ReturnType<typeof vi.fn>;
    onSource: ReturnType<typeof vi.fn>;
    onDone: ReturnType<typeof vi.fn>;
    onError: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockSSEClient = {
      connect: vi.fn(),
      close: vi.fn(),
      onToken: vi.fn(),
      onSource: vi.fn(),
      onDone: vi.fn(),
      onError: vi.fn(),
    };

    vi.mocked(SSEClient).mockImplementation(() => mockSSEClient as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have empty message initially", () => {
      const { result } = renderHook(() => useStreamingMessage("session-123"));

      expect(result.current.message).toBe("");
      expect(result.current.sources).toEqual([]);
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.metadata).toBeNull();
    });
  });

  describe("sendMessage", () => {
    it("should start streaming and setup SSE client", async () => {
      const { result } = renderHook(() => useStreamingMessage("session-123"));

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      expect(SSEClient).toHaveBeenCalled();
      expect(mockSSEClient.onToken).toHaveBeenCalled();
      expect(mockSSEClient.onSource).toHaveBeenCalled();
      expect(mockSSEClient.onDone).toHaveBeenCalled();
      expect(mockSSEClient.onError).toHaveBeenCalled();
      expect(mockSSEClient.connect).toHaveBeenCalledWith(
        "session-123",
        "Hello",
        undefined,
      );
      expect(result.current.isStreaming).toBe(true);
    });

    it("should include focus context when provided", async () => {
      const { result } = renderHook(() => useStreamingMessage("session-123"));
      const focusContext = {
        start_char: 0,
        end_char: 100,
        context_text: "Some context",
      };

      await act(async () => {
        await result.current.sendMessage("Hello", focusContext);
      });

      expect(mockSSEClient.connect).toHaveBeenCalledWith(
        "session-123",
        "Hello",
        focusContext,
      );
    });

    it("should accumulate tokens", async () => {
      const { result } = renderHook(() => useStreamingMessage("session-123"));

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      // Get the onToken callback
      const onTokenCallback = mockSSEClient.onToken.mock.calls[0][0];

      // Simulate token events
      act(() => {
        onTokenCallback("Hello");
      });

      expect(result.current.message).toBe("Hello");

      act(() => {
        onTokenCallback(" ");
      });

      expect(result.current.message).toBe("Hello ");

      act(() => {
        onTokenCallback("World");
      });

      expect(result.current.message).toBe("Hello World");
    });

    it("should collect sources", async () => {
      const { result } = renderHook(() => useStreamingMessage("session-123"));

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      const onSourceCallback = mockSSEClient.onSource.mock.calls[0][0];

      const source1: Source = {
        chunk_id: "chunk-1",
        document_id: "doc-1",
        similarity: 0.95,
        text: "Source 1",
      };

      const source2: Source = {
        chunk_id: "chunk-2",
        document_id: "doc-1",
        similarity: 0.85,
        text: "Source 2",
      };

      act(() => {
        onSourceCallback(source1);
      });

      expect(result.current.sources).toEqual([source1]);

      act(() => {
        onSourceCallback(source2);
      });

      expect(result.current.sources).toEqual([source1, source2]);
    });

    it("should handle done event", async () => {
      const { result } = renderHook(() => useStreamingMessage("session-123"));

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      const onDoneCallback = mockSSEClient.onDone.mock.calls[0][0];

      act(() => {
        onDoneCallback({ tokens: 100, cost: 0.001 });
      });

      expect(result.current.isStreaming).toBe(false);
      expect(result.current.metadata).toEqual({ tokens: 100, cost: 0.001 });
    });

    it("should handle done event without metadata", async () => {
      const { result } = renderHook(() => useStreamingMessage("session-123"));

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      const onDoneCallback = mockSSEClient.onDone.mock.calls[0][0];

      act(() => {
        onDoneCallback(undefined);
      });

      expect(result.current.isStreaming).toBe(false);
      expect(result.current.metadata).toBeNull();
    });

    it("should handle error event", async () => {
      const { result } = renderHook(() => useStreamingMessage("session-123"));

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      const onErrorCallback = mockSSEClient.onError.mock.calls[0][0];

      act(() => {
        onErrorCallback("Connection failed");
      });

      expect(result.current.error).toBe("Connection failed");
      expect(result.current.isStreaming).toBe(false);
    });

    it("should prevent sending while already streaming", async () => {
      const { result } = renderHook(() => useStreamingMessage("session-123"));

      await act(async () => {
        await result.current.sendMessage("First message");
      });

      expect(result.current.isStreaming).toBe(true);

      await act(async () => {
        await result.current.sendMessage("Second message");
      });

      // Should only have been called once
      expect(SSEClient).toHaveBeenCalledTimes(1);
      expect(result.current.error).toBe("Already streaming a message");
    });

    it("should handle missing session ID", async () => {
      const { result } = renderHook(() => useStreamingMessage(""));

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      expect(result.current.error).toBe("No session ID provided");
      expect(SSEClient).not.toHaveBeenCalled();
    });

    it("should reset state when sending new message", async () => {
      const { result } = renderHook(() => useStreamingMessage("session-123"));

      // First message
      await act(async () => {
        await result.current.sendMessage("First");
      });

      const onTokenCallback = mockSSEClient.onToken.mock.calls[0][0];
      const onDoneCallback = mockSSEClient.onDone.mock.calls[0][0];

      act(() => {
        onTokenCallback("Hello");
      });

      act(() => {
        onDoneCallback({ tokens: 50, cost: 0.0005 });
      });

      expect(result.current.message).toBe("Hello");
      expect(result.current.metadata).toEqual({ tokens: 50, cost: 0.0005 });

      // Second message - should reset
      await act(async () => {
        await result.current.sendMessage("Second");
      });

      expect(result.current.message).toBe("");
      expect(result.current.sources).toEqual([]);
      expect(result.current.metadata).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe("stopStreaming", () => {
    it("should close SSE connection", async () => {
      const { result } = renderHook(() => useStreamingMessage("session-123"));

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      expect(result.current.isStreaming).toBe(true);

      act(() => {
        result.current.stopStreaming();
      });

      expect(mockSSEClient.close).toHaveBeenCalled();
      expect(result.current.isStreaming).toBe(false);
    });

    it("should handle stop when not streaming", () => {
      const { result } = renderHook(() => useStreamingMessage("session-123"));

      act(() => {
        result.current.stopStreaming();
      });

      // Should not throw error
      expect(result.current.isStreaming).toBe(false);
    });
  });

  describe("clearMessage", () => {
    it("should clear message and sources", async () => {
      const { result } = renderHook(() => useStreamingMessage("session-123"));

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      const onTokenCallback = mockSSEClient.onToken.mock.calls[0][0];
      const onSourceCallback = mockSSEClient.onSource.mock.calls[0][0];

      act(() => {
        onTokenCallback("Hello World");
        onSourceCallback({
          chunk_id: "chunk-1",
          document_id: "doc-1",
          similarity: 0.9,
          text: "Source",
        });
      });

      expect(result.current.message).toBe("Hello World");
      expect(result.current.sources).toHaveLength(1);

      act(() => {
        result.current.clearMessage();
      });

      expect(result.current.message).toBe("");
      expect(result.current.sources).toEqual([]);
      expect(result.current.metadata).toBeNull();
    });
  });

  describe("clearError", () => {
    it("should clear error state", async () => {
      const { result } = renderHook(() => useStreamingMessage("session-123"));

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      const onErrorCallback = mockSSEClient.onError.mock.calls[0][0];

      act(() => {
        onErrorCallback("Test error");
      });

      expect(result.current.error).toBe("Test error");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("cleanup", () => {
    it("should close connection on unmount", async () => {
      const { result, unmount } = renderHook(() =>
        useStreamingMessage("session-123"),
      );

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      unmount();

      expect(mockSSEClient.close).toHaveBeenCalled();
    });
  });

  describe("full streaming flow", () => {
    it("should handle complete streaming lifecycle", async () => {
      const { result } = renderHook(() => useStreamingMessage("session-123"));

      // Start streaming
      await act(async () => {
        await result.current.sendMessage("What is AI?");
      });

      expect(result.current.isStreaming).toBe(true);

      // Get callbacks
      const onTokenCallback = mockSSEClient.onToken.mock.calls[0][0];
      const onSourceCallback = mockSSEClient.onSource.mock.calls[0][0];
      const onDoneCallback = mockSSEClient.onDone.mock.calls[0][0];

      // Simulate streaming tokens
      act(() => {
        onTokenCallback("AI");
        onTokenCallback(" is");
        onTokenCallback(" artificial");
        onTokenCallback(" intelligence");
      });

      expect(result.current.message).toBe("AI is artificial intelligence");

      // Simulate sources
      act(() => {
        onSourceCallback({
          chunk_id: "chunk-1",
          document_id: "doc-1",
          similarity: 0.95,
          text: "AI definition",
        });
      });

      expect(result.current.sources).toHaveLength(1);

      // Simulate completion
      act(() => {
        onDoneCallback({ tokens: 150, cost: 0.0015 });
      });

      expect(result.current.isStreaming).toBe(false);
      expect(result.current.metadata).toEqual({ tokens: 150, cost: 0.0015 });
      expect(result.current.error).toBeNull();
    });
  });
});
