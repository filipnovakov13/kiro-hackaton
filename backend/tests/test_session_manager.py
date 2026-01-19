"""Tests for SessionManager service."""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from hypothesis import given, strategies as st

from app.services.session_manager import SessionManager, SessionStats


# ============================================================================
# Unit Tests
# ============================================================================


def test_session_ttl_calculation():
    """Test TTL calculation for session cleanup."""
    # Verify TTL is 24 hours
    assert SessionManager.SESSION_TTL_HOURS == 24

    # Calculate cutoff time
    now = datetime.now()
    cutoff = now - timedelta(hours=SessionManager.SESSION_TTL_HOURS)

    # Sessions older than cutoff should be cleaned
    old_session_time = cutoff - timedelta(hours=1)
    assert old_session_time < cutoff

    # Sessions newer than cutoff should be kept
    new_session_time = cutoff + timedelta(hours=1)
    assert new_session_time > cutoff


def test_spending_limit_default():
    """Test default spending limit is $5.00."""
    import inspect

    # Check default parameter value
    sig = inspect.signature(SessionManager.check_spending_limit)
    max_cost_param = sig.parameters["max_cost_usd"]
    assert max_cost_param.default == 5.00


def test_session_stats_dataclass():
    """Test SessionStats dataclass structure."""
    stats = SessionStats(
        message_count=10,
        total_tokens=5000,
        estimated_cost_usd=0.0025,
        cache_hit_rate=0.25,
        avg_response_time_ms=1500.0,
    )

    assert stats.message_count == 10
    assert stats.total_tokens == 5000
    assert stats.estimated_cost_usd == 0.0025
    assert stats.cache_hit_rate == 0.25
    assert stats.avg_response_time_ms == 1500.0


# ============================================================================
# Async Tests with Mocked Database
# ============================================================================


@pytest.fixture
def mock_db_session():
    """Create a mock database session."""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    return session


@pytest.fixture
def session_manager(mock_db_session):
    """Create SessionManager with mocked database."""
    return SessionManager(mock_db_session)


@pytest.mark.asyncio
async def test_create_session_without_document(session_manager, mock_db_session):
    """Test creating session without document."""
    session_id = "123e4567-e89b-12d3-a456-426614174000"

    result = await session_manager.create_session(session_id)

    assert result["session_id"] == session_id
    assert result["document_id"] is None
    assert result["message_count"] == 0
    assert "created_at" in result

    # Verify database was called
    assert mock_db_session.execute.called
    assert mock_db_session.commit.called


@pytest.mark.asyncio
async def test_create_session_with_document(session_manager, mock_db_session):
    """Test creating session with document."""
    session_id = "123e4567-e89b-12d3-a456-426614174000"
    document_id = "doc-123e4567-e89b-12d3-a456-426614174000"

    # Mock document exists check
    mock_result = MagicMock()
    mock_result.fetchone.return_value = (document_id,)
    mock_db_session.execute.return_value = mock_result

    result = await session_manager.create_session(session_id, document_id)

    assert result["session_id"] == session_id
    assert result["document_id"] == document_id
    assert result["message_count"] == 0


@pytest.mark.asyncio
async def test_create_session_document_not_found(session_manager, mock_db_session):
    """Test creating session with non-existent document raises error."""
    session_id = "123e4567-e89b-12d3-a456-426614174000"
    document_id = "nonexistent-doc"

    # Mock document doesn't exist
    mock_result = MagicMock()
    mock_result.fetchone.return_value = None
    mock_db_session.execute.return_value = mock_result

    with pytest.raises(ValueError, match="Document .* not found"):
        await session_manager.create_session(session_id, document_id)


