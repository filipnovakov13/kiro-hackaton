"""Circuit breaker pattern for external API calls.

This module implements the circuit breaker pattern to protect against
cascading failures when calling external services like the DeepSeek API.
"""

from enum import Enum
from datetime import datetime, timedelta
import asyncio

from app.core.logging_config import StructuredLogger

logger = StructuredLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing recovery


class CircuitBreakerError(Exception):
    """Custom exception for circuit breaker open state."""

    pass


class CircuitBreaker:
    """Circuit breaker pattern for external API calls.

    Protects against cascading failures by:
    - Opening circuit after consecutive failures
    - Rejecting requests when open
    - Testing recovery in half-open state
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout_seconds: int = 60,
        success_threshold: int = 2,
    ):
        """Initialize circuit breaker.

        Args:
            failure_threshold: Number of consecutive failures before opening circuit
            recovery_timeout_seconds: Seconds to wait before attempting recovery
            success_threshold: Number of successes needed to close circuit from half-open
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = timedelta(seconds=recovery_timeout_seconds)
        self.success_threshold = success_threshold

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None

    async def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection.

        Args:
            func: Async function to call
            *args, **kwargs: Arguments to pass to func

        Returns:
            Result from func

        Raises:
            CircuitBreakerError: If circuit is open
            Original exception: If func raises
        """
        # Check circuit state
        if self.state == CircuitState.OPEN:
            # Check if recovery timeout has passed
            if datetime.now() - self.last_failure_time > self.recovery_timeout:
                logger.info(
                    "Circuit breaker entering half-open state", state="half_open"
                )
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
            else:
                raise CircuitBreakerError(
                    "Service temporarily unavailable. Please try again in a moment."
                )

        try:
            # Execute function
            result = await func(*args, **kwargs)

            # Record success
            await self._on_success()

            return result

        except Exception as e:
            # Record failure
            await self._on_failure()
            raise

    async def _on_success(self):
        """Handle successful call."""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1

            if self.success_count >= self.success_threshold:
                logger.info(
                    "Circuit breaker closing after successful recovery",
                    state="closed",
                    success_count=self.success_count,
                )
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0

        elif self.state == CircuitState.CLOSED:
            # Reset failure count on success
            self.failure_count = 0

    async def _on_failure(self):
        """Handle failed call."""
        self.failure_count += 1
        self.last_failure_time = datetime.now()

        if self.state == CircuitState.HALF_OPEN:
            # Failure during recovery, reopen circuit
            logger.warning(
                "Circuit breaker reopening after failed recovery attempt",
                state="open",
                failure_count=self.failure_count,
            )
            self.state = CircuitState.OPEN
            self.success_count = 0

        elif self.failure_count >= self.failure_threshold:
            # Too many failures, open circuit
            logger.error(
                "Circuit breaker opening after consecutive failures",
                state="open",
                failure_count=self.failure_count,
                threshold=self.failure_threshold,
            )
            self.state = CircuitState.OPEN

    def get_state(self) -> dict:
        """Get current circuit breaker state.

        Returns:
            Dictionary with state, counts, and last failure time
        """
        return {
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "last_failure_time": (
                self.last_failure_time.isoformat() if self.last_failure_time else None
            ),
        }
