/**
 * E2E Tests for Error Scenarios
 *
 * Validates: Requirements 7.1-7.3
 *
 * Tests verify that all error scenarios are handled gracefully with
 * user-friendly error messages and appropriate recovery options.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import App from "../src/App";
import * as useChatSessionModule from "../src/hooks/useChatSession";
import * as useStreamingMessageModule from "../src/hooks/useStreamingMessage";
import * as useFocusCaretModule from "../src/hooks/useFocusCaret";
import * as useDocumentUploadModule from "../src/hooks/useDocumentUpload";
import * as apiModule from "../src/services/api";
import * as chatApiModule from "../src/services/chat-api";
import type { ChatSession } from "../src/types/chat";

// Mock all hooks
vi.mock("../src/hooks/useChatSession");
vi.mock("../src/hooks/useStreamingMessage");
vi.mock("../src/hooks/useFocusCaret");
vi.mock("../src/hooks/useDocumentUpload");

// Mock API services
vi.mock("../src/services/api");
vi.mock("../src/services/chat-api");

describe("App - Error Scenarios", () => {
  const mockLoadSessions = vi.fn();
  const mockLoadSession = vi.fn();
  const mockCreateSession = vi.fn();
  const mockDeleteSession = vi.fn();
  const mockSendMessage = vi.fn();
  const mockUploadFile = vi.fn();

  const mockDocument = {
    id: "doc-123",
    original_name: "test.pdf",
    markdown_content: "# Test\n\nContent",
    file_type: "pdf" as const,
    file_size: 1024,
    upload_time: "2024-01-01T00:00:00Z",
    processing_status: "complete" as const,
    chunk_count: 5,
    metadata: {
      title: "Test",
      detected_language: "en",
    },
  };

  const mockSession: ChatSession = {
    id: "session-123",
    document_id: "doc-123",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    message_count: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useStreamingMessageModule.useStreamingMessage).mockReturnValue({
      message: "",
      isStreaming: false,
      sources: [],
      error: null,
      metadata: null,
      sendMessage: mockSendMessage,
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
      uploadFile: mockUploadFile,
      submitUrl: vi.fn(),
      reset: vi.fn(),
    });

    vi.mocked(apiModule.getDocument).mockResolvedValue(mockDocument);
    vi.mocked(chatApiModule.chatAPI.getMessages).mockResolvedValue({
      messages: [],
      total: 0,
    });
  });

  /**
   * Test 1: Upload invalid file (too large)
   *
   * Verifies that uploading a file that's too large displays
   * a user-friendly error message and allows retry
   */
  it("should handle invalid file upload (file too large) with user-friendly error", async () => {
    // Start with no session
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

    const { rerender } = render(<App />);

    // Verify upload zone is displayed
    expect(screen.getByTestId("upload-zone")).toBeInTheDocument();

    // Simulate upload error - file too large
    vi.mocked(useDocumentUploadModule.useDocumentUpload).mockReturnValue({
      isUploading: false,
      taskId: "task-123",
      status: "error",
      progress: null,
      error: "File too large",
      documentId: null,
      uploadFile: mockUploadFile,
      submitUrl: vi.fn(),
      reset: vi.fn(),
    });

    rerender(<App />);

    // Verify error toast is displayed with user-friendly message
    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });

    // Verify session is NOT created on error
    expect(mockCreateSession).not.toHaveBeenCalled();

    // Verify upload zone remains visible for retry
    expect(screen.getByTestId("upload-zone")).toBeInTheDocument();
  });

  /**
   * Test 2: Upload invalid file type
   *
   * Verifies that uploading an unsupported file type displays
   * appropriate error message
   */
  it("should handle invalid file type with user-friendly error", async () => {
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

    const { rerender } = render(<App />);

    // Simulate upload error - unsupported file type
    vi.mocked(useDocumentUploadModule.useDocumentUpload).mockReturnValue({
      isUploading: false,
      taskId: "task-123",
      status: "error",
      progress: null,
      error: "Unsupported file type",
      documentId: null,
      uploadFile: mockUploadFile,
      submitUrl: vi.fn(),
      reset: vi.fn(),
    });

    rerender(<App />);

    // Verify error toast is displayed
    await waitFor(() => {
      expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument();
    });

    // Verify no session created
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  /**
   * Test 3: Send empty message
   *
   * Verifies that attempting to send an empty message is prevented
   * at the UI level (send button disabled)
   */
  it("should prevent sending empty messages", async () => {
    // Start with session loaded
    vi.mocked(useChatSessionModule.useChatSession).mockReturnValue({
      session: mockSession,
      sessions: [mockSession],
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

    // Wait for chat interface to load
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/type your message/i),
      ).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole("button", { name: /send/i });

    // Verify send button is disabled when input is empty
    expect(sendButton).toBeDisabled();

    // Try to type and delete (leaving empty)
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.change(input, { target: { value: "" } });

    // Verify send button remains disabled
    expect(sendButton).toBeDisabled();

    // Verify sendMessage is never called
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  /**
   * Test 4: Network error during message send
   *
   * Verifies that network errors during message sending display
   * appropriate error message and allow retry
   */
  it("should handle network error during message send", async () => {
    // Start with session loaded
    vi.mocked(useChatSessionModule.useChatSession).mockReturnValue({
      session: mockSession,
      sessions: [mockSession],
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

    const { rerender } = render(<App />);

    // Wait for chat interface to load
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/type your message/i),
      ).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole("button", { name: /send/i });

    // Type message
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.click(sendButton);

    // Simulate network error
    vi.mocked(useStreamingMessageModule.useStreamingMessage).mockReturnValue({
      message: "",
      isStreaming: false,
      sources: [],
      error: "Network error. Please check your connection and try again.",
      metadata: null,
      sendMessage: mockSendMessage,
      stopStreaming: vi.fn(),
      clearMessage: vi.fn(),
      clearError: vi.fn(),
    });

    rerender(<App />);

    // Verify error toast is displayed
    await waitFor(() => {
      expect(
        screen.getByText(/network error.*check your connection/i),
      ).toBeInTheDocument();
    });

    // Verify input is re-enabled for retry (but send button disabled because input is empty after send)
    expect(input).not.toBeDisabled();
    // Send button is correctly disabled because input was cleared after optimistic update
    expect(sendButton).toBeDisabled();
  });

  /**
   * Test 5: Session loading error
   *
   * Verifies that errors loading sessions display error page
   * with retry option
   */
  it("should handle session loading error with retry option", async () => {
    // Simulate session loading error
    vi.mocked(useChatSessionModule.useChatSession).mockReturnValue({
      session: null,
      sessions: [],
      stats: null,
      loading: false,
      error: "Failed to load sessions. Please try again.",
      loadSessions: mockLoadSessions,
      loadSession: mockLoadSession,
      createSession: mockCreateSession,
      deleteSession: mockDeleteSession,
      fetchStats: vi.fn(),
      clearError: vi.fn(),
    });

    render(<App />);

    // Verify error page is displayed
    await waitFor(() => {
      expect(screen.getByText(/failed to load sessions/i)).toBeInTheDocument();
    });

    // Verify retry button is available
    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    // Click retry
    fireEvent.click(retryButton);

    // Verify loadSessions is called again
    expect(mockLoadSessions).toHaveBeenCalled();
  });

  /**
   * Test 6: Document loading error
   *
   * Verifies that errors loading document content are handled gracefully
   */
  it("should handle document loading error", async () => {
    // Start with session loaded
    vi.mocked(useChatSessionModule.useChatSession).mockReturnValue({
      session: mockSession,
      sessions: [mockSession],
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

    // Mock document loading to fail
    vi.mocked(apiModule.getDocument).mockRejectedValueOnce(
      new Error("Failed to load document"),
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<App />);

    // Wait for error to be logged
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load session data:",
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });

  /**
   * Test 7: Multiple consecutive errors
   *
   * Verifies that multiple errors in sequence are all handled
   * and don't break the application
   */
  it("should handle multiple consecutive errors gracefully", async () => {
    // Start with no session
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

    const { rerender } = render(<App />);

    // Error 1: Upload error
    vi.mocked(useDocumentUploadModule.useDocumentUpload).mockReturnValue({
      isUploading: false,
      taskId: "task-1",
      status: "error",
      progress: null,
      error: "File too large",
      documentId: null,
      uploadFile: mockUploadFile,
      submitUrl: vi.fn(),
      reset: vi.fn(),
    });

    rerender(<App />);

    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });

    // Error 2: Another upload error
    vi.mocked(useDocumentUploadModule.useDocumentUpload).mockReturnValue({
      isUploading: false,
      taskId: "task-2",
      status: "error",
      progress: null,
      error: "Unsupported file type",
      documentId: null,
      uploadFile: mockUploadFile,
      submitUrl: vi.fn(),
      reset: vi.fn(),
    });

    rerender(<App />);

    await waitFor(() => {
      expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument();
    });

    // Verify app is still functional - upload zone still visible
    expect(screen.getByTestId("upload-zone")).toBeInTheDocument();
  });
});
