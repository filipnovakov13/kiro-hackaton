"""
Document upload and management API endpoints.
Handles file uploads, URL ingestion, status tracking, and CRUD operations.
"""

import json
import os
import uuid
from datetime import datetime, timezone
from typing import List

import aiofiles
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_db
from app.models.document import Chunk, Document
from app.models.schemas import (
    DocumentDetail,
    DocumentListResponse,
    DocumentMetadata,
    DocumentSummary,
    ErrorResponse,
    FileType,
    ProcessingStatus,
    TaskStatusResponse,
    UploadResponse,
    UrlIngestionRequest,
)
from app.services.task_manager import TaskManager

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


# =============================================================================
# Upload Endpoints
# =============================================================================


@router.post(
    "/upload",
    response_model=UploadResponse,
    summary="Upload Document",
    description="Upload a document file (PDF, DOCX, TXT, MD) for processing. Maximum file size is 10MB. Returns a task ID for status polling.",
    responses={
        200: {
            "description": "Document uploaded successfully and queued for processing",
            "content": {
                "application/json": {
                    "example": {
                        "task_id": "550e8400-e29b-41d4-a716-446655440000",
                        "status": "pending",
                    }
                }
            },
        },
        413: {"model": ErrorResponse, "description": "File too large (exceeds 10MB)"},
        415: {
            "model": ErrorResponse,
            "description": "Unsupported file type (only PDF, DOCX, TXT, MD allowed)",
        },
    },
)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    """Upload a document for processing.

    Accepts PDF, DOCX, TXT, MD files up to 10MB.
    Returns task_id for status polling.
    """
    # Validate file extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail={
                "error": "Unsupported file type",
                "message": "Supported formats: PDF, DOCX, TXT, MD",
                "supported_extensions": list(ALLOWED_EXTENSIONS),
            },
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
                "max_size_bytes": MAX_FILE_SIZE,
            },
        )

    # Generate task ID and save file
    task_id = str(uuid.uuid4())
    filename = f"{task_id}_{file.filename}"
    file_path = os.path.join(settings.upload_path, filename)

    # Ensure upload directory exists
    os.makedirs(settings.upload_path, exist_ok=True)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    # Determine file type
    file_type = MIME_TO_TYPE.get(file.content_type or "", ext[1:])

    # Create document record
    doc = Document(
        id=task_id,
        filename=filename,
        original_name=file.filename or "unknown",
        file_type=file_type,
        file_size=len(content),
        upload_time=datetime.now(timezone.utc).isoformat(),
        processing_status="pending",
    )
    db.add(doc)
    await db.commit()

    # Create task status
    task_manager.create_task(task_id, task_id)

    # Queue background processing
    background_tasks.add_task(process_document_task, task_id, file_path, file_type, db)

    return UploadResponse(task_id=task_id, status="pending")


@router.post(
    "/url",
    response_model=UploadResponse,
    summary="Ingest URL",
    description="Fetch content from a URL and convert it to Markdown using Docling. Returns a task ID for status polling.",
    responses={
        200: {
            "description": "URL ingestion started successfully",
            "content": {
                "application/json": {
                    "example": {
                        "task_id": "550e8400-e29b-41d4-a716-446655440000",
                        "status": "pending",
                    }
                }
            },
        },
        400: {"model": ErrorResponse, "description": "Invalid URL format"},
    },
)
async def ingest_url(
    request: UrlIngestionRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    """Ingest content from a URL.

    Fetches the URL and converts HTML to Markdown using Docling.
    Returns task_id for status polling.
    """
    task_id = str(uuid.uuid4())

    # Create document record
    doc = Document(
        id=task_id,
        filename=f"{task_id}_url_content.html",
        original_name=request.url[:255],  # Truncate if too long
        file_type="url",
        file_size=None,  # Unknown until fetched
        upload_time=datetime.now(timezone.utc).isoformat(),
        processing_status="pending",
    )
    db.add(doc)
    await db.commit()

    # Create task status
    task_manager.create_task(task_id, task_id)

    # Queue background processing
    background_tasks.add_task(process_url_task, task_id, request.url, db)

    return UploadResponse(task_id=task_id, status="pending")


# =============================================================================
# Status Endpoint
# =============================================================================


@router.get(
    "/status/{task_id}",
    response_model=TaskStatusResponse,
    summary="Get Processing Status",
    description="Check the processing status of an uploaded document or URL ingestion task",
    responses={
        200: {
            "description": "Task status retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "document_id": "550e8400-e29b-41d4-a716-446655440000",
                        "status": "embedding",
                        "progress": 50,
                        "error": None,
                    }
                }
            },
        },
        404: {"model": ErrorResponse, "description": "Task not found"},
    },
)
async def get_task_status(task_id: str) -> TaskStatusResponse:
    """Get processing status for an upload task."""
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=404,
            detail={"error": "Not found", "message": "No upload found with this ID"},
        )
    return TaskStatusResponse(**task.to_dict())


