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
        "doc_summary_service": doc_summary_service,
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
        document_summary_service=mock_services_for_errors["doc_summary_service"],
    )

    # Retrieve context
    retrieval_result = await rag_service.retrieve_context(
        query="test query", document_id="doc1", n_results=5
    )

    # Generate response (should get error event)
    events = []
    async for event in rag_service.generate_response(
        query="test query",
        context=retrieval_result,
        session_id="session1",
        focus_context=None,
        message_history=[],
    ):
        events.append(event)

    # Verify error event was sent
    error_events = [e for e in events if e["event"] == "error"]
    assert len(error_events) == 1, "Should have error event"
    assert "error" in error_events[0]["data"], "Error event should have error field"
    assert (
        "temporarily unavailable" in error_events[0]["data"]["error"].lower()
    ), "Error message should be user-friendly"


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
        document_summary_service=mock_services_for_errors["doc_summary_service"],
    )

    # Retrieve context
    retrieval_result = await rag_service.retrieve_context(
        query="test query", document_id="doc1", n_results=5
    )

    # Generate response
    events = []
    async for event in rag_service.generate_response(
        query="test query",
        context=retrieval_result,
        session_id="session1",
        focus_context=None,
        message_history=[],
    ):
        events.append(event)

    # Verify we got token events
    token_events = [e for e in events if e["event"] == "token"]
    assert len(token_events) == 2, "Should have 2 token events before error"

    # Verify error event includes partial response
    error_events = [e for e in events if e["event"] == "error"]
    assert len(error_events) == 1, "Should have error event"
    assert (
        "partial_response" in error_events[0]["data"]
    ), "Error should include partial response"
    assert (
        error_events[0]["data"]["partial_response"] == "Partial response "
    ), "Partial response should match tokens"


@pytest.mark.asyncio
async def test_user_friendly_error_messages(mock_services_for_errors):
    """Test that internal errors are mapped to user-friendly messages."""
    # Test various error types
    error_mappings = [
        (
            DeepSeekAPIError("Configuration error. Please contact support."),
            "Configuration error",
        ),
        (
            DeepSeekAPIError("AI service temporarily unavailable"),
            "temporarily unavailable",
        ),
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
            document_summary_service=mock_services_for_errors["doc_summary_service"],
        )

        # Retrieve context
        retrieval_result = await rag_service.retrieve_context(
            query="test query", document_id="doc1", n_results=5
        )

        # Generate response
        events = []
        async for event in rag_service.generate_response(
            query="test query",
            context=retrieval_result,
            session_id="session1",
            focus_context=None,
            message_history=[],
        ):
            events.append(event)

        # Verify error message is user-friendly
        error_events = [e for e in events if e["event"] == "error"]
        assert len(error_events) == 1, f"Should have error event for {expected_message}"
        assert (
            expected_message.lower() in error_events[0]["data"]["error"].lower()
        ), f"Error should contain '{expected_message}'"


@pytest.mark.asyncio
async def test_error_recovery_with_retry(mock_services_for_errors):
    """Test that errors don't break the service for subsequent requests."""

    # First request fails
    async def mock_stream_error():
        raise DeepSeekAPIError("Temporary error")
        yield

    def create_stream_error(*args, **kwargs):
        return mock_stream_error()

    mock_services_for_errors["deepseek_client"].stream_chat = MagicMock(
        side_effect=create_stream_error
    )

    rag_service = RAGService(
        embedding_service=mock_services_for_errors["embedding_service"],
        vector_store=mock_services_for_errors["vector_store"],
        deepseek_client=mock_services_for_errors["deepseek_client"],
        response_cache=mock_services_for_errors["response_cache"],
        document_summary_service=mock_services_for_errors["doc_summary_service"],
    )

    # First request - should fail
    retrieval_result = await rag_service.retrieve_context(
        query="test query", document_id="doc1", n_results=5
    )

    events_1 = []
    async for event in rag_service.generate_response(
        query="test query",
        context=retrieval_result,
        session_id="session1",
        focus_context=None,
        message_history=[],
    ):
        events_1.append(event)

    error_events_1 = [e for e in events_1 if e["event"] == "error"]
    assert len(error_events_1) == 1, "First request should have error"

    # Second request succeeds (fix the mock)
    async def mock_stream_success():
        yield {"type": "token", "content": "Success"}
        yield {
            "type": "done",
            "prompt_tokens": 10,
            "completion_tokens": 5,
            "cached_tokens": 0,
        }

    def create_stream_success(*args, **kwargs):
        return mock_stream_success()

    mock_services_for_errors["deepseek_client"].stream_chat = MagicMock(
        side_effect=create_stream_success
    )

    # Second request - should succeed
    retrieval_result_2 = await rag_service.retrieve_context(
        query="test query 2", document_id="doc1", n_results=5
    )

    events_2 = []
    async for event in rag_service.generate_response(
        query="test query 2",
        context=retrieval_result_2,
        session_id="session1",
        focus_context=None,
        message_history=[],
    ):
        events_2.append(event)

    # Verify second request succeeded
    token_events_2 = [e for e in events_2 if e["event"] == "token"]
    assert len(token_events_2) > 0, "Second request should succeed with tokens"

    done_events_2 = [e for e in events_2 if e["event"] == "done"]
    assert len(done_events_2) == 1, "Second request should complete successfully"
