"""Tests for chat Pydantic schemas."""

import pytest
from pydantic import ValidationError

from app.models.schemas import (
    SendMessageRequest,
    FocusContext,
    CreateSessionRequest,
    MessageRole,
)


def test_send_message_request_valid():
    """Test valid message request."""
    request = SendMessageRequest(message="What is this document about?")
    assert request.message == "What is this document about?"
    assert request.focus_context is None


def test_send_message_request_with_focus():
    """Test message request with focus context."""
    focus = FocusContext(
        document_id="123e4567-e89b-12d3-a456-426614174000",
        start_char=100,
        end_char=200,
        surrounding_text="This is the context around the focused position",
    )
    request = SendMessageRequest(message="Explain this section", focus_context=focus)
    assert request.message == "Explain this section"
    assert request.focus_context.start_char == 100


def test_send_message_request_too_long():
    """Test that messages over 6000 chars are rejected."""
    long_message = "a" * 6001
    with pytest.raises(ValidationError) as exc_info:
        SendMessageRequest(message=long_message)

    errors = exc_info.value.errors()
    assert any("max_length" in str(error) for error in errors)


def test_send_message_request_empty():
    """Test that empty messages are rejected."""
    with pytest.raises(ValidationError) as exc_info:
        SendMessageRequest(message="")

    errors = exc_info.value.errors()
    assert any("min_length" in str(error) for error in errors)


def test_focus_context_valid():
    """Test valid focus context."""
    focus = FocusContext(
        document_id="123e4567-e89b-12d3-a456-426614174000",
        start_char=100,
        end_char=200,
        surrounding_text="Context text",
    )
    assert focus.start_char == 100
    assert focus.end_char == 200


def test_focus_context_invalid_range():
    """Test that end_char must be greater than start_char."""
    with pytest.raises(ValidationError) as exc_info:
        FocusContext(
            document_id="123e4567-e89b-12d3-a456-426614174000",
            start_char=200,
            end_char=100,
            surrounding_text="Context text",
        )

    errors = exc_info.value.errors()
    assert any("end_char" in str(error) for error in errors)


def test_focus_context_negative_positions():
    """Test that negative positions are rejected."""
    with pytest.raises(ValidationError):
        FocusContext(
            document_id="123e4567-e89b-12d3-a456-426614174000",
            start_char=-10,
            end_char=100,
            surrounding_text="Context text",
        )


def test_focus_context_surrounding_text_too_long():
    """Test that surrounding text over 500 chars is rejected."""
    long_text = "a" * 501
    with pytest.raises(ValidationError) as exc_info:
        FocusContext(
            document_id="123e4567-e89b-12d3-a456-426614174000",
            start_char=100,
            end_char=200,
            surrounding_text=long_text,
        )

    errors = exc_info.value.errors()
    assert any("max_length" in str(error) for error in errors)


def test_create_session_request_with_document():
    """Test session creation with document."""
    request = CreateSessionRequest(document_id="123e4567-e89b-12d3-a456-426614174000")
    assert request.document_id == "123e4567-e89b-12d3-a456-426614174000"


def test_create_session_request_without_document():
    """Test session creation without document (general chat)."""
    request = CreateSessionRequest()
    assert request.document_id is None


def test_message_role_enum():
    """Test message role enum values."""
    assert MessageRole.USER == "user"
    assert MessageRole.ASSISTANT == "assistant"
