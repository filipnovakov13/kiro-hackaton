"""Tests for RAGService."""

import pytest
import asyncio
import numpy as np
from unittest.mock import AsyncMock, MagicMock, patch
from hypothesis import given, strategies as st, settings, HealthCheck

from app.services.rag_service import (
    RAGService,
    RetrievalResult,
    RetrievedChunk,
)


# Unit Tests


@pytest.fixture
def mock_embedding_service():
    """Create mock embedding service."""
    service = MagicMock()
    service.embed_query = AsyncMock(return_value=[0.1] * 512)
    return service


@pytest.fixture
def mock_vector_store():
    """Create mock vector store."""
    store = MagicMock()

    # Mock query results
    mock_results = MagicMock()
    mock_results.ids = ["chunk-1", "chunk-2", "chunk-3"]
    mock_results.documents = ["Content 1", "Content 2", "Content 3"]
    mock_results.distances = [0.1, 0.2, 0.3]  # Lower distance = higher similarity
    mock_results.metadatas = [
        {"chunk_index": 0, "start_char": 0, "end_char": 100, "token_count": 50},
        {"chunk_index": 1, "start_char": 100, "end_char": 200, "token_count": 50},
        {"chunk_index": 2, "start_char": 200, "end_char": 300, "token_count": 50},
    ]

    store.query = MagicMock(return_value=mock_results)
    store.get_all_document_ids = AsyncMock(return_value=["doc-1", "doc-2"])
    return store


@pytest.fixture
def mock_deepseek_client():
    """Create mock DeepSeek client."""
    client = MagicMock()
    return client


@pytest.fixture
def mock_response_cache():
    """Create mock response cache."""
    cache = MagicMock()
    cache.get = MagicMock(return_value=None)  # No cached response by default
    cache.set = MagicMock()
    cache.compute_key = MagicMock(return_value="cache-key-123")
    return cache


@pytest.fixture
def mock_document_summary_service():
    """Create mock document summary service."""
    service = MagicMock()

    # Mock summaries
    from app.services.document_summary import DocumentSummary

    summaries = [
        DocumentSummary(
            document_id="doc-1",
            summary_text="Summary 1",
            embedding=[0.2] * 512,
            created_at="2024-01-01T00:00:00",
        ),
        DocumentSummary(
            document_id="doc-2",
            summary_text="Summary 2",
            embedding=[0.1] * 512,
            created_at="2024-01-02T00:00:00",
        ),
    ]

    service.get_all_summaries = AsyncMock(return_value=summaries)
    return service


@pytest.fixture
def rag_service(
    mock_embedding_service,
    mock_vector_store,
    mock_deepseek_client,
    mock_response_cache,
    mock_document_summary_service,
):
    """Create RAGService instance."""
    return RAGService(
        embedding_service=mock_embedding_service,
        vector_store=mock_vector_store,
        deepseek_client=mock_deepseek_client,
        response_cache=mock_response_cache,
        document_summary_service=mock_document_summary_service,
        similarity_threshold=0.7,
    )


@pytest.mark.asyncio
async def test_retrieve_context_with_document_id(
    rag_service, mock_embedding_service, mock_vector_store
):
    """Test context retrieval with specific document ID."""
    result = await rag_service.retrieve_context(
        query="What is machine learning?", document_id="doc-1", n_results=5
    )

    # Verify result structure
    assert isinstance(result, RetrievalResult)
    assert len(result.chunks) == 3
    assert result.total_tokens == 150  # 3 chunks * 50 tokens each
    assert result.query_embedding_time_ms >= 0  # Can be 0 in fast tests
    assert result.search_time_ms >= 0  # Can be 0 in fast tests
    assert result.selected_documents == ["doc-1"]

    # Verify embedding was generated
    mock_embedding_service.embed_query.assert_called_once_with(
        "What is machine learning?"
    )

    # Verify vector store was queried
    mock_vector_store.query.assert_called_once()


