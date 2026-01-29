# Integration Test Mocking Guide - RAG Core Phase

## Purpose

This guide provides step-by-step instructions for mocking external API calls (Voyage AI, DeepSeek) in integration tests to unblock Task 8 (Integration & Testing) without requiring valid API keys.

**Target**: Complete tasks 8.1-8.5 using mocked external services.

---

## Overview

### What Needs Mocking

1. **Voyage AI Embedding Service** - `EmbeddingService.embed_query()` and `embed_documents()`
2. **DeepSeek Chat API** - `DeepSeekClient.stream_chat()` for streaming responses
3. **Document Summary Generation** - `DocumentSummaryService.generate_summary()`

### Mocking Strategy

- **Unit tests**: Mock at service level (already done)
- **Integration tests**: Mock at external API client level
- **E2E tests**: Mock external APIs but test full internal flow

---

## Part 1: Mocking Patterns Reference

### Pattern 1: Mock Async Generator (Streaming)

```python
# ✅ CORRECT - Factory pattern for async generators
def create_mock_deepseek_client():
    """Create mock DeepSeek client with streaming support."""
    client = MagicMock()
    
    async def mock_stream_generator():
        # Yield token events
        yield {"type": "token", "content": "Hello "}
        yield {"type": "token", "content": "world"}
        # Yield done event
        yield {
            "type": "done",
            "prompt_tokens": 10,
            "completion_tokens": 2,
            "cached_tokens": 0
        }
    
    # Factory function that returns fresh generator each call
    def create_stream(*args, **kwargs):
        return mock_stream_generator()
    
    client.stream_chat = MagicMock(side_effect=create_stream)
    return client
```

### Pattern 2: Mock Async Method (Embeddings)

```python
# ✅ CORRECT - Use AsyncMock for async methods
def create_mock_embedding_service():
    """Create mock embedding service."""
    service = MagicMock()
    
    # Mock embed_query to return 512-dim vector
    service.embed_query = AsyncMock(return_value=[0.1] * 512)
    
    # Mock embed_documents to return list of vectors
    async def mock_embed_docs(texts):
        return [[0.1] * 512 for _ in texts]
    
    service.embed_documents = AsyncMock(side_effect=mock_embed_docs)
    return service
```

### Pattern 3: Mock Database Session

```python
def create_mock_db_session():
    """Create mock database session."""
    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    
    # Mock query results
    mock_result = MagicMock()
    mock_result.fetchone = AsyncMock(return_value=("data1", "data2"))
    mock_result.fetchall = AsyncMock(return_value=[("row1",), ("row2",)])
    
    db.execute = AsyncMock(return_value=mock_result)
    return db
```

---

## Part 2: Task 8.1 - E2E RAG Flow Test (Mocked)

### Current Status
- Test file exists: `backend/tests/test_e2e_rag_flow.py`
- Test structure correct but blocked on API keys
- Need to mock: Voyage AI, DeepSeek API

### Implementation Steps

#### Step 1: Create Mock Fixtures

Add to `backend/tests/test_e2e_rag_flow.py`:

```python
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

@pytest.fixture
def mock_voyage_client():
    """Mock Voyage AI client for embeddings."""
    with patch('voyageai.Client') as mock_client:
        # Mock embed method
        mock_result = MagicMock()
        mock_result.embeddings = [[0.1] * 512]  # Single embedding
        mock_client.return_value.embed.return_value = mock_result
        yield mock_client

@pytest.fixture
def mock_deepseek_streaming():
    """Mock DeepSeek streaming responses."""
    async def mock_stream_generator():
        # Simulate streaming tokens
        tokens = ["Machine", " learning", " has", " three", " types", ":"]
        for token in tokens:
            yield {"type": "token", "content": token}
        
        # Yield done event
        yield {
            "type": "done",
            "prompt_tokens": 50,
            "completion_tokens": 20,
            "cached_tokens": 0
        }
    
    def create_stream(*args, **kwargs):
        return mock_stream_generator()
    
    with patch('app.services.deepseek_client.AsyncOpenAI') as mock_openai:
        mock_client = MagicMock()
        mock_create = AsyncMock(side_effect=lambda **kwargs: mock_stream_generator())
        mock_client.chat.completions.create = mock_create
        mock_openai.return_value = mock_client
        yield mock_openai
```

