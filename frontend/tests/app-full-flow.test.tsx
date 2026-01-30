/**
 * Integration tests for App component - Full Upload → Session → Chat Flow
 * Tests the complete user journey from document upload to sending messages
 *
 * Requirements: 1.1-2.4, 3.1-4.5
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

describe("App - Full Upload → Session → Chat Flow", () => {
  const mockLoadSessions = vi.fn();
  const mockLoadSession = vi.fn();
  const mockCreateSession = vi.fn();
  const mockDeleteSession = vi.fn();
  const mockSendMessage = vi.fn();
  const mockUploadFile = vi.fn();
  const mockReset = vi.fn();

  const mockDocument = {
    id: "doc-456",
    original_name: "research.pdf",
    markdown_content:
      "# Research Paper\n\nThis paper discusses AI advancements.",
    file_type: "pdf" as const,
    file_size: 2048,
    upload_time: "2024-01-01T00:00:00Z",
    processing_status: "complete" as const,
    chunk_count: 10,
    metadata: {
      title: "Research Paper",
      detected_language: "en",
    },
  };

  const mockSession: ChatSession = {
    id: "session-456",
    document_id: "doc-456",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    message_count: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Start with no session (first-time user)
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
      reset: mockReset,
    });

    vi.mocked(apiModule.getDocument).mockResolvedValue(mockDocument);
    vi.mocked(chatApiModule.chatAPI.getMessages).mockResolvedValue({
      messages: [],
      total: 0,
    });
  });

  it("should complete full flow: upload → session → send message", async () => {
    const { rerender } = render(<App />);

    // Step 1: Verify upload zone is displayed for first-time user
    expect(screen.getByTestId("upload-zone")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/type your message/i),
    ).not.toBeInTheDocument();

    // Step 2: Simulate document upload completion
    vi.mocked(useDocumentUploadModule.useDocumentUpload).mockReturnValue({
      isUploading: false,
      taskId: "task-456",
      status: "complete",
      progress: null,
      error: null,
      documentId: "doc-456",
      uploadFile: mockUploadFile,
      submitUrl: vi.fn(),
      reset: mockReset,
    });

    rerender(<App />);

    // Step 3: Verify session is created
    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith("doc-456");
    });

    // Step 4: Verify document is loaded
    await waitFor(() => {
      expect(apiModule.getDocument).toHaveBeenCalledWith("doc-456");
    });

    // Step 5: Simulate session being loaded
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

    rerender(<App />);

    // Step 6: Verify chat interface is now displayed
    await waitFor(() => {
      expect(screen.queryByTestId("upload-zone")).not.toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/type your message/i),
      ).toBeInTheDocument();
    });

    // Step 7: Send a message
    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole("button", { name: /send/i });

    fireEvent.change(input, {
      target: { value: "What are the main findings?" },
    });
    fireEvent.click(sendButton);

    // Step 8: Verify message is sent
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        "What are the main findings?",
        undefined,
      );
    });

    // Step 9: Verify optimistic update
    expect(screen.getByText("What are the main findings?")).toBeInTheDocument();
  });

  it("should show streaming response after sending message", async () => {
    // Start with session already loaded
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

    // Wait for document to load
    await waitFor(() => {
      expect(apiModule.getDocument).toHaveBeenCalled();
    });

    // Send message
    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole("button", { name: /send/i });

    fireEvent.change(input, { target: { value: "Summarize this paper" } });
    fireEvent.click(sendButton);

    // Simulate streaming response
    vi.mocked(useStreamingMessageModule.useStreamingMessage).mockReturnValue({
      message: "The paper discusses...",
      isStreaming: true,
      sources: [],
      error: null,
      metadata: null,
      sendMessage: mockSendMessage,
      stopStreaming: vi.fn(),
      clearMessage: vi.fn(),
      clearError: vi.fn(),
    });

    rerender(<App />);

    // Verify streaming message is displayed
    await waitFor(() => {
      expect(screen.getByText("The paper discusses...")).toBeInTheDocument();
    });

    // Verify input is disabled during streaming
    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it("should handle upload errors and allow retry", async () => {
    const { rerender } = render(<App />);

    // Verify upload zone is displayed
    expect(screen.getByTestId("upload-zone")).toBeInTheDocument();

    // Simulate upload error
    vi.mocked(useDocumentUploadModule.useDocumentUpload).mockReturnValue({
      isUploading: false,
      taskId: "task-456",
      status: "error",
      progress: null,
      error: "File processing failed",
      documentId: null,
      uploadFile: mockUploadFile,
      submitUrl: vi.fn(),
      reset: mockReset,
    });

    rerender(<App />);

    // Verify session is NOT created on error
    await waitFor(() => {
      expect(mockCreateSession).not.toHaveBeenCalled();
    });

    // Upload zone should remain visible for retry
    expect(screen.getByTestId("upload-zone")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/type your message/i),
    ).not.toBeInTheDocument();
  });

  it("should load messages when session is loaded", async () => {
    // Start with session already loaded
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

    // Verify messages are loaded
    await waitFor(() => {
      expect(chatApiModule.chatAPI.getMessages).toHaveBeenCalledWith(
        "session-456",
      );
    });
  });

  it("should display success toast after upload completes", async () => {
    const { rerender } = render(<App />);

    // Simulate upload completion
    vi.mocked(useDocumentUploadModule.useDocumentUpload).mockReturnValue({
      isUploading: false,
      taskId: "task-456",
      status: "complete",
      progress: null,
      error: null,
      documentId: "doc-456",
      uploadFile: mockUploadFile,
      submitUrl: vi.fn(),
      reset: mockReset,
    });

    rerender(<App />);

    // Verify success toast is displayed
    await waitFor(() => {
      expect(
        screen.getByText(/document uploaded successfully/i),
      ).toBeInTheDocument();
    });
  });

  it("should reset upload state after successful session creation", async () => {
    const { rerender } = render(<App />);

    // Simulate upload completion
    vi.mocked(useDocumentUploadModule.useDocumentUpload).mockReturnValue({
      isUploading: false,
      taskId: "task-456",
      status: "complete",
      progress: null,
      error: null,
      documentId: "doc-456",
      uploadFile: mockUploadFile,
      submitUrl: vi.fn(),
      reset: mockReset,
    });

    rerender(<App />);

    // Verify reset is called
    await waitFor(() => {
      expect(mockReset).toHaveBeenCalled();
    });
  });

  /**
   * Task 68: Complete first-time user flow test
   * Tests the entire journey from no sessions → upload → chat → response
   * Validates: All Requirements
   */
  it("should complete first-time user flow: no sessions → upload → send message → receive response", async () => {
    const { rerender } = render(<App />);

    // Step 1: Verify first-time user sees upload zone (no sessions)
    expect(screen.getByTestId("upload-zone")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/type your message/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/research.pdf/i)).not.toBeInTheDocument();

    // Step 2: Simulate document upload
    const file = new File(["content"], "research.pdf", {
      type: "application/pdf",
    });
    mockUploadFile.mockResolvedValue(undefined);

    // Trigger upload (in real app, this would be via drag-drop or file input)
    await mockUploadFile(file);

    // Step 3: Simulate upload completion (skip progress display since it's internal to UploadZone)
    vi.mocked(useDocumentUploadModule.useDocumentUpload).mockReturnValue({
      isUploading: false,
      taskId: "task-456",
      status: "complete",
      progress: null,
      error: null,
      documentId: "doc-456",
      uploadFile: mockUploadFile,
      submitUrl: vi.fn(),
      reset: mockReset,
    });

    rerender(<App />);

    // Step 4: Verify session is created automatically
    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith("doc-456");
    });

    // Step 5: Verify document is loaded
    await waitFor(() => {
      expect(apiModule.getDocument).toHaveBeenCalledWith("doc-456");
    });

    // Step 6: Simulate session loaded with document
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

    rerender(<App />);

    // Step 7: Verify chat interface is now available
    await waitFor(() => {
      expect(screen.queryByTestId("upload-zone")).not.toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/type your message/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/research paper/i)).toBeInTheDocument();
    });

    // Step 8: Send first message
    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole("button", { name: /send/i });

    fireEvent.change(input, {
      target: { value: "What are the main findings?" },
    });
    fireEvent.click(sendButton);

    // Step 9: Verify message is sent
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        "What are the main findings?",
        undefined,
      );
    });

    // Step 10: Verify user message appears (optimistic update)
    expect(screen.getByText("What are the main findings?")).toBeInTheDocument();

    // Step 11: Simulate streaming response
    vi.mocked(useStreamingMessageModule.useStreamingMessage).mockReturnValue({
      message: "The main findings include...",
      isStreaming: true,
      sources: [
        {
          chunk_id: "chunk-1",
          document_id: "doc-456",
          similarity: 0.95,
          text: "Finding 1: AI advancements",
        },
      ],
      error: null,
      metadata: null,
      sendMessage: mockSendMessage,
      stopStreaming: vi.fn(),
      clearMessage: vi.fn(),
      clearError: vi.fn(),
    });

    rerender(<App />);

    // Step 12: Verify streaming response appears
    await waitFor(() => {
      expect(
        screen.getByText("The main findings include..."),
      ).toBeInTheDocument();
    });

    // Step 13: Verify input is disabled during streaming
    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();

    // Step 14: Simulate streaming completion
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

    rerender(<App />);

    // Step 15: Verify input is re-enabled after streaming
    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });

    // Send button remains disabled because input is empty (correct behavior)
    expect(sendButton).toBeDisabled();

    // Complete first-time user flow validated:
    // ✅ No sessions → upload zone displayed
    // ✅ Upload document → session created automatically
    // ✅ Document loaded → chat interface available
    // ✅ Send message → optimistic update
    // ✅ Receive response → streaming display
    // ✅ Response complete → ready for next message
  });
});
