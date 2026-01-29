"""
Integration test for response caching.

**Validates: Requirement 7 (Response Caching)**
"""

import pytest
from unittest.mock import MagicMock, AsyncMock

from app.services.rag_service import RAGService, RetrievedChunk
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
        yield {
            "type": "done",
            "prompt_tokens": 10,
            "completion_tokens": 5,
            "cached_tokens": 0,
        }

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
        "doc_summary_service": doc_summary_service,
    }


@pytest.mark.asyncio
async def test_cache_hit_on_identical_query(mock_services_for_cache):
    """Test that identical queries result in cache hit."""
    rag_service = RAGService(
        embedding_service=mock_services_for_cache["embedding_service"],
        vector_store=mock_services_for_cache["vector_store"],
        deepseek_client=mock_services_for_cache["deepseek_client"],
        response_cache=mock_services_for_cache["response_cache"],
        document_summary_service=mock_services_for_cache["doc_summary_service"],
    )

    # First query - should call DeepSeek
    retrieval_result = await rag_service.retrieve_context(
        query="What is machine learning?", document_id="doc1", n_results=5
    )

    events_1 = []
    async for event in rag_service.generate_response(
        query="What is machine learning?",
        context=retrieval_result,
        session_id="session1",
        focus_context=None,
        message_history=[],
    ):
        events_1.append(event)

    # Verify DeepSeek was called
    assert (
        mock_services_for_cache["deepseek_client"].call_count == 1
    ), "DeepSeek should be called once"

    # Second identical query - should hit cache
    retrieval_result_2 = await rag_service.retrieve_context(
        query="What is machine learning?", document_id="doc1", n_results=5
    )

    events_2 = []
    async for event in rag_service.generate_response(
        query="What is machine learning?",
        context=retrieval_result_2,
        session_id="session1",
        focus_context=None,
        message_history=[],
    ):
        events_2.append(event)

    # Verify DeepSeek was NOT called again (still 1)
    assert (
        mock_services_for_cache["deepseek_client"].call_count == 1
    ), "DeepSeek should not be called again (cache hit)"

    # Verify cached flag in done event
    done_event = next((e for e in events_2 if e["event"] == "done"), None)
    assert done_event is not None, "Should have done event"
    assert done_event["data"]["cached"] is True, "Response should be marked as cached"
    assert (
        done_event["data"]["cost_usd"] == 0.0
    ), "Cached responses should have zero cost"


@pytest.mark.asyncio
async def test_cache_miss_on_different_query(mock_services_for_cache):
    """Test that different queries result in cache miss."""
    rag_service = RAGService(
        embedding_service=mock_services_for_cache["embedding_service"],
        vector_store=mock_services_for_cache["vector_store"],
        deepseek_client=mock_services_for_cache["deepseek_client"],
        response_cache=mock_services_for_cache["response_cache"],
        document_summary_service=mock_services_for_cache["doc_summary_service"],
    )

    # First query
    retrieval_result_1 = await rag_service.retrieve_context(
        query="What is machine learning?", document_id="doc1", n_results=5
    )

    async for event in rag_service.generate_response(
        query="What is machine learning?",
        context=retrieval_result_1,
        session_id="session1",
        focus_context=None,
        message_history=[],
    ):
        pass

    # Different query
    retrieval_result_2 = await rag_service.retrieve_context(
        query="What is deep learning?",  # Different query
        document_id="doc1",
        n_results=5,
    )

    async for event in rag_service.generate_response(
        query="What is deep learning?",
        context=retrieval_result_2,
        session_id="session1",
        focus_context=None,
        message_history=[],
    ):
        pass

    # Verify DeepSeek was called twice (no cache hit)
    assert (
        mock_services_for_cache["deepseek_client"].call_count == 2
    ), "DeepSeek should be called twice (cache miss)"


@pytest.mark.asyncio
async def test_cache_invalidation_on_document_update(mock_services_for_cache):
    """Test that cache is invalidated when document is updated."""
    response_cache = mock_services_for_cache["response_cache"]

    # Manually add a cached response
    cache_key = response_cache.compute_key(
        query="test query", document_ids=["doc1"], focus_context=None
    )

    mock_chunk = RetrievedChunk(
        chunk_id="chunk1",
        document_id="doc1",
        content="test",
        similarity=0.9,
        metadata={},
    )

    response_cache.set(
        key=cache_key,
        response_text="cached response",
        source_chunks=[mock_chunk],
        token_count=10,
    )

    # Verify cache has entry
    assert response_cache.get(cache_key) is not None, "Cache should have entry"

    # Invalidate document
    invalidated_count = response_cache.invalidate_document("doc1")

    # Verify cache entry was removed
    assert invalidated_count == 1, "Should invalidate 1 cache entry"
    assert response_cache.get(cache_key) is None, "Cache entry should be removed"


@pytest.mark.asyncio
async def test_cache_with_different_focus_context(mock_services_for_cache):
    """Test that different focus contexts result in different cache keys."""
    rag_service = RAGService(
        embedding_service=mock_services_for_cache["embedding_service"],
        vector_store=mock_services_for_cache["vector_store"],
        deepseek_client=mock_services_for_cache["deepseek_client"],
        response_cache=mock_services_for_cache["response_cache"],
        document_summary_service=mock_services_for_cache["doc_summary_service"],
    )

    # First query with focus context
    retrieval_result_1 = await rag_service.retrieve_context(
        query="What is machine learning?",
        document_id="doc1",
        focus_context={"start_char": 100, "end_char": 200, "surrounding_text": "text1"},
        n_results=5,
    )

    async for event in rag_service.generate_response(
        query="What is machine learning?",
        context=retrieval_result_1,
        session_id="session1",
        focus_context={"start_char": 100, "end_char": 200, "surrounding_text": "text1"},
        message_history=[],
    ):
        pass

    # Same query but different focus context
    retrieval_result_2 = await rag_service.retrieve_context(
        query="What is machine learning?",
        document_id="doc1",
        focus_context={"start_char": 300, "end_char": 400, "surrounding_text": "text2"},
        n_results=5,
    )

    async for event in rag_service.generate_response(
        query="What is machine learning?",
        context=retrieval_result_2,
        session_id="session1",
        focus_context={"start_char": 300, "end_char": 400, "surrounding_text": "text2"},
        message_history=[],
    ):
        pass

    # Verify DeepSeek was called twice (different focus contexts = different cache keys)
    assert (
        mock_services_for_cache["deepseek_client"].call_count == 2
    ), "Different focus contexts should not hit cache"


@pytest.mark.asyncio
async def test_cache_stats(mock_services_for_cache):
    """Test cache statistics tracking."""
    response_cache = mock_services_for_cache["response_cache"]

    # Add some cached responses
    for i in range(3):
        cache_key = response_cache.compute_key(
            query=f"query_{i}", document_ids=["doc1"], focus_context=None
        )

        mock_chunk = RetrievedChunk(
            chunk_id=f"chunk_{i}",
            document_id="doc1",
            content=f"content_{i}",
            similarity=0.9,
            metadata={},
        )

        response_cache.set(
            key=cache_key,
            response_text=f"response_{i}",
            source_chunks=[mock_chunk],
            token_count=10,
        )

    # Get stats
    stats = response_cache.get_stats()

    # Verify stats
    assert stats["cache_size"] == 3, "Cache should have 3 entries"
    assert stats["max_size"] == 10, "Max size should be 10"
    assert "hit_rate" in stats, "Stats should include hit rate"
