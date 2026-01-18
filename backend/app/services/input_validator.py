"""
Input validation service for chat messages and focus context.

Protects against:
- Prompt injection attacks
- Excessive input lengths
- Control character injection
- Invalid UUID formats
"""

import re
from typing import Optional

from app.core.logging_config import StructuredLogger

logger = StructuredLogger(__name__)


class InputValidator:
    """Validates and sanitizes user inputs to prevent injection attacks."""

    MAX_MESSAGE_LENGTH = 6_000  # ~1500 tokens, leaves ~6500 tokens for context
    MAX_FOCUS_CONTEXT_LENGTH = 500

    # Patterns that indicate prompt injection attempts
    FORBIDDEN_PATTERNS = [
        r"ignore\s+previous\s+instructions",
        r"ignore\s+all\s+previous",
        r"disregard\s+previous",
        r"system\s*:",
        r"<\|im_start\|>",
        r"<\|im_end\|>",
        r"<\|endoftext\|>",
        r"\[INST\]",
        r"\[/INST\]",
    ]

    # UUID regex pattern (RFC 4122)
    UUID_PATTERN = re.compile(
        r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
        re.IGNORECASE,
    )

    def validate_message(self, message: str) -> str:
        """Validate and sanitize user message.

        Args:
            message: User's message text

        Returns:
            Sanitized message

        Raises:
            ValidationError: If message is invalid
        """
        if not message or not message.strip():
            raise ValidationError("Message cannot be empty")

        if len(message) > self.MAX_MESSAGE_LENGTH:
            raise ValidationError(
                f"Message too long. Maximum {self.MAX_MESSAGE_LENGTH} characters."
            )

        # Check for prompt injection patterns
        for pattern in self.FORBIDDEN_PATTERNS:
            if re.search(pattern, message, re.IGNORECASE):
                logger.warning(
                    "Blocked potential prompt injection",
                    pattern=pattern,
                    message_length=len(message),
                )
                raise ValidationError(
                    "Message contains invalid content. Please rephrase."
                )

        # Sanitize control characters (keep newlines and tabs)
        sanitized = self._sanitize_control_chars(message)

        return sanitized

    def validate_focus_context(self, focus_context: dict) -> dict:
        """Validate focus context structure and values.

        Args:
            focus_context: Focus context dict

        Returns:
            Validated focus context

        Raises:
            ValidationError: If context is invalid
        """
        required_fields = ["document_id", "start_char", "end_char", "surrounding_text"]
        for field in required_fields:
            if field not in focus_context:
                raise ValidationError(f"Missing required field: {field}")

        # Validate document_id format (UUID)
        doc_id = focus_context["document_id"]
        if not self.UUID_PATTERN.match(doc_id):
            raise ValidationError("Invalid document_id format")

        # Validate character positions
        start = focus_context["start_char"]
        end = focus_context["end_char"]

        if not isinstance(start, int) or not isinstance(end, int):
            raise ValidationError("Character positions must be integers")

        if start < 0 or end < 0:
            raise ValidationError("Character positions must be non-negative")

        if start >= end:
            raise ValidationError("start_char must be less than end_char")

        if end - start > 10_000:
            raise ValidationError("Focus range too large")

        # Validate surrounding text
        surrounding = focus_context["surrounding_text"]
        if len(surrounding) > self.MAX_FOCUS_CONTEXT_LENGTH:
            focus_context["surrounding_text"] = surrounding[
                : self.MAX_FOCUS_CONTEXT_LENGTH
            ]

        return focus_context

    def validate_session_id(self, session_id: str) -> str:
        """Validate session ID format (UUID).

        Args:
            session_id: Session UUID string

        Returns:
            Validated session ID

        Raises:
            ValidationError: If format is invalid
        """
        if not self.UUID_PATTERN.match(session_id):
            raise ValidationError("Invalid session_id format")
        return session_id

    def validate_document_id(self, document_id: str) -> str:
        """Validate document ID format (UUID).

        Args:
            document_id: Document UUID string

        Returns:
            Validated document ID

        Raises:
            ValidationError: If format is invalid
        """
        if not self.UUID_PATTERN.match(document_id):
            raise ValidationError("Invalid document_id format")
        return document_id

    def _sanitize_control_chars(self, text: str) -> str:
        """Remove control characters except newlines and tabs.

        Args:
            text: Input text

        Returns:
            Sanitized text with control characters removed
        """
        # Keep \n (10), \r (13), \t (9)
        return "".join(char for char in text if ord(char) >= 32 or char in "\n\r\t")


class ValidationError(Exception):
    """Custom exception for validation errors."""

    pass
