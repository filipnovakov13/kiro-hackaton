/**
 * Unit tests for ChatAPI client
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ChatAPI } from "../src/services/chat-api";
import { ApiError } from "../src/services/api";
import type { ChatSession, SessionStats } from "../src/types/chat";

describe("ChatAPI", () => {
  let chatAPI: ChatAPI;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    chatAPI = new ChatAPI("http://localhost:8000");
    fetchMock = vi.fn();
    global.fetch = fetchMock as any;
  });

  describe("createSession", () => {
    it("should create session without document_id", async () => {
      const mockSession: ChatSession = {
        id: "session-123",
        document_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        message_count: 0,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session: mockSession }),
      });

      const result = await chatAPI.createSession();

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/chat/sessions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      expect(result).toEqual(mockSession);
    });

    it("should create session with document_id", async () => {
      const mockSession: ChatSession = {
        id: "session-123",
        document_id: "doc-456",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        message_count: 0,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session: mockSession }),
      });

      const result = await chatAPI.createSession("doc-456");

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/chat/sessions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document_id: "doc-456" }),
        },
      );
      expect(result).toEqual(mockSession);
    });

    it("should handle 404 error when document not found", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: "Not Found",
          message: "Document not found",
        }),
      });

      await expect(chatAPI.createSession("invalid-doc")).rejects.toThrow(
        ApiError,
      );
    });
  });

  describe("getSessions", () => {
    it("should fetch all sessions", async () => {
      const mockSessions: ChatSession[] = [
        {
          id: "session-1",
          document_id: "doc-1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          message_count: 5,
        },
        {
          id: "session-2",
          document_id: null,
          created_at: "2024-01-02T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          message_count: 3,
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: mockSessions }),
      });

      const result = await chatAPI.getSessions();

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/chat/sessions",
      );
      expect(result).toEqual(mockSessions);
    });

    it("should return empty array when no sessions exist", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: [] }),
      });

      const result = await chatAPI.getSessions();

      expect(result).toEqual([]);
    });
  });

  describe("getSession", () => {
    it("should fetch a specific session", async () => {
      const mockSession: ChatSession = {
        id: "session-123",
        document_id: "doc-456",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        message_count: 10,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      });

      const result = await chatAPI.getSession("session-123");

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/chat/sessions/session-123",
      );
      expect(result).toEqual(mockSession);
    });

    it("should handle 404 error when session not found", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: "Not Found",
          message: "Session not found",
        }),
      });

      await expect(chatAPI.getSession("invalid-session")).rejects.toThrow(
        ApiError,
      );
    });
  });

  describe("deleteSession", () => {
    it("should delete a session successfully", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await expect(
        chatAPI.deleteSession("session-123"),
      ).resolves.toBeUndefined();

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/chat/sessions/session-123",
        { method: "DELETE" },
      );
    });

    it("should handle 404 error when session not found", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: "Not Found",
          message: "Session not found",
        }),
      });

      await expect(chatAPI.deleteSession("invalid-session")).rejects.toThrow(
        ApiError,
      );
    });

    it("should handle network errors", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: "Internal Server Error",
          message: "Failed to delete session",
        }),
      });

      await expect(chatAPI.deleteSession("session-123")).rejects.toThrow(
        ApiError,
      );
    });
  });

  describe("getSessionStats", () => {
    it("should fetch session statistics", async () => {
      const mockStats: SessionStats = {
        message_count: 15,
        total_tokens: 5000,
        total_cost: 0.025,
        cache_hit_rate: 0.4,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const result = await chatAPI.getSessionStats("session-123");

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/chat/sessions/session-123/stats",
      );
      expect(result).toEqual(mockStats);
    });

    it("should handle 404 error when session not found", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: "Not Found",
          message: "Session not found",
        }),
      });

      await expect(chatAPI.getSessionStats("invalid-session")).rejects.toThrow(
        ApiError,
      );
    });
  });

  describe("getMessages", () => {
    it("should fetch messages with default pagination", async () => {
      const mockResponse = {
        messages: [
          {
            id: "msg-1",
            session_id: "session-123",
            role: "user" as const,
            content: "Hello",
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
        total: 1,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await chatAPI.getMessages("session-123");

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/chat/sessions/session-123/messages?limit=50&offset=0",
      );
      expect(result).toEqual(mockResponse);
    });

    it("should fetch messages with custom pagination", async () => {
      const mockResponse = {
        messages: [],
        total: 0,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await chatAPI.getMessages("session-123", 10, 20);

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/chat/sessions/session-123/messages?limit=10&offset=20",
      );
    });
  });

  describe("error handling", () => {
    it("should handle JSON parse errors", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      await expect(chatAPI.getSessions()).rejects.toThrow(ApiError);
    });

    it("should handle network failures", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      await expect(chatAPI.getSessions()).rejects.toThrow("Network error");
    });
  });
});
