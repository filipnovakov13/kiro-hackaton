"""
Custom exception hierarchy for Iubar backend.
All exceptions include user-friendly messages for API responses.
"""


class IubarError(Exception):
    """Base exception for all Iubar errors.

    Attributes:
        user_message: User-friendly message for API responses.
    """

    def __init__(
        self,
        message: str,
        user_message: str = "Something went wrong. Please try again.",
    ) -> None:
        super().__init__(message)
        self.user_message = user_message


class ValidationError(IubarError):
    """Input validation errors."""

    def __init__(self, message: str, user_message: str = "Invalid input.") -> None:
        super().__init__(message, user_message)


class ProcessingError(IubarError):
    """Document processing errors."""

    def __init__(
        self,
        message: str,
        user_message: str = "Could not process this file format.",
    ) -> None:
        super().__init__(message, user_message)


class EmbeddingError(IubarError):
    """Embedding generation errors."""

    def __init__(
        self,
        message: str,
        user_message: str = "Embedding service temporarily unavailable. Please try again later.",
    ) -> None:
        super().__init__(message, user_message)


class VectorStoreError(IubarError):
    """Vector store operation errors."""

    def __init__(
        self,
        message: str,
        user_message: str = "Database error. Please try again.",
    ) -> None:
        super().__init__(message, user_message)


class ChunkingError(IubarError):
    """Document chunking errors."""

    def __init__(
        self,
        message: str,
        user_message: str = "This document appears to be empty.",
    ) -> None:
        super().__init__(message, user_message)


class NotFoundError(IubarError):
    """Resource not found errors."""

    def __init__(
        self,
        message: str,
        user_message: str = "Resource not found.",
    ) -> None:
        super().__init__(message, user_message)
