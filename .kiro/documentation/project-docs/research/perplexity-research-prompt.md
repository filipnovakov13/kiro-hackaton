# Research Prompt: Voyage AI and DeepSeek Integration Optimization

## Application Context

I'm building **Iubar**, an AI-enhanced personal knowledge management system with a RAG (Retrieval-Augmented Generation) architecture. The backend is Python-based using FastAPI, with the following key components:

### Architecture Overview

1. **Document Processing Pipeline**:
   - Users upload documents (PDF, DOCX, TXT, MD, HTML) or URLs
   - Documents are converted to Markdown using Docling
   - Content is chunked into 512-1024 token segments with 15% overlap using tiktoken (cl100k_base encoding)
   - Each chunk is embedded using Voyage AI and stored in ChromaDB vector store

2. **RAG Query Pipeline**:
   - User queries are embedded using Voyage AI
   - For multi-document scenarios: document summaries (also embedded with Voyage) are used to select top 3 relevant documents
   - Vector similarity search retrieves top 5 chunks from selected documents
   - Retrieved context is sent to DeepSeek for response generation
   - Responses are streamed back to the user via Server-Sent Events (SSE)

3. **Resilience Patterns**:
   - Circuit breaker pattern for DeepSeek API calls (opens after 5 failures, 60s recovery timeout)
   - Exponential backoff retry logic for both services
   - Response caching to reduce API costs
   - Dedicated ThreadPoolExecutor for Voyage embeddings to prevent event loop blocking

---

## Current Implementation Details

### Voyage AI Integration (voyage-3.5-lite model)

**File: `backend/app/services/embedding_service.py`**

```python
class EmbeddingService:
    MODEL = "voyage-3.5-lite"
    DIMENSIONS = 512
    MAX_BATCH_SIZE = 128  # Voyage API limit
    MAX_RETRIES = 3
    RATE_LIMIT_WAIT = 60  # seconds
    SERVER_ERROR_WAIT = 5  # seconds (base for exponential backoff)
    EXECUTOR_WORKERS = 4  # Dedicated thread pool size

    def __init__(self, api_key: str, enable_cache: bool = True):
        self._client = voyageai.Client(api_key=api_key)
        self._executor = ThreadPoolExecutor(
            max_workers=self.EXECUTOR_WORKERS,
            thread_name_prefix="embedding_",
        )
        # Simple in-memory cache: SHA-256 hash -> embedding vector
        self._cache: Optional[Dict[str, List[float]]] = {} if enable_cache else None

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for document chunks."""
        all_embeddings: List[List[float]] = []
        # Process in batches of 128
        for i in range(0, len(texts), self.MAX_BATCH_SIZE):
            batch = texts[i : i + self.MAX_BATCH_SIZE]
            embeddings = await self._embed_batch(batch, input_type="document")
            all_embeddings.extend(embeddings)
        return all_embeddings

    async def embed_query(self, text: str) -> List[float]:
        """Generate embedding for a search query."""
        embeddings = await self._embed_batch([text], input_type="query")
        return embeddings[0]

    async def _embed_batch(self, texts: List[str], input_type: str) -> List[List[float]]:
        # Check cache first (SHA-256 hash of text + input_type)
        texts_to_embed, indices_to_embed, cached_results = self._check_cache(texts, input_type)
        
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
        
        # Update cache and reconstruct full result
        self._update_cache(texts_to_embed, result.embeddings, input_type)
        # ... merge cached and new embeddings ...
```

**Key Usage Patterns**:
- Embedding document chunks during upload (batch processing)
- Embedding user queries for search (single embedding)
- Embedding document summaries for multi-document search
- Cache deduplication using SHA-256 hashing

---

### DeepSeek Integration (deepseek-chat model)

**File: `backend/app/services/deepseek_client.py`**

