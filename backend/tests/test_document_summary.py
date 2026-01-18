"""Tests for DocumentSummaryService."""

import pytest
import numpy as np
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from hypothesis import given, strategies as st, settings, HealthCheck

from app.services.document_summary import DocumentSummaryService, DocumentSummary


# Unit Tests


@pytest.fixture
def mock_deepseek_client():
    """Create mock DeepSeek client."""
    client = MagicMock()

    async def mock_stream():
        yield {"type": "token", "content": "This is a test summary. "}
        yield {"type": "token", "content": "It covers the main topics."}
        yield {
            "type": "done",
            "prompt_tokens": 10,
            "completion_tokens": 5,
            "cached_tokens": 0,
        }

    # Return a new generator instance each time
    def create_stream(*args, **kwargs):
        return mock_stream()

    client.stream_chat = MagicMock(side_effect=create_stream)
    return client


@pytest.fixture
def mock_embedding_service():
    """Create mock embedding service."""
    service = MagicMock()
    # Return a 512-dimensional embedding
    service.embed_query = AsyncMock(return_value=[0.1] * 512)
    return service


@pytest.fixture
def mock_db_session():
    """Create mock database session."""
    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    return db


@pytest.fixture
def summary_service(mock_deepseek_client, mock_embedding_service, mock_db_session):
    """Create DocumentSummaryService instance."""
    return DocumentSummaryService(
        deepseek_client=mock_deepseek_client,
        embedding_service=mock_embedding_service,
        db_session=mock_db_session,
    )


@pytest.mark.asyncio
async def test_generate_summary_success(
    summary_service, mock_deepseek_client, mock_embedding_service, mock_db_session
):
    """Test successful summary generation."""
    document_id = "test-doc-123"
    document_content = "This is a test document. " * 100  # Long content
    document_title = "Test Document"

    result = await summary_service.generate_summary(
        document_id, document_content, document_title
    )

    # Verify result
    assert isinstance(result, DocumentSummary)
    assert result.document_id == document_id
    assert result.summary_text == "This is a test summary. It covers the main topics."
    assert len(result.embedding) == 512
    assert result.created_at is not None

    # Verify DeepSeek was called
    mock_deepseek_client.stream_chat.assert_called_once()

    # Verify embedding was generated
    mock_embedding_service.embed_query.assert_called_once()

    # Verify database storage
    mock_db_session.execute.assert_called_once()
    mock_db_session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_generate_summary_truncates_long_content(summary_service):
    """Test that summary generation uses only first 2000 characters."""
    document_id = "test-doc-123"
    document_content = "A" * 5000  # Very long content
    document_title = "Test Document"

    await summary_service.generate_summary(
        document_id, document_content, document_title
    )

    # Check that the prompt only included first 2000 characters
    call_args = summary_service.deepseek_client.stream_chat.call_args[0][0]
    prompt_content = call_args[0]["content"]
    assert "A" * 2000 in prompt_content
    assert len(prompt_content) < 2100  # Should not include all 5000 chars


@pytest.mark.asyncio
async def test_generate_summary_truncates_to_500_chars():
    """Test that summary text is truncated to 500 characters."""
    # Create fresh mocks for this test
    mock_deepseek = MagicMock()

    async def mock_long_stream():
        yield {"type": "token", "content": "A" * 600}
        yield {
            "type": "done",
            "prompt_tokens": 10,
            "completion_tokens": 5,
            "cached_tokens": 0,
        }

    def create_long_stream(*args, **kwargs):
        return mock_long_stream()

    mock_deepseek.stream_chat = MagicMock(side_effect=create_long_stream)

    mock_embedding = MagicMock()
    mock_embedding.embed_query = AsyncMock(return_value=[0.1] * 512)

    mock_db = MagicMock()
    mock_db.execute = AsyncMock()
    mock_db.commit = AsyncMock()

    service = DocumentSummaryService(mock_deepseek, mock_embedding, mock_db)

    result = await service.generate_summary("test-doc", "content", "title")

    assert len(result.summary_text) == 500