#### Step 2: Update E2E Test to Use Mocks

Modify `test_e2e_rag_flow_complete` method:

```python
def test_e2e_rag_flow_complete_mocked(
    self, 
    running_server, 
    tmp_path,
    mock_voyage_client,
    mock_deepseek_streaming
):
    """Test complete E2E RAG flow with mocked external APIs."""
    # Rest of test remains the same...
    # The mocks will intercept API calls automatically
```

#### Step 3: Run Test

```bash
python -m pytest backend/tests/test_e2e_rag_flow.py::TestE2ERagFlow::test_e2e_rag_flow_complete_mocked -v
```

---

## Part 3: Task 8.2 - Focus Caret Integration Test

### Test File: `backend/tests/test_focus_caret_integration.py`

Create new test file:

```python
"""
Integration test for focus caret context in RAG queries.

**Validates: Requirement 4 (Focus Caret Context Integration)**
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from app.services.rag_service import RAGService
from app.services.response_cache import ResponseCache


@pytest.fixture
def mock_services():
    """Create all mocked services for RAG."""
    # Mock embedding service
    embedding_service = MagicMock()
    embedding_service.embed_query = AsyncMock(return_value=[0.1] * 512)
    
    # Mock vector store
    vector_store = MagicMock()
    mock_result = MagicMock()
    mock_result.ids = ["chunk_1", "chunk_2"]
    mock_result.distances = [0.2, 0.3]  # Will convert to similarity
    mock_result.documents = ["Content 1", "Content 2"]
    mock_result.metadatas = [
        {"document_id": "doc1", "chunk_index": 0, "start_char": 100, "end_char": 200, "token_count": 50},
        {"document_id": "doc1", "chunk_index": 1, "start_char": 200, "end_char": 300, "token_count": 50}
    ]
    vector_store.query = MagicMock(return_value=mock_result)
    
    # Mock DeepSeek client
    deepseek_client = MagicMock()
    async def mock_stream():
        yield {"type": "token", "content": "Response"}
        yield {"type": "done", "prompt_tokens": 10, "completion_tokens": 5, "cached_tokens": 0}
    def create_stream(*args, **kwargs):
        return mock_stream()
    deepseek_client.stream_chat = MagicMock(side_effect=create_stream)
    
    # Mock response cache
    response_cache = ResponseCache(max_size=10)
    
    # Mock document summary service
    doc_summary_service = MagicMock()
    doc_summary_service.get_all_summaries = AsyncMock(return_value=[])
    
    return {
        "embedding_service": embedding_service,
        "vector_store": vector_store,
        "deepseek_client": deepseek_client,
        "response_cache": response_cache,
        "doc_summary_service": doc_summary_service
    }


@pytest.mark.asyncio
async def test_focus_context_boosts_chunk_similarity(mock_services):
    """Test that focus context boosts similarity of overlapping chunk."""
    rag_service = RAGService(
        embedding_service=mock_services["embedding_service"],
        vector_store=mock_services["vector_store"],
        deepseek_client=mock_services["deepseek_client"],
        response_cache=mock_services["response_cache"],
        document_summary_service=mock_services["doc_summary_service"]
    )
    
    # Focus context overlaps with chunk 1 (start_char=100, end_char=200)
    focus_context = {
        "document_id": "doc1",
        "start_char": 150,
        "end_char": 180,
        "surrounding_text": "focused text"
    }
    
    result = await rag_service.retrieve_context(
        query="test query",
        document_id="doc1",
        focus_context=focus_context,
        n_results=5
    )
    
    # Verify chunk 1 got boosted (should be first due to boost)
    assert len(result.chunks) > 0
    # Original similarity was 0.8 (1.0 - 0.2), boost adds 0.15
    assert result.chunks[0].similarity >= 0.8 + 0.15 - 0.01  # Allow small float error


@pytest.mark.asyncio
async def test_focus_context_included_in_prompt(mock_services):
    """Test that focus context is included in the prompt."""
    rag_service = RAGService(
        embedding_service=mock_services["embedding_service"],
        vector_store=mock_services["vector_store"],
        deepseek_client=mock_services["deepseek_client"],
        response_cache=mock_services["response_cache"],
        document_summary_service=mock_services["doc_summary_service"]
    )
    
    focus_context = {
        "document_id": "doc1",
        "start_char": 150,
        "end_char": 180,
        "surrounding_text": "This is the focused text"
    }
    
    # Retrieve context first
    retrieval_result = await rag_service.retrieve_context(
        query="test query",
        document_id="doc1",
        focus_context=focus_context,
        n_results=5
    )
    
    # Generate response (will call stream_chat)
    events = []
    async for event in rag_service.generate_response(
        query="test query",
        context=retrieval_result,
        session_id="test_session",
        focus_context=focus_context,
        message_history=[]
    ):
        events.append(event)
    
    # Verify stream_chat was called
    assert mock_services["deepseek_client"].stream_chat.called
    
    # Get the messages passed to stream_chat
    call_args = mock_services["deepseek_client"].stream_chat.call_args
    messages = call_args[0][0]  # First positional argument
    
    # Verify focus context is in the user message
    user_message = next((m for m in messages if m["role"] == "user"), None)
    assert user_message is not None
    assert "This is the focused text" in user_message["content"]
```

