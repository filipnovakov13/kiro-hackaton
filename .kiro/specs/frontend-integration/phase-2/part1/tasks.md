# Implementation Plan: Phase 2 Part 1 - Essential Functionality

## Overview

This implementation plan breaks down Phase 2 Part 1 into discrete coding tasks. Each task builds on previous work and includes references to specific requirements. The plan focuses on completing essential functionality gaps, API integration, loading states, DocumentViewer enhancements, visual identity fixes, and basic security.

## Tasks

- [ ] 1. Fix Critical Bugs from Phase 1
  - [x] 1.1 Fix session sorting bug in App.tsx
    - Sort sessions array by `updated_at` DESC before auto-loading
    - Add test to verify sorting with random timestamps
    - _Requirements: 7.1.1_
  
  - [x] 1.2 Implement session ID persistence to localStorage
    - Save session ID when session changes
    - Restore session ID on mount
    - Clear session ID when session deleted
    - _Requirements: 7.1.2_
  
  - [x]* 1.3 Write property test for session sorting
    - **Property 1: Session Sorting Invariant**
    - **Validates: Requirements 7.1.1**
  
  - [x]* 1.4 Write property test for localStorage round-trip
    - **Property 2: localStorage Round-Trip**
    - **Validates: Requirements 7.1.2**
  
  - [x] 1.5 Fix error mapping type safety in errorMapping.ts
    - Add type guard for non-string inputs
    - Return fallback for function objects and other non-strings
    - _Requirements: 7.1.7_
  
  - [x]* 1.6 Write property test for error mapping type safety
    - **Property 3: Error Mapping Type Safety**
    - **Validates: Requirements 7.1.7**
  
  - [x] 1.7 Complete backend configuration in config.py
    - Add all 18 missing configuration fields with proper types
    - Remove `extra = "allow"` from Settings.Config
    - Add Pydantic validation for all fields
    - _Requirements: 7.1.6_
  
  - [x] 1.8 Remove unused imports and variables from App.tsx
    - Remove unused imports: StreamingMessage
    - Remove unused variables: taskId, submitUrl, caretContext, moveCaretLeft, moveCaretRight, clearCaret
    - Remove unused handler: handleDocumentUpload
    - _Requirements: 7.1.8_

- [x] 2. Checkpoint - Verify bug fixes
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Add Session Management UI
  - [x] 3.1 Create SessionControls component
    - Add "New Session" button
    - Add "Delete Session" button with confirmation dialog
    - Style buttons using design system tokens
    - _Requirements: 7.1.3, 7.1.4_
  
  - [x] 3.2 Create SessionSwitcher component
    - Display all sessions with document name and timestamp
    - Highlight current session
    - Handle session switch on click
    - _Requirements: 7.1.5_
  
  - [x] 3.3 Integrate SessionControls into ChatInterface
    - Add SessionControls to ChatInterface header
    - Wire up handlers: onNewSession, onDeleteSession, onSessionSwitch
    - _Requirements: 7.1.3, 7.1.4, 7.1.5_

- [x] 4. Implement Cost Tracking
  - [x] 4.1 Create CostTracker component
    - Fetch session stats from `/api/chat/sessions/{id}/stats`
    - Display tokens, cost, and cache hit rate
    - Use design system tokens for styling
    - _Requirements: 8.8_
  
  - [x] 4.2 Add session stats endpoint to backend
    - Implement `GET /api/chat/sessions/{session_id}/stats`
    - Return total_tokens, cached_tokens, total_cost_usd
    - _Requirements: 8.8_
  
  - [x] 4.3 Integrate CostTracker into ChatInterface
    - Add CostTracker to chat header
    - Update after each message
    - _Requirements: 8.8_

