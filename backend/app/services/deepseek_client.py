"""DeepSeek API client for streaming chat completions.

This module provides a wrapper around the DeepSeek API (OpenAI-compatible)
with retry logic, error handling, and circuit breaker integration.
"""

from openai import AsyncOpenAI
from typing import AsyncGenerator, List, Dict
import asyncio

from app.core.logging_config import StructuredLogger
from app.services.circuit_breaker import CircuitBreaker, CircuitBreakerError

logger = StructuredLogger(__name__)


class DeepSeekAPIError(Exception):
    """Custom exception for DeepSeek API errors."""

    pass


class DeepSeekClient:
    """Client for DeepSeek API (OpenAI-compatible).

    Handles streaming chat completions with retry logic, timeout handling,
    and circuit breaker protection.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.deepseek.com/v1",
        model: str = "deepseek-chat",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        frequency_penalty: float = 0.3,
        presence_penalty: float = 0.1,
        timeout_seconds: int = 30,
    ):
        """Initialize DeepSeek client.

        Args:
            api_key: DeepSeek API key
            base_url: API base URL
            model: Model name to use
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens in response
            frequency_penalty: Frequency penalty (-2 to 2)
            presence_penalty: Presence penalty (-2 to 2)
            timeout_seconds: Request timeout in seconds
        """
        self.client = AsyncOpenAI(
            api_key=api_key, base_url=base_url, timeout=timeout_seconds
        )
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.frequency_penalty = frequency_penalty
        self.presence_penalty = presence_penalty
        self.timeout_seconds = timeout_seconds

        # Initialize circuit breaker
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=5, recovery_timeout_seconds=60, success_threshold=2
        )

    async def stream_chat(
        self, messages: List[Dict[str, str]], max_retries: int = 3
    ) -> AsyncGenerator[dict, None]:
        """Stream chat completion from DeepSeek with circuit breaker protection.

        Args:
            messages: List of message dicts with role and content
            max_retries: Maximum retry attempts

        Yields:
            Streaming chunks: {"type": "token", "content": "..."} or
                             {"type": "done", "prompt_tokens": N, ...}

        Raises:
            DeepSeekAPIError: If API call fails after retries
            CircuitBreakerError: If circuit is open
        """
        try:
            # Use circuit breaker - it returns the generator, not yields from it
            generator = await self.circuit_breaker.call(
                self._stream_chat_internal, messages, max_retries
            )
            async for chunk in generator:
                yield chunk
        except CircuitBreakerError as e:
            # Circuit is open, return user-friendly error
            raise DeepSeekAPIError(str(e)) from e

    async def _stream_chat_internal(
        self, messages: List[Dict[str, str]], max_retries: int = 3
    ) -> AsyncGenerator[dict, None]:
        """Internal method for streaming chat completion with retry logic.

        Args:
            messages: List of message dicts with role and content
            max_retries: Maximum retry attempts

        Yields:
            Streaming chunks: {"type": "token", "content": "..."} or
                             {"type": "done", "prompt_tokens": N, ...}

        Raises:
            DeepSeekAPIError: If API call fails after retries
        """
        last_error = None

        for attempt in range(max_retries):
            try:
                stream = await self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=self.temperature,
                    max_tokens=self.max_tokens,
                    frequency_penalty=self.frequency_penalty,
                    presence_penalty=self.presence_penalty,
                    stream=True,
                )

                prompt_tokens = 0
                completion_tokens = 0
                cached_tokens = 0

                async for chunk in stream:
                    if chunk.choices and len(chunk.choices) > 0:
                        delta = chunk.choices[0].delta
                        if delta.content:
                            completion_tokens += 1
                            yield {"type": "token", "content": delta.content}

                    # Extract usage from final chunk
                    if hasattr(chunk, "usage") and chunk.usage:
                        prompt_tokens = chunk.usage.prompt_tokens
                        completion_tokens = chunk.usage.completion_tokens
                        cached_tokens = getattr(
                            chunk.usage, "prompt_cache_hit_tokens", 0
                        )

                # Send done event
                yield {
                    "type": "done",
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "cached_tokens": cached_tokens,
                }
                return

            except Exception as e:
                last_error = e
                error_type = type(e).__name__
                error_str = str(e)

                # Handle authentication errors (don't expose details)
                if "401" in error_str or "Unauthorized" in error_str:
                    raise DeepSeekAPIError(
                        "Configuration error. Please contact support."
                    ) from e

                # Handle rate limiting with 60s wait
                if "429" in error_str or "rate_limit" in error_str.lower():
                    if attempt < max_retries - 1:
                        logger.warning(
                            "Rate limited, waiting 60s",
                            attempt=attempt + 1,
                            max_retries=max_retries,
                            wait_seconds=60,
                        )
                        await asyncio.sleep(60)
                        continue
                    else:
                        raise DeepSeekAPIError(
                            "Rate limit exceeded. Please try again later."
                        ) from e

                # Handle 5xx errors with exponential backoff
                if error_str and len(error_str) > 0 and error_str[0] == "5":
                    wait_time = 5 * (2**attempt)
                    if attempt < max_retries - 1:
                        logger.warning(
                            "Server error, waiting with exponential backoff",
                            attempt=attempt + 1,
                            max_retries=max_retries,
                            wait_seconds=wait_time,
                        )
                        await asyncio.sleep(wait_time)
                        continue

                # Handle timeout errors
                if "timeout" in error_str.lower():
                    if attempt < max_retries - 1:
                        logger.warning(
                            "Timeout, retrying",
                            attempt=attempt + 1,
                            max_retries=max_retries,
                        )
                        continue
                    else:
                        raise DeepSeekAPIError(
                            "Request timed out. Please try again."
                        ) from e

                # Other errors - sanitize and raise
                logger.error(
                    "DeepSeek API error", error_type=error_type, attempt=attempt + 1
                )
                raise DeepSeekAPIError(
                    f"AI service temporarily unavailable: {error_type}"
                ) from e

        # All retries exhausted
        raise DeepSeekAPIError(
            "AI service temporarily unavailable. Please try again."
        ) from last_error
