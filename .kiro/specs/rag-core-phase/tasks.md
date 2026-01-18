# Tasks: Phase 2 - RAG Core

## Overview

This task list implements the RAG Core functionality for Iubar, enabling contextual AI conversations about uploaded documents. Tasks are organized by dependency layers and atomized for incremental development.

---

## 1. Database Schema & Models (Foundation Layer)

### 1.1 Create chat_sessions table migration
- [x] Create SQLite migration script for `chat_sessions` table
- [x] Add columns: id, document_id, created_at, updated_at, metadata
- [x] Add foreign key constraint to documents table
- [x] Add indexes on document_id and updated_at
- [x] Test migration runs successfully

### 1.2 Create chat_messages table migration
- [x] Create SQLite migration script for `chat_messages` table
- [x] Add columns: id, session_id, role, content, created_at, metadata
- [x] Add foreign key constraint with CASCADE delete
- [x] Add indexes on session_id and created_at
- [x] Test migration runs successfully

### 1.3 Create document_summaries table migration
- [x] Create SQLite migration script for `document_summaries` table
- [x] Add columns: document_id, summary_text, summary_embedding (BLOB), created_at
- [x] Add foreign key constraint with CASCADE delete
- [x] Test migration runs successfully

### 1.4 Create Pydantic models for chat
- [x] Create `ChatSession` model in `backend/app/models/chat.py`
- [x] Create `ChatMessage` model with role validation
- [x] Create request/response schemas in `backend/app/models/schemas.py`
- [x] Add validation for message length (6000 chars max)
- [x] Test model validation

---

## 2. Core Services (Service Layer - Part 1)

### 2.1 Implement InputValidator service
- [x] Create `backend/app/services/input_validator.py`
- [x] Implement message validation with 6000 char limit
- [x] Implement prompt injection pattern detection
- [x] Implement control character sanitization
- [x] Implement focus context validation
- [x] Implement UUID format validation
- [x] Write unit tests for all validation methods

**Property-Based Test**: Validates: Requirements 13.1 (Input validation)
- Property: All validated inputs are safe (no control chars, no injection patterns)
- Property: Message length never exceeds MAX_MESSAGE_LENGTH
- Property: All UUIDs match regex pattern

### 2.2 Implement SessionManager service
- [x] Create `backend/app/services/session_manager.py`
- [x] Implement create_session method
- [x] Implement get_session method with message count
- [x] Implement update_session_metadata method
- [x] Implement delete_session method
- [x] Implement get_session_stats method
- [x] Implement check_spending_limit method ($5.00 default)
- [x] Implement periodic cleanup background task
- [x] Write unit tests for all methods

**Property-Based Test**: Validates: Requirements 1.1-1.7 (Session management)
- Property: Expired sessions are deleted by cleanup task
- Property: Active sessions are preserved
- Property: Spending limit enforcement works correctly

### 2.3 Implement ResponseCache service
- [x] Create `backend/app/services/response_cache.py`
- [x] Implement LRU cache with OrderedDict
- [x] Implement compute_key method with SHA256 hashing
- [x] Implement get method with TTL expiration
- [x] Implement set method with LRU eviction
- [x] Implement clear method
- [x] Implement invalidate_document method
- [x] Implement get_stats method
- [x] Add async logging for cache hits
- [x] Write unit tests for cache operations

**Property-Based Test**: Validates: Requirements 7.1-7.9 (Response caching)
- Property: Cache size never exceeds max_size
- Property: Expired entries are not returned
- Property: Same query produces same cache key

### 2.4 Implement RateLimiter service
- [x] Create `backend/app/services/rate_limiter.py`
- [x] Implement check_query_limit method (100/hour)
- [x] Implement check_stream_limit method (5 concurrent)
- [x] Implement acquire_stream method
- [x] Implement release_stream method
- [x] Implement periodic cleanup background task
- [x] Write unit tests for rate limiting


**Property-Based Test**: Validates: Requirements 14.7-14.8 (Rate limiting)
- Property: Query count never exceeds limit per hour
- Property: Concurrent streams never exceed limit
- Property: Old query timestamps are cleaned up

### 2.5 Implement CircuitBreaker service
- [x] Create `backend/app/services/circuit_breaker.py`
- [x] Implement CircuitState enum (CLOSED, OPEN, HALF_OPEN)
- [x] Implement call method with state checking
- [x] Implement _on_success method
- [x] Implement _on_failure method
- [x] Implement get_state method
- [x] Write unit tests for circuit breaker states


