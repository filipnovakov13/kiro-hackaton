"""Tests for ResponseCache service."""

import pytest
from datetime import datetime, timedelta
from hypothesis import given, strategies as st
from unittest.mock import MagicMock

from app.services.response_cache import ResponseCache, CachedResponse


# ============================================================================
# Unit Tests
# ============================================================================


@pytest.fixture
def cache():
    """Create ResponseCache instance."""
    return ResponseCache(max_size=10, ttl_hours=1)


def test_cache_initialization(cache):
    """Test cache initializes with correct parameters."""
    assert cache.max_size == 10
    assert cache.ttl == timedelta(hours=1)
    assert len(cache._cache) == 0
    assert cache._stats["hits"] == 0
    assert cache._stats["misses"] == 0


def test_compute_key_same_query_same_key(cache):
    """Test same query produces same key."""
    key1 = cache.compute_key("What is this?", ["doc1"], None)
    key2 = cache.compute_key("What is this?", ["doc1"], None)
    assert key1 == key2


def test_compute_key_different_query_different_key(cache):
    """Test different queries produce different keys."""
    key1 = cache.compute_key("What is this?", ["doc1"], None)
    key2 = cache.compute_key("What is that?", ["doc1"], None)
    assert key1 != key2


def test_compute_key_different_documents_different_key(cache):
    """Test different documents produce different keys."""
    key1 = cache.compute_key("What is this?", ["doc1"], None)
    key2 = cache.compute_key("What is this?", ["doc2"], None)
    assert key1 != key2


def test_compute_key_with_focus_context(cache):
    """Test focus context affects cache key."""
    focus1 = {"start_char": 100, "end_char": 200}
    focus2 = {"start_char": 300, "end_char": 400}

    key1 = cache.compute_key("What is this?", ["doc1"], focus1)
    key2 = cache.compute_key("What is this?", ["doc1"], focus2)
    assert key1 != key2


def test_compute_key_document_order_normalized(cache):
    """Test document order doesn't affect key (sorted)."""
    key1 = cache.compute_key("query", ["doc1", "doc2"], None)
    key2 = cache.compute_key("query", ["doc2", "doc1"], None)
    assert key1 == key2


def test_set_and_get(cache):
    """Test setting and getting cached response."""
    key = cache.compute_key("test query", ["doc1"], None)

    cache.set(key, "response text", [], 100)

    result = cache.get(key)
    assert result is not None
    assert result.response_text == "response text"
    assert result.token_count == 100
    assert result.hit_count == 1


def test_get_nonexistent_key(cache):
    """Test getting non-existent key returns None."""
    result = cache.get("nonexistent-key")
    assert result is None


def test_get_updates_hit_count(cache):
    """Test getting cached response increments hit count."""
    key = cache.compute_key("test", ["doc1"], None)
    cache.set(key, "response", [], 100)

    cache.get(key)
    cache.get(key)
    cache.get(key)

    result = cache.get(key)
    assert result.hit_count == 4


def test_get_moves_to_end_lru(cache):
    """Test getting entry moves it to end (most recently used)."""
    # Add multiple entries
    for i in range(5):
        key = cache.compute_key(f"query{i}", ["doc1"], None)
        cache.set(key, f"response{i}", [], 100)

    # Access first entry
    first_key = cache.compute_key("query0", ["doc1"], None)
    cache.get(first_key)

    # First key should now be at the end
    keys = list(cache._cache.keys())
    assert keys[-1] == first_key


def test_lru_eviction_when_full(cache):
    """Test LRU eviction when cache reaches max size."""
    # Fill cache to max
    for i in range(10):
        key = cache.compute_key(f"query{i}", ["doc1"], None)
        cache.set(key, f"response{i}", [], 100)

    assert len(cache._cache) == 10

    # Add one more - should evict oldest
    new_key = cache.compute_key("new query", ["doc1"], None)
    cache.set(new_key, "new response", [], 100)

    assert len(cache._cache) == 10

    # First entry should be evicted
    first_key = cache.compute_key("query0", ["doc1"], None)
    assert cache.get(first_key) is None


def test_ttl_expiration(cache):
    """Test entries expire after TTL."""
    key = cache.compute_key("test", ["doc1"], None)
    cache.set(key, "response", [], 100)

    # Manually set created_at to past
    cache._cache[key].created_at = datetime.now() - timedelta(hours=2)

    # Should return None (expired)
    result = cache.get(key)
    assert result is None

    # Entry should be removed
    assert key not in cache._cache


