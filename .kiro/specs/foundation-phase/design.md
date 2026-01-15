# Design Document

## Introduction

This document defines the technical design for Phase 1 (Foundation) of Iubar. It translates the 14 requirements into concrete architecture, interfaces, data models, and implementation patterns.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + TypeScript)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ UploadZone  │  │ UrlInput    │  │ StatusPoll  │  │ DocumentList        │ │
│  │ (drag-drop) │  │ (url form)  │  │ (progress)  │  │ (list/delete)       │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                │                     │            │
│         └────────────────┴────────────────┴─────────────────────┘            │
│                                    │                                         │
│                          ┌─────────▼─────────┐                               │
│                          │   ApiClient       │                               │
│                          │ (services/api.ts) │                               │
│                          └─────────┬─────────┘                               │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │ HTTP/REST
┌────────────────────────────────────┼────────────────────────────────────────┐
│                              BACKEND (FastAPI)                               │
│                          ┌─────────▼─────────┐                               │
│                          │   FastAPI Router  │                               │
│                          │ (api/documents.py)│                               │
│                          └─────────┬─────────┘                               │
│                                    │                                         │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐  │
│  │                         SERVICE LAYER                                  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │ Document     │  │ Chunk        │  │ Embedding    │  │ Task       │ │  │
│  │  │ Processor    │  │ Service      │  │ Service      │  │ Manager    │ │  │
│  │  │ (Docling)    │  │ (tiktoken)   │  │ (Voyage AI)  │  │ (status)   │ │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │  │
│  │         │                 │                 │                │        │  │
│  │         └─────────────────┴─────────────────┴────────────────┘        │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                       │
│  ┌───────────────────────────────────┼───────────────────────────────────┐  │
│  │                         DATA LAYER                                     │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐ │  │
│  │  │ Document         │  │ Vector Store     │  │ File Storage         │ │  │
│  │  │ Repository       │  │ (ChromaDB)       │  │ (./data/uploads)     │ │  │
│  │  │ (SQLite)         │  │                  │  │                      │ │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── __init__.py
│   │   └── documents.py          # Document upload/CRUD endpoints
│   ├── core/
│   │   ├── __init__.py
│   │   ├── exceptions.py         # Custom exception classes
│   │   └── database.py           # SQLite connection management
│   ├── models/
│   │   ├── __init__.py
│   │   ├── document.py           # Document SQLAlchemy model
│   │   ├── chunk.py              # Chunk SQLAlchemy model
│   │   └── schemas.py            # Pydantic request/response schemas
│   ├── services/
│   │   ├── __init__.py
│   │   ├── document_processor.py # Docling conversion
│   │   ├── chunk_service.py      # Token-based chunking
│   │   ├── embedding_service.py  # Voyage AI embeddings
│   │   ├── vector_store.py       # ChromaDB abstraction
│   │   └── task_manager.py       # Processing status tracking
│   ├── utils/
│   │   ├── __init__.py
│   │   └── file_utils.py         # File handling utilities
│   ├── __init__.py
│   └── config.py                 # Configuration (existing)
├── main.py                       # FastAPI app (existing)
├── requirements.txt              # Dependencies
└── tests/
    ├── __init__.py
    ├── conftest.py               # Pytest fixtures
    ├── test_documents_api.py     # API endpoint tests
    ├── test_document_processor.py
    ├── test_chunk_service.py
    ├── test_embedding_service.py
    └── test_vector_store.py

frontend/
├── src/
│   ├── components/
│   │   ├── upload/
│   │   │   ├── UploadZone.tsx    # Drag-drop upload component
│   │   │   ├── UrlInput.tsx      # URL ingestion form
│   │   │   └── UploadProgress.tsx # Processing status display
│   │   └── documents/
│   │       └── DocumentList.tsx  # Document listing component
│   ├── services/
│   │   └── api.ts                # API client functions
│   ├── types/
│   │   └── document.ts           # TypeScript interfaces
│   └── hooks/
│       └── useDocumentUpload.ts  # Upload state management hook
└── tests/
    └── components/
        └── UploadZone.test.tsx
```


## Component Interfaces

### 1. Vector Store Interface (Abstraction Layer)

**File**: `backend/app/services/vector_store.py`

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional, Dict, Any

@dataclass
class QueryResult:
    """Result from vector similarity search."""
    ids: List[str]
    distances: List[float]
    documents: List[str]
    metadatas: List[Dict[str, Any]]

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
        documents: List[str]
    ) -> None:
        """Add vectors with metadata to the store.
        
        Args:
            ids: Unique identifiers for each vector (chunk IDs)
            embeddings: 512-dimensional float vectors from Voyage AI
            metadatas: Metadata dicts with document_id, chunk_index
            documents: Original text content for each chunk
        
        Raises:
            VectorStoreError: If add operation fails
        """
        pass
    
    @abstractmethod
    def query(
        self,
        embedding: List[float],
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None
    ) -> QueryResult:
        """Query for similar vectors.
        
        Args:
            embedding: 512-dimensional query vector
            n_results: Maximum number of results to return
            where: Optional metadata filter (e.g., {"document_id": "uuid"})
        
        Returns:
            QueryResult with ids, distances, documents, metadatas
            sorted by similarity (highest first, lowest distance)
        
        Raises:
            VectorStoreError: If query operation fails
        """
        pass
    
    @abstractmethod
    def delete_by_document(self, document_id: str) -> None:
        """Delete all vectors for a document.
        
        Args:
            document_id: UUID of the document to delete
        
        Raises:
            VectorStoreError: If delete operation fails
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
            True if healthy, False otherwise
        """
        pass


class VectorStoreError(Exception):
    """Custom exception for vector store operations."""
    pass
```

### 2. ChromaDB Implementation

**File**: `backend/app/services/vector_store.py` (continued)

```python
import chromadb
from chromadb.config import Settings as ChromaSettings
import os

class ChromaVectorStore(VectorStoreInterface):
    """ChromaDB implementation of VectorStoreInterface.
    
    Uses persistent storage with cosine similarity.
    Does NOT use ChromaDB's embedding function - we provide pre-computed
    512-dimensional Voyage AI embeddings.
    
    IMPORTANT: persist_path should be an absolute path derived from
    configuration to avoid issues in containerized deployments.
    """
    
    COLLECTION_NAME = "iubar_documents"
    
    def __init__(self, persist_path: str):
        """Initialize ChromaDB with persistent storage.
        
        Args:
            persist_path: Absolute directory path for ChromaDB persistence.
                         Should come from settings.chroma_path resolved to absolute.
        
        Raises:
            ValueError: If persist_path is relative (safety check)
        """
        # Convert to absolute path if relative (safety measure)
        absolute_path = os.path.abspath(persist_path)
        
        # Ensure directory exists
        os.makedirs(absolute_path, exist_ok=True)
        
        self._persist_path = absolute_path
        self._client = chromadb.PersistentClient(
            path=absolute_path,
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        self._collection = self._client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )
    
    def add(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
        documents: List[str]
    ) -> None:
        try:
            self._collection.add(
                ids=ids,
                embeddings=embeddings,
                metadatas=metadatas,
                documents=documents
            )
        except Exception as e:
            raise VectorStoreError(f"Failed to add vectors: {e}") from e
    
    def query(
        self,
        embedding: List[float],
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None
    ) -> QueryResult:
        try:
            results = self._collection.query(
                query_embeddings=[embedding],
                n_results=n_results,
                where=where,
                include=["documents", "metadatas", "distances"]
            )
            return QueryResult(
                ids=results["ids"][0] if results["ids"] else [],
                distances=results["distances"][0] if results["distances"] else [],
                documents=results["documents"][0] if results["documents"] else [],
                metadatas=results["metadatas"][0] if results["metadatas"] else []
            )
        except Exception as e:
            raise VectorStoreError(f"Failed to query vectors: {e}") from e
    
    def delete_by_document(self, document_id: str) -> None:
        try:
            self._collection.delete(where={"document_id": document_id})
        except Exception as e:
            raise VectorStoreError(f"Failed to delete vectors: {e}") from e
    
    def count(self) -> int:
        return self._collection.count()
    
    def health_check(self) -> bool:
        try:
            self._client.heartbeat()
            return True
        except Exception:
            return False
```


