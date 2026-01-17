"""
Vector store abstraction and ChromaDB implementation.
Enables future migration to other vector stores without changing service layer.
"""

import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings


@dataclass
class QueryResult:
    """Result from vector similarity search."""

    ids: List[str]
    distances: List[float]
    documents: List[str]
    metadatas: List[Dict[str, Any]]


class VectorStoreError(Exception):
    """Custom exception for vector store operations."""

    pass


class VectorStoreInterface(ABC):
    """Abstract interface for vector storage backends.

    Enables future migration from ChromaDB to Qdrant or other stores
    without changing service layer code.
    """

    @abstractmethod
    def add(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
        documents: List[str],
    ) -> None:
        """Add vectors with metadata to the store.

        Args:
            ids: Unique identifiers for each vector (chunk IDs).
            embeddings: 512-dimensional float vectors from Voyage AI.
            metadatas: Metadata dicts with document_id, chunk_index.
            documents: Original text content for each chunk.

        Raises:
            VectorStoreError: If add operation fails.
        """
        pass

    @abstractmethod
    def query(
        self,
        embedding: List[float],
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None,
    ) -> QueryResult:
        """Query for similar vectors.

        Args:
            embedding: 512-dimensional query vector.
            n_results: Maximum number of results to return.
            where: Optional metadata filter (e.g., {"document_id": "uuid"}).

        Returns:
            QueryResult with ids, distances, documents, metadatas
            sorted by similarity (highest first, lowest distance).

        Raises:
            VectorStoreError: If query operation fails.
        """
        pass

    @abstractmethod
    def delete_by_document(self, document_id: str) -> None:
        """Delete all vectors for a document.

        Args:
            document_id: UUID of the document to delete.

        Raises:
            VectorStoreError: If delete operation fails.
        """
        pass

    @abstractmethod
    def count(self) -> int:
        """Return total number of vectors in the store."""
        pass

    @abstractmethod
    def health_check(self) -> bool:
        """Check if the vector store is operational.

        Returns:
            True if healthy, False otherwise.
        """
        pass


class ChromaVectorStore(VectorStoreInterface):
    """ChromaDB implementation of VectorStoreInterface.

    Uses persistent storage with cosine similarity.
    Does NOT use ChromaDB's embedding function - we provide pre-computed
    512-dimensional Voyage AI embeddings.

    IMPORTANT: persist_path should be an absolute path derived from
    configuration to avoid issues in containerized deployments.
    """

    COLLECTION_NAME = "iubar_documents"

    def __init__(self, persist_path: str) -> None:
        """Initialize ChromaDB with persistent storage.

        Args:
            persist_path: Directory path for ChromaDB persistence.
                         Will be converted to absolute path if relative.

        Raises:
            VectorStoreError: If initialization fails.
        """
        try:
            # Convert to absolute path if relative (safety measure)
            absolute_path = os.path.abspath(persist_path)

            # Ensure directory exists
            os.makedirs(absolute_path, exist_ok=True)

            self._persist_path = absolute_path
            self._client = chromadb.PersistentClient(
                path=absolute_path,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            self._collection = self._client.get_or_create_collection(
                name=self.COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
        except Exception as e:
            raise VectorStoreError(f"Failed to initialize vector store: {e}") from e

    def add(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
        documents: List[str],
    ) -> None:
        """Add vectors with metadata to the store."""
        try:
            self._collection.add(
                ids=ids,
                embeddings=embeddings,
                metadatas=metadatas,
                documents=documents,
            )
        except Exception as e:
            raise VectorStoreError(f"Failed to add vectors: {e}") from e

    def query(
        self,
        embedding: List[float],
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None,
    ) -> QueryResult:
        """Query for similar vectors."""
        try:
            results = self._collection.query(
                query_embeddings=[embedding],
                n_results=n_results,
                where=where,
                include=["documents", "metadatas", "distances"],
            )
            return QueryResult(
                ids=results["ids"][0] if results["ids"] else [],
                distances=results["distances"][0] if results["distances"] else [],
                documents=results["documents"][0] if results["documents"] else [],
                metadatas=results["metadatas"][0] if results["metadatas"] else [],
            )
        except Exception as e:
            raise VectorStoreError(f"Failed to query vectors: {e}") from e

    def delete_by_document(self, document_id: str) -> None:
        """Delete all vectors for a document."""
        try:
            self._collection.delete(where={"document_id": document_id})
        except Exception as e:
            raise VectorStoreError(f"Failed to delete vectors: {e}") from e

    def count(self) -> int:
        """Return total number of vectors in the store."""
        return self._collection.count()

    def health_check(self) -> bool:
        """Check if the vector store is operational."""
        try:
            self._client.heartbeat()
            return True
        except Exception:
            return False