# =============================================================================
# Document CRUD Endpoints
# =============================================================================


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List Documents",
    description="Retrieve all uploaded documents with their processing status and chunk counts",
    responses={
        200: {
            "description": "List of documents retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "documents": [
                            {
                                "id": "550e8400-e29b-41d4-a716-446655440000",
                                "original_name": "document.pdf",
                                "file_type": "pdf",
                                "file_size": 1024000,
                                "upload_time": "2026-01-25T10:00:00Z",
                                "processing_status": "complete",
                                "chunk_count": 42,
                            }
                        ]
                    }
                }
            },
        }
    },
)
async def list_documents(db: AsyncSession = Depends(get_db)) -> DocumentListResponse:
    """List all uploaded documents."""
    # Query documents with chunk counts
    result = await db.execute(
        select(
            Document,
            func.count(Chunk.id).label("chunk_count"),
        )
        .outerjoin(Chunk, Document.id == Chunk.document_id)
        .group_by(Document.id)
        .order_by(Document.upload_time.desc())
    )
    rows = result.all()

    documents = [
        DocumentSummary(
            id=doc.id,
            original_name=doc.original_name,
            file_type=FileType(doc.file_type),
            file_size=doc.file_size,
            upload_time=doc.upload_time,
            processing_status=ProcessingStatus(doc.processing_status),
            chunk_count=chunk_count,
        )
        for doc, chunk_count in rows
    ]

    return DocumentListResponse(documents=documents)


@router.get(
    "/{document_id}",
    response_model=DocumentDetail,
    summary="Get Document Details",
    description="Retrieve full document details including markdown content and metadata",
    responses={
        200: {
            "description": "Document details retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "original_name": "document.pdf",
                        "file_type": "pdf",
                        "file_size": 1024000,
                        "upload_time": "2026-01-25T10:00:00Z",
                        "processing_status": "complete",
                        "markdown_content": "# Document Title\n\nContent here...",
                        "metadata": {
                            "title": "Document Title",
                            "detected_language": "en",
                        },
                        "chunk_count": 42,
                    }
                }
            },
        },
        404: {"model": ErrorResponse, "description": "Document not found"},
    },
)
async def get_document(
    document_id: str, db: AsyncSession = Depends(get_db)
) -> DocumentDetail:
    """Get full document details including markdown content."""
    result = await db.execute(
        select(
            Document,
            func.count(Chunk.id).label("chunk_count"),
        )
        .outerjoin(Chunk, Document.id == Chunk.document_id)
        .where(Document.id == document_id)
        .group_by(Document.id)
    )
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail={"error": "Not found", "message": "Document not found"},
        )

    doc, chunk_count = row

    # Parse metadata JSON if present
    metadata = None
    if doc.doc_metadata:
        try:
            meta_dict = json.loads(doc.doc_metadata)
            metadata = DocumentMetadata(**meta_dict)
        except (json.JSONDecodeError, TypeError):
            pass

    return DocumentDetail(
        id=doc.id,
        original_name=doc.original_name,
        file_type=FileType(doc.file_type),
        file_size=doc.file_size,
        upload_time=doc.upload_time,
        processing_status=ProcessingStatus(doc.processing_status),
        markdown_content=doc.markdown_content,
        metadata=metadata,
        chunk_count=chunk_count,
    )