### 3. Embedding Service Interface

**File**: `backend/app/services/embedding_service.py`

```python
import voyageai
from typing import List, Dict, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
import hashlib
import logging

logger = logging.getLogger(__name__)

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
    
    def __init__(self, api_key: str, enable_cache: bool = True):
        """Initialize Voyage AI client with dedicated thread pool.
        
        Args:
            api_key: Voyage AI API key
            enable_cache: Whether to cache embeddings by content hash
        
        Raises:
            ValueError: If api_key is empty
        """
        if not api_key:
            raise ValueError("VOYAGE_API_KEY is required")
        self._client = voyageai.Client(api_key=api_key)
        # Dedicated executor prevents starving other async operations
        self._executor = ThreadPoolExecutor(
            max_workers=self.EXECUTOR_WORKERS,
            thread_name_prefix="embedding_"
        )
        # Simple in-memory cache for embedding deduplication
        # Key: SHA-256 hash of (text + input_type), Value: embedding vector
        self._cache: Dict[str, List[float]] = {} if enable_cache else None
    
    def _get_cache_key(self, text: str, input_type: str) -> str:
        """Generate cache key from text content hash."""
        content = f"{input_type}:{text}"
        return hashlib.sha256(content.encode()).hexdigest()
    
    def _check_cache(self, texts: List[str], input_type: str) -> tuple[List[str], List[int], List[List[float]]]:
        """Check cache for existing embeddings.
        
        Returns:
            Tuple of (texts_to_embed, their_indices, cached_embeddings_with_indices)
        """
        if self._cache is None:
            return texts, list(range(len(texts))), []
        
        texts_to_embed = []
        indices_to_embed = []
        cached_results = []  # (index, embedding) pairs
        
        for i, text in enumerate(texts):
            key = self._get_cache_key(text, input_type)
            if key in self._cache:
                cached_results.append((i, self._cache[key]))
            else:
                texts_to_embed.append(text)
                indices_to_embed.append(i)
        
        return texts_to_embed, indices_to_embed, cached_results
    
    def _update_cache(self, texts: List[str], embeddings: List[List[float]], input_type: str) -> None:
        """Update cache with new embeddings."""
        if self._cache is None:
            return
        for text, embedding in zip(texts, embeddings):
            key = self._get_cache_key(text, input_type)
            self._cache[key] = embedding
    
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for document chunks.
        
        Args:
            texts: List of text chunks to embed
        
        Returns:
            List of 512-dimensional embedding vectors
        
        Raises:
            EmbeddingError: If embedding fails after retries
        """
        all_embeddings = []
        
        # Process in batches
        for i in range(0, len(texts), self.MAX_BATCH_SIZE):
            batch = texts[i:i + self.MAX_BATCH_SIZE]
            embeddings = await self._embed_batch(batch, input_type="document")
            all_embeddings.extend(embeddings)
        
        return all_embeddings
    
    async def embed_query(self, text: str) -> List[float]:
        """Generate embedding for a search query.
        
        Args:
            text: Query text to embed
        
        Returns:
            512-dimensional embedding vector
        
        Raises:
            EmbeddingError: If embedding fails after retries
        """
        embeddings = await self._embed_batch([text], input_type="query")
        return embeddings[0]
    
    async def _embed_batch(
        self,
        texts: List[str],
        input_type: str
    ) -> List[List[float]]:
        """Embed a batch of texts with retry logic.
        
        Args:
            texts: Texts to embed (max 128)
            input_type: "document" or "query"
        
        Returns:
            List of embedding vectors
        
        Raises:
            EmbeddingError: If all retries fail
        """
        last_error = None
        
        for attempt in range(self.MAX_RETRIES):
            try:
                # Run sync Voyage client in dedicated thread pool
                # Using dedicated executor prevents starving other async ops
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    self._executor,
                    lambda: self._client.embed(
                        texts=texts,
                        model=self.MODEL,
                        input_type=input_type
                    )
                )
                return result.embeddings
                
            except voyageai.error.RateLimitError as e:
                logger.warning(f"Rate limited, waiting {self.RATE_LIMIT_WAIT}s (attempt {attempt + 1})")
                await asyncio.sleep(self.RATE_LIMIT_WAIT)
                last_error = e
                
            except voyageai.error.AuthenticationError as e:
                # Don't retry auth errors
                raise EmbeddingError("Configuration error. Please contact support.") from e
                
            except Exception as e:
                wait_time = self.SERVER_ERROR_WAIT * (2 ** attempt)
                logger.warning(f"Embedding error, waiting {wait_time}s (attempt {attempt + 1}): {e}")
                await asyncio.sleep(wait_time)
                last_error = e
        
        raise EmbeddingError("Embedding service temporarily unavailable. Please try again later.") from last_error
    
    def shutdown(self) -> None:
        """Shutdown the thread pool executor."""
        self._executor.shutdown(wait=True)


class EmbeddingError(Exception):
    """Custom exception for embedding operations."""
    pass
```

### 4. Chunk Service Interface

**File**: `backend/app/services/chunk_service.py`