- [x] 5. Implement Loading States
  - [x] 5.1 Create skeleton components
    - SessionListSkeleton: Match session list item design
    - DocumentSkeleton: Match DocumentViewer layout
    - MessageListSkeleton: Match MessageList item design
    - Use design system tokens for colors and animations
    - _Requirements: 9.1, 9.2_
  
  - [x] 5.2 Update ThinkingIndicator with contextual messages
    - Add message prop to ThinkingIndicator
    - Support variations: "Thinking...", "Gathering thoughts...", "Analyzing document...", "Searching context..."
    - Use design system tokens for styling
    - _Requirements: 9.3_
  
  - [x]* 5.3 Write property test for ThinkingIndicator message display
    - **Property 5: ThinkingIndicator Message Display**
    - **Validates: Requirements 9.3**
  
  - [x] 5.4 Create UploadProgress component
    - Show stages: uploading (with progress bar), processing (spinner), ready (checkmark), failed (X icon + error)
    - Use design system tokens for colors
    - _Requirements: 9.4_
  
  - [x] 5.5 Add visual feedback to MessageInput
    - Character count: "X / 6000" with color coding
    - Disabled state styling
    - Sending state with spinner
    - Error state with red border
    - _Requirements: 9.5_
  
  - [x] 5.6 Implement toast notification system
    - Create ToastProvider and ToastContext
    - Support success, error, info types
    - Auto-dismiss after 3 seconds
    - Dismissible by clicking X
    - Stack vertically
    - Use design system tokens
    - _Requirements: 9.6, 9.7_
  
  - [x] 5.7 Integrate loading states into App.tsx
    - Show skeletons during loading
    - Show toasts for events: upload success, session created/deleted, errors
    - _Requirements: 9.1, 9.6_

- [x] 6. Checkpoint - Verify loading states
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Enhance DocumentViewer with Markdown
  - [x] 7.1 Install markdown dependencies
    - Install react-markdown, remark-gfm, react-syntax-highlighter
    - Install type definitions
    - _Requirements: 9.5.2.3_
  
  - [x] 7.2 Integrate react-markdown into DocumentViewer
    - Replace line-by-line parsing with ReactMarkdown
    - Add remarkGfm plugin for GitHub-flavored markdown
    - Use design system markdown styles
    - _Requirements: 9.5.2.1_
  
  - [x] 7.3 Add syntax highlighting for code blocks
    - Use react-syntax-highlighter with vscDarkPlus theme
    - Detect language from code fence
    - Apply golden border-left accent using design tokens
    - _Requirements: 9.5.2.2_
  
  - [x]* 7.4 Write property test for markdown rendering
    - **Property 6: Markdown Rendering Completeness**
    - **Validates: Requirements 9.5.2.1**
  
  - [x] 7.5 Update DocumentViewer layout
    - Use 64px margin from design system (spacing['3xl'])
    - Eliminate hardcoded pixel values
    - _Requirements: 9.5.1.1, 9.5.1.2_

- [x] 8. Implement Basic Focus Caret
  - [x] 8.1 Create FocusCaret component
    - Display caret at paragraph level
    - Use golden glow from design system (accents.highlight)
    - Position based on paragraph index
    - _Requirements: 9.5.3.1_
  
  - [x] 8.2 Add keyboard navigation to DocumentViewer
    - Arrow keys: Move caret between paragraphs
    - Home/End: Jump to start/end
    - PageUp/PageDown: Scroll by page
    - _Requirements: 9.5.4.1_
  
  - [x]* 8.3 Write property test for focus caret navigation
    - **Property 7: Focus Caret Navigation**
    - **Validates: Requirements 9.5.3.1**
  
  - [x] 8.4 Implement scroll-to-chunk with highlight
    - Smooth scroll with offset for header
    - Highlight target chunk with fade-out animation (5 seconds)
    - Use design system animation tokens
    - _Requirements: 9.5.4.2_

- [x] 9. Implement Source Attribution
  - [x] 9.1 Create SourceAttribution component
    - Display clickable source links
    - Format: "Source: [Chunk 3, Page 5]"
    - Use design system tokens for styling
    - _Requirements: 15.3.1_
  
  - [x] 9.2 Integrate SourceAttribution into MessageList
    - Render sources from message.metadata.sources
    - Wire up click handler to scroll DocumentViewer
    - _Requirements: 15.3.1_
  
  - [x]* 9.3 Write property test for source attribution rendering
    - **Property 8: Source Attribution Rendering**
    - **Validates: Requirements 15.3.1**

- [x] 10. Checkpoint - Verify DocumentViewer enhancements
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement Welcome Screen
  - [x] 11.1 Create WelcomeMessage component
    - Display title: "What would you like to explore today?"
    - Display subtitle: "Ask me about the content, or just start exploring"
    - Use design system typography tokens
    - _Requirements: 15.5.1_
  
  - [x] 11.2 Update App.tsx initial layout
    - Show welcome screen when no document and no session
    - Center UploadZone vertically and horizontally
    - Remove split-pane layout until document uploaded
    - _Requirements: 15.5.2_

