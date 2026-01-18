"""
Session management service for chat sessions.

Handles session CRUD operations, statistics tracking, and automatic cleanup
of expired sessions.
"""

import json
import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging_config import StructuredLogger

logger = StructuredLogger(__name__)


@dataclass
class SessionStats:
    """Session statistics."""

    message_count: int
    total_tokens: int
    estimated_cost_usd: float
    cache_hit_rate: float
    avg_response_time_ms: float


class SessionManager:
    """Manages chat sessions with TTL and cleanup.

    Handles session CRUD, statistics tracking, and automatic cleanup
    of expired sessions.
    """

    SESSION_TTL_HOURS = 24
    MAX_SESSIONS_PER_USER = 100  # For future multi-user support
    CLEANUP_INTERVAL_MINUTES = 60

    def __init__(self, db_session: AsyncSession):
        """Initialize session manager.

        Args:
            db_session: SQLAlchemy async session
        """
        self.db = db_session
        self._cleanup_task = None

    async def start_cleanup_task(self):
        """Start background task for session cleanup."""
        self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
        logger.info("Session cleanup task started")

    async def stop_cleanup_task(self):
        """Stop background cleanup task."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            logger.info("Session cleanup task stopped")

    async def create_session(
        self, session_id: str, document_id: Optional[str] = None
    ) -> dict:
        """Create a new chat session.

        Args:
            session_id: UUID for the session
            document_id: Optional document to associate with session

        Returns:
            Session dict with id, document_id, created_at, message_count

        Raises:
            ValueError: If document_id doesn't exist
        """
        # Verify document exists if provided
        if document_id:
            result = await self.db.execute(
                text("SELECT id FROM documents WHERE id = :doc_id"),
                {"doc_id": document_id},
            )
            if not result.fetchone():
                raise ValueError(f"Document {document_id} not found")

        # Create session
        now = datetime.now().isoformat()
        await self.db.execute(
            text(
                """INSERT INTO chat_sessions 
                   (id, document_id, created_at, updated_at, session_metadata)
                   VALUES (:id, :doc_id, :created, :updated, :metadata)"""
            ),
            {
                "id": session_id,
                "doc_id": document_id,
                "created": now,
                "updated": now,
                "metadata": "{}",
            },
        )
        await self.db.commit()

        logger.info("Created session", session_id=session_id, document_id=document_id)

        return {
            "session_id": session_id,
            "document_id": document_id,
            "created_at": now,
            "message_count": 0,
        }

    async def get_session(self, session_id: str) -> Optional[dict]:
        """Get session by ID.

        Args:
            session_id: Session UUID

        Returns:
            Session dict or None if not found
        """
        result = await self.db.execute(
            text(
                """SELECT id, document_id, created_at, updated_at, session_metadata
                   FROM chat_sessions WHERE id = :session_id"""
            ),
            {"session_id": session_id},
        )
        row = result.fetchone()

        if not row:
            return None

        # Get message count
        msg_result = await self.db.execute(
            text("SELECT COUNT(*) FROM chat_messages WHERE session_id = :session_id"),
            {"session_id": session_id},
        )
        message_count = msg_result.fetchone()[0]

        return {
            "session_id": row[0],
            "document_id": row[1],
            "created_at": row[2],
            "updated_at": row[3],
            "metadata": json.loads(row[4]) if row[4] else {},
            "message_count": message_count,
        }

    async def update_session_metadata(
        self, session_id: str, metadata_updates: dict
    ) -> None:
        """Update session metadata (costs, tokens, etc.).

        Args:
            session_id: Session UUID
            metadata_updates: Dict of metadata fields to update

        Raises:
            ValueError: If session not found
        """
        # Get current metadata
        result = await self.db.execute(
            text("SELECT session_metadata FROM chat_sessions WHERE id = :session_id"),
            {"session_id": session_id},
        )
        row = result.fetchone()
        if not row:
            raise ValueError(f"Session {session_id} not found")

        current_metadata = json.loads(row[0]) if row[0] else {}
        current_metadata.update(metadata_updates)

        # Update with new metadata and timestamp
        await self.db.execute(
            text(
                """UPDATE chat_sessions 
                   SET session_metadata = :metadata, updated_at = :updated
                   WHERE id = :session_id"""
            ),
            {
                "metadata": json.dumps(current_metadata),
                "updated": datetime.now().isoformat(),
                "session_id": session_id,
            },
        )
        await self.db.commit()

        logger.info("Updated session metadata", session_id=session_id)

    async def delete_session(self, session_id: str) -> None:
        """Delete session and all its messages (cascade).

        Args:
            session_id: Session UUID
        """
        await self.db.execute(
            text("DELETE FROM chat_sessions WHERE id = :session_id"),
            {"session_id": session_id},
        )
        await self.db.commit()

        logger.info("Deleted session", session_id=session_id)

    async def get_session_stats(self, session_id: str) -> SessionStats:
        """Get session statistics.

        Args:
            session_id: Session UUID

        Returns:
            SessionStats with message count, tokens, cost, etc.

        Raises:
            ValueError: If session not found
        """
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        metadata = session.get("metadata", {})

        return SessionStats(
            message_count=session["message_count"],
            total_tokens=metadata.get("total_tokens", 0),
            estimated_cost_usd=metadata.get("estimated_cost_usd", 0.0),
            cache_hit_rate=metadata.get("cache_hit_rate", 0.0),
            avg_response_time_ms=metadata.get("avg_response_time_ms", 0.0),
        )

    async def check_spending_limit(
        self, session_id: str, max_cost_usd: float = 5.00
    ) -> bool:
        """Check if session has exceeded spending limit.

        Args:
            session_id: Session to check
            max_cost_usd: Maximum allowed cost per session (default $5.00)

        Returns:
            True if under limit, False if exceeded
        """
        stats = await self.get_session_stats(session_id)
        return stats.estimated_cost_usd < max_cost_usd

    async def _periodic_cleanup(self):
        """Background task to clean up expired sessions."""
        while True:
            try:
                await asyncio.sleep(self.CLEANUP_INTERVAL_MINUTES * 60)
                await self._cleanup_expired_sessions()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(
                    "Session cleanup error",
                    error_type=type(e).__name__,
                    error_message=str(e),
                )

    async def _cleanup_expired_sessions(self):
        """Delete sessions older than TTL."""
        cutoff = (datetime.now() - timedelta(hours=self.SESSION_TTL_HOURS)).isoformat()

        result = await self.db.execute(
            text("SELECT COUNT(*) FROM chat_sessions WHERE updated_at < :cutoff"),
            {"cutoff": cutoff},
        )
        count = result.fetchone()[0]

        if count > 0:
            await self.db.execute(
                text("DELETE FROM chat_sessions WHERE updated_at < :cutoff"),
                {"cutoff": cutoff},
            )
            await self.db.commit()
            logger.info("Cleaned up expired sessions", sessions_deleted=count)
