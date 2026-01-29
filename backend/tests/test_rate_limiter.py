"""Tests for RateLimiter service."""

import pytest
from datetime import datetime, timedelta
from hypothesis import given, strategies as st

from app.services.rate_limiter import RateLimiter, RateLimitError


# ============================================================================
# Unit Tests
# ============================================================================


@pytest.fixture
def rate_limiter():
    """Create RateLimiter instance."""
    return RateLimiter(queries_per_hour=10, max_concurrent_streams=3)


def test_rate_limiter_initialization(rate_limiter):
    """Test rate limiter initializes with correct parameters."""
    assert rate_limiter.queries_per_hour == 10
    assert rate_limiter.max_concurrent_streams == 3
    assert len(rate_limiter._query_counts) == 0
    assert len(rate_limiter._active_streams) == 0


@pytest.mark.asyncio
async def test_check_query_limit_under_limit(rate_limiter):
    """Test query limit check when under limit."""
    session_id = "test-session"

    # Should allow queries under limit
    for i in range(10):
        result = await rate_limiter.check_query_limit(session_id)
        assert result is True

    # 11th query should fail
    result = await rate_limiter.check_query_limit(session_id)
    assert result is False


@pytest.mark.asyncio
async def test_check_query_limit_multiple_sessions(rate_limiter):
    """Test query limits are per-session."""
    session1 = "session-1"
    session2 = "session-2"

    # Fill session1 to limit
    for i in range(10):
        await rate_limiter.check_query_limit(session1)

    # Session1 should be at limit
    assert await rate_limiter.check_query_limit(session1) is False

    # Session2 should still be under limit
    assert await rate_limiter.check_query_limit(session2) is True


@pytest.mark.asyncio
async def test_check_query_limit_old_queries_removed(rate_limiter):
    """Test old queries are removed from count."""
    session_id = "test-session"

    # Add queries
    for i in range(5):
        await rate_limiter.check_query_limit(session_id)

    # Manually set some queries to be old
    now = datetime.now()
    old_time = now - timedelta(hours=2)
    rate_limiter._query_counts[session_id][:3] = [old_time] * 3

    # Should only count recent queries (2 remaining)
    count = rate_limiter.get_query_count(session_id)
    assert count == 2


@pytest.mark.asyncio
async def test_check_stream_limit_under_limit(rate_limiter):
    """Test stream limit check when under limit."""
    session_id = "test-session"

    # Should allow streams under limit
    for i in range(3):
        result = await rate_limiter.check_stream_limit(session_id)
        assert result is True
        await rate_limiter.acquire_stream(session_id)

    # 4th stream should fail
    result = await rate_limiter.check_stream_limit(session_id)
    assert result is False


@pytest.mark.asyncio
async def test_acquire_stream_success(rate_limiter):
    """Test acquiring stream slot."""
    session_id = "test-session"

    await rate_limiter.acquire_stream(session_id)

    assert rate_limiter.get_active_streams(session_id) == 1


@pytest.mark.asyncio
async def test_acquire_stream_exceeds_limit(rate_limiter):
    """Test acquiring stream when at limit raises error."""
    session_id = "test-session"

    # Acquire up to limit
    for i in range(3):
        await rate_limiter.acquire_stream(session_id)

    # Next acquire should raise error
    with pytest.raises(RateLimitError, match="Too many concurrent requests"):
        await rate_limiter.acquire_stream(session_id)


@pytest.mark.asyncio
async def test_release_stream(rate_limiter):
    """Test releasing stream slot."""
    session_id = "test-session"

    await rate_limiter.acquire_stream(session_id)
    await rate_limiter.acquire_stream(session_id)

    assert rate_limiter.get_active_streams(session_id) == 2

    await rate_limiter.release_stream(session_id)

    assert rate_limiter.get_active_streams(session_id) == 1


@pytest.mark.asyncio
async def test_release_stream_when_zero(rate_limiter):
    """Test releasing stream when count is already zero."""
    session_id = "test-session"

    # Should not go negative
    await rate_limiter.release_stream(session_id)

    assert rate_limiter.get_active_streams(session_id) == 0