```python
import tiktoken
from typing import List
from dataclasses import dataclass
import re

@dataclass
class Chunk:
    """A document chunk with metadata."""
    index: int
    content: str
    token_count: int
    start_char: int
    end_char: int

class ChunkService:
    """Service for splitting documents into token-sized chunks.
    
    Uses tiktoken cl100k_base encoding (same as OpenAI models).
    Targets 512-1024 tokens with 15% overlap.
    """
    
    ENCODING = "cl100k_base"
    TARGET_TOKENS = 800  # Sweet spot in 512-1024 range
    MAX_TOKENS = 1024
    MIN_TOKENS = 512
    OVERLAP_RATIO = 0.15  # 15% overlap
    
    def __init__(self):
        """Initialize tiktoken encoder."""
        self._encoder = tiktoken.get_encoding(self.ENCODING)
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text using cl100k_base encoding.
        
        Args:
            text: Text to count tokens for
        
        Returns:
            Number of tokens
        """
        return len(self._encoder.encode(text))
    
    def chunk_document(self, markdown: str) -> List[Chunk]:
        """Split markdown document into chunks.
        
        Respects paragraph boundaries when possible.
        Falls back to sentence boundaries for large paragraphs.
        
        Args:
            markdown: Markdown content to chunk
        
        Returns:
            List of Chunk objects with metadata
        
        Raises:
            ChunkingError: If document is empty
        """
        if not markdown or not markdown.strip():
            raise ChunkingError("This document appears to be empty.")
        
        chunks = []
        overlap_tokens = int(self.TARGET_TOKENS * self.OVERLAP_RATIO)
        
        # Split by paragraphs (double newline)
        paragraphs = markdown.split('\n\n')
        
        current_texts = []
        current_tokens = 0
        current_start = 0
        char_position = 0
        
        for para in paragraphs:
            para_tokens = self.count_tokens(para)
            para_len = len(para) + 2  # +2 for \n\n
            
            # Handle oversized paragraphs
            if para_tokens > self.MAX_TOKENS:
                # Flush current chunk
                if current_texts:
                    chunk_text = '\n\n'.join(current_texts)
                    chunks.append(Chunk(
                        index=len(chunks),
                        content=chunk_text,
                        token_count=self.count_tokens(chunk_text),
                        start_char=current_start,
                        end_char=char_position
                    ))
                    current_texts = []
                    current_tokens = 0
                    current_start = char_position
                
                # Split large paragraph by sentences
                sentence_chunks = self._split_by_sentences(
                    para, char_position, len(chunks)
                )
                chunks.extend(sentence_chunks)
                char_position += para_len
                current_start = char_position
                continue
            
            # Check if adding this paragraph exceeds target
            if current_tokens + para_tokens > self.TARGET_TOKENS and current_texts:
                chunk_text = '\n\n'.join(current_texts)
                chunks.append(Chunk(
                    index=len(chunks),
                    content=chunk_text,
                    token_count=self.count_tokens(chunk_text),
                    start_char=current_start,
                    end_char=char_position
                ))
                
                # Keep overlap
                overlap_texts, overlap_count = self._get_overlap(
                    current_texts, overlap_tokens
                )
                current_texts = overlap_texts
                current_tokens = overlap_count
                current_start = char_position - sum(len(t) + 2 for t in overlap_texts)
            
            current_texts.append(para)
            current_tokens += para_tokens
            char_position += para_len
        
        # Final chunk
        if current_texts:
            chunk_text = '\n\n'.join(current_texts)
            chunks.append(Chunk(
                index=len(chunks),
                content=chunk_text,
                token_count=self.count_tokens(chunk_text),
                start_char=current_start,
                end_char=char_position
            ))
        
        return chunks
    
    def _split_by_sentences(
        self,
        text: str,
        start_char: int,
        start_index: int
    ) -> List[Chunk]:
        """Split text by sentence boundaries."""
        # Split on sentence endings
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        chunks = []
        current_sentences = []
        current_tokens = 0
        current_start = start_char
        char_pos = start_char
        
        for sentence in sentences:
            sent_tokens = self.count_tokens(sentence)
            sent_len = len(sentence) + 1
            
            if current_tokens + sent_tokens > self.TARGET_TOKENS and current_sentences:
                chunk_text = ' '.join(current_sentences)
                chunks.append(Chunk(
                    index=start_index + len(chunks),
                    content=chunk_text,
                    token_count=self.count_tokens(chunk_text),
                    start_char=current_start,
                    end_char=char_pos
                ))
                current_sentences = current_sentences[-2:] if len(current_sentences) > 2 else []
                current_tokens = sum(self.count_tokens(s) for s in current_sentences)
                current_start = char_pos
            
            current_sentences.append(sentence)
            current_tokens += sent_tokens
            char_pos += sent_len
        
        if current_sentences:
            chunk_text = ' '.join(current_sentences)
            chunks.append(Chunk(
                index=start_index + len(chunks),
                content=chunk_text,
                token_count=self.count_tokens(chunk_text),
                start_char=current_start,
                end_char=char_pos
            ))
        
        return chunks
    
    def _get_overlap(
        self,
        texts: List[str],
        target_tokens: int
    ) -> tuple[List[str], int]:
        """Get texts for overlap from end of list."""
        overlap = []
        total = 0
        for text in reversed(texts):
            tokens = self.count_tokens(text)
            if total + tokens <= target_tokens:
                overlap.insert(0, text)
                total += tokens
            else:
                break
        return overlap, total


class ChunkingError(Exception):
    """Custom exception for chunking operations."""
    pass
```


### 5. Document Processor Interface

**File**: `backend/app/services/document_processor.py`

```python
from docling.document_converter import DocumentConverter
import httpx
import tempfile
import os
import asyncio
from pathlib import Path
from typing import Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class ProcessingResult:
    """Result of document processing."""
    markdown: str
    title: Optional[str]
    detected_language: str = "en"

class DocumentProcessor:
    """Service for converting documents to Markdown using Docling.
    
    Supports PDF, DOCX, TXT, MD, HTML, and URL content.
    
    IMPORTANT: Docling conversion is CPU-bound and synchronous.
    All Docling calls are wrapped in asyncio.to_thread() to prevent
    blocking the event loop.
    """
    
    URL_TIMEOUT = 30  # seconds
    
    def __init__(self):
        """Initialize Docling converter."""
        self._converter = DocumentConverter()
    
    def _sync_convert(self, file_path: str) -> tuple[str, Optional[str]]:
        """Synchronous Docling conversion (runs in thread pool).
        
        Args:
            file_path: Path to file to convert
            
        Returns:
            Tuple of (markdown_content, title)
        """
        result = self._converter.convert(file_path)
        markdown = result.document.export_to_markdown()
        title = self._extract_docling_title(result)
        return markdown, title
    
    async def process_file(
        self,
        file_path: str,
        file_type: str
    ) -> ProcessingResult:
        """Process an uploaded file to Markdown.
        
        Args:
            file_path: Path to the uploaded file
            file_type: One of 'pdf', 'docx', 'txt', 'md', 'html'
        
        Returns:
            ProcessingResult with markdown content and metadata
        
        Raises:
            ProcessingError: If conversion fails
        """
        path = Path(file_path)
        
        if not path.exists():
            raise ProcessingError("File not found. It may have been deleted.")
        
        try:
            if file_type in ('txt', 'md'):
                # Direct read for plain text (fast, no thread needed)
                markdown = path.read_text(encoding='utf-8')
                title = self._extract_title_from_markdown(markdown)
                return ProcessingResult(markdown=markdown, title=title)
            
            elif file_type in ('pdf', 'docx', 'html'):
                # Use Docling for conversion - CPU-bound, run in thread pool
                # This prevents blocking the event loop during heavy processing
                markdown, title = await asyncio.to_thread(
                    self._sync_convert, str(path)
                )
                return ProcessingResult(markdown=markdown, title=title)
            
            else:
                raise ProcessingError("Could not process this file format.")
                
        except UnicodeDecodeError:
            raise ProcessingError("Could not read this file. It may be corrupted or password-protected.")
        except Exception as e:
            logger.error(f"Document processing failed: {e}", exc_info=True)
            if "password" in str(e).lower() or "encrypted" in str(e).lower():
                raise ProcessingError("Could not read this file. It may be corrupted or password-protected.")
            raise ProcessingError("Could not process this file format.") from e
    
    async def process_url(self, url: str) -> ProcessingResult:
        """Fetch and process URL content to Markdown.
        
        Args:
            url: HTTP/HTTPS URL to fetch
        
        Returns:
            ProcessingResult with markdown content and metadata
        
        Raises:
            ProcessingError: If fetch or conversion fails
        """
        temp_path = None
        try:
            # Fetch HTML content
            async with httpx.AsyncClient(timeout=self.URL_TIMEOUT) as client:
                response = await client.get(url, follow_redirects=True)
                response.raise_for_status()
                html_content = response.text
            
            # Save to temp file for Docling
            with tempfile.NamedTemporaryFile(
                suffix=".html",
                delete=False,
                mode='w',
                encoding='utf-8'
            ) as f:
                f.write(html_content)
                temp_path = f.name
            
            # Convert with Docling
            result = self._converter.convert(temp_path)
            markdown = result.document.export_to_markdown()
            title = self._extract_docling_title(result)
            
            # Cleanup temp file on success
            os.unlink(temp_path)
            temp_path = None
            
            return ProcessingResult(markdown=markdown, title=title)
            
        except httpx.TimeoutException:
            raise ProcessingError("Could not reach the website. Please check the URL and try again.")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise ProcessingError("Page not found. Please check the URL.")
            elif e.response.status_code in (401, 403):
                raise ProcessingError("Access denied. This page may require login.")
            else:
                raise ProcessingError(f"Could not load the page. Please try again later. (HTTP {e.response.status_code})")
        except httpx.ConnectError:
            raise ProcessingError("Could not reach the website. Please check the URL and try again.")
        except Exception as e:
            logger.error(f"URL processing failed: {e}", exc_info=True)
            raise ProcessingError("Could not process this URL.") from e
        finally:
            # Keep temp file on failure for debugging
            if temp_path and os.path.exists(temp_path):
                logger.warning(f"Keeping failed temp file: {temp_path}")
    
    def _extract_title_from_markdown(self, markdown: str) -> Optional[str]:
        """Extract title from first H1 heading."""
        for line in markdown.split('\n'):
            line = line.strip()
            if line.startswith('# '):
                return line[2:].strip()
        return None
    
    def _extract_docling_title(self, result) -> Optional[str]:
        """Extract title from Docling result metadata."""
        try:
            if hasattr(result.document, 'metadata') and result.document.metadata:
                return result.document.metadata.get('title')
        except Exception:
            pass
        # Fallback to markdown extraction
        markdown = result.document.export_to_markdown()
        return self._extract_title_from_markdown(markdown)


class ProcessingError(Exception):
    """Custom exception for document processing."""
    pass
```

