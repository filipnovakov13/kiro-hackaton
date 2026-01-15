# Requirements Document

## Introduction

This document defines the requirements for Phase 1 (Foundation) of the Iubar project - an AI-enhanced personal knowledge management and structured learning web application. Phase 1 establishes the document ingestion pipeline, vector storage infrastructure, and basic UI shell that all subsequent features will build upon.

The foundation phase focuses on:
1. Document upload and processing (PDF, DOCX, TXT, MD, HTML/URL)
2. Vector storage with ChromaDB
3. Embedding generation with Voyage AI (voyage-3.5-lite model)
4. Basic FastAPI backend structure with async support
5. React frontend shell with upload capability

## Glossary

- **Document_Processor**: The backend service (`backend/app/services/document_processor.py`) responsible for converting uploaded files to Markdown using Docling library
- **Chunk_Service**: The backend service (`backend/app/services/chunk_service.py`) responsible for splitting Markdown documents into token-sized chunks with 15% overlap
- **Embedding_Service**: The backend service (`backend/app/services/embedding_service.py`) responsible for generating 512-dimensional vector embeddings via Voyage AI API using the `voyage-3.5-lite` model
- **Vector_Store**: The ChromaDB-based storage system (`backend/app/services/vector_store.py`) for document embeddings, persisted to `./data/chroma/`
- **Upload_Handler**: The FastAPI router (`backend/app/api/documents.py`) handling file uploads and URL ingestion requests
- **Task_Manager**: The in-memory task tracking system (`backend/app/services/task_manager.py`) for background processing jobs
- **Document_Repository**: The SQLAlchemy-based data access layer (`backend/app/models/document.py`) for document metadata in SQLite at `./data/iubar.db`
- **Chunk**: A segment of document text between 512-1024 tokens with metadata including document_id, chunk_index, and token_count
- **Processing_Status**: Enum with values: `pending`, `converting`, `chunking`, `embedding`, `complete`, `error`
- **Token**: A unit of text as counted by the `tiktoken` library using the `cl100k_base` encoding (same as OpenAI models)

## Requirements

### Requirement 1: Document Upload

**User Story:** As a user, I want to upload documents (PDF, DOCX, TXT, MD) via drag-and-drop or file picker, so that I can add my study materials to the knowledge base.

#### Acceptance Criteria

1. WHEN a user drops a file onto the upload zone, THE Upload_Handler SHALL accept the file and return a JSON response containing `task_id` (UUID string) and `status: "pending"` within 500ms
2. WHEN a user selects a file via the file picker button, THE Upload_Handler SHALL accept the file and return a JSON response containing `task_id` (UUID string) and `status: "pending"` within 500ms
3. THE Upload_Handler SHALL accept files with the following MIME types and extensions:
   - `application/pdf` (.pdf)
   - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
   - `text/plain` (.txt)
   - `text/markdown` (.md)
4. THE Upload_Handler SHALL reject files larger than 10,485,760 bytes (10MB) with HTTP 413 status and JSON response: `{"error": "File too large", "message": "Maximum file size is 10MB", "max_size_bytes": 10485760}`
5. THE Upload_Handler SHALL reject files with unsupported extensions with HTTP 415 status and JSON response: `{"error": "Unsupported file type", "message": "Supported formats: PDF, DOCX, TXT, MD", "supported_extensions": [".pdf", ".docx", ".txt", ".md"]}`
6. WHEN a file is accepted, THE Upload_Handler SHALL save the file to `./data/uploads/{task_id}_{original_filename}` before returning the response
7. WHEN a file is accepted, THE Upload_Handler SHALL create a document record in the Document_Repository with:
   - `id`: the task_id (UUID string)
   - `filename`: `{task_id}_{original_filename}`
   - `original_name`: the user's original filename
   - `file_type`: one of `pdf`, `docx`, `txt`, `md`
   - `file_size`: size in bytes
   - `upload_time`: current UTC timestamp
   - `processing_status`: `pending`