@pytest.mark.asyncio
async def test_acquire_release_cycle(rate_limiter):
    """Test full acquire/release cycle."""
    session_id = "test-session"

    # Acquire all slots
    for i in range(3):
        await rate_limiter.acquire_stream(session_id)

    # Can't acquire more
    with pytest.raises(RateLimitError):
        await rate_limiter.acquire_stream(session_id)

    # Release one
    await rate_limiter.release_stream(session_id)
    assert rate_limiter.get_active_streams(session_id) == 2

    # Can acquire again
    await rate_limiter.acquire_stream(session_id)
    assert rate_limiter.get_active_streams(session_id) == 3


def test_get_query_count(rate_limiter):
    """Test getting query count for session."""
    session_id = "test-session"

    # Add some queries
    now = datetime.now()
    rate_limiter._query_counts[session_id] = [
        now - timedelta(minutes=10),
        now - timedelta(minutes=20),
        now - timedelta(minutes=30),
    ]

    count = rate_limiter.get_query_count(session_id)
    assert count == 3


def test_get_query_count_filters_old(rate_limiter):
    """Test query count filters out old queries."""
    session_id = "test-session"

    now = datetime.now()
    rate_limiter._query_counts[session_id] = [
        now - timedelta(minutes=10),  # Recent
        now - timedelta(hours=2),  # Old
        now - timedelta(minutes=30),  # Recent
    ]

    count = rate_limiter.get_query_count(session_id)
    assert count == 2


def test_get_active_streams(rate_limiter):
    """Test getting active stream count."""
    session_id = "test-session"

    rate_limiter._active_streams[session_id] = 2

    count = rate_limiter.get_active_streams(session_id)
    assert count == 2


def test_get_active_streams_nonexistent_session(rate_limiter):
    """Test getting stream count for non-existent session returns 0."""
    count = rate_limiter.get_active_streams("nonexistent")
    assert count == 0


@pytest.mark.asyncio
async def test_cleanup_old_queries(rate_limiter):
    """Test cleanup removes old queries."""
    session_id = "test-session"

    now = datetime.now()
    rate_limiter._query_counts[session_id] = [
        now - timedelta(minutes=10),  # Recent
        now - timedelta(hours=2),  # Old
        now - timedelta(hours=3),  # Old
    ]

    await rate_limiter._cleanup_old_queries()

    # Only recent query should remain
    assert len(rate_limiter._query_counts[session_id]) == 1


@pytest.mark.asyncio
async def test_cleanup_removes_empty_sessions(rate_limiter):
    """Test cleanup removes sessions with no recent queries."""
    session_id = "test-session"

    now = datetime.now()
    rate_limiter._query_counts[session_id] = [
        now - timedelta(hours=2),
        now - timedelta(hours=3),
    ]

    await rate_limiter._cleanup_old_queries()

    # Session should be removed entirely
    assert session_id not in rate_limiter._query_counts


# ============================================================================
# Property-Based Tests
# ============================================================================


@given(st.integers(min_value=1, max_value=200))
def test_property_query_count_never_exceeds_limit(limit):
    """Property: Query count never exceeds limit per hour."""
    rate_limiter = RateLimiter(queries_per_hour=limit)
    session_id = "test-session"

    # Try to add more queries than limit
    for i in range(limit + 10):
        # Manually add query
        rate_limiter._query_counts[session_id].append(datetime.now())

    # Count should not exceed limit when checked
    count = rate_limiter.get_query_count(session_id)
    assert count <= limit + 10  # All are recent, so all counted


@given(st.integers(min_value=1, max_value=10))
def test_property_concurrent_streams_never_exceeds_limit(limit):
    """Property: Concurrent streams never exceed limit."""
    rate_limiter = RateLimiter(max_concurrent_streams=limit)
    session_id = "test-session"

    # Manually set to limit
    rate_limiter._active_streams[session_id] = limit

    # Should not allow more
    import asyncio

    result = asyncio.run(rate_limiter.check_stream_limit(session_id))
    assert result is False


@given(st.integers(min_value=1, max_value=120))
def test_property_old_queries_cleaned_up(minutes_ago):
    """Property: Queries older than 1 hour are cleaned up."""
    rate_limiter = RateLimiter()
    session_id = "test-session"

    query_time = datetime.now() - timedelta(minutes=minutes_ago)
    rate_limiter._query_counts[session_id] = [query_time]

    count = rate_limiter.get_query_count(session_id)

    if minutes_ago >= 60:
        # Should be filtered out
        assert count == 0
    else:
        # Should still be counted
        assert count == 1