**Property-Based Test**: Validates: Design (Circuit breaker pattern)
- Property: Circuit opens after failure_threshold consecutive failures
- Property: Circuit transitions to half-open after recovery timeout
- Property: Circuit closes after success_threshold successes in half-open

---

## 3. AI Integration Services (Service Layer - Part 2)

### 3.1 Implement DeepSeekClient service
- [x] Create `backend/app/services/deepseek_client.py`
- [x] Initialize AsyncOpenAI client with config
- [x] Implement stream_chat method with retry logic
- [x] Implement _stream_chat_internal method
- [x] Add timeout handling (30s configurable)
- [x] Add exponential backoff for 5xx errors
- [x] Add rate limit handling (429) with 60s wait
- [x] Integrate circuit breaker
- [x] Add error sanitization (no 401 details exposed)
- [x] Write unit tests with mocked API


**Property-Based Test**: Validates: Requirements 5.1-5.10 (DeepSeek integration)
- Property: Retries occur for transient failures (429, 5xx)
- Property: Timeout is enforced
- Property: User-friendly errors are returned (no internal details)

### 3.2 Implement DocumentSummaryService
- [x] Create `backend/app/services/document_summary.py`
- [x] Implement generate_summary method using DeepSeek
- [x] Implement get_summary method
- [x] Implement get_all_summaries method
- [x] Implement _store_summary method with BLOB encoding
- [x] Add fallback for missing summaries
- [x] Write unit tests for summary generation


**Property-Based Test**: Validates: Requirements 3.9-3.11 (Document summaries)
- Property: Summary text never exceeds 500 characters
- Property: Embedding dimensions are always 512
- Property: Summaries are stored and retrieved correctly

### 3.3 Implement RAGService - Part 1 (Retrieval)
- [x] Create `backend/app/services/rag_service.py`
- [x] Implement retrieve_context method
- [x] Implement _select_relevant_documents with fallback
- [x] Implement _apply_focus_boost method
- [x] Implement _enforce_token_budget method (8000 tokens max)
- [x] Implement _cosine_similarity helper
- [x] Add async logging with task tracking
- [x] Write unit tests for retrieval logic


**Property-Based Test**: Validates: Requirements 3.1-3.8 (Context retrieval)
- Property: All retrieved chunks have similarity >= threshold
- Property: Total tokens never exceed max_tokens
- Property: Chunks are sorted by similarity (descending)
- Property: Focus boost is applied correctly

### 3.4 Implement RAGService - Part 2 (Generation)
- [x] Implement generate_response method with streaming
- [x] Implement _construct_prompt method
- [x] Implement _get_system_prompt method
- [x] Implement _calculate_cost method
- [x] Add streaming error handling (try/except with SSE error events)
- [x] Add timeout error handling
- [x] Add cache integration
- [x] Add async logging for errors
- [x] Write unit tests for generation logic


**Property-Based Test**: Validates: Requirements 5.1-5.10, 6.1-6.10 (LLM integration & streaming)
- Property: Streaming errors are sent as SSE error events
- Property: Partial responses are included in error events
- Property: Cost calculation is accurate

### 3.5 Implement StructuredLogger
- [x] Create `backend/app/core/logging_config.py`
- [x] Implement StructuredLogger class with JSON formatting
- [x] Implement info, warning, error methods
- [x] Add timestamp and level to all log entries
- [x] Write unit tests for logging


---

## 4. API Endpoints (API Layer)

### 4.1 Implement POST /api/chat/sessions
- [ ] Create `backend/app/api/chat.py`
- [ ] Implement create_session endpoint
- [ ] Add input validation
- [ ] Add document existence check
- [ ] Return session details within 200ms
- [ ] Add error handling (404 for missing document)
- [ ] Write integration tests


### 4.2 Implement GET /api/chat/sessions
- [ ] Implement list_sessions endpoint
- [ ] Return all sessions with metadata
- [ ] Add pagination support (optional)
- [ ] Write integration tests


### 4.3 Implement GET /api/chat/sessions/{id}
- [ ] Implement get_session endpoint
- [ ] Return session with message history
- [ ] Limit to 50 most recent messages
- [ ] Add error handling (404 for missing session)
- [ ] Write integration tests


### 4.4 Implement DELETE /api/chat/sessions/{id}
- [ ] Implement delete_session endpoint
- [ ] Verify cascade delete works for messages
- [ ] Add error handling (404 for missing session)
- [ ] Write integration tests


### 4.5 Implement GET /api/chat/sessions/{id}/stats
- [ ] Implement get_session_stats endpoint
- [ ] Return message count, tokens, cost, cache hit rate
- [ ] Add error handling (404 for missing session)
- [ ] Write integration tests


