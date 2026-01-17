# Foundation Phase Research Document

## Overview

This document captures research findings for the Phase 1 Foundation implementation of Iubar. It serves as a persistent reference for architectural decisions and integration patterns.

## Session Summary (January 14, 2026)

### What Was Accomplished
1. **Created comprehensive requirements document** at `.kiro/specs/foundation-phase/requirements.md`
2. **Researched all key technologies**: Docling, ChromaDB, Voyage AI, DeepSeek API
3. **Made architectural decisions** with documented rationale
4. **Requirements approved** - ready for design phase

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Document Processing | Docling | MIT license, local execution, PDF/DOCX/HTML support, Markdown output |
| Vector Store | ChromaDB with abstraction layer | Zero infrastructure, <100K vectors sufficient, migration path to Qdrant |
| Embeddings | Voyage AI `voyage-3.5-lite` | 512 dims, $0.02/M tokens, 80.3% nDCG@10 |
| LLM | DeepSeek V3.2-Exp | OpenAI-compatible, $0.28/M input, automatic caching |
| Chunking | 512-1024 tokens, 15% overlap | Research-backed optimal for RAG |
| Database | SQLite with aiosqlite | Simple, async, sufficient for MVP |

### Requirements Summary (14 Requirements)
1. **Document Upload** - PDF, DOCX, TXT, MD via drag-drop/picker, 10MB limit
2. **URL Ingestion** - HTTP/HTTPS URLs, Docling HTML parsing
3. **Document Processing** - Docling conversion, background tasks
4. **Chunking** - 512-1024 tokens, 15% overlap, tiktoken counting
5. **Embedding Generation** - Voyage 3.5-lite, batch processing, retry logic
6. **Vector Storage** - ChromaDB with abstraction interface for future migration
7. **Status Tracking** - In-memory task manager with polling
8. **Document CRUD** - List, get, delete with cascade
9. **Database Schema** - documents + chunks tables with foreign keys
10. **Frontend Upload** - React drag-drop zone, progress polling
11. **Configuration** - pydantic-settings, explicit env vars with defaults
12. **Error Handling** - User-friendly messages, internal logging
13. **Health Endpoints** - /health (fast) and /api/status (detailed)
14. **CORS** - Configurable origins for development

### Next Steps
1. ~~**Create design.md** - Architecture, components, interfaces, data models~~ ✅ COMPLETE
2. **Create tasks.md** - Implementation checklist
3. **Execute tasks** - Build the foundation

### Files Created/Modified
- `.kiro/specs/foundation-phase/requirements.md` - Complete requirements (14 requirements)
- `.kiro/specs/foundation-phase/design.md` - Complete design document
- `.kiro/documentation/project-docs/foundation-research.md` - This file (research context)

## Technology Stack Summary

### 1. Document Processing: Docling

**Package**: `docling` (MIT License, by IBM Research)
**Version**: 2.30.0 (latest as of Jan 2026)
**Installation**: `pip install docling`

**Key Features**:
- Converts PDF, DOCX, PPTX, XLSX, HTML, images to Markdown/JSON
- Advanced PDF understanding: page layout, reading order, table structure
- OCR support for scanned documents
- Runs locally on commodity hardware
- Native integrations with LlamaIndex and LangChain

**Basic Usage Pattern**:
```python
from docling.document_converter import DocumentConverter

converter = DocumentConverter()
result = converter.convert("document.pdf")
markdown_content = result.document.export_to_markdown()
```

**Architecture Considerations**:
- CPU-intensive operation (uses AI models for layout analysis)
- Should run in background task, not blocking API
- First conversion downloads models (~1GB)
- Supports batch conversion for multiple documents

### 2. Vector Store: ChromaDB

**Package**: `chromadb`
**Installation**: `pip install chromadb`

**Key Features**:
- Embedded vector database (no external dependencies)
- Persistent storage to disk
- Custom embedding functions supported
- Metadata filtering on queries

