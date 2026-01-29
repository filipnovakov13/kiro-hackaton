"""
Rate limiting service for API requests.

Implements:
- Per-session query limits (queries per hour)
- Concurrent stream limits (simultaneous SSE connections)
- Backpressure handling
"""

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict
import asyncio

from app.core.logging_config import StructuredLogger

logger = StructuredLogger(__name__)


class RateLimiter:
    """Rate limiter for API requests.

    Implements:
    - Per-session query limits (queries per hour)
    - Concurrent stream limits (simultaneous SSE connections)
    - Backpressure handling
    """

    def __init__(self, queries_per_hour: int = 100, max_concurrent_streams: int = 5):
        """Initialize rate limiter.

        Args:
            queries_per_hour: Maximum queries per session per hour (default 100)
            max_concurrent_streams: Maximum concurrent streams per session (default 5)
        """
        self.queries_per_hour = queries_per_hour
        self.max_concurrent_streams = max_concurrent_streams

        # Track query counts per session
        self._query_counts: Dict[str, list] = defaultdict(list)

        # Track active streams per session
        self._active_streams: Dict[str, int] = defaultdict(int)

        # Cleanup task
        self._cleanup_task = None

    async def start_cleanup_task(self):
        """Start background task for cleanup."""
        self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
        logger.info("Rate limiter cleanup task started")

    async def stop_cleanup_task(self):
        """Stop background cleanup task."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            logger.info("Rate limiter cleanup task stopped")

    async def check_query_limit(self, session_id: str) -> bool:
        """Check if session can make another query.

        Args:
            session_id: Session to check

        Returns:
            True if under limit, False if exceeded
        """
        now = datetime.now()
        cutoff = now - timedelta(hours=1)

        # Remove old queries
        self._query_counts[session_id] = [
            ts for ts in self._query_counts[session_id] if ts > cutoff
        ]

        # Check limit
        if len(self._query_counts[session_id]) >= self.queries_per_hour:
            logger.warning(
                "Rate limit exceeded for session",
                session_id=session_id,
                query_count=len(self._query_counts[session_id]),
                limit=self.queries_per_hour,
            )
            return False

        # Record this query
        self._query_counts[session_id].append(now)
        return True

    async def check_stream_limit(self, session_id: str) -> bool:
        """Check if session can start another stream.

        Args:
            session_id: Session to check

        Returns:
            True if under limit, False if exceeded
        """
        if self._active_streams[session_id] >= self.max_concurrent_streams:
            logger.warning(
                "Concurrent stream limit exceeded for session",
                session_id=session_id,
                active_streams=self._active_streams[session_id],
                limit=self.max_concurrent_streams,
            )
            return False

        return True

    async def acquire_stream(self, session_id: str):
        """Acquire a stream slot.

        Args:
            session_id: Session acquiring stream

        Raises:
            RateLimitError: If stream limit exceeded
        """
        if not await self.check_stream_limit(session_id):
            raise RateLimitError(
                "Too many concurrent requests. Please wait for previous requests to complete."
            )

        self._active_streams[session_id] += 1
        logger.info(
            "Stream acquired for session",
            session_id=session_id,
            active_streams=self._active_streams[session_id],
        )

    async def release_stream(self, session_id: str):
        """Release a stream slot.

        Args:
            session_id: Session releasing stream
        """
        if self._active_streams[session_id] > 0:
            self._active_streams[session_id] -= 1
            logger.info(
                "Stream released for session",
                session_id=session_id,
                active_streams=self._active_streams[session_id],
            )

    def get_query_count(self, session_id: str) -> int:
        """Get current query count for session.

        Args:
            session_id: Session to check

        Returns:
            Number of queries in last hour
        """
        now = datetime.now()
        cutoff = now - timedelta(hours=1)

        # Filter to queries within last hour
        recent_queries = [ts for ts in self._query_counts[session_id] if ts > cutoff]
        return len(recent_queries)

    def get_active_streams(self, session_id: str) -> int:
        """Get current active stream count for session.

        Args:
            session_id: Session to check

        Returns:
            Number of active streams
        """
        return self._active_streams[session_id]

    async def _periodic_cleanup(self):
        """Background task to clean up old data."""
        while True:
            try:
                await asyncio.sleep(300)  # Every 5 minutes
                await self._cleanup_old_queries()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(
                    "Rate limiter cleanup error",
                    error_type=type(e).__name__,
                    error_message=str(e),
                )

    async def _cleanup_old_queries(self):
        """Remove query timestamps older than 1 hour."""
        now = datetime.now()
        cutoff = now - timedelta(hours=1)

        for session_id in list(self._query_counts.keys()):
            self._query_counts[session_id] = [
                ts for ts in self._query_counts[session_id] if ts > cutoff
            ]

            # Remove empty entries
            if not self._query_counts[session_id]:
                del self._query_counts[session_id]


class RateLimitError(Exception):
    """Custom exception for rate limit errors."""

    pass