@pytest.mark.asyncio
async def test_retrieve_context_multi_document(
    rag_service, mock_document_summary_service, mock_vector_store
):
    """Test context retrieval across multiple documents."""
    result = await rag_service.retrieve_context(
        query="What is machine learning?", document_id=None, n_results=5
    )

    # Verify document selection was called
    mock_document_summary_service.get_all_summaries.assert_called_once()

    # Verify multiple documents were searched
    assert len(result.selected_documents) > 0
    assert mock_vector_store.query.call_count == len(result.selected_documents)


@pytest.mark.asyncio
async def test_retrieve_context_with_focus_boost(rag_service):
    """Test that focus context boosts chunk similarity."""
    focus_context = {
        "start_char": 50,
        "end_char": 150,
        "surrounding_text": "focused text",
    }

    result = await rag_service.retrieve_context(
        query="What is machine learning?",
        document_id="doc-1",
        focus_context=focus_context,
        n_results=5,
    )

    # Verify chunks were retrieved
    assert len(result.chunks) > 0

    # Check that at least one chunk has boosted similarity
    # (chunk-1 has start_char=0, end_char=100, overlaps with focus)
    chunk_1 = next((c for c in result.chunks if c.chunk_id == "chunk-1"), None)
    if chunk_1:
        # Similarity should be boosted (original 0.9 + 0.15 boost)
        assert chunk_1.similarity > 0.9


@pytest.mark.asyncio
async def test_retrieve_context_filters_by_threshold(rag_service, mock_vector_store):
    """Test that chunks below similarity threshold are filtered out."""
    # Mock results with low similarity
    mock_results = MagicMock()
    mock_results.ids = ["chunk-1", "chunk-2"]
    mock_results.documents = ["Content 1", "Content 2"]
    mock_results.distances = [0.1, 0.5]  # Second chunk has low similarity (0.5)
    mock_results.metadatas = [
        {"chunk_index": 0, "start_char": 0, "end_char": 100, "token_count": 50},
        {"chunk_index": 1, "start_char": 100, "end_char": 200, "token_count": 50},
    ]
    mock_vector_store.query = MagicMock(return_value=mock_results)

    result = await rag_service.retrieve_context(
        query="What is machine learning?", document_id="doc-1", n_results=5
    )

    # Only chunk-1 should pass threshold (similarity 0.9 >= 0.7)
    # chunk-2 has similarity 0.5 < 0.7
    assert len(result.chunks) == 1
    assert result.chunks[0].chunk_id == "chunk-1"


@pytest.mark.asyncio
async def test_retrieve_context_enforces_token_budget(rag_service, mock_vector_store):
    """Test that token budget is enforced."""
    # Mock results with high token counts
    mock_results = MagicMock()
    mock_results.ids = ["chunk-1", "chunk-2", "chunk-3"]
    mock_results.documents = ["Content 1", "Content 2", "Content 3"]
    mock_results.distances = [0.1, 0.1, 0.1]
    mock_results.metadatas = [
        {"chunk_index": 0, "start_char": 0, "end_char": 100, "token_count": 3000},
        {"chunk_index": 1, "start_char": 100, "end_char": 200, "token_count": 3000},
        {"chunk_index": 2, "start_char": 200, "end_char": 300, "token_count": 3000},
    ]
    mock_vector_store.query = MagicMock(return_value=mock_results)

    result = await rag_service.retrieve_context(
        query="What is machine learning?", document_id="doc-1", n_results=5
    )

    # Should only include 2 chunks (6000 tokens) to stay under 8000 token budget
    assert len(result.chunks) == 2
    assert result.total_tokens == 6000


@pytest.mark.asyncio
async def test_select_relevant_documents_with_summaries(
    rag_service, mock_document_summary_service
):
    """Test document selection using summaries."""
    query_embedding = [0.15] * 512

    selected = await rag_service._select_relevant_documents(query_embedding, top_k=2)

    # Should return top 2 documents by similarity
    assert len(selected) == 2
    assert "doc-1" in selected  # Has embedding [0.2] * 512, closer to query
    assert "doc-2" in selected  # Has embedding [0.1] * 512


