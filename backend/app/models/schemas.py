"""
Pydantic schemas for API request/response validation.
"""

from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ============================================================================
# Enums
# ============================================================================


class FileType(str, Enum):
    """Supported file types for document upload."""

    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    MD = "md"
    URL = "url"
    HTML = "html"


class ProcessingStatus(str, Enum):
    """Document processing status values."""

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

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate URL format."""
        if not v.startswith(("http://", "https://")):
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


class DocumentMetadata(BaseModel):
    """Extracted document metadata."""

    title: Optional[str] = None
    detected_language: str = "en"


class DocumentSummary(BaseModel):
    """Summary of a document for listing."""

    id: str
    original_name: str
    file_type: FileType
    file_size: Optional[int]
    upload_time: str
    processing_status: ProcessingStatus
    chunk_count: int = 0


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
    details: Optional[dict] = Field(
        None, description="Additional details (debug mode only)"
    )


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


# ============================================================================
# Chat Schemas
# ============================================================================


class MessageRole(str, Enum):
    """Chat message role values."""

    USER = "user"
    ASSISTANT = "assistant"


class FocusContext(BaseModel):
    """Focus caret context for contextual queries."""

    document_id: str = Field(..., description="Document UUID")
    start_char: int = Field(..., ge=0, description="Start character position")
    end_char: int = Field(..., ge=0, description="End character position")
    surrounding_text: str = Field(
        ..., max_length=500, description="Context around focused position"
    )

    @field_validator("end_char")
    @classmethod
    def validate_char_range(cls, v: int, info) -> int:
        """Validate that end_char > start_char."""
        if "start_char" in info.data and v <= info.data["start_char"]:
            raise ValueError("end_char must be greater than start_char")
        return v


class CreateSessionRequest(BaseModel):
    """Request to create a new chat session."""

    document_id: Optional[str] = Field(
        None, description="Optional document UUID to associate with session"
    )


class CreateSessionResponse(BaseModel):
    """Response for session creation."""

    session_id: str
    document_id: Optional[str]
    created_at: str
    message_count: int = 0


class SessionSummary(BaseModel):
    """Summary of a chat session."""

    session_id: str
    document_id: Optional[str]
    created_at: str
    updated_at: str
    message_count: int


class SessionListResponse(BaseModel):
    """Response for listing sessions."""

    sessions: List[SessionSummary]


class ChatMessageSchema(BaseModel):
    """Chat message schema."""

    id: str
    role: MessageRole
    content: str
    created_at: str
    source_chunks: Optional[List[dict]] = None
    focus_context: Optional[FocusContext] = None
    token_count: Optional[int] = None


class SessionDetailResponse(BaseModel):
    """Detailed session with message history."""

    session_id: str
    document_id: Optional[str]
    created_at: str
    updated_at: str
    message_count: int
    messages: List[ChatMessageSchema]


class SessionStatsResponse(BaseModel):
    """Session statistics."""

    session_id: str
    total_messages: int
    total_tokens: int
    cached_tokens: int
    total_cost_usd: float
    created_at: str
    updated_at: str


class SendMessageRequest(BaseModel):
    """Request to send a message in a session."""

    message: str = Field(..., min_length=1, max_length=6000, description="User message")
    focus_context: Optional[FocusContext] = Field(
        None, description="Optional focus caret context"
    )


class MessageListResponse(BaseModel):
    """Response for listing messages."""

    messages: List[ChatMessageSchema]
    total: int
    limit: int
    offset: int


class CacheClearResponse(BaseModel):
    """Response for cache clear operation."""

    cleared_entries: int
    message: str
