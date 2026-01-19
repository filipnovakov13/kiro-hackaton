"""
Chat session and message API endpoints.

Handles chat session CRUD operations and streaming message responses.
"""

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
from app.models.chat import ChatSession
from app.models.document import Document
from app.models.schemas import ErrorResponse, SessionStatsResponse, SendMessageRequest
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


class SessionResponse(BaseModel):
    """Response for session creation/retrieval."""

    session_id: str
    document_id: Optional[str]
    created_at: str
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

    session_id: str
    document_id: Optional[str]
    created_at: str
    updated_at: str
    messages: list[MessageResponse]


# =============================================================================
# Session Endpoints
# =============================================================================


@router.post(
    "/sessions",
    response_model=SessionResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid input"},
        404: {"model": ErrorResponse, "description": "Document not found"},
    },
)
async def create_session(
    request: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    """Create a new chat session.

    Args:
        request: Session creation request with optional document_id
        db: Database session

    Returns:
        SessionResponse with session details

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

    return SessionResponse(**session_data)


@router.get(
    "/sessions",
    response_model=SessionListResponse,
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

    # Convert to response models
    session_responses = [SessionResponse(**session) for session in sessions]

    return SessionListResponse(
        sessions=session_responses,
        total=len(session_responses),
        limit=limit,
        offset=offset,
    )


@router.get(
    "/sessions/{session_id}",
    response_model=SessionDetailResponse,
    responses={
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
        session_id=session["session_id"],
        document_id=session["document_id"],
        created_at=session["created_at"],
        updated_at=session["updated_at"],
        messages=message_responses,
    )


@router.delete(
    "/sessions/{session_id}",
    status_code=204,
    responses={
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
    responses={
        404: {"model": ErrorResponse, "description": "Session not found"},
    },
)
async def get_session_stats(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> SessionStatsResponse:
    """Get session statistics including message count, tokens, cost, and cache hit rate.

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
            message_count=stats.message_count,
            total_tokens=stats.total_tokens,
            estimated_cost_usd=stats.estimated_cost_usd,
            cache_hit_rate=stats.cache_hit_rate,
            avg_response_time_ms=stats.avg_response_time_ms,
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


@router.post(
    "/sessions/{session_id}/messages",
    responses={
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
        StreamingResponse with SSE events

    Raises:
        HTTPException 404: If session not found
        HTTPException 422: If message format is invalid
        HTTPException 429: If rate limit exceeded
    """
    # Validate session exists
    session_manager = SessionManager(db)
    session = await session_manager.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail={"error": "Not found", "message": "Session not found"},
        )

    # Check rate limit
    if not await rate_limiter.check_query_limit(session_id):
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit exceeded",
                "message": "Too many queries. Please wait before trying again.",
            },
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

    # Initialize RAG service dependencies
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
        focus_context=request.focus_context.dict() if request.focus_context else None,
        n_results=5,
    )

    # Get message history
    messages = await session_manager.get_session_messages(session_id, limit=10)
    message_history = [
        {"role": msg["role"], "content": msg["content"]} for msg in messages
    ]

    async def event_generator():
        """Generate SSE events and save assistant message."""
        # Accumulate response
        response_text = ""
        sources = []
        done_metadata = {}

        async for event in rag_service.generate_response(
            query=request.message,
            context=retrieval_result,
            session_id=session_id,
            focus_context=(
                request.focus_context.dict() if request.focus_context else None
            ),
            message_history=message_history,
        ):
            # Format as SSE
            event_type = event["event"]
            event_data = event["data"]

            # Accumulate data
            if event_type == "token":
                response_text += event_data.get("content", "")
            elif event_type == "source":
                sources.append(event_data)
            elif event_type == "done":
                done_metadata = event_data

            yield format_sse_event(event_type, event_data)

        # Save assistant message after streaming
        await session_manager.save_message(
            session_id=session_id,
            role="assistant",
            content=response_text,
            metadata={
                "sources": sources,
                "token_count": done_metadata.get("token_count"),
                "cost_usd": done_metadata.get("cost_usd"),
                "cached": done_metadata.get("cached", False),
            },
        )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
