/**
 * Test to understand the upload -> session creation flow
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChatSession } from "../src/hooks/useChatSession";
import { chatAPI } from "../src/services/chat-api";

vi.mock("../src/services/chat-api");

describe("Upload Session Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set session immediately after createSession completes", async () => {
    const mockSession = {
      id: "new-session-id",
      document_id: "doc-123",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
    };

    vi.mocked(chatAPI.createSession).mockResolvedValue(mockSession);
    vi.mocked(chatAPI.getSessions).mockResolvedValue([]);

    const { result } = renderHook(() => useChatSession());

    // Initially no session
    expect(result.current.session).toBeNull();
    expect(result.current.sessions).toEqual([]);

    // Create session
    await act(async () => {
      await result.current.createSession("doc-123");
    });

    // After createSession completes, session should be set
    console.log("After createSession - session:", result.current.session);
    console.log("After createSession - sessions:", result.current.sessions);

    expect(result.current.session).toEqual(mockSession);
    expect(result.current.sessions).toContainEqual(mockSession);
    expect(result.current.loading).toBe(false);
  });

  it("should update sessions array when creating new session", async () => {
    const existingSessions = [
      {
        id: "session-1",
        document_id: "doc-1",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
        message_count: 0,
      },
      {
        id: "session-2",
        document_id: "doc-2",
        created_at: "2024-01-02",
        updated_at: "2024-01-02",
        message_count: 0,
      },
    ];

    const newSession = {
      id: "new-session",
      document_id: "doc-new",
      created_at: "2024-01-03",
      updated_at: "2024-01-03",
      message_count: 0,
    };

    vi.mocked(chatAPI.getSessions).mockResolvedValue(existingSessions);
    vi.mocked(chatAPI.createSession).mockResolvedValue(newSession);

    const { result } = renderHook(() => useChatSession());

    // Load existing sessions
    await act(async () => {
      await result.current.loadSessions();
    });

    expect(result.current.sessions).toHaveLength(2);

    // Create new session
    await act(async () => {
      await result.current.createSession("doc-new");
    });

    // New session should be at the front
    console.log("Sessions after create:", result.current.sessions);
    expect(result.current.sessions).toHaveLength(3);
    expect(result.current.sessions[0]).toEqual(newSession);
    expect(result.current.session).toEqual(newSession);
  });
});