```python
class DeepSeekClient:
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.deepseek.com/v1",
        model: str = "deepseek-chat",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        frequency_penalty: float = 0.3,
        presence_penalty: float = 0.1,
        timeout_seconds: int = 30,
    ):
        self.client = AsyncOpenAI(
            api_key=api_key, base_url=base_url, timeout=timeout_seconds
        )
        # Circuit breaker: 5 failures -> open, 60s recovery, 2 successes to close
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=5, recovery_timeout_seconds=60, success_threshold=2
        )

    async def stream_chat(
        self, messages: List[Dict[str, str]], max_retries: int = 3
    ) -> AsyncGenerator[dict, None]:
        """Stream chat completion with circuit breaker protection."""
        generator = await self.circuit_breaker.call(
            self._stream_chat_internal, messages, max_retries
        )
        async for chunk in generator:
            yield chunk

    async def _stream_chat_internal(self, messages, max_retries=3):
        for attempt in range(max_retries):
            try:
                stream = await self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=self.temperature,
                    max_tokens=self.max_tokens,
                    frequency_penalty=self.frequency_penalty,
                    presence_penalty=self.presence_penalty,
                    stream=True,
                )

                prompt_tokens = 0
                completion_tokens = 0
                cached_tokens = 0

                async for chunk in stream:
                    if chunk.choices and len(chunk.choices) > 0:
                        delta = chunk.choices[0].delta
                        if delta.content:
                            completion_tokens += 1
                            yield {"type": "token", "content": delta.content}

                    # Extract usage from final chunk
                    if hasattr(chunk, "usage") and chunk.usage:
                        prompt_tokens = chunk.usage.prompt_tokens
                        completion_tokens = chunk.usage.completion_tokens
                        cached_tokens = getattr(chunk.usage, "prompt_cache_hit_tokens", 0)

                yield {
                    "type": "done",
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "cached_tokens": cached_tokens,
                }
                return

            except Exception as e:
                # Handle 401, 429 (60s wait), 5xx (exponential backoff), timeout
                # ... error handling logic ...
```

**Key Usage Patterns**:
- Streaming chat completions for RAG responses
- Generating document summaries (500 chars) for multi-document search
- Prompt construction with XML tags to prevent injection attacks

---

### RAG Service Orchestration

**File: `backend/app/services/rag_service.py`**

```python
class RAGService:
    def __init__(
        self,
        embedding_service,
        vector_store,
        deepseek_client,
        response_cache,
        document_summary_service,
        similarity_threshold: float = 0.7,
    ):
        # ... initialization ...

    async def retrieve_context(
        self,
        query: str,
        document_id: Optional[str] = None,
        focus_context: Optional[dict] = None,
        n_results: int = 5,
    ) -> RetrievalResult:
        """Retrieve relevant context for a query."""
        # 1. Embed query with Voyage
        query_embedding = await self.embedding_service.embed_query(query)
        
        # 2. Select documents (if multi-doc search)
        if document_id:
            selected_documents = [document_id]
        else:
            # Use document summary embeddings to select top 3 docs
            selected_documents = await self._select_relevant_documents(
                query_embedding, top_k=3
            )
        
        # 3. Search chunks in selected documents
        all_chunks = []
        for doc_id in selected_documents:
            results = self.vector_store.query(
                embedding=query_embedding,
                n_results=n_results,
                where={"document_id": doc_id},
            )
            # Filter by similarity_threshold (0.7)
            # Apply focus context boost (+0.15 similarity)
            # ...
        
        # 4. Enforce token budget (8000 tokens max)
        final_chunks = self._enforce_token_budget(all_chunks, max_tokens=8000)
        
        return RetrievalResult(chunks=final_chunks, ...)

    async def generate_response(
        self,
        query: str,
        context: RetrievalResult,
        session_id: str,
        focus_context: Optional[dict] = None,
        message_history: Optional[List[dict]] = None,
    ) -> AsyncGenerator[dict, None]:
        """Generate streaming response using retrieved context."""
        # 1. Check response cache (key = query + doc_ids + focus_context)
        cached_response = self.response_cache.get(cache_key)
        if cached_response:
            yield cached_response
            return
        
        # 2. Construct prompt with XML tags
        prompt = self._construct_prompt(query, context.chunks, focus_context, message_history)
        # Format: <systemPrompt>, <documentsContext>, <surroundingFocusText>, <userInput>
        
        # 3. Stream from DeepSeek
        async for chunk in self.deepseek_client.stream_chat(prompt):
            if chunk.get("type") == "token":
                yield {"event": "token", "data": {"content": chunk["content"]}}
            elif chunk.get("type") == "done":
                # Calculate cost: input $0.28/M, cached $0.028/M, output $0.42/M
                cost_usd = self._calculate_cost(
                    chunk["prompt_tokens"],
                    chunk["completion_tokens"],
                    chunk.get("cached_tokens", 0),
                )
                # Cache response
                self.response_cache.set(cache_key, response_text, context.chunks, token_count)
                yield {"event": "done", "data": {"cost_usd": cost_usd, ...}}
```