### 6. Task Manager Interface

**File**: `backend/app/services/task_manager.py`

```python
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Optional
from enum import Enum
import threading

class ProcessingStatus(str, Enum):
    """Document processing status values."""
    PENDING = "pending"
    CONVERTING = "converting"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"
    COMPLETE = "complete"
    ERROR = "error"

@dataclass
class TaskStatus:
    """Status of a document processing task."""
    status: ProcessingStatus
    progress: str
    document_id: str
    error: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    def to_dict(self) -> dict:
        return {
            "status": self.status.value,
            "progress": self.progress,
            "document_id": self.document_id,
            "error": self.error,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

class TaskManager:
    """In-memory task status tracking for document processing.
    
    Thread-safe singleton for tracking background task progress.
    """
    
    _instance = None
    _lock = threading.Lock()
    
    PROGRESS_MESSAGES = {
        ProcessingStatus.PENDING: "Queued for processing...",
        ProcessingStatus.CONVERTING: "Converting document to text...",
        ProcessingStatus.CHUNKING: "Splitting into searchable sections...",
        ProcessingStatus.COMPLETE: "Ready",
    }
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._tasks: Dict[str, TaskStatus] = {}
        return cls._instance
    
    def create_task(self, task_id: str, document_id: str) -> TaskStatus:
        """Create a new task with pending status.
        
        Args:
            task_id: Unique task identifier (UUID)
            document_id: Associated document ID
        
        Returns:
            Created TaskStatus
        """
        status = TaskStatus(
            status=ProcessingStatus.PENDING,
            progress=self.PROGRESS_MESSAGES[ProcessingStatus.PENDING],
            document_id=document_id
        )
        self._tasks[task_id] = status
        return status
    
    def get_task(self, task_id: str) -> Optional[TaskStatus]:
        """Get task status by ID.
        
        Args:
            task_id: Task identifier
        
        Returns:
            TaskStatus or None if not found
        """
        return self._tasks.get(task_id)
    
    def update_status(
        self,
        task_id: str,
        status: ProcessingStatus,
        progress: Optional[str] = None,
        error: Optional[str] = None
    ) -> None:
        """Update task status.
        
        Args:
            task_id: Task identifier
            status: New status
            progress: Custom progress message (uses default if None)
            error: Error message (only for ERROR status)
        """
        task = self._tasks.get(task_id)
        if task:
            task.status = status
            task.progress = progress or self.PROGRESS_MESSAGES.get(status, "Processing...")
            task.error = error
            task.updated_at = datetime.now(timezone.utc).isoformat()
            
            if status == ProcessingStatus.ERROR and error:
                task.progress = f"Failed: {error}"
    
    def update_embedding_progress(
        self,
        task_id: str,
        current: int,
        total: int
    ) -> None:
        """Update embedding progress with chunk count.
        
        Args:
            task_id: Task identifier
            current: Current chunk being processed
            total: Total chunks to process
        """
        self.update_status(
            task_id,
            ProcessingStatus.EMBEDDING,
            progress=f"Generating embeddings... (chunk {current} of {total})"
        )
    
    def delete_task(self, task_id: str) -> None:
        """Remove task from tracking."""
        self._tasks.pop(task_id, None)
```


## Data Models

### Pydantic Schemas

**File**: `backend/app/models/schemas.py`

```python
from pydantic import BaseModel, Field, HttpUrl, field_validator
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum

# ============================================================================
# Enums
# ============================================================================

class FileType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    MD = "md"
    URL = "url"
    HTML = "html"

class ProcessingStatus(str, Enum):
    PENDING = "pending"
    CONVERTING = "converting"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"
    COMPLETE = "complete"
    ERROR = "error"

# ============================================================================
# Request Schemas
# ============================================================================

class UrlIngestionRequest(BaseModel):
    """Request body for URL ingestion."""
    url: str = Field(..., max_length=2048, description="HTTP/HTTPS URL to ingest")
    
    @field_validator('url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(('http://', 'https://')):
            raise ValueError("URL must start with http:// or https://")
        return v

# ============================================================================
# Response Schemas
# ============================================================================

class UploadResponse(BaseModel):
    """Response for successful file upload."""
    task_id: str = Field(..., description="UUID for tracking processing status")
    status: Literal["pending"] = "pending"

class TaskStatusResponse(BaseModel):
    """Response for task status query."""
    status: ProcessingStatus
    progress: str
    document_id: str
    error: Optional[str] = None
    created_at: str
    updated_at: str

class DocumentSummary(BaseModel):
    """Summary of a document for listing."""
    id: str
    original_name: str
    file_type: FileType
    file_size: Optional[int]
    upload_time: str
    processing_status: ProcessingStatus
    chunk_count: int = 0

class DocumentMetadata(BaseModel):
    """Extracted document metadata."""
    title: Optional[str] = None
    detected_language: str = "en"

class DocumentDetail(BaseModel):
    """Full document details."""
    id: str
    original_name: str
    file_type: FileType
    file_size: Optional[int]
    upload_time: str
    processing_status: ProcessingStatus
    markdown_content: Optional[str] = None
    metadata: Optional[DocumentMetadata] = None
    chunk_count: int = 0

class DocumentListResponse(BaseModel):
    """Response for document listing."""
    documents: List[DocumentSummary]

# ============================================================================
# Error Schemas
# ============================================================================

class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str = Field(..., description="Error type identifier")
    message: str = Field(..., description="User-friendly error message")
    details: Optional[dict] = Field(None, description="Additional details (debug mode only)")

# ============================================================================
# Health/Status Schemas
# ============================================================================

class HealthResponse(BaseModel):
    """Health check response."""
    status: Literal["healthy"] = "healthy"
    timestamp: str
    service: str = "iubar-backend"
    version: str

class ComponentStatus(BaseModel):
    """Status of a system component."""
    status: Literal["connected", "configured", "not_configured", "error"]
    path: Optional[str] = None
    collection: Optional[str] = None
    writable: Optional[bool] = None

class SystemStatusResponse(BaseModel):
    """Detailed system status response."""
    database: ComponentStatus
    vector_store: ComponentStatus
    voyage_api: ComponentStatus
    deepseek_api: ComponentStatus
    storage: ComponentStatus
```

### SQLAlchemy Models

**File**: `backend/app/models/document.py`

```python
from sqlalchemy import Column, String, Integer, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Document(Base):
    """Document metadata model."""
    
    __tablename__ = "documents"
    
    id = Column(String(36), primary_key=True)  # UUID
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_type = Column(String(10), nullable=False)  # pdf, docx, txt, md, url, html
    file_size = Column(Integer, nullable=True)
    upload_time = Column(String(30), nullable=False)  # ISO 8601
    processing_status = Column(String(20), nullable=False, default="pending")
    markdown_content = Column(Text, nullable=True)
    metadata = Column(Text, nullable=True)  # JSON string
    error_message = Column(Text, nullable=True)
    
    # Relationship to chunks
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")


class Chunk(Base):
    """Document chunk model."""
    
    __tablename__ = "chunks"
    
    id = Column(String(36), primary_key=True)  # UUID
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=False)
    metadata = Column(Text, nullable=True)  # JSON string
    
    # Relationship to document
    document = relationship("Document", back_populates="chunks")
    
    __table_args__ = (
        UniqueConstraint('document_id', 'chunk_index', name='uq_document_chunk'),
    )
```

