import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import App from "../src/App";
import * as useChatSessionModule from "../src/hooks/useChatSession";
import * as useStreamingMessageModule from "../src/hooks/useStreamingMessage";
import * as useDocumentUploadModule from "../src/hooks/useDocumentUpload";
import * as useFocusCaretModule from "../src/hooks/useFocusCaret";
import type { ChatSession } from "../src/types/chat";

// Mock all hooks
vi.mock("../src/hooks/useChatSession");
vi.mock("../src/hooks/useStreamingMessage");
vi.mock("../src/hooks/useDocumentUpload");
vi.mock("../src/hooks/useFocusCaret");
vi.mock("../src/services/api");
vi.mock("../src/services/chat-api");

describe("App - Session Sorting", () => {
  const mockLoadSession = vi.fn();
  const mockLoadSessions = vi.fn();
  const mockCreateSession = vi.fn();
  const mockDeleteSession = vi.fn();
  const mockClearError = vi.fn();
  const mockFetchStats = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useFocusCaret
    vi.spyOn(useFocusCaretModule, "useFocusCaret").mockReturnValue({
      position: null,
      context: "",
      focusContext: null,
      placeCaret: vi.fn(),
      moveCaretLeft: vi.fn(),
      moveCaretRight: vi.fn(),
      clearCaret: vi.fn(),
    });

    // Mock useStreamingMessage
    vi.spyOn(useStreamingMessageModule, "useStreamingMessage").mockReturnValue({
      message: "",
      isStreaming: false,
      sources: [],
      error: null,
      metadata: null,
      sendMessage: vi.fn(),
      stopStreaming: vi.fn(),
      clearMessage: vi.fn(),
      clearError: vi.fn(),
    });

    // Mock useDocumentUpload
    vi.spyOn(useDocumentUploadModule, "useDocumentUpload").mockReturnValue({
      isUploading: false,
      taskId: null,
      status: null,
      progress: null,
      error: null,
      documentId: null,
      uploadFile: vi.fn(),
      submitUrl: vi.fn(),
      reset: vi.fn(),
    });
  });

  it("should load the most recent session based on updated_at DESC", async () => {
    // **Validates: Requirements 7.1.1**
    // Create sessions with random timestamps
    const now = Date.now();
    const sessions: ChatSession[] = [
      {
        id: "session-1",
        document_id: "doc-1",
        created_at: new Date(now - 10000).toISOString(),
        updated_at: new Date(now - 5000).toISOString(), // Older
        message_count: 5,
      },
      {
        id: "session-2",
        document_id: "doc-2",
        created_at: new Date(now - 8000).toISOString(),
        updated_at: new Date(now - 1000).toISOString(), // Most recent
        message_count: 3,
      },
      {
        id: "session-3",
        document_id: "doc-3",
        created_at: new Date(now - 12000).toISOString(),
        updated_at: new Date(now - 8000).toISOString(), // Oldest
        message_count: 10,
      },
    ];

    // Mock useChatSession to return unsorted sessions
    vi.spyOn(useChatSessionModule, "useChatSession").mockReturnValue({
      session: null,
      sessions: sessions, // Intentionally unsorted
      stats: null,
      loading: false,
      error: null,
      loadSessions: mockLoadSessions,
      loadSession: mockLoadSession,
      createSession: mockCreateSession,
      deleteSession: mockDeleteSession,
      fetchStats: mockFetchStats,
      clearError: mockClearError,
    });

    render(<App />);

    // Wait for the auto-load effect to trigger
    await waitFor(() => {
      expect(mockLoadSession).toHaveBeenCalledWith("session-2");
    });

    // Verify it loaded the most recent session (session-2), not the first in array (session-1)
    expect(mockLoadSession).toHaveBeenCalledTimes(1);
  });

  it("should handle sessions with timestamps 1ms apart", async () => {
    // **Validates: Requirements 7.1.1**
    // Reproduce the counterexample from Task 62
    const baseTime = Date.now();
    const sessions: ChatSession[] = [
      {
        id: "older-session",
        document_id: "doc-1",
        created_at: new Date(baseTime).toISOString(),
        updated_at: new Date(baseTime).toISOString(), // Older by 1ms
        message_count: 2,
      },
      {
        id: "newer-session",
        document_id: "doc-2",
        created_at: new Date(baseTime + 1).toISOString(),
        updated_at: new Date(baseTime + 1).toISOString(), // Newer by 1ms
        message_count: 1,
      },
    ];

    vi.spyOn(useChatSessionModule, "useChatSession").mockReturnValue({
      session: null,
      sessions: sessions,
      stats: null,
      loading: false,
      error: null,
      loadSessions: mockLoadSessions,
      loadSession: mockLoadSession,
      createSession: mockCreateSession,
      deleteSession: mockDeleteSession,
      fetchStats: mockFetchStats,
      clearError: mockClearError,
    });

    render(<App />);

    await waitFor(() => {
      expect(mockLoadSession).toHaveBeenCalledWith("newer-session");
    });

    expect(mockLoadSession).toHaveBeenCalledTimes(1);
  });
});