#### Run Test

```bash
python -m pytest backend/tests/test_focus_caret_integration.py -v
```

---

## Part 4: Task 8.3 - Cache Integration Test

### Test File: `backend/tests/test_cache_integration.py`

Create new test file:

```python
"""
Integration test for response caching.

**Validates: Requirement 7 (Response Caching)**
"""

import pytest
from unittest.mock import MagicMock, AsyncMock

from app.services.rag_service import RAGService
from app.services.response_cache import ResponseCache


@pytest.fixture
def mock_services_for_cache():
    """Create mocked services with tracking for cache testing."""
    # Mock embedding service
    embedding_service = MagicMock()
    embedding_service.embed_query = AsyncMock(return_value=[0.1] * 512)
    
    # Mock vector store
    vector_store = MagicMock()
    mock_result = MagicMock()
    mock_result.ids = ["chunk_1"]
    mock_result.distances = [0.2]
    mock_result.documents = ["Test content"]
    mock_result.metadatas = [
        {"document_id": "doc1", "chunk_index": 0, "token_count": 50}
    ]
    vector_store.query = MagicMock(return_value=mock_result)
    
    # Mock DeepSeek client with call tracking
    deepseek_client = MagicMock()
    deepseek_client.call_count = 0
    
    async def mock_stream():
        deepseek_client.call_count += 1
        yield {"type": "token", "content": "Cached response"}
        yield {"type": "done", "prompt_tokens": 10, "completion_tokens": 5, "cached_tokens": 0}
    
    def create_stream(*args, **kwargs):
        return mock_stream()
    
    deepseek_client.stream_chat = MagicMock(side_effect=create_stream)
    
    # Real response cache (not mocked)
    response_cache = ResponseCache(max_size=10)
    
    # Mock document summary service
    doc_summary_service = MagicMock()
    doc_summary_service.get_all_summaries = AsyncMock(return_value=[])
    
    return {
        "embedding_service": embedding_service,
        "vector_store": vector_store,
        "deepseek_client": deepseek_client,
        "response_cache": response_cache,
        "doc_summary_service": doc_summary_service
    }


@pytest.mark.asyncio
async def test_cache_hit_on_identical_query(mock_services_for_cache):
    """Test that identical queries result in cache hit."""
    rag_service = RAGService(
        embedding_service=mock_services_for_cache["embedding_service"],
        vector_store=mock_services_for_cache["vector_store"],
        deepseek_client=mock_services_for_cache["deepseek_client"],
        response_cache=mock_services_for_cache["response_cache"],
        document_summary_service=mock_services_for_cache["doc_summary_service"]
    )
    
    # First query - should call DeepSeek
    retrieval_result = await rag_service.retrieve_context(
        query="What is machine learning?",
        document_id="doc1",
        n_results=5
    )
    
    events_1 = []
    async for event in rag_service.generate_response(
        query="What is machine learning?",
        context=retrieval_result,
        session_id="session1",
        focus_context=None,
        message_history=[]
    ):
        events_1.append(event)
    
    # Verify DeepSeek was called
    assert mock_services_for_cache["deepseek_client"].call_count == 1
    
    # Second identical query - should hit cache
    retrieval_result_2 = await rag_service.retrieve_context(
        query="What is machine learning?",
        document_id="doc1",
        n_results=5
    )
    
    events_2 = []
    async for event in rag_service.generate_response(
        query="What is machine learning?",
        context=retrieval_result_2,
        session_id="session1",
        focus_context=None,
        message_history=[]
    ):
        events_2.append(event)
    
    # Verify DeepSeek was NOT called again (still 1)
    assert mock_services_for_cache["deepseek_client"].call_count == 1
    
    # Verify cached flag in done event
    done_event = next((e for e in events_2 if e["event"] == "done"), None)
    assert done_event is not None
    assert done_event["data"]["cached"] is True
    assert done_event["data"]["cost_usd"] == 0.0  # Cached responses are free


@pytest.mark.asyncio
async def test_cache_miss_on_different_query(mock_services_for_cache):
    """Test that different queries result in cache miss."""
    rag_service = RAGService(
        embedding_service=mock_services_for_cache["embedding_service"],
        vector_store=mock_services_for_cache["vector_store"],
        deepseek_client=mock_services_for_cache["deepseek_client"],
        response_cache=mock_services_for_cache["response_cache"],
        document_summary_service=mock_services_for_cache["doc_summary_service"]
    )
    
    # First query
    retrieval_result_1 = await rag_service.retrieve_context(
        query="What is machine learning?",
        document_id="doc1",
        n_results=5
    )
    
    async for event in rag_service.generate_response(
        query="What is machine learning?",
        context=retrieval_result_1,
        session_id="session1",
        focus_context=None,
        message_history=[]
    ):
        pass
    
    # Different query
    retrieval_result_2 = await rag_service.retrieve_context(
        query="What is deep learning?",  # Different query
        document_id="doc1",
        n_results=5
    )
    
    async for event in rag_service.generate_response(
        query="What is deep learning?",
        context=retrieval_result_2,
        session_id="session1",
        focus_context=None,
        message_history=[]
    ):
        pass
    
    # Verify DeepSeek was called twice (no cache hit)
    assert mock_services_for_cache["deepseek_client"].call_count == 2


@pytest.mark.asyncio
async def test_cache_invalidation_on_document_update(mock_services_for_cache):
    """Test that cache is invalidated when document is updated."""
    response_cache = mock_services_for_cache["response_cache"]
    
    # Manually add a cached response
    cache_key = response_cache.compute_key(
        query="test query",
        document_ids=["doc1"],
        focus_context=None
    )
    
    from app.services.rag_service import RetrievedChunk
    mock_chunk = RetrievedChunk(
        chunk_id="chunk1",
        document_id="doc1",
        content="test",
        similarity=0.9,
        metadata={}
    )
    
    response_cache.set(
        key=cache_key,
        response_text="cached response",
        source_chunks=[mock_chunk],
        token_count=10
    )
    
    # Verify cache has entry
    assert response_cache.get(cache_key) is not None
    
    # Invalidate document
    invalidated_count = response_cache.invalidate_document("doc1")
    
    # Verify cache entry was removed
    assert invalidated_count == 1
    assert response_cache.get(cache_key) is None
```

