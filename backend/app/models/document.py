"""
SQLAlchemy models for documents and chunks.
"""

from sqlalchemy import Column, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class Document(Base):
    """Document metadata model.

    Stores information about uploaded documents including their
    processing status and converted markdown content.
    """

    __tablename__ = "documents"

    id = Column(String(36), primary_key=True)  # UUID
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_type = Column(String(10), nullable=False)  # pdf, docx, txt, md, url, html
    file_size = Column(Integer, nullable=True)
    upload_time = Column(String(30), nullable=False)  # ISO 8601
    processing_status = Column(String(20), nullable=False, default="pending")
    markdown_content = Column(Text, nullable=True)
    doc_metadata = Column(Text, nullable=True)  # JSON string (renamed from metadata)
    error_message = Column(Text, nullable=True)

    # Relationship to chunks
    chunks = relationship(
        "Chunk", back_populates="document", cascade="all, delete-orphan"
    )


class Chunk(Base):
    """Document chunk model.

    Stores individual chunks of a document with their token counts
    and position metadata for vector search.
    """

    __tablename__ = "chunks"

    id = Column(String(36), primary_key=True)  # UUID
    document_id = Column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=False)
    chunk_metadata = Column(Text, nullable=True)  # JSON string (renamed from metadata)

    # Relationship to document
    document = relationship("Document", back_populates="chunks")

    __table_args__ = (
        UniqueConstraint("document_id", "chunk_index", name="uq_document_chunk"),
    )
