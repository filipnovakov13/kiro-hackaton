/**
 * Unit tests for useChatSession hook
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChatSession } from "../src/hooks/useChatSession";
import { chatAPI } from "../src/services/chat-api";
import type { ChatSession, SessionStats } from "../src/types/chat";

// Mock the chat API
vi.mock("../src/services/chat-api", () => ({
  chatAPI: {
    createSession: vi.fn(),
    getSessions: vi.fn(),
    getSession: vi.fn(),
    deleteSession: vi.fn(),
    getSessionStats: vi.fn(),
  },
}));

describe("useChatSession", () => {
  const mockSession: ChatSession = {
    id: "session-123",
    document_id: "doc-456",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    message_count: 5,
  };

  const mockStats: SessionStats = {
    message_count: 5,
    total_tokens: 1000,
    total_cost: 0.01,
    cache_hit_rate: 0.2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have null session initially", () => {
      const { result } = renderHook(() => useChatSession());

      expect(result.current.session).toBeNull();
      expect(result.current.sessions).toEqual([]);
      expect(result.current.stats).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("createSession", () => {
    it("should create session without document_id", async () => {
      vi.mocked(chatAPI.createSession).mockResolvedValueOnce(mockSession);

      const { result } = renderHook(() => useChatSession());

      await act(async () => {
        await result.current.createSession();
      });

      expect(chatAPI.createSession).toHaveBeenCalledWith(undefined);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should create session with document_id", async () => {
      vi.mocked(chatAPI.createSession).mockResolvedValueOnce(mockSession);

      const { result } = renderHook(() => useChatSession());

      await act(async () => {
        await result.current.createSession("doc-456");
      });

      expect(chatAPI.createSession).toHaveBeenCalledWith("doc-456");
      expect(result.current.session).toEqual(mockSession);
    });

    it("should set loading state during creation", async () => {
      vi.mocked(chatAPI.createSession).mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockSession), 100)),
      );

      const { result } = renderHook(() => useChatSession());

      act(() => {
        result.current.createSession();
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it("should handle creation errors", async () => {
      const error = new Error("Creation failed");
      vi.mocked(chatAPI.createSession).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useChatSession());

      await act(async () => {
        try {
          await result.current.createSession();
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Creation failed");
      expect(result.current.session).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  describe("loadSessions", () => {
    it("should load all sessions", async () => {
      const mockSessions = [mockSession, { ...mockSession, id: "session-456" }];
      vi.mocked(chatAPI.getSessions).mockResolvedValueOnce(mockSessions);

      const { result } = renderHook(() => useChatSession());

      await act(async () => {
        await result.current.loadSessions();
      });

      expect(chatAPI.getSessions).toHaveBeenCalled();
      expect(result.current.sessions).toEqual(mockSessions);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle empty sessions list", async () => {
      vi.mocked(chatAPI.getSessions).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useChatSession());

      await act(async () => {
        await result.current.loadSessions();
      });

      expect(result.current.sessions).toEqual([]);
    });

    it("should handle load sessions errors", async () => {
      const error = new Error("Load failed");
      vi.mocked(chatAPI.getSessions).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useChatSession());

      await act(async () => {
        try {
          await result.current.loadSessions();
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Load failed");
      expect(result.current.loading).toBe(false);
    });
  });

  describe("loadSession", () => {
    it("should load a specific session", async () => {
      vi.mocked(chatAPI.getSession).mockResolvedValueOnce(mockSession);

      const { result } = renderHook(() => useChatSession());

      await act(async () => {
        await result.current.loadSession("session-123");
      });

      expect(chatAPI.getSession).toHaveBeenCalledWith("session-123");
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle load session errors", async () => {
      const error = new Error("Session not found");
      vi.mocked(chatAPI.getSession).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useChatSession());

      await act(async () => {
        try {
          await result.current.loadSession("invalid-id");
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Session not found");
      expect(result.current.session).toBeNull();
    });
  });

  describe("deleteSession", () => {
    it("should delete current session", async () => {
      vi.mocked(chatAPI.createSession).mockResolvedValueOnce(mockSession);
      vi.mocked(chatAPI.deleteSession).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useChatSession());

      // First create a session
      await act(async () => {
        await result.current.createSession();
      });

      expect(result.current.session).toEqual(mockSession);

      // Then delete it
      await act(async () => {
        await result.current.deleteSession();
      });

      expect(chatAPI.deleteSession).toHaveBeenCalledWith("session-123");
      expect(result.current.session).toBeNull();
      expect(result.current.stats).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle delete when no session exists", async () => {
      const { result } = renderHook(() => useChatSession());

      await act(async () => {
        await result.current.deleteSession();
      });

      expect(chatAPI.deleteSession).not.toHaveBeenCalled();
      expect(result.current.error).toBe("No session to delete");
    });

    it("should handle delete errors", async () => {
      vi.mocked(chatAPI.createSession).mockResolvedValueOnce(mockSession);
      vi.mocked(chatAPI.deleteSession).mockRejectedValueOnce(
        new Error("Delete failed"),
      );

      const { result } = renderHook(() => useChatSession());

      await act(async () => {
        await result.current.createSession();
      });

      await act(async () => {
        try {
          await result.current.deleteSession();
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Delete failed");
      expect(result.current.session).toEqual(mockSession); // Session still exists
    });
  });

  describe("fetchStats", () => {
    it("should fetch session statistics", async () => {
      vi.mocked(chatAPI.createSession).mockResolvedValueOnce(mockSession);
      vi.mocked(chatAPI.getSessionStats).mockResolvedValueOnce(mockStats);

      const { result } = renderHook(() => useChatSession());

      // First create a session
      await act(async () => {
        await result.current.createSession();
      });

      // Then fetch stats
      await act(async () => {
        await result.current.fetchStats();
      });

      expect(chatAPI.getSessionStats).toHaveBeenCalledWith("session-123");
      expect(result.current.stats).toEqual(mockStats);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle fetch stats when no session exists", async () => {
      const { result } = renderHook(() => useChatSession());

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(chatAPI.getSessionStats).not.toHaveBeenCalled();
      expect(result.current.error).toBe("No session selected");
    });

    it("should handle fetch stats errors", async () => {
      vi.mocked(chatAPI.createSession).mockResolvedValueOnce(mockSession);
      vi.mocked(chatAPI.getSessionStats).mockRejectedValueOnce(
        new Error("Stats failed"),
      );

      const { result } = renderHook(() => useChatSession());

      await act(async () => {
        await result.current.createSession();
      });

      await act(async () => {
        try {
          await result.current.fetchStats();
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Stats failed");
      expect(result.current.stats).toBeNull();
    });
  });

  describe("clearError", () => {
    it("should clear error state", async () => {
      vi.mocked(chatAPI.createSession).mockRejectedValueOnce(
        new Error("Test error"),
      );

      const { result } = renderHook(() => useChatSession());

      await act(async () => {
        try {
          await result.current.createSession();
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Test error");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("multiple operations", () => {
    it("should handle sequential operations", async () => {
      vi.mocked(chatAPI.createSession).mockResolvedValueOnce(mockSession);
      vi.mocked(chatAPI.getSessionStats).mockResolvedValueOnce(mockStats);
      vi.mocked(chatAPI.deleteSession).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useChatSession());

      // Create session
      await act(async () => {
        await result.current.createSession("doc-456");
      });
      expect(result.current.session).toEqual(mockSession);

      // Fetch stats
      await act(async () => {
        await result.current.fetchStats();
      });
      expect(result.current.stats).toEqual(mockStats);

      // Delete session
      await act(async () => {
        await result.current.deleteSession();
      });
      expect(result.current.session).toBeNull();
      expect(result.current.stats).toBeNull();
    });
  });
});