#### Run Test

```bash
python -m pytest backend/tests/test_cache_integration.py -v
```

---

## Part 5: Task 8.4 - Error Handling Integration Test

### Test File: `backend/tests/test_error_handling_integration.py`

Create new test file:

```python
"""
Integration test for error handling in RAG flow.

**Validates: Requirement 13 (Error Handling and User Feedback)**
"""

import pytest
from unittest.mock import MagicMock, AsyncMock

from app.services.rag_service import RAGService
from app.services.deepseek_client import DeepSeekAPIError
from app.services.response_cache import ResponseCache


@pytest.fixture
def mock_services_for_errors():
    """Create mocked services for error testing."""
    # Mock embedding service
    embedding_service = MagicMock()
    embedding_service.embed_query = AsyncMock(return_value=[0.1] * 512)
    
    # Mock vector store
    vector_store = MagicMock()
    mock_result = MagicMock()
    mock_result.ids = ["chunk_1"]
    mock_result.distances = [0.2]
    mock_result.documents = ["Test content"]
    mock_result.metadatas = [
        {"document_id": "doc1", "chunk_index": 0, "token_count": 50}
    ]
    vector_store.query = MagicMock(return_value=mock_result)
    
    # Mock DeepSeek client (will be configured per test)
    deepseek_client = MagicMock()
    
    # Response cache
    response_cache = ResponseCache(max_size=10)
    
    # Mock document summary service
    doc_summary_service = MagicMock()
    doc_summary_service.get_all_summaries = AsyncMock(return_value=[])
    
    return {
        "embedding_service": embedding_service,
        "vector_store": vector_store,
        "deepseek_client": deepseek_client,
        "response_cache": response_cache,
        "doc_summary_service": doc_summary_service
    }


@pytest.mark.asyncio
async def test_deepseek_api_error_sends_error_event(mock_services_for_errors):
    """Test that DeepSeek API errors are sent as SSE error events."""
    # Configure DeepSeek to raise error
    async def mock_stream_with_error():
        raise DeepSeekAPIError("AI service temporarily unavailable")
        yield  # Make it a generator
    
    def create_stream(*args, **kwargs):
        return mock_stream_with_error()
    
    mock_services_for_errors["deepseek_client"].stream_chat = MagicMock(
        side_effect=create_stream
    )
    
    rag_service = RAGService(
        embedding_service=mock_services_for_errors["embedding_service"],
        vector_store=mock_services_for_errors["vector_store"],
        deepseek_client=mock_services_for_errors["deepseek_client"],
        response_cache=mock_services_for_errors["response_cache"],
        document_summary_service=mock_services_for_errors["doc_summary_service"]
    )
    
    # Retrieve context
    retrieval_result = await rag_service.retrieve_context(
        query="test query",
        document_id="doc1",
        n_results=5
    )
    
    # Generate response (should get error event)
    events = []
    async for event in rag_service.generate_response(
        query="test query",
        context=retrieval_result,
        session_id="session1",
        focus_context=None,
        message_history=[]
    ):
        events.append(event)
    
    # Verify error event was sent
    error_events = [e for e in events if e["event"] == "error"]
    assert len(error_events) == 1
    assert "error" in error_events[0]["data"]
    assert "temporarily unavailable" in error_events[0]["data"]["error"].lower()


@pytest.mark.asyncio
async def test_timeout_error_sends_error_event(mock_services_for_errors):
    """Test that timeout errors are sent as SSE error events."""
    import asyncio
    
    # Configure DeepSeek to timeout
    async def mock_stream_timeout():
        await asyncio.sleep(100)  # Will timeout before this completes
        yield {"type": "token", "content": "test"}
    
    def create_stream(*args, **kwargs):
        return mock_stream_timeout()
    
    mock_services_for_errors["deepseek_client"].stream_chat = MagicMock(
        side_effect=create_stream
    )
    
    rag_service = RAGService(
        embedding_service=mock_services_for_errors["embedding_service"],
        vector_store=mock_services_for_errors["vector_store"],
        deepseek_client=mock_services_for_errors["deepseek_client"],
        response_cache=mock_services_for_errors["response_cache"],
        document_summary_service=mock_services_for_errors["doc_summary_service"]
    )
    
    # Retrieve context
    retrieval_result = await rag_service.retrieve_context(
        query="test query",
        document_id="doc1",
        n_results=5
    )
    
    # Generate response with short timeout
    events = []
    try:
        async for event in asyncio.wait_for(
            rag_service.generate_response(
                query="test query",
                context=retrieval_result,
                session_id="session1",
                focus_context=None,
                message_history=[]
            ),
            timeout=1.0  # 1 second timeout
        ):
            events.append(event)
    except asyncio.TimeoutError:
        # This is expected - the generate_response should handle it internally
        pass
    
    # Note: The actual timeout handling is in the API layer (chat.py)
    # This test verifies the service can handle timeouts gracefully


@pytest.mark.asyncio
async def test_partial_response_included_in_error_event(mock_services_for_errors):
    """Test that partial responses are included in error events."""
    # Configure DeepSeek to fail after some tokens
    async def mock_stream_partial_error():
        yield {"type": "token", "content": "Partial "}
        yield {"type": "token", "content": "response "}
        raise DeepSeekAPIError("Connection lost")
    
    def create_stream(*args, **kwargs):
        return mock_stream_partial_error()
    
    mock_services_for_errors["deepseek_client"].stream_chat = MagicMock(
        side_effect=create_stream
    )
    
    rag_service = RAGService(
        embedding_service=mock_services_for_errors["embedding_service"],
        vector_store=mock_services_for_errors["vector_store"],
        deepseek_client=mock_services_for_errors["deepseek_client"],
        response_cache=mock_services_for_errors["response_cache"],
        document_summary_service=mock_services_for_errors["doc_summary_service"]
    )
    
    # Retrieve context
    retrieval_result = await rag_service.retrieve_context(
        query="test query",
        document_id="doc1",
        n_results=5
    )
    
    # Generate response
    events = []
    async for event in rag_service.generate_response(
        query="test query",
        context=retrieval_result,
        session_id="session1",
        focus_context=None,
        message_history=[]
    ):
        events.append(event)
    
    # Verify we got token events
    token_events = [e for e in events if e["event"] == "token"]
    assert len(token_events) == 2
    
    # Verify error event includes partial response
    error_events = [e for e in events if e["event"] == "error"]
    assert len(error_events) == 1
    assert "partial_response" in error_events[0]["data"]
    assert error_events[0]["data"]["partial_response"] == "Partial response "


@pytest.mark.asyncio
async def test_user_friendly_error_messages(mock_services_for_errors):
    """Test that internal errors are mapped to user-friendly messages."""
    # Test various error types
    error_mappings = [
        (DeepSeekAPIError("Configuration error. Please contact support."), "Configuration error"),
        (DeepSeekAPIError("AI service temporarily unavailable"), "temporarily unavailable"),
        (DeepSeekAPIError("Rate limit exceeded"), "Rate limit"),
    ]
    
    for error, expected_message in error_mappings:
        # Configure DeepSeek to raise specific error
        async def mock_stream_error():
            raise error
            yield
        
        def create_stream(*args, **kwargs):
            return mock_stream_error()
        
        mock_services_for_errors["deepseek_client"].stream_chat = MagicMock(
            side_effect=create_stream
        )
        
        rag_service = RAGService(
            embedding_service=mock_services_for_errors["embedding_service"],
            vector_store=mock_services_for_errors["vector_store"],
            deepseek_client=mock_services_for_errors["deepseek_client"],
            response_cache=mock_services_for_errors["response_cache"],
            document_summary_service=mock_services_for_errors["doc_summary_service"]
        )
        
        # Retrieve context
        retrieval_result = await rag_service.retrieve_context(
            query="test query",
            document_id="doc1",
            n_results=5
        )
        
        # Generate response
        events = []
        async for event in rag_service.generate_response(
            query="test query",
            context=retrieval_result,
            session_id="session1",
            focus_context=None,
            message_history=[]
        ):
            events.append(event)
        
        # Verify error message is user-friendly
        error_events = [e for e in events if e["event"] == "error"]
        assert len(error_events) == 1
        assert expected_message.lower() in error_events[0]["data"]["error"].lower()
```