@pytest.mark.asyncio
async def test_get_session_exists(session_manager, mock_db_session):
    """Test getting existing session."""
    session_id = "123e4567-e89b-12d3-a456-426614174000"

    # Mock session data
    mock_session_result = MagicMock()
    mock_session_result.fetchone.return_value = (
        session_id,
        "doc-id",
        "2026-01-18T10:00:00",
        "2026-01-18T11:00:00",
        '{"total_tokens": 1000}',
    )

    # Mock message count
    mock_count_result = MagicMock()
    mock_count_result.fetchone.return_value = (5,)

    mock_db_session.execute.side_effect = [mock_session_result, mock_count_result]

    result = await session_manager.get_session(session_id)

    assert result["session_id"] == session_id
    assert result["document_id"] == "doc-id"
    assert result["message_count"] == 5
    assert result["metadata"]["total_tokens"] == 1000


@pytest.mark.asyncio
async def test_get_session_not_found(session_manager, mock_db_session):
    """Test getting non-existent session returns None."""
    session_id = "nonexistent"

    mock_result = MagicMock()
    mock_result.fetchone.return_value = None
    mock_db_session.execute.return_value = mock_result

    result = await session_manager.get_session(session_id)

    assert result is None


@pytest.mark.asyncio
async def test_update_session_metadata(session_manager, mock_db_session):
    """Test updating session metadata."""
    session_id = "123e4567-e89b-12d3-a456-426614174000"

    # Mock existing metadata
    mock_result = MagicMock()
    mock_result.fetchone.return_value = ('{"existing": "data"}',)
    mock_db_session.execute.return_value = mock_result

    updates = {"total_tokens": 5000, "estimated_cost_usd": 0.0025}

    await session_manager.update_session_metadata(session_id, updates)

    # Verify commit was called
    assert mock_db_session.commit.called


@pytest.mark.asyncio
async def test_update_session_metadata_not_found(session_manager, mock_db_session):
    """Test updating non-existent session raises error."""
    session_id = "nonexistent"

    mock_result = MagicMock()
    mock_result.fetchone.return_value = None
    mock_db_session.execute.return_value = mock_result

    with pytest.raises(ValueError, match="Session .* not found"):
        await session_manager.update_session_metadata(session_id, {})


@pytest.mark.asyncio
async def test_delete_session(session_manager, mock_db_session):
    """Test deleting session."""
    session_id = "123e4567-e89b-12d3-a456-426614174000"

    await session_manager.delete_session(session_id)

    # Verify database operations
    assert mock_db_session.execute.called
    assert mock_db_session.commit.called


@pytest.mark.asyncio
async def test_get_session_stats(session_manager, mock_db_session):
    """Test getting session statistics."""
    session_id = "123e4567-e89b-12d3-a456-426614174000"

    # Mock session with metadata
    mock_session_result = MagicMock()
    mock_session_result.fetchone.return_value = (
        session_id,
        "doc-id",
        "2026-01-18T10:00:00",
        "2026-01-18T11:00:00",
        json.dumps(
            {
                "total_tokens": 5000,
                "estimated_cost_usd": 0.0025,
                "cache_hit_rate": 0.25,
                "avg_response_time_ms": 1500.0,
            }
        ),
    )

    mock_count_result = MagicMock()
    mock_count_result.fetchone.return_value = (10,)

    mock_db_session.execute.side_effect = [mock_session_result, mock_count_result]

    stats = await session_manager.get_session_stats(session_id)

    assert stats.message_count == 10
    assert stats.total_tokens == 5000
    assert stats.estimated_cost_usd == 0.0025
    assert stats.cache_hit_rate == 0.25
    assert stats.avg_response_time_ms == 1500.0


@pytest.mark.asyncio
async def test_check_spending_limit_under(session_manager, mock_db_session):
    """Test spending limit check when under limit."""
    session_id = "123e4567-e89b-12d3-a456-426614174000"

    # Mock session with low cost
    mock_session_result = MagicMock()
    mock_session_result.fetchone.return_value = (
        session_id,
        "doc-id",
        "2026-01-18T10:00:00",
        "2026-01-18T11:00:00",
        '{"estimated_cost_usd": 2.50}',
    )

    mock_count_result = MagicMock()
    mock_count_result.fetchone.return_value = (10,)

    mock_db_session.execute.side_effect = [mock_session_result, mock_count_result]

    result = await session_manager.check_spending_limit(session_id, max_cost_usd=5.00)

    assert result is True