**Basic Usage Pattern**:
```python
import chromadb

# Persistent client for production
client = chromadb.PersistentClient(path="./data/chroma")

# Create/get collection with custom embedding function
collection = client.get_or_create_collection(
    name="documents",
    embedding_function=voyage_embedding_function,
    metadata={"hnsw:space": "cosine"}
)

# Add documents with metadata
collection.add(
    documents=["chunk1", "chunk2"],
    metadatas=[{"doc_id": "1", "chunk_idx": 0}, {"doc_id": "1", "chunk_idx": 1}],
    ids=["doc1_chunk0", "doc1_chunk1"]
)

# Query with filters
results = collection.query(
    query_texts=["search query"],
    n_results=5,
    where={"doc_id": "1"}  # Optional metadata filter
)
```

**Architecture Considerations**:
- Use PersistentClient for data durability
- Custom embedding function for Voyage AI integration
- Metadata enables filtering by document, chunk position, etc.
- Collection per document type or single collection with metadata

### 3. Embeddings: Voyage AI

**Package**: `voyageai`
**Installation**: `pip install voyageai`
**Model**: `voyage-3.5-lite` ($0.02/M tokens, 512 dimensions, 80.3% nDCG@10)

**Key Features**:
- High quality embeddings (80.3% nDCG@10)
- 512 dimensions (storage efficient)
- Batch embedding support
- Separate embed for documents vs queries

**Basic Usage Pattern**:
```python
import voyageai

vo = voyageai.Client(api_key="your-api-key")

# Embed documents (for storage)
doc_embeddings = vo.embed(
    texts=["document chunk 1", "document chunk 2"],
    model="voyage-3.5-lite",
    input_type="document"
)

# Embed query (for search)
query_embedding = vo.embed(
    texts=["user question"],
    model="voyage-3.5-lite", 
    input_type="query"
)

# Access embeddings
vectors = doc_embeddings.embeddings  # List of 512-dim vectors
```

**Architecture Considerations**:
- Use `input_type="document"` for indexing, `input_type="query"` for search
- Batch documents for efficiency (API has token limits)
- Cache embeddings - compute once per document chunk
- Rate limiting and error handling needed

### 4. LLM: DeepSeek V3.2-Exp

**API**: OpenAI-compatible format
**Base URL**: `https://api.deepseek.com`
**Model**: `deepseek-chat` (V3.2 non-thinking mode)

**Pricing**:
- Input: $0.28/M tokens (cached: $0.028/M - 90% cheaper)
- Output: $0.42/M tokens
- Context: 128K tokens

**Basic Usage Pattern**:
```python
from openai import OpenAI

client = OpenAI(
    api_key="your-deepseek-api-key",
    base_url="https://api.deepseek.com"
)

# Non-streaming
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello!"}
    ],
    stream=False
)

# Streaming
stream = client.chat.completions.create(
    model="deepseek-chat",
    messages=[...],
    stream=True
)
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

**Architecture Considerations**:
- Use OpenAI SDK with custom base_url
- Streaming for better UX in chat
- Automatic context caching reduces costs for repeated queries
- Track token usage for cost display

### 5. FastAPI Background Tasks

**Pattern**: Background Job + Polling for document processing

**Key Considerations**:
- Document processing is CPU-intensive (Docling uses AI models)
- File uploads closed before background task runs (need to save first)
- Return task ID immediately, poll for status

**Implementation Pattern**:
```python
from fastapi import FastAPI, BackgroundTasks, UploadFile
from uuid import uuid4
import asyncio

app = FastAPI()
task_status = {}  # In production: use Redis or database

@app.post("/documents/upload")
async def upload_document(
    file: UploadFile,
    background_tasks: BackgroundTasks
):
    task_id = str(uuid4())
    
    # Save file first (before background task)
    file_path = f"./data/uploads/{task_id}_{file.filename}"
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Queue background processing
    task_status[task_id] = {"status": "processing", "progress": 0}
    background_tasks.add_task(process_document, task_id, file_path)
    
    return {"task_id": task_id, "status": "processing"}

@app.get("/documents/status/{task_id}")
async def get_status(task_id: str):
    return task_status.get(task_id, {"status": "not_found"})

async def process_document(task_id: str, file_path: str):
    try:
        task_status[task_id]["status"] = "converting"
        # Docling conversion...
        task_status[task_id]["status"] = "embedding"
        # Voyage embedding...
        task_status[task_id]["status"] = "complete"
    except Exception as e:
        task_status[task_id] = {"status": "error", "error": str(e)}