@pytest.mark.asyncio
async def test_select_relevant_documents_fallback(
    rag_service, mock_document_summary_service, mock_vector_store
):
    """Test fallback when no summaries exist."""
    # Mock no summaries
    mock_document_summary_service.get_all_summaries = AsyncMock(return_value=[])

    query_embedding = [0.1] * 512

    selected = await rag_service._select_relevant_documents(query_embedding, top_k=2)

    # Should fall back to all documents
    assert len(selected) == 2
    assert selected == ["doc-1", "doc-2"]


def test_apply_focus_boost():
    """Test focus boost application."""
    service = RAGService(None, None, None, None, None)

    chunks = [
        RetrievedChunk(
            chunk_id="chunk-1",
            document_id="doc-1",
            content="Content 1",
            similarity=0.8,
            metadata={"start_char": 0, "end_char": 100},
        ),
        RetrievedChunk(
            chunk_id="chunk-2",
            document_id="doc-1",
            content="Content 2",
            similarity=0.7,
            metadata={"start_char": 100, "end_char": 200},
        ),
    ]

    focus_context = {"start_char": 50, "end_char": 150}

    boosted = service._apply_focus_boost(chunks, focus_context)

    # chunk-1 overlaps with focus (0-100 overlaps with 50-150)
    assert (
        abs(boosted[0].similarity - 0.95) < 0.0001
    )  # 0.8 + 0.15, with floating point tolerance

    # chunk-2 overlaps with focus (100-200 overlaps with 50-150)
    assert (
        abs(boosted[1].similarity - 0.85) < 0.0001
    )  # 0.7 + 0.15, with floating point tolerance


def test_enforce_token_budget():
    """Test token budget enforcement."""
    service = RAGService(None, None, None, None, None)

    chunks = [
        RetrievedChunk(
            chunk_id="chunk-1",
            document_id="doc-1",
            content="Content 1",
            similarity=0.9,
            metadata={"token_count": 3000},
        ),
        RetrievedChunk(
            chunk_id="chunk-2",
            document_id="doc-1",
            content="Content 2",
            similarity=0.8,
            metadata={"token_count": 3000},
        ),
        RetrievedChunk(
            chunk_id="chunk-3",
            document_id="doc-1",
            content="Content 3",
            similarity=0.7,
            metadata={"token_count": 3000},
        ),
    ]

    result = service._enforce_token_budget(chunks, max_tokens=5000)

    # Should only include first chunk (3000 tokens)
    assert len(result) == 1
    assert result[0].chunk_id == "chunk-1"


def test_cosine_similarity():
    """Test cosine similarity calculation."""
    service = RAGService(None, None, None, None, None)

    vec1 = [1.0, 0.0, 0.0]
    vec2 = [1.0, 0.0, 0.0]

    similarity = service._cosine_similarity(vec1, vec2)
    assert abs(similarity - 1.0) < 0.0001  # Should be 1.0 (identical vectors)

    vec3 = [0.0, 1.0, 0.0]
    similarity = service._cosine_similarity(vec1, vec3)
    assert abs(similarity - 0.0) < 0.0001  # Should be 0.0 (orthogonal vectors)


# Property-Based Tests


@settings(deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.floats(min_value=0.0, max_value=1.0))
@pytest.mark.asyncio
async def test_property_chunks_above_threshold(similarity_threshold):
    """Property: All retrieved chunks have similarity >= threshold."""
    # Create fresh mocks
    mock_embedding = MagicMock()
    mock_embedding.embed_query = AsyncMock(return_value=[0.1] * 512)

    mock_vector = MagicMock()
    mock_results = MagicMock()
    mock_results.ids = ["chunk-1", "chunk-2"]
    mock_results.documents = ["Content 1", "Content 2"]
    mock_results.distances = [0.1, 0.5]  # Similarities: 0.9, 0.5
    mock_results.metadatas = [
        {"chunk_index": 0, "token_count": 50},
        {"chunk_index": 1, "token_count": 50},
    ]
    mock_vector.query = MagicMock(return_value=mock_results)

    mock_cache = MagicMock()
    mock_summary = MagicMock()

    service = RAGService(
        mock_embedding,
        mock_vector,
        None,
        mock_cache,
        mock_summary,
        similarity_threshold=similarity_threshold,
    )

    result = await service.retrieve_context("test query", document_id="doc-1")

    # All chunks should have similarity >= threshold
    for chunk in result.chunks:
        assert chunk.similarity >= similarity_threshold


