# Tasks: Phase 1 - Core Integration

## Overview

This document contains step-by-step implementation tasks for Phase 1 of Frontend Integration. Tasks are ordered by dependency and broken down into atomic, testable units.

**Total Estimated Duration**: 2-3 days
**Complexity**: 5 (Very Complex)

## Task Status Legend

- `[ ]` - Not started
- `[~]` - Queued
- `[-]` - In progress
- `[x]` - Completed
- `[ ]*` - Optional task

---

## Phase 1.1: Verify Existing Implementation

- [x] 1. Verify useChatSession hook
  - Check file exists: `frontend/src/hooks/useChatSession.ts`
  - Verify interface matches design (UseChatSessionReturn)
  - Verify methods: loadSessions, loadSession, createSession, deleteSession
  - Run tests: `npm test useChatSession.test.ts`
  - _Requirements: 1.1, 1.2_

- [x] 2. Verify useStreamingMessage hook
  - Check file exists: `frontend/src/hooks/useStreamingMessage.ts`
  - Verify interface matches design (UseStreamingMessageReturn)
  - Verify SSE event handling (token, source, done, error)
  - Run tests: `npm test useStreamingMessage.test.ts`
  - _Requirements: 1.3, 1.4_

- [x] 3. Verify useFocusCaret hook
  - Check file exists: `frontend/src/hooks/useFocusCaret.ts`
  - Verify interface matches design (UseFocusCaretReturn)
  - Verify context extraction (±150 chars)
  - Run tests: `npm test useFocusCaret.test.ts`
  - _Requirements: 1.5_

- [x] 4. Verify useDocumentUpload hook
  - Check file exists: `frontend/src/hooks/useDocumentUpload.ts`
  - Verify interface matches design (UseDocumentUploadReturn)
  - Verify polling logic (2s intervals, 60 max attempts)
  - Run tests: `npm test useDocumentUpload.test.ts`
  - _Requirements: 1.6_

- [x] 5. Verify ChatAPI service
  - Check file exists: `frontend/src/services/chat-api.ts`
  - Verify methods: getSessions, getSession, createSession, deleteSession, getMessages
  - Verify base URL configuration
  - Run tests: `npm test chat-api.test.ts`
  - _Requirements: 1.1, 1.2_

- [x] 6. Verify SSEClient service
  - Check file exists: `frontend/src/services/sse-client.ts`
  - Verify connect method with event handlers
  - Verify reconnection logic (3 retries, 2s delay)
  - Run tests: `npm test sse-client.test.ts`
  - _Requirements: 1.3, 1.4_

- [x] 7. Verify chat components
  - ChatInterface.tsx - Split-pane layout
  - MessageList.tsx - Message history
  - MessageInput.tsx - Input with validation
  - StreamingMessage.tsx - Streaming display
  - ThinkingIndicator.tsx - Loading indicator
  - SourceAttribution.tsx - Source links
  - _Requirements: 1.1-1.7_

- [x] 8. Verify document components
  - DocumentViewer.tsx - Markdown renderer
  - FocusCaret.tsx - Caret indicator
  - ChunkHighlight.tsx - Chunk highlighting
  - _Requirements: 1.5, 5.1-5.8_

- [x] 9. Verify upload components
  - UploadZone.tsx - Drag-drop upload
  - UploadProgress.tsx - Progress display
  - UrlInput.tsx - URL ingestion
  - _Requirements: 1.6, 2.1-2.4_

---

## Phase 1.2: App.tsx Rewrite

- [x] 10. Backup current App.tsx
  - Copy `frontend/src/App.tsx` to `frontend/src/App.tsx.backup`
  - _Requirements: All_

- [x] 11. Remove demo data constants
  - Remove demoMessages array
  - Remove demoDocument object
  - Remove demoSessions array
  - Remove any simulated streaming logic
  - _Requirements: All_

- [x] 12. Remove demo state
  - Remove useState for demo messages
  - Remove useState for demo document
  - Remove setTimeout/setInterval for simulated streaming
  - _Requirements: All_

- [x] 13. Add useChatSession hook
  - Import useChatSession from hooks
  - Destructure: currentSession, sessions, isLoading, error, loadSessions, loadSession, createSession, deleteSession
  - Verify TypeScript types resolve correctly
  - _Requirements: 1.1, 1.2_

- [x] 14. Add useStreamingMessage hook
  - Import useStreamingMessage from hooks
  - Destructure: streamingContent, isStreaming, sources, error, sendMessage
  - Verify TypeScript types resolve correctly
  - _Requirements: 1.3, 1.4_

