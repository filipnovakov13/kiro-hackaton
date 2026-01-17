# Implementation Plan: Foundation Phase

## Overview

This implementation plan covers Phase 1 (Foundation) of Iubar - the document ingestion pipeline, vector storage, and basic UI shell. Tasks are ordered to build incrementally with early validation of core functionality.

**Target Language**: Python 3.12+ (backend), TypeScript (frontend)
**Testing Framework**: pytest + hypothesis (backend), Vitest (frontend)

**IMPORTANT**: Python 3.12 is required due to ChromaDB compatibility. Python 3.14+ is not supported by ChromaDB 1.4.1 (uses Pydantic V1). See migration guide: `.kiro/documentation/python-3.12-migration-guide.md`

## Tasks

- [x] 1. Project Setup and Configuration
  - [x] 1.1 Update backend dependencies in requirements.txt
    - Add: `docling>=2.30.0`, `chromadb>=0.4.0`, `voyageai>=0.2.0`, `aiosqlite>=0.19.0`, `sqlalchemy[asyncio]>=2.0.0`, `aiofiles>=23.2.1`, `tiktoken>=0.5.0`, `hypothesis>=6.92.0`
    - Note: `httpx>=0.24.1` already present
    - _Requirements: 3.1, 4.4, 5.2, 6.3, 9.7_

  - [x] 1.2 Extend backend/app/config.py with new settings
    - Add to existing Settings class: `chroma_path`, `upload_path`, `max_file_size_mb`, `voyage_api_key`, `deepseek_api_key`
    - Add validation methods: `validate_required_keys()`, `ensure_directories()`, `log_configuration()`
    - Note: Settings class already exists with server, API, CORS, database, and logging config
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [x] 1.3 Update backend/.env.template with new environment variables
    - Add new variables for Voyage, DeepSeek, ChromaDB paths
    - Note: Template file already exists with basic variables
    - _Requirements: 11.2, 11.3_

- [x] 2. Database Layer
  - [x] 2.1 Create backend/app/core/database.py
    - Implement async SQLite connection with aiosqlite
    - Configure WAL mode, busy_timeout, foreign keys pragmas
    - Implement `init_db()` and `get_db()` dependency
    - _Requirements: 9.1, 9.4, 9.6, 9.7_

  - [x] 2.2 Create backend/app/models/document.py (SQLAlchemy model)
    - Define Document model with all columns from schema
    - Define Chunk model with foreign key relationship
    - _Requirements: 9.2, 9.3, 9.5_

  - [x] 2.3 Create backend/app/models/schemas.py (Pydantic schemas)
    - Define request schemas: `UrlIngestionRequest`
    - Define response schemas: `UploadResponse`, `TaskStatusResponse`, `DocumentSummary`, `DocumentDetail`, `ErrorResponse`
    - Define enums: `FileType`, `ProcessingStatus`
    - _Requirements: 1.1, 2.1, 7.2, 8.1, 8.2, 12.1_

- [x] 3. Core Services - Chunking
  - [x] 3.1 Create backend/app/services/chunk_service.py
    - Implement `ChunkService` class with tiktoken encoder
    - Implement `count_tokens()` method
    - Implement `chunk_document()` with paragraph/sentence splitting
    - Implement overlap calculation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x]* 3.2 Write property tests for ChunkService
    - **Property 1: Chunk Token Bounds** - All chunks between 512-1024 tokens (except final)
    - **Property 2: Token Count Accuracy** - Reported count matches tiktoken
    - **Property 3: Chunk Index Uniqueness** - Sequential indices, no duplicates
    - **Validates: Requirements 4.2, 4.4, 4.7**

