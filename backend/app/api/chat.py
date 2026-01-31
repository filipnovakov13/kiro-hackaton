"""
Chat session and message API endpoints.

Handles chat session CRUD operations and streaming message responses.
"""

import asyncio
import json
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logging_config import StructuredLogger
from app.models.chat import ChatSession
from app.models.document import Document
from app.models.schemas import (
    ChatMessageSchema,
    ErrorResponse,
    MessageListResponse,
    SessionStatsResponse,
    SendMessageRequest,
)
from app.services.session_manager import SessionManager
from app.services.input_validator import InputValidator, ValidationError
from app.services.rate_limiter import RateLimiter
from app.services.rag_service import RAGService
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import ChromaVectorStore
from app.services.deepseek_client import DeepSeekClient
from app.services.response_cache import ResponseCache
from app.services.document_summary import DocumentSummaryService
from app.config import settings

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Initialize validator
validator_service = InputValidator()

# Initialize rate limiter (singleton for the module)
rate_limiter = RateLimiter()

# Initialize logger
logger = StructuredLogger("chat_api")


# =============================================================================
# SSE Helper Functions
# =============================================================================


def format_sse_event(event_type: str, data: dict) -> str:
    """Format data as Server-Sent Event.

    SSE format requires:
    - Line 1: event: <type>
    - Line 2: data: <json>
    - Line 3: Empty line (creates double newline at end)

    Args:
        event_type: Event type (token, source, done, error)
        data: Event data dictionary

    Returns:
        Formatted SSE string with double newline
    """
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


# =============================================================================
# Request/Response Models
# =============================================================================


class CreateSessionRequest(BaseModel):
    """Request to create a new chat session."""

    document_id: Optional[str] = Field(
        None, description="Optional document ID to associate with session"
    )

    @validator("document_id")
    def validate_document_id(cls, v):
        """Validate document_id format if provided."""
        if v is not None:
            try:
                validator_service.validate_document_id(v)
            except ValidationError as e:
                raise ValueError(str(e))
        return v


class CreateSessionResponse(BaseModel):
    """Response for session creation."""

    session: "SessionResponse"


class SessionResponse(BaseModel):
    """Response for session creation/retrieval."""

    id: str
    document_id: Optional[str]
    created_at: str
    updated_at: str
    message_count: int


class SessionListResponse(BaseModel):
    """Response for listing sessions."""

    sessions: list[SessionResponse]
    total: int
    limit: Optional[int]
    offset: int


class MessageResponse(BaseModel):
    """Response for a single message."""

    id: str
    role: str
    content: str
    created_at: str
    sources: Optional[list[dict]] = None


class SessionDetailResponse(BaseModel):
    """Response for session details with message history."""

    id: str
    document_id: Optional[str]
    created_at: str
    updated_at: str
    messages: list[MessageResponse]


# =============================================================================
# Session Endpoints
# =============================================================================


@router.post(
    "/sessions",
    response_model=CreateSessionResponse,
    summary="Create Chat Session",
    description="Create a new chat session, optionally associated with a document",
    responses={
        200: {
            "description": "Session created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "session": {
                            "id": "550e8400-e29b-41d4-a716-446655440000",
                            "document_id": "660e8400-e29b-41d4-a716-446655440000",
                            "created_at": "2026-01-25T10:00:00Z",
                            "updated_at": "2026-01-25T10:00:00Z",
                            "message_count": 0,
                        }
                    }
                }
            },
        },
        400: {"model": ErrorResponse, "description": "Invalid input"},
        404: {"model": ErrorResponse, "description": "Document not found"},
    },
)
async def create_session(
    request: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
) -> CreateSessionResponse:
    """Create a new chat session.

    Args:
        request: Session creation request with optional document_id
        db: Database session

    Returns:
        CreateSessionResponse with session details

    Raises:
        HTTPException 400: If document_id format is invalid
        HTTPException 404: If document_id provided but doesn't exist
    """
    # Additional validation for document_id (Pydantic validator already checked format)
    if request.document_id:
        # Validate document exists
        result = await db.execute(
            select(Document).where(Document.id == request.document_id)
        )
        doc = result.scalar_one_or_none()
        if not doc:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "Not found",
                    "message": "Document not found. It may have been deleted.",
                },
            )

    # Generate session ID
    session_id = str(uuid.uuid4())

    # Create session using SessionManager
    session_manager = SessionManager(db)
    session_data = await session_manager.create_session(
        session_id=session_id, document_id=request.document_id
    )

    # Map session_id to id for frontend compatibility
    session_response = SessionResponse(
        id=session_data["session_id"],
        document_id=session_data["document_id"],
        created_at=session_data["created_at"],
        updated_at=session_data["updated_at"],
        message_count=session_data["message_count"],
    )

    return CreateSessionResponse(session=session_response)