### 4.6 Implement POST /api/chat/sessions/{id}/messages (Streaming)
- [ ] Implement send_message endpoint with SSE
- [ ] Add input validation (message + focus_context)
- [ ] Add rate limiting checks
- [ ] Integrate RAGService for retrieval and generation
- [ ] Stream token events
- [ ] Stream source events
- [ ] Stream done event with metadata
- [ ] Stream error events on failures
- [ ] Save message to database after streaming
- [ ] Handle client disconnect gracefully
- [ ] Add 60s streaming timeout
- [ ] Write integration tests with SSE client


**Property-Based Test**: Validates: Requirements 6.1-6.10 (Streaming)
- Property: All SSE events follow correct format
- Property: Error events are sent on failures
- Property: Messages are saved after streaming completes

### 4.7 Implement GET /api/chat/sessions/{id}/messages
- [ ] Implement get_messages endpoint
- [ ] Add pagination (limit, offset)
- [ ] Return messages ordered by created_at ASC
- [ ] Write integration tests


### 4.8 Implement POST /api/cache/clear
- [ ] Implement clear_cache endpoint
- [ ] Add admin-only check (optional for MVP)
- [ ] Return count of cleared entries
- [ ] Write integration tests


---

## 5. Frontend Components (UI Layer - Part 1)

### 5.1 Create ChatInterface component
- [ ] Create `frontend/src/components/chat/ChatInterface.tsx`
- [ ] Implement split-pane layout (70/30 default)
- [ ] Add resizable border with drag handling
- [ ] Add document pane collapse/expand
- [ ] Persist pane width to localStorage
- [ ] Enforce minimum widths (40% doc, 20% chat)
- [ ] Write component tests


### 5.2 Create MessageList component
- [ ] Create `frontend/src/components/chat/MessageList.tsx`
- [ ] Display user and assistant messages
- [ ] Auto-scroll to latest message
- [ ] Handle empty state
- [ ] Write component tests


### 5.3 Create MessageInput component
- [ ] Create `frontend/src/components/chat/MessageInput.tsx`
- [ ] Add text input with 6000 char limit
- [ ] Add send button
- [ ] Handle Enter key to send
- [ ] Disable during streaming
- [ ] Write component tests


### 5.4 Create StreamingMessage component
- [ ] Create `frontend/src/components/chat/StreamingMessage.tsx`
- [ ] Display streaming tokens as they arrive
- [ ] Show thinking indicator during streaming
- [ ] Display source attribution after completion
- [ ] Handle partial responses on errors
- [ ] Write component tests


