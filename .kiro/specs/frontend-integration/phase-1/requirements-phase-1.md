# Requirements Document - Phase 1: Core Integration

## Introduction

This document defines Phase 1 requirements for the Frontend Integration of Iubar - connecting the fully-built frontend UI components and services to the operational backend API. Phase 1 focuses on core functionality to get the application working end-to-end.

Phase 1 focuses on:
1. App.tsx rewrite to use real hooks and services (no demo data)
2. Document upload flow integration with automatic session creation
3. Real-time streaming chat with SSE connection management
4. Focus caret integration for context-aware AI responses
5. Session persistence and state management
6. Document viewer with markdown rendering and chunk highlighting
7. Comprehensive error handling and edge cases

## Glossary

- **App.tsx**: Main application component (`frontend/src/App.tsx`) orchestrating all UI flows
- **useChatSession**: React hook (`frontend/src/hooks/useChatSession.ts`) managing chat session CRUD operations
- **useStreamingMessage**: React hook (`frontend/src/hooks/useStreamingMessage.ts`) managing SSE streaming connections
- **useFocusCaret**: React hook (`frontend/src/hooks/useFocusCaret.ts`) managing focus caret position and context extraction
- **useDocumentUpload**: React hook (`frontend/src/hooks/useDocumentUpload.ts`) managing document upload flow
- **ChatAPI**: Service class (`frontend/src/services/chat-api.ts`) for chat session API calls
- **SSEClient**: Service class (`frontend/src/services/sse-client.ts`) for Server-Sent Events connection
- **Session**: A chat conversation tied to a specific document with persistent message history
- **Focus_Context**: Text surrounding the focus caret position (±150 chars) sent to backend for context-aware responses
- **Streaming_Response**: Real-time AI response delivered via SSE with token, source, done, and error events
- **Document_Viewer**: Component displaying markdown-rendered document content with focus caret
- **Chat_Interface**: Split-pane component with document viewer (left) and chat (right)
- **Loading State** (subtle pulse) — Feedback mechanism - refer to #[[file:.kiro/documentation/project-docs/visual-identity.md]]

## Requirements

### Requirement 1: App.tsx State Management Integration

**User Story:** As a developer, I want App.tsx to manage application state using real hooks and services, so that the UI reflects actual backend data instead of demo content.

#### Acceptance Criteria

1. THE App.tsx SHALL use `useChatSession()` hook to manage session state including:
   - `currentSession`: Active ChatSession object or null
   - `sessions`: Array of available sessions
   - `isLoading`: Boolean for async operations
   - `error`: Error message string or null
2. THE App.tsx SHALL use `useStreamingMessage()` hook to manage streaming state including:
   - `streamingContent`: Accumulated tokens from SSE
   - `isStreaming`: Boolean indicating active stream
   - `sources`: Array of source attributions
   - `error`: Stream error message or null
3. THE App.tsx SHALL use `useFocusCaret()` hook to manage focus caret state including:
   - `caretPosition`: Current character position in document
   - `focusContext`: FocusContext object with surrounding text
   - `moveCaret()`: Function to update position
4. THE App.tsx SHALL use `useDocumentUpload()` hook to manage upload state including:
   - `uploadProgress`: Upload/processing progress object
   - `uploadDocument()`: Function to initiate upload
   - `uploadError`: Error message or null
5. THE App.tsx SHALL NOT contain any hardcoded demo data (messages, document content, simulated streaming)
6. THE App.tsx SHALL initialize by calling `useChatSession().loadSessions()` to fetch existing sessions
7. WHEN sessions are loaded, THE App.tsx SHALL automatically load the most recent session via `useChatSession().loadSession(mostRecentId)`
8. THE App.tsx SHALL maintain a single source of truth for all application state through hooks (no duplicate state in App.tsx)


### Requirement 2: Document Upload Flow Integration

**User Story:** As a user, I want to upload documents through the UI and have them automatically open with a new chat session, so that I can immediately start asking questions.

#### Acceptance Criteria

1. WHEN the application loads with no existing sessions, THE App.tsx SHALL display the UploadZone component prominently in the bottom part of the document viewer
2. WHEN a user uploads a document via UploadZone, THE App.tsx SHALL:
   - Call `useDocumentUpload().uploadDocument(file)`
   - Display UploadProgress component with real-time status from backend
   - Poll `GET /api/documents/status/{task_id}` every 2 seconds until status is `complete` or `error`