@router.get(
    "/sessions",
    response_model=SessionListResponse,
    summary="List Chat Sessions",
    description="Retrieve all chat sessions with optional pagination",
    responses={
        200: {
            "description": "List of sessions retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "sessions": [
                            {
                                "id": "550e8400-e29b-41d4-a716-446655440000",
                                "document_id": "660e8400-e29b-41d4-a716-446655440000",
                                "created_at": "2026-01-25T10:00:00Z",
                                "updated_at": "2026-01-25T10:05:00Z",
                                "message_count": 5,
                            }
                        ],
                        "total": 1,
                        "limit": None,
                        "offset": 0,
                    }
                }
            },
        }
    },
)
async def list_sessions(
    limit: Optional[int] = None,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> SessionListResponse:
    """List all chat sessions with optional pagination.

    Args:
        limit: Maximum number of sessions to return (None for all)
        offset: Number of sessions to skip (for pagination)
        db: Database session

    Returns:
        SessionListResponse with list of sessions and pagination info
    """
    session_manager = SessionManager(db)
    sessions = await session_manager.list_sessions(limit=limit, offset=offset)

    # Convert to response models with id field
    session_responses = [
        SessionResponse(
            id=session["session_id"],
            document_id=session["document_id"],
            created_at=session["created_at"],
            updated_at=session["updated_at"],
            message_count=session["message_count"],
        )
        for session in sessions
    ]

    return SessionListResponse(
        sessions=session_responses,
        total=len(session_responses),
        limit=limit,
        offset=offset,
    )


@router.get(
    "/sessions/{session_id}",
    response_model=SessionDetailResponse,
    summary="Get Chat Session",
    description="Retrieve session details with message history (up to 50 most recent messages)",
    responses={
        200: {
            "description": "Session details retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "session_id": "550e8400-e29b-41d4-a716-446655440000",
                        "document_id": "660e8400-e29b-41d4-a716-446655440000",
                        "created_at": "2026-01-25T10:00:00Z",
                        "updated_at": "2026-01-25T10:05:00Z",
                        "messages": [
                            {
                                "id": "770e8400-e29b-41d4-a716-446655440000",
                                "role": "user",
                                "content": "What is this document about?",
                                "created_at": "2026-01-25T10:01:00Z",
                            }
                        ],
                    }
                }
            },
        },
        404: {"model": ErrorResponse, "description": "Session not found"},
    },
)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> SessionDetailResponse:
    """Get session details with message history.

    Args:
        session_id: Session UUID
        db: Database session

    Returns:
        SessionDetailResponse with session details and messages (limited to 50 most recent)

    Raises:
        HTTPException 404: If session not found
    """
    session_manager = SessionManager(db)

    # Get session details
    session = await session_manager.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "Not found",
                "message": "Session not found. It may have been deleted.",
            },
        )

    # Get messages (limited to 50 most recent)
    messages = await session_manager.get_session_messages(session_id, limit=50)

    # Convert messages to response format
    message_responses = []
    for msg in messages:
        # Extract sources from metadata if present
        sources = None
        if msg.get("metadata") and "source_chunks" in msg["metadata"]:
            sources = msg["metadata"]["source_chunks"]

        message_responses.append(
            MessageResponse(
                id=msg["message_id"],
                role=msg["role"],
                content=msg["content"],
                created_at=msg["created_at"],
                sources=sources,
            )
        )

    return SessionDetailResponse(
        id=session["session_id"],
        document_id=session["document_id"],
        created_at=session["created_at"],
        updated_at=session["updated_at"],
        messages=message_responses,
    )


