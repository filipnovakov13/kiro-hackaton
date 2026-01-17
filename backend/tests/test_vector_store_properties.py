"""
Property-based tests for VectorStore using Hypothesis.

**Validates: Requirements 6.6, 6.7, 6.9**

Based on research:
- Hypothesis doesn't work well with pytest fixtures (not reset between inputs)
- Use tempfile.mkdtemp() directly for temporary directories
- Keep strategies simple to avoid performance issues
- Focus on testing properties, not specific values
"""

import tempfile
import shutil
import pytest
from hypothesis import given, strategies as st, settings

from app.services.vector_store import ChromaVectorStore


class TestVectorStoreProperties:
    """Property-based tests for ChromaVectorStore."""

    @given(num_docs=st.integers(min_value=1, max_value=5))
    @settings(max_examples=20, deadline=1000)
    def test_property_4_add_query_consistency(self, num_docs):
        """
        **Property 4: Add-Query Consistency**
        Added vectors should be retrievable by exact match query.

        **Validates: Requirements 6.6, 6.7**

        Property: For any set of vectors added to the store, querying with
        the exact same vector should return that vector as the top result.
        """
        # Create temporary directory for this test iteration
        temp_dir = tempfile.mkdtemp()
        try:
            # Initialize store with temporary directory
            store = ChromaVectorStore(persist_path=temp_dir)

            # Generate simple, deterministic test data
            ids = [f"doc_{i}" for i in range(num_docs)]
            # Use distinct embeddings - each document gets a unique pattern
            # This ensures cosine similarity will correctly identify exact matches
            embeddings = []
            for i in range(num_docs):
                # Create a unique embedding for each document
                emb = [0.0] * 512
                # Set a unique pattern for each document
                emb[i % 512] = 1.0  # One hot encoding style
                embeddings.append(emb)
            documents = [f"Document content {i}" for i in range(num_docs)]
            metadatas = [
                {"document_id": f"test_doc_{i}", "chunk_index": i}
                for i in range(num_docs)
            ]

            # Add vectors
            store.add(
                ids=ids, embeddings=embeddings, metadatas=metadatas, documents=documents
            )

            # Property: Query with the first embedding should return the first document
            result = store.query(embedding=embeddings[0], n_results=1)

            assert len(result.ids) > 0, "Query returned no results"
            assert result.ids[0] == ids[0], f"Expected {ids[0]}, got {result.ids[0]}"
            assert result.documents[0] == documents[0], "Document content mismatch"
        finally:
            # Cleanup
            shutil.rmtree(temp_dir, ignore_errors=True)

    @given(num_docs=st.integers(min_value=1, max_value=5))
    @settings(max_examples=20, deadline=1000)
    def test_property_5_delete_completeness(self, num_docs):
        """
        **Property 5: Delete Completeness**
        Deleted documents should return empty results when queried.

        **Validates: Requirements 6.9**

        Property: After deleting all vectors for a document_id, querying
        with a filter for that document_id should return zero results.
        """
        # Create temporary directory for this test iteration
        temp_dir = tempfile.mkdtemp()
        try:
            # Initialize store with temporary directory
            store = ChromaVectorStore(persist_path=temp_dir)

            # Generate simple test data with a unique document_id
            doc_id = "test_delete_doc"
            ids = [f"chunk_{i}" for i in range(num_docs)]
            embeddings = [[float(i) / 512.0] * 512 for i in range(num_docs)]
            documents = [f"Document content {i}" for i in range(num_docs)]
            metadatas = [
                {"document_id": doc_id, "chunk_index": i} for i in range(num_docs)
            ]

            # Add vectors
            store.add(
                ids=ids, embeddings=embeddings, metadatas=metadatas, documents=documents
            )

            # Verify they exist before deletion
            result_before = store.query(
                embedding=embeddings[0],
                n_results=num_docs,
                where={"document_id": doc_id},
            )
            assert len(result_before.ids) > 0, "Documents not found before deletion"

            # Delete by document_id
            store.delete_by_document(document_id=doc_id)

            # Property: After deletion, query should return empty results
            result_after = store.query(
                embedding=embeddings[0],
                n_results=num_docs,
                where={"document_id": doc_id},
            )
            assert (
                len(result_after.ids) == 0
            ), f"Expected 0 results after deletion, got {len(result_after.ids)}"
        finally:
            # Cleanup
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_health_check_returns_true(self, tmp_path):
        """Health check should return True for operational store."""
        store = ChromaVectorStore(persist_path=str(tmp_path))
        assert store.health_check() is True

    def test_count_reflects_additions(self, tmp_path):
        """Count should reflect the number of vectors added."""
        store = ChromaVectorStore(persist_path=str(tmp_path))
        initial_count = store.count()

        # Add 3 vectors
        ids = ["test_1", "test_2", "test_3"]
        embeddings = [[0.1] * 512, [0.2] * 512, [0.3] * 512]
        documents = ["doc1", "doc2", "doc3"]
        metadatas = [{"document_id": "test", "chunk_index": i} for i in range(3)]

        store.add(
            ids=ids, embeddings=embeddings, metadatas=metadatas, documents=documents
        )

        assert store.count() == initial_count + 3