- [x] 15. Add useFocusCaret hook
  - Import useFocusCaret from hooks
  - Pass currentDocument?.content and currentDocument?.id as parameters
  - Destructure: caretPosition, focusContext, focusModeEnabled, moveCaret, toggleFocusMode
  - Verify TypeScript types resolve correctly
  - _Requirements: 1.5, 5.1-5.8_

- [x] 16. Add useDocumentUpload hook
  - Import useDocumentUpload from hooks
  - Destructure: uploadProgress, uploadError, uploadDocument
  - Verify TypeScript types resolve correctly
  - _Requirements: 1.6, 2.1-2.4_

- [x] 17. Add document state
  - Add useState for currentDocument (Document | null)
  - Import Document type from types/document
  - _Requirements: 1.5_

- [x] 18. Add messages state
  - Add useState for messages (ChatMessage[])
  - Import ChatMessage type from types/chat
  - _Requirements: 1.1_

- [x] 19. Add useEffect for initial load
  - Create useEffect with empty dependency array
  - Call loadSessions() inside effect
  - Add error handling with try-catch
  - _Requirements: 1.1, 1.7_

- [x] 20. Add useEffect for auto-load most recent
  - Create useEffect with [sessions, currentSession] dependencies
  - Check if sessions.length > 0 && !currentSession
  - Call loadSession(sessions[0].id) for most recent
  - Add error handling
  - _Requirements: 1.7_

- [x] 21. Add useEffect for session change
  - Create useEffect with [currentSession] dependency
  - Return early if !currentSession
  - _Requirements: 1.1_

- [x] 22. Load document content
  - Call fetch(`/api/documents/${currentSession.document_id}`)
  - Parse response and setCurrentDocument
  - Add error handling
  - _Requirements: 1.5_

- [x] 23. Load message history
  - Call ChatAPI.getMessages(currentSession.id)
  - setMessages with response
  - Add error handling
  - _Requirements: 1.1_

---

## Phase 1.3: Event Handler Implementation

- [x] 24. Create handleDocumentUpload function
  - Accept file: File parameter
  - Call uploadDocument(file)
  - Check result.success
  - _Requirements: 2.1-2.4_

- [x] 25. Handle upload success
  - Call createSession(result.document_id!)
  - Fetch document content
  - setCurrentDocument with fetched document
  - Add error handling for each step
  - _Requirements: 2.1-2.4_

- [x] 26. Handle upload failure
  - Display uploadError to user
  - Keep UploadZone visible for retry
  - _Requirements: 2.3, 7.1-7.3_

- [x] 27. Create handleSendMessage function
  - Accept message: string parameter
  - Validate currentSession exists
  - Validate message length (1-6000 chars)
  - _Requirements: 3.1-3.7_

- [x] 28. Implement optimistic update
  - Create userMessage object with UUID
  - Add to messages array immediately
  - Clear input field
  - _Requirements: 3.1-3.7_

- [x] 29. Send to backend
  - Get focusContext from useFocusCaret (if enabled)
  - Call sendMessage(currentSession.id, message, focusContext)
  - Add error handling
  - _Requirements: 3.1-3.7, 5.4_

- [x] 30. Create handleNewSession function
  - Validate currentDocument exists
  - Call createSession(currentDocument.id)
  - Clear messages array (fresh conversation)
  - Add error handling
  - _Requirements: 1.1, 1.2_

- [x] 31. Create handleSessionSwitch function
  - Accept sessionId: string parameter
  - Call loadSession(sessionId)
  - Add error handling
  - _Requirements: 1.1, 1.2_

- [x] 32. Create handleDeleteSession function
  - Accept sessionId: string parameter
  - Show confirmation dialog
  - Call deleteSession(sessionId) if confirmed
  - Add error handling
  - _Requirements: 1.1, 1.2_

---

## Phase 1.4: Conditional Rendering

- [x] 33. Add loading state check
  - Check sessionsLoading from useChatSession
  - Return <LoadingSkeleton /> if loading
  - _Requirements: 6.1-6.3_

- [x] 34. Create LoadingSkeleton component (if not exists)
  - Create skeleton for session list
  - Create skeleton for document viewer
  - Create skeleton for message list
  - Use design system colors and shimmer animation
  - _Requirements: 6.1-6.3_

- [x] 35. Add error state check
  - Check sessionError from useChatSession
  - Return <ErrorPage /> if error exists
  - _Requirements: 7.1-7.3_