3. WHEN document processing completes successfully, THE App.tsx SHALL:
   - Automatically create a new chat session via `POST /api/chat/sessions` with the document_id
   - Load the document content via `GET /api/documents/{id}`
   - Display the document in DocumentViewer component
   - Set the new session as `currentSession`
4. WHEN document processing fails, THE App.tsx SHALL:
   - Display the error message from backend in user-friendly format
   - Keep UploadZone visible for retry
   - NOT create a chat session
5. WHEN a user uploads a document while a session is active, THE App.tsx SHALL:
   - Create a new session for the new document
   - Switch to the new session (making it `currentSession`)
   - Add the new session to the sessions list
6. THE UploadProgress component SHALL display the `progress` field from status response:
   - `"Queued for processing..."` → Show loading state indicator with "Preparing document..."
   - `"Converting document to text..."` → Show loading state indicator with "Reading document..."
   - `"Splitting into searchable sections..."` → Show loading state indicator with "Processing content..."
   - `"Generating embeddings..."` → Show loading state indicator with "Preparing for AI..."
   - `"Ready"` → Show checkmark with "Document ready!"
   - `"Failed: {error}"` → Show error icon with error message
7. THE App.tsx SHALL support URL ingestion via UrlInput component following the same flow as file upload

### Requirement 3: Chat Session Lifecycle Management

**User Story:** As a user, I want my chat sessions to persist across page refreshes, so that I can continue conversations without losing context.

#### Acceptance Criteria

1. WHEN the application loads, THE App.tsx SHALL call `useChatSession().loadSessions()` to fetch all sessions from `GET /api/chat/sessions`
2. THE App.tsx SHALL sort sessions by `updated_at` DESC and auto-load the most recent session
3. WHEN loading a session, THE App.tsx SHALL:
   - Call `useChatSession().loadSession(sessionId)` which fetches `GET /api/chat/sessions/{id}`
   - Load the associated document via `GET /api/documents/{document_id}`
   - Display document content in DocumentViewer
   - Display message history in MessageList component
   - Set focus caret to position 0 (start of document)
4. THE App.tsx SHALL provide a "New Session" button that:
   - Creates a new session for the currently open document via `POST /api/chat/sessions` with the same document_id
   - Clears the message history (starts fresh conversation)
   - Switches to the new session (making it `currentSession`)
   - Keeps the same document open in DocumentViewer
   - Is ONLY visible when a document is currently open (disabled/hidden when no document)
5. WHEN a user sends a message, THE App.tsx SHALL:
   - Call `useStreamingMessage().sendMessage(sessionId, message, focusContext)`
   - Immediately add user message to MessageList (optimistic update)
   - Display ThinkingIndicator while waiting for first token
   - Stream assistant response via SSE
6. WHEN a streaming response completes, THE App.tsx SHALL:
   - Add complete assistant message to MessageList
   - Update session's `updated_at` timestamp
   - Clear streaming state
7. THE App.tsx SHALL handle session deletion via:
   - Delete button in session list
   - Confirmation dialog: "Delete this conversation? This cannot be undone."
   - Call `useChatSession().deleteSession(sessionId)` → `DELETE /api/chat/sessions/{id}`
   - If deleted session is current, switch to most recent remaining session or show UploadZone
8. THE App.tsx SHALL persist session state to localStorage with key `iubar_current_session_id` for faster restoration on reload


### Requirement 4: Real-Time Streaming Chat Integration

**User Story:** As a user, I want to see AI responses stream in real-time with source attributions, so that I get immediate feedback and can verify information sources.

#### Acceptance Criteria

1. WHEN a user sends a message, THE App.tsx SHALL call `useStreamingMessage().sendMessage()` with:
   - `sessionId`: Current session UUID
   - `message`: User's message text (1-6000 characters)
   - `focusContext`: FocusContext object from `useFocusCaret()` if focus toggle is enabled, otherwise null
2. THE useStreamingMessage hook SHALL establish SSE connection to `POST /api/chat/sessions/{sessionId}/messages` and handle 4 event types:
   - `token`: Append token to `streamingContent` and trigger re-render
   - `source`: Add source object to `sources` array
   - `done`: Set `isStreaming` to false, add complete message to MessageList
   - `error`: Set `error` state, display error message, stop streaming
