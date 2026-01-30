/**
 * Integration tests for App component - Focus Caret Flow
 * Tests clicking in document, caret movement, and focus context in messages
 *
 * Requirements: 5.1-5.8
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
import type { ChatSession, FocusContext } from "../src/types/chat";

// Mock all hooks
vi.mock("../src/hooks/useChatSession");
vi.mock("../src/hooks/useStreamingMessage");
vi.mock("../src/hooks/useFocusCaret");
vi.mock("../src/hooks/useDocumentUpload");

// Mock API services
vi.mock("../src/services/api");
vi.mock("../src/services/chat-api");

describe("App - Focus Caret Flow", () => {
  const mockLoadSessions = vi.fn();
  const mockLoadSession = vi.fn();
  const mockCreateSession = vi.fn();
  const mockDeleteSession = vi.fn();
  const mockSendMessage = vi.fn();
  const mockPlaceCaret = vi.fn();
  const mockClearCaret = vi.fn();

  const mockSession: ChatSession = {
    id: "session-789",
    document_id: "doc-789",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    message_count: 0,
  };

  const mockDocument = {
    id: "doc-789",
    original_name: "article.pdf",
    markdown_content:
      "# Introduction\n\nThis article explores machine learning concepts. Deep learning has revolutionized AI.",
    file_type: "pdf" as const,
    file_size: 1024,
    upload_time: "2024-01-01T00:00:00Z",
    processing_status: "complete" as const,
    chunk_count: 3,
    metadata: {
      title: "ML Article",
      detected_language: "en",
    },
  };

  const mockFocusContext: FocusContext = {
    context_text: "Deep learning has revolutionized AI.",
    start_char: 65,
    end_char: 102,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Session loaded with document
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

    // Start with no caret
    vi.mocked(useFocusCaretModule.useFocusCaret).mockReturnValue({
      position: null,
      context: "",
      focusContext: null,
      placeCaret: mockPlaceCaret,
      moveCaretLeft: vi.fn(),
      moveCaretRight: vi.fn(),
      clearCaret: mockClearCaret,
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

  it("should send focus context when focus mode enabled and message sent", async () => {
    const { rerender } = render(<App />);

    // Wait for document to load
    await waitFor(() => {
      expect(apiModule.getDocument).toHaveBeenCalled();
    });

    // Enable focus mode
    const focusModeButton = screen.getByRole("button", { name: /focus mode/i });
    fireEvent.click(focusModeButton);

    // Set caret position with context
    vi.mocked(useFocusCaretModule.useFocusCaret).mockReturnValue({
      position: 70,
      context: "Deep learning has revolutionized AI.",
      focusContext: mockFocusContext,
      placeCaret: mockPlaceCaret,
      moveCaretLeft: vi.fn(),
      moveCaretRight: vi.fn(),
      clearCaret: mockClearCaret,
    });

    rerender(<App />);

    // Send message
    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole("button", { name: /send/i });

    fireEvent.change(input, {
      target: { value: "Explain this concept" },
    });
    fireEvent.click(sendButton);

    // Verify focus context was sent
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        "Explain this concept",
        mockFocusContext,
      );
    });
  });

  it("should not send focus context when focus mode disabled", async () => {
    const { rerender } = render(<App />);

    // Wait for document to load
    await waitFor(() => {
      expect(apiModule.getDocument).toHaveBeenCalled();
    });

    // Focus mode is disabled by default
    // Set caret position with context
    vi.mocked(useFocusCaretModule.useFocusCaret).mockReturnValue({
      position: 70,
      context: "Deep learning has revolutionized AI.",
      focusContext: mockFocusContext,
      placeCaret: mockPlaceCaret,
      moveCaretLeft: vi.fn(),
      moveCaretRight: vi.fn(),
      clearCaret: mockClearCaret,
    });

    rerender(<App />);

    // Send message
    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole("button", { name: /send/i });

    fireEvent.change(input, {
      target: { value: "General question" },
    });
    fireEvent.click(sendButton);

    // Verify focus context was NOT sent
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        "General question",
        undefined,
      );
    });
  });

  it("should complete full focus caret flow", async () => {
    const { rerender } = render(<App />);

    // Step 1: Wait for document to load
    await waitFor(() => {
      expect(apiModule.getDocument).toHaveBeenCalled();
    });

    // Step 2: Simulate caret being placed with context
    vi.mocked(useFocusCaretModule.useFocusCaret).mockReturnValue({
      position: 70,
      context: "Deep learning has revolutionized AI.",
      focusContext: mockFocusContext,
      placeCaret: mockPlaceCaret,
      moveCaretLeft: vi.fn(),
      moveCaretRight: vi.fn(),
      clearCaret: mockClearCaret,
    });

    rerender(<App />);

    // Step 3: Enable focus mode
    const focusModeButton = screen.getByRole("button", { name: /focus mode/i });
    fireEvent.click(focusModeButton);

    // Step 4: Send message with focus context
    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole("button", { name: /send/i });

    fireEvent.change(input, {
      target: { value: "What does this mean?" },
    });
    fireEvent.click(sendButton);

    // Step 5: Verify focus context was sent
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        "What does this mean?",
        mockFocusContext,
      );
    });
  });
});
