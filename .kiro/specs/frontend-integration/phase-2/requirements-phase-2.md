# Requirements Document - Phase 2: Optimization & Polish

## Introduction

This document defines Phase 2 requirements for the Frontend Integration of Iubar. Phase 2 builds on the core functionality from Phase 1 to add optimization, comprehensive testing, validation, and production-ready polish.

Phase 2 focuses on:
1. API key configuration and external service optimization
2. Loading states and visual feedback
3. Comprehensive end-to-end testing
4. Final validation against original requirements
5. Performance optimization
6. Accessibility compliance
7. Security considerations

## Glossary

- **Voyage_AI**: Embedding service provider for document vectorization
- **DeepSeek**: LLM service provider for AI chat responses
- **Prompt_Caching**: DeepSeek feature that reduces costs by 90% for repeated prompt prefixes
- **Loading_Skeleton**: Animated placeholder UI matching actual component layout
- **E2E_Testing**: End-to-end testing with Playwright using real backend API
- **WCAG_2.1_AA**: Web Content Accessibility Guidelines level AA compliance
- **CSP**: Content Security Policy for XSS protection
- **React.memo**: React optimization for preventing unnecessary re-renders
- **Virtualized_Scrolling**: Rendering only visible content for performance
- **Code_Splitting**: Lazy loading components to reduce initial bundle size

## Requirements

### Requirement 7.1: Implementation Gaps from Phase 1

**User Story:** As a developer, I want to complete all missing UI features and fix known bugs from Phase 1, so that the application has full functionality before optimization.

#### Acceptance Criteria

1. THE App.tsx SHALL implement session sorting by `updated_at` DESC:
   - **Bug Found in Task 62**: Property test discovered App.tsx loads `sessions[0]` without sorting
   - Sessions array MUST be sorted by `updated_at` DESC before auto-loading most recent
   - Counterexample: Two sessions 1ms apart - older session loaded instead of newer
   - Violates Requirements 1.6 and 1.7 from Phase 1
   - Fix: Sort sessions array before accessing `sessions[0]` in auto-load useEffect
2. THE App.tsx SHALL implement session ID persistence to localStorage:
   - **Gap Found in Task 69**: App.tsx doesn't save session ID to localStorage
   - Save current session ID when session changes
   - Restore session ID from localStorage on mount
   - Clear session ID from localStorage when session deleted
   - Tests already exist and pass with manual localStorage manipulation
3. THE ChatInterface SHALL implement New Session button UI:
   - **Gap Found in Task 61**: Handler function `handleNewSession` exists but no UI button
   - Add "New Session" button to ChatInterface header
   - Button should be visible when session exists
   - Button should call `onNewSession` prop
   - Button should follow visual-identity.md design (golden accent on hover)
4. THE ChatInterface SHALL implement Delete Session button UI:
   - **Gap Found in Task 61**: Handler function `handleDeleteSession` exists but no UI button
   - Add "Delete Session" button to ChatInterface header or session list
   - Button should show confirmation dialog before deleting
   - Button should call `onDeleteSession` prop with session ID
   - Button should follow visual-identity.md design (red accent for destructive action)
5. THE ChatInterface SHALL implement Session Switcher UI:
   - **Gap Found in Task 61**: Handler function `handleSessionSwitch` exists but no UI
   - Add session list/dropdown to ChatInterface
   - Show all sessions with document name and timestamp
   - Highlight current session
   - Click session to switch
   - Button should call `onSessionSwitch` prop with session ID
6. THE backend/app/config.py SHALL add missing configuration fields:
   - **Gap Found in Backend Configuration Issue**: 18 fields missing from Settings class
   - Add explicit field definitions with proper types and defaults:
     - `deepseek_api_url: str`
     - `deepseek_model: str`
     - `deepseek_timeout_seconds: int`
     - `max_context_tokens: int`
     - `similarity_threshold: float`
     - `focus_boost_amount: float`
     - `top_k_chunks: int`
     - `response_cache_max_size: int`
     - `response_cache_ttl_seconds: int`
     - `rate_limit_queries_per_hour: int`
     - `rate_limit_max_concurrent_streams: int`
     - `default_spending_limit_usd: float`
     - `session_cleanup_interval_hours: int`
     - `session_max_age_days: int`
     - `max_message_length: int`
     - `circuit_breaker_failure_threshold: int`
     - `circuit_breaker_success_threshold: int`
     - `circuit_breaker_timeout_seconds: int`
   - Remove `extra = "allow"` quick fix from Settings.Config
   - Add proper Pydantic validation for all fields
