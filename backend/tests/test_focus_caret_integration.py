"""
Integration test for focus caret context in RAG queries.

**Validates: Requirement 4 (Focus Caret Context Integration)**
"""

import pytest
from unittest.mock import MagicMock, AsyncMock

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
        {
            "document_id": "doc1",
            "chunk_index": 0,
            "start_char": 100,
            "end_char": 200,
            "token_count": 50,
        },
        {
            "document_id": "doc1",
            "chunk_index": 1,
            "start_char": 200,
            "end_char": 300,
            "token_count": 50,
        },
    ]
    vector_store.query = MagicMock(return_value=mock_result)

    # Mock DeepSeek client
    deepseek_client = MagicMock()

    async def mock_stream():
        yield {"type": "token", "content": "Response"}
        yield {
            "type": "done",
            "prompt_tokens": 10,
            "completion_tokens": 5,
            "cached_tokens": 0,
        }

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
        "doc_summary_service": doc_summary_service,
    }


@pytest.mark.asyncio
async def test_focus_context_boosts_chunk_similarity(mock_services):
    """Test that focus context boosts similarity of overlapping chunk."""
    rag_service = RAGService(
        embedding_service=mock_services["embedding_service"],
        vector_store=mock_services["vector_store"],
        deepseek_client=mock_services["deepseek_client"],
        response_cache=mock_services["response_cache"],
        document_summary_service=mock_services["doc_summary_service"],
    )

    # Focus context overlaps with chunk 1 (start_char=100, end_char=200)
    focus_context = {
        "document_id": "doc1",
        "start_char": 150,
        "end_char": 180,
        "surrounding_text": "focused text",
    }

    result = await rag_service.retrieve_context(
        query="test query", document_id="doc1", focus_context=focus_context, n_results=5
    )

    # Verify chunk 1 got boosted (should be first due to boost)
    assert len(result.chunks) > 0, "Should retrieve chunks"
    # Original similarity was 0.8 (1.0 - 0.2), boost adds 0.15
    assert (
        result.chunks[0].similarity >= 0.8 + 0.15 - 0.01
    ), "Focused chunk should have boosted similarity"


@pytest.mark.asyncio
async def test_focus_context_included_in_prompt(mock_services):
    """Test that focus context is included in the prompt."""
    rag_service = RAGService(
        embedding_service=mock_services["embedding_service"],
        vector_store=mock_services["vector_store"],
        deepseek_client=mock_services["deepseek_client"],
        response_cache=mock_services["response_cache"],
        document_summary_service=mock_services["doc_summary_service"],
    )

    focus_context = {
        "document_id": "doc1",
        "start_char": 150,
        "end_char": 180,
        "surrounding_text": "This is the focused text",
    }

    # Retrieve context first
    retrieval_result = await rag_service.retrieve_context(
        query="test query", document_id="doc1", focus_context=focus_context, n_results=5
    )

    # Generate response (will call stream_chat)
    events = []
    async for event in rag_service.generate_response(
        query="test query",
        context=retrieval_result,
        session_id="test_session",
        focus_context=focus_context,
        message_history=[],
    ):
        events.append(event)

    # Verify stream_chat was called
    assert mock_services[
        "deepseek_client"
    ].stream_chat.called, "DeepSeek should be called"

    # Get the messages passed to stream_chat
    call_args = mock_services["deepseek_client"].stream_chat.call_args
    messages = call_args[0][0]  # First positional argument

    # Verify focus context is in the user message
    user_message = next((m for m in messages if m["role"] == "user"), None)
    assert user_message is not None, "Should have user message"
    assert (
        "This is the focused text" in user_message["content"]
    ), "Focus context should be in prompt"


@pytest.mark.asyncio
async def test_focus_context_without_overlap(mock_services):
    """Test that focus context that doesn't overlap with chunks still works."""
    rag_service = RAGService(
        embedding_service=mock_services["embedding_service"],
        vector_store=mock_services["vector_store"],
        deepseek_client=mock_services["deepseek_client"],
        response_cache=mock_services["response_cache"],
        document_summary_service=mock_services["doc_summary_service"],
    )

    # Focus context doesn't overlap with any chunks (start_char=500, chunks are at 100-200, 200-300)
    focus_context = {
        "document_id": "doc1",
        "start_char": 500,
        "end_char": 550,
        "surrounding_text": "non-overlapping text",
    }

    result = await rag_service.retrieve_context(
        query="test query", document_id="doc1", focus_context=focus_context, n_results=5
    )

    # Verify retrieval still works (no boost applied, but no errors)
    assert len(result.chunks) > 0, "Should still retrieve chunks"
    # Chunks should have normal similarity (no boost)
    assert (
        result.chunks[0].similarity <= 0.85
    ), "Non-overlapping focus should not boost similarity"


@pytest.mark.asyncio
async def test_focus_context_none_works(mock_services):
    """Test that passing None for focus_context works correctly."""
    rag_service = RAGService(
        embedding_service=mock_services["embedding_service"],
        vector_store=mock_services["vector_store"],
        deepseek_client=mock_services["deepseek_client"],
        response_cache=mock_services["response_cache"],
        document_summary_service=mock_services["doc_summary_service"],
    )

    # No focus context
    result = await rag_service.retrieve_context(
        query="test query", document_id="doc1", focus_context=None, n_results=5
    )

    # Verify retrieval works without focus context
    assert len(result.chunks) > 0, "Should retrieve chunks without focus context"

    # Generate response without focus context
    events = []
    async for event in rag_service.generate_response(
        query="test query",
        context=result,
        session_id="test_session",
        focus_context=None,
        message_history=[],
    ):
        events.append(event)

    # Verify response generation works
    token_events = [e for e in events if e["event"] == "token"]
    assert len(token_events) > 0, "Should generate response without focus context"