### Requirement 2: URL Ingestion

**User Story:** As a user, I want to paste a URL to ingest web content, so that I can add online articles and documentation to my knowledge base.

#### Acceptance Criteria

1. WHEN a user submits a URL via POST to `/api/documents/url` with JSON body `{"url": "https://example.com/article"}`, THE Upload_Handler SHALL return a JSON response containing `task_id` (UUID string) and `status: "pending"` within 500ms
2. THE Upload_Handler SHALL validate that the URL:
   - Starts with `http://` or `https://`
   - Contains a valid domain name
   - Does not exceed 2048 characters in length
3. THE Upload_Handler SHALL reject invalid URLs with HTTP 400 status and JSON response: `{"error": "Invalid URL", "message": "Please provide a valid HTTP or HTTPS URL"}`
4. WHEN a URL is accepted, THE Upload_Handler SHALL create a document record with:
   - `id`: the task_id (UUID string)
   - `filename`: `{task_id}_url_content.html`
   - `original_name`: the URL (truncated to 255 characters if longer)
   - `file_type`: `url`
   - `file_size`: NULL (unknown until fetched)
   - `processing_status`: `pending`
5. IF the URL fetch fails with connection timeout (>30 seconds), THEN THE Document_Processor SHALL update the document status to `error` with error_message: `"Could not reach the website. Please check the URL and try again."`
6. IF the URL fetch fails with HTTP 404, THEN THE Document_Processor SHALL update the document status to `error` with error_message: `"Page not found. Please check the URL."`
7. IF the URL fetch fails with HTTP 403/401, THEN THE Document_Processor SHALL update the document status to `error` with error_message: `"Access denied. This page may require login."`
8. IF the URL fetch fails with any other HTTP error, THEN THE Document_Processor SHALL update the document status to `error` with error_message: `"Could not load the page. Please try again later. + [HTTP error]"`

### Requirement 3: Document Processing Pipeline

**User Story:** As a user, I want my uploaded documents to be automatically processed into searchable chunks, so that I can later query them with AI.

#### Acceptance Criteria

1. WHEN a document has status `pending`, THE Document_Processor SHALL convert it to Markdown using the Docling library within a FastAPI BackgroundTask
2. WHEN processing a PDF file, THE Document_Processor SHALL:
   - Use `docling.document_converter.DocumentConverter` to convert the file
   - Call `result.document.export_to_markdown()` to get Markdown output
   - Extract title from Docling metadata if available
3. WHEN processing a DOCX file, THE Document_Processor SHALL:
   - Use `docling.document_converter.DocumentConverter` to convert the file
   - Call `result.document.export_to_markdown()` to get Markdown output
   - Extract title from Docling metadata if available
4. WHEN processing a URL, THE Document_Processor SHALL:
   - Fetch HTML content using `httpx.AsyncClient` with 30-second timeout
   - Save HTML to temporary file
   - Use Docling's HTML parser to convert to Markdown
   - Delete temporary file only if the conversion is successful, otherwise make the temporary file permanent
5. WHEN processing a TXT file, THE Document_Processor SHALL read the file content directly as UTF-8 text without Docling conversion
6. WHEN processing an MD file, THE Document_Processor SHALL read the file content directly as UTF-8 text without Docling conversion
7. WHEN processing an HTML file (uploaded directly), THE Document_Processor SHALL use Docling's HTML parser to convert to Markdown
8. WHEN conversion completes successfully, THE Document_Processor SHALL update the document record with:
   - `markdown_content`: the converted Markdown string
   - `processing_status`: `chunking`
   - `metadata`: JSON object containing `{"title": "extracted_title", "detected_language": "en"}`
