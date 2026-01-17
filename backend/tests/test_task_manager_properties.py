"""
Property-based tests for TaskManager using Hypothesis.

**Validates: Requirements 7.2, 7.5**

Based on research:
- Test state transition properties
- Test timestamp ordering properties
- Focus on invariants that should always hold
"""

import pytest
from hypothesis import given, strategies as st, settings
from datetime import datetime, timezone

from app.services.task_manager import TaskManager, ProcessingStatus, TaskStatus


class TestTaskManagerProperties:
    """Property-based tests for TaskManager."""

    def setup_method(self):
        """Clear task manager before each test."""
        manager = TaskManager()
        manager.clear_all()

    @given(
        task_id=st.text(min_size=1, max_size=50),
        doc_id=st.text(min_size=1, max_size=50),
    )
    @settings(max_examples=20, deadline=1000)
    def test_property_9_status_progression_valid_transitions(self, task_id, doc_id):
        """
        **Property 9: Status Progression**
        Only valid state transitions should be allowed.

        **Validates: Requirements 7.2**

        Property: Task status should follow a valid progression:
        PENDING → CONVERTING → CHUNKING → EMBEDDING → COMPLETE
        or any status → ERROR
        """
        manager = TaskManager()

        # Create task
        task = manager.create_task(task_id, doc_id)
        assert task.status == ProcessingStatus.PENDING, "New task should be PENDING"

        # Valid progression: PENDING → CONVERTING
        manager.update_status(task_id, ProcessingStatus.CONVERTING)
        task = manager.get_task(task_id)
        assert (
            task.status == ProcessingStatus.CONVERTING
        ), "Should transition to CONVERTING"

        # Valid progression: CONVERTING → CHUNKING
        manager.update_status(task_id, ProcessingStatus.CHUNKING)
        task = manager.get_task(task_id)
        assert task.status == ProcessingStatus.CHUNKING, "Should transition to CHUNKING"

        # Valid progression: CHUNKING → EMBEDDING
        manager.update_status(task_id, ProcessingStatus.EMBEDDING)
        task = manager.get_task(task_id)
        assert (
            task.status == ProcessingStatus.EMBEDDING
        ), "Should transition to EMBEDDING"

        # Valid progression: EMBEDDING → COMPLETE
        manager.update_status(task_id, ProcessingStatus.COMPLETE)
        task = manager.get_task(task_id)
        assert task.status == ProcessingStatus.COMPLETE, "Should transition to COMPLETE"

    @given(
        task_id=st.text(min_size=1, max_size=50),
        doc_id=st.text(min_size=1, max_size=50),
    )
    @settings(max_examples=20, deadline=1000)
    def test_property_9_error_transition_from_any_state(self, task_id, doc_id):
        """
        **Property 9: Status Progression (Error)**
        ERROR status should be reachable from any state.

        **Validates: Requirements 7.2**

        Property: Any status can transition to ERROR (for error handling).
        """
        manager = TaskManager()

        # Test ERROR transition from each status
        statuses = [
            ProcessingStatus.PENDING,
            ProcessingStatus.CONVERTING,
            ProcessingStatus.CHUNKING,
            ProcessingStatus.EMBEDDING,
        ]

        for status in statuses:
            # Create fresh task
            test_task_id = f"{task_id}_{status.value}"
            manager.create_task(test_task_id, doc_id)

            # Set to specific status
            manager.update_status(test_task_id, status)

            # Transition to ERROR should always work
            error_msg = f"Error from {status.value}"
            manager.update_status(test_task_id, ProcessingStatus.ERROR, error=error_msg)

            task = manager.get_task(test_task_id)
            assert (
                task.status == ProcessingStatus.ERROR
            ), f"Should transition from {status.value} to ERROR"
            assert task.error == error_msg, "Error message should be set"

    @given(
        task_id=st.text(min_size=1, max_size=50),
        doc_id=st.text(min_size=1, max_size=50),
    )
    @settings(max_examples=20, deadline=1000)
    def test_property_10_timestamp_ordering(self, task_id, doc_id):
        """
        **Property 10: Timestamp Ordering**
        created_at should always be <= updated_at.

        **Validates: Requirements 7.5**

        Property: For any task, the creation timestamp should never be
        after the update timestamp.
        """
        manager = TaskManager()

        # Create task
        task = manager.create_task(task_id, doc_id)

        # Parse timestamps
        created = datetime.fromisoformat(task.created_at)
        updated = datetime.fromisoformat(task.updated_at)

        # Property: created_at <= updated_at (initially equal)
        assert (
            created <= updated
        ), f"created_at ({created}) should be <= updated_at ({updated})"

        # Update status multiple times
        statuses = [
            ProcessingStatus.CONVERTING,
            ProcessingStatus.CHUNKING,
            ProcessingStatus.EMBEDDING,
            ProcessingStatus.COMPLETE,
        ]

        for status in statuses:
            manager.update_status(task_id, status)
            task = manager.get_task(task_id)

            created = datetime.fromisoformat(task.created_at)
            updated = datetime.fromisoformat(task.updated_at)

            # Property: created_at should still be <= updated_at
            assert (
                created <= updated
            ), f"After update to {status.value}: created_at ({created}) should be <= updated_at ({updated})"

    def test_singleton_behavior(self):
        """TaskManager should be a singleton."""
        manager1 = TaskManager()
        manager2 = TaskManager()

        assert manager1 is manager2, "TaskManager should be a singleton"

        # Changes in one should reflect in the other
        manager1.create_task("test_task", "test_doc")
        task = manager2.get_task("test_task")

        assert (
            task is not None
        ), "Task created in manager1 should be visible in manager2"
        assert task.document_id == "test_doc"

    def test_get_nonexistent_task_returns_none(self):
        """Getting a non-existent task should return None."""
        manager = TaskManager()

        task = manager.get_task("nonexistent_task_id")
        assert task is None, "Non-existent task should return None"

    def test_delete_task_removes_from_tracking(self):
        """Deleting a task should remove it from tracking."""
        manager = TaskManager()

        task_id = "test_delete_task"
        manager.create_task(task_id, "test_doc")

        # Verify it exists
        assert manager.get_task(task_id) is not None

        # Delete it
        manager.delete_task(task_id)

        # Verify it's gone
        assert (
            manager.get_task(task_id) is None
        ), "Deleted task should not be retrievable"

    def test_embedding_progress_updates(self):
        """Embedding progress should update correctly."""
        manager = TaskManager()

        task_id = "test_embedding"
        manager.create_task(task_id, "test_doc")

        # Update embedding progress
        manager.update_embedding_progress(task_id, 5, 10)

        task = manager.get_task(task_id)
        assert task.status == ProcessingStatus.EMBEDDING
        assert (
            "chunk 5 of 10" in task.progress
        ), f"Progress should show chunk count, got: {task.progress}"