- [x] 4. Core Services - Vector Store
  - [x] 4.1 Create backend/app/services/vector_store.py
    - Define `VectorStoreInterface` abstract class
    - Define `QueryResult` dataclass
    - Define `VectorStoreError` exception
    - _Requirements: 6.1, 6.2_

  - [x] 4.2 Implement ChromaVectorStore class
    - Initialize with absolute path from config
    - Implement `add()`, `query()`, `delete_by_document()`, `count()`, `health_check()`
    - Configure cosine similarity, disable telemetry
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_

  - [x]* 4.3 Write property tests for VectorStore
    - **Property 4: Add-Query Consistency** - Added vectors retrievable by exact match
    - **Property 5: Delete Completeness** - Deleted documents return empty results
    - **Validates: Requirements 6.6, 6.7, 6.9**

- [x] 5. Core Services - Embedding
  - [x] 5.1 Create backend/app/services/embedding_service.py
    - Implement `EmbeddingService` with dedicated ThreadPoolExecutor
    - Implement embedding cache with SHA-256 hashing
    - Implement `embed_documents()` with batching (128 max)
    - Implement `embed_query()` for search
    - Implement retry logic with exponential backoff
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 5.8_

  - [x]* 5.2 Write property tests for EmbeddingService (mocked)
    - **Property 6: Embedding Dimension Consistency** - All embeddings are 512-dimensional
    - **Property 7: Embedding Cache Consistency** - Same input returns cached result
    - **Validates: Requirements 5.2, 5.3**

- [x] 6. Checkpoint - Core Services
  - Ensure all tests pass, ask the user if questions arise.
  - Verify ChunkService, VectorStore, and EmbeddingService work independently

- [x] 7. Core Services - Document Processing
  - [x] 7.1 Create backend/app/services/document_processor.py
    - Implement `DocumentProcessor` with Docling converter
    - Implement `_sync_convert()` for thread pool execution
    - Implement `process_file()` with asyncio.to_thread() wrapper
    - Implement `process_url()` with httpx async client
    - Handle all file types: pdf, docx, txt, md, html, url
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [x]* 7.2 Write property tests for DocumentProcessor
    - **Property 8: Round-Trip Integrity** - TXT/MD files preserve content through processing
    - **Validates: Requirements 3.5, 3.6**

- [x] 8. Task Management
  - [x] 8.1 Create backend/app/services/task_manager.py
    - Implement `ProcessingStatus` enum
    - Implement `TaskStatus` dataclass
    - Implement `TaskManager` singleton with thread-safe operations
    - Implement progress message mapping
    - _Requirements: 7.1, 7.2, 7.5, 7.6_

  - [x]* 8.2 Write property tests for TaskManager
    - **Property 9: Status Progression** - Valid state transitions only
    - **Property 10: Timestamp Ordering** - created_at <= updated_at
    - **Validates: Requirements 7.2, 7.5**

- [x] 9. Exception Handling
  - [x] 9.1 Create backend/app/core/exceptions.py
    - Define exception hierarchy: `IubarError`, `ValidationError`, `ProcessingError`, `EmbeddingError`, `VectorStoreError`, `ChunkingError`, `NotFoundError`
    - Include user_message attribute for user-friendly errors
    - _Requirements: 12.1, 12.2_

  - [x] 9.2 Add global exception handlers to main.py
    - Map exceptions to HTTP status codes
    - Log full details, return user-friendly messages
    - _Requirements: 12.2, 12.3, 12.4_

- [x] 10. API Endpoints - Documents
  - [x] 10.1 Create backend/app/api/documents.py router
    - Implement `POST /api/documents/upload` endpoint
    - Validate file size (10MB limit) and type (pdf, docx, txt, md)
    - Save file to upload_path, create database record
    - Queue background processing task
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 10.2 Implement URL ingestion endpoint
    - Implement `POST /api/documents/url` endpoint
    - Validate URL format and length
    - Create database record, queue processing
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 10.3 Implement status endpoint
    - Implement `GET /api/documents/status/{task_id}` endpoint
    - Return task status from TaskManager
    - _Requirements: 7.3, 7.4_

  - [x] 10.4 Implement document CRUD endpoints
    - Implement `GET /api/documents` - list all documents
    - Implement `GET /api/documents/{id}` - get document details
    - Implement `DELETE /api/documents/{id}` - cascade delete
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 10.5 Register router in main.py
    - Add documents router with `/api/documents` prefix
    - _Requirements: 1.1, 2.1_

