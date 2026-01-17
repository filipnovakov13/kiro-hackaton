"""
Property-based tests for EmbeddingService using Hypothesis with mocking.

**Validates: Requirements 5.2, 5.3**

Based on research:
- Mock external API calls (Voyage AI) to avoid network dependencies
- Test properties of the service logic, not the external API
- Focus on caching behavior and dimension consistency
"""

import pytest
from hypothesis import given, strategies as st, settings
from unittest.mock import Mock, MagicMock, patch

from app.services.embedding_service import EmbeddingService, EmbeddingError


class MockEmbedResult:
    """Mock result from Voyage AI embed call."""

    def __init__(self, embeddings):
        self.embeddings = embeddings


class TestEmbeddingServiceProperties:
    """Property-based tests for EmbeddingService."""

    @given(num_texts=st.integers(min_value=1, max_value=10))
    @settings(max_examples=20, deadline=1000)
    def test_property_6_embedding_dimension_consistency(self, num_texts):
        """
        **Property 6: Embedding Dimension Consistency**
        All embeddings should be 512-dimensional regardless of input.

        **Validates: Requirements 5.2, 5.3**

        Property: For any list of texts, all returned embeddings must have
        exactly 512 dimensions (the Voyage 3.5 Lite model dimension).
        """
        # Create service with mock API key
        service = EmbeddingService(api_key="test_key", enable_cache=False)

        # Generate test texts
        texts = [f"Test document {i}" for i in range(num_texts)]

        # Mock the Voyage AI client to return 512-dimensional embeddings
        mock_embeddings = [[0.1] * 512 for _ in range(num_texts)]
        mock_result = MockEmbedResult(embeddings=mock_embeddings)

        with patch.object(service._client, "embed", return_value=mock_result):
            # Run the embedding operation
            import asyncio

            result = asyncio.run(service.embed_documents(texts))

            # Property: All embeddings must be 512-dimensional
            assert (
                len(result) == num_texts
            ), f"Expected {num_texts} embeddings, got {len(result)}"
            for i, embedding in enumerate(result):
                assert (
                    len(embedding) == 512
                ), f"Embedding {i} has {len(embedding)} dimensions, expected 512"

        service.shutdown()

    @given(text=st.text(min_size=1, max_size=100))
    @settings(max_examples=20, deadline=1000)
    def test_property_7_embedding_cache_consistency(self, text):
        """
        **Property 7: Embedding Cache Consistency**
        Same input should return cached result without calling API again.

        **Validates: Requirements 5.3**

        Property: When the same text is embedded twice with caching enabled,
        the second call should return the cached result without calling the API.
        """
        # Create service with caching enabled
        service = EmbeddingService(api_key="test_key", enable_cache=True)

        # Mock the Voyage AI client
        mock_embedding = [0.1] * 512
        mock_result = MockEmbedResult(embeddings=[mock_embedding])

        with patch.object(
            service._client, "embed", return_value=mock_result
        ) as mock_embed:
            # First call - should hit the API
            import asyncio

            result1 = asyncio.run(service.embed_query(text))

            # Verify API was called once
            assert mock_embed.call_count == 1, "API should be called on first request"

            # Second call with same text - should use cache
            result2 = asyncio.run(service.embed_query(text))

            # Property: API should still only be called once (cache hit)
            assert (
                mock_embed.call_count == 1
            ), "API should not be called again for cached text"

            # Property: Results should be identical
            assert result1 == result2, "Cached result should match original"
            assert len(result2) == 512, "Cached embedding should be 512-dimensional"

        service.shutdown()

    def test_cache_disabled_always_calls_api(self):
        """When cache is disabled, API should be called every time."""
        service = EmbeddingService(api_key="test_key", enable_cache=False)

        text = "Test document"
        mock_embedding = [0.1] * 512
        mock_result = MockEmbedResult(embeddings=[mock_embedding])

        with patch.object(
            service._client, "embed", return_value=mock_result
        ) as mock_embed:
            import asyncio

            # Call twice with same text
            asyncio.run(service.embed_query(text))
            asyncio.run(service.embed_query(text))

            # Should call API both times when cache is disabled
            assert (
                mock_embed.call_count == 2
            ), "API should be called twice when cache is disabled"

        service.shutdown()

    def test_batching_respects_max_batch_size(self):
        """Large document lists should be split into batches of max 128."""
        service = EmbeddingService(api_key="test_key", enable_cache=False)

        # Create 200 texts (should be split into 2 batches: 128 + 72)
        texts = [f"Document {i}" for i in range(200)]

        mock_embedding = [0.1] * 512

        with patch.object(service._client, "embed") as mock_embed:
            # Mock returns appropriate number of embeddings based on batch size
            def mock_embed_fn(texts, model, input_type):
                return MockEmbedResult(embeddings=[[0.1] * 512 for _ in texts])

            mock_embed.side_effect = mock_embed_fn

            import asyncio

            result = asyncio.run(service.embed_documents(texts))

            # Should be called twice (2 batches)
            assert (
                mock_embed.call_count == 2
            ), f"Expected 2 API calls for 200 texts, got {mock_embed.call_count}"

            # First call should have 128 texts
            first_call_args = mock_embed.call_args_list[0]
            assert (
                len(first_call_args[1]["texts"]) == 128
            ), "First batch should have 128 texts"

            # Second call should have 72 texts
            second_call_args = mock_embed.call_args_list[1]
            assert (
                len(second_call_args[1]["texts"]) == 72
            ), "Second batch should have 72 texts"

            # Total result should have 200 embeddings
            assert len(result) == 200, f"Expected 200 embeddings, got {len(result)}"

        service.shutdown()

    def test_authentication_error_raises_immediately(self):
        """Authentication errors should not be retried."""
        service = EmbeddingService(api_key="test_key", enable_cache=False)

        import voyageai

        with patch.object(
            service._client,
            "embed",
            side_effect=voyageai.error.AuthenticationError("Invalid API key"),
        ):
            import asyncio

            with pytest.raises(EmbeddingError, match="Configuration error"):
                asyncio.run(service.embed_query("test"))

        service.shutdown()