**File**: `backend/app/core/database.py`

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text, event
from backend.app.config import settings
import os

# Convert sqlite:/// to sqlite+aiosqlite:///
DATABASE_URL = settings.database_url.replace("sqlite:///", "sqlite+aiosqlite:///")

# Ensure data directory exists (use absolute path)
db_path = DATABASE_URL.replace("sqlite+aiosqlite:///", "")
if db_path.startswith("./"):
    db_path = os.path.abspath(db_path)
os.makedirs(os.path.dirname(db_path), exist_ok=True)

engine = create_async_engine(
    DATABASE_URL,
    echo=settings.debug,
    future=True
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def init_db():
    """Initialize database tables with optimized SQLite configuration.
    
    Configures SQLite for better concurrency:
    - WAL mode: Allows concurrent reads during writes
    - busy_timeout: Wait up to 10s for locks instead of failing immediately
    - synchronous=NORMAL: Good balance of safety and performance
    - foreign_keys=ON: Enforce referential integrity
    """
    async with engine.begin() as conn:
        # SQLite optimizations for better concurrency
        # WAL mode allows readers to not block writers and vice versa
        await conn.execute(text("PRAGMA journal_mode=WAL"))
        # Wait up to 10 seconds for locks before failing
        await conn.execute(text("PRAGMA busy_timeout=10000"))
        # NORMAL is safe for most use cases, FULL is paranoid
        await conn.execute(text("PRAGMA synchronous=NORMAL"))
        # Enable foreign key enforcement
        await conn.execute(text("PRAGMA foreign_keys=ON"))
        # Create tables
        await conn.run_sync(Base.metadata.create_all)

async def get_db() -> AsyncSession:
    """Dependency for getting database session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
```


## API Endpoints Design

**File**: `backend/app/api/documents.py`

```python
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid
import os
import aiofiles

from backend.app.models.schemas import (
    UploadResponse, UrlIngestionRequest, TaskStatusResponse,
    DocumentSummary, DocumentDetail, DocumentListResponse, ErrorResponse
)
from backend.app.core.database import get_db
from backend.app.services.task_manager import TaskManager, ProcessingStatus
from backend.app.config import settings

router = APIRouter(prefix="/api/documents", tags=["documents"])

# Allowed file types and MIME mappings
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}
MIME_TO_TYPE = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/markdown": "md",
}
MAX_FILE_SIZE = settings.max_file_size_mb * 1024 * 1024  # Convert to bytes

task_manager = TaskManager()

# ============================================================================
# Upload Endpoints
# ============================================================================

@router.post(
    "/upload",
    response_model=UploadResponse,
    responses={
        413: {"model": ErrorResponse, "description": "File too large"},
        415: {"model": ErrorResponse, "description": "Unsupported file type"},
    }
)
async def upload_document(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Upload a document for processing.
    
    Accepts PDF, DOCX, TXT, MD files up to 10MB.
    Returns task_id for status polling.
    """
    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail={
                "error": "Unsupported file type",
                "message": "Supported formats: PDF, DOCX, TXT, MD",
                "supported_extensions": list(ALLOWED_EXTENSIONS)
            }
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail={
                "error": "File too large",
                "message": f"Maximum file size is {settings.max_file_size_mb}MB",
                "max_size_bytes": MAX_FILE_SIZE
            }
        )
    
    # Generate task ID and save file
    task_id = str(uuid.uuid4())
    filename = f"{task_id}_{file.filename}"
    file_path = os.path.join(settings.upload_path, filename)
    
    # Ensure upload directory exists
    os.makedirs(settings.upload_path, exist_ok=True)
    
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Determine file type
    file_type = MIME_TO_TYPE.get(file.content_type, ext[1:])
    
    # Create document record and task
    # ... (database operations)
    
    task_manager.create_task(task_id, task_id)
    
    # Queue background processing
    background_tasks.add_task(process_document_task, task_id, file_path, file_type, db)
    
    return UploadResponse(task_id=task_id, status="pending")


@router.post(
    "/url",
    response_model=UploadResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid URL"},
    }
)
async def ingest_url(
    request: UrlIngestionRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Ingest content from a URL.
    
    Fetches the URL and converts HTML to Markdown using Docling.
    Returns task_id for status polling.
    """
    task_id = str(uuid.uuid4())
    
    # Create document record
    # ... (database operations)
    
    task_manager.create_task(task_id, task_id)
    
    # Queue background processing
    background_tasks.add_task(process_url_task, task_id, request.url, db)
    
    return UploadResponse(task_id=task_id, status="pending")

# ============================================================================
# Status Endpoint
# ============================================================================

@router.get(
    "/status/{task_id}",
    response_model=TaskStatusResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Task not found"},
    }
)
async def get_task_status(task_id: str):
    """Get processing status for an upload task."""
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "Not found",
                "message": "No upload found with this ID"
            }
        )
    return TaskStatusResponse(**task.to_dict())

# ============================================================================
# Document CRUD Endpoints
# ============================================================================

@router.get("", response_model=DocumentListResponse)
async def list_documents(db: AsyncSession = Depends(get_db)):
    """List all uploaded documents."""
    # ... (database query)
    return DocumentListResponse(documents=[])


@router.get(
    "/{document_id}",
    response_model=DocumentDetail,
    responses={
        404: {"model": ErrorResponse, "description": "Document not found"},
    }
)
async def get_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """Get full document details including markdown content."""
    # ... (database query)
    raise HTTPException(
        status_code=404,
        detail={"error": "Not found", "message": "Document not found"}
    )


@router.delete(
    "/{document_id}",
    status_code=204,
    responses={
        404: {"model": ErrorResponse, "description": "Document not found"},
        500: {"model": ErrorResponse, "description": "Deletion failed"},
    }
)
async def delete_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a document and all associated data.
    
    Removes:
    - Document record from SQLite
    - All chunk records from SQLite
    - Embeddings from ChromaDB
    - Uploaded file from disk
    """
    # ... (deletion logic)
    return Response(status_code=204)
```


## Configuration Updates

**File**: `backend/app/config.py` (updated)

```python
"""
Configuration management for Iubar backend.
Handles environment variables and application settings.
"""

import os
from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # API Configuration
    api_title: str = "Iubar API"
    api_version: str = "0.1.0"
    api_description: str = "AI-enhanced personal knowledge management backend"

    # CORS Configuration
    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:5174"

    # Database Configuration
    database_url: str = "sqlite:///./data/iubar.db"

    # Storage Configuration
    chroma_path: str = "./data/chroma"
    upload_path: str = "./data/uploads"
    max_file_size_mb: int = 10

    # API Keys (required)
    voyage_api_key: Optional[str] = Field(default=None, alias="VOYAGE_API_KEY")
    deepseek_api_key: Optional[str] = Field(default=None, alias="DEEPSEEK_API_KEY")

    # Logging Configuration
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        populate_by_name = True

    @property
    def cors_origins_list(self) -> List[str]:
        """Convert CORS_ORIGINS string to list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    def validate_required_keys(self) -> None:
        """Validate required API keys are set.
        
        Raises:
            ValueError: If VOYAGE_API_KEY is not set
        """
        if not self.voyage_api_key:
            raise ValueError(
                "VOYAGE_API_KEY environment variable is required. "
                "Get your API key at https://www.voyageai.com/"
            )
        
        if not self.deepseek_api_key:
            import logging
            logging.warning("DEEPSEEK_API_KEY not set. LLM features will be unavailable.")

    def ensure_directories(self) -> None:
        """Create required directories if they don't exist."""
        os.makedirs(self.chroma_path, exist_ok=True)
        os.makedirs(self.upload_path, exist_ok=True)
        os.makedirs(os.path.dirname(self.database_url.replace("sqlite:///", "")), exist_ok=True)

    def log_configuration(self) -> None:
        """Log configuration status (without exposing secrets)."""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"HOST: {self.host}")
        logger.info(f"PORT: {self.port}")
        logger.info(f"DEBUG: {self.debug}")
        logger.info(f"DATABASE_URL: {self.database_url}")
        logger.info(f"CHROMA_PATH: {self.chroma_path}")
        logger.info(f"UPLOAD_PATH: {self.upload_path}")
        logger.info(f"VOYAGE_API_KEY: {'configured' if self.voyage_api_key else 'NOT SET'}")
        logger.info(f"DEEPSEEK_API_KEY: {'configured' if self.deepseek_api_key else 'NOT SET'}")


