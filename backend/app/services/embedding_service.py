"""
Embedding service using Voyage AI for vector generation.
Handles batching, rate limiting, retry logic, and caching.
"""

import asyncio
import hashlib
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Optional

import voyageai

logger = logging.getLogger(__name__)


class EmbeddingError(Exception):
    """Custom exception for embedding operations."""

    pass


class EmbeddingService:
    """Service for generating embeddings via Voyage AI.

    Uses voyage-3.5-lite model (512 dimensions, $0.02/M tokens).
    Handles batching, rate limiting, retry logic, and caching.

    Uses a dedicated ThreadPoolExecutor to prevent starving other
    async operations under heavy embedding load.
    """

    MODEL = "voyage-3.5-lite"
    DIMENSIONS = 512
    MAX_BATCH_SIZE = 128  # Voyage API limit
    MAX_RETRIES = 3
    RATE_LIMIT_WAIT = 60  # seconds
    SERVER_ERROR_WAIT = 5  # seconds (base for exponential backoff)
    EXECUTOR_WORKERS = 4  # Dedicated thread pool size

    def __init__(self, api_key: str, enable_cache: bool = True) -> None:
        """Initialize Voyage AI client with dedicated thread pool.

        Args:
            api_key: Voyage AI API key.
            enable_cache: Whether to cache embeddings by content hash.

        Raises:
            ValueError: If api_key is empty.
        """
        if not api_key:
            raise ValueError("VOYAGE_API_KEY is required")
        self._client = voyageai.Client(api_key=api_key)
        # Dedicated executor prevents starving other async operations
        self._executor = ThreadPoolExecutor(
            max_workers=self.EXECUTOR_WORKERS,
            thread_name_prefix="embedding_",
        )
        # Simple in-memory cache for embedding deduplication
        # Key: SHA-256 hash of (text + input_type), Value: embedding vector
        self._cache: Optional[Dict[str, List[float]]] = {} if enable_cache else None

    def _get_cache_key(self, text: str, input_type: str) -> str:
        """Generate cache key from text content hash."""
        content = f"{input_type}:{text}"
        return hashlib.sha256(content.encode()).hexdigest()

    def _check_cache(
        self, texts: List[str], input_type: str
    ) -> tuple[List[str], List[int], List[tuple[int, List[float]]]]:
        """Check cache for existing embeddings.

        Returns:
            Tuple of (texts_to_embed, their_indices, cached_results).
        """
        if self._cache is None:
            return texts, list(range(len(texts))), []

        texts_to_embed: List[str] = []
        indices_to_embed: List[int] = []
        cached_results: List[tuple[int, List[float]]] = []

        for i, text in enumerate(texts):
            key = self._get_cache_key(text, input_type)
            if key in self._cache:
                cached_results.append((i, self._cache[key]))
            else:
                texts_to_embed.append(text)
                indices_to_embed.append(i)

        return texts_to_embed, indices_to_embed, cached_results

    def _update_cache(
        self, texts: List[str], embeddings: List[List[float]], input_type: str
    ) -> None:
        """Update cache with new embeddings."""
        if self._cache is None:
            return
        for text, embedding in zip(texts, embeddings):
            key = self._get_cache_key(text, input_type)
            self._cache[key] = embedding

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for document chunks.

        Args:
            texts: List of text chunks to embed.

        Returns:
            List of 512-dimensional embedding vectors.

        Raises:
            EmbeddingError: If embedding fails after retries.
        """
        all_embeddings: List[List[float]] = []

        # Process in batches
        for i in range(0, len(texts), self.MAX_BATCH_SIZE):
            batch = texts[i : i + self.MAX_BATCH_SIZE]
            embeddings = await self._embed_batch(batch, input_type="document")
            all_embeddings.extend(embeddings)

        return all_embeddings

    async def embed_query(self, text: str) -> List[float]:
        """Generate embedding for a search query.

        Args:
            text: Query text to embed.

        Returns:
            512-dimensional embedding vector.

        Raises:
            EmbeddingError: If embedding fails after retries.
        """
        embeddings = await self._embed_batch([text], input_type="query")
        return embeddings[0]

    async def _embed_batch(
        self, texts: List[str], input_type: str
    ) -> List[List[float]]:
        """Embed a batch of texts with retry logic.

        Args:
            texts: Texts to embed (max 128).
            input_type: "document" or "query".

        Returns:
            List of embedding vectors.

        Raises:
            EmbeddingError: If all retries fail.
        """
        # Check cache first
        texts_to_embed, indices_to_embed, cached_results = self._check_cache(
            texts, input_type
        )

        # If all cached, reconstruct and return
        if not texts_to_embed:
            result = [None] * len(texts)
            for idx, emb in cached_results:
                result[idx] = emb
            return result  # type: ignore

        last_error: Optional[Exception] = None

        for attempt in range(self.MAX_RETRIES):
            try:
                # Run sync Voyage client in dedicated thread pool
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    self._executor,
                    lambda: self._client.embed(
                        texts=texts_to_embed,
                        model=self.MODEL,
                        input_type=input_type,
                    ),
                )

                # Update cache
                self._update_cache(texts_to_embed, result.embeddings, input_type)

                # Reconstruct full result with cached values
                if cached_results:
                    full_result: List[Optional[List[float]]] = [None] * len(texts)
                    for idx, emb in cached_results:
                        full_result[idx] = emb
                    for i, idx in enumerate(indices_to_embed):
                        full_result[idx] = result.embeddings[i]
                    return full_result  # type: ignore
                else:
                    return result.embeddings

            except voyageai.error.RateLimitError as e:
                logger.warning(
                    f"Rate limited, waiting {self.RATE_LIMIT_WAIT}s "
                    f"(attempt {attempt + 1})"
                )
                await asyncio.sleep(self.RATE_LIMIT_WAIT)
                last_error = e

            except voyageai.error.AuthenticationError as e:
                # Don't retry auth errors
                raise EmbeddingError(
                    "Configuration error. Please contact support."
                ) from e

            except Exception as e:
                wait_time = self.SERVER_ERROR_WAIT * (2**attempt)
                logger.warning(
                    f"Embedding error, waiting {wait_time}s "
                    f"(attempt {attempt + 1}): {e}"
                )
                await asyncio.sleep(wait_time)
                last_error = e

        raise EmbeddingError(
            "Embedding service temporarily unavailable. Please try again later."
        ) from last_error

    def shutdown(self) -> None:
        """Shutdown the thread pool executor."""
        self._executor.shutdown(wait=True)
