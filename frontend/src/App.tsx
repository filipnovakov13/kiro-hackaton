import { useState, useEffect, useRef } from "react";
import { ChatInterface } from "./components/chat/ChatInterface";
import { DocumentViewer } from "./components/document/DocumentViewer";
import { MessageList } from "./components/chat/MessageList";
import { MessageInput } from "./components/chat/MessageInput";
import { UploadZone } from "./components/upload/UploadZone";
import { WelcomeMessage } from "./components/upload/WelcomeMessage";
import { LoadingSkeleton } from "./design-system/LoadingSkeleton";
import { ErrorPage } from "./design-system/ErrorPage";
import { useToast } from "./design-system/ToastContext";
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
  // Toast notifications
  const { showToast } = useToast();

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
    status: uploadStatus,
    progress: uploadProgress,
    error: uploadError,
    documentId: uploadedDocumentId,
    uploadFile,
    submitUrl,
    submitGitHub,
    reset: resetUpload,
  } = useDocumentUpload();

  // Local state
  const [currentDocument, setCurrentDocument] = useState<DocumentDetail | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  // Track processed uploads to prevent duplicate handling
  const processedUploadRef = useRef<string | null>(null);

  // Focus caret management
  const {
    position: caretPosition,
    focusContext,
    placeCaret: moveCaret,
  } = useFocusCaret(currentDocument?.markdown_content || "");

  // Load sessions on mount
  useEffect(() => {
    console.log("[App] Loading initial sessions...");
    const loadInitialSessions = async () => {
      try {
        await loadSessions();
        console.log("[App] Initial sessions loaded");
      } catch (error) {
        console.error("Failed to load sessions:", error);
      }
    };
    loadInitialSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Save session ID to localStorage when it changes
  useEffect(() => {
    if (currentSession?.id) {
      localStorage.setItem("iubar_current_session_id", currentSession.id);
    }
  }, [currentSession?.id]);

  // Restore session ID from localStorage on mount
  useEffect(() => {
    console.log(
      "[App] Restore session effect triggered, sessions:",
      sessions.length,
    );
    const savedSessionId = localStorage.getItem("iubar_current_session_id");
    if (
      savedSessionId &&
      savedSessionId !== currentSession?.id &&
      sessions.find((s) => s.id === savedSessionId)
    ) {
      console.log("[App] Restoring saved session:", savedSessionId);
      const loadSavedSession = async () => {
        try {
          await loadSession(savedSessionId);
        } catch (error) {
          console.error("Failed to load saved session:", error);
          clearError();
        }
      };
      loadSavedSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]); // Only run when sessions list changes

  // Auto-load most recent session (fallback if no saved session)
  useEffect(() => {
    console.log(
      "[App] Auto-load effect triggered, sessions:",
      sessions.length,
      "currentSession:",
      !!currentSession,
    );
    if (sessions.length > 0 && !currentSession) {
      const savedSessionId = localStorage.getItem("iubar_current_session_id");
      // Only auto-load if no saved session exists or saved session not found
      if (!savedSessionId || !sessions.find((s) => s.id === savedSessionId)) {
        console.log("[App] Auto-loading most recent session");
        // Sort sessions by updated_at DESC to get most recent
        const sortedSessions = [...sessions].sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        );

        if (sortedSessions[0]?.id) {
          const loadMostRecent = async () => {
            try {
              await loadSession(sortedSessions[0].id);
            } catch (error) {
              console.error("Failed to load most recent session:", error);
              // Clear error so user can still upload documents
              clearError();
            }
          };
          loadMostRecent();
        }
      }
    } else if (sessions.length === 0 && sessionError) {
      // Clear any errors when there are no sessions (first-time user)
      clearError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, currentSession, sessionError]); // Only run when these change

  // Load document and messages when session changes
  useEffect(() => {
    console.log("[App] Session changed:", currentSession);
    if (!currentSession) return;

    const loadSessionData = async () => {
      try {
        console.log("[App] Loading session data for:", currentSession.id);
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

  // Handle upload success - create session and transition immediately
  useEffect(() => {
    console.log(
      "[App] Upload effect - status:",
      uploadStatus,
      "docId:",
      uploadedDocumentId,
      "processed:",
      processedUploadRef.current,
    );
    if (
      uploadStatus === "complete" &&
      uploadedDocumentId &&
      processedUploadRef.current !== uploadedDocumentId
    ) {
      const handleUploadSuccess = async () => {
        try {
          console.log(
            "[App] Processing upload success for:",
            uploadedDocumentId,
          );
          // Mark this upload as processed
          processedUploadRef.current = uploadedDocumentId;

          // Create session with uploaded document - this sets currentSession
          console.log("[App] Creating session...");
          await createSession(uploadedDocumentId);
          console.log("[App] Session created");

          // Show success notification
          showToast("Document uploaded successfully!", "success");

          // Reset upload state for next upload
          console.log("[App] Resetting upload state");
          resetUpload();
          console.log("[App] Upload handling complete");

          // Note: Document will be loaded by the session change effect
          // No need to wait for it here - transition happens immediately
        } catch (error) {
          console.error("Failed to handle upload success:", error);
          showToast("Failed to process uploaded document", "error");
          // Reset processed ref on error so user can retry
          processedUploadRef.current = null;
          resetUpload();
        }
      };

      handleUploadSuccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadStatus, uploadedDocumentId]); // Only run when upload completes

  // Display upload errors
  useEffect(() => {
    if (uploadError) {
      console.error("Upload error:", uploadError);
      showToast(uploadError, "error");
    }
  }, [uploadError, showToast]);

  // Display streaming errors
  useEffect(() => {
    if (streamingError) {
      console.error("Streaming error:", streamingError);
      showToast(streamingError, "error");
    }
  }, [streamingError, showToast]);

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
      showToast("Failed to send message. Please try again.", "error");
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
      // Clear localStorage if deleting current session
      if (sessionId === currentSession?.id) {
        localStorage.removeItem("iubar_current_session_id");
      }
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
      {console.log(
        "[App] Render - sessionsLoading:",
        sessionsLoading,
        "sessionError:",
        !!sessionError,
        "currentSession:",
        !!currentSession,
      )}
      {/* Loading state */}
      {sessionsLoading && <LoadingSkeleton />}

      {/* Error state */}
      {!sessionsLoading && sessionError && (
        <ErrorPage error={sessionError} onRetry={loadSessions} />
      )}

      {/* No session - show welcome screen and upload zone for first-time users */}
      {!sessionsLoading && !sessionError && !currentSession && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            backgroundColor: "#131D33",
            padding: "48px",
          }}
        >
          <WelcomeMessage />
          <UploadZone
            onFileSelect={uploadFile}
            onUrlSubmit={submitUrl}
            onGitHubSubmit={submitGitHub}
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
          sessions={sessions}
          currentSessionId={currentSession.id}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          onSessionSwitch={handleSessionSwitch}
        />
      )}
    </>
  );
}

export default App;