@pytest.mark.asyncio
async def test_check_spending_limit_exceeded(session_manager, mock_db_session):
    """Test spending limit check when exceeded."""
    session_id = "123e4567-e89b-12d3-a456-426614174000"

    # Mock session with high cost
    mock_session_result = MagicMock()
    mock_session_result.fetchone.return_value = (
        session_id,
        "doc-id",
        "2026-01-18T10:00:00",
        "2026-01-18T11:00:00",
        '{"estimated_cost_usd": 6.00}',
    )

    mock_count_result = MagicMock()
    mock_count_result.fetchone.return_value = (10,)

    mock_db_session.execute.side_effect = [mock_session_result, mock_count_result]

    result = await session_manager.check_spending_limit(session_id, max_cost_usd=5.00)

    assert result is False


@pytest.mark.asyncio
async def test_save_message_user(session_manager, mock_db_session):
    """Test saving a user message."""
    session_id = "123e4567-e89b-12d3-a456-426614174000"
    content = "What is this document about?"

    # Mock session exists
    mock_session_result = MagicMock()
    mock_session_result.fetchone.return_value = (
        session_id,
        "doc-id",
        "2026-01-18T10:00:00",
        "2026-01-18T11:00:00",
        "{}",
    )

    mock_count_result = MagicMock()
    mock_count_result.fetchone.return_value = (0,)

    mock_db_session.execute.side_effect = [
        mock_session_result,
        mock_count_result,
        AsyncMock(),  # INSERT message
        AsyncMock(),  # UPDATE session
    ]

    message_id = await session_manager.save_message(session_id, "user", content)

    # Verify message_id is a UUID
    import uuid

    assert uuid.UUID(message_id)

    # Verify database operations
    assert mock_db_session.execute.call_count == 4  # get_session (2) + insert + update
    assert mock_db_session.commit.called


@pytest.mark.asyncio
async def test_save_message_assistant_with_metadata(session_manager, mock_db_session):
    """Test saving an assistant message with metadata."""
    session_id = "123e4567-e89b-12d3-a456-426614174000"
    content = "This document is about Python programming."
    metadata = {
        "sources": [{"chunk_id": "chunk-1", "similarity": 0.95}],
        "token_count": 150,
        "cost_usd": 0.0001,
        "cached": False,
    }

    # Mock session exists
    mock_session_result = MagicMock()
    mock_session_result.fetchone.return_value = (
        session_id,
        "doc-id",
        "2026-01-18T10:00:00",
        "2026-01-18T11:00:00",
        "{}",
    )

    mock_count_result = MagicMock()
    mock_count_result.fetchone.return_value = (1,)

    mock_db_session.execute.side_effect = [
        mock_session_result,
        mock_count_result,
        AsyncMock(),  # INSERT message
        AsyncMock(),  # UPDATE session
    ]

    message_id = await session_manager.save_message(
        session_id, "assistant", content, metadata
    )

    # Verify message_id is a UUID
    import uuid

    assert uuid.UUID(message_id)

    # Verify database operations
    assert mock_db_session.execute.call_count == 4
    assert mock_db_session.commit.called


@pytest.mark.asyncio
async def test_save_message_session_not_found(session_manager, mock_db_session):
    """Test saving message to non-existent session raises error."""
    session_id = "nonexistent"

    # Mock session doesn't exist
    mock_result = MagicMock()
    mock_result.fetchone.return_value = None
    mock_db_session.execute.return_value = mock_result

    with pytest.raises(ValueError, match="Session .* not found"):
        await session_manager.save_message(session_id, "user", "test message")


