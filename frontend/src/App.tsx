import { useState, useEffect } from "react";
import { ChatInterface } from "./components/chat/ChatInterface";
import { DocumentViewer } from "./components/document/DocumentViewer";
import { MessageList } from "./components/chat/MessageList";
import { MessageInput } from "./components/chat/MessageInput";
import { StreamingMessage } from "./components/chat/StreamingMessage";
import { UploadZone } from "./components/upload/UploadZone";
import { LoadingSkeleton } from "./design-system/LoadingSkeleton";
import { ErrorPage } from "./design-system/ErrorPage";
import { Toast } from "./design-system/Toast";
import { useChatSession } from "./hooks/useChatSession";
import { useStreamingMessage } from "./hooks/useStreamingMessage";
import { useFocusCaret } from "./hooks/useFocusCaret";
import { useDocumentUpload } from "./hooks/useDocumentUpload";
import { getDocument } from "./services/api";
import { chatAPI } from "./services/chat-api";
import type { DocumentDetail } from "./types/document";
import type { ChatMessage } from "./types/chat";

// Generate UUID for optimistic messages
function generateUUID(): string {
  return crypto.randomUUID();
}

function App() {
  // Session management
  const {
    session: currentSession,
    sessions,
    loading: sessionsLoading,
    error: sessionError,
    loadSessions,
    loadSession,
    createSession,
    deleteSession,
    clearError,
  } = useChatSession();

  // Streaming message handling
  const {
    message: streamingContent,
    isStreaming,
    sources,
    error: streamingError,
    sendMessage,
  } = useStreamingMessage(currentSession?.id || "");

  // Document upload handling
  const {
    isUploading,
    taskId,
    status: uploadStatus,
    progress: uploadProgress,
    error: uploadError,
    documentId: uploadedDocumentId,
    uploadFile,
    submitUrl,
    reset: resetUpload,
  } = useDocumentUpload();

  // Local state
  const [currentDocument, setCurrentDocument] = useState<DocumentDetail | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Focus caret management
  const {
    position: caretPosition,
    context: caretContext,
    focusContext,
    placeCaret: moveCaret,
    moveCaretLeft,
    moveCaretRight,
    clearCaret,
  } = useFocusCaret(currentDocument?.markdown_content || "");

  // Load sessions on mount
  useEffect(() => {
    const loadInitialSessions = async () => {
      try {
        await loadSessions();
      } catch (error) {
        console.error("Failed to load sessions:", error);
      }
    };
    loadInitialSessions();
  }, [loadSessions]);

  // Auto-load most recent session
  useEffect(() => {
    if (sessions.length > 0 && !currentSession && sessions[0]?.id) {
      const loadMostRecent = async () => {
        try {
          await loadSession(sessions[0].id);
        } catch (error) {
          console.error("Failed to load most recent session:", error);
          // Clear error so user can still upload documents
          clearError();
        }
      };
      loadMostRecent();
    } else if (sessions.length === 0 && sessionError) {
      // Clear any errors when there are no sessions (first-time user)
      clearError();
    }
  }, [sessions, currentSession, loadSession, sessionError, clearError]);

  // Load document and messages when session changes
  useEffect(() => {
    if (!currentSession) return;

    const loadSessionData = async () => {
      try {
        // Load document content
        if (currentSession.document_id) {
          const document = await getDocument(currentSession.document_id);
          setCurrentDocument(document);
        }

        // Load message history
        const messagesResponse = await chatAPI.getMessages(currentSession.id);
        setMessages(messagesResponse.messages);
      } catch (error) {
        console.error("Failed to load session data:", error);
      }
    };

    loadSessionData();
  }, [currentSession]);

  // Handle document upload
  const handleDocumentUpload = async (file: File) => {
    try {
      await uploadFile(file);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  // Handle upload success - create session and load document
  useEffect(() => {
    if (uploadStatus === "complete" && uploadedDocumentId) {
      const handleUploadSuccess = async () => {
        try {
          // Create session with uploaded document
          await createSession(uploadedDocumentId);

          // Fetch document content
          const document = await getDocument(uploadedDocumentId);
          setCurrentDocument(document);

          // Reset upload state for next upload
          resetUpload();

          // Show success notification
          setToast({
            message: "Document uploaded successfully!",
            type: "success",
          });
        } catch (error) {
          console.error("Failed to handle upload success:", error);
          setToast({
            message: "Failed to process uploaded document",
            type: "error",
          });
        }
      };

      handleUploadSuccess();
    }
  }, [uploadStatus, uploadedDocumentId, createSession, resetUpload]);

  // Display upload errors
  useEffect(() => {
    if (uploadError) {
      console.error("Upload error:", uploadError);
      setToast({
        message: uploadError,
        type: "error",
      });
    }
  }, [uploadError]);

  // Display streaming errors
  useEffect(() => {
    if (streamingError) {
      console.error("Streaming error:", streamingError);
      setToast({
        message: streamingError,
        type: "error",
      });
    }
  }, [streamingError]);

  // Handle streaming completion - convert to permanent message
  useEffect(() => {
    if (!isStreaming && streamingContent) {
      const assistantMessage: ChatMessage = {
        id: generateUUID(),
        session_id: currentSession?.id || "",
        role: "assistant",
        content: streamingContent,
        created_at: new Date().toISOString(),
        metadata: {
          sources: sources,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
    }
  }, [isStreaming, streamingContent, currentSession?.id, sources]);

  const handleSendMessage = async (message: string) => {
    // Clear previous errors
    setMessageError(null);

    // Validate message and session
    if (!currentSession) {
      setMessageError("Cannot send message: No active session");
      return;
    }

    if (!message || message.trim().length === 0) {
      setMessageError("Message cannot be empty");
      return;
    }

    if (message.length > 6000) {
      setMessageError("Message exceeds 6000 character limit");
      return;
    }

    // Optimistic update - add user message immediately
    const userMessage: ChatMessage = {
      id: generateUUID(),
      session_id: currentSession.id,
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Send to backend with focus context if enabled
    try {
      await sendMessage(
        message,
        focusModeEnabled && focusContext ? focusContext : undefined,
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      setToast({
        message: "Failed to send message. Please try again.",
        type: "error",
      });
    }
  };

  // Create new session with current document
  const handleNewSession = async () => {
    if (!currentDocument) {
      console.error("Cannot create session: No document loaded");
      return;
    }

    try {
      await createSession(currentDocument.id);
      setMessages([]);
    } catch (error) {
      console.error("Failed to create new session:", error);
    }
  };

  // Switch to different session
  const handleSessionSwitch = async (sessionId: string) => {
    try {
      await loadSession(sessionId);
    } catch (error) {
      console.error("Failed to switch session:", error);
    }
  };

  // Delete session with confirmation
  const handleDeleteSession = async (sessionId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this session? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteSession();
      await loadSessions();
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  // Toggle focus mode
  const handleToggleFocusMode = () => {
    setFocusModeEnabled((prev) => !prev);
  };

  // Prepare document viewer with real data
  const documentContent = currentDocument ? (
    <DocumentViewer
      content={currentDocument.markdown_content || ""}
      title={currentDocument.original_name}
      isLoading={false}
      caretPosition={caretPosition ?? undefined}
      onCaretMove={moveCaret}
      focusModeEnabled={focusModeEnabled}
    />
  ) : (
    <DocumentViewer content="" title="No Document" isLoading={false} />
  );

  const chatContent = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <MessageList
        messages={messages}
        isLoading={isStreaming}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
      />
      <MessageInput
        onSend={handleSendMessage}
        disabled={isStreaming}
        error={messageError}
      />
    </div>
  );

  return (
    <>
      {/* Loading state */}
      {sessionsLoading && <LoadingSkeleton />}

      {/* Error state */}
      {!sessionsLoading && sessionError && (
        <ErrorPage error={sessionError} onRetry={loadSessions} />
      )}

      {/* No session - show upload zone for first-time users */}
      {!sessionsLoading && !sessionError && !currentSession && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            backgroundColor: "#131D33",
          }}
        >
          <UploadZone
            onFileSelect={uploadFile}
            isUploading={isUploading}
            progress={uploadProgress}
            error={uploadError}
            uploadStatus={uploadStatus}
          />
        </div>
      )}

      {/* Main content when session exists */}
      {!sessionsLoading && !sessionError && currentSession && (
        <ChatInterface
          documentContent={documentContent}
          chatContent={chatContent}
          focusModeEnabled={focusModeEnabled}
          onToggleFocusMode={handleToggleFocusMode}
        />
      )}

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={5000}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}

export default App;