- [x] 12. Enhance UploadZone
  - [x] 12.1 Create upload tabs (File/URL/GitHub)
    - Add tab UI: File | URL | GitHub
    - Show appropriate input based on selection
    - Use design system tokens for styling
    - _Requirements: 15.4.2_
  
  - [x] 12.2 Integrate UrlInput component
    - Wire up existing UrlInput component to tab system
    - _Requirements: 15.4.2_
  
  - [x] 12.3 Implement GitHub repository ingestion
    - Create GitHubInput component
    - Validate GitHub URL format
    - Fetch via gitingest API (https://gitingest.com/api/ingest)
    - Handle errors: invalid URL, private repo, rate limits
    - _Requirements: 15.4.3_
  
  - [x]* 12.4 Write property test for GitHub URL validation
    - **Property 9: GitHub URL Validation**
    - **Validates: Requirements 15.4.3**
  
  - [x] 12.5 Fix UploadZone padding
    - Change from 32px to 48px using design system tokens
    - _Requirements: 15.4.1_

- [x] 13. Implement Security Measures
  - [x] 13.1 Add input sanitization
    - Install DOMPurify
    - Sanitize markdown before rendering
    - Validate URLs before opening
    - _Requirements: 14.2_
  
  - [x]* 13.2 Write property test for input sanitization
    - **Property 10: Input Sanitization Safety**
    - **Validates: Requirements 14.2**
  
  - [x] 13.3 Add API response validation
    - Install zod
    - Create schemas for all API responses
    - Validate responses before using
    - Handle malformed responses gracefully
    - _Requirements: 14.4_
  
  - [ ]* 13.4 Write property test for API response validation
    - **Property 11: API Response Validation**
    - **Validates: Requirements 14.4**
  
  - [x] 13.5 Add HTTPS enforcement
    - Warn if using HTTP in production
    - Update vite.config.ts to enforce HTTPS in production
    - _Requirements: 14.3_
  
  - [x] 13.6 Verify no API keys in frontend
    - Audit code for hardcoded API keys
    - Ensure no keys in localStorage
    - _Requirements: 14.1_

- [ ] 14. Optimize API Usage
  - [x] 14.1 Configure Voyage AI optimization
    - Use voyage-4-lite model
    - Implement batch embedding (up to 128 chunks)
    - Verify ChromaDB caching (never re-embed)
    - _Requirements: 8.6_
  
  - [ ]* 14.2 Write property test for embedding cache consistency
    - **Property 4: Embedding Cache Consistency**
    - **Validates: Requirements 8.6**
  
  - [x] 14.3 Configure DeepSeek optimization
    - Structure system prompts with static prefix for caching
    - Enable streaming for all responses
    - Log cache hit rate from response metadata
    - _Requirements: 8.7_

- [ ] 15. Update Typography and Spacing
  - [x] 15.1 Verify font loading in index.html
    - Ensure Inter Variable, iA Writer Quattro, JetBrains Mono are loaded
    - Add preconnect for performance
    - _Requirements: 15.1.1_
  
  - [x] 15.2 Replace hardcoded spacing in critical components
    - App.tsx: Use spacing tokens from design system
    - ChatInterface.tsx: Use spacing tokens
    - MessageList.tsx: Use spacing tokens
    - UploadZone.tsx: Use spacing tokens
    - _Requirements: 15.2.1_
  
  - [x] 15.3 Replace hardcoded colors in MessageList
    - Use backgrounds.panel, text.primary from design system
    - _Requirements: 15.3.2_

- [x] 16. Final Checkpoint - Integration and Testing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Documentation and Configuration
  - [x] 17.1 Update README.md with API key setup
    - Document where to obtain Voyage AI API key
    - Document where to obtain DeepSeek API key
    - Document how to add keys to backend/.env
    - Document how to verify keys are working
    - _Requirements: 8.5_
  
  - [x] 17.2 Update backend/.env with API keys
    - Add VOYAGE_API_KEY placeholder
    - Add DEEPSEEK_API_KEY placeholder
    - _Requirements: 8.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All styling uses design system tokens from frontend/src/design-system/
