"""Document summary service for multi-document search.

This module provides functionality to generate and manage document summaries
with embeddings for efficient multi-document retrieval.
"""

from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime
import numpy as np

from app.core.logging_config import StructuredLogger

logger = StructuredLogger(__name__)


@dataclass
class DocumentSummary:
    """Document summary with embedding."""

    document_id: str
    summary_text: str
    embedding: List[float]
    created_at: str


class DocumentSummaryService:
    """Service for generating and managing document summaries.

    Summaries are used for multi-document search to quickly identify
    relevant documents before searching chunks.
    """

    def __init__(self, deepseek_client, embedding_service, db_session):
        """Initialize document summary service.

        Args:
            deepseek_client: DeepSeekClient instance for summary generation
            embedding_service: EmbeddingService instance for embeddings
            db_session: Database session for storage
        """
        self.deepseek_client = deepseek_client
        self.embedding_service = embedding_service
        self.db = db_session

    async def generate_summary(
        self, document_id: str, document_content: str, document_title: str
    ) -> DocumentSummary:
        """Generate summary for a document.

        Args:
            document_id: Document UUID
            document_content: Full markdown content
            document_title: Document title

        Returns:
            DocumentSummary with text and embedding
        """
        # Use first 2000 characters for summary generation
        preview = document_content[:2000]

        # Generate summary using DeepSeek
        prompt = [
            {
                "role": "user",
                "content": f"""Summarize this document in 500 characters focusing on the main topics and themes:

{preview}""",
            }
        ]

        summary_text = ""
        async for chunk in self.deepseek_client.stream_chat(prompt):
            if chunk.get("type") == "token":
                summary_text += chunk["content"]

        # Truncate to 500 characters
        summary_text = summary_text[:500]

        # Generate embedding for summary
        summary_embedding = await self.embedding_service.embed_query(summary_text)

        # Store in database
        await self._store_summary(document_id, summary_text, summary_embedding)

        return DocumentSummary(
            document_id=document_id,
            summary_text=summary_text,
            embedding=summary_embedding,
            created_at=datetime.now().isoformat(),
        )

    async def get_summary(self, document_id: str) -> Optional[DocumentSummary]:
        """Get summary for a document.

        Args:
            document_id: Document UUID

        Returns:
            DocumentSummary if found, None otherwise
        """
        # Query database
        result = await self.db.execute(
            "SELECT document_id, summary_text, summary_embedding, created_at "
            "FROM document_summaries WHERE document_id = ?",
            (document_id,),
        )
        row = await result.fetchone()

        if not row:
            return None

        # Deserialize embedding from BLOB
        embedding = np.frombuffer(row[2], dtype=np.float32).tolist()

        return DocumentSummary(
            document_id=row[0],
            summary_text=row[1],
            embedding=embedding,
            created_at=row[3],
        )

    async def get_all_summaries(self) -> List[DocumentSummary]:
        """Get all document summaries.

        Returns:
            List of all DocumentSummary objects
        """
        result = await self.db.execute(
            "SELECT document_id, summary_text, summary_embedding, created_at "
            "FROM document_summaries"
        )
        rows = await result.fetchall()

        summaries = []
        for row in rows:
            embedding = np.frombuffer(row[2], dtype=np.float32).tolist()
            summaries.append(
                DocumentSummary(
                    document_id=row[0],
                    summary_text=row[1],
                    embedding=embedding,
                    created_at=row[3],
                )
            )

        return summaries

    async def _store_summary(
        self, document_id: str, summary_text: str, embedding: List[float]
    ):
        """Store summary in database.

        Args:
            document_id: Document UUID
            summary_text: Summary text (max 500 chars)
            embedding: Embedding vector (512 dimensions)
        """
        # Convert embedding to bytes for BLOB storage
        embedding_bytes = np.array(embedding, dtype=np.float32).tobytes()

        await self.db.execute(
            """INSERT OR REPLACE INTO document_summaries 
               (document_id, summary_text, summary_embedding, created_at)
               VALUES (?, ?, ?, ?)""",
            (document_id, summary_text, embedding_bytes, datetime.now().isoformat()),
        )
        await self.db.commit()