- [x] 36. Create ErrorPage component (if not exists)
  - Display error message
  - Add "Retry" button calling loadSessions
  - Show backend URL for debugging
  - Use design system styling
  - _Requirements: 7.1-7.3_

- [x] 37. Add no-session check
  - Check if !currentSession
  - Return <UploadZone onUpload={handleDocumentUpload} />
  - _Requirements: 1.6, 2.1-2.4_

- [x] 38. Render ChatInterface when session exists
  - Pass document prop
  - Pass messages prop
  - Pass streamingContent and isStreaming props
  - Pass sources prop
  - Pass onSendMessage handler
  - Pass focusCaret component
  - Pass focusModeEnabled and onToggleFocusMode
  - _Requirements: 1.1-1.7_

---

## Phase 1.5: Streaming Integration

- [x] 39. Add streaming state to MessageList
  - Pass isStreaming prop to MessageList
  - Pass streamingContent prop
  - _Requirements: 4.1-4.5_

- [x] 40. Display ThinkingIndicator
  - Show ThinkingIndicator when isStreaming && !streamingContent
  - Hide when first token arrives
  - _Requirements: 4.1-4.5_

- [x] 41. Display StreamingMessage
  - Show StreamingMessage when streamingContent exists
  - Pass accumulated content
  - Show streaming cursor animation
  - _Requirements: 4.1-4.5_

- [x] 42. Add useEffect for streaming completion
  - Create useEffect with [isStreaming, streamingContent] dependencies
  - Check if !isStreaming && streamingContent
  - _Requirements: 4.1-4.5_

- [x] 43. Create complete message
  - Generate UUID for message
  - Create ChatMessage object with role: 'assistant'
  - Include sources array
  - Add timestamp
  - _Requirements: 4.1-4.5_

- [x] 44. Update state
  - Add message to messages array
  - Clear streamingContent (handled by hook)
  - Auto-scroll MessageList to bottom
  - _Requirements: 4.1-4.5_

---

## Phase 1.6: Focus Caret Integration

- [x] 45. Pass FocusCaret to DocumentViewer
  - Create FocusCaret component instance
  - Pass caretPosition prop
  - Pass onMove={moveCaret} handler
  - Pass enabled={focusModeEnabled} prop
  - _Requirements: 5.1-5.8_

- [x] 46. Implement click-to-place in DocumentViewer
  - Add onClick handler to document content
  - Calculate character position from click
  - Call moveCaret with position
  - _Requirements: 5.2_

- [x] 47. Implement keyboard navigation
  - Add onKeyDown handler to DocumentViewer
  - Handle ArrowUp (previous paragraph)
  - Handle ArrowDown (next paragraph)
  - Handle Home (start of document)
  - Handle End (end of document)
  - _Requirements: 5.3_

- [x] 48. Add toggle button to ChatInterface
  - Create button with "Focus Mode" label
  - Add icon (✨ or similar)
  - Wire onClick to toggleFocusMode
  - _Requirements: 5.1_

- [x] 49. Add visual indicator
  - Show golden border when enabled
  - Change button style based on focusModeEnabled
  - Use design system colors
  - _Requirements: 5.1_

---

## Phase 1.7: Error Handling

- [x] 50. Add message validation
  - Check message length > 0
  - Check message length <= 6000
  - Display error message if invalid
  - Prevent send if invalid
  - _Requirements: 3.1, 7.1-7.3_

- [x] 51. Add file validation
  - Check file size <= 10MB
  - Check file type (PDF, TXT, MD, DOCX)
  - Display error message if invalid
  - Prevent upload if invalid
  - _Requirements: 2.1, 7.1-7.3_

- [x] 52. Create Toast component (if not exists)
  - Accept message, type, duration props
  - Auto-dismiss after duration
  - Add dismiss button
  - Use design system styling
  - _Requirements: 7.1-7.3_

- [x] 53. Add ErrorBoundary
  - Wrap App in ErrorBoundary
  - Display fallback UI on crash
  - Add "Refresh Page" button
  - Log errors to console
  - _Requirements: 7.1-7.3_

- [x] 54. Create error mapping function
  - Map 404 → "Resource not found"
  - Map 429 → "Too many requests"
  - Map 500 → "Server error"
  - Map upload errors to friendly messages
  - _Requirements: 7.3_

- [x] 55. Add error handling to all API calls
  - Wrap fetch calls in try-catch
  - Use error mapping function
  - Display Toast with error message
  - Log full error to console
  - _Requirements: 7.1-7.3_