@settings(deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.integers(min_value=100, max_value=10000))
@pytest.mark.asyncio
async def test_property_token_budget_respected(max_tokens):
    """Property: Total tokens never exceed max_tokens."""
    # Create fresh mocks
    mock_embedding = MagicMock()
    mock_embedding.embed_query = AsyncMock(return_value=[0.1] * 512)

    mock_vector = MagicMock()
    mock_results = MagicMock()
    mock_results.ids = ["chunk-1", "chunk-2", "chunk-3"]
    mock_results.documents = ["Content 1", "Content 2", "Content 3"]
    mock_results.distances = [0.1, 0.1, 0.1]
    mock_results.metadatas = [
        {"chunk_index": 0, "token_count": 3000},
        {"chunk_index": 1, "token_count": 3000},
        {"chunk_index": 2, "token_count": 3000},
    ]
    mock_vector.query = MagicMock(return_value=mock_results)

    mock_cache = MagicMock()
    mock_summary = MagicMock()

    service = RAGService(mock_embedding, mock_vector, None, mock_cache, mock_summary)

    # Test the _enforce_token_budget method directly
    chunks = [
        RetrievedChunk(
            chunk_id=f"chunk-{i}",
            document_id="doc-1",
            content=f"Content {i}",
            similarity=0.9,
            metadata={"token_count": 3000},
        )
        for i in range(3)
    ]

    result_chunks = service._enforce_token_budget(chunks, max_tokens=max_tokens)
    total_tokens = sum(c.metadata.get("token_count", 0) for c in result_chunks)

    # Total tokens should not exceed max_tokens
    assert total_tokens <= max_tokens


@settings(deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.integers(min_value=1, max_value=10))
@pytest.mark.asyncio
async def test_property_chunks_sorted_by_similarity(n_results):
    """Property: Chunks are sorted by similarity (descending)."""
    # Create fresh mocks
    mock_embedding = MagicMock()
    mock_embedding.embed_query = AsyncMock(return_value=[0.1] * 512)

    mock_vector = MagicMock()
    mock_results = MagicMock()
    # Create chunks with varying similarities
    mock_results.ids = [f"chunk-{i}" for i in range(n_results)]
    mock_results.documents = [f"Content {i}" for i in range(n_results)]
    # Random distances (will be converted to similarities)
    mock_results.distances = [0.1 * i for i in range(n_results)]
    mock_results.metadatas = [
        {"chunk_index": i, "token_count": 50} for i in range(n_results)
    ]
    mock_vector.query = MagicMock(return_value=mock_results)

    mock_cache = MagicMock()
    mock_summary = MagicMock()

    service = RAGService(
        mock_embedding,
        mock_vector,
        None,
        mock_cache,
        mock_summary,
        similarity_threshold=0.0,
    )

    result = await service.retrieve_context(
        "test query", document_id="doc-1", n_results=n_results
    )

    # Chunks should be sorted by similarity (descending)
    for i in range(len(result.chunks) - 1):
        assert result.chunks[i].similarity >= result.chunks[i + 1].similarity