# Global settings instance
settings = Settings()
```

## Frontend Components Design

### TypeScript Types

**File**: `frontend/src/types/document.ts`

```typescript
// ============================================================================
// Enums
// ============================================================================

export type FileType = 'pdf' | 'docx' | 'txt' | 'md' | 'url' | 'html';

export type ProcessingStatus = 
  | 'pending' 
  | 'converting' 
  | 'chunking' 
  | 'embedding' 
  | 'complete' 
  | 'error';

// ============================================================================
// API Response Types
// ============================================================================

export interface UploadResponse {
  task_id: string;
  status: 'pending';
}

export interface TaskStatusResponse {
  status: ProcessingStatus;
  progress: string;
  document_id: string;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentSummary {
  id: string;
  original_name: string;
  file_type: FileType;
  file_size: number | null;
  upload_time: string;
  processing_status: ProcessingStatus;
  chunk_count: number;
}

export interface DocumentMetadata {
  title: string | null;
  detected_language: string;
}

export interface DocumentDetail extends DocumentSummary {
  markdown_content: string | null;
  metadata: DocumentMetadata | null;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface UploadZoneProps {
  onUploadStart: (taskId: string) => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
}

export interface UploadProgressProps {
  taskId: string;
  onComplete: (documentId: string) => void;
  onError: (error: string) => void;
}

export interface UrlInputProps {
  onSubmit: (url: string) => void;
  disabled?: boolean;
}
```

### API Client

**File**: `frontend/src/services/api.ts`

```typescript
import type { 
  UploadResponse, 
  TaskStatusResponse, 
  DocumentSummary, 
  DocumentDetail,
  ErrorResponse 
} from '../types/document';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ErrorResponse = await response.json().catch(() => ({
      error: 'Unknown error',
      message: 'Something went wrong. Please try again.'
    }));
    throw new ApiError(error.message, response.status, error.details);
  }
  return response.json();
}

// ============================================================================
// Document Upload
// ============================================================================

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  return handleResponse<UploadResponse>(response);
}

export async function ingestUrl(url: string): Promise<UploadResponse> {
  const response = await fetch(`${API_BASE}/api/documents/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  return handleResponse<UploadResponse>(response);
}

// ============================================================================
// Status Polling
// ============================================================================

export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  const response = await fetch(`${API_BASE}/api/documents/status/${taskId}`);
  return handleResponse<TaskStatusResponse>(response);
}

// ============================================================================
// Document CRUD
// ============================================================================

export async function listDocuments(): Promise<DocumentSummary[]> {
  const response = await fetch(`${API_BASE}/api/documents`);
  const data = await handleResponse<{ documents: DocumentSummary[] }>(response);
  return data.documents;
}

export async function getDocument(id: string): Promise<DocumentDetail> {
  const response = await fetch(`${API_BASE}/api/documents/${id}`);
  return handleResponse<DocumentDetail>(response);
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/documents/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok && response.status !== 204) {
    const error: ErrorResponse = await response.json().catch(() => ({
      error: 'Deletion failed',
      message: 'Could not delete document. Please try again.'
    }));
    throw new ApiError(error.message, response.status);
  }
}

export { ApiError };
```


### Upload Hook

**File**: `frontend/src/hooks/useDocumentUpload.ts`

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { uploadDocument, ingestUrl, getTaskStatus, ApiError } from '../services/api';
import type { ProcessingStatus, TaskStatusResponse } from '../types/document';

interface UploadState {
  isUploading: boolean;
  taskId: string | null;
  status: ProcessingStatus | null;
  progress: string | null;
  error: string | null;
  documentId: string | null;
}

const POLL_INTERVAL = 2000; // 2 seconds

export function useDocumentUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    taskId: null,
    status: null,
    progress: null,
    error: null,
    documentId: null,
  });

  const pollIntervalRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback((taskId: string) => {
    stopPolling();

    const poll = async () => {
      try {
        const status: TaskStatusResponse = await getTaskStatus(taskId);
        
        setState(prev => ({
          ...prev,
          status: status.status,
          progress: status.progress,
          error: status.error,
          documentId: status.document_id,
        }));

        if (status.status === 'complete' || status.status === 'error') {
          stopPolling();
          setState(prev => ({ ...prev, isUploading: false }));
        }
      } catch (err) {
        stopPolling();
        setState(prev => ({
          ...prev,
          isUploading: false,
          error: err instanceof ApiError ? err.message : 'Failed to check status',
        }));
      }
    };

    // Initial poll
    poll();
    // Continue polling
    pollIntervalRef.current = window.setInterval(poll, POLL_INTERVAL);
  }, [stopPolling]);

  const uploadFile = useCallback(async (file: File) => {
    setState({
      isUploading: true,
      taskId: null,
      status: 'pending',
      progress: 'Uploading...',
      error: null,
      documentId: null,
    });

    try {
      const response = await uploadDocument(file);
      setState(prev => ({ ...prev, taskId: response.task_id }));
      startPolling(response.task_id);
    } catch (err) {
      setState(prev => ({
        ...prev,
        isUploading: false,
        error: err instanceof ApiError ? err.message : 'Upload failed',
      }));
    }
  }, [startPolling]);

  const submitUrl = useCallback(async (url: string) => {
    setState({
      isUploading: true,
      taskId: null,
      status: 'pending',
      progress: 'Fetching URL...',
      error: null,
      documentId: null,
    });

    try {
      const response = await ingestUrl(url);
      setState(prev => ({ ...prev, taskId: response.task_id }));
      startPolling(response.task_id);
    } catch (err) {
      setState(prev => ({
        ...prev,
        isUploading: false,
        error: err instanceof ApiError ? err.message : 'URL ingestion failed',
      }));
    }
  }, [startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setState({
      isUploading: false,
      taskId: null,
      status: null,
      progress: null,
      error: null,
      documentId: null,
    });
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    ...state,
    uploadFile,
    submitUrl,
    reset,
  };
}
```

## Correctness Properties

These properties define invariants that must hold for the system to be correct. They serve as the basis for property-based testing.

### 1. Document Processing Pipeline Properties

```
PROPERTY: Chunk Token Bounds
FOR ALL chunks C produced by ChunkService:
  512 <= C.token_count <= 1024
  OR C is the final chunk of a document (may be smaller)

PROPERTY: Chunk Overlap Consistency
FOR ALL consecutive chunk pairs (C_i, C_j) where j = i + 1:
  overlap_tokens(C_i, C_j) >= 0.10 * min(C_i.token_count, C_j.token_count)
  AND overlap_tokens(C_i, C_j) <= 0.20 * max(C_i.token_count, C_j.token_count)

PROPERTY: Chunk Index Uniqueness
FOR ALL documents D:
  FOR ALL chunks C1, C2 in D.chunks:
    C1.id != C2.id
    AND (C1.chunk_index == C2.chunk_index) => (C1 == C2)

PROPERTY: Chunk Coverage
FOR ALL documents D with markdown_content M:
  concatenate(D.chunks, removing_overlap) ≈ M
  (approximate equality allowing for whitespace normalization)

PROPERTY: Token Count Accuracy
FOR ALL chunks C:
  |C.token_count - tiktoken_count(C.content)| == 0
