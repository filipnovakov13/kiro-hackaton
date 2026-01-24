# Task 4.6: POST /api/chat/sessions/{id}/messages (Streaming) - Detailed Breakdown

**Parent Task**: 4.6 Implement POST /api/chat/sessions/{id}/messages (Streaming)  
**Created**: 2026-01-19  
**Status**: Planning Complete  
**Total Estimated Time**: ~3 hours  
**Number of Sub-Tasks**: 9

---

## Overview

This document breaks down the complex streaming endpoint implementation into 9 sequential sub-tasks, each designed to be completed in a single iteration (5-30 minutes). The tasks are ordered by dependency to ensure smooth, incremental progress.

---

## Research Summary

### Existing Components (✅ Ready to Use)

1. **RAGService.generate_response()** - Already implemented
   - Location: `backend/app/services/rag_service.py`
   - Returns: `AsyncGenerator[dict, None]`
   - Yields: `{"event": "token|source|done|error", "data": {...}}`
   - Status: ✅ Fully functional

2. **RateLimiter.check_query_limit()** - Already implemented
   - Location: `backend/app/services/rate_limiter.py`
   - Returns: `bool` (True if under limit, False if exceeded)
   - Status: ✅ Fully functional

3. **SendMessageRequest schema** - Already defined
   - Location: `backend/app/models/schemas.py`
   - Fields: `message: str`, `focus_context: Optional[FocusContext]`
   - Status: ✅ Ready to use

4. **FocusContext schema** - Already defined
   - Location: `backend/app/models/schemas.py`
   - Status: ✅ Ready to use

### Missing Components (⚠️ Need Implementation)

1. **SessionManager.save_message()** - Not implemented
   - Need to add method to save user and assistant messages
   - Must handle message metadata (sources, tokens, cost)

2. **SSE Formatting Helper** - Not implemented
   - FastAPI requires specific SSE format: `event: <type>\ndata: <json>\n\n`
   - Double newline is critical!

3. **StreamingResponse Integration** - Not used yet
   - Need to import from `fastapi.responses`
   - Must set `media_type="text/event-stream"`

### Key Technical Pitfalls

1. **SSE Format Requirements**
   ```
   event: token
   data: {"content": "word"}
   
   ```
   - Must have `event:` line
   - Must have `data:` line with JSON
   - Must end with double newline (`\n\n`)
   - Missing any of these breaks SSE parsing

2. **Client Disconnect Handling**
   - FastAPI raises `asyncio.CancelledError` on disconnect
   - Must catch and handle gracefully
   - Must save partial response with `{"interrupted": true}` metadata

3. **Timeout Handling**
   - Must use `asyncio.wait_for(generator, timeout=60)`
   - Raises `asyncio.TimeoutError` after 60 seconds
   - Must send error event before closing stream

4. **Message Persistence Timing**
   - MUST save messages AFTER streaming completes
   - NOT before streaming starts
   - Prevents orphaned messages if streaming fails

5. **Error Event Format**
   - Errors during streaming must be sent as SSE events
   - Format: `event: error\ndata: {"error": "message"}\n\n`
   - Then close the stream

---

## Sub-Task Breakdown

### 4.6.1: Add save_message Method to SessionManager

**Objective**: Create a method to persist chat messages to the database.

**Scope**:
- Add `save_message()` method to `SessionManager` class
- Handle both user and assistant messages
- Store message metadata (sources, tokens, cost)

**Files to Modify**:
- `backend/app/services/session_manager.py`

**Implementation Details**:
```python
async def save_message(
    self,
    session_id: str,
    role: str,  # "user" or "assistant"
    content: str,
    metadata: Optional[dict] = None
) -> str:
    """Save a message to the database.
    
    Args:
        session_id: Session ID
        role: Message role (user/assistant)
        content: Message content
        metadata: Optional metadata (sources, tokens, cost, interrupted flag)
    
    Returns:
        message_id: UUID of created message
    """
    # Generate message ID
    # Insert into chat_messages table
    # Update session updated_at timestamp
    # Commit transaction
    # Return message_id
```