@pytest.mark.asyncio
async def test_get_summary_found(summary_service, mock_db_session):
    """Test retrieving an existing summary."""
    document_id = "test-doc-123"

    # Mock database response
    mock_result = MagicMock()
    embedding_bytes = np.array([0.1] * 512, dtype=np.float32).tobytes()
    mock_result.fetchone = AsyncMock(
        return_value=(
            document_id,
            "Test summary text",
            embedding_bytes,
            "2024-01-01T00:00:00",
        )
    )
    mock_db_session.execute = AsyncMock(return_value=mock_result)

    result = await summary_service.get_summary(document_id)

    assert result is not None
    assert result.document_id == document_id
    assert result.summary_text == "Test summary text"
    assert len(result.embedding) == 512
    assert result.created_at == "2024-01-01T00:00:00"


@pytest.mark.asyncio
async def test_get_summary_not_found(summary_service, mock_db_session):
    """Test retrieving a non-existent summary."""
    document_id = "nonexistent-doc"

    # Mock database response with no result
    mock_result = MagicMock()
    mock_result.fetchone = AsyncMock(return_value=None)
    mock_db_session.execute = AsyncMock(return_value=mock_result)

    result = await summary_service.get_summary(document_id)

    assert result is None


@pytest.mark.asyncio
async def test_get_all_summaries_multiple(summary_service, mock_db_session):
    """Test retrieving all summaries."""
    # Mock database response with multiple summaries
    mock_result = MagicMock()
    embedding_bytes = np.array([0.1] * 512, dtype=np.float32).tobytes()
    mock_result.fetchall = AsyncMock(
        return_value=[
            ("doc-1", "Summary 1", embedding_bytes, "2024-01-01T00:00:00"),
            ("doc-2", "Summary 2", embedding_bytes, "2024-01-02T00:00:00"),
            ("doc-3", "Summary 3", embedding_bytes, "2024-01-03T00:00:00"),
        ]
    )
    mock_db_session.execute = AsyncMock(return_value=mock_result)

    results = await summary_service.get_all_summaries()

    assert len(results) == 3
    assert results[0].document_id == "doc-1"
    assert results[1].document_id == "doc-2"
    assert results[2].document_id == "doc-3"
    assert all(len(r.embedding) == 512 for r in results)


@pytest.mark.asyncio
async def test_get_all_summaries_empty(summary_service, mock_db_session):
    """Test retrieving all summaries when none exist."""
    # Mock database response with no results
    mock_result = MagicMock()
    mock_result.fetchall = AsyncMock(return_value=[])
    mock_db_session.execute = AsyncMock(return_value=mock_result)

    results = await summary_service.get_all_summaries()

    assert results == []


@pytest.mark.asyncio
async def test_store_summary(summary_service, mock_db_session):
    """Test storing a summary in the database."""
    document_id = "test-doc-123"
    summary_text = "Test summary"
    embedding = [0.1] * 512

    await summary_service._store_summary(document_id, summary_text, embedding)

    # Verify database operations
    mock_db_session.execute.assert_called_once()
    mock_db_session.commit.assert_called_once()

    # Verify the SQL query
    call_args = mock_db_session.execute.call_args[0]
    assert "INSERT OR REPLACE INTO document_summaries" in call_args[0]
    assert call_args[1][0] == document_id
    assert call_args[1][1] == summary_text
    # Verify embedding was converted to bytes
    assert isinstance(call_args[1][2], bytes)


@pytest.mark.asyncio
async def test_embedding_serialization_deserialization(
    summary_service, mock_db_session
):
    """Test that embeddings are correctly serialized and deserialized."""
    document_id = "test-doc"
    original_embedding = [0.1, 0.2, 0.3] * 170 + [0.1, 0.2]  # 512 dimensions

    # Store the embedding
    await summary_service._store_summary(document_id, "Test", original_embedding)

    # Get the stored bytes
    stored_bytes = mock_db_session.execute.call_args[0][1][2]

    # Deserialize and verify
    deserialized = np.frombuffer(stored_bytes, dtype=np.float32).tolist()
    assert len(deserialized) == 512
    # Check approximate equality (floating point precision)
    assert all(abs(a - b) < 0.0001 for a, b in zip(original_embedding, deserialized))


