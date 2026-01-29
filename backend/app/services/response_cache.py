"""
Response caching service for RAG queries.

Implements LRU (Least Recently Used) cache with TTL expiration
to reduce costs and improve response times for repeated queries.
"""

from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional, List
import hashlib
import asyncio

from app.core.logging_config import StructuredLogger

logger = StructuredLogger(__name__)


@dataclass
class CachedResponse:
    """Cached RAG response."""

    response_text: str
    source_chunks: List[dict]
    token_count: int
    created_at: datetime
    hit_count: int


class ResponseCache:
    """LRU cache for RAG responses.

    Uses OrderedDict for O(1) access and LRU eviction.
    Configurable size and TTL.
    """

    def __init__(self, max_size: int = 500, ttl_hours: int = 24):
        """Initialize response cache.

        Args:
            max_size: Maximum number of cached responses (default 500)
            ttl_hours: Time-to-live in hours (default 24)
        """
        self.max_size = max_size
        self.ttl = timedelta(hours=ttl_hours)
        self._cache: OrderedDict[str, CachedResponse] = OrderedDict()
        self._stats = {"hits": 0, "misses": 0, "total_queries": 0}

    def compute_key(
        self, query: str, document_ids: List[str], focus_context: Optional[dict]
    ) -> str:
        """Compute cache key from query components.

        Args:
            query: User's query text
            document_ids: List of document IDs involved in query
            focus_context: Optional focus caret context

        Returns:
            SHA256 hash of query components
        """
        focus_hash = ""
        if focus_context:
            focus_hash = (
                f":{focus_context.get('start_char')}:{focus_context.get('end_char')}"
            )

        # Normalize document list: remove duplicates and sort
        normalized_docs = sorted(set(document_ids))
        content = f"{query}:{','.join(normalized_docs)}{focus_hash}"
        return hashlib.sha256(content.encode()).hexdigest()

    def get(self, key: str) -> Optional[CachedResponse]:
        """Get cached response if exists and not expired.

        Args:
            key: Cache key

        Returns:
            CachedResponse if found and valid, None otherwise
        """
        self._stats["total_queries"] += 1

        if key not in self._cache:
            self._stats["misses"] += 1
            return None

        cached = self._cache[key]

        # Check expiration
        if datetime.now() - cached.created_at > self.ttl:
            del self._cache[key]
            self._stats["misses"] += 1
            return None

        # Move to end (most recently used)
        self._cache.move_to_end(key)
        cached.hit_count += 1
        self._stats["hits"] += 1

        # Log cache hit asynchronously (only if event loop is running)
        try:
            asyncio.create_task(self._log_cache_hit(key))
        except RuntimeError:
            # No event loop running (e.g., in sync tests)
            pass

        # Log stats every 50 queries
        if self._stats["total_queries"] % 50 == 0:
            try:
                asyncio.create_task(self._log_stats())
            except RuntimeError:
                pass

        return cached

    def set(
        self, key: str, response_text: str, source_chunks: List, token_count: int
    ) -> None:
        """Store response in cache.

        Args:
            key: Cache key
            response_text: Complete response text
            source_chunks: List of source chunks used
            token_count: Total tokens in response
        """
        # Evict oldest if at capacity
        if len(self._cache) >= self.max_size:
            self._cache.popitem(last=False)  # Remove oldest (FIFO)

        self._cache[key] = CachedResponse(
            response_text=response_text,
            source_chunks=[
                chunk.__dict__ if hasattr(chunk, "__dict__") else chunk
                for chunk in source_chunks
            ],
            token_count=token_count,
            created_at=datetime.now(),
            hit_count=0,
        )

    def clear(self) -> int:
        """Clear all cached responses.

        Returns:
            Number of entries cleared
        """
        count = len(self._cache)
        self._cache.clear()
        logger.info("Response cache cleared", entries_removed=count)
        return count

    def invalidate_document(self, document_id: str) -> int:
        """Invalidate all cache entries for a specific document.

        Args:
            document_id: Document whose cache entries should be invalidated

        Returns:
            Number of entries invalidated
        """
        # Find and remove all entries containing this document_id
        keys_to_remove = []
        for key, cached in self._cache.items():
            # Check if any source chunk references this document
            for chunk in cached.source_chunks:
                if chunk.get("document_id") == document_id:
                    keys_to_remove.append(key)
                    break

        for key in keys_to_remove:
            del self._cache[key]

        if keys_to_remove:
            logger.info(
                "Cache entries invalidated for document",
                document_id=document_id,
                entries_invalidated=len(keys_to_remove),
            )

        return len(keys_to_remove)

    def get_stats(self) -> dict:
        """Get cache statistics.

        Returns:
            Dict with hits, misses, hit_rate, cache_size, max_size
        """
        hit_rate = 0.0
        if self._stats["total_queries"] > 0:
            hit_rate = self._stats["hits"] / self._stats["total_queries"]

        return {
            **self._stats,
            "hit_rate": hit_rate,
            "cache_size": len(self._cache),
            "max_size": self.max_size,
        }

    async def _log_cache_hit(self, key: str) -> None:
        """Log cache hit asynchronously.

        Args:
            key: Cache key that was hit
        """
        logger.info("Cache hit", cache_key=key[:16])

    async def _log_stats(self) -> None:
        """Log cache statistics asynchronously."""
        stats = self.get_stats()
        logger.info(
            "Cache statistics",
            hits=stats["hits"],
            misses=stats["misses"],
            hit_rate=f"{stats['hit_rate']:.2%}",
            cache_size=stats["cache_size"],
            max_size=stats["max_size"],
        )
