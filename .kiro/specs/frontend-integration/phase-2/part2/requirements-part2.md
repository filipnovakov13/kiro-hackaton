# Requirements Document - Phase 2 Part 2: Optimization & Polish

## Introduction

This document defines Phase 2 Part 2 requirements for the Frontend Integration of Iubar. Part 2 builds on the essential functionality from Part 1 to add comprehensive optimization, testing, accessibility compliance, and production-ready polish.

Part 2 focuses on:
1. Advanced DocumentViewer features (letter-level rendering, virtualization)
2. Comprehensive end-to-end testing with 100% coverage
3. Performance optimization (React.memo, code splitting, virtualization)
4. Full accessibility compliance (WCAG 2.1 AA)
5. Advanced visual identity polish (typography system, micro-interactions)
6. Final validation against all original requirements

## Glossary

- **Letter-Level_Rendering**: Rendering text with individual letter elements for precise focus caret targeting
- **Virtualized_Scrolling**: Rendering only visible content for performance
- **Code_Splitting**: Lazy loading components to reduce initial bundle size
- **React.memo**: React optimization for preventing unnecessary re-renders
- **E2E_Testing**: End-to-end testing with Playwright using real backend API
- **WCAG_2.1_AA**: Web Content Accessibility Guidelines level AA compliance
- **CSP**: Content Security Policy for XSS protection

## Requirements

### Requirement 9.5: DocumentViewer Advanced Enhancement

**User Story:** As a user, I want advanced document viewer features with letter-level precision and optimal performance, so that I can efficiently navigate large documents with precise focus control.

**Context:** This requirement builds on the basic DocumentViewer functionality from Part 1 to add advanced features.

#### Implementation Dependencies

1. **Phase 1: Letter-Level Rendering** (Must be completed first)
   - Render text with letter-level `<span>` elements for precise caret targeting
   - Research optimal approach: Consider using CSS `::first-letter` pseudo-elements, `contenteditable` with `Selection` API, or custom span wrapping
   - Maintain word boundaries for readability
   - Optimize for performance (virtualization if needed for large documents)

2. **Phase 2: Advanced Features** (Depends on Phase 1)
   - Implement all remaining features in parallel

#### Acceptance Criteria

##### 9.5.1 Letter-Level Focus Targeting
1. THE DocumentViewer SHALL render text with letter-level precision for focus caret:
   - **Research Task**: Investigate optimal implementation approach:
     - Option A: Wrap each letter in `<span>` elements
     - Option B: Use CSS `::first-letter` with dynamic styling
     - Option C: Use `contenteditable` with browser `Selection` API
     - Option D: Hybrid approach with virtualization
   - **Criteria**: Choose approach that balances performance, accessibility, and maintainability
   - Maintain word boundaries for readability
   - Optimize rendering for large documents (consider virtualization)
   - Enable precise letter-level highlighting at 40% anchor position within words
2. THE FocusCaret component SHALL implement letter-level highlighting:
   - Identify word at caret position
   - Calculate anchor letter: `Math.floor(word.length * 0.4)`
   - Apply golden glow to specific letter element
   - Glow specs: `rgba(212, 165, 116, 0.5)`, 2px blur, 1px spread
   - Use existing `calculateAnchorPosition()` helper function
3. RSVP mode features SHALL be deferred to future-tasks.md:
   - Playback controls, WPM adjustment, auto-advance

##### 9.5.2 Performance & Virtualization
1. THE DocumentViewer SHALL implement virtualized scrolling for large documents:
   - Use react-window or react-virtualized
   - Render only visible content + buffer
   - Maintain smooth 60fps scrolling
   - Coordinate with letter-level rendering for optimal performance

