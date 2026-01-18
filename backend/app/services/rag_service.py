"""RAG Service for context retrieval and response generation.

This module orchestrates the RAG (Retrieval-Augmented Generation) pipeline,
coordinating document summary matching, vector search, and LLM generation.
"""

from dataclasses import dataclass
from typing import List, Optional, AsyncGenerator
import time
import asyncio
import numpy as np

from app.core.logging_config import StructuredLogger

logger = StructuredLogger(__name__)


@dataclass
class RetrievalResult:
    """Result from context retrieval."""

    chunks: List["RetrievedChunk"]
    total_tokens: int
    query_embedding_time_ms: float
    search_time_ms: float
    selected_documents: List[str]  # document_ids used in search


@dataclass
class RetrievedChunk:
    """A retrieved document chunk with similarity score."""

    chunk_id: str
    document_id: str
    content: str
    similarity: float  # cosine similarity (0-1, higher = more similar)
    metadata: dict  # chunk_index, start_char, end_char, token_count


@dataclass
class RAGResponse:
    """Complete RAG response with metadata."""

    response_text: str
    source_chunks: List[RetrievedChunk]
    token_count: int
    cost_usd: float
    cached: bool
    processing_time_ms: float


class RAGService:
    """Orchestrates retrieval and generation for RAG queries.

    Coordinates:
    - Document summary matching (for multi-document queries)
    - Vector search and context retrieval
    - Response caching
    - LLM generation via DeepSeek
    - Source attribution
    """

    def __init__(
        self,
        embedding_service,
        vector_store,
        deepseek_client,
        response_cache,
        document_summary_service,
        similarity_threshold: float = 0.7,
    ):
        """Initialize RAG service.

        Args:
            embedding_service: EmbeddingService instance
            vector_store: VectorStoreInterface instance
            deepseek_client: DeepSeekClient instance
            response_cache: ResponseCache instance
            document_summary_service: DocumentSummaryService instance
            similarity_threshold: Minimum similarity for chunk retrieval
        """
        self.embedding_service = embedding_service
        self.vector_store = vector_store
        self.deepseek_client = deepseek_client
        self.response_cache = response_cache
        self.document_summary_service = document_summary_service
        self.similarity_threshold = similarity_threshold

    async def retrieve_context(
        self,
        query: str,
        document_id: Optional[str] = None,
        focus_context: Optional[dict] = None,
        n_results: int = 5,
    ) -> RetrievalResult:
        """Retrieve relevant context for a query.

        Args:
            query: User's question
            document_id: Optional document to limit search
            focus_context: Optional focus caret context
            n_results: Number of chunks to retrieve

        Returns:
            RetrievalResult with chunks and metadata
        """
        start_time = time.time()

        # Generate query embedding
        embed_start = time.time()
        query_embedding = await self.embedding_service.embed_query(query)
        embed_time_ms = (time.time() - embed_start) * 1000

        # Determine which documents to search
        selected_documents = []
        if document_id:
            selected_documents = [document_id]
        else:
            # Multi-document search: use document summaries
            selected_documents = await self._select_relevant_documents(
                query_embedding, top_k=3
            )

        # Search for chunks within selected documents
        search_start = time.time()
        all_chunks = []
        for doc_id in selected_documents:
            results = self.vector_store.query(
                embedding=query_embedding,
                n_results=n_results,
                where={"document_id": doc_id},
            )

            # Convert results to RetrievedChunk objects
            for i in range(len(results.ids)):
                similarity = (
                    1.0 - results.distances[i]
                )  # Convert distance to similarity
                if similarity >= self.similarity_threshold:
                    all_chunks.append(
                        RetrievedChunk(
                            chunk_id=results.ids[i],
                            document_id=doc_id,
                            content=results.documents[i],
                            similarity=similarity,
                            metadata=results.metadatas[i],
                        )
                    )

        # Apply focus context boost if provided
        if focus_context:
            all_chunks = self._apply_focus_boost(all_chunks, focus_context)

        # Sort by similarity and take top N
        all_chunks.sort(key=lambda c: c.similarity, reverse=True)
        top_chunks = all_chunks[:n_results]

        # Enforce token budget (8000 tokens max)
        final_chunks = self._enforce_token_budget(top_chunks, max_tokens=8000)

        search_time_ms = (time.time() - search_start) * 1000
        total_tokens = sum(
            chunk.metadata.get("token_count", 0) for chunk in final_chunks
        )

        # Log metrics asynchronously
        try:
            asyncio.create_task(
                self._log_retrieval_metrics(
                    embed_time_ms, search_time_ms, len(final_chunks), selected_documents
                )
            )
        except RuntimeError:
            # No event loop running (e.g., in tests)
            pass

        return RetrievalResult(
            chunks=final_chunks,
            total_tokens=total_tokens,
            query_embedding_time_ms=embed_time_ms,
            search_time_ms=search_time_ms,
            selected_documents=selected_documents,
        )

    async def _select_relevant_documents(
        self, query_embedding: List[float], top_k: int = 3
    ) -> List[str]:
        """Select most relevant documents using summary embeddings.

        Args:
            query_embedding: Query embedding vector
            top_k: Number of documents to select

        Returns:
            List of document IDs
        """
        summaries = await self.document_summary_service.get_all_summaries()

        # Fallback: if no summaries exist, search all documents
        if not summaries:
            logger.warning("No document summaries found, searching all documents")
            # Get all document IDs from vector store
            all_docs = await self.vector_store.get_all_document_ids()
            return all_docs[:top_k] if all_docs else []

        similarities = []
        for summary in summaries:
            # Compute cosine similarity
            similarity = self._cosine_similarity(query_embedding, summary.embedding)
            similarities.append((summary.document_id, similarity))

        # Sort by similarity and take top K
        similarities.sort(key=lambda x: x[1], reverse=True)
        return [doc_id for doc_id, _ in similarities[:top_k]]

    def _apply_focus_boost(
        self, chunks: List[RetrievedChunk], focus_context: dict
    ) -> List[RetrievedChunk]:
        """Boost similarity of chunk containing focus position.

        Args:
            chunks: List of retrieved chunks
            focus_context: Focus caret context with start_char and end_char

        Returns:
            Chunks with boosted similarity for focused chunk
        """
        focus_start = focus_context.get("start_char")
        focus_end = focus_context.get("end_char")

        for chunk in chunks:
            chunk_start = chunk.metadata.get("start_char", 0)
            chunk_end = chunk.metadata.get("end_char", 0)

            # Check if focus position overlaps with chunk
            if (focus_start >= chunk_start and focus_start <= chunk_end) or (
                focus_end >= chunk_start and focus_end <= chunk_end
            ):
                chunk.similarity = min(1.0, chunk.similarity + 0.15)

        return chunks

    def _enforce_token_budget(
        self, chunks: List[RetrievedChunk], max_tokens: int
    ) -> List[RetrievedChunk]:
        """Truncate chunks to fit within token budget.

        Args:
            chunks: List of retrieved chunks (sorted by similarity)
            max_tokens: Maximum total tokens allowed

        Returns:
            Chunks that fit within token budget
        """
        total_tokens = 0
        result = []

        for chunk in chunks:
            chunk_tokens = chunk.metadata.get("token_count", 0)
            if total_tokens + chunk_tokens <= max_tokens:
                result.append(chunk)
                total_tokens += chunk_tokens
            else:
                break

        return result

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Compute cosine similarity between two vectors.

        Args:
            vec1: First vector
            vec2: Second vector

        Returns:
            Cosine similarity (0-1, higher = more similar)
        """
        vec1_np = np.array(vec1)
        vec2_np = np.array(vec2)
        return float(
            np.dot(vec1_np, vec2_np)
            / (np.linalg.norm(vec1_np) * np.linalg.norm(vec2_np))
        )

    async def _log_retrieval_metrics(
        self,
        embed_time_ms: float,
        search_time_ms: float,
        chunk_count: int,
        selected_documents: List[str],
    ):
        """Log retrieval metrics asynchronously.

        Args:
            embed_time_ms: Time to generate query embedding
            search_time_ms: Time to search vector store
            chunk_count: Number of chunks retrieved
            selected_documents: Document IDs searched
        """
        logger.info(
            "Retrieval metrics",
            embed_time_ms=round(embed_time_ms, 1),
            search_time_ms=round(search_time_ms, 1),
            chunk_count=chunk_count,
            document_count=len(selected_documents),
        )

    async def generate_response(
        self,
        query: str,
        context: RetrievalResult,
        session_id: str,
        focus_context: Optional[dict] = None,
        message_history: Optional[List[dict]] = None,
    ) -> AsyncGenerator[dict, None]:
        """Generate streaming response using retrieved context.

        Args:
            query: User's question
            context: Retrieved context chunks
            session_id: Chat session ID
            focus_context: Optional focus caret context
            message_history: Previous messages in session

        Yields:
            Streaming events: token, source, done, error
        """
        from app.services.deepseek_client import DeepSeekAPIError

        # Check cache first
        cache_key = self.response_cache.compute_key(
            query, context.selected_documents, focus_context
        )
        cached_response = self.response_cache.get(cache_key)

        if cached_response:
            # Return cached response
            yield {"event": "token", "data": {"content": cached_response.response_text}}
            for chunk in cached_response.source_chunks:
                yield {"event": "source", "data": chunk}
            yield {
                "event": "done",
                "data": {
                    "token_count": cached_response.token_count,
                    "cost_usd": 0.0,  # Cached, no cost
                    "cached": True,
                },
            }
            return

        # Construct prompt
        prompt = self._construct_prompt(
            query, context.chunks, focus_context, message_history
        )

        # Stream response from DeepSeek with error handling
        response_text = ""
        token_count = 0

        try:
            async for chunk in self.deepseek_client.stream_chat(prompt):
                if chunk.get("type") == "token":
                    content = chunk["content"]
                    response_text += content
                    token_count += 1
                    yield {"event": "token", "data": {"content": content}}
                elif chunk.get("type") == "done":
                    # Calculate cost
                    cost_usd = self._calculate_cost(
                        chunk["prompt_tokens"],
                        chunk["completion_tokens"],
                        chunk.get("cached_tokens", 0),
                    )

                    # Cache the response
                    self.response_cache.set(
                        cache_key, response_text, context.chunks, token_count
                    )

                    # Send source attribution
                    for chunk_obj in context.chunks:
                        yield {
                            "event": "source",
                            "data": {
                                "chunk_id": chunk_obj.chunk_id,
                                "document_id": chunk_obj.document_id,
                                "similarity": chunk_obj.similarity,
                                **chunk_obj.metadata,
                            },
                        }

                    # Send done event
                    yield {
                        "event": "done",
                        "data": {
                            "token_count": token_count,
                            "cost_usd": cost_usd,
                            "cached": False,
                        },
                    }

        except DeepSeekAPIError as e:
            # Send error event via SSE
            yield {
                "event": "error",
                "data": {
                    "error": str(e),
                    "partial_response": response_text if response_text else None,
                },
            }
            # Log error asynchronously
            try:
                asyncio.create_task(
                    self._log_async(
                        "DeepSeek API error during streaming",
                        session_id=session_id,
                        error_type=type(e).__name__,
                        partial_tokens=token_count,
                    )
                )
            except RuntimeError:
                pass

        except asyncio.TimeoutError:
            # Timeout during streaming
            yield {
                "event": "error",
                "data": {
                    "error": "Request timed out. Please try again.",
                    "partial_response": response_text if response_text else None,
                },
            }
            try:
                asyncio.create_task(
                    self._log_async(
                        "Timeout during streaming",
                        session_id=session_id,
                        partial_tokens=token_count,
                    )
                )
            except RuntimeError:
                pass

        except Exception as e:
            # Unexpected error
            yield {
                "event": "error",
                "data": {
                    "error": "An unexpected error occurred. Please try again.",
                    "partial_response": response_text if response_text else None,
                },
            }
            try:
                asyncio.create_task(
                    self._log_async(
                        "Unexpected error during streaming",
                        session_id=session_id,
                        error_type=type(e).__name__,
                        error_message=str(e),
                    )
                )
            except RuntimeError:
                pass

    def _construct_prompt(
        self,
        query: str,
        chunks: List[RetrievedChunk],
        focus_context: Optional[dict],
        message_history: Optional[List[dict]],
    ) -> List[dict]:
        """Construct prompt messages for DeepSeek.

        Args:
            query: User's question
            chunks: Retrieved context chunks
            focus_context: Optional focus caret context
            message_history: Previous messages in session

        Returns:
            List of message dicts for DeepSeek API
        """
        messages = []

        # System prompt (cached to save on cost)
        if not message_history or len(message_history) == 0:
            messages.append({"role": "system", "content": self._get_system_prompt()})

        # Add message history
        if message_history:
            messages.extend(message_history)

        # Add context from documents
        context_text = "Context from documents:\n\n"
        for chunk in chunks:
            doc_title = chunk.metadata.get("document_title", "Unknown")
            context_text += f"[Document: {doc_title}]\n{chunk.content}\n\n"

        # Add focus context if provided
        if focus_context:
            context_text += (
                f"\nUser is focused on: {focus_context['surrounding_text']}\n"
            )

        # Add user query
        messages.append({"role": "user", "content": f"{context_text}\nUser: {query}"})

        return messages

    def _get_system_prompt(self) -> str:
        """Get the system prompt for DeepSeek.

        Returns:
            System prompt string
        """
        return """You are an AI learning instructor with knowledge of all scientific facts about learning.