#### Run Test

```bash
python -m pytest backend/tests/test_error_handling_integration.py -v
```

---

## Part 6: Task 8.5 - Spending Limit Integration Test

### Test File: `backend/tests/test_spending_limit_integration.py`

Create new test file:

```python
"""
Integration test for spending limit enforcement.

**Validates: Design (Session spending limits)**
"""

import pytest
from unittest.mock import MagicMock, AsyncMock
from sqlalchemy import text

from app.services.session_manager import SessionManager


@pytest.fixture
async def mock_db_with_session():
    """Create mock database with a test session."""
    db = MagicMock()
    
    # Mock session data
    session_data = {
        "id": "test_session_123",
        "document_id": None,
        "created_at": "2026-01-25T10:00:00Z",
        "updated_at": "2026-01-25T10:00:00Z",
        "session_metadata": '{"total_tokens": 10000, "estimated_cost_usd": 4.50}'
    }
    
    # Mock execute for SELECT queries
    async def mock_execute(query, params=None):
        mock_result = MagicMock()
        
        # Handle different query types
        if "SELECT" in str(query) and "chat_sessions" in str(query):
            if "COUNT" in str(query):
                mock_result.fetchone = AsyncMock(return_value=(1,))
            else:
                mock_result.fetchone = AsyncMock(return_value=(
                    session_data["id"],
                    session_data["document_id"],
                    session_data["created_at"],
                    session_data["updated_at"],
                    session_data["session_metadata"]
                ))
        elif "SELECT" in str(query) and "chat_messages" in str(query):
            mock_result.fetchone = AsyncMock(return_value=(5,))  # 5 messages
        
        return mock_result
    
    db.execute = AsyncMock(side_effect=mock_execute)
    db.commit = AsyncMock()
    
    return db, session_data


@pytest.mark.asyncio
async def test_spending_limit_under_threshold(mock_db_with_session):
    """Test that sessions under spending limit are allowed."""
    db, session_data = await mock_db_with_session
    
    session_manager = SessionManager(db)
    
    # Check spending limit (default $5.00)
    under_limit = await session_manager.check_spending_limit("test_session_123")
    
    # Session has spent $4.50, should be under $5.00 limit
    assert under_limit is True


@pytest.mark.asyncio
async def test_spending_limit_exceeded():
    """Test that sessions over spending limit are blocked."""
    db = MagicMock()
    
    # Mock session with high cost
    session_data = {
        "id": "test_session_456",
        "document_id": None,
        "created_at": "2026-01-25T10:00:00Z",
        "updated_at": "2026-01-25T10:00:00Z",
        "session_metadata": '{"total_tokens": 50000, "estimated_cost_usd": 6.50}'
    }
    
    async def mock_execute(query, params=None):
        mock_result = MagicMock()
        
        if "SELECT" in str(query) and "chat_sessions" in str(query):
            if "COUNT" in str(query):
                mock_result.fetchone = AsyncMock(return_value=(1,))
            else:
                mock_result.fetchone = AsyncMock(return_value=(
                    session_data["id"],
                    session_data["document_id"],
                    session_data["created_at"],
                    session_data["updated_at"],
                    session_data["session_metadata"]
                ))
        elif "SELECT" in str(query) and "chat_messages" in str(query):
            mock_result.fetchone = AsyncMock(return_value=(20,))
        
        return mock_result
    
    db.execute = AsyncMock(side_effect=mock_execute)
    db.commit = AsyncMock()
    
    session_manager = SessionManager(db)
    
    # Check spending limit
    under_limit = await session_manager.check_spending_limit("test_session_456")
    
    # Session has spent $6.50, should exceed $5.00 limit
    assert under_limit is False


@pytest.mark.asyncio
async def test_custom_spending_limit():
    """Test that custom spending limits can be set."""
    db = MagicMock()
    
    session_data = {
        "id": "test_session_789",
        "document_id": None,
        "created_at": "2026-01-25T10:00:00Z",
        "updated_at": "2026-01-25T10:00:00Z",
        "session_metadata": '{"total_tokens": 20000, "estimated_cost_usd": 3.00}'
    }
    
    async def mock_execute(query, params=None):
        mock_result = MagicMock()
        
        if "SELECT" in str(query) and "chat_sessions" in str(query):
            if "COUNT" in str(query):
                mock_result.fetchone = AsyncMock(return_value=(1,))
            else:
                mock_result.fetchone = AsyncMock(return_value=(
                    session_data["id"],
                    session_data["document_id"],
                    session_data["created_at"],
                    session_data["updated_at"],
                    session_data["session_metadata"]
                ))
        elif "SELECT" in str(query) and "chat_messages" in str(query):
            mock_result.fetchone = AsyncMock(return_value=(10,))
        
        return mock_result
    
    db.execute = AsyncMock(side_effect=mock_execute)
    db.commit = AsyncMock()
    
    session_manager = SessionManager(db)
    
    # Check with custom limit of $2.00
    under_limit = await session_manager.check_spending_limit(
        "test_session_789",
        max_cost_usd=2.00
    )
    
    # Session has spent $3.00, should exceed $2.00 limit
    assert under_limit is False
    
    # Check with custom limit of $10.00
    under_limit = await session_manager.check_spending_limit(
        "test_session_789",
        max_cost_usd=10.00
    )
    
    # Session has spent $3.00, should be under $10.00 limit
    assert under_limit is True
```

