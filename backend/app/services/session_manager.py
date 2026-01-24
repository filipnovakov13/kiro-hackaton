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

    async def list_sessions(
        self, limit: Optional[int] = None, offset: int = 0
    ) -> list[dict]:
        """List all chat sessions with pagination support.

        Args:
            limit: Maximum number of sessions to return (None for all)
            offset: Number of sessions to skip (for pagination)

        Returns:
            List of session dicts ordered by updated_at DESC (most recent first)
        """
        # Build query with optional limit
        query = """
            SELECT s.id, s.document_id, s.created_at, s.updated_at, s.session_metadata,
                   COUNT(m.id) as message_count
            FROM chat_sessions s
            LEFT JOIN chat_messages m ON s.id = m.session_id
            GROUP BY s.id, s.document_id, s.created_at, s.updated_at, s.session_metadata
            ORDER BY s.updated_at DESC
        """

        params = {"offset": offset}

        if limit is not None:
            query += " LIMIT :limit OFFSET :offset"
            params["limit"] = limit
        elif offset > 0:
            query += " OFFSET :offset"

        result = await self.db.execute(text(query), params)
        rows = result.fetchall()

        sessions = []
        for row in rows:
            sessions.append(
                {
                    "session_id": row[0],
                    "document_id": row[1],
                    "created_at": row[2],
                    "updated_at": row[3],
                    "metadata": json.loads(row[4]) if row[4] else {},
                    "message_count": row[5],
                }
            )

        return sessions

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

    async def get_session_messages(
        self, session_id: str, limit: int = 50, offset: int = 0
    ) -> list[dict]:
        """Get messages for a session with pagination.

        Args:
            session_id: Session UUID
            limit: Maximum number of messages to return (default 50)
            offset: Number of messages to skip (for pagination, default 0)

        Returns:
            List of message dicts ordered by created_at ASC
        """
        # Get messages with pagination, ordered by created_at ASC
        result = await self.db.execute(
            text(
                """SELECT id, session_id, role, content, created_at, message_metadata
                   FROM chat_messages 
                   WHERE session_id = :session_id
                   ORDER BY created_at ASC
                   LIMIT :limit OFFSET :offset"""
            ),
            {"session_id": session_id, "limit": limit, "offset": offset},
        )
        rows = result.fetchall()

        # Convert rows to message dicts
        messages = []
        for row in rows:
            messages.append(
                {
                    "message_id": row[0],
                    "session_id": row[1],
                    "role": row[2],
                    "content": row[3],
                    "created_at": row[4],
                    "metadata": json.loads(row[5]) if row[5] else {},
                }
            )

        return messages

    async def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[dict] = None,
    ) -> str:
        """Save a message to the database.

        Args:
            session_id: Session ID
            role: Message role (user or assistant)
            content: Message content
            metadata: Optional metadata (sources, tokens, cost, interrupted flag)

        Returns:
            message_id: UUID of created message

        Raises:
            ValueError: If session not found or role is invalid
        """
        import uuid

        # Validate role
        if role not in ("user", "assistant"):
            raise ValueError(f"Invalid role: {role}. Must be 'user' or 'assistant'")

        # Verify session exists
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Generate message ID
        message_id = str(uuid.uuid4())
        now = datetime.now().isoformat()

        # Serialize metadata to JSON
        metadata_json = json.dumps(metadata) if metadata else None

        # Insert message
        await self.db.execute(
            text(
                """INSERT INTO chat_messages 
                   (id, session_id, role, content, created_at, message_metadata)
                   VALUES (:id, :session_id, :role, :content, :created_at, :metadata)"""
            ),
            {
                "id": message_id,
                "session_id": session_id,
                "role": role,
                "content": content,
                "created_at": now,
                "metadata": metadata_json,
            },
        )

        # Update session updated_at timestamp
        await self.db.execute(
            text(
                """UPDATE chat_sessions 
                   SET updated_at = :updated
                   WHERE id = :session_id"""
            ),
            {"updated": now, "session_id": session_id},
        )

        await self.db.commit()

        logger.info(
            "Saved message",
            session_id=session_id,
            message_id=message_id,
            role=role,
            content_length=len(content),
        )

        return message_id

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