Guide through questions rather than just providing answers - utilize the Socratic method. Be direct and honest.

Rules:
- Sparse praise: Only acknowledge genuine insights or real effort
- No empty validation: Avoid "Great question!" patterns
- Challenge assumptions gently: "What makes you think that?"
- Guide discovery: "What do you notice about this pattern?"
- Reference context: Always cite which document section you're using

When answering:
1. Assess user's level from their question or via user profile
2. Ask clarifying questions when helpful
3. Provide direct answers when clearly needed or explicitly requested
4. Connect to previous conversation context
5. Cite sources: [Source: Document Title, Section]"""

    def _calculate_cost(
        self, prompt_tokens: int, completion_tokens: int, cached_tokens: int
    ) -> float:
        """Calculate estimated cost in USD.

        Args:
            prompt_tokens: Number of prompt tokens
            completion_tokens: Number of completion tokens
            cached_tokens: Number of cached tokens

        Returns:
            Estimated cost in USD
        """
        input_cost = (prompt_tokens - cached_tokens) * 0.28 / 1_000_000
        cached_cost = cached_tokens * 0.028 / 1_000_000
        output_cost = completion_tokens * 0.42 / 1_000_000
        return input_cost + cached_cost + output_cost

    async def _log_async(self, message: str, **kwargs):
        """Log message asynchronously with structured data.

        Args:
            message: Log message
            **kwargs: Additional structured data
        """
        logger.error(message, **kwargs)