**Database Schema** (already exists):
```sql
CREATE TABLE chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    message_metadata TEXT,  -- JSON string
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);
```

**Validation**:
- Unit test: Save user message
- Unit test: Save assistant message with metadata
- Unit test: Verify session updated_at is updated
- Unit test: Verify message can be retrieved

**Dependencies**: None

**Estimated Time**: 10-15 minutes

**Completion Criteria**:
- [x] Method implemented
- [x] Unit tests pass
- [x] LSP diagnostics pass

---

### 4.6.2: Create SSE Formatting Helper

**Objective**: Create a helper function to format events in SSE format.

**Scope**:
- Create `format_sse_event()` helper function
- Ensure correct SSE format with double newline

**Files to Modify**:
- `backend/app/api/chat.py` (add helper at module level)

**Implementation Details**:
```python
def format_sse_event(event_type: str, data: dict) -> str:
    """Format data as Server-Sent Event.
    
    Args:
        event_type: Event type (token, source, done, error)
        data: Event data dictionary
    
    Returns:
        Formatted SSE string with double newline
    """
    import json
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
```

**SSE Format Requirements**:
- Line 1: `event: <type>`
- Line 2: `data: <json>`
- Line 3: Empty line (creates `\n\n` at end)

**Validation**:
- Simple test: Verify format matches spec
- Test: Verify JSON serialization works
- Test: Verify double newline present

**Dependencies**: None

**Estimated Time**: 5-10 minutes

**Completion Criteria**:
- [x] Helper function implemented
- [x] Format matches SSE spec exactly
- [x] LSP diagnostics pass

---

### 4.6.3: Create Basic Endpoint Skeleton

**Objective**: Create the POST endpoint with input validation, returning a simple 200 response.

**Scope**:
- Add POST endpoint to chat router
- Validate session exists
- Validate input using SendMessageRequest schema
- Return simple 200 response (no streaming yet)

**Files to Modify**:
- `backend/app/api/chat.py`

**Implementation Details**:
```python
@router.post(
    "/sessions/{session_id}/messages",
    responses={
        404: {"model": ErrorResponse, "description": "Session not found"},
        429: {"model": ErrorResponse, "description": "Rate limit exceeded"},
    },
)
async def send_message(
    session_id: str,
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Send a message and receive streaming response.
    
    Args:
        session_id: Session UUID
        request: Message and optional focus context
        db: Database session
    
    Returns:
        Streaming SSE response (to be implemented)
    """
    # Validate session exists
    session_manager = SessionManager(db)
    session = await session_manager.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail={"error": "Not found", "message": "Session not found"}
        )
    
    # TODO: Add rate limiting
    # TODO: Add RAG integration
    # TODO: Add streaming response
    
    return {"status": "ok"}  # Temporary response
```

**Validation**:
- Integration test: Valid request returns 200
- Integration test: Invalid session returns 404
- Integration test: Invalid message format returns 422

**Dependencies**: None (uses existing schemas)

**Estimated Time**: 15-20 minutes

**Completion Criteria**:
- [x] Endpoint created
- [x] Session validation works
- [x] Input validation works
- [x] Integration tests pass
- [x] LSP diagnostics pass

---

### 4.6.4: Add Rate Limiting Check

**Objective**: Integrate rate limiter to check query limits before processing.

**Scope**:
- Add RateLimiter dependency injection
- Check query limit before processing
- Return 429 if limit exceeded

**Files to Modify**:
- `backend/app/api/chat.py`

**Implementation Details**:
```python
async def send_message(
    session_id: str,
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    # ... session validation ...
    
    # Check rate limit
    rate_limiter = RateLimiter()
    if not await rate_limiter.check_query_limit(session_id):
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit exceeded",
                "message": "Too many queries. Please wait before trying again."
            }
        )
    
    # TODO: Add RAG integration
    # TODO: Add streaming response
    
    return {"status": "ok"}
```

