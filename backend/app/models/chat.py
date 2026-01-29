"""
SQLAlchemy models for chat sessions and messages.
"""

from sqlalchemy import Column, ForeignKey, String, Text, CheckConstraint, Index
from sqlalchemy.orm import relationship

from app.core.database import Base


class ChatSession(Base):
    """Chat session model.

    Stores chat sessions associated with documents or general conversations.
    """

    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True)  # UUID
    document_id = Column(
        String(36),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=True,  # Nullable for general chat without document
    )
    created_at = Column(String(30), nullable=False)  # ISO 8601
    updated_at = Column(String(30), nullable=False)  # ISO 8601
    session_metadata = Column(
        Text, nullable=False, default="{}"
    )  # JSON string for costs, tokens, etc.

    # Relationship to messages
    messages = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )

    __table_args__ = (
        Index("idx_chat_sessions_document_id", "document_id"),
        Index("idx_chat_sessions_updated_at", "updated_at"),
    )


class ChatMessage(Base):
    """Chat message model.

    Stores individual messages in a chat session with role (user/assistant).
    """

    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True)  # UUID
    session_id = Column(
        String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False
    )
    role = Column(String(20), nullable=False)  # user or assistant
    content = Column(Text, nullable=False)
    created_at = Column(String(30), nullable=False)  # ISO 8601
    message_metadata = Column(
        Text, nullable=True
    )  # JSON string for source_chunks, focus_context, token_count

    # Relationship to session
    session = relationship("ChatSession", back_populates="messages")

    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant')", name="check_role"),
        Index("idx_chat_messages_session_id", "session_id"),
        Index("idx_chat_messages_created_at", "created_at"),
    )


class DocumentSummary(Base):
    """Document summary model.

    Stores AI-generated summaries with embeddings for multi-document search.
    """

    __tablename__ = "document_summaries"

    document_id = Column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True
    )
    summary_text = Column(Text, nullable=False)  # Max 500 characters
    summary_embedding = Column(
        Text, nullable=False
    )  # BLOB stored as bytes, 512-dimensional vector
    created_at = Column(String(30), nullable=False)  # ISO 8601
