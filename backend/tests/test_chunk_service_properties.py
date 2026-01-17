"""
Property-based tests for ChunkService using Hypothesis.

**Validates: Requirements 4.2, 4.4, 4.7**
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck, assume

from app.services.chunk_service import ChunkService, ChunkingError


# Test data generators
@st.composite
def markdown_text(draw):
    """Generate valid markdown text with paragraphs."""
    num_paragraphs = draw(st.integers(min_value=1, max_value=20))
    paragraphs = []

    for _ in range(num_paragraphs):
        # Generate paragraph with 1-50 words
        num_words = draw(st.integers(min_value=1, max_value=50))
        words = [
            draw(
                st.text(
                    min_size=1,
                    max_size=15,
                    alphabet=st.characters(
                        whitelist_categories=("Lu", "Ll", "Nd"),
                        min_codepoint=ord("a"),
                        max_codepoint=ord("z"),
                    ),
                )
            )
            for _ in range(num_words)
        ]
        paragraphs.append(" ".join(words))

    return "\n\n".join(paragraphs)


class TestChunkServiceProperties:
    """Property-based tests for ChunkService."""

    @given(text=markdown_text())
    @settings(
        suppress_health_check=[HealthCheck.too_slow], max_examples=10, deadline=2000
    )
    def test_property_1_chunk_token_bounds(self, text):
        """
        **Property 1: Chunk Token Bounds**
        All chunks should be between 512-1024 tokens, except possibly the final chunk.

        **Validates: Requirements 4.2, 4.4**
        """
        service = ChunkService()
        assume(len(text.strip()) > 0)  # Ensure non-empty text

        chunks = service.chunk_document(text)

        # All chunks except the last must be within bounds
        for i, chunk in enumerate(chunks[:-1]):
            assert (
                service.MIN_TOKENS <= chunk.token_count <= service.MAX_TOKENS
            ), f"Chunk {i} has {chunk.token_count} tokens, expected {service.MIN_TOKENS}-{service.MAX_TOKENS}"

        # Last chunk can be smaller but not larger than MAX_TOKENS
        if chunks:
            assert (
                chunks[-1].token_count <= service.MAX_TOKENS
            ), f"Final chunk has {chunks[-1].token_count} tokens, exceeds MAX_TOKENS {service.MAX_TOKENS}"

    @given(text=markdown_text())
    def test_property_2_token_count_accuracy(self, text):
        """
        **Property 2: Token Count Accuracy**
        Reported token count should match actual tiktoken count.

        **Validates: Requirements 4.2, 4.7**
        """
        service = ChunkService()
        assume(len(text.strip()) > 0)

        chunks = service.chunk_document(text)

        for chunk in chunks:
            actual_count = service.count_tokens(chunk.content)
            assert (
                chunk.token_count == actual_count
            ), f"Chunk {chunk.index}: reported {chunk.token_count} tokens, actual {actual_count}"

    @given(text=markdown_text())
    def test_property_3_chunk_index_uniqueness(self, text):
        """
        **Property 3: Chunk Index Uniqueness**
        Chunk indices should be sequential starting from 0 with no duplicates.

        **Validates: Requirements 4.7**
        """
        service = ChunkService()
        assume(len(text.strip()) > 0)

        chunks = service.chunk_document(text)

        # Check sequential indices
        indices = [chunk.index for chunk in chunks]
        expected_indices = list(range(len(chunks)))

        assert (
            indices == expected_indices
        ), f"Indices {indices} are not sequential, expected {expected_indices}"

        # Check uniqueness
        assert len(set(indices)) == len(indices), f"Duplicate indices found: {indices}"

    def test_empty_document_raises_error(self):
        """Edge case: Empty documents should raise ChunkingError."""
        service = ChunkService()

        with pytest.raises(ChunkingError, match="empty"):
            service.chunk_document("")

        with pytest.raises(ChunkingError, match="empty"):
            service.chunk_document("   \n\n  ")