9. IF conversion fails due to corrupted file, THEN THE Document_Processor SHALL update the document with status `error` and error_message: `"Could not read this file. It may be corrupted or password-protected."`
10. IF conversion fails due to unsupported content, THEN THE Document_Processor SHALL update the document with status `error` and error_message: `"Could not process this file format."`

### Requirement 4: Document Chunking

**User Story:** As a system, I need documents split into appropriately-sized chunks, so that embeddings capture semantic meaning effectively.

#### Acceptance Criteria

1. WHEN a document's `processing_status` is `chunking`, THE Chunk_Service SHALL split the `markdown_content` into chunks
2. THE Chunk_Service SHALL target chunk sizes between 512 and 1024 tokens, with 800 tokens as the preferred maximum
3. THE Chunk_Service SHALL use 15% overlap between consecutive chunks (approximately 120 tokens for an 800-token chunk)
4. THE Chunk_Service SHALL count tokens using the `tiktoken` library with `cl100k_base` encoding
5. THE Chunk_Service SHALL split at paragraph boundaries (double newline `\n\n`) when possible
6. WHEN a paragraph exceeds 1024 tokens, THE Chunk_Service SHALL split at sentence boundaries (`. ` followed by capital letter or newline)
7. FOR ALL chunks created, THE Chunk_Service SHALL insert a record into the `chunks` table with:
   - `id`: UUID string
   - `document_id`: parent document's id
   - `chunk_index`: 0-based sequential index
   - `content`: the chunk text
   - `token_count`: integer count of tokens
   - `metadata`: JSON object `{"start_char": N, "end_char": M}` indicating position in original markdown
8. WHEN all chunks are created, THE Chunk_Service SHALL update the document's `processing_status` to `embedding`
9. IF chunking produces zero chunks (empty document), THEN THE Chunk_Service SHALL update the document with status `error` and error_message: `"This document appears to be empty."`

### Requirement 5: Embedding Generation

**User Story:** As a system, I need vector embeddings for each chunk, so that semantic search can find relevant content.

#### Acceptance Criteria

1. WHEN a document's `processing_status` is `embedding`, THE Embedding_Service SHALL generate embeddings for all its chunks
2. THE Embedding_Service SHALL use the Voyage AI API with model `voyage-3.5-lite` (512 dimensions, $0.02/M tokens)
3. THE Embedding_Service SHALL call `voyageai.Client(api_key=VOYAGE_API_KEY).embed()` with:
   - `texts`: list of chunk content strings
   - `model`: `"voyage-3.5-lite"`
   - `input_type`: `"document"`
4. THE Embedding_Service SHALL batch chunks in groups of up to 128 texts per API call (Voyage API limit)
5. FOR ALL chunks embedded, THE Embedding_Service SHALL call `Vector_Store.add()` with:
   - `ids`: list of chunk_id strings
   - `embeddings`: list of 512-dimensional float vectors
   - `metadatas`: list of `{"document_id": "...", "chunk_index": N}` objects
   - `documents`: list of chunk content strings
6. IF the Voyage API returns HTTP 429 (rate limit), THEN THE Embedding_Service SHALL wait 60 seconds and retry up to 3 times
7. IF the Voyage API returns HTTP 401 (unauthorized), THEN THE Embedding_Service SHALL update the document with status `error` and error_message: `"Configuration error. Please contact support."`
8. IF the Voyage API fails after 3 retries, THEN THE Embedding_Service SHALL update the document with status `error` and error_message: `"Embedding service temporarily unavailable. Please try again later."`
9. WHEN all chunks are successfully embedded, THE Embedding_Service SHALL update the document's `processing_status` to `complete`

### Requirement 6: Vector Storage

**User Story:** As a system, I need persistent vector storage, so that embeddings survive application restarts.

#### Acceptance Criteria