# Property-Based Tests


@settings(deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.integers(min_value=1, max_value=10000))
@pytest.mark.asyncio
async def test_property_summary_never_exceeds_500_chars(length):
    """Property: Summary text never exceeds 500 characters."""
    # Create fresh mocks for each test
    mock_deepseek = MagicMock()

    async def mock_variable_stream():
        yield {"type": "token", "content": "A" * length}
        yield {
            "type": "done",
            "prompt_tokens": 10,
            "completion_tokens": 5,
            "cached_tokens": 0,
        }

    def create_variable_stream(*args, **kwargs):
        return mock_variable_stream()

    mock_deepseek.stream_chat = MagicMock(side_effect=create_variable_stream)

    mock_embedding = MagicMock()
    mock_embedding.embed_query = AsyncMock(return_value=[0.1] * 512)

    mock_db = MagicMock()
    mock_db.execute = AsyncMock()
    mock_db.commit = AsyncMock()

    service = DocumentSummaryService(mock_deepseek, mock_embedding, mock_db)

    result = await service.generate_summary("test-doc", "content", "title")

    assert len(result.summary_text) <= 500


@settings(
    deadline=None,
    suppress_health_check=[
        HealthCheck.function_scoped_fixture,
        HealthCheck.large_base_example,
    ],
)
@given(st.lists(st.floats(min_value=-1.0, max_value=1.0), min_size=512, max_size=512))
@pytest.mark.asyncio
async def test_property_embedding_dimensions_always_512(embedding):
    """Property: Embedding dimensions are always 512."""
    mock_deepseek = MagicMock()

    async def mock_stream():
        yield {"type": "token", "content": "Test"}
        yield {
            "type": "done",
            "prompt_tokens": 10,
            "completion_tokens": 5,
            "cached_tokens": 0,
        }

    def create_stream(*args, **kwargs):
        return mock_stream()

    mock_deepseek.stream_chat = MagicMock(side_effect=create_stream)

    mock_embedding_service = MagicMock()
    mock_embedding_service.embed_query = AsyncMock(return_value=embedding)

    mock_db = MagicMock()
    mock_db.execute = AsyncMock()
    mock_db.commit = AsyncMock()

    service = DocumentSummaryService(mock_deepseek, mock_embedding_service, mock_db)

    result = await service.generate_summary("test-doc", "content", "title")

    assert len(result.embedding) == 512


@settings(deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.text(min_size=1, max_size=500))
@pytest.mark.asyncio
async def test_property_summaries_stored_and_retrieved_correctly(summary_text):
    """Property: Summaries are stored and retrieved correctly."""
    mock_db = MagicMock()
    mock_db.execute = AsyncMock()
    mock_db.commit = AsyncMock()

    mock_deepseek = MagicMock()
    mock_embedding = MagicMock()

    service = DocumentSummaryService(mock_deepseek, mock_embedding, mock_db)

    document_id = "test-doc"
    embedding = [0.1] * 512

    # Store
    await service._store_summary(document_id, summary_text, embedding)

    # Verify storage was called
    assert mock_db.execute.called
    assert mock_db.commit.called

    # Mock retrieval
    mock_result = MagicMock()
    embedding_bytes = np.array(embedding, dtype=np.float32).tobytes()
    mock_result.fetchone = AsyncMock(
        return_value=(
            document_id,
            summary_text,
            embedding_bytes,
            datetime.now().isoformat(),
        )
    )
    mock_db.execute = AsyncMock(return_value=mock_result)

    # Retrieve
    result = await service.get_summary(document_id)

    # Verify
    assert result.document_id == document_id
    assert result.summary_text == summary_text
    assert len(result.embedding) == 512