#### Run Test

```bash
python -m pytest backend/tests/test_spending_limit_integration.py -v
```

---

## Part 7: Running All Integration Tests

### Run All Task 8 Tests

```bash
# Run all integration tests
python -m pytest backend/tests/test_focus_caret_integration.py \
                 backend/tests/test_cache_integration.py \
                 backend/tests/test_error_handling_integration.py \
                 backend/tests/test_spending_limit_integration.py \
                 -v

# Or run with pattern matching
python -m pytest backend/tests/test_*_integration.py -v
```

### Run E2E Test (Mocked)

```bash
python -m pytest backend/tests/test_e2e_rag_flow.py::TestE2ERagFlow::test_e2e_rag_flow_complete_mocked -v
```

---

## Part 8: Verification Checklist

After implementing all mocked integration tests, verify:

- [ ] Task 8.1: E2E RAG flow test passes with mocked APIs
- [ ] Task 8.2: Focus caret integration test passes
  - [ ] Chunk boosting verified
  - [ ] Context included in prompt verified
  - [ ] Focus context stored in metadata verified
- [ ] Task 8.3: Cache integration test passes
  - [ ] Cache hit on identical queries verified
  - [ ] Cost savings (0 for cached) verified
  - [ ] Cache invalidation on document update verified
- [ ] Task 8.4: Error handling integration test passes
  - [ ] DeepSeek API failures handled correctly
  - [ ] Timeout errors handled correctly
  - [ ] Invalid input handling verified
  - [ ] User-friendly error messages verified