1. THE Vector_Store SHALL be implemented as an abstract interface (`VectorStoreInterface`) with concrete ChromaDB implementation (`ChromaVectorStore`)
2. THE `VectorStoreInterface` SHALL define the following methods:
   - `add(ids: List[str], embeddings: List[List[float]], metadatas: List[dict], documents: List[str]) -> None`
   - `query(embedding: List[float], n_results: int, where: Optional[dict]) -> QueryResult`
   - `delete_by_document(document_id: str) -> None`
   - `count() -> int`
   - `health_check() -> bool`
3. THE `ChromaVectorStore` SHALL initialize ChromaDB using `chromadb.PersistentClient(path="./data/chroma")`
4. THE `ChromaVectorStore` SHALL create or get a collection named `"iubar_documents"` with:
   - `metadata`: `{"hnsw:space": "cosine"}`
5. THE `ChromaVectorStore` SHALL NOT use ChromaDB's default embedding function (we provide pre-computed 512-dimensional Voyage embeddings)
6. WHEN `add()` is called, THE `ChromaVectorStore` SHALL call `collection.add()` with the provided ids, embeddings, metadatas, and documents
7. WHEN `query()` is called with a query embedding, THE `ChromaVectorStore` SHALL call `collection.query()` and return a `QueryResult` dataclass containing:
   - `ids: List[str]` - chunk IDs sorted by similarity (highest first)
   - `distances: List[float]` - cosine distances (lower = more similar)
   - `documents: List[str]` - chunk content
   - `metadatas: List[dict]` - chunk metadata
8. THE `ChromaVectorStore` SHALL support filtering by `document_id` in the `where` parameter: `{"document_id": "specific-uuid"}`
9. WHEN `delete_by_document()` is called with a document_id, THE `ChromaVectorStore` SHALL call `collection.delete(where={"document_id": document_id})` to remove all chunks for that document
10. THE `ChromaVectorStore` SHALL handle ChromaDB exceptions and raise a custom `VectorStoreError` with user-friendly message
11. THE abstraction layer SHALL enable future migration to Qdrant or other vector stores without changing service layer code

**Design Note**: ChromaDB is chosen for MVP due to:
- Zero infrastructure (embedded mode)
- Optimal for <100K vectors (our expected scale)
- Simple API, fast development
- Free (no infrastructure cost)

Future consideration: Qdrant offers quantization support (INT8/binary) for 4-32x storage reduction if scale requires it. The abstraction layer enables this migration.

### Requirement 7: Processing Status Tracking

**User Story:** As a user, I want to see the processing status of my uploads, so that I know when my documents are ready to query.

#### Acceptance Criteria

1. THE Task_Manager SHALL maintain an in-memory dictionary mapping `task_id` to status objects
2. THE status object SHALL contain:
   - `status`: one of `pending`, `converting`, `chunking`, `embedding`, `complete`, `error`
   - `progress`: string describing current step (e.g., `"Converting PDF to text..."`, `"Embedding chunk 5 of 12..."`)
   - `document_id`: the document UUID
   - `error`: error message string if status is `error`, otherwise NULL
   - `created_at`: ISO 8601 timestamp
   - `updated_at`: ISO 8601 timestamp
3. THE Upload_Handler SHALL expose `GET /api/documents/status/{task_id}` returning the status object as JSON
4. IF the task_id does not exist, THE Upload_Handler SHALL return HTTP 404 with: `{"error": "Not found", "message": "No upload found with this ID"}`
5. WHEN a document's processing_status changes, THE Task_Manager SHALL update both the in-memory status and the database record
6. THE Task_Manager SHALL update `progress` at each stage:
   - `pending`: `"Queued for processing..."`
   - `converting`: `"Converting document to text..."`
   - `chunking`: `"Splitting into searchable sections..."`
   - `embedding`: `"Generating embeddings... (chunk X of Y)"`
   - `complete`: `"Ready"`
   - `error`: `"Failed: {error_message}"`

### Requirement 8: Document Listing and Retrieval

**User Story:** As a user, I want to see all my uploaded documents and their status, so that I can manage my knowledge base.