**Validation**:
- Integration test: Request succeeds when under limit
- Integration test: Request fails with 429 when over limit
- Integration test: Rate limit counter increments

**Dependencies**: 4.6.3 (endpoint skeleton)

**Estimated Time**: 10 minutes

**Completion Criteria**:
- [x] Rate limiter integrated
- [x] 429 response on limit exceeded
- [x] Integration tests pass
- [x] LSP diagnostics pass

---

### 4.6.5: Add RAGService Integration (Non-Streaming)

**Objective**: Integrate RAGService to retrieve context and generate response, collecting all events.

**Scope**:
- Add RAGService dependency injection
- Call `retrieve()` to get context
- Call `generate_response()` and collect all events
- Return collected events as JSON (not streaming yet)

**Files to Modify**:
- `backend/app/api/chat.py`

**Implementation Details**:
```python
async def send_message(
    session_id: str,
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    # ... session validation ...
    # ... rate limiting ...
    
    # Initialize RAG service
    rag_service = RAGService(
        vector_store=vector_store,  # Get from dependency
        deepseek_client=deepseek_client,  # Get from dependency
        embedding_service=embedding_service,  # Get from dependency
        response_cache=response_cache,  # Get from dependency
    )
    
    # Retrieve context
    retrieval_result = await rag_service.retrieve(
        query=request.message,
        document_ids=[session["document_id"]] if session["document_id"] else None,
        top_k=5
    )
    
    # Get message history
    messages = await session_manager.get_session_messages(session_id, limit=10)
    message_history = [
        {"role": msg["role"], "content": msg["content"]}
        for msg in messages
    ]
    
    # Generate response (collect all events)
    events = []
    async for event in rag_service.generate_response(
        query=request.message,
        context=retrieval_result,
        session_id=session_id,
        focus_context=request.focus_context.dict() if request.focus_context else None,
        message_history=message_history
    ):
        events.append(event)
    
    # Return collected events (temporary, will stream in next task)
    return {"events": events}
```

**Validation**:
- Integration test: Response contains token events
- Integration test: Response contains source events
- Integration test: Response contains done event
- Integration test: Focus context is passed correctly

**Dependencies**: 4.6.4 (rate limiting)

**Estimated Time**: 20 minutes

**Completion Criteria**:
- [x] RAGService integrated
- [x] Context retrieval works
- [x] Response generation works
- [x] All events collected
- [x] Integration tests pass (12 passed, 4 skipped - API keys required)
- [x] LSP diagnostics pass

---

### 4.6.6: Convert to SSE Streaming Response

**Objective**: Convert the endpoint to stream events using FastAPI's StreamingResponse.

**Scope**:
- Import StreamingResponse from fastapi.responses
- Create async generator that yields formatted SSE events
- Return StreamingResponse with text/event-stream media type

**Files to Modify**:
- `backend/app/api/chat.py`

**Implementation Details**:
```python
from fastapi.responses import StreamingResponse

@router.post(
    "/sessions/{session_id}/messages",
    responses={
        404: {"model": ErrorResponse, "description": "Session not found"},
        429: {"model": ErrorResponse, "description": "Rate limit exceeded"},
    },
)
async def send_message(
    session_id: str,
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a message and receive streaming response."""
    # ... session validation ...
    # ... rate limiting ...
    # ... RAG service setup ...
    
    async def event_generator():
        """Generate SSE events."""
        async for event in rag_service.generate_response(
            query=request.message,
            context=retrieval_result,
            session_id=session_id,
            focus_context=request.focus_context.dict() if request.focus_context else None,
            message_history=message_history
        ):
            # Format as SSE
            event_type = event["event"]
            event_data = event["data"]
            yield format_sse_event(event_type, event_data)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
```

**Validation**:
- Integration test: Response has text/event-stream content type
- Integration test: Events are received in SSE format
- Integration test: Token events stream progressively
- Integration test: Source and done events received