@router.delete(
    "/{document_id}",
    status_code=204,
    summary="Delete Document",
    description="Delete a document and all associated data (chunks, embeddings, uploaded file). This operation cannot be undone.",
    responses={
        204: {"description": "Document deleted successfully"},
        404: {"model": ErrorResponse, "description": "Document not found"},
        500: {
            "model": ErrorResponse,
            "description": "Deletion failed due to server error",
        },
    },
)
async def delete_document(
    document_id: str, db: AsyncSession = Depends(get_db)
) -> Response:
    """Delete a document and all associated data.

    Removes:
    - Document record from SQLite
    - All chunk records from SQLite (via cascade)
    - Embeddings from ChromaDB
    - Uploaded file from disk
    """
    # Get document
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(
            status_code=404,
            detail={"error": "Not found", "message": "Document not found"},
        )

    try:
        # Delete from vector store
        from app.services.vector_store import ChromaVectorStore

        vector_store = ChromaVectorStore(settings.chroma_path)
        vector_store.delete_by_document(document_id)

        # Delete uploaded file
        file_path = os.path.join(settings.upload_path, doc.filename)
        if os.path.exists(file_path):
            os.remove(file_path)

        # Delete from database (chunks cascade)
        await db.delete(doc)
        await db.commit()

        # Remove task status
        task_manager.delete_task(document_id)

        return Response(status_code=204)

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Deletion failed",
                "message": "Could not delete document. Please try again.",
            },
        ) from e


# =============================================================================
# Background Tasks
# =============================================================================


async def process_document_task(
    task_id: str, file_path: str, file_type: str, db: AsyncSession
) -> None:
    """Background task for processing uploaded documents.

    Orchestrates: convert → chunk → embed → store
    Updates status at each stage via TaskManager.
    """
    from app.services.chunk_service import ChunkService, ChunkingError
    from app.services.document_processor import (
        DocumentProcessor,
        ProcessingError,
    )
    from app.services.embedding_service import EmbeddingError, EmbeddingService
    from app.services.task_manager import ProcessingStatus
    from app.services.vector_store import ChromaVectorStore, VectorStoreError

    try:
        # Stage 1: Convert document to markdown
        task_manager.update_status(task_id, ProcessingStatus.CONVERTING)

        processor = DocumentProcessor()
        result = await processor.process_file(file_path, file_type)

        # Update document with markdown content
        doc_result = await db.execute(select(Document).where(Document.id == task_id))
        doc = doc_result.scalar_one()
        doc.markdown_content = result.markdown
        doc.doc_metadata = json.dumps(
            {"title": result.title, "detected_language": result.detected_language}
        )
        doc.processing_status = "chunking"
        await db.commit()

        # Stage 2: Chunk the document
        task_manager.update_status(task_id, ProcessingStatus.CHUNKING)

        chunk_service = ChunkService()
        chunks = chunk_service.chunk_document(result.markdown)

        if not chunks:
            raise ChunkingError("This document appears to be empty.")

        # Save chunks to database
        for chunk in chunks:
            chunk_record = Chunk(
                id=str(uuid.uuid4()),
                document_id=task_id,
                chunk_index=chunk.index,
                content=chunk.content,
                token_count=chunk.token_count,
                chunk_metadata=json.dumps(
                    {"start_char": chunk.start_char, "end_char": chunk.end_char}
                ),
            )
            db.add(chunk_record)

        doc.processing_status = "embedding"
        await db.commit()

        # Stage 3: Generate embeddings
        if not settings.voyage_api_key:
            # Skip embedding if no API key
            doc.processing_status = "complete"
            await db.commit()
            task_manager.update_status(task_id, ProcessingStatus.COMPLETE)
            return

        embedding_service = EmbeddingService(settings.voyage_api_key)

        # Get all chunks for embedding
        chunk_result = await db.execute(
            select(Chunk)
            .where(Chunk.document_id == task_id)
            .order_by(Chunk.chunk_index)
        )
        chunk_records = chunk_result.scalars().all()

        total_chunks = len(chunk_records)
        chunk_texts = [c.content for c in chunk_records]
        chunk_ids = [c.id for c in chunk_records]

        # Update progress during embedding
        for i in range(0, total_chunks, 10):
            task_manager.update_embedding_progress(
                task_id, min(i + 10, total_chunks), total_chunks
            )

        embeddings = await embedding_service.embed_documents(chunk_texts)

        # Stage 4: Store in vector database
        vector_store = ChromaVectorStore(settings.chroma_path)
        metadatas = [
            {"document_id": task_id, "chunk_index": c.chunk_index}
            for c in chunk_records
        ]

        vector_store.add(
            ids=chunk_ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=chunk_texts,
        )

        # Mark complete
        doc.processing_status = "complete"
        await db.commit()
        task_manager.update_status(task_id, ProcessingStatus.COMPLETE)

    except ProcessingError as e:
        await _handle_processing_error(task_id, str(e), db)
    except ChunkingError as e:
        await _handle_processing_error(task_id, str(e), db)
    except EmbeddingError as e:
        await _handle_processing_error(task_id, str(e), db)
    except VectorStoreError as e:
        await _handle_processing_error(task_id, "Database error. Please try again.", db)
    except Exception as e:
        await _handle_processing_error(
            task_id, "Something went wrong. Please try again.", db
        )