@router.delete(
    "/sessions/{session_id}",
    status_code=204,
    summary="Delete Chat Session",
    description="Delete a chat session and all its messages (cascade delete)",
    responses={
        204: {"description": "Session deleted successfully"},
        404: {"model": ErrorResponse, "description": "Session not found"},
    },
)
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a chat session and all its messages.

    Args:
        session_id: Session UUID
        db: Database session

    Returns:
        204 No Content on success

    Raises:
        HTTPException 404: If session not found
    """
    session_manager = SessionManager(db)

    # Check if session exists
    session = await session_manager.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "Not found",
                "message": "Session not found. It may have already been deleted.",
            },
        )

    # Delete session (cascade deletes messages automatically)
    await session_manager.delete_session(session_id)

    # Return 204 No Content (FastAPI handles this automatically with status_code=204)
    return None


@router.get(
    "/sessions/{session_id}/stats",
    response_model=SessionStatsResponse,
    summary="Get Session Statistics",
    description="Retrieve session statistics including message count, tokens, cached tokens, and cost",
    responses={
        200: {
            "description": "Session statistics retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "session_id": "550e8400-e29b-41d4-a716-446655440000",
                        "total_messages": 10,
                        "total_tokens": 5000,
                        "cached_tokens": 1500,
                        "total_cost_usd": 0.05,
                        "created_at": "2026-01-25T10:00:00Z",
                        "updated_at": "2026-01-25T10:30:00Z",
                    }
                }
            },
        },
        404: {"model": ErrorResponse, "description": "Session not found"},
    },
)
async def get_session_stats(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> SessionStatsResponse:
    """Get session statistics including message count, tokens, cached tokens, and cost.

    Args:
        session_id: Session UUID
        db: Database session

    Returns:
        SessionStatsResponse with session statistics

    Raises:
        HTTPException 404: If session not found
    """
    session_manager = SessionManager(db)

    try:
        # Get session stats (raises ValueError if session not found)
        stats = await session_manager.get_session_stats(session_id)

        return SessionStatsResponse(
            session_id=stats.session_id,
            total_messages=stats.total_messages,
            total_tokens=stats.total_tokens,
            cached_tokens=stats.cached_tokens,
            total_cost_usd=stats.total_cost_usd,
            created_at=stats.created_at,
            updated_at=stats.updated_at,
        )
    except ValueError as e:
        # Session not found
        raise HTTPException(
            status_code=404,
            detail={
                "error": "Not found",
                "message": str(e),
            },
        )


# =============================================================================
# Message Endpoints
# =============================================================================


@router.get(
    "/sessions/{session_id}/messages",
    response_model=MessageListResponse,
    summary="Get Session Messages",
    description="Retrieve messages for a session with pagination (ordered chronologically)",
    responses={
        200: {
            "description": "Messages retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "messages": [
                            {
                                "id": "770e8400-e29b-41d4-a716-446655440000",
                                "role": "user",
                                "content": "What is AI?",
                                "created_at": "2026-01-25T10:01:00Z",
                            }
                        ],
                        "total": 1,
                        "limit": 50,
                        "offset": 0,
                    }
                }
            },
        },
        404: {"model": ErrorResponse, "description": "Session not found"},
    },
)
async def get_messages(
    session_id: str,
    limit: Optional[int] = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Get messages for a session with pagination.

    Args:
        session_id: Session UUID
        limit: Maximum number of messages to return (default 50)
        offset: Number of messages to skip (for pagination)
        db: Database session

    Returns:
        List of MessageResponse objects ordered by created_at ASC

    Raises:
        HTTPException 404: If session not found
    """
    session_manager = SessionManager(db)

    # Verify session exists
    session = await session_manager.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "Not found",
                "message": "Session not found. It may have been deleted.",
            },
        )

    # Get messages with pagination
    messages = await session_manager.get_session_messages(
        session_id, limit=limit, offset=offset
    )

    # Convert messages to response format
    message_responses = []
    for msg in messages:
        # Extract sources from metadata if present
        source_chunks = None
        if msg.get("metadata") and "sources" in msg["metadata"]:
            source_chunks = msg["metadata"]["sources"]

        message_responses.append(
            ChatMessageSchema(
                id=msg["message_id"],
                role=msg["role"],
                content=msg["content"],
                created_at=msg["created_at"],
                source_chunks=source_chunks,
            )
        )

    return MessageListResponse(
        messages=message_responses,
        total=len(message_responses),
        limit=limit or 50,
        offset=offset,
    )


