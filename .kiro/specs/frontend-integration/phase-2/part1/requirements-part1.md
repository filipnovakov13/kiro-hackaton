# Requirements Document - Phase 2 Part 1: Essential Functionality

## Introduction

This document defines Phase 2 Part 1 requirements for the Frontend Integration of Iubar. Part 1 focuses on completing essential functionality gaps from Phase 1 and ensuring the application runs with all core features specified in the PRD.

Part 1 covers:
1. Critical bug fixes and missing UI features from Phase 1
2. API key configuration for external services
3. Basic loading states and visual feedback
4. Core DocumentViewer enhancements for MVP functionality
5. Essential visual identity fixes for usable interface

## Glossary

- **Voyage_AI**: Embedding service provider for document vectorization
- **DeepSeek**: LLM service provider for AI chat responses
- **Prompt_Caching**: DeepSeek feature that reduces costs by 90% for repeated prompt prefixes
- **Loading_Skeleton**: Animated placeholder UI matching actual component layout
- **WCAG_2.1_AA**: Web Content Accessibility Guidelines level AA compliance
- **CSP**: Content Security Policy for XSS protection

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
   - Remove unused handler: `handleDocumentUpload`
   - Note: `handleNewSession`, `handleSessionSwitch`, `handleDeleteSession` are connected to UI in criteria #3-5

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
8. THE ChatInterface SHALL display cost tracking information:
   - Fetch session stats via `GET /api/chat/sessions/{id}/stats`
   - Display in chat header: "Tokens: X | Cost: $Y | Cache: Z%"
   - Update after each message
   - Use small, subtle typography (secondary text color)
   - Position: Top-right of chat panel

### Requirement 9: Loading States and Visual Feedback

**User Story:** As a user, I want clear visual feedback for all async operations, so that I know the application is working and not frozen.

#### Acceptance Criteria

1. THE App.tsx SHALL display loading skeletons (not spinners) for all loading states:
   - Session list loading: Skeleton cards matching session list item design
   - Document loading: Skeleton matching DocumentViewer layout (headings, paragraphs)
   - Message history loading: Skeleton matching MessageList item design
2. ALL loading skeletons SHALL follow visual-identity.md design direction:
   - Use background color: #1A2332 (bgPanel)
   - Use shimmer animation: subtle gradient sweep
   - Match actual component dimensions
   - Transition smoothly to real content (fade in)