- [x] 11. Background Processing Pipeline
  - [x] 11.1 Implement document processing background task
    - Create `process_document_task()` function
    - Orchestrate: convert → chunk → embed → store
    - Update status at each stage via TaskManager
    - Handle errors and update status accordingly
    - _Requirements: 3.1, 3.8, 4.8, 5.5, 5.9_

  - [x]* 11.2 Write integration test for full pipeline
    - Test TXT file upload → processing → retrieval
    - Verify chunks created and embeddings stored
    - **Validates: Requirements 3.1, 4.1, 5.1, 6.6**

- [x] 12. Checkpoint - Backend API
  - Ensure all tests pass, ask the user if questions arise.
  - Test full upload → process → query flow manually

- [x] 13. Health and Status Endpoints
  - [x] 13.1 Health endpoint already exists in main.py
    - Returns service name, version, timestamp, status
    - Already meets <100ms response requirement
    - _Requirements: 13.1, 13.2_ ✓ DONE

  - [x] 13.2 Implement /api/status endpoint
    - Check database connectivity (SELECT 1)
    - Check ChromaDB connectivity (heartbeat)
    - Check storage writability
    - Report API key configuration status
    - _Requirements: 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

- [x] 14. Frontend - Types and API Client
  - [x] 14.1 Create frontend/src/types/document.ts
    - Define TypeScript interfaces matching backend schemas
    - Define enums: `FileType`, `ProcessingStatus`
    - _Requirements: 10.10_

  - [x] 14.2 Create frontend/src/services/api.ts
    - Implement `uploadDocument()` function
    - Implement `ingestUrl()` function
    - Implement `getTaskStatus()` function
    - Implement `listDocuments()`, `getDocument()`, `deleteDocument()`
    - Implement `ApiError` class for error handling
    - _Requirements: 10.6, 10.7_

- [x] 15. Frontend - Upload Components
  - [x] 15.1 Create frontend/src/components/upload/UploadZone.tsx
    - Implement drag-and-drop zone with visual feedback
    - Implement file picker button
    - Validate file size and type client-side
    - _Requirements: 10.1, 10.2, 10.4, 10.5_

  - [x] 15.2 Create frontend/src/components/upload/UrlInput.tsx
    - Implement URL input field with submit button
    - Basic URL validation
    - _Requirements: 10.3_

  - [x] 15.3 Create frontend/src/components/upload/UploadProgress.tsx
    - Display processing status and progress message
    - Show success/error states with icons
    - _Requirements: 10.7, 10.8, 10.9_

  - [x] 15.4 Create frontend/src/hooks/useDocumentUpload.ts
    - Implement upload state management
    - Implement polling logic (2-second interval)
    - Handle completion and error states
    - _Requirements: 10.6, 10.7, 10.8, 10.9_

- [x] 16. Frontend - Document List
  - [x] 16.1 Create frontend/src/components/documents/DocumentList.tsx
    - Display list of uploaded documents
    - Show status, file type, size, upload time
    - Implement delete functionality
    - _Requirements: 8.1_

- [x] 17. Checkpoint - Frontend Components
  - Ensure all tests pass, ask the user if questions arise.
  - Test upload flow end-to-end in browser

- [x] 18. Integration and Polish
  - [x] 18.1 Wire up frontend components in App.tsx
    - Create welcome screen with upload zone
    - Add document list below upload zone
    - _Requirements: 10.1_

  - [x] 18.2 CORS configuration already exists in main.py
    - CORSMiddleware configured with localhost:5173, localhost:3000, localhost:5174
    - Allows all methods and headers
    - _Requirements: 14.1, 14.2, 14.3_ ✓ DONE

- [x] 19. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify complete flow: upload → process → list → delete

## Notes

- Tasks marked with `*` are optional property-based tests
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