async def process_url_task(task_id: str, url: str, db: AsyncSession) -> None:
    """Background task for processing URL content.

    Orchestrates: fetch → convert → chunk → embed → store
    """
    from app.services.chunk_service import ChunkService, ChunkingError
    from app.services.document_processor import (
        DocumentProcessor,
        ProcessingError,
    )
    from app.services.embedding_service import EmbeddingError, EmbeddingService
    from app.services.task_manager import ProcessingStatus
    from app.services.vector_store import ChromaVectorStore, VectorStoreError

    try:
        # Stage 1: Fetch and convert URL to markdown
        task_manager.update_status(task_id, ProcessingStatus.CONVERTING)

        processor = DocumentProcessor()
        result = await processor.process_url(url)

        # Update document with markdown content
        doc_result = await db.execute(select(Document).where(Document.id == task_id))
        doc = doc_result.scalar_one()
        doc.markdown_content = result.markdown
        doc.doc_metadata = json.dumps(
            {"title": result.title, "detected_language": result.detected_language}
        )
        doc.processing_status = "chunking"
        await db.commit()

        # Stage 2: Chunk the document
        task_manager.update_status(task_id, ProcessingStatus.CHUNKING)

        chunk_service = ChunkService()
        chunks = chunk_service.chunk_document(result.markdown)

        if not chunks:
            raise ChunkingError("This document appears to be empty.")

        # Save chunks to database
        for chunk in chunks:
            chunk_record = Chunk(
                id=str(uuid.uuid4()),
                document_id=task_id,
                chunk_index=chunk.index,
                content=chunk.content,
                token_count=chunk.token_count,
                chunk_metadata=json.dumps(
                    {"start_char": chunk.start_char, "end_char": chunk.end_char}
                ),
            )
            db.add(chunk_record)

        doc.processing_status = "embedding"
        await db.commit()

        # Stage 3: Generate embeddings
        if not settings.voyage_api_key:
            # Skip embedding if no API key
            doc.processing_status = "complete"
            await db.commit()
            task_manager.update_status(task_id, ProcessingStatus.COMPLETE)
            return

        embedding_service = EmbeddingService(settings.voyage_api_key)

        # Get all chunks for embedding
        chunk_result = await db.execute(
            select(Chunk)
            .where(Chunk.document_id == task_id)
            .order_by(Chunk.chunk_index)
        )
        chunk_records = chunk_result.scalars().all()

        total_chunks = len(chunk_records)
        chunk_texts = [c.content for c in chunk_records]
        chunk_ids = [c.id for c in chunk_records]

        # Update progress during embedding
        for i in range(0, total_chunks, 10):
            task_manager.update_embedding_progress(
                task_id, min(i + 10, total_chunks), total_chunks
            )

        embeddings = await embedding_service.embed_documents(chunk_texts)

        # Stage 4: Store in vector database
        vector_store = ChromaVectorStore(settings.chroma_path)
        metadatas = [
            {"document_id": task_id, "chunk_index": c.chunk_index}
            for c in chunk_records
        ]

        vector_store.add(
            ids=chunk_ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=chunk_texts,
        )

        # Mark complete
        doc.processing_status = "complete"
        await db.commit()
        task_manager.update_status(task_id, ProcessingStatus.COMPLETE)

    except ProcessingError as e:
        await _handle_processing_error(task_id, str(e), db)
    except ChunkingError as e:
        await _handle_processing_error(task_id, str(e), db)
    except EmbeddingError as e:
        await _handle_processing_error(task_id, str(e), db)
    except VectorStoreError as e:
        await _handle_processing_error(task_id, "Database error. Please try again.", db)
    except Exception as e:
        await _handle_processing_error(
            task_id, "Something went wrong. Please try again.", db
        )


async def _handle_processing_error(
    task_id: str, error_message: str, db: AsyncSession
) -> None:
    """Handle processing errors by updating document and task status."""
    from app.services.task_manager import ProcessingStatus

    try:
        doc_result = await db.execute(select(Document).where(Document.id == task_id))
        doc = doc_result.scalar_one_or_none()
        if doc:
            doc.processing_status = "error"
            doc.error_message = error_message
            await db.commit()
    except Exception:
        pass  # Best effort

    task_manager.update_status(task_id, ProcessingStatus.ERROR, error=error_message)