#### Acceptance Criteria

1. THE Upload_Handler SHALL expose `GET /api/documents` returning a JSON array of document summaries:
   ```json
   [
     {
       "id": "uuid-string",
       "original_name": "filename.pdf",
       "file_type": "pdf",
       "file_size": 1234567,
       "upload_time": "2026-01-14T10:30:00Z",
       "processing_status": "complete",
       "chunk_count": 15
     }
   ]
   ```
2. THE Upload_Handler SHALL expose `GET /api/documents/{id}` returning full document details:
   ```json
   {
     "id": "uuid-string",
     "original_name": "filename.pdf",
     "file_type": "pdf",
     "file_size": 1234567,
     "upload_time": "2026-01-14T10:30:00Z",
     "processing_status": "complete",
     "markdown_content": "# Document Title\n\nContent...",
     "metadata": {"title": "Document Title", "detected_language": "en"},
     "chunk_count": 15
   }
   ```
3. IF the document id does not exist, THE Upload_Handler SHALL return HTTP 404 with: `{"error": "Not found", "message": "Document not found"}`
4. THE Upload_Handler SHALL expose `DELETE /api/documents/{id}` which:
   - Removes the document record from SQLite
   - Removes all chunk records for that document from SQLite
   - Calls `Vector_Store.delete_document(id)` to remove embeddings
   - Deletes the uploaded file from `./data/uploads/`
   - Returns HTTP 204 No Content on success
5. IF deletion fails, THE Upload_Handler SHALL return HTTP 500 with: `{"error": "Deletion failed", "message": "Could not delete document. Please try again."}`

### Requirement 9: Database Schema

**User Story:** As a system, I need a structured database schema, so that document metadata and chunks are stored reliably.

#### Acceptance Criteria

1. THE Document_Repository SHALL use SQLite database at path `./data/iubar.db`
2. THE Document_Repository SHALL create the `documents` table with columns:
   | Column | Type | Constraints | Default |
   |--------|------|-------------|---------|
   | id | TEXT | PRIMARY KEY | - |
   | filename | TEXT | NOT NULL | - |
   | original_name | TEXT | NOT NULL | - |
   | file_type | TEXT | NOT NULL, CHECK(file_type IN ('pdf','docx','txt','md','url','html')) | - |
   | file_size | INTEGER | - | NULL |
   | upload_time | TEXT | NOT NULL | CURRENT_TIMESTAMP |
   | processing_status | TEXT | NOT NULL, CHECK(processing_status IN ('pending','converting','chunking','embedding','complete','error')) | 'pending' |
   | markdown_content | TEXT | - | NULL |
   | metadata | TEXT | - | NULL (JSON string) |
   | error_message | TEXT | - | NULL |
3. THE Document_Repository SHALL create the `chunks` table with columns:
   | Column | Type | Constraints | Default |
   |--------|------|-------------|---------|
   | id | TEXT | PRIMARY KEY | - |
   | document_id | TEXT | NOT NULL, FOREIGN KEY REFERENCES documents(id) ON DELETE CASCADE | - |
   | chunk_index | INTEGER | NOT NULL | - |
   | content | TEXT | NOT NULL | - |
   | token_count | INTEGER | NOT NULL | - |
   | metadata | TEXT | - | NULL (JSON string) |
   | UNIQUE(document_id, chunk_index) | - | - | - |
4. THE Document_Repository SHALL enable foreign key enforcement with `PRAGMA foreign_keys = ON`
5. THE Document_Repository SHALL use UUID4 strings (36 characters with hyphens) for all id columns
6. WHEN the application starts, THE Document_Repository SHALL execute `CREATE TABLE IF NOT EXISTS` statements to ensure tables exist
7. THE Document_Repository SHALL use `aiosqlite` for async database operations

### Requirement 10: Frontend Upload Interface

**User Story:** As a user, I want a clean, intuitive upload interface, so that adding documents feels effortless.