```

## Database Schema Design

### SQLite Tables (Structured Data)

```sql
-- Documents metadata
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,  -- pdf, docx, txt, md, url, github
    file_size INTEGER,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_status TEXT DEFAULT 'pending',  -- pending, processing, complete, error
    markdown_content TEXT,  -- Converted markdown
    metadata JSON,  -- Title, authors, etc. extracted by Docling
    error_message TEXT
);

-- Document chunks for RAG
CREATE TABLE chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id),
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    metadata JSON,  -- Section, page number, etc.
    UNIQUE(document_id, chunk_index)
);

-- User sessions (MVP: single user, no auth)
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    profile JSON,  -- User preferences, inferred context
    active_document_id TEXT REFERENCES documents(id)
);

-- Chat history
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    role TEXT NOT NULL,  -- user, assistant
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON  -- Sources, token usage, cost
);
```

## Chunking Strategy

**Research-Backed Optimal Settings**:
- **Token-based chunking**: 512-1024 tokens (industry best practice)
- **Overlap**: 10-20% (50-100 tokens) for context continuity
- **Page-level chunking**: Highest average accuracy (0.648) across datasets

**Approach**:
1. Use Docling's document structure (sections, paragraphs, pages)
2. Token-based counting (aligns with embedding model limits)
3. Respect semantic boundaries (don't split mid-sentence)
4. Add 15% overlap (~75-150 tokens) for context continuity
5. Store rich chunk metadata (section, page, position, heading hierarchy)

**Semantic Chunking Consideration**:
- Breaks text at natural topic boundaries using embedding similarity
- More expensive during preprocessing but improves retrieval precision
- Consider for Phase 2 optimization

```python
import tiktoken

def count_tokens(text: str, model: str = "cl100k_base") -> int:
    """Count tokens using tiktoken (OpenAI's tokenizer)."""
    encoding = tiktoken.get_encoding(model)
    return len(encoding.encode(text))

def chunk_document(
    markdown: str, 
    max_tokens: int = 800,  # Target 512-1024, use 800 as sweet spot
    overlap_ratio: float = 0.15  # 15% overlap
) -> list[dict]:
    """
    Chunk markdown document respecting structure.
    Uses paragraph boundaries when possible.
    Returns chunks with metadata.
    """
    chunks = []
    overlap_tokens = int(max_tokens * overlap_ratio)
    
    # Split by double newlines (paragraphs)
    paragraphs = markdown.split('\n\n')
    
    current_chunk = []
    current_tokens = 0
    chunk_index = 0
    
    for para in paragraphs:
        para_tokens = count_tokens(para)
        
        # Handle paragraphs larger than max_tokens
        if para_tokens > max_tokens:
            # Save current chunk if exists
            if current_chunk:
                chunk_text = '\n\n'.join(current_chunk)
                chunks.append({
                    "index": chunk_index,
                    "content": chunk_text,
                    "token_count": count_tokens(chunk_text)
                })
                chunk_index += 1
                current_chunk = []
                current_tokens = 0
            
            # Split large paragraph by sentences
            sentences = para.replace('. ', '.\n').split('\n')
            for sentence in sentences:
                sent_tokens = count_tokens(sentence)
                if current_tokens + sent_tokens > max_tokens and current_chunk:
                    chunk_text = ' '.join(current_chunk)
                    chunks.append({
                        "index": chunk_index,
                        "content": chunk_text,
                        "token_count": count_tokens(chunk_text)
                    })
                    chunk_index += 1
                    # Keep overlap
                    current_chunk = current_chunk[-2:] if len(current_chunk) > 2 else []
                    current_tokens = sum(count_tokens(s) for s in current_chunk)
                current_chunk.append(sentence)
                current_tokens += sent_tokens
            continue
        
        if current_tokens + para_tokens > max_tokens and current_chunk:
            # Save current chunk
            chunk_text = '\n\n'.join(current_chunk)
            chunks.append({
                "index": chunk_index,
                "content": chunk_text,
                "token_count": count_tokens(chunk_text)
            })
            chunk_index += 1
            
            # Keep overlap (last paragraph(s) up to overlap_tokens)
            overlap_chunk = []
            overlap_count = 0
            for p in reversed(current_chunk):
                p_tokens = count_tokens(p)
                if overlap_count + p_tokens <= overlap_tokens:
                    overlap_chunk.insert(0, p)
                    overlap_count += p_tokens
                else:
                    break
            current_chunk = overlap_chunk
            current_tokens = overlap_count
        
        current_chunk.append(para)
        current_tokens += para_tokens
    
    # Don't forget the last chunk
    if current_chunk:
        chunk_text = '\n\n'.join(current_chunk)
        chunks.append({
            "index": chunk_index,
            "content": chunk_text,
            "token_count": count_tokens(chunk_text)
        })
    
    return chunks