@settings(deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.integers(min_value=0, max_value=1000))
@pytest.mark.asyncio
async def test_property_focus_boost_applied(focus_start):
    """Property: Focus boost is applied correctly."""
    # Create fresh mocks
    mock_embedding = MagicMock()
    mock_embedding.embed_query = AsyncMock(return_value=[0.1] * 512)

    mock_vector = MagicMock()
    mock_results = MagicMock()
    mock_results.ids = ["chunk-1"]
    mock_results.documents = ["Content 1"]
    mock_results.distances = [0.2]  # Similarity 0.8
    mock_results.metadatas = [
        {"chunk_index": 0, "start_char": 0, "end_char": 500, "token_count": 50}
    ]
    mock_vector.query = MagicMock(return_value=mock_results)

    mock_cache = MagicMock()
    mock_summary = MagicMock()

    service = RAGService(mock_embedding, mock_vector, None, mock_cache, mock_summary)

    focus_context = {"start_char": focus_start, "end_char": focus_start + 100}

    result = await service.retrieve_context(
        "test query", document_id="doc-1", focus_context=focus_context
    )

    # If focus overlaps with chunk (0-500), similarity should be boosted
    if focus_start <= 500:
        assert result.chunks[0].similarity > 0.8  # Original + boost
    else:
        assert result.chunks[0].similarity == 0.8  # No boost


# Generation Tests


@pytest.mark.asyncio
async def test_generate_response_with_cache_hit(rag_service, mock_response_cache):
    """Test generate_response returns cached response."""
    from app.services.response_cache import CachedResponse
    from datetime import datetime

    # Mock cached response
    cached = CachedResponse(
        response_text="Cached answer",
        source_chunks=[{"chunk_id": "chunk-1", "document_id": "doc-1"}],
        token_count=10,
        created_at=datetime.now(),
        hit_count=1,
    )
    mock_response_cache.get = MagicMock(return_value=cached)

    context = RetrievalResult(
        chunks=[],
        total_tokens=0,
        query_embedding_time_ms=0,
        search_time_ms=0,
        selected_documents=["doc-1"],
    )

    events = []
    async for event in rag_service.generate_response(
        "test query", context, "session-1"
    ):
        events.append(event)

    # Should have token, source, and done events
    assert len(events) == 3
    assert events[0]["event"] == "token"
    assert events[0]["data"]["content"] == "Cached answer"
    assert events[1]["event"] == "source"
    assert events[2]["event"] == "done"
    assert events[2]["data"]["cached"] is True
    assert events[2]["data"]["cost_usd"] == 0.0


@pytest.mark.asyncio
async def test_generate_response_streaming_success(
    rag_service, mock_deepseek_client, mock_response_cache
):
    """Test successful streaming response generation."""
    # Mock no cache
    mock_response_cache.get = MagicMock(return_value=None)

    # Mock streaming response - factory function pattern
    async def mock_stream():
        yield {"type": "token", "content": "Hello "}
        yield {"type": "token", "content": "world"}
        yield {
            "type": "done",
            "prompt_tokens": 100,
            "completion_tokens": 10,
            "cached_tokens": 0,
        }

    # Factory function that returns a new generator
    def create_stream(*args, **kwargs):
        return mock_stream()

    mock_deepseek_client.stream_chat = MagicMock(side_effect=create_stream)

    context = RetrievalResult(
        chunks=[
            RetrievedChunk(
                chunk_id="chunk-1",
                document_id="doc-1",
                content="Content",
                similarity=0.9,
                metadata={"chunk_index": 0},
            )
        ],
        total_tokens=50,
        query_embedding_time_ms=10,
        search_time_ms=20,
        selected_documents=["doc-1"],
    )

    events = []
    async for event in rag_service.generate_response(
        "test query", context, "session-1"
    ):
        events.append(event)

    # Should have 2 token events, 1 source event, 1 done event
    assert len(events) == 4
    assert events[0]["event"] == "token"
    assert events[0]["data"]["content"] == "Hello "
    assert events[1]["event"] == "token"
    assert events[1]["data"]["content"] == "world"
    assert events[2]["event"] == "source"
    assert events[3]["event"] == "done"
    assert events[3]["data"]["cached"] is False
    assert events[3]["data"]["cost_usd"] > 0


