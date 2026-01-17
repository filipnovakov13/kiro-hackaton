"""
Integration test for the full document processing pipeline.

**Validates: Requirements 3.1, 4.1, 5.1, 6.6**

Tests the complete flow:
1. Document processing (TXT → Markdown)
2. Chunking (Markdown → Chunks)
3. Embedding (Chunks → Vectors) [MOCKED]
4. Vector storage (Vectors → ChromaDB)
5. Retrieval (Query → Results)
"""

import tempfile
import shutil
import os
import pytest
from unittest.mock import Mock, patch

from app.services.document_processor import DocumentProcessor
from app.services.chunk_service import ChunkService
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import ChromaVectorStore


class MockEmbedResult:
    """Mock result from Voyage AI embed call."""

    def __init__(self, embeddings):
        self.embeddings = embeddings


class TestFullPipelineIntegration:
    """Integration test for the complete document processing pipeline."""

    def test_full_pipeline_txt_to_retrieval(self):
        """
        **Integration Test: Full Pipeline**
        Test TXT file upload → processing → retrieval.

        **Validates: Requirements 3.1, 4.1, 5.1, 6.6**

        Flow:
        1. Create a TXT document
        2. Process it to Markdown (DocumentProcessor)
        3. Chunk the Markdown (ChunkService)
        4. Generate embeddings (EmbeddingService - MOCKED)
        5. Store in vector database (ChromaVectorStore)
        6. Query and retrieve the document
        """
        # Setup: Create temporary directories
        temp_file_dir = tempfile.mkdtemp()
        temp_chroma_dir = tempfile.mkdtemp()

        try:
            # Step 1: Create a test TXT document
            test_content = """# Test Document

This is a test document for integration testing.

It has multiple paragraphs to test chunking.

Each paragraph should be processed correctly.

The system should handle this document end-to-end."""

            txt_file_path = os.path.join(temp_file_dir, "test_doc.txt")
            with open(txt_file_path, "w", encoding="utf-8") as f:
                f.write(test_content)

            # Step 2: Process document to Markdown
            processor = DocumentProcessor()
            import asyncio

            processing_result = asyncio.run(
                processor.process_file(txt_file_path, "txt")
            )

            assert (
                processing_result.markdown == test_content
            ), "Document processing should preserve content"
            assert (
                processing_result.title == "Test Document"
            ), "Should extract title from markdown"

            # Step 3: Chunk the Markdown
            chunker = ChunkService()
            chunks = chunker.chunk_document(processing_result.markdown)

            assert len(chunks) > 0, "Should create at least one chunk"
            for chunk in chunks:
                assert (
                    chunk.token_count <= chunker.MAX_TOKENS
                ), f"Chunk {chunk.index} exceeds MAX_TOKENS"
                assert chunk.token_count > 0, f"Chunk {chunk.index} should have tokens"

            # Step 4: Generate embeddings (MOCKED)
            embedding_service = EmbeddingService(api_key="test_key", enable_cache=False)

            # Mock embeddings - create unique embeddings for each chunk
            mock_embeddings = []
            for i in range(len(chunks)):
                emb = [0.0] * 512
                emb[i % 512] = 1.0  # Unique pattern for each chunk
                mock_embeddings.append(emb)

            mock_result = MockEmbedResult(embeddings=mock_embeddings)

            with patch.object(
                embedding_service._client, "embed", return_value=mock_result
            ):
                chunk_texts = [chunk.content for chunk in chunks]
                embeddings = asyncio.run(embedding_service.embed_documents(chunk_texts))

                assert len(embeddings) == len(
                    chunks
                ), "Should have one embedding per chunk"
                for embedding in embeddings:
                    assert (
                        len(embedding) == 512
                    ), "Each embedding should be 512-dimensional"

            embedding_service.shutdown()

            # Step 5: Store in vector database
            vector_store = ChromaVectorStore(persist_path=temp_chroma_dir)

            # Prepare data for storage
            doc_id = "test_doc_123"
            chunk_ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
            metadatas = [
                {
                    "document_id": doc_id,
                    "chunk_index": i,
                    "title": processing_result.title or "Untitled",
                }
                for i in range(len(chunks))
            ]
            documents = [chunk.content for chunk in chunks]

            vector_store.add(
                ids=chunk_ids,
                embeddings=embeddings,
                metadatas=metadatas,
                documents=documents,
            )

            # Verify storage
            count = vector_store.count()
            assert count == len(
                chunks
            ), f"Vector store should contain {len(chunks)} vectors, got {count}"

            # Step 6: Query and retrieve
            # Query with the first chunk's embedding (should return that chunk)
            query_result = vector_store.query(embedding=embeddings[0], n_results=1)

            assert len(query_result.ids) > 0, "Query should return results"
            assert (
                query_result.ids[0] == chunk_ids[0]
            ), f"Should retrieve first chunk, got {query_result.ids[0]}"
            assert (
                query_result.documents[0] == documents[0]
            ), "Retrieved document should match original chunk"
            assert (
                query_result.metadatas[0]["document_id"] == doc_id
            ), "Metadata should be preserved"

            # Test filtering by document_id
            filtered_result = vector_store.query(
                embedding=embeddings[0], n_results=10, where={"document_id": doc_id}
            )

            assert len(filtered_result.ids) == len(
                chunks
            ), "Filtered query should return all chunks for the document"

            print(f"\n✓ Full pipeline test passed!")
            print(f"  - Processed document: {processing_result.title}")
            print(f"  - Created {len(chunks)} chunks")
            print(f"  - Generated {len(embeddings)} embeddings")
            print(f"  - Stored and retrieved from vector database")

        finally:
            # Cleanup
            shutil.rmtree(temp_file_dir, ignore_errors=True)
            shutil.rmtree(temp_chroma_dir, ignore_errors=True)

    def test_pipeline_with_empty_document(self):
        """Test pipeline handles empty documents gracefully."""
        temp_file_dir = tempfile.mkdtemp()
        temp_chroma_dir = tempfile.mkdtemp()

        try:
            # Create empty TXT file
            txt_file_path = os.path.join(temp_file_dir, "empty.txt")
            with open(txt_file_path, "w", encoding="utf-8") as f:
                f.write("")

            # Process empty document
            processor = DocumentProcessor()
            import asyncio

            processing_result = asyncio.run(
                processor.process_file(txt_file_path, "txt")
            )

            assert (
                processing_result.markdown == ""
            ), "Empty file should return empty markdown"

            # Chunking empty document should raise error
            chunker = ChunkService()
            from app.services.chunk_service import ChunkingError

            with pytest.raises(ChunkingError, match="empty"):
                chunker.chunk_document(processing_result.markdown)

        finally:
            shutil.rmtree(temp_file_dir, ignore_errors=True)
            shutil.rmtree(temp_chroma_dir, ignore_errors=True)