7. THE frontend/src/utils/errorMapping.ts SHALL handle function objects in mapUploadError:
   - **Bug Found in Property Test**: `mapUploadError` doesn't handle function objects (e.g., "valueOf")
   - Add type check: `if (typeof error !== 'string') return fallback`
   - Ensures safe fallback for non-string error values
   - Property test counterexample: `mapUploadError("valueOf")` returned function instead of string
8. THE App.tsx SHALL remove unused imports and variables:
   - **LSP Warnings Found**: Multiple unused declarations in App.tsx
   - Remove unused import: `StreamingMessage`
   - Remove unused variables: `taskId`, `submitUrl`, `caretContext`, `moveCaretLeft`, `moveCaretRight`, `clearCaret`
   - Remove unused handlers: `handleDocumentUpload`, `handleNewSession`, `handleSessionSwitch`, `handleDeleteSession` (or connect to UI)
   - Remove unused parameter: `sessionId` in `handleDeleteSession`

### Requirement 8: API Key Configuration and External Service Optimization

**User Story:** As a developer, I want to configure API keys correctly and optimize external service usage, so that the application uses Voyage AI and DeepSeek to their maximum potential.

#### Acceptance Criteria

1. THE Developer SHALL research Voyage AI API documentation (https://docs.voyageai.com/docs/introduction) to:
   - Identify the optimal embedding model for the use case
   - Understand free tier limitations (voyage-4-lite has 200M free tokens, voyage-3.5-lite does not)
   - Document rate limits and best practices
   - Identify any caching or optimization features
2. THE Developer SHALL research DeepSeek API documentation (https://api-docs.deepseek.com/) to:
   - Understand prompt caching mechanism (90% cost reduction for cached input)
   - Document how to structure prompts for optimal caching
   - Identify tool calling capabilities (if applicable for future features)
   - Document rate limits and error codes
   - Understand streaming response format and best practices
3. THE backend/.env file SHALL be updated with valid API keys:
   - `VOYAGE_API_KEY`: Valid Voyage AI API key
   - `DEEPSEEK_API_KEY`: Valid DeepSeek API key
4. THE Developer SHALL verify API key configuration by:
   - Running `GET /api/status` endpoint
   - Confirming `voyage_api` status is "configured"
   - Confirming `deepseek_api` status is "configured"
   - Testing document upload and embedding generation
   - Testing chat message with streaming response
5. THE Developer SHALL document API key setup in README.md:
   - Where to obtain Voyage AI API key
   - Where to obtain DeepSeek API key
   - How to add keys to backend/.env
   - How to verify keys are working
6. THE Developer SHALL optimize Voyage AI usage:
   - Use `voyage-4-lite` model if free tier is available (200M tokens)
   - Implement batch embedding for multiple chunks (up to 128 per request)
   - Cache embeddings in ChromaDB (never re-embed same content)
   - Monitor token usage via backend logs
7. THE Developer SHALL optimize DeepSeek usage:
   - Structure system prompts to maximize cache hits (static prefix)
   - Use streaming for all responses (better UX)
   - Monitor cache hit rate via response metadata
   - Log cost per request (input tokens, cached tokens, output tokens)
8. THE App.tsx SHALL display cost tracking information:
   - Show session statistics via `GET /api/chat/sessions/{id}/stats`
   - Display: "Tokens used: X | Estimated cost: $Y"
   - Update after each message
   - Show cache hit rate: "Cache hits: X%"

### Requirement 9: Loading States and Visual Feedback

**User Story:** As a user, I want clear visual feedback for all async operations, so that I know the application is working and not frozen.

#### Acceptance Criteria

1. THE App.tsx SHALL display loading skeletons (not spinners) for:
   - Session list loading: Skeleton cards matching session list item design
   - Document loading: Skeleton matching DocumentViewer layout (headings, paragraphs)
   - Message history loading: Skeleton matching MessageList item design
2. ALL loading skeletons SHALL follow visual-identity.md design direction:
   - Use background color: #1A2332 (bgPanel)
   - Use shimmer animation: subtle gradient sweep
   - Match actual component dimensions
   - Transition smoothly to real content (fade in)
3. THE App.tsx SHALL display ThinkingIndicator while waiting for first streaming token:
   - Pulsing glow effect with golden accent (#D4A574)
   - Three animated dots with staggered delays
   - Position: Below last message in MessageList
   - Remove when first token arrives
4. THE UploadProgress component SHALL show progress stages:
   - "Uploading..." with progress bar (0-100%)
   - "Processing..." with animated spinner
   - "Ready!" with checkmark icon (green)
   - "Failed" with X icon (red) and error message
5. THE MessageInput SHALL show visual feedback:
   - Character count: "X / 6000" (gray when <5900, orange when >5900, red when >6000)
   - Disabled state: Gray background, cursor not-allowed
   - Sending state: Spinner in send button
   - Error state: Red border with error message below
6. THE DocumentViewer SHALL show scroll progress indicator:
   - Thin progress bar at top showing scroll position
   - Color: Golden accent (#D4A574)
   - Only visible while scrolling (fade out after 1 second)
7. THE App.tsx SHALL show toast notifications for:
   - Document upload success: "Document ready!"
   - Session created: "New conversation started"
   - Session deleted: "Conversation deleted"
   - Error occurred: Error message from backend
8. ALL toast notifications SHALL:
   - Auto-dismiss after 3 seconds
   - Be dismissible by clicking X button
   - Stack vertically if multiple appear
   - Follow visual-identity.md design (dark background, white text)


### Requirement 10: Comprehensive End-to-End Testing

**User Story:** As a developer, I want exhaustive E2E tests with real API integration, so that I can verify the entire application works correctly before deployment.

#### Acceptance Criteria

1. THE E2E test suite SHALL use Playwright with real backend API (not mocked)
2. THE E2E test suite SHALL require valid API keys in environment:
   - `VOYAGE_API_KEY` must be set
   - `DEEPSEEK_API_KEY` must be set
   - Tests SHALL skip with warning if keys are missing
3. THE E2E test suite SHALL test the complete document upload flow:
   - Upload PDF file via drag-and-drop
   - Verify UploadProgress shows all stages
   - Verify document appears in DocumentViewer
   - Verify session is created automatically
   - Verify session appears in session list
4. THE E2E test suite SHALL test the complete chat flow:
   - Send message via MessageInput
   - Verify ThinkingIndicator appears
   - Verify streaming response appears token by token
   - Verify SourceAttribution links appear
   - Verify complete message appears in MessageList
   - Verify MessageInput is re-enabled
5. THE E2E test suite SHALL test focus caret functionality:
   - Click in document to place caret
   - Verify caret moves to clicked position
   - Use arrow keys to move caret
   - Enable focus mode toggle
   - Send message with focus context
   - Verify response references focused content
6. THE E2E test suite SHALL test source attribution:
   - Click source link in message
   - Verify DocumentViewer scrolls to chunk
   - Verify chunk is highlighted
   - Verify highlight fades after 5 seconds
7. THE E2E test suite SHALL test session management:
   - Create new session for same document
   - Verify message history is cleared
   - Switch between sessions
   - Verify correct messages load
   - Delete session
   - Verify session is removed from list
8. THE E2E test suite SHALL test error scenarios:
   - Upload file that's too large (>10MB)
   - Upload unsupported file type
   - Send message while streaming (verify disabled)
   - Disconnect network during streaming (verify reconnection)
   - Send message exceeding character limit (verify validation)
9. THE E2E test suite SHALL test persistence:
   - Upload document and create session
   - Refresh page
   - Verify session is restored
   - Verify document is still loaded
   - Verify message history is intact
10. THE E2E test suite SHALL test cost tracking:
    - Send multiple messages
    - Verify token count increases
    - Verify estimated cost updates
    - Verify cache hit rate is displayed
11. THE E2E test suite SHALL test keyboard navigation:
    - Tab through all interactive elements
    - Verify focus indicators are visible
    - Use Enter to send message
    - Use Shift+Enter for new line
    - Use arrow keys for caret navigation
12. THE E2E test suite SHALL test responsive behavior:
    - Test at 1920x1080 (desktop)
    - Test at 1280x720 (small desktop)
    - Verify split-pane layout works at all sizes
    - Verify no horizontal scrolling
13. THE E2E test suite SHALL achieve 100% code coverage for:
    - App.tsx
    - All custom hooks (useChatSession, useStreamingMessage, useFocusCaret, useDocumentUpload)
    - All service classes (ChatAPI, SSEClient)
    - All integration components (UploadZone, DocumentViewer, ChatInterface)

### Requirement 11: Final Validation Against Original Requirements

**User Story:** As a product owner, I want to verify the integrated application meets all original product requirements, so that I can confirm the MVP is complete.

#### Acceptance Criteria

1. THE Developer SHALL create a validation checklist based on PRD.md requirements
2. THE Developer SHALL verify each PRD requirement is met:
   - Chat-first interface with document upload ✓
   - Document upload (PDF, TXT, MD) via Docling ✓
   - URL and GitHub repo ingestion ✓
   - Document viewer with focus caret ✓
   - AI chat with RAG-powered responses ✓
   - Source attribution ✓
   - Suggested questions (if implemented) ✓
   - Basic session persistence ✓
   - Cost tracking display ✓
3. THE Developer SHALL verify UX requirements from PRD.md:
   - First-time user can upload and chat within 30 seconds ✓
   - Zero configuration required to start ✓
   - Every action provides instant visual feedback ✓
   - Error states are friendly and actionable ✓
   - Interface feels calm, not overwhelming ✓
4. THE Developer SHALL verify technical requirements from tech.md:
   - Response time <2s for most queries ✓
   - UI response <100ms for all interactions ✓
   - Document processing handles PDFs up to 10MB ✓
   - Memory usage <2GB RAM ✓
5. THE Developer SHALL verify visual identity requirements from visual-identity.md:
   - All colors match design system ✓
   - Typography follows specifications ✓
   - Spacing and layout match specifications ✓
   - Animations follow motion principles ✓
6. THE Developer SHALL perform manual testing of complete user journey:
   - Welcome screen → Upload document → Document processing → Chat interface → Send message → Receive streaming response → Click source → View highlighted chunk → Create new session → Switch sessions → Delete session
7. THE Developer SHALL document any deviations from original requirements:
   - List features not implemented (with justification)
   - List features implemented differently (with rationale)
   - List known limitations or bugs
8. THE Developer SHALL create a demo video showing:
   - Complete upload flow
   - Chat with streaming responses
   - Focus caret usage
   - Source attribution
   - Session management
   - Error handling
9. THE Developer SHALL update README.md with:
   - Complete setup instructions
   - API key configuration steps
   - How to run the application
   - How to run tests
   - Known limitations
   - Future roadmap

### Requirement 12: Performance Optimization

**User Story:** As a user, I want the application to feel fast and responsive, so that I can work efficiently without waiting.

#### Acceptance Criteria

1. THE App.tsx SHALL implement React.memo for expensive components:
   - DocumentViewer (re-renders only when document changes)
   - MessageList (re-renders only when messages change)
   - FocusCaret (re-renders only when position changes)
2. THE App.tsx SHALL use React.useCallback for event handlers:
   - Message send handler
   - Document upload handler
   - Caret move handler
   - Session switch handler
3. THE App.tsx SHALL use React.useMemo for expensive computations:
   - Filtered/sorted session list
   - Markdown parsing (if not handled by library)
   - Focus context extraction
4. THE DocumentViewer SHALL implement virtualized scrolling for large documents:
   - Use react-window or react-virtualized
   - Render only visible content + buffer
   - Maintain smooth 60fps scrolling
5. THE MessageList SHALL implement virtualized scrolling for long conversations:
   - Render only visible messages + buffer
   - Auto-scroll to bottom on new message
   - Maintain scroll position when loading history
6. THE App.tsx SHALL debounce expensive operations:
   - Focus context extraction (300ms debounce)
   - Session list filtering (200ms debounce)
   - Document search (if implemented) (300ms debounce)
7. THE App.tsx SHALL prefetch data for better UX:
   - Prefetch document content when session is selected
   - Prefetch next page of messages when scrolling up
   - Prefetch session details when hovering over session in list
8. THE App.tsx SHALL implement code splitting:
   - Lazy load DocumentViewer component
   - Lazy load ChatInterface component
   - Lazy load UploadZone component
   - Show loading skeleton while loading
9. THE App.tsx SHALL optimize bundle size:
   - Use tree-shaking for unused code
   - Minimize dependencies
   - Use production builds
   - Target bundle size <500KB (gzipped)
10. THE App.tsx SHALL measure and log performance metrics:
    - Time to first render
    - Time to interactive
    - Message send latency
    - Streaming token latency
    - Document load time


### Requirement 13: Accessibility Compliance

**User Story:** As a user with accessibility needs, I want the application to be fully keyboard navigable and screen reader friendly, so that I can use it effectively.

#### Acceptance Criteria

1. THE App.tsx SHALL ensure all interactive elements are keyboard accessible:
   - Tab order follows logical flow
   - Focus indicators are visible (following visual-identity.md)
   - No keyboard traps
   - Skip links for main content
2. THE App.tsx SHALL implement ARIA labels for all components:
   - Buttons have aria-label or aria-labelledby
   - Form inputs have associated labels
   - Status messages use aria-live regions
   - Loading states use aria-busy
3. THE MessageInput SHALL support keyboard shortcuts:
   - Enter: Send message
   - Shift+Enter: New line
   - Escape: Clear input
   - Ctrl+/: Show keyboard shortcuts help
4. THE DocumentViewer SHALL support keyboard navigation:
   - Arrow keys: Move focus caret
   - Home/End: Jump to start/end
   - Page Up/Down: Scroll by page
   - Ctrl+F: Search in document (if implemented)
5. THE App.tsx SHALL ensure color contrast meets WCAG 2.1 AA:
   - Text on background: minimum 4.5:1 ratio
   - Large text: minimum 3:1 ratio
   - Interactive elements: minimum 3:1 ratio
   - Verify all colors from visual-identity.md meet standards
6. THE App.tsx SHALL provide text alternatives:
   - Images have alt text
   - Icons have aria-label
   - Loading spinners have sr-only text
7. THE App.tsx SHALL support screen readers:
   - Semantic HTML elements (nav, main, article, aside)
   - Proper heading hierarchy (h1 → h2 → h3)
   - Form labels associated with inputs
   - Error messages announced via aria-live
8. THE App.tsx SHALL support reduced motion preference:
   - Respect prefers-reduced-motion media query
   - Disable animations when preference is set
   - Maintain functionality without animations

### Requirement 14: Security Considerations

**User Story:** As a user, I want my data to be secure, so that I can trust the application with my documents and conversations.

#### Acceptance Criteria

1. THE App.tsx SHALL NOT store API keys in frontend code or localStorage
2. THE App.tsx SHALL sanitize all user input before rendering:
   - Escape HTML in messages
   - Sanitize markdown to prevent XSS
   - Validate URLs before opening
3. THE App.tsx SHALL implement Content Security Policy (CSP):
   - Restrict script sources
   - Restrict style sources
   - Restrict image sources
   - Block inline scripts
4. THE App.tsx SHALL use HTTPS for all API requests:
   - Verify VITE_API_BASE_URL uses https:// in production
   - Warn if using http:// in production
5. THE App.tsx SHALL implement rate limiting on frontend:
   - Prevent rapid-fire message sending (1 message per 2 seconds)
   - Prevent rapid session creation (1 session per 5 seconds)
   - Show user-friendly message when rate limited
6. THE App.tsx SHALL handle sensitive data carefully:
   - Clear message input after sending
   - Don't log sensitive data to console in production
7. THE App.tsx SHALL validate all API responses:
   - Check response status codes
   - Validate response schema matches expected types
   - Handle malformed responses gracefully
8. THE App.tsx SHALL implement CSRF protection:
   - Include CSRF token in requests (if backend provides)
   - Validate token on backend


## Summary

This Phase 2 requirements document defines 8 optimization and polish requirements for the Iubar frontend integration. Phase 2 adds:

- **Requirement 7.1**: Implementation gaps from Phase 1 (session sorting bug, localStorage persistence, session management UI, backend config fields, error handling edge case, unused code cleanup)
- **Requirement 8**: API key configuration and external service optimization
- **Requirement 9**: Comprehensive loading states and visual feedback
- **Requirement 10**: Exhaustive E2E testing with 100% coverage
- **Requirement 11**: Final validation against original product requirements
- **Requirement 12**: Performance optimization with React.memo, virtualization, and code splitting
- **Requirement 13**: Full accessibility compliance (WCAG 2.1 AA)
- **Requirement 14**: Security considerations including CSP, input sanitization, and rate limiting

Combined with Phase 1, this completes the production-ready frontend integration.

The implementation will follow the requirements-first workflow, proceeding to design.md after approval.