```

## Vector Quantization Strategy (Future Optimization)

**Research Findings for Memory Efficiency**:

| Technique | Storage Reduction | Performance Retention |
|-----------|-------------------|----------------------|
| Binary Quantization | 32x | ~96% |
| INT8 Scalar Quantization | 4x | ~99.3% |
| Matryoshka (256 dims) | 4-6x | ~98% |
| Matryoshka + Binary | 256x | ~85% |

**MVP Approach**: Standard float32 embeddings (simplicity first)
**Phase 2**: Consider INT8 quantization if storage becomes concern
**Phase 3**: Matryoshka embeddings for flexible dimension selection

**Memory Calculation (1M documents, 512-dim Voyage embeddings)**:
- Float32: ~2GB
- INT8: ~500MB
- Binary: ~64MB

For MVP with <1000 documents, standard float32 is fine (~2MB).

## URL Ingestion via Docling

**Key Insight**: Docling natively supports HTML parsing, so we can:
1. Fetch URL content (using httpx)
2. Pass HTML directly to Docling for conversion
3. Get structured Markdown output

```python
import httpx
from docling.document_converter import DocumentConverter
from docling.datamodel.base_models import InputFormat

async def ingest_url(url: str) -> str:
    """Fetch URL and convert to Markdown using Docling."""
    async with httpx.AsyncClient() as client:
        response = await client.get(url, follow_redirects=True)
        response.raise_for_status()
        html_content = response.text
    
    # Save to temp file for Docling
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".html", delete=False) as f:
        f.write(html_content.encode())
        temp_path = f.name
    
    converter = DocumentConverter()
    result = converter.convert(temp_path)
    
    # Cleanup
    import os
    os.unlink(temp_path)
    
    return result.document.export_to_markdown()
```

## API Endpoints Design (Phase 1)

### Document Management
- `POST /api/documents/upload` - Upload file, returns task_id
- `POST /api/documents/url` - Ingest from URL
- `GET /api/documents/status/{task_id}` - Processing status
- `GET /api/documents` - List all documents
- `GET /api/documents/{id}` - Get document details + markdown
- `DELETE /api/documents/{id}` - Remove document

### Health & Status
- `GET /health` - Health check
- `GET /api/status` - System status (Chroma, API keys configured)

## Error Handling Strategy

**User-Facing Errors** (simple, no jargon):
- "We couldn't process this file. Please try a different format - [accepted formats]."
- "Something went wrong. Please try again."
- "This file is too large. Maximum size is 10MB."

**Internal Logging** (detailed for debugging):
- Full stack traces
- Request/response details
- Processing timestamps

## Cost Tracking

Track per-request:
- Embedding tokens (Voyage)
- LLM input/output tokens (DeepSeek)
- Estimated cost

Store in message metadata for display.

## Dependencies Summary

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
openai>=1.0.0  # For DeepSeek (OpenAI-compatible)

# Database
aiosqlite>=0.19.0  # Async SQLite

# Utilities
python-multipart>=0.0.6  # File uploads
python-dotenv>=1.0.0
httpx>=0.24.1  # Async HTTP client
tiktoken>=0.5.0  # Token counting

# Testing
pytest>=7.4.3
pytest-asyncio>=0.21.1
```

---

*Last Updated: January 14, 2026*
*Status: Research Complete - Ready for Spec Creation*