---

## Phase 1.8: Testing

- [x] 56. Test session loading on mount
  - Mock useChatSession hook
  - Verify loadSessions called
  - Verify most recent session auto-loads
  - _Requirements: 1.1, 1.7_

- [x] 57. Test document upload flow
  - Mock useDocumentUpload hook
  - Simulate file upload
  - Verify session created
  - Verify document loaded
  - _Requirements: 2.1-2.4_

- [x] 58. Test message sending
  - Mock useStreamingMessage hook
  - Simulate message send
  - Verify optimistic update
  - Verify focus context included
  - _Requirements: 3.1-3.7_

- [x] 59. Test upload → session → chat flow
  - Upload document
  - Verify session created
  - Send message
  - Verify streaming response
  - _Requirements: 1.1-2.4, 3.1-4.5_

- [x] 60. Test focus caret flow
  - Click in document
  - Verify caret moves
  - Send message
  - Verify focus context sent
  - _Requirements: 5.1-5.8_

- [x] 61. Test session management
  - Create new session
  - Switch sessions
  - Delete session
  - Verify state updates
  - _Requirements: 1.1, 1.2_

- [x] 62. Test session state consistency
  - Generate random sessions
  - Verify most recent auto-loads
  - **Property-Based Test**: Validates: Requirements 1.6, 1.7

- [x] 63. Test focus context extraction
  - Generate random document and position
  - Verify ±150 char extraction
  - **Property-Based Test**: Validates: Requirement 5.4

- [x] 64. Test SSE token accumulation
  - Generate random token stream
  - Verify no loss or duplication
  - **Property-Based Test**: Validates: Requirements 4.2, 4.3

- [x] 65. Test upload polling
  - Generate random poll count
  - Verify 2s intervals
  - **Property-Based Test**: Validates: Requirement 2.2

- [x] 66. Test localStorage persistence
  - Generate random session ID and position
  - Verify save and restore
  - **Property-Based Test**: Validates: Requirements 3.8, 5.8

- [x] 67. Test error message mapping
  - Test all backend error codes
  - Verify user-friendly messages
  - **Property-Based Test**: Validates: Requirement 7.3

---

## Phase 1.9: Final Validation

- [x] 68. Test first-time user flow
  - Start with no sessions
  - Upload document
  - Send message
  - Verify response
  - _Requirements: All_

- [x] 69. Test session persistence
  - Create session
  - Refresh page
  - Verify session restored
  - _Requirements: 3.8_

- [x] 70. Test error scenarios
  - Upload invalid file
  - Send empty message
  - Disconnect network
  - Verify error messages
  - _Requirements: 7.1-7.3_

- [x] 71. Run linting
  - Execute: `npm run lint`
  - Fix any errors
  - _Requirements: All_

- [x] 72. Run type checking
  - Execute: `npm run type-check`
  - Fix any type errors
  - _Requirements: All_

- [x] 73. Run unit tests
  - Execute: `npm test`
  - Verify all tests pass
  - Check coverage >= 80%
  - _Requirements: All_

- [x] 74. Run integration tests
  - Execute: `npm run test:integration`
  - Verify all tests pass
  - _Requirements: All_

- [x] 75. Run property-based tests
  - Execute: `npm run test:property`
  - Verify all properties hold
  - _Requirements: All_

- [x] 76. Remove backup files
  - Delete App.tsx.backup
  - _Requirements: All_

- [x] 77. Update comments
  - Add JSDoc comments to complex functions
  - Remove TODO comments
  - _Requirements: All_

- [x] 78. Verify no console.log statements
  - Search for console.log
  - Remove or replace with proper logging
  - _Requirements: All_

---

## Completion Checklist

- [ ] All 78 tasks completed
- [ ] All sub-tasks completed
- [ ] All tests passing (unit, integration, property-based)
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Code coverage >= 80%
- [ ] Manual testing confirms all flows work
- [ ] No demo data remains in App.tsx
- [ ] All hooks integrated correctly
- [ ] Error handling comprehensive
- [ ] Loading states display correctly
- [ ] Focus caret works with keyboard and click
- [ ] Streaming responses display in real-time
- [ ] Session persistence works across refreshes
- [ ] Documentation updated

---

## Notes

- Tasks are ordered by dependency - complete in sequence
- Each task is atomic and testable
- Sub-tasks break down complex operations
- Validation commands provided for quality gates
- Refer to design.md for implementation details
- Refer to requirements.md for acceptance criteria