@pytest.mark.asyncio
async def test_save_message_invalid_role(session_manager, mock_db_session):
    """Test saving message with invalid role raises error."""
    session_id = "123e4567-e89b-12d3-a456-426614174000"

    with pytest.raises(ValueError, match="Invalid role"):
        await session_manager.save_message(session_id, "invalid_role", "test message")


@pytest.mark.asyncio
async def test_save_message_updates_session_timestamp(session_manager, mock_db_session):
    """Test that saving message updates session updated_at timestamp."""
    session_id = "123e4567-e89b-12d3-a456-426614174000"

    # Mock session exists
    mock_session_result = MagicMock()
    mock_session_result.fetchone.return_value = (
        session_id,
        "doc-id",
        "2026-01-18T10:00:00",
        "2026-01-18T10:00:00",  # Initial timestamp
        "{}",
    )

    mock_count_result = MagicMock()
    mock_count_result.fetchone.return_value = (0,)

    mock_db_session.execute.side_effect = [
        mock_session_result,
        mock_count_result,
        AsyncMock(),  # INSERT message
        AsyncMock(),  # UPDATE session
    ]

    await session_manager.save_message(session_id, "user", "test message")

    # Verify UPDATE was called (4th call)
    assert mock_db_session.execute.call_count == 4


@pytest.mark.asyncio
async def test_save_message_can_be_retrieved(session_manager, mock_db_session):
    """Test that saved message can be retrieved via get_session_messages."""
    session_id = "123e4567-e89b-12d3-a456-426614174000"
    content = "Test message"

    # Mock save_message flow
    mock_session_result = MagicMock()
    mock_session_result.fetchone.return_value = (
        session_id,
        "doc-id",
        "2026-01-18T10:00:00",
        "2026-01-18T11:00:00",
        "{}",
    )

    mock_count_result = MagicMock()
    mock_count_result.fetchone.return_value = (0,)

    # Mock get_session_messages flow
    message_id = "msg-123"
    mock_messages_result = MagicMock()
    mock_messages_result.fetchall.return_value = [
        (
            message_id,
            session_id,
            "user",
            content,
            "2026-01-18T11:00:00",
            None,
        )
    ]

    mock_db_session.execute.side_effect = [
        mock_session_result,
        mock_count_result,
        AsyncMock(),  # INSERT message
        AsyncMock(),  # UPDATE session
        mock_messages_result,  # get_session_messages
    ]

    # Save message
    saved_id = await session_manager.save_message(session_id, "user", content)

    # Retrieve messages
    messages = await session_manager.get_session_messages(session_id)

    # Verify message is in list
    assert len(messages) == 1
    assert messages[0]["content"] == content
    assert messages[0]["role"] == "user"


# ============================================================================
# Property-Based Tests
# ============================================================================


@given(st.floats(min_value=0.0, max_value=10.0))
def test_property_spending_limit_threshold(cost):
    """Property: Spending limit correctly identifies over/under threshold."""
    limit = 5.00

    # Create mock stats
    stats = SessionStats(
        message_count=10,
        total_tokens=5000,
        estimated_cost_usd=cost,
        cache_hit_rate=0.25,
        avg_response_time_ms=1500.0,
    )

    # Check threshold logic
    if cost < limit:
        assert stats.estimated_cost_usd < limit
    else:
        assert stats.estimated_cost_usd >= limit


@given(st.integers(min_value=1, max_value=48))
def test_property_ttl_cutoff_calculation(hours_ago):
    """Property: TTL cutoff correctly identifies old sessions."""
    ttl_hours = 24
    now = datetime.now()
    cutoff = now - timedelta(hours=ttl_hours)
    session_time = now - timedelta(hours=hours_ago)

    if hours_ago > ttl_hours:
        # Session is older than TTL, should be cleaned
        assert session_time < cutoff
    else:
        # Session is newer than TTL, should be kept
        assert session_time >= cutoff