```

### 2. Embedding Properties

```
PROPERTY: Embedding Dimension Consistency
FOR ALL embeddings E generated by EmbeddingService:
  len(E) == 512

PROPERTY: Embedding Normalization
FOR ALL embeddings E:
  0.99 <= ||E||_2 <= 1.01
  (Voyage embeddings are L2-normalized)

PROPERTY: Embedding Determinism
FOR ALL texts T:
  embed(T, input_type="document") == embed(T, input_type="document")
  (same input produces same output)

PROPERTY: Query vs Document Embedding Distinction
FOR ALL texts T:
  embed(T, input_type="query") != embed(T, input_type="document")
  (different input_type produces different embeddings)
```

### 3. Vector Store Properties

```
PROPERTY: Add-Query Consistency
FOR ALL vectors V added to store with id I:
  query(V, n_results=1).ids[0] == I
  (exact match returns the same vector)

PROPERTY: Delete Completeness
FOR ALL documents D:
  AFTER delete_by_document(D.id):
    query(any_embedding, where={"document_id": D.id}).ids == []

PROPERTY: Count Accuracy
FOR ALL operations:
  store.count() == len(all_vectors_in_store)

PROPERTY: Cosine Distance Bounds
FOR ALL query results R:
  FOR ALL distances d in R.distances:
    0.0 <= d <= 2.0
    (cosine distance range)
```

### 4. Status Tracking Properties

```
PROPERTY: Status Progression
FOR ALL tasks T:
  T.status transitions follow:
    pending -> converting -> chunking -> embedding -> complete
    OR pending -> converting -> error
    OR pending -> converting -> chunking -> error
    OR pending -> converting -> chunking -> embedding -> error

PROPERTY: Status-Progress Consistency
FOR ALL tasks T:
  T.status == "complete" => T.progress == "Ready"
  T.status == "error" => T.progress.startswith("Failed:")
  T.status == "pending" => T.progress == "Queued for processing..."

PROPERTY: Timestamp Ordering
FOR ALL tasks T:
  T.created_at <= T.updated_at
```

### 5. API Response Properties

```
PROPERTY: Upload Response Format
FOR ALL successful uploads:
  response.task_id matches UUID4 format
  response.status == "pending"

PROPERTY: Error Response Format
FOR ALL error responses:
  response.error is non-empty string
  response.message is non-empty string
  response.details is null OR dict (only in debug mode)

PROPERTY: Document List Consistency
FOR ALL documents D in list_documents():
  get_document(D.id) returns DocumentDetail
  D.chunk_count == len(get_document(D.id).chunks)

PROPERTY: Delete Cascade
FOR ALL documents D:
  AFTER delete_document(D.id):
    get_document(D.id) raises 404
    vector_store.query(where={"document_id": D.id}) returns empty
    file at D.filename does not exist
```

### 6. File Handling Properties

```
PROPERTY: File Size Validation
FOR ALL uploads with file F:
  len(F) > 10MB => HTTP 413 response
  len(F) <= 10MB => upload proceeds

PROPERTY: File Type Validation
FOR ALL uploads with file F:
  F.extension not in {.pdf, .docx, .txt, .md} => HTTP 415 response
  F.extension in {.pdf, .docx, .txt, .md} => upload proceeds

PROPERTY: File Persistence
FOR ALL successful uploads:
  file exists at ./data/uploads/{task_id}_{original_filename}
  file content == uploaded content
```

### 7. Pipeline Integrity Properties

```
PROPERTY: Document Round-Trip Integrity
FOR ALL documents D processed through the pipeline:
  original_content = read_file(D.file_path)
  processed_chunks = get_chunks(D.id)
  reconstructed = concatenate_chunks_removing_overlap(processed_chunks)
  similarity(original_content, reconstructed) >= 0.95
  (allowing for markdown conversion artifacts and whitespace normalization)

PROPERTY: Embedding Cache Consistency
FOR ALL texts T embedded multiple times:
  embed(T, input_type="document") == embed(T, input_type="document")
  (cache returns identical results for identical inputs)

PROPERTY: Processing Idempotency
FOR ALL documents D:
  process(D) followed by process(D) produces same final state
  (re-processing doesn't create duplicate chunks or embeddings)
```


## Error Handling Strategy

### Exception Hierarchy

```python
# backend/app/core/exceptions.py

class IubarError(Exception):
    """Base exception for all Iubar errors."""
    
    def __init__(self, message: str, user_message: str = None):
        super().__init__(message)
        self.user_message = user_message or "Something went wrong. Please try again."


class ValidationError(IubarError):
    """Input validation errors."""
    pass


class ProcessingError(IubarError):
    """Document processing errors."""
    pass


class EmbeddingError(IubarError):
    """Embedding generation errors."""
    pass


class VectorStoreError(IubarError):
    """Vector store operation errors."""
    pass


class ChunkingError(IubarError):
    """Document chunking errors."""
    pass


class NotFoundError(IubarError):
    """Resource not found errors."""
    pass
```

### Error Mapping Table

| Exception Type | HTTP Status | User Message |
|----------------|-------------|--------------|
| `ValidationError` | 400 | Specific validation message |
| `NotFoundError` | 404 | "Document not found" or "No upload found with this ID" |
| `FileNotFoundError` | 404 | "File not found. It may have been deleted." |
| `PermissionError` | 403 | "Cannot access this file. Please check permissions." |
| `ProcessingError` | 422 | Specific processing message |
| `EmbeddingError` | 503 | "Embedding service temporarily unavailable. Please try again later." |
| `VectorStoreError` | 500 | "Database error. Please try again." |
| `ChunkingError` | 422 | "This document appears to be empty." |
| `httpx.TimeoutException` | 504 | "Request timed out. Please try again." |
| `httpx.ConnectError` | 502 | "Could not connect. Please check your internet connection." |
| `voyageai.error.AuthenticationError` | 500 | "Configuration error. Please contact support." |
| `voyageai.error.RateLimitError` | 503 | "Service is busy. Please try again in a minute." |
| Any unhandled | 500 | "Something went wrong. Please try again." |

### Global Exception Handler

```python
# In main.py

from fastapi import Request
from fastapi.responses import JSONResponse
from app.core.exceptions import IubarError, NotFoundError, ValidationError
import logging

logger = logging.getLogger(__name__)

@app.exception_handler(IubarError)
async def iubar_error_handler(request: Request, exc: IubarError):
    """Handle all Iubar custom exceptions."""
    logger.error(f"IubarError: {exc}", exc_info=True)
    
    status_code = 500
    if isinstance(exc, NotFoundError):
        status_code = 404
    elif isinstance(exc, ValidationError):
        status_code = 400
    
    return JSONResponse(
        status_code=status_code,
        content={
            "error": exc.__class__.__name__,
            "message": exc.user_message,
            "details": {"internal": str(exc)} if settings.debug else None
        }
    )

@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalError",
            "message": "Something went wrong. Please try again.",
            "details": {"type": type(exc).__name__} if settings.debug else None
        }
    )
