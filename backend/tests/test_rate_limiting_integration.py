"""
Integration test for rate limiting.

**Validates: Requirement 14.7-14.8 (Rate Limiting)**
"""

import pytest
import asyncio
from datetime import datetime, timedelta

from app.services.rate_limiter import RateLimiter


@pytest.mark.asyncio
async def test_query_limit_enforcement():
    """Test that query limits are enforced per session."""
    rate_limiter = RateLimiter(queries_per_hour=5, max_concurrent_streams=3)

    session_id = "test_session_1"

    # First 5 queries should be allowed
    for i in range(5):
        allowed = await rate_limiter.check_query_limit(session_id)
        assert allowed is True, f"Query {i+1} should be allowed"

    # 6th query should be blocked
    allowed = await rate_limiter.check_query_limit(session_id)
    assert allowed is False, "6th query should be blocked (limit is 5)"


@pytest.mark.asyncio
async def test_query_limit_per_session():
    """Test that query limits are tracked per session independently."""
    rate_limiter = RateLimiter(queries_per_hour=3, max_concurrent_streams=3)

    session_1 = "session_1"
    session_2 = "session_2"

    # Session 1: Use up limit
    for i in range(3):
        allowed = await rate_limiter.check_query_limit(session_1)
        assert allowed is True, f"Session 1 query {i+1} should be allowed"

    # Session 1: Should be blocked
    allowed = await rate_limiter.check_query_limit(session_1)
    assert allowed is False, "Session 1 should be blocked"

    # Session 2: Should still be allowed (independent limit)
    for i in range(3):
        allowed = await rate_limiter.check_query_limit(session_2)
        assert allowed is True, f"Session 2 query {i+1} should be allowed"

    # Session 2: Should now be blocked
    allowed = await rate_limiter.check_query_limit(session_2)
    assert allowed is False, "Session 2 should be blocked"


@pytest.mark.asyncio
async def test_concurrent_stream_limit():
    """Test that concurrent stream limits are enforced."""
    rate_limiter = RateLimiter(queries_per_hour=100, max_concurrent_streams=3)

    session_id = "test_session_2"

    # First 3 streams should be allowed
    for i in range(3):
        allowed = await rate_limiter.check_stream_limit(session_id)
        assert allowed is True, f"Stream {i+1} should be allowed"
        await rate_limiter.acquire_stream(session_id)

    # 4th stream should be blocked
    allowed = await rate_limiter.check_stream_limit(session_id)
    assert allowed is False, "4th stream should be blocked (limit is 3)"


@pytest.mark.asyncio
async def test_stream_release_allows_new_streams():
    """Test that releasing a stream allows new streams to be acquired."""
    rate_limiter = RateLimiter(queries_per_hour=100, max_concurrent_streams=2)

    session_id = "test_session_3"

    # Acquire 2 streams (at limit)
    await rate_limiter.acquire_stream(session_id)
    await rate_limiter.acquire_stream(session_id)

    # 3rd stream should be blocked
    allowed = await rate_limiter.check_stream_limit(session_id)
    assert allowed is False, "3rd stream should be blocked"

    # Release one stream
    await rate_limiter.release_stream(session_id)

    # Now 3rd stream should be allowed
    allowed = await rate_limiter.check_stream_limit(session_id)
    assert allowed is True, "3rd stream should be allowed after release"


@pytest.mark.asyncio
async def test_concurrent_streams_per_session():
    """Test that concurrent stream limits are tracked per session independently."""
    rate_limiter = RateLimiter(queries_per_hour=100, max_concurrent_streams=2)

    session_1 = "session_1"
    session_2 = "session_2"

    # Session 1: Acquire 2 streams (at limit)
    await rate_limiter.acquire_stream(session_1)
    await rate_limiter.acquire_stream(session_1)

    # Session 1: Should be blocked
    allowed = await rate_limiter.check_stream_limit(session_1)
    assert allowed is False, "Session 1 should be blocked"

    # Session 2: Should still be allowed (independent limit)
    allowed = await rate_limiter.check_stream_limit(session_2)
    assert allowed is True, "Session 2 should be allowed"

    await rate_limiter.acquire_stream(session_2)
    await rate_limiter.acquire_stream(session_2)

    # Session 2: Should now be blocked
    allowed = await rate_limiter.check_stream_limit(session_2)
    assert allowed is False, "Session 2 should be blocked"