**Prompt Construction** (XML-tagged for injection prevention):
```python
def _construct_prompt(self, query, chunks, focus_context, message_history):
    messages = []
    
    # System prompt (cached)
    messages.append({
        "role": "system",
        "content": f"<systemPrompt>\n{RAG_SYSTEM_PROMPT}\n</systemPrompt>"
    })
    
    # Message history
    if message_history:
        history_content = "<messageHistory>\n"
        for msg in message_history:
            history_content += f"<message role='{msg['role']}'>\n{msg['content']}\n</message>\n"
        history_content += "</messageHistory>"
        messages.append({"role": "assistant", "content": history_content})
    
    # User message with context
    user_parts = []
    
    # Document chunks
    documents_context = "<documentsContext>\n"
    for chunk in chunks:
        documents_context += f"<documentChunk title='{chunk.metadata['document_title']}'>\n{chunk.content}\n</documentChunk>\n"
    documents_context += "</documentsContext>"
    user_parts.append(documents_context)
    
    # Focus context (if provided)
    if focus_context:
        user_parts.append(f"<surroundingFocusText>\n{focus_context['surrounding_text']}\n</surroundingFocusText>")
    
    # User query
    user_parts.append(f"<userInput>\n{query}\n</userInput>")
    
    messages.append({"role": "user", "content": "\n\n".join(user_parts)})
    return messages
```

---

### Document Summary Service

**File: `backend/app/services/document_summary.py`**

```python
class DocumentSummaryService:
    async def generate_summary(
        self, document_id: str, document_content: str, document_title: str
    ) -> DocumentSummary:
        """Generate summary for a document."""
        # Use first 2000 characters
        preview = document_content[:2000]
        
        # Generate 500-char summary using DeepSeek
        prompt = [{
            "role": "user",
            "content": f"Summarize this document in 500 characters focusing on the main topics and themes:\n\n{preview}"
        }]
        
        summary_text = ""
        async for chunk in self.deepseek_client.stream_chat(prompt):
            if chunk.get("type") == "token":
                summary_text += chunk["content"]
        
        summary_text = summary_text[:500]
        
        # Embed summary with Voyage (input_type="query")
        summary_embedding = await self.embedding_service.embed_query(summary_text)
        
        # Store in SQLite (embedding as BLOB)
        await self._store_summary(document_id, summary_text, summary_embedding)
        
        return DocumentSummary(...)
```

---

## Research Questions

### 1. Voyage AI Optimization

Based on the official Voyage AI documentation and best practices:

a) **Model Selection**: Is `voyage-3.5-lite` (512 dimensions, $0.02/M tokens) the optimal choice for this use case, or would another model provide significantly better retrieval quality? Consider:
   - Document types: technical PDFs, markdown notes, web articles
   - Query types: natural language questions, keyword searches
   - Chunk size: 512-1024 tokens
   - Cost vs. quality tradeoff
   - free tier/promo tokens availability

b) **Input Type Parameter**: I'm using `input_type="document"` for chunks and `input_type="query"` for both user queries AND document summaries. Should document summaries use `input_type="document"` instead since they represent document content?

c) **Batch Processing**: Currently batching at 128 (API limit). Are there recommended batch sizes for optimal throughput and latency? Should I adjust based on chunk count?

d) **Caching Strategy**: I'm using SHA-256 hash-based in-memory caching. Are there better approaches for:
   - Cache invalidation strategies
   - Persistent caching (Redis, disk)
   - Cache hit rate optimization

e) **Embedding Reuse**: For document summaries, I'm embedding the summary text. Would it be more effective to:
   - Average the embeddings of the document's chunks
   - Use a weighted average based on chunk importance
   - Keep the current approach (embed summary text)

f) **ThreadPoolExecutor Configuration**: Using 4 workers for Voyage calls. Is this optimal, or should it scale with CPU cores or expected load?

### 2. DeepSeek Optimization

Based on the official DeepSeek documentation and best practices:

a) **Model Parameters**: Current settings:
   - `temperature=0.7`
   - `max_tokens=2000`
   - `frequency_penalty=0.3`
   - `presence_penalty=0.1`
   
   Are these optimal for RAG responses? Should they differ for:
   - Document summarization (currently same settings)
   - Multi-turn conversations vs. single queries

b) **Prompt Caching**: I'm using XML tags for prompt structure. Does DeepSeek support prompt caching (like Anthropic's Claude)? If so:
   - How should I structure prompts to maximize cache hits?
   - Should the system prompt be in a separate message?
   - Can I cache the document context between queries?