#### Acceptance Criteria

1. THE Frontend SHALL display a centered upload zone on the welcome screen with:
   - Dashed border (2px, gray-300)
   - Minimum height of 200px
   - Text: "Drop a document here, or click to browse"
   - Subtext: "Supports PDF, DOCX, TXT, MD (max 10MB)"
2. THE Frontend SHALL display a file picker button labeled "Browse Files" that opens the system file dialog
3. THE Frontend SHALL display a URL input field with:
   - Placeholder text: "Or paste a URL..."
   - Submit button labeled "Add URL"
4. WHEN a file is dragged over the upload zone, THE Frontend SHALL change the border color to blue-500 and background to blue-50
5. WHEN a file is dropped or selected, THE Frontend SHALL immediately display:
   - File name
   - File size (formatted as KB or MB)
   - A spinner/loading indicator
6. WHEN upload begins, THE Frontend SHALL:
   - POST the file to `/api/documents/upload` as multipart/form-data
   - Store the returned `task_id`
   - Begin polling `GET /api/documents/status/{task_id}` every 2 seconds
7. WHILE processing, THE Frontend SHALL display the `progress` message from the status response
8. WHEN status becomes `complete`, THE Frontend SHALL:
   - Stop polling
   - Display a green checkmark icon
   - Show message: "Document ready!"
9. IF status becomes `error`, THEN THE Frontend SHALL:
   - Stop polling
   - Display a red X icon
   - Show the error message from the response
10. THE Frontend SHALL use React 18 with TypeScript and TailwindCSS for styling

### Requirement 11: Configuration Management

**User Story:** As a developer, I want configuration managed via environment variables, so that API keys and settings are secure and flexible.

#### Acceptance Criteria

1. THE Application SHALL load configuration using `pydantic-settings` BaseSettings class from environment variables and `.env` file (in that priority order)
2. THE Application SHALL require the following environment variables (no defaults, must be set):
   | Variable | Description | Example |
   |----------|-------------|---------|
   | VOYAGE_API_KEY | Voyage AI API key for embeddings | `pa-xxxxxxxxxxxx` |
   | DEEPSEEK_API_KEY | DeepSeek API key for LLM (Phase 2) | `sk-xxxxxxxxxxxx` |
3. THE Application SHALL use the following environment variables with defaults:
   | Variable | Description | Default |
   |----------|-------------|---------|
   | HOST | Server bind address | `0.0.0.0` |
   | PORT | Server port | `8000` |
   | DEBUG | Enable debug mode | `true` |
   | DATABASE_URL | SQLite database path | `sqlite:///./data/iubar.db` |
   | CHROMA_PATH | ChromaDB persistence path | `./data/chroma` |
   | UPLOAD_PATH | File upload directory | `./data/uploads` |
   | MAX_FILE_SIZE_MB | Maximum upload size in MB | `10` |
   | LOG_LEVEL | Logging level | `INFO` |
   | CORS_ORIGINS | Comma-separated allowed origins | `http://localhost:3000,http://localhost:5173,http://localhost:5174` |
4. IF VOYAGE_API_KEY is not set, THEN THE Application SHALL raise `ValueError` at startup with message: `"VOYAGE_API_KEY environment variable is required. Get your API key at https://www.voyageai.com/"`
5. IF DEEPSEEK_API_KEY is not set, THEN THE Application SHALL log a warning: `"DEEPSEEK_API_KEY not set. LLM features will be unavailable."`
6. THE Application SHALL NOT log API key values, only whether they are configured (e.g., `"VOYAGE_API_KEY: configured"`)
7. THE Application SHALL create the directories specified by CHROMA_PATH and UPLOAD_PATH if they do not exist at startup

### Requirement 12: Error Handling