### 5.5 Create ThinkingIndicator component
- [ ] Create `frontend/src/components/chat/ThinkingIndicator.tsx`
- [ ] Implement pulsing glow effect (golden #D4A574)
- [ ] Animate opacity 0.5 → 1.0 with 1.5s cycle
- [ ] Write component tests


### 5.6 Create SourceAttribution component
- [ ] Create `frontend/src/components/chat/SourceAttribution.tsx`
- [ ] Display individual source links
- [ ] Handle click to scroll document viewer
- [ ] Highlight referenced chunk
- [ ] Place focus caret at chunk start
- [ ] Write component tests


---

## 6. Frontend Components (UI Layer - Part 2)

### 6.1 Create DocumentViewer component
- [ ] Create `frontend/src/components/document/DocumentViewer.tsx`
- [ ] Render Markdown with syntax highlighting
- [ ] Support independent scrolling
- [ ] Handle chunk highlighting on source click
- [ ] Integrate focus caret
- [ ] Write component tests


### 6.2 Create FocusCaret component
- [ ] Create `frontend/src/components/document/FocusCaret.tsx`
- [ ] Implement letter-level glow (anchor at 40% of word)
- [ ] Add click-to-place functionality
- [ ] Add keyboard navigation (arrow keys)
- [ ] Extract surrounding context (±150 chars)
- [ ] Fade in/out animations (200ms/150ms)
- [ ] Write component tests


### 6.3 Create ChunkHighlight component
- [ ] Create `frontend/src/components/document/ChunkHighlight.tsx`
- [ ] Highlight chunk with background color (#253550)
- [ ] Scroll to chunk on source link click
- [ ] Write component tests


---

## 7. Frontend Services & Hooks

### 7.1 Create chat API client
- [ ] Create `frontend/src/services/chat-api.ts`
- [ ] Implement createSession method
- [ ] Implement getSessions method
- [ ] Implement getSession method
- [ ] Implement deleteSession method
- [ ] Implement getSessionStats method
- [ ] Add error handling
- [ ] Write unit tests


### 7.2 Create SSE client
- [ ] Create `frontend/src/services/sse-client.ts`
- [ ] Implement SSE connection handling
- [ ] Parse token, source, done, error events
- [ ] Handle connection errors
- [ ] Handle reconnection logic
- [ ] Write unit tests


### 7.3 Create useChatSession hook
- [ ] Create `frontend/src/hooks/useChatSession.ts`
- [ ] Manage session state
- [ ] Handle session creation
- [ ] Handle session deletion
- [ ] Fetch session stats
- [ ] Write hook tests


### 7.4 Create useStreamingMessage hook
- [ ] Create `frontend/src/hooks/useStreamingMessage.ts`
- [ ] Manage SSE connection
- [ ] Accumulate streaming tokens
- [ ] Handle error events
- [ ] Handle done events
- [ ] Write hook tests


### 7.5 Create useFocusCaret hook
- [ ] Create `frontend/src/hooks/useFocusCaret.ts`
- [ ] Manage focus caret position
- [ ] Handle keyboard navigation
- [ ] Extract surrounding context
- [ ] Write hook tests


### 7.6 Create TypeScript types
- [ ] Create `frontend/src/types/chat.ts`
- [ ] Define ChatSession interface
- [ ] Define ChatMessage interface
- [ ] Define FocusContext interface
- [ ] Define SSE event types
- [ ] Define API response types


---

## 8. Integration & Testing

### 8.1 End-to-end RAG flow test
- [ ] Write test: create session → send message → receive streaming response
- [ ] Verify source attribution is correct
- [ ] Verify cost tracking is accurate
- [ ] Test with missing document summaries (fallback)


### 8.2 Focus caret integration test
- [ ] Write test: send query with focus context
- [ ] Verify chunk boosting is applied
- [ ] Verify context is included in prompt
- [ ] Verify focus context is stored in metadata


### 8.3 Cache integration test
- [ ] Write test: send identical queries
- [ ] Verify cache hit on second query
- [ ] Verify cost savings (0 for cached)
- [ ] Test cache invalidation on document update


### 8.4 Error handling integration test
- [ ] Test DeepSeek API failures during streaming
- [ ] Test network timeouts
- [ ] Test invalid input handling
- [ ] Test spending limit enforcement
- [ ] Verify user-friendly error messages


### 8.5 Rate limiting integration test
- [ ] Test concurrent stream limits
- [ ] Test queries per hour limits
- [ ] Test backpressure handling
- [ ] Verify 429 responses with retry-after


---

## 9. Configuration & Documentation

### 9.1 Update environment variables
- [ ] Add all new env vars to `.env.template`
- [ ] Document each variable with description
- [ ] Set sensible defaults
- [ ] Update README with configuration guide


### 9.2 Update API documentation
- [ ] Add all chat endpoints to OpenAPI/Swagger
- [ ] Document SSE event formats
- [ ] Add example requests/responses
- [ ] Document error codes


### 9.3 Update README
- [ ] Document Phase 2 features
- [ ] Add setup instructions for new services
- [ ] Add usage examples
- [ ] Document testing procedures


---

## Dependency Graph

```
Layer 1 (Foundation):
  1.1 → 1.2 → 1.3 → 1.4

Layer 2 (Core Services):
  1.4 → 2.1 → 2.2, 2.3, 2.4, 2.5

Layer 3 (AI Services):
  2.5 → 3.1
  3.1 → 3.2
  2.3, 3.2 → 3.3
  3.1, 3.3 → 3.4
  3.4 → 3.5

Layer 4 (API):
  2.2 → 4.1, 4.2, 4.3, 4.4, 4.5
  2.4, 3.4 → 4.6
  4.6 → 4.7
  2.3 → 4.8

Layer 5 (Frontend Components):
  4.1-4.8 → 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
  5.1-5.6 → 6.1, 6.2, 6.3

Layer 6 (Frontend Services):
  4.1-4.8 → 7.1, 7.2
  7.1, 7.2 → 7.3, 7.4, 7.5
  7.3, 7.4, 7.5 → 7.6

Layer 7 (Integration):
  All previous → 8.1, 8.2, 8.3, 8.4, 8.5

Layer 8 (Documentation):
  All previous → 9.1, 9.2, 9.3
```

---

## Notes

- All tasks include unit tests unless marked as integration tests
- Property-based tests are marked with **Property-Based Test** annotation
- Estimated times are for experienced developers; adjust as needed
- Tasks can be parallelized within the same layer if dependencies allow
- Integration tests should be run after completing each layer