**Dependencies**: 4.6.2 (SSE helper), 4.6.5 (RAG integration)

**Estimated Time**: 20-25 minutes

**Completion Criteria**:
- [x] StreamingResponse implemented
- [x] SSE format correct
- [x] Events stream progressively
- [x] Integration tests pass (5 passed, 2 skipped - API keys required)
- [x] LSP diagnostics pass

---

### 4.6.7: Add Message Persistence After Streaming

**Objective**: Save user and assistant messages to database after streaming completes.

**Scope**:
- Accumulate response text during streaming
- Save user message before streaming
- Save assistant message after streaming completes
- Include metadata (sources, tokens, cost)

**Files to Modify**:
- `backend/app/api/chat.py`

**Implementation Details**:
```python
async def event_generator():
    """Generate SSE events and save messages."""
    # Save user message first
    user_message_id = await session_manager.save_message(
        session_id=session_id,
        role="user",
        content=request.message,
        metadata={
            "focus_context": request.focus_context.dict() if request.focus_context else None
        }
    )
    
    # Accumulate response
    response_text = ""
    sources = []
    metadata = {}
    
    async for event in rag_service.generate_response(...):
        event_type = event["event"]
        event_data = event["data"]
        
        # Accumulate data
        if event_type == "token":
            response_text += event_data["content"]
        elif event_type == "source":
            sources.append(event_data)
        elif event_type == "done":
            metadata = event_data
        
        # Stream event
        yield format_sse_event(event_type, event_data)
    
    # Save assistant message after streaming
    await session_manager.save_message(
        session_id=session_id,
        role="assistant",
        content=response_text,
        metadata={
            "sources": sources,
            "token_count": metadata.get("token_count"),
            "cost_usd": metadata.get("cost_usd"),
            "cached": metadata.get("cached", False)
        }
    )
```

**Validation**:
- Integration test: User message saved before streaming
- Integration test: Assistant message saved after streaming
- Integration test: Metadata includes sources
- Integration test: Metadata includes token count and cost

**Dependencies**: 4.6.1 (save_message), 4.6.6 (streaming)

**Estimated Time**: 15 minutes

**Completion Criteria**:
- [x] User message saved
- [x] Assistant message saved (when streaming completes successfully)
- [x] Metadata persisted
- [x] Integration tests pass (4 passed, 2 skipped - API keys required)
- [x] LSP diagnostics pass

---

### 4.6.8: Add Error Handling (Disconnect, Timeout, Errors)

**Objective**: Handle all error scenarios gracefully with proper SSE error events.

**Scope**:
- Add asyncio.wait_for for 60s timeout
- Catch asyncio.CancelledError for client disconnect
- Catch asyncio.TimeoutError for timeout
- Catch general exceptions during streaming
- Send error events before closing stream
- Save partial responses with interrupted flag

**Files to Modify**:
- `backend/app/api/chat.py`