@router.post(
    "/sessions/{session_id}/messages",
    summary="Send Message (Streaming)",
    description="""Send a message and receive streaming response via Server-Sent Events (SSE).
    
    **SSE Event Types:**
    
    1. **token** - Streaming response tokens as they are generated
       - Format: `event: token\\ndata: {"token": "word"}\\n\\n`
    
    2. **source** - Source attribution for retrieved chunks
       - Format: `event: source\\ndata: {"chunk_id": "uuid", "document_id": "uuid", "similarity": 0.85, "text": "excerpt..."}\\n\\n`
    
    3. **done** - Stream completion with metadata
       - Format: `event: done\\ndata: {"token_count": 150, "cost_usd": 0.0002, "cached": false}\\n\\n`
    
    4. **error** - Error occurred during streaming
       - Format: `event: error\\ndata: {"error": "message", "partial_response": "tokens..."}\\n\\n`
    
    **Focus Context:** Optional parameter to boost relevance of specific document sections (0.15 similarity boost applied).
    """,
    responses={
        200: {
            "description": "Streaming response (Server-Sent Events)",
            "content": {
                "text/event-stream": {
                    "example": 'event: token\ndata: {"token": "Hello"}\n\nevent: token\ndata: {"token": " world"}\n\nevent: source\ndata: {"chunk_id": "abc-123", "document_id": "doc-456", "similarity": 0.85, "text": "relevant excerpt..."}\n\nevent: done\ndata: {"token_count": 150, "cost_usd": 0.0002, "cached": false}\n\n'
                }
            },
        },
        404: {"model": ErrorResponse, "description": "Session not found"},
        422: {"model": ErrorResponse, "description": "Invalid message format"},
        429: {"model": ErrorResponse, "description": "Rate limit exceeded"},
    },
)
async def send_message(
    session_id: str,
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a message and receive streaming response.

    Args:
        session_id: Session UUID
        request: Message and optional focus context
        db: Database session

    Returns:
        StreamingResponse with SSE events (always, even for errors)
    """

    async def error_stream(error_message: str):
        """Generate error event in SSE format."""
        yield format_sse_event("error", {"error": error_message})

    try:
        # Validate session exists
        session_manager = SessionManager(db)
        session = await session_manager.get_session(session_id)
        if not session:
            return StreamingResponse(
                error_stream("Session not found"),
                media_type="text/event-stream",
                headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
            )

        # Check rate limit
        if not await rate_limiter.check_query_limit(session_id):
            return StreamingResponse(
                error_stream("Too many queries. Please wait before trying again."),
                media_type="text/event-stream",
                headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
            )
    except Exception as e:
        logger.error(
            "Error in send_message validation", error=str(e), session_id=session_id
        )
        return StreamingResponse(
            error_stream("An error occurred. Please try again."),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )

    # Save user message IMMEDIATELY after validation (before any RAG operations that might fail)
    await session_manager.save_message(
        session_id=session_id,
        role="user",
        content=request.message,
        metadata={
            "focus_context": (
                request.focus_context.dict() if request.focus_context else None
            )
        },
    )

    async def event_generator():
        """Generate SSE events with comprehensive error handling."""
        response_text = ""
        sources = []
        done_metadata = {}
        interrupted = False

        try:
            # Initialize RAG service dependencies inside generator to catch errors
            embedding_service = EmbeddingService(api_key=settings.voyage_api_key)
            vector_store = ChromaVectorStore(persist_path=settings.chroma_path)
            deepseek_client = DeepSeekClient(api_key=settings.deepseek_api_key)
            response_cache = ResponseCache(max_size=100)
            document_summary_service = DocumentSummaryService(
                deepseek_client=deepseek_client,
                embedding_service=embedding_service,
                db_session=db,
            )

            # Initialize RAG service
            rag_service = RAGService(
                embedding_service=embedding_service,
                vector_store=vector_store,
                deepseek_client=deepseek_client,
                response_cache=response_cache,
                document_summary_service=document_summary_service,
            )

            # Retrieve context
            retrieval_result = await rag_service.retrieve_context(
                query=request.message,
                document_id=session["document_id"],
                focus_context=(
                    request.focus_context.dict() if request.focus_context else None
                ),
                n_results=5,
            )

            # Get message history
            messages = await session_manager.get_session_messages(session_id, limit=10)
            message_history = [
                {"role": msg["role"], "content": msg["content"]} for msg in messages
            ]

            # Generate events
            async def generate_with_timeout():
                nonlocal response_text, sources, done_metadata

                async for event in rag_service.generate_response(
                    query=request.message,
                    context=retrieval_result,
                    session_id=session_id,
                    focus_context=(
                        request.focus_context.dict() if request.focus_context else None
                    ),
                    message_history=message_history,
                ):
                    event_type = event["event"]
                    event_data = event["data"]

                    # Handle error events from RAG service
                    if event_type == "error":
                        yield format_sse_event("error", event_data)
                        return

                    # Accumulate data
                    if event_type == "token":
                        response_text += event_data.get("content", "")
                    elif event_type == "source":
                        sources.append(event_data)
                    elif event_type == "done":
                        done_metadata = event_data

                    yield format_sse_event(event_type, event_data)

            # Stream events
            async for sse_event in generate_with_timeout():
                yield sse_event

        except asyncio.CancelledError:
            # Client disconnected
            logger.warning(
                "Client disconnected during streaming", session_id=session_id
            )
            interrupted = True
            yield format_sse_event(
                "error",
                {
                    "error": "Connection interrupted",
                    "partial_response": response_text,
                },
            )
            raise  # Re-raise to properly close the connection

        except asyncio.TimeoutError:
            # Streaming timeout
            logger.warning("Streaming timeout", session_id=session_id)
            interrupted = True
            yield format_sse_event(
                "error",
                {
                    "error": "Response generation timed out after 60 seconds",
                    "partial_response": response_text,
                },
            )

        except Exception as e:
            # Unexpected error
            logger.error("Error during streaming", error=str(e), session_id=session_id)
            interrupted = True
            yield format_sse_event(
                "error",
                {
                    "error": "An error occurred while generating response",
                    "partial_response": response_text,
                },
            )

        finally:
            # Always save assistant message (even if partial)
            if response_text:
                try:
                    await session_manager.save_message(
                        session_id=session_id,
                        role="assistant",
                        content=response_text,
                        metadata={
                            "sources": sources,
                            "token_count": done_metadata.get("token_count", 0),
                            "cost_usd": done_metadata.get("cost_usd", 0.0),
                            "cached": done_metadata.get("cached", False),
                            "interrupted": interrupted,
                        },
                    )
                except Exception as e:
                    # Log error but don't raise - streaming is already complete
                    logger.error(
                        "Failed to save assistant message",
                        error=str(e),
                        session_id=session_id,
                    )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
