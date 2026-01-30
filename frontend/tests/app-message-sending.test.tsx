/**
 * Integration tests for App component - Message Sending
 * Tests message sending with optimistic updates and focus context
 *
 * Requirements: 3.1-3.7
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
import type { FocusContext } from "../src/types/chat";

// Mock all hooks
vi.mock("../src/hooks/useChatSession");
vi.mock("../src/hooks/useStreamingMessage");
vi.mock("../src/hooks/useFocusCaret");
vi.mock("../src/hooks/useDocumentUpload");

// Mock API services
vi.mock("../src/services/api");
vi.mock("../src/services/chat-api");

describe("App - Message Sending", () => {
  const mockLoadSessions = vi.fn();
  const mockLoadSession = vi.fn();
  const mockCreateSession = vi.fn();
  const mockDeleteSession = vi.fn();
  const mockSendMessage = vi.fn();

  const mockSession: ChatSession = {
    id: "session-123",
    document_id: "doc-123",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    message_count: 0,
  };

  const mockDocument = {
    id: "doc-123",
    original_name: "test.pdf",
    markdown_content:
      "# Test Document\n\nThis is a test document with some content.",
    file_type: "pdf" as const,
    file_size: 1024,
    upload_time: "2024-01-01T00:00:00Z",
    processing_status: "complete" as const,
    chunk_count: 5,
    metadata: {
      title: "Test Document",
      detected_language: "en",
    },
  };

  const mockFocusContext: FocusContext = {
    context_text: "This is a test document with some content.",
    start_char: 10,
    end_char: 35,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: Session loaded with document
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
      uploadFile: vi.fn(),
      submitUrl: vi.fn(),
      reset: vi.fn(),
    });

    vi.mocked(apiModule.getDocument).mockResolvedValue(mockDocument);
    vi.mocked(chatApiModule.chatAPI.getMessages).mockResolvedValue({
      messages: [],
      total: 0,
    });
  });

  it("should send message when user submits input", async () => {
    render(<App />);

    // Wait for document to load
    await waitFor(() => {
      expect(apiModule.getDocument).toHaveBeenCalled();
    });

    // Find input and send button
    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole("button", { name: /send/i });

    // Type message
    fireEvent.change(input, {
      target: { value: "What is this document about?" },
    });
    fireEvent.click(sendButton);

    // Verify sendMessage was called
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        "What is this document about?",
        undefined, // No focus context by default
      );
    });
  });

  it("should perform optimistic update when sending message", async () => {
    render(<App />);

    // Wait for document to load
    await waitFor(() => {
      expect(apiModule.getDocument).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole("button", { name: /send/i });

    // Type and send message
    fireEvent.change(input, { target: { value: "Test message" } });
    fireEvent.click(sendButton);

    // User message should appear immediately (optimistic update)
    await waitFor(() => {
      expect(screen.getByText("Test message")).toBeInTheDocument();
    });

    // Input should be cleared
    expect(input).toHaveValue("");
  });

  it("should include focus context when focus mode is enabled", async () => {
    // Enable focus mode with context
    vi.mocked(useFocusCaretModule.useFocusCaret).mockReturnValue({
      position: 25,
      context: "This is a test document with some content.",
      focusContext: mockFocusContext,
      placeCaret: vi.fn(),
      moveCaretLeft: vi.fn(),
      moveCaretRight: vi.fn(),
      clearCaret: vi.fn(),
    });

    render(<App />);

    // Wait for document to load
    await waitFor(() => {
      expect(apiModule.getDocument).toHaveBeenCalled();
    });

    // Enable focus mode
    const focusModeButton = screen.getByRole("button", { name: /focus mode/i });
    fireEvent.click(focusModeButton);

    // Send message
    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole("button", { name: /send/i });

    fireEvent.change(input, {
      target: { value: "What does this section mean?" },
    });
    fireEvent.click(sendButton);

    // Verify sendMessage was called with focus context
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        "What does this section mean?",
        mockFocusContext,
      );
    });
  });

  it("should not include focus context when focus mode is disabled", async () => {
    // Focus context exists but focus mode is disabled
    vi.mocked(useFocusCaretModule.useFocusCaret).mockReturnValue({
      position: 25,
      context: "This is a test document with some content.",
      focusContext: mockFocusContext,
      placeCaret: vi.fn(),
      moveCaretLeft: vi.fn(),
      moveCaretRight: vi.fn(),
      clearCaret: vi.fn(),
    });

    render(<App />);

    // Wait for document to load
    await waitFor(() => {
      expect(apiModule.getDocument).toHaveBeenCalled();
    });

    // Focus mode is disabled by default
    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole("button", { name: /send/i });

    fireEvent.change(input, { target: { value: "General question" } });
    fireEvent.click(sendButton);

    // Verify sendMessage was called WITHOUT focus context
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        "General question",
        undefined,
      );
    });
  });

  it("should validate session exists before sending", async () => {
    // No session loaded
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

    render(<App />);

    // Should show upload zone, not chat interface
    expect(screen.getByTestId("upload-zone")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/type your message/i),
    ).not.toBeInTheDocument();
  });

  it("should disable input while streaming", async () => {
    // Simulate streaming in progress
    vi.mocked(useStreamingMessageModule.useStreamingMessage).mockReturnValue({
      message: "Streaming response...",
      isStreaming: true,
      sources: [],
      error: null,
      metadata: null,
      sendMessage: mockSendMessage,
      stopStreaming: vi.fn(),
      clearMessage: vi.fn(),
      clearError: vi.fn(),
    });

    render(<App />);

    // Wait for document to load
    await waitFor(() => {
      expect(apiModule.getDocument).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole("button", { name: /send/i });

    // Input and button should be disabled
    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it("should handle sendMessage errors gracefully", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Mock sendMessage to throw error
    mockSendMessage.mockRejectedValueOnce(new Error("Network error"));

    render(<App />);

    // Wait for document to load
    await waitFor(() => {
      expect(apiModule.getDocument).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole("button", { name: /send/i });

    fireEvent.change(input, { target: { value: "Test message" } });
    fireEvent.click(sendButton);

    // Should log error
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to send message:",
        expect.any(Error),
      );
    });

    // Should show error toast
    await waitFor(() => {
      expect(screen.getByText(/failed to send message/i)).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });
});