**Implementation Details**:
```python
async def event_generator():
    """Generate SSE events with error handling."""
    response_text = ""
    sources = []
    metadata = {}
    interrupted = False
    
    try:
        # Save user message
        user_message_id = await session_manager.save_message(...)
        
        # Wrap in timeout
        async def generate_with_timeout():
            async for event in rag_service.generate_response(...):
                event_type = event["event"]
                event_data = event["data"]
                
                # Handle error events from RAG service
                if event_type == "error":
                    yield format_sse_event("error", event_data)
                    return
                
                # Accumulate data
                if event_type == "token":
                    response_text += event_data["content"]
                elif event_type == "source":
                    sources.append(event_data)
                elif event_type == "done":
                    metadata = event_data
                
                yield format_sse_event(event_type, event_data)
        
        # Apply 60s timeout
        async for sse_event in asyncio.wait_for(
            generate_with_timeout(),
            timeout=60.0
        ):
            yield sse_event
    
    except asyncio.CancelledError:
        # Client disconnected
        logger.warning("Client disconnected during streaming", session_id=session_id)
        interrupted = True
        yield format_sse_event("error", {
            "error": "Connection interrupted",
            "partial_response": response_text
        })
    
    except asyncio.TimeoutError:
        # Streaming timeout
        logger.warning("Streaming timeout", session_id=session_id)
        interrupted = True
        yield format_sse_event("error", {
            "error": "Response generation timed out after 60 seconds",
            "partial_response": response_text
        })
    
    except Exception as e:
        # Unexpected error
        logger.error("Error during streaming", error=str(e), session_id=session_id)
        interrupted = True
        yield format_sse_event("error", {
            "error": "An error occurred while generating response",
            "partial_response": response_text
        })
    
    finally:
        # Always save assistant message (even if partial)
        if response_text:
            await session_manager.save_message(
                session_id=session_id,
                role="assistant",
                content=response_text,
                metadata={
                    "sources": sources,
                    "token_count": metadata.get("token_count", 0),
                    "cost_usd": metadata.get("cost_usd", 0.0),
                    "cached": metadata.get("cached", False),
                    "interrupted": interrupted
                }
            )
```

**Validation**:
- Integration test: Client disconnect saves partial response
- Integration test: Timeout sends error event
- Integration test: Timeout saves partial response
- Integration test: General errors send error event
- Integration test: Interrupted flag set in metadata

**Dependencies**: 4.6.7 (message persistence)

**Estimated Time**: 25-30 minutes

**Completion Criteria**:
- [x] Timeout handling works
- [x] Disconnect handling works
- [x] Error events sent correctly
- [x] Partial responses saved
- [x] Integration tests pass
- [x] LSP diagnostics pass

---

### 4.6.9: Comprehensive Integration Tests

**Objective**: Create full integration test suite with SSE streaming client.

**Scope**:
- Test successful streaming flow
- Test rate limiting
- Test session not found
- Test client disconnect (simulated)
- Test error handling
- Test message persistence
- Test focus context
- Test cached responses

**Files to Create**:
- `backend/tests/test_streaming_api_integration.py`

**SSE Testing Approach**:

Based on research and existing codebase patterns, we'll use the **subprocess + httpx.AsyncClient** approach:

1. **Server Setup**: Use subprocess.Popen() to start server (same pattern as existing integration tests)
2. **SSE Client**: Use httpx.AsyncClient with streaming to consume SSE events
3. **Event Parsing**: Parse SSE format line-by-line (event: type, data: json)

**Why This Approach**:
- FastAPI's TestClient doesn't support SSE streaming properly
- Subprocess ensures clean server lifecycle (no hanging threads)
- httpx.AsyncClient natively supports streaming responses
- Matches existing test patterns in `test_chat_api_integration.py`

**SSE Client Implementation**:

```python
import httpx
import json
from typing import List, Dict

async def consume_sse_stream(
    base_url: str,
    session_id: str,
    message: str,
    focus_context: Optional[dict] = None,
    timeout: float = 30.0
) -> List[Dict]:
    """Consume SSE stream from POST /api/chat/sessions/{id}/messages.
    
    Args:
        base_url: Server base URL (e.g., "http://127.0.0.1:8005")
        session_id: Session UUID
        message: User message
        focus_context: Optional focus context
        timeout: Request timeout in seconds
    
    Returns:
        List of parsed SSE events: [{"event": "token", "data": {...}}, ...]
    """
    events = []
    url = f"{base_url}/api/chat/sessions/{session_id}/messages"
    
    payload = {"message": message}
    if focus_context:
        payload["focus_context"] = focus_context
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("POST", url, json=payload) as response:
            # Check status code first
            if response.status_code != 200:
                # For error responses, read body and return
                error_body = await response.aread()
                return [{
                    "event": "http_error",
                    "data": {
                        "status_code": response.status_code,
                        "body": error_body.decode()
                    }
                }]
            
            # Parse SSE stream
            current_event = None
            async for line in response.aiter_lines():
                line = line.strip()
                
                if line.startswith("event:"):
                    current_event = line.split(":", 1)[1].strip()
                
                elif line.startswith("data:"):
                    if current_event:
                        data_str = line.split(":", 1)[1].strip()
                        try:
                            data = json.loads(data_str)
                            events.append({
                                "event": current_event,
                                "data": data
                            })
                        except json.JSONDecodeError:
                            # Malformed JSON in data field
                            events.append({
                                "event": "parse_error",
                                "data": {"raw": data_str}
                            })
                    current_event = None
                
                elif line == "":
                    # Empty line marks end of event
                    pass
    
    return events
```