```

## Testing Strategy

### Test Categories

| Category | Tool | Location | Coverage Target |
|----------|------|----------|-----------------|
| Unit Tests | pytest | `backend/tests/test_*.py` | 90% for services |
| Integration Tests | pytest + TestClient | `backend/tests/test_*_integration.py` | API endpoints |
| Property Tests | hypothesis | `backend/tests/test_*_properties.py` | Correctness properties |
| Component Tests | Vitest + RTL | `frontend/tests/*.test.tsx` | UI components |
| E2E Tests | Playwright | `frontend/tests/*.spec.ts` | Critical user journeys |

### Backend Test Structure

```
backend/tests/
├── conftest.py                    # Shared fixtures
├── test_chunk_service.py          # Unit tests for chunking
├── test_chunk_service_properties.py  # Property-based tests
├── test_document_processor.py     # Unit tests for Docling integration
├── test_embedding_service.py      # Unit tests (mocked Voyage API)
├── test_vector_store.py           # Unit tests for ChromaDB
├── test_task_manager.py           # Unit tests for status tracking
├── test_documents_api.py          # API endpoint tests
└── test_documents_integration.py  # Full pipeline integration tests
```

### Key Test Fixtures

```python
# backend/tests/conftest.py

import pytest
import tempfile
import os
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.main import app
from app.core.database import Base, get_db

@pytest.fixture
def test_client():
    """FastAPI test client."""
    return TestClient(app)

@pytest.fixture
async def test_db():
    """In-memory SQLite database for testing."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSession(engine) as session:
        yield session

@pytest.fixture
def temp_upload_dir():
    """Temporary directory for file uploads."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir

@pytest.fixture
def sample_pdf_path():
    """Path to sample PDF for testing."""
    return "backend/tests/fixtures/sample.pdf"

@pytest.fixture
def sample_markdown():
    """Sample markdown content for chunking tests."""
    return """# Test Document

This is the first paragraph with some content.

This is the second paragraph with more content.

## Section Two

Another paragraph here with different content.
"""

@pytest.fixture
def mock_voyage_client(mocker):
    """Mock Voyage AI client."""
    mock = mocker.patch('voyageai.Client')
    mock.return_value.embed.return_value.embeddings = [
        [0.1] * 512  # 512-dimensional mock embedding
    ]
    return mock

@pytest.fixture
def temp_chroma_dir():
    """Temporary directory for ChromaDB."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir
```

### Property-Based Test Examples

```python
# backend/tests/test_chunk_service_properties.py

from hypothesis import given, strategies as st, settings
from app.services.chunk_service import ChunkService

chunk_service = ChunkService()

@given(st.text(min_size=100, max_size=10000))
@settings(max_examples=50)
def test_chunk_token_bounds(text):
    """All chunks should have token counts within bounds."""
    if not text.strip():
        return  # Skip empty texts
    
    chunks = chunk_service.chunk_document(text)
    
    for i, chunk in enumerate(chunks):
        # Last chunk can be smaller
        if i < len(chunks) - 1:
            assert chunk.token_count >= 100, f"Chunk {i} too small: {chunk.token_count}"
        assert chunk.token_count <= 1024, f"Chunk {i} too large: {chunk.token_count}"

@given(st.text(min_size=100, max_size=10000))
@settings(max_examples=50)
def test_chunk_index_uniqueness(text):
    """All chunk indices should be unique and sequential."""
    if not text.strip():
        return
    
    chunks = chunk_service.chunk_document(text)
    indices = [c.index for c in chunks]
    
    assert indices == list(range(len(chunks))), "Indices not sequential"
    assert len(set(indices)) == len(indices), "Duplicate indices found"

@given(st.text(min_size=100, max_size=10000))
@settings(max_examples=50)
def test_token_count_accuracy(text):
    """Token counts should match actual tiktoken count."""
    if not text.strip():
        return
    
    chunks = chunk_service.chunk_document(text)
    
    for chunk in chunks:
        actual_count = chunk_service.count_tokens(chunk.content)
        assert chunk.token_count == actual_count, \
            f"Token count mismatch: {chunk.token_count} vs {actual_count}"
```

### Frontend Test Examples

```typescript
// frontend/tests/components/UploadZone.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UploadZone } from '../../src/components/upload/UploadZone';
import { vi } from 'vitest';

describe('UploadZone', () => {
  const mockOnUploadStart = vi.fn();
  const mockOnUploadError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload zone with correct text', () => {
    render(
      <UploadZone 
        onUploadStart={mockOnUploadStart} 
        onUploadError={mockOnUploadError} 
      />
    );
    
    expect(screen.getByText(/drop a document here/i)).toBeInTheDocument();
    expect(screen.getByText(/supports pdf, docx, txt, md/i)).toBeInTheDocument();
  });

  it('highlights on drag over', async () => {
    render(
      <UploadZone 
        onUploadStart={mockOnUploadStart} 
        onUploadError={mockOnUploadError} 
      />
    );
    
    const dropZone = screen.getByTestId('upload-zone');
    fireEvent.dragOver(dropZone);
    
    expect(dropZone).toHaveClass('border-blue-500');
  });

  it('rejects files over 10MB', async () => {
    render(
      <UploadZone 
        onUploadStart={mockOnUploadStart} 
        onUploadError={mockOnUploadError} 
      />
    );
    
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', {
      type: 'application/pdf'
    });
    
    const input = screen.getByLabelText(/browse files/i);
    await userEvent.upload(input, largeFile);
    
    expect(mockOnUploadError).toHaveBeenCalledWith(
      expect.stringContaining('10MB')
    );
  });

  it('rejects unsupported file types', async () => {
    render(
      <UploadZone 
        onUploadStart={mockOnUploadStart} 
        onUploadError={mockOnUploadError} 
      />
    );
    
    const exeFile = new File(['content'], 'virus.exe', {
      type: 'application/x-msdownload'
    });
    
    const input = screen.getByLabelText(/browse files/i);
    await userEvent.upload(input, exeFile);
    
    expect(mockOnUploadError).toHaveBeenCalledWith(
      expect.stringContaining('Supported formats')
    );
  });
});
```

### E2E Test Example

```typescript
// frontend/tests/upload.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Document Upload Flow', () => {
  test('uploads PDF and shows processing status', async ({ page }) => {
    await page.goto('/');
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/sample.pdf');
    
    // Check upload started
    await expect(page.getByText(/uploading/i)).toBeVisible();
    
    // Wait for processing
    await expect(page.getByText(/converting/i)).toBeVisible({ timeout: 10000 });
    
    // Wait for completion
    await expect(page.getByText(/ready/i)).toBeVisible({ timeout: 30000 });
    
    // Verify document appears in list
    await expect(page.getByText('sample.pdf')).toBeVisible();
  });

  test('shows error for invalid file type', async ({ page }) => {
    await page.goto('/');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/invalid.exe');
    
    await expect(page.getByText(/supported formats/i)).toBeVisible();
  });
});
```

## Dependencies

### Backend (requirements.txt additions)

```
# Core
fastapi>=0.104.1
uvicorn[standard]>=0.24.0
pydantic>=2.5.0
pydantic-settings>=2.1.0

# Document Processing
docling>=2.30.0

# Vector Store
chromadb>=0.4.0

# AI/ML
voyageai>=0.2.0

# Database
aiosqlite>=0.19.0
sqlalchemy[asyncio]>=2.0.0

# HTTP Client
httpx>=0.24.1
aiofiles>=23.2.1

# Token Counting
tiktoken>=0.5.0

# Utilities
python-multipart>=0.0.6
python-dotenv>=1.0.0

# Testing
pytest>=7.4.3
pytest-asyncio>=0.21.1
hypothesis>=6.92.0
pytest-mock>=3.12.0
```

### Frontend (package.json additions)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.1.0",
    "@testing-library/user-event": "^14.5.0",
    "@playwright/test": "^1.40.0",
    "vitest": "^1.0.0"
  }
}
```

## Summary

This design document provides:

1. **Architecture Overview**: Clear separation of concerns with service layer, data layer, and API layer
2. **Component Interfaces**: Detailed interfaces for all services with type hints and docstrings
3. **Data Models**: Pydantic schemas for API and SQLAlchemy models for persistence
4. **Correctness Properties**: Formal properties for property-based testing
5. **Error Handling**: Comprehensive error mapping with user-friendly messages
6. **Testing Strategy**: Multi-layer testing approach with specific examples

The design enables:
- **Future Migration**: Vector store abstraction allows switching from ChromaDB to Qdrant
- **Testability**: Clear interfaces and dependency injection support testing
- **Maintainability**: Separation of concerns and explicit error handling
- **Scalability**: Async operations and batch processing for performance