**User Story:** As a user, I want clear, helpful error messages, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. THE Application SHALL define a standard error response schema:
   ```json
   {
     "error": "ErrorType",
     "message": "User-friendly message",
     "details": {}  // Optional, only in debug mode
   }
   ```
2. THE Application SHALL map internal errors to user-friendly messages:
   | Internal Error | User Message |
   |----------------|--------------|
   | `FileNotFoundError` | `"File not found. It may have been deleted."` |
   | `PermissionError` | `"Cannot access this file. Please check permissions."` |
   | `sqlite3.IntegrityError` | `"A document with this name already exists."` |
   | `httpx.TimeoutException` | `"Request timed out. Please try again."` |
   | `httpx.ConnectError` | `"Could not connect. Please check your internet connection."` |
   | `voyageai.error.AuthenticationError` | `"Configuration error. Please contact support."` |
   | `voyageai.error.RateLimitError` | `"Service is busy. Please try again in a minute."` |
   | `chromadb.errors.ChromaError` | `"Database error. Please try again."` |
   | Any unhandled exception | `"Something went wrong. Please try again."` |
3. THE Application SHALL log full error details (exception type, message, stack trace) to stderr using Python's `logging` module at ERROR level
4. THE Application SHALL NOT include stack traces, file paths, or internal variable names in user-facing error responses
5. WHEN the Voyage API returns HTTP 429, THE Embedding_Service SHALL:
   - Wait 60 seconds
   - Retry the request
   - Repeat up to 3 times total
   - If still failing, return error to user
6. WHEN the Voyage API returns HTTP 5xx, THE Embedding_Service SHALL:
   - Wait 5 seconds
   - Retry the request
   - Repeat up to 3 times with exponential backoff (5s, 10s, 20s)
   - If still failing, return error to user

### Requirement 13: Health and Status Endpoints

**User Story:** As a developer, I want health check endpoints, so that I can monitor the application's status.

#### Acceptance Criteria

1. THE Application SHALL expose `GET /health` returning:
   ```json
   {
     "status": "healthy",
     "timestamp": "2026-01-14T10:30:00Z",
     "service": "iubar-backend",
     "version": "0.1.0"
   }
   ```
2. THE `/health` endpoint SHALL return within 100ms and NOT perform any database or external API calls
3. THE Application SHALL expose `GET /api/status` returning:
   ```json
   {
     "database": {"status": "connected", "path": "./data/iubar.db"},
     "vector_store": {"status": "connected", "path": "./data/chroma", "collection": "iubar_documents"},
     "voyage_api": {"status": "configured"},
     "deepseek_api": {"status": "configured"},
     "storage": {"upload_path": "./data/uploads", "writable": true}
   }
   ```
4. THE `/api/status` endpoint SHALL verify ChromaDB connectivity by calling `client.heartbeat()`
5. THE `/api/status` endpoint SHALL verify SQLite connectivity by executing `SELECT 1`
6. THE `/api/status` endpoint SHALL check if UPLOAD_PATH directory exists and is writable
7. THE `/api/status` endpoint SHALL report `"status": "not_configured"` for API keys that are not set (not the actual key values)
8. IF any component is unhealthy, THE `/api/status` endpoint SHALL return HTTP 503 with the failing component's status as `"error"`

### Requirement 14: CORS Configuration

**User Story:** As a developer, I want proper CORS configuration, so that the frontend can communicate with the backend during development.

#### Acceptance Criteria

1. THE Application SHALL configure CORS middleware using FastAPI's `CORSMiddleware` with:
   - `allow_origins`: parsed from CORS_ORIGINS environment variable (comma-separated list)
   - `allow_credentials`: `True`
   - `allow_methods`: `["*"]`
   - `allow_headers`: `["*"]`
2. THE default CORS_ORIGINS SHALL include: `http://localhost:3000`, `http://localhost:5173`, `http://localhost:5174`
3. THE Application SHALL parse CORS_ORIGINS by splitting on comma and stripping whitespace from each origin
