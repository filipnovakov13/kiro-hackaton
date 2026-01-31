/**
 * Integration tests for App component - Document Upload Flow
 * Tests upload → session creation → document loading
 *
 * Requirements: 2.1-2.4
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

// Mock all hooks
vi.mock("../src/hooks/useChatSession");
vi.mock("../src/hooks/useStreamingMessage");
vi.mock("../src/hooks/useFocusCaret");
vi.mock("../src/hooks/useDocumentUpload");

// Mock API services
vi.mock("../src/services/api");
vi.mock("../src/services/chat-api");

describe("App - Document Upload Flow", () => {
  const mockLoadSessions = vi.fn();
  const mockLoadSession = vi.fn();
  const mockCreateSession = vi.fn();
  const mockDeleteSession = vi.fn();
  const mockUploadFile = vi.fn();
  const mockReset = vi.fn();

  const mockDocument = {
    id: "doc-123",
    original_name: "test.pdf",
    markdown_content: "# Test Document\n\nThis is a test.",
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

  const mockSession = {
    id: "session-123",
    document_id: "doc-123",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    message_count: 0,
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

  it("should display upload zone when no session exists", () => {
    render(<App />);

    // Should show upload zone for first-time users
    expect(screen.getByTestId("upload-zone")).toBeInTheDocument();
  });

  it("should create session when upload completes", async () => {
    const { rerender } = render(<App />);

    // Simulate upload completion
    vi.mocked(useDocumentUploadModule.useDocumentUpload).mockReturnValue({
      isUploading: false,
      taskId: "task-123",
      status: "complete",
      progress: null,
      error: null,
      documentId: "doc-123",
      uploadFile: mockUploadFile,
      submitUrl: vi.fn(),
      reset: mockReset,
    });

    rerender(<App />);

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith("doc-123");
    });
  });

  it("should load document after session is created", async () => {
    const { rerender } = render(<App />);

    // Simulate upload completion
    vi.mocked(useDocumentUploadModule.useDocumentUpload).mockReturnValue({
      isUploading: false,
      taskId: "task-123",
      status: "complete",
      progress: null,
      error: null,
      documentId: "doc-123",
      uploadFile: mockUploadFile,
      submitUrl: vi.fn(),
      reset: mockReset,
    });

    rerender(<App />);

    await waitFor(() => {
      expect(apiModule.getDocument).toHaveBeenCalledWith("doc-123");
    });
  });

  it("should display document after successful upload", async () => {
    // Start with upload complete and session created
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

    // Should show chat interface (not upload zone)
    await waitFor(() => {
      expect(screen.queryByTestId("upload-zone")).not.toBeInTheDocument();
    });

    // Document should be loaded
    expect(apiModule.getDocument).toHaveBeenCalledWith("doc-123");
  });

  it("should show upload progress during upload", () => {
    vi.mocked(useDocumentUploadModule.useDocumentUpload).mockReturnValue({
      isUploading: true,
      taskId: "task-123",
      status: "chunking",
      progress: "Processing document...",
      error: null,
      documentId: null,
      uploadFile: mockUploadFile,
      submitUrl: vi.fn(),
      reset: mockReset,
    });

    render(<App />);

    // Upload zone should still be visible during upload
    expect(screen.getByTestId("upload-zone")).toBeInTheDocument();
  });

  it("should handle upload errors gracefully", async () => {
    const { rerender } = render(<App />);

    // Simulate upload error
    vi.mocked(useDocumentUploadModule.useDocumentUpload).mockReturnValue({
      isUploading: false,
      taskId: "task-123",
      status: "error",
      progress: null,
      error: "File too large",
      documentId: null,
      uploadFile: mockUploadFile,
      submitUrl: vi.fn(),
      reset: mockReset,
    });

    rerender(<App />);

    // Should not create session on error
    await waitFor(() => {
      expect(mockCreateSession).not.toHaveBeenCalled();
    });

    // Upload zone should remain visible for retry
    expect(screen.getByTestId("upload-zone")).toBeInTheDocument();
  });

  it("should reset upload state after successful upload", async () => {
    const { rerender } = render(<App />);

    // Simulate upload completion
    vi.mocked(useDocumentUploadModule.useDocumentUpload).mockReturnValue({
      isUploading: false,
      taskId: "task-123",
      status: "complete",
      progress: null,
      error: null,
      documentId: "doc-123",
      uploadFile: mockUploadFile,
      submitUrl: vi.fn(),
      reset: mockReset,
    });

    rerender(<App />);

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalled();
    });
  });

  it("should show success toast after upload completes", async () => {
    const { rerender } = render(<App />);

    // Simulate upload completion
    vi.mocked(useDocumentUploadModule.useDocumentUpload).mockReturnValue({
      isUploading: false,
      taskId: "task-123",
      status: "complete",
      progress: null,
      error: null,
      documentId: "doc-123",
      uploadFile: mockUploadFile,
      submitUrl: vi.fn(),
      reset: mockReset,
    });

    rerender(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(/document uploaded successfully/i),
      ).toBeInTheDocument();
    });
  });

  it("should complete full upload → session → document flow", async () => {
    const { rerender } = render(<App />);

    // Step 1: Upload completes
    vi.mocked(useDocumentUploadModule.useDocumentUpload).mockReturnValue({
      isUploading: false,
      taskId: "task-123",
      status: "complete",
      progress: null,
      error: null,
      documentId: "doc-123",
      uploadFile: mockUploadFile,
      submitUrl: vi.fn(),
      reset: mockReset,
    });

    rerender(<App />);

    // Step 2: Session is created
    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith("doc-123");
    });

    // Step 3: Document is loaded
    await waitFor(() => {
      expect(apiModule.getDocument).toHaveBeenCalledWith("doc-123");
    });

    // Step 4: Upload state is reset
    await waitFor(() => {
      expect(mockReset).toHaveBeenCalled();
    });

    // Step 5: Success toast is shown
    await waitFor(() => {
      expect(
        screen.getByText(/document uploaded successfully/i),
      ).toBeInTheDocument();
    });
  });
});