def test_clear(cache):
    """Test clearing cache."""
    # Add entries
    for i in range(5):
        key = cache.compute_key(f"query{i}", ["doc1"], None)
        cache.set(key, f"response{i}", [], 100)

    assert len(cache._cache) == 5

    count = cache.clear()

    assert count == 5
    assert len(cache._cache) == 0


def test_invalidate_document(cache):
    """Test invalidating entries for specific document."""
    # Add entries for different documents
    key1 = cache.compute_key("query1", ["doc1"], None)
    cache.set(key1, "response1", [{"document_id": "doc1"}], 100)

    key2 = cache.compute_key("query2", ["doc2"], None)
    cache.set(key2, "response2", [{"document_id": "doc2"}], 100)

    key3 = cache.compute_key("query3", ["doc1"], None)
    cache.set(key3, "response3", [{"document_id": "doc1"}], 100)

    assert len(cache._cache) == 3

    # Invalidate doc1
    count = cache.invalidate_document("doc1")

    assert count == 2
    assert len(cache._cache) == 1
    assert cache.get(key2) is not None  # doc2 entry still exists


def test_get_stats(cache):
    """Test getting cache statistics."""
    # Add some entries and access them
    key1 = cache.compute_key("query1", ["doc1"], None)
    cache.set(key1, "response1", [], 100)

    cache.get(key1)  # Hit
    cache.get("nonexistent")  # Miss

    stats = cache.get_stats()

    assert stats["hits"] == 1
    assert stats["misses"] == 1
    assert stats["total_queries"] == 2
    assert stats["hit_rate"] == 0.5
    assert stats["cache_size"] == 1
    assert stats["max_size"] == 10


def test_stats_hit_rate_calculation(cache):
    """Test hit rate calculation."""
    key = cache.compute_key("query", ["doc1"], None)
    cache.set(key, "response", [], 100)

    # 3 hits, 2 misses
    cache.get(key)
    cache.get(key)
    cache.get(key)
    cache.get("miss1")
    cache.get("miss2")

    stats = cache.get_stats()
    assert stats["hit_rate"] == 0.6  # 3/5


def test_cached_response_dataclass():
    """Test CachedResponse dataclass."""
    response = CachedResponse(
        response_text="test response",
        source_chunks=[{"chunk_id": "123"}],
        token_count=50,
        created_at=datetime.now(),
        hit_count=5,
    )

    assert response.response_text == "test response"
    assert response.token_count == 50
    assert response.hit_count == 5


# ============================================================================
# Property-Based Tests
# ============================================================================


@given(st.text(min_size=1, max_size=100))
def test_property_same_query_same_key(query):
    """Property: Same query always produces same key."""
    cache = ResponseCache()
    key1 = cache.compute_key(query, ["doc1"], None)
    key2 = cache.compute_key(query, ["doc1"], None)
    assert key1 == key2


@given(st.integers(min_value=1, max_value=100))
def test_property_cache_size_never_exceeds_max(max_size):
    """Property: Cache size never exceeds max_size."""
    cache = ResponseCache(max_size=max_size)

    # Add more entries than max_size
    for i in range(max_size + 10):
        key = cache.compute_key(f"query{i}", ["doc1"], None)
        cache.set(key, f"response{i}", [], 100)

    assert len(cache._cache) <= max_size


@given(st.integers(min_value=1, max_value=48))
def test_property_expired_entries_not_returned(hours_ago):
    """Property: Expired entries are not returned."""
    cache = ResponseCache(ttl_hours=24)
    key = cache.compute_key("test", ["doc1"], None)
    cache.set(key, "response", [], 100)

    # Set created_at to past
    cache._cache[key].created_at = datetime.now() - timedelta(hours=hours_ago)

    result = cache.get(key)

    if hours_ago > 24:
        # Should be expired
        assert result is None
    else:
        # Should still be valid
        assert result is not None


@given(
    st.lists(st.text(min_size=1, max_size=20), min_size=1, max_size=5),
    st.lists(st.text(min_size=1, max_size=20), min_size=1, max_size=5),
)
def test_property_document_order_normalized(docs1, docs2):
    """Property: Document order doesn't affect cache key."""
    cache = ResponseCache()

    # Same documents, different order
    if set(docs1) == set(docs2):
        key1 = cache.compute_key("query", docs1, None)
        key2 = cache.compute_key("query", docs2, None)
        assert key1 == key2