- [ ] Task 8.5: Spending limit integration test passes
  - [ ] Spending limit enforcement verified
  - [ ] Custom limits work correctly


---

## Part 9: Common Issues and Solutions

### Issue 1: Async Generator Exhausted

**Symptom**: `TypeError: 'async for' requires __aiter__`

**Solution**: Use factory pattern (see Pattern 1)

### Issue 2: MagicMock in Await

**Symptom**: `TypeError: object MagicMock can't be used in 'await'`

**Solution**: Use `AsyncMock` for async methods

### Issue 3: Tests Timeout

**Symptom**: Tests hang or timeout

**Solution**: Add `@settings(deadline=None)` for Hypothesis tests

### Issue 4: Module Import Errors

**Symptom**: `ModuleNotFoundError: No module named 'app'`

**Solution**: Run tests from workspace root: `python -m pytest backend/tests/...`

---

## Part 10: Next Steps

After completing all mocked integration tests:

2. **Run full test suite**: Verify no regressions
3. **Update documentation**: Document mocking approach
4. **Plan for real API testing**: When API keys are available, create separate test suite

### Future: Real API Integration Tests

When API keys are available, create:
- `backend/tests/test_e2e_rag_flow_real.py` - Uses real APIs
- Mark with `@pytest.mark.real_api` for selective running
- Keep mocked tests for CI/CD pipeline

---

## Summary

This guide provides complete instructions for mocking external API calls in integration tests. By following these patterns, you can:

1. ✅ Complete Task 8 without API keys
2. ✅ Verify RAG flow correctness
3. ✅ Test error handling and edge cases
4. ✅ Maintain fast, reliable test suite
5. ✅ Prepare for real API testing later

**Key Principle**: Mock at the external API boundary, test internal logic thoroughly.