@pytest.mark.asyncio
async def test_query_limit_cleanup():
    """Test that old query timestamps are cleaned up."""
    rate_limiter = RateLimiter(queries_per_hour=3, max_concurrent_streams=3)

    session_id = "test_session_cleanup"

    # Manually add old timestamps (more than 1 hour ago)
    old_time = datetime.now() - timedelta(hours=2)
    rate_limiter._query_counts[session_id] = [old_time, old_time, old_time]

    # Check query limit - should clean up old timestamps and allow new queries
    allowed = await rate_limiter.check_query_limit(session_id)
    assert allowed is True, "Old timestamps should be cleaned up, allowing new queries"

    # Verify old timestamps were removed
    assert (
        len(rate_limiter._query_counts[session_id]) == 1
    ), "Should only have 1 recent timestamp"


@pytest.mark.asyncio
async def test_stream_release_prevents_negative_count():
    """Test that releasing more streams than acquired doesn't cause negative counts."""
    rate_limiter = RateLimiter(queries_per_hour=100, max_concurrent_streams=3)

    session_id = "test_session_4"

    # Release without acquiring (should not go negative)
    await rate_limiter.release_stream(session_id)
    await rate_limiter.release_stream(session_id)

    # Should still be able to acquire streams
    allowed = await rate_limiter.check_stream_limit(session_id)
    assert (
        allowed is True
    ), "Should be able to acquire streams even after extra releases"

    await rate_limiter.acquire_stream(session_id)

    # Verify count is correct
    assert (
        rate_limiter._active_streams[session_id] >= 0
    ), "Stream count should not be negative"


@pytest.mark.asyncio
async def test_backpressure_handling():
    """Test that rate limiter handles backpressure correctly."""
    rate_limiter = RateLimiter(queries_per_hour=100, max_concurrent_streams=2)

    session_id = "test_session_backpressure"

    # Simulate multiple concurrent requests
    tasks = []
    for i in range(5):
        task = rate_limiter.check_stream_limit(session_id)
        tasks.append(task)

    results = await asyncio.gather(*tasks)

    # All checks should complete without errors
    assert len(results) == 5, "All checks should complete"
    assert all(isinstance(r, bool) for r in results), "All results should be boolean"


@pytest.mark.asyncio
async def test_rate_limiter_with_realistic_scenario():
    """Test rate limiter with a realistic usage scenario."""
    rate_limiter = RateLimiter(queries_per_hour=10, max_concurrent_streams=3)

    session_id = "realistic_session"

    # Simulate 5 queries
    for i in range(5):
        allowed = await rate_limiter.check_query_limit(session_id)
        assert allowed is True, f"Query {i+1} should be allowed"

    # Simulate 2 concurrent streams
    await rate_limiter.acquire_stream(session_id)
    await rate_limiter.acquire_stream(session_id)

    # Check stream limit
    allowed = await rate_limiter.check_stream_limit(session_id)
    assert allowed is True, "3rd stream should be allowed (limit is 3)"

    await rate_limiter.acquire_stream(session_id)

    # Now at limit
    allowed = await rate_limiter.check_stream_limit(session_id)
    assert allowed is False, "4th stream should be blocked"

    # Release one stream
    await rate_limiter.release_stream(session_id)

    # Should be able to acquire again
    allowed = await rate_limiter.check_stream_limit(session_id)
    assert allowed is True, "Stream should be allowed after release"

    # Continue with more queries
    for i in range(5):
        allowed = await rate_limiter.check_query_limit(session_id)
        assert allowed is True, f"Query {i+6} should be allowed"

    # Now at query limit (10 total)
    allowed = await rate_limiter.check_query_limit(session_id)
    assert allowed is False, "11th query should be blocked"
