/**
 * Integration tests for App component
 * Tests session loading on mount and auto-load behavior
 *
 * Requirements: 1.1, 1.7
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../src/App";
import * as useChatSessionModule from "../src/hooks/useChatSession";
import * as useStreamingMessageModule from "../src/hooks/useStreamingMessage";
import * as useFocusCaretModule from "../src/hooks/useFocusCaret";
import * as useDocumentUploadModule from "../src/hooks/useDocumentUpload";
import type { ChatSession } from "../src/types/chat";

// Mock all hooks
vi.mock("../src/hooks/useChatSession");
vi.mock("../src/hooks/useStreamingMessage");
vi.mock("../src/hooks/useFocusCaret");
vi.mock("../src/hooks/useDocumentUpload");

// Mock API services
vi.mock("../src/services/api", () => ({
  getDocument: vi.fn().mockResolvedValue({
    id: "doc-1",
    original_name: "test.pdf",
    markdown_content: "# Test Document",
    file_type: "pdf",
    chunk_count: 5,
  }),
}));

vi.mock("../src/services/chat-api", () => ({
  chatAPI: {
    getMessages: vi.fn().mockResolvedValue({ messages: [] }),
  },
}));

describe("App - Session Loading on Mount", () => {
  const mockLoadSessions = vi.fn();
  const mockLoadSession = vi.fn();
  const mockCreateSession = vi.fn();
  const mockDeleteSession = vi.fn();

  const mockSession1: ChatSession = {
    id: "session-1",
    document_id: "doc-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z", // Most recent
    message_count: 5,
  };

  const mockSession2: ChatSession = {
    id: "session-2",
    document_id: "doc-2",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T12:00:00Z", // Older
    message_count: 3,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(useChatSessionModule.useChatSession).mockReturnValue({
      session: null,
      sessions: [],
      stats: null,
      loading: false,
      error: null,
      loadSessions: mockLoadSessions,
      loadSession: mockLoadSession,
      createSession: mockCreateSession,
      deleteSession: mockDeleteSession,
      fetchStats: vi.fn(),
      clearError: vi.fn(),
    });

    vi.mocked(useStreamingMessageModule.useStreamingMessage).mockReturnValue({
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

    vi.mocked(useFocusCaretModule.useFocusCaret).mockReturnValue({
      position: null,
      context: "",
      focusContext: null,
      placeCaret: vi.fn(),
      moveCaretLeft: vi.fn(),
      moveCaretRight: vi.fn(),
      clearCaret: vi.fn(),
    });

    vi.mocked(useDocumentUploadModule.useDocumentUpload).mockReturnValue({
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

  it("should call loadSessions on mount", async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockLoadSessions).toHaveBeenCalledTimes(1);
    });
  });

  it("should auto-load most recent session when sessions are loaded", async () => {
    // Start with no sessions
    const { rerender } = render(<App />);

    // Simulate sessions being loaded
    vi.mocked(useChatSessionModule.useChatSession).mockReturnValue({
      session: null,
      sessions: [mockSession1, mockSession2], // mockSession1 is most recent
      stats: null,
      loading: false,
      error: null,
      loadSessions: mockLoadSessions,
      loadSession: mockLoadSession,
      createSession: mockCreateSession,
      deleteSession: mockDeleteSession,
      fetchStats: vi.fn(),
      clearError: vi.fn(),
    });

    rerender(<App />);

    await waitFor(() => {
      expect(mockLoadSession).toHaveBeenCalledWith("session-1");
    });
  });

  it("should not auto-load if a session is already loaded", async () => {
    // Start with a session already loaded
    vi.mocked(useChatSessionModule.useChatSession).mockReturnValue({
      session: mockSession1,
      sessions: [mockSession1, mockSession2],
      stats: null,
      loading: false,
      error: null,
      loadSessions: mockLoadSessions,
      loadSession: mockLoadSession,
      createSession: mockCreateSession,
      deleteSession: mockDeleteSession,
      fetchStats: vi.fn(),
      clearError: vi.fn(),
    });

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(mockLoadSessions).toHaveBeenCalledTimes(1);
    });

    // loadSession should not be called since session is already loaded
    expect(mockLoadSession).not.toHaveBeenCalled();

    // Clean up to prevent React errors
    unmount();
  });

  it("should not auto-load if sessions list is empty", async () => {
    vi.mocked(useChatSessionModule.useChatSession).mockReturnValue({
      session: null,
      sessions: [], // Empty sessions
      stats: null,
      loading: false,
      error: null,
      loadSessions: mockLoadSessions,
      loadSession: mockLoadSession,
      createSession: mockCreateSession,
      deleteSession: mockDeleteSession,
      fetchStats: vi.fn(),
      clearError: vi.fn(),
    });

    render(<App />);

    await waitFor(() => {
      expect(mockLoadSessions).toHaveBeenCalledTimes(1);
    });

    // loadSession should not be called since there are no sessions
    expect(mockLoadSession).not.toHaveBeenCalled();
  });

  it("should handle loadSessions errors gracefully", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockLoadSessions.mockRejectedValueOnce(new Error("Network error"));

    render(<App />);

    await waitFor(() => {
      expect(mockLoadSessions).toHaveBeenCalledTimes(1);
    });

    // Should log error but not crash
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load sessions:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it("should display loading skeleton while sessions are loading", () => {
    vi.mocked(useChatSessionModule.useChatSession).mockReturnValue({
      session: null,
      sessions: [],
      stats: null,
      loading: true, // Loading state
      error: null,
      loadSessions: mockLoadSessions,
      loadSession: mockLoadSession,
      createSession: mockCreateSession,
      deleteSession: mockDeleteSession,
      fetchStats: vi.fn(),
      clearError: vi.fn(),
    });

    const { container } = render(<App />);

    // Should show loading skeleton (check for shimmer animation style)
    const skeletonElements = container.querySelectorAll('[style*="shimmer"]');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it("should display error page when session loading fails", () => {
    vi.mocked(useChatSessionModule.useChatSession).mockReturnValue({
      session: null,
      sessions: [],
      stats: null,
      loading: false,
      error: "Failed to load sessions", // Error state
      loadSessions: mockLoadSessions,
      loadSession: mockLoadSession,
      createSession: mockCreateSession,
      deleteSession: mockDeleteSession,
      fetchStats: vi.fn(),
      clearError: vi.fn(),
    });

    render(<App />);

    // Should show error page
    expect(screen.getByText(/Failed to load sessions/)).toBeInTheDocument();
  });

  it("should display upload zone when no session exists", () => {
    vi.mocked(useChatSessionModule.useChatSession).mockReturnValue({
      session: null, // No session
      sessions: [],
      stats: null,
      loading: false,
      error: null,
      loadSessions: mockLoadSessions,
      loadSession: mockLoadSession,
      createSession: mockCreateSession,
      deleteSession: mockDeleteSession,
      fetchStats: vi.fn(),
      clearError: vi.fn(),
    });

    render(<App />);

    // Should show upload zone for first-time users
    expect(screen.getByTestId("upload-zone")).toBeInTheDocument();
  });
});