@pytest.mark.asyncio
async def test_generate_response_deepseek_error(
    rag_service, mock_deepseek_client, mock_response_cache
):
    """Test error handling for DeepSeek API errors."""
    from app.services.deepseek_client import DeepSeekAPIError

    # Mock no cache
    mock_response_cache.get = MagicMock(return_value=None)

    # Mock API error - factory function pattern
    async def mock_stream_error():
        yield {"type": "token", "content": "Partial "}
        raise DeepSeekAPIError("API error occurred")

    # Factory function that returns a new generator
    def create_stream(*args, **kwargs):
        return mock_stream_error()

    mock_deepseek_client.stream_chat = MagicMock(side_effect=create_stream)

    context = RetrievalResult(
        chunks=[],
        total_tokens=0,
        query_embedding_time_ms=0,
        search_time_ms=0,
        selected_documents=["doc-1"],
    )

    events = []
    async for event in rag_service.generate_response(
        "test query", context, "session-1"
    ):
        events.append(event)

    # Should have 1 token event and 1 error event
    assert len(events) == 2
    assert events[0]["event"] == "token"
    assert events[1]["event"] == "error"
    assert "API error occurred" in events[1]["data"]["error"]
    assert events[1]["data"]["partial_response"] == "Partial "


@pytest.mark.asyncio
async def test_generate_response_timeout_error(
    rag_service, mock_deepseek_client, mock_response_cache
):
    """Test error handling for timeout errors."""
    # Mock no cache
    mock_response_cache.get = MagicMock(return_value=None)

    # Mock timeout error - factory function pattern
    async def mock_stream_timeout():
        yield {"type": "token", "content": "Start "}
        raise asyncio.TimeoutError()

    # Factory function that returns a new generator
    def create_stream(*args, **kwargs):
        return mock_stream_timeout()

    mock_deepseek_client.stream_chat = MagicMock(side_effect=create_stream)

    context = RetrievalResult(
        chunks=[],
        total_tokens=0,
        query_embedding_time_ms=0,
        search_time_ms=0,
        selected_documents=["doc-1"],
    )

    events = []
    async for event in rag_service.generate_response(
        "test query", context, "session-1"
    ):
        events.append(event)

    # Should have 1 token event and 1 error event
    assert len(events) == 2
    assert events[0]["event"] == "token"
    assert events[1]["event"] == "error"
    assert "timed out" in events[1]["data"]["error"].lower()
    assert events[1]["data"]["partial_response"] == "Start "


@pytest.mark.asyncio
async def test_generate_response_unexpected_error(
    rag_service, mock_deepseek_client, mock_response_cache
):
    """Test error handling for unexpected errors."""
    # Mock no cache
    mock_response_cache.get = MagicMock(return_value=None)

    # Mock unexpected error
    async def mock_stream_error():
        raise ValueError("Unexpected error")

    def create_stream():
        return mock_stream_error()

    mock_deepseek_client.stream_chat = AsyncMock(side_effect=create_stream)

    context = RetrievalResult(
        chunks=[],
        total_tokens=0,
        query_embedding_time_ms=0,
        search_time_ms=0,
        selected_documents=["doc-1"],
    )

    events = []
    async for event in rag_service.generate_response(
        "test query", context, "session-1"
    ):
        events.append(event)

    # Should have 1 error event
    assert len(events) == 1
    assert events[0]["event"] == "error"
    assert "unexpected error" in events[0]["data"]["error"].lower()


def test_construct_prompt_without_history():
    """Test prompt construction without message history."""
    service = RAGService(None, None, None, None, None)

    chunks = [
        RetrievedChunk(
            chunk_id="chunk-1",
            document_id="doc-1",
            content="Machine learning is a subset of AI.",
            similarity=0.9,
            metadata={"document_title": "AI Basics"},
        )
    ]

    prompt = service._construct_prompt("What is ML?", chunks, None, None)

    # Should have system prompt and user message
    assert len(prompt) == 2
    assert prompt[0]["role"] == "system"
    assert "learning instructor" in prompt[0]["content"]
    assert prompt[1]["role"] == "user"
    assert "Machine learning is a subset of AI" in prompt[1]["content"]
    assert "What is ML?" in prompt[1]["content"]


