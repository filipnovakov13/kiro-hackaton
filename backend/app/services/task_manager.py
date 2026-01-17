"""
Task management service for tracking document processing status.
Thread-safe singleton for background task progress tracking.
"""

import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, Optional


class ProcessingStatus(str, Enum):
    """Document processing status values."""

    PENDING = "pending"
    CONVERTING = "converting"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"
    COMPLETE = "complete"
    ERROR = "error"


@dataclass
class TaskStatus:
    """Status of a document processing task."""

    status: ProcessingStatus
    progress: str
    document_id: str
    error: Optional[str] = None
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    updated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "status": self.status.value,
            "progress": self.progress,
            "document_id": self.document_id,
            "error": self.error,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class TaskManager:
    """In-memory task status tracking for document processing.

    Thread-safe singleton for tracking background task progress.
    """

    _instance: Optional["TaskManager"] = None
    _lock = threading.Lock()

    PROGRESS_MESSAGES = {
        ProcessingStatus.PENDING: "Queued for processing...",
        ProcessingStatus.CONVERTING: "Converting document to text...",
        ProcessingStatus.CHUNKING: "Splitting into searchable sections...",
        ProcessingStatus.COMPLETE: "Ready",
    }

    def __new__(cls) -> "TaskManager":
        """Create singleton instance."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._tasks: Dict[str, TaskStatus] = {}
        return cls._instance

    def create_task(self, task_id: str, document_id: str) -> TaskStatus:
        """Create a new task with pending status.

        Args:
            task_id: Unique task identifier (UUID).
            document_id: Associated document ID.

        Returns:
            Created TaskStatus.
        """
        status = TaskStatus(
            status=ProcessingStatus.PENDING,
            progress=self.PROGRESS_MESSAGES[ProcessingStatus.PENDING],
            document_id=document_id,
        )
        self._tasks[task_id] = status
        return status

    def get_task(self, task_id: str) -> Optional[TaskStatus]:
        """Get task status by ID.

        Args:
            task_id: Task identifier.

        Returns:
            TaskStatus or None if not found.
        """
        return self._tasks.get(task_id)

    def update_status(
        self,
        task_id: str,
        status: ProcessingStatus,
        progress: Optional[str] = None,
        error: Optional[str] = None,
    ) -> None:
        """Update task status.

        Args:
            task_id: Task identifier.
            status: New status.
            progress: Custom progress message (uses default if None).
            error: Error message (only for ERROR status).
        """
        task = self._tasks.get(task_id)
        if task:
            task.status = status
            task.progress = progress or self.PROGRESS_MESSAGES.get(
                status, "Processing..."
            )
            task.error = error
            task.updated_at = datetime.now(timezone.utc).isoformat()

            if status == ProcessingStatus.ERROR and error:
                task.progress = f"Failed: {error}"

    def update_embedding_progress(self, task_id: str, current: int, total: int) -> None:
        """Update embedding progress with chunk count.

        Args:
            task_id: Task identifier.
            current: Current chunk being processed.
            total: Total chunks to process.
        """
        self.update_status(
            task_id,
            ProcessingStatus.EMBEDDING,
            progress=f"Generating embeddings... (chunk {current} of {total})",
        )

    def delete_task(self, task_id: str) -> None:
        """Remove task from tracking."""
        self._tasks.pop(task_id, None)

    def clear_all(self) -> None:
        """Clear all tasks (for testing)."""
        self._tasks.clear()