3. WHILE streaming is active (`isStreaming === true`), THE App.tsx SHALL:
   - Display StreamingMessage component with accumulated `streamingContent`
   - Display ThinkingIndicator before first token arrives
   - Disable MessageInput (prevent concurrent messages)
   - Show streaming cursor animation in StreamingMessage
4. WHEN streaming completes successfully, THE App.tsx SHALL:
   - Add complete assistant message to MessageList with:
     - `id`: Generated UUID
     - `role`: "assistant"
     - `content`: Final accumulated content
     - `sources`: Array of source objects
     - `timestamp`: Current time
   - Clear `streamingContent` and `sources` from streaming state
   - Re-enable MessageInput
   - Auto-scroll MessageList to bottom
5. WHEN streaming encounters an error, THE App.tsx SHALL:
   - Display error message in StreamingMessage component
   - If partial response exists, show it with error indicator
   - Re-enable MessageInput after 2 seconds
   - Log error details to console for debugging
6. THE App.tsx SHALL implement SSE reconnection logic:
   - If connection drops, attempt reconnect up to 3 times
   - Wait 2 seconds between reconnection attempts
   - Show "Reconnecting..." message to user
   - If all retries fail, show error: "Connection lost. Please try again."
7. THE SourceAttribution component SHALL display clickable source links that:
   - Show document title and chunk section
   - When clicked, scroll DocumentViewer to the source chunk
   - Highlight the source chunk with ChunkHighlight component
   - Use visual-identity.md colors for highlighting (#253550 background)
8. THE App.tsx SHALL disable message sending while `isStreaming === true` with visual feedback:
   - MessageInput shows disabled state (gray background)
   - Send button shows spinner icon
   - Placeholder text: "AI is responding..."

### Requirement 5: Focus Caret Integration

**User Story:** As a user, I want to focus the AI's attention on specific document sections, so that I get context-aware responses about the content I'm reading.

#### Acceptance Criteria

1. THE DocumentViewer SHALL integrate FocusCaret component that:
   - Displays a golden glowing indicator (✨) at the current caret position
   - Defaults to position 0 (start of document) when document loads
   - Follows visual-identity.md design (golden accent #D4A574)
2. THE FocusCaret SHALL support keyboard navigation:
   - Arrow Up (↑): Move caret to previous paragraph
   - Arrow Down (↓): Move caret to next paragraph
   - Home: Move caret to document start
   - End: Move caret to document end
3. THE FocusCaret SHALL support click-to-place:
   - User clicks anywhere in DocumentViewer
   - Caret moves to clicked character position
   - Smooth animation (200ms fade in/out)
4. THE useFocusCaret hook SHALL extract context around caret position:
   - Extract ±150 characters around caret position
   - Create FocusContext object: `{text: string, position: number, document_id: string}`
   - Update context whenever caret moves
5. THE App.tsx SHALL provide a focus toggle button in the chat interface:
   - Label: "Focus Mode" with icon
   - When enabled (default): Send `focusContext` with every message
   - When disabled: Send `focusContext: null`
   - Visual indicator shows toggle state (golden border when enabled)
6. WHEN focus mode is enabled AND user sends a message, THE backend SHALL:
   - Boost similarity scores for chunks overlapping with focus context by 0.15
   - Include focus context in the prompt to DeepSeek
   - Return sources that prioritize focused content
7. THE DocumentViewer SHALL show visual feedback when focus context is used:
   - Subtle highlight around focused text (golden glow)
   - Fade out after 2 seconds
8. THE FocusCaret SHALL persist position in session state:
   - Store `caretPosition` in localStorage with key `iubar_caret_position_{sessionId}`
   - Restore position when session is reloaded
   - Reset to 0 when switching to a different document


### Requirement 6: Document Viewer Integration

**User Story:** As a user, I want to view my uploaded documents with smooth scrolling and chunk highlighting, so that I can read and reference content while chatting with the AI.

#### Acceptance Criteria

1. THE DocumentViewer SHALL render markdown content using a markdown library (e.g., react-markdown)
2. THE DocumentViewer SHALL support the following markdown elements:
   - Headings (H1-H6)
   - Paragraphs
   - Lists (ordered and unordered)
   - Code blocks with syntax highlighting
   - Links
   - Bold and italic text
   - Blockquotes
3. THE DocumentViewer SHALL implement lazy loading for large documents:
   - Initially render first 10,000 characters
   - Load additional content as user scrolls (virtualized scrolling)
   - Maintain smooth scrolling performance (60fps)
   - Pre-load next section when user is within 500px of bottom
4. THE DocumentViewer SHALL integrate ChunkHighlight component for source attribution:
   - When user clicks a source link, scroll to the chunk
   - Highlight chunk with background color (#253550 from visual-identity.md)
   - Smooth scroll animation (500ms)
   - Highlight fades out after 5 seconds
5. THE DocumentViewer SHALL maintain scroll position when:
   - User switches between chat and document pane
   - Focus caret moves (unless user explicitly scrolls)
   - New messages arrive in chat
6. THE DocumentViewer SHALL display loading skeleton while document loads:
   - Follow visual-identity.md design direction
   - Show animated skeleton for headings and paragraphs
   - Transition smoothly to actual content
7. THE DocumentViewer SHALL handle empty or missing documents:
   - Show message: "No document loaded. Upload a document to get started."
   - Display UploadZone component inline
8. THE DocumentViewer SHALL support document metadata display:
   - Show document title at top (from metadata.title or original_name)
   - Show file type badge (PDF, DOCX, TXT, MD, URL)
   - Show processing status if not complete
   - Show chunk count: "X sections"

### Requirement 7: Error Handling and Edge Cases

**User Story:** As a user, I want clear error messages and graceful degradation, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN the backend is unreachable on app load, THE App.tsx SHALL:
   - Display a full-page error component
   - Show message: "Cannot connect to server. Please check your connection and try again."
   - Provide a "Retry" button that calls `loadSessions()` again
   - Show backend URL from environment variable for debugging
2. WHEN a session fails to load, THE App.tsx SHALL:
   - Display error message in place of MessageList
   - Show message: "Could not load conversation. It may have been deleted."
   - Provide "Back to Sessions" button that shows session list
   - Remove failed session from sessions array
3. WHEN document upload fails, THE App.tsx SHALL:
   - Display error from backend in UploadProgress component
   - Map backend errors to user-friendly messages:
     - `"File too large"` → "This file is too large. Maximum size is 10MB."
     - `"Unsupported file type"` → "This file type is not supported. Please upload PDF, DOCX, TXT, or MD files."
     - `"Could not read this file"` → "Could not read this file. It may be corrupted or password-protected."
   - Keep UploadZone visible for retry
   - Provide "Try Another File" button
4. WHEN SSE connection fails, THE App.tsx SHALL:
   - Attempt reconnection up to 3 times (2 second intervals)
   - Show "Reconnecting..." message with spinner
   - If all retries fail, show error: "Connection lost. Please refresh the page."
   - Provide "Refresh Page" button
5. WHEN user tries to send message while streaming, THE App.tsx SHALL:
   - Keep MessageInput disabled
   - Show tooltip: "Please wait for the current response to complete"
   - Ignore Enter key presses
6. WHEN API returns 429 (rate limit), THE App.tsx SHALL:
   - Display message: "Too many requests. Please wait a moment and try again."
   - Show countdown timer: "Try again in X seconds"
   - Auto-enable MessageInput after wait period
7. WHEN API returns 500 (server error), THE App.tsx SHALL:
   - Display message: "Something went wrong on our end. Please try again."
   - Log full error to console for debugging
   - Provide "Try Again" button
8. WHEN session spending limit is reached, THE App.tsx SHALL:
   - Display message: "Session spending limit reached ($5.00). Start a new session to continue."
   - Disable MessageInput
   - Provide "New Session" button
9. THE App.tsx SHALL implement error boundaries:
   - Catch React component errors
   - Display fallback UI: "Something went wrong. Please refresh the page."
   - Log error details to console
   - Provide "Refresh Page" button


## Summary

This Phase 1 requirements document defines 7 core requirements for integrating the Iubar frontend with the backend API. Phase 1 establishes the foundation with:

- Real-time streaming chat with SSE
- Document upload and processing with automatic session creation
- Focus caret for context-aware AI responses
- Session persistence and management
- Document viewer with markdown rendering and chunk highlighting
- Comprehensive error handling and edge cases

Phase 2 will build on this foundation with optimization, testing, validation, and polish.

The implementation will follow the requirements-first workflow, proceeding to design.md after approval.