c) **Context Window**: What's the effective context window for `deepseek-chat`? I'm limiting to 8000 tokens for retrieved chunks. Should I:
   - Increase this limit?
   - Reserve more space for message history?
   - Implement dynamic context sizing based on query complexity?

d) **Streaming Optimization**: Currently streaming token-by-token. Are there:
   - Recommended buffer sizes for SSE streaming?
   - Ways to reduce latency for first token?
   - Techniques to handle partial responses on errors?

e) **Circuit Breaker Tuning**: Current settings:
   - 5 failures to open
   - 60s recovery timeout
   - 2 successes to close
   
   Are these appropriate for DeepSeek's API characteristics? Should they be adjusted based on:
   - Rate limit patterns
   - Typical error recovery times
   - User experience considerations

f) **Cost Optimization**: I'm calculating costs as:
   - Input: $0.28/M tokens
   - Cached: $0.028/M tokens (10x cheaper)
   - Output: $0.42/M tokens
   
   Are these current rates? What strategies can reduce costs:
   - More aggressive response caching
   - Shorter system prompts
   - Chunk selection optimization
   - Summary-based filtering before full retrieval

   Also which specific model should I use from Deepseek?

### 3. RAG Pipeline Optimization

a) **Similarity Threshold**: Using 0.7 cosine similarity threshold. Is this appropriate, or should it be:
   - Dynamic based on query type
   - Lower for exploratory queries
   - Higher for factual lookups

b) **Chunk Retrieval**: Retrieving top 5 chunks per document, max 3 documents (15 chunks total). Should I:
   - Adjust based on query complexity
   - Use MMR (Maximal Marginal Relevance) for diversity
   - Implement re-ranking after initial retrieval

c) **Focus Context Boost**: Adding +0.15 similarity to chunks containing focus position. Is this:
   - Too aggressive/conservative?
   - Better implemented as a separate ranking signal?
   - Effective for user experience?

d) **Multi-Document Search**: Using document summaries to select top 3 documents. Should I:
   - Increase/decrease document count based on query
   - Use a similarity threshold for document selection
   - Implement hierarchical retrieval (summary -> chunks)

e) **Token Budget**: Enforcing 8000 token limit for context. Should this be:
   - Dynamic based on available context window
   - Adjusted for message history length
   - Split between chunks and history differently

### 4. Integration Architecture

a) **Error Handling**: Currently using circuit breaker for DeepSeek only. Should I:
   - Add circuit breaker for Voyage AI
   - Implement fallback strategies (cached responses, degraded mode)
   - Use different retry strategies for embeddings vs. generation

b) **Monitoring**: What metrics should I track for:
   - Voyage AI: embedding latency, cache hit rate, batch sizes
   - DeepSeek: token usage, cache hit rate, streaming latency, error rates
   - RAG: retrieval quality, response relevance, end-to-end latency

c) **Rate Limiting**: Currently handling 429 errors with 60s wait. Should I:
   - Implement proactive rate limiting
   - Use token bucket or leaky bucket algorithms
   - Coordinate rate limits across services

d) **Async Patterns**: Using ThreadPoolExecutor for Voyage (sync client). Are there:
   - Native async clients available
   - Better patterns for mixing sync/async code
   - Performance implications of current approach

### 5. Advanced Features

a) **Hybrid Search**: Should I implement:
   - BM25 + vector search combination
   - Keyword boosting for technical terms
   - Metadata filtering before vector search

b) **Reranking**: After initial retrieval, should I:
   - Use a cross-encoder model for reranking
   - Implement LLM-based relevance scoring
   - Use DeepSeek for reranking (cost implications)

c) **Query Expansion**: Should I:
   - Use DeepSeek to expand/rephrase queries
   - Generate multiple query variations
   - Implement query understanding/classification

d) **Adaptive Retrieval**: Should the system:
   - Adjust chunk count based on query complexity
   - Use different strategies for different query types
   - Learn from user feedback (implicit/explicit)

---

## Expected Research Output

Please provide:

1. **Specific recommendations** for each service based on official documentation
2. **Best practices** from production RAG implementations
3. **Performance benchmarks** or expected metrics where available
4. **Cost optimization strategies** with quantitative estimates
5. **Code examples** or configuration snippets where applicable
6. **Trade-offs** between different approaches (quality vs. cost vs. latency)
7. **Common pitfalls** to avoid with these services
8. **Monitoring and observability** recommendations
9. **Advice on what models to use** based on current documentation

Focus on actionable insights that can be directly applied to the codebase shown above.