3. THE ThinkingIndicator SHALL provide contextual feedback while waiting for streaming:
   - Support contextual messages via prop: `<ThinkingIndicator message="..." />`
   - Message variations: "Thinking...", "Gathering thoughts...", "Analyzing document...", "Searching context..."
   - Animation: Three pulsing dots with golden glow (#D4A574)
   - Timing: 1.5s cycle with staggered delays (0s, 0.2s, 0.4s)
   - Position: Below last message in MessageList
   - Remove when first streaming token arrives
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
6. THE App.tsx SHALL show toast notifications for:
   - Document upload success: "Document ready!"
   - Session created: "New conversation started"
   - Session deleted: "Conversation deleted"
   - Error occurred: Error message from backend
7. ALL toast notifications SHALL:
   - Auto-dismiss after 3 seconds
   - Be dismissible by clicking X button
   - Stack vertically if multiple appear
   - Follow visual-identity.md design (dark background, white text)

### Requirement 9.5: DocumentViewer Essential Enhancement

**User Story:** As a user, I want a functional document viewer with markdown support and basic focus capabilities, so that I can read and interact with my documents.

**Context:** This requirement covers essential DocumentViewer functionality needed for MVP. Advanced features (letter-level rendering, virtualization, advanced navigation) are deferred to Part 2.

#### Acceptance Criteria

##### 9.5.1 Layout & Spacing
1. THE DocumentViewer container SHALL use 64px margin (not padding on content)
2. THE DocumentViewer SHALL eliminate hardcoded pixel values, using spacing tokens from layout.ts

##### 9.5.2 Markdown & Content Rendering
1. THE DocumentViewer SHALL integrate react-markdown with full markdown support:
   - Support: headings, paragraphs, lists, links, blockquotes, tables, emphasis, strong
   - Use markdown.ts style definitions for consistent styling
   - Replace simplified line-by-line parsing
2. THE DocumentViewer SHALL implement syntax highlighting for code blocks:
   - Use `react-syntax-highlighter` with dark theme
   - Detect language from code fence (```python, ```javascript, etc.)
   - Apply golden border-left accent as specified
   - Fallback to plain text if language unknown
3. THE DocumentViewer SHALL install required dependencies:
   - `react-markdown`
   - `remark-gfm`
   - `react-syntax-highlighter`

##### 9.5.3 Basic Focus Caret Functionality
1. THE DocumentViewer SHALL support basic focus caret placement:
   - Click in document to place caret at paragraph level
   - Use arrow keys to move caret between paragraphs
   - Display caret with golden glow at paragraph level
   - Note: Letter-level precision is deferred to Part 2

##### 9.5.4 Basic Navigation
1. THE DocumentViewer SHALL support basic keyboard navigation:
   - Arrow keys: Move focus caret between paragraphs
   - Home/End: Jump to start/end
   - Page Up/Down: Scroll by page
2. THE DocumentViewer SHALL implement smooth scroll-to-position:
   - Smooth scroll with offset for header
   - Highlight target chunk with fade-out animation (5 seconds)

### Requirement 15: Essential Visual Identity Fixes

**User Story:** As a user, I want the application to have a consistent, usable interface that follows basic design principles, so that I can navigate and use the application effectively.

**Context:** This requirement covers essential visual identity fixes needed for a usable MVP. Advanced polish (typography system, micro-interactions, advanced animations) is deferred to Part 2.

#### Acceptance Criteria

##### 15.1 Basic Typography
1. THE index.html SHALL load basic font families:
   - Inter Variable (400, 500, 600 weights) for UI
   - JetBrains Mono (400 weight) for code blocks
   - Use Google Fonts with preconnect for performance
2. THE typography.ts SHALL use loaded fonts with system fallbacks

##### 15.2 Spacing Consistency
1. CRITICAL components SHALL eliminate hardcoded pixel values:
   - App.tsx: Use spacing tokens from layout.ts
   - ChatInterface.tsx: Use spacing tokens
   - MessageList.tsx: Use spacing tokens
   - UploadZone.tsx: Use spacing tokens

##### 15.3 Chat Message Basics
1. THE MessageList SHALL render source attribution links:
   - Data exists in `message.metadata.sources`
   - Display as clickable links below message content
   - Use SourceAttribution component (already exists)
   - Link format: "Source: [Chunk 3, Page 5]"
   - Click handler: Scroll DocumentViewer to chunk and highlight
2. THE MessageList SHALL use design system tokens for colors:
   - Replace hardcoded colors with `backgrounds.panel`, `text.primary`

##### 15.4 Upload Area Basics
1. THE UploadZone SHALL fix padding:
   - Current: 32px (p-8 in Tailwind)
   - Required: 48px (p-12 in Tailwind)
2. THE UploadZone SHALL integrate URL input into main upload flow:
   - UrlInput component exists but not integrated
   - Add tab/toggle: "File" | "URL" | "GitHub"
   - Show appropriate input based on selection
3. THE UploadZone SHALL add GitHub repository ingestion:
   - Use gitingest service (https://gitingest.com) for repo → text conversion
   - Input: GitHub repo URL
   - Process: Fetch via gitingest API, treat as text document
   - Error handling: Invalid URL, private repo, rate limits

##### 15.5 Welcome Screen
1. THE App.tsx SHALL implement welcome message on first load:
   - Show when no document uploaded and no session exists
   - Text: "What would you like to explore today?"
   - Position: Above UploadZone
   - Typography: H2 style, centered
2. THE App.tsx SHALL adapt initial page to visual-identity.md design:
   - Center UploadZone vertically and horizontally
   - Add subtitle: "Ask me about the content, or just start exploring"
   - Show upload options: PDF | URL | Text | GitHub (as tabs/buttons)
   - Remove split-pane layout until document uploaded

### Requirement 14: Basic Security

**User Story:** As a user, I want my data to be handled securely, so that I can trust the application with my documents.

#### Acceptance Criteria

1. THE App.tsx SHALL NOT store API keys in frontend code or localStorage
2. THE App.tsx SHALL sanitize all user input before rendering:
   - Escape HTML in messages
   - Sanitize markdown to prevent XSS
   - Validate URLs before opening
3. THE App.tsx SHALL use HTTPS for all API requests:
   - Verify VITE_API_BASE_URL uses https:// in production
   - Warn if using http:// in production
4. THE App.tsx SHALL validate all API responses:
   - Check response status codes
   - Validate response schema matches expected types
   - Handle malformed responses gracefully

## Summary

This Phase 2 Part 1 requirements document defines essential functionality needed for the application to run with core PRD features:

- **Requirement 7.1**: Critical bug fixes and missing UI features (session management, backend config, error handling)
- **Requirement 8**: API key configuration and basic optimization
- **Requirement 9**: Essential loading states and visual feedback
- **Requirement 9.5**: Basic DocumentViewer functionality (markdown, basic focus caret)
- **Requirement 15**: Essential visual identity fixes (typography, spacing, welcome screen)
- **Requirement 14**: Basic security measures

Part 1 ensures the application is functional and usable. Part 2 will add optimization, comprehensive testing, accessibility, and polish.

The implementation will follow the requirements-first workflow, proceeding to design.md after approval.