def test_construct_prompt_with_history():
    """Test prompt construction with message history."""
    service = RAGService(None, None, None, None, None)

    chunks = [
        RetrievedChunk(
            chunk_id="chunk-1",
            document_id="doc-1",
            content="Content",
            similarity=0.9,
            metadata={"document_title": "Doc"},
        )
    ]

    history = [
        {"role": "system", "content": "System prompt"},
        {"role": "user", "content": "Previous question"},
        {"role": "assistant", "content": "Previous answer"},
    ]

    prompt = service._construct_prompt("New question", chunks, None, history)

    # Should have history + new user message
    assert len(prompt) == 4
    assert prompt[0]["role"] == "system"
    assert prompt[1]["role"] == "user"
    assert prompt[2]["role"] == "assistant"
    assert prompt[3]["role"] == "user"
    assert "New question" in prompt[3]["content"]


def test_construct_prompt_with_focus_context():
    """Test prompt construction with focus context."""
    service = RAGService(None, None, None, None, None)

    chunks = [
        RetrievedChunk(
            chunk_id="chunk-1",
            document_id="doc-1",
            content="Content",
            similarity=0.9,
            metadata={"document_title": "Doc"},
        )
    ]

    focus_context = {"surrounding_text": "focused text here"}

    prompt = service._construct_prompt("Question", chunks, focus_context, None)

    # Should include focus context
    assert "focused text here" in prompt[1]["content"]


def test_get_system_prompt():
    """Test system prompt generation."""
    service = RAGService(None, None, None, None, None)

    prompt = service._get_system_prompt()

    # Should contain key elements
    assert "learning instructor" in prompt
    assert "Socratic" in prompt
    assert "Sparse praise" in prompt
    assert "Cite sources" in prompt


def test_calculate_cost():
    """Test cost calculation."""
    service = RAGService(None, None, None, None, None)

    # Test with no caching
    cost = service._calculate_cost(
        prompt_tokens=1000, completion_tokens=100, cached_tokens=0
    )
    expected = (1000 * 0.28 + 100 * 0.42) / 1_000_000
    assert abs(cost - expected) < 0.000001

    # Test with caching
    cost = service._calculate_cost(
        prompt_tokens=1000, completion_tokens=100, cached_tokens=500
    )
    expected = (500 * 0.28 + 500 * 0.028 + 100 * 0.42) / 1_000_000
    assert abs(cost - expected) < 0.000001


# Property-Based Tests for Generation


@settings(deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.integers(min_value=0, max_value=1000))
@pytest.mark.asyncio
async def test_property_cost_calculation_accurate(prompt_tokens):
    """Property: Cost calculation is accurate."""
    service = RAGService(None, None, None, None, None)

    completion_tokens = 100
    cached_tokens = min(prompt_tokens // 2, prompt_tokens)

    cost = service._calculate_cost(prompt_tokens, completion_tokens, cached_tokens)

    # Cost should be non-negative
    assert cost >= 0

    # Cost should increase with more tokens
    if prompt_tokens > 0:
        assert cost > 0


@settings(deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.integers(min_value=1, max_value=10))
@pytest.mark.asyncio
async def test_property_prompt_includes_all_chunks(num_chunks):
    """Property: Prompt includes all provided chunks."""
    service = RAGService(None, None, None, None, None)

    chunks = [
        RetrievedChunk(
            chunk_id=f"chunk-{i}",
            document_id="doc-1",
            content=f"Content {i}",
            similarity=0.9,
            metadata={"document_title": f"Doc {i}"},
        )
        for i in range(num_chunks)
    ]

    prompt = service._construct_prompt("Question", chunks, None, None)

    # All chunk contents should be in the prompt
    for chunk in chunks:
        assert chunk.content in prompt[-1]["content"]