**Test Cases**:

1. **test_send_message_success**
   - Create session via POST /api/chat/sessions
   - Send message via streaming endpoint
   - Verify SSE events received (token, source, done)
   - Verify response text accumulated correctly
   - Verify messages saved to database

2. **test_send_message_with_focus_context**
   - Create session with document
   - Send message with focus_context
   - Verify focus context passed to RAG service
   - Verify focused chunk has boosted similarity

3. **test_send_message_rate_limit**
   - Create session
   - Exceed rate limit (send 101 messages)
   - Verify 429 response on 101st request

4. **test_send_message_session_not_found**
   - Use invalid/nonexistent session ID
   - Verify 404 response (not SSE stream)

5. **test_send_message_streaming_format**
   - Send message
   - Verify SSE format is correct:
     - Each event has "event:" line
     - Each event has "data:" line with valid JSON
     - Events separated by blank line
   - Verify event types (token, source, done)

6. **test_send_message_saves_messages**
   - Send message
   - Query database directly
   - Verify user message saved before streaming
   - Verify assistant message saved after streaming
   - Verify metadata includes sources, tokens, cost

7. **test_send_message_with_document**
   - Upload document
   - Create session with document_id
   - Send message
   - Verify document context used in response
   - Verify source events reference correct document

8. **test_send_message_cached_response**
   - Send message
   - Send identical message again
   - Verify second response has cached=true in done event
   - Verify cost_usd=0.0 for cached response

9. **test_send_message_error_handling**
   - Mock RAG service to raise error (requires test setup)
   - Verify error event sent via SSE
   - Verify partial response included if any

10. **test_send_message_invalid_input**
    - Send empty message
    - Send message > 10000 chars
    - Verify 422 validation error

11. **test_send_message_concurrent_requests**
    - Send multiple messages concurrently to same session
    - Verify all complete successfully
    - Verify messages saved in correct order

**Server Fixture** (reuse existing pattern):

```python
@pytest.fixture(scope="class")
def running_server():
    """Start the FastAPI server for testing."""
    backend_root = Path(__file__).parent.parent
    sys.path.insert(0, str(backend_root))
    
    server_process = None
    try:
        test_port = 8005  # Use unique port for streaming tests
        
        server_process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(test_port),
                "--log-level",
                "error",
            ],
            cwd=str(backend_root),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        
        # Wait for server to start
        base_url = f"http://127.0.0.1:{test_port}"
        max_attempts = 30
        for attempt in range(max_attempts):
            try:
                response = requests.get(f"{base_url}/health", timeout=1)
                if response.status_code == 200:
                    break
            except requests.exceptions.RequestException:
                pass
            time.sleep(0.1)
        else:
            if server_process:
                server_process.terminate()
            pytest.fail("Server failed to start within timeout")
        
        yield base_url
    
    finally:
        if server_process:
            server_process.terminate()
            try:
                server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server_process.kill()
        
        if str(backend_root) in sys.path:
            sys.path.remove(str(backend_root))
```

**Test Structure**:

```python
"""
Integration tests for streaming chat API endpoint.

Tests POST /api/chat/sessions/{id}/messages with SSE streaming.

Requirements: 6.1-6.7 (Streaming chat)
"""

import pytest
import requests
import subprocess
import time
import sys
import uuid
import json
import httpx
from pathlib import Path
from typing import List, Dict, Optional


class TestStreamingChatAPIIntegration:
    """Integration tests for streaming chat endpoint."""
    
    @pytest.fixture(scope="class")
    def running_server(self):
        # ... (server fixture as shown above)
    
    async def consume_sse_stream(self, ...):
        # ... (SSE client as shown above)
    
    @pytest.mark.asyncio
    async def test_send_message_success(self, running_server):
        # Create session
        response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert response.status_code == 200
        session_id = response.json()["session_id"]
        
        # Send message and consume stream
        events = await self.consume_sse_stream(
            running_server,
            session_id,
            "What is this document about?"
        )
        
        # Verify events
        assert len(events) > 0, "Should receive events"
        
        # Check event types
        event_types = [e["event"] for e in events]
        assert "token" in event_types, "Should have token events"
        assert "done" in event_types, "Should have done event"
        
        # Verify done event has metadata
        done_event = next(e for e in events if e["event"] == "done")
        assert "token_count" in done_event["data"]
        assert "cost_usd" in done_event["data"]
        assert "cached" in done_event["data"]
    
    # ... (other test methods)
```

**Key Testing Considerations**:

1. **Async Tests**: All SSE tests must be async (use `@pytest.mark.asyncio`)
2. **Timeouts**: Set reasonable timeouts (30s) to prevent hanging tests
3. **Error Handling**: Test both HTTP errors (404, 429) and SSE error events
4. **Database Verification**: Query database after streaming to verify persistence
5. **Event Order**: Verify events arrive in correct order (tokens → sources → done)
6. **Partial Responses**: Test that partial responses are saved on errors

**Validation**:
- All 11 integration tests pass
- Test coverage > 90% for endpoint
- SSE format validated
- Message persistence verified
- Error handling tested

**Dependencies**: 4.6.8 (error handling)

**Estimated Time**: 40-45 minutes (increased due to SSE complexity)

**Completion Criteria**:
- [x] All integration tests implemented
- [x] All tests pass
- [x] SSE client helper works correctly
- [x] Event parsing handles all formats
- [x] Coverage > 90%
- [x] LSP diagnostics pass
- [x] No hanging tests (subprocess cleanup works)

---

## Execution Order

Execute sub-tasks in this exact order:

1. **4.6.1** → Add save_message method (foundation)
2. **4.6.2** → Create SSE helper (utility)
3. **4.6.3** → Basic endpoint skeleton (structure)
4. **4.6.4** → Add rate limiting (validation)
5. **4.6.5** → Add RAG integration (core logic)
6. **4.6.6** → Convert to streaming (SSE)
7. **4.6.7** → Add message persistence (data)
8. **4.6.8** → Add error handling (robustness)
9. **4.6.9** → Integration tests (validation)

---

## Success Criteria

Task 4.6 is complete when:

- [x] All 9 sub-tasks completed
- [x] All integration tests pass
- [x] LSP diagnostics pass for all modified files
- [x] Endpoint streams SSE events correctly
- [x] Rate limiting enforced
- [x] Messages persisted to database
- [x] Error handling works for all scenarios
- [x] Client disconnect handled gracefully
- [x] 60s timeout enforced
- [x] Documentation updated

---

## Notes

- Each sub-task should take 5-30 minutes
- Run LSP diagnostics after each sub-task
- Run tests after each sub-task
- Do not skip sub-tasks or change order
- If a sub-task fails, fix before proceeding

---

## References

- **Requirements**: `.kiro/specs/rag-core-phase/requirements.md` (Requirement 6)
- **Design**: `.kiro/specs/rag-core-phase/design.md` (POST /api/chat/sessions/{id}/messages)
- **Tasks**: `.kiro/specs/rag-core-phase/tasks.md` (Task 4.6)
- **FastAPI SSE**: https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse
- **SSE Spec**: https://html.spec.whatwg.org/multipage/server-sent-events.html
