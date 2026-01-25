/**
 * React hook for managing SSE streaming messages.
 * Handles connection, token accumulation, and event processing.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { SSEClient } from "../services/sse-client";
import type { Source, FocusContext } from "../types/chat";

interface UseStreamingMessageReturn {
  message: string;
  sources: Source[];
  isStreaming: boolean;
  error: string | null;
  metadata: { tokens: number; cost: number } | null;
  sendMessage: (text: string, focusContext?: FocusContext) => Promise<void>;
  stopStreaming: () => void;
  clearMessage: () => void;
  clearError: () => void;
}

/**
 * Hook for managing streaming messages via SSE
 */
export function useStreamingMessage(
  sessionId: string,
): UseStreamingMessageReturn {
  const [message, setMessage] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{
    tokens: number;
    cost: number;
  } | null>(null);

  const sseClientRef = useRef<SSEClient | null>(null);

  /**
   * Cleanup SSE connection on unmount
   */
  useEffect(() => {
    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.close();
      }
    };
  }, []);

  /**
   * Send a message and start streaming response
   */
  const sendMessage = useCallback(
    async (text: string, focusContext?: FocusContext) => {
      if (!sessionId) {
        setError("No session ID provided");
        return;
      }

      if (isStreaming) {
        setError("Already streaming a message");
        return;
      }

      // Reset state
      setMessage("");
      setSources([]);
      setError(null);
      setMetadata(null);
      setIsStreaming(true);

      try {
        // Create new SSE client
        const client = new SSEClient();
        sseClientRef.current = client;

        // Setup event handlers
        client.onToken((token: string) => {
          setMessage((prev) => prev + token);
        });

        client.onSource((source: Source) => {
          setSources((prev) => [...prev, source]);
        });

        client.onDone((meta) => {
          setIsStreaming(false);
          if (meta) {
            setMetadata(meta);
          }
          sseClientRef.current = null;
        });

        client.onError((errorMessage: string) => {
          setError(errorMessage);
          setIsStreaming(false);
          sseClientRef.current = null;
        });

        // Connect and start streaming
        client.connect(sessionId, text, focusContext);
      } catch (err: any) {
        setError(err.message || "Failed to send message");
        setIsStreaming(false);
        sseClientRef.current = null;
      }
    },
    [sessionId, isStreaming],
  );

  /**
   * Stop the current streaming connection
   */
  const stopStreaming = useCallback(() => {
    if (sseClientRef.current) {
      sseClientRef.current.close();
      sseClientRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  /**
   * Clear the current message and sources
   */
  const clearMessage = useCallback(() => {
    setMessage("");
    setSources([]);
    setMetadata(null);
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    message,
    sources,
    isStreaming,
    error,
    metadata,
    sendMessage,
    stopStreaming,
    clearMessage,
    clearError,
  };
}