##### 9.5.3 Visual Feedback
1. THE DocumentViewer SHALL show scroll progress indicator:
   - Thin progress bar at top showing scroll position
   - Color: Golden accent (#D4A574)
   - Only visible while scrolling (fade out after 1 second)
2. THE DocumentViewer SHALL add focus mode controls hint:
   - Show when focus mode enabled: "Controls: ↑↓ Move caret | Click to place"
   - Position: Top of document viewer, subtle text
   - Fade out after 5 seconds or first interaction

##### 9.5.4 Advanced Navigation
1. THE DocumentViewer SHALL support advanced keyboard navigation:
   - Ctrl+F: Search in document (if implemented)
   - Additional shortcuts as needed

##### 9.5.5 Accessibility
1. THE DocumentViewer SHALL ensure letter-level rendering maintains accessibility:
   - Screen readers should read text naturally (not letter-by-letter)
   - Use appropriate ARIA attributes if needed
   - Maintain semantic HTML structure
   - Test with screen readers (NVDA, JAWS, VoiceOver)

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
3. THE App.tsx SHALL implement session sorting and memoization:
   - Use React.useMemo for filtered/sorted session list to prevent unnecessary re-computation
   - Ensure most recent session loads correctly (sorting already implemented in Part 1)
4. THE App.tsx SHALL use React.useMemo for other expensive computations:
   - Markdown parsing (if not handled by library)
   - Focus context extraction
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
   - Show loading skeleton while loading (from Part 1)
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
4. THE App.tsx SHALL ensure color contrast meets WCAG 2.1 AA:
   - Text on background: minimum 4.5:1 ratio
   - Large text: minimum 3:1 ratio
   - Interactive elements: minimum 3:1 ratio
   - Verify all colors from visual-identity.md meet standards
5. THE App.tsx SHALL provide text alternatives:
   - Images have alt text
   - Icons have aria-label
   - Loading spinners have sr-only text
6. THE App.tsx SHALL support screen readers:
   - Semantic HTML elements (nav, main, article, aside)
   - Proper heading hierarchy (h1 → h2 → h3)
   - Form labels associated with inputs
   - Error messages announced via aria-live
7. THE App.tsx SHALL support reduced motion preference:
   - Respect prefers-reduced-motion media query
   - Disable animations when preference is set
   - Maintain functionality without animations

### Requirement 14: Advanced Security

**User Story:** As a user, I want comprehensive security measures in place, so that my data is fully protected.

**Context:** This builds on basic security from Part 1 with advanced measures.

#### Acceptance Criteria

1. THE App.tsx SHALL implement Content Security Policy (CSP):
   - Restrict script sources
   - Restrict style sources
   - Restrict image sources
   - Block inline scripts
2. THE App.tsx SHALL implement rate limiting on frontend:
   - Prevent rapid-fire message sending (1 message per 2 seconds)
   - Prevent rapid session creation (1 session per 5 seconds)
   - Show user-friendly message when rate limited
3. THE App.tsx SHALL handle sensitive data carefully:
   - Clear message input after sending
   - Don't log sensitive data to console in production
4. THE App.tsx SHALL implement CSRF protection:
   - Include CSRF token in requests (if backend provides)
   - Validate token on backend

### Requirement 15: Advanced Visual Identity Polish

**User Story:** As a user, I want the application to fully match the visual identity specifications with polished micro-interactions, so that the experience feels premium and cohesive.

**Context:** This builds on essential visual identity fixes from Part 1 with advanced polish.

#### Acceptance Criteria

##### 15.1 Complete Typography System

1. THE index.html SHALL load all specified font families:
   - Inter Variable (400, 500, 600, 700 weights) for headings and UI
   - iA Writer Quattro AND Merriweather (400 weight) for body text
   - JetBrains Mono (400 weight) for code blocks
   - Use Google Fonts or self-hosted fonts
   - Add preconnect for performance
2. THE typography.ts SHALL update fontFamily definitions to use loaded fonts:
   - Remove system font fallbacks as primary
   - Keep system fonts as final fallback only
3. ALL components SHALL use design system typography tokens instead of hardcoded font sizes

##### 15.2 Complete Spacing Consistency

1. ALL remaining components SHALL eliminate hardcoded pixel values:
   - Complete audit of all components
   - Replace with spacing tokens from layout.ts
   - Use spacing.xs through spacing["3xl"] consistently

##### 15.3 Motion & Micro-Interactions

1. ALL components SHALL use specific property transitions instead of generic "all":
   - Example: `transition: "background-color 150ms ease-out"` not `transition: "all 150ms ease-out"`
   - Improves performance and intentionality
2. THE StreamingMessage SHALL implement word-by-word stagger animation:
   - 50ms delay between words
   - Fade-in animation per word
   - Coordinate with backend token batching for smooth effect
3. THE modal components (if added) SHALL use defined modal reveal animation:
   - Entry: 300ms with easeOutQuart
   - Exit: 200ms with easeOutExpo
   - Background fade: 150ms

##### 15.4 Chat Message Polish

1. THE MessageList SHALL use complete design system tokens:
   - Replace all remaining hardcoded values
   - Use `padding.card`, `borderRadius.lg` consistently
2. Suggested questions feature SHALL be deferred to future-tasks.md:
   - Not critical for MVP
   - Requires backend support for question generation

##### 15.5 Upload Area Complete Polish

1. THE UploadZone SHALL add CTA buttons with golden background:
   - "Choose File" button with `backgrounds.active` and `accents.highlight` on hover
   - "Paste URL" button with same styling
   - Keyboard accessible (Enter/Space to activate)

##### 15.6 Future Tasks Documentation

1. THE future-tasks.md SHALL be updated with deferred features:
   - RSVP mode implementation (playback controls, WPM, auto-advance)
   - Focus caret visual review (ensure letter-level glow is prominent)
   - Suggested questions after document upload
   - Inline action buttons on hover
   - Dashboard and knowledge base management
   - Collections/folders organization
   - Learning progress tracking
   - User authentication system
   - Export functionality (PDF, Markdown, notes)
   - Mobile/tablet responsive design
   - Multi-document comparison view

## Summary

This Phase 2 Part 2 requirements document defines optimization and polish requirements for production-ready deployment:

- **Requirement 9.5**: Advanced DocumentViewer features (letter-level rendering, virtualization, advanced navigation)
- **Requirement 10**: Comprehensive E2E testing with 100% coverage
- **Requirement 11**: Final validation against all original requirements
- **Requirement 12**: Performance optimization (React.memo, code splitting, virtualization, memoization)
- **Requirement 13**: Full accessibility compliance (WCAG 2.1 AA)
- **Requirement 14**: Advanced security measures (CSP, rate limiting, CSRF protection)
- **Requirement 15**: Advanced visual identity polish (complete typography system, micro-interactions, motion design)

Combined with Part 1, this completes the production-ready frontend integration with all optimization, testing, accessibility, and polish features.

The implementation will follow the requirements-first workflow, proceeding to design.md after approval.
