"""Tests for DeepSeekClient service."""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from hypothesis import given, strategies as st, settings

from app.services.deepseek_client import DeepSeekClient, DeepSeekAPIError
from app.services.circuit_breaker import CircuitBreakerError


# Unit Tests


def test_deepseek_client_initialization():
    """Test DeepSeek client initializes with correct defaults."""
    client = DeepSeekClient(api_key="test-key")

    assert client.model == "deepseek-chat"
    assert client.temperature == 0.7
    assert client.max_tokens == 2000
    assert client.frequency_penalty == 0.3
    assert client.presence_penalty == 0.1
    assert client.timeout_seconds == 30
    assert client.circuit_breaker is not None


def test_deepseek_client_custom_config():
    """Test DeepSeek client with custom configuration."""
    client = DeepSeekClient(
        api_key="test-key",
        base_url="https://custom.api.com",
        model="custom-model",
        temperature=0.5,
        max_tokens=1000,
        frequency_penalty=0.5,
        presence_penalty=0.2,
        timeout_seconds=60,
    )

    assert client.model == "custom-model"
    assert client.temperature == 0.5
    assert client.max_tokens == 1000
    assert client.frequency_penalty == 0.5
    assert client.presence_penalty == 0.2
    assert client.timeout_seconds == 60


@pytest.mark.asyncio
async def test_stream_chat_circuit_breaker_open():
    """Test stream_chat when circuit breaker is open."""
    client = DeepSeekClient(api_key="test-key")

    # Mock circuit breaker to raise error
    async def mock_call_raises(func, *args, **kwargs):
        raise CircuitBreakerError("Service temporarily unavailable")

    with patch.object(client.circuit_breaker, "call", side_effect=mock_call_raises):
        messages = [{"role": "user", "content": "Hi"}]

        with pytest.raises(DeepSeekAPIError) as exc_info:
            async for _ in client.stream_chat(messages):
                pass

        assert "temporarily unavailable" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_stream_chat_internal_success():
    """Test internal streaming with mocked OpenAI client."""
    client = DeepSeekClient(api_key="test-key")

    # Mock streaming response
    mock_chunk1 = MagicMock()
    mock_chunk1.choices = [MagicMock()]
    mock_chunk1.choices[0].delta = MagicMock()
    mock_chunk1.choices[0].delta.content = "Hello"
    mock_chunk1.usage = None

    mock_chunk2 = MagicMock()
    mock_chunk2.choices = [MagicMock()]
    mock_chunk2.choices[0].delta = MagicMock()
    mock_chunk2.choices[0].delta.content = " world"
    mock_chunk2.usage = None

    mock_chunk3 = MagicMock()
    mock_chunk3.choices = []
    mock_chunk3.usage = MagicMock()
    mock_chunk3.usage.prompt_tokens = 10
    mock_chunk3.usage.completion_tokens = 2
    mock_chunk3.usage.prompt_cache_hit_tokens = 0

    async def mock_stream():
        for chunk in [mock_chunk1, mock_chunk2, mock_chunk3]:
            yield chunk

    mock_create = AsyncMock(return_value=mock_stream())

    with patch.object(client.client.chat.completions, "create", mock_create):
        messages = [{"role": "user", "content": "Hi"}]
        chunks = []

        async for chunk in client._stream_chat_internal(messages):
            chunks.append(chunk)

        assert len(chunks) == 3
        assert chunks[0] == {"type": "token", "content": "Hello"}
        assert chunks[1] == {"type": "token", "content": " world"}
        assert chunks[2]["type"] == "done"
        assert chunks[2]["prompt_tokens"] == 10
        assert chunks[2]["completion_tokens"] == 2


@pytest.mark.asyncio
async def test_stream_chat_internal_401_error():
    """Test handling of 401 authentication errors."""
    client = DeepSeekClient(api_key="test-key")

    async def mock_stream():
        raise Exception("401 Unauthorized")
        yield  # Make it a generator

    mock_create = AsyncMock(return_value=mock_stream())

    with patch.object(client.client.chat.completions, "create", mock_create):
        messages = [{"role": "user", "content": "Hi"}]

        with pytest.raises(DeepSeekAPIError) as exc_info:
            async for _ in client._stream_chat_internal(messages):
                pass

        # Should not expose 401 details
        assert "401" not in str(exc_info.value)
        assert "Configuration error" in str(exc_info.value)


@pytest.mark.asyncio
async def test_stream_chat_internal_429_retry():
    """Test retry logic for 429 rate limit errors."""
    client = DeepSeekClient(api_key="test-key")

    call_count = 0

    async def mock_stream_generator():
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise Exception("429 Rate limit exceeded")
        # Second call succeeds
        mock_chunk = MagicMock()
        mock_chunk.choices = [MagicMock()]
        mock_chunk.choices[0].delta = MagicMock()
        mock_chunk.choices[0].delta.content = "Success"
        mock_chunk.usage = MagicMock()
        mock_chunk.usage.prompt_tokens = 5
        mock_chunk.usage.completion_tokens = 1
        mock_chunk.usage.prompt_cache_hit_tokens = 0
        yield mock_chunk

    # Create a function that returns a new generator each time
    def create_mock(**kwargs):
        return mock_stream_generator()

    mock_create = AsyncMock(side_effect=create_mock)

    with patch.object(client.client.chat.completions, "create", mock_create):
        with patch(
            "app.services.deepseek_client.asyncio.sleep", new_callable=AsyncMock
        ):
            messages = [{"role": "user", "content": "Hi"}]
            chunks = []

            async for chunk in client._stream_chat_internal(messages):
                chunks.append(chunk)

            assert call_count == 2  # Should have retried
            assert len(chunks) == 2  # Token + done


@pytest.mark.asyncio
async def test_stream_chat_internal_5xx_exponential_backoff():
    """Test exponential backoff for 5xx server errors."""
    client = DeepSeekClient(api_key="test-key")

    call_count = 0

    async def mock_stream_generator():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise Exception("500 Internal Server Error")
        # Third call succeeds
        mock_chunk = MagicMock()
        mock_chunk.choices = [MagicMock()]
        mock_chunk.choices[0].delta = MagicMock()
        mock_chunk.choices[0].delta.content = "Success"
        mock_chunk.usage = MagicMock()
        mock_chunk.usage.prompt_tokens = 5
        mock_chunk.usage.completion_tokens = 1
        mock_chunk.usage.prompt_cache_hit_tokens = 0
        yield mock_chunk

    def create_mock(**kwargs):
        return mock_stream_generator()

    mock_create = AsyncMock(side_effect=create_mock)

    with patch.object(client.client.chat.completions, "create", mock_create):
        with patch(
            "app.services.deepseek_client.asyncio.sleep", new_callable=AsyncMock
        ) as mock_sleep:
            messages = [{"role": "user", "content": "Hi"}]
            chunks = []

            async for chunk in client._stream_chat_internal(messages):
                chunks.append(chunk)

            assert call_count == 3  # Should have retried twice
            # Check exponential backoff was used
            assert mock_sleep.call_count == 2


@pytest.mark.asyncio
async def test_stream_chat_internal_timeout_retry():
    """Test retry logic for timeout errors."""
    client = DeepSeekClient(api_key="test-key")

    call_count = 0

    async def mock_stream_generator():
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise Exception("Request timeout")
        # Second call succeeds
        mock_chunk = MagicMock()
        mock_chunk.choices = [MagicMock()]
        mock_chunk.choices[0].delta = MagicMock()
        mock_chunk.choices[0].delta.content = "Success"
        mock_chunk.usage = MagicMock()
        mock_chunk.usage.prompt_tokens = 5
        mock_chunk.usage.completion_tokens = 1
        mock_chunk.usage.prompt_cache_hit_tokens = 0
        yield mock_chunk

    def create_mock(**kwargs):
        return mock_stream_generator()

    mock_create = AsyncMock(side_effect=create_mock)

    with patch.object(client.client.chat.completions, "create", mock_create):
        messages = [{"role": "user", "content": "Hi"}]
        chunks = []

        async for chunk in client._stream_chat_internal(messages):
            chunks.append(chunk)

        assert call_count == 2  # Should have retried


@pytest.mark.asyncio
async def test_stream_chat_internal_max_retries_exhausted():
    """Test that max retries are respected."""
    client = DeepSeekClient(api_key="test-key")

    call_count = 0

    async def mock_stream_generator():
        nonlocal call_count
        call_count += 1
        raise Exception("500 Internal Server Error")
        yield  # Make it a generator

    def create_mock(**kwargs):
        return mock_stream_generator()

    mock_create = AsyncMock(side_effect=create_mock)

    with patch.object(client.client.chat.completions, "create", mock_create):
        with patch(
            "app.services.deepseek_client.asyncio.sleep", new_callable=AsyncMock
        ):
            messages = [{"role": "user", "content": "Hi"}]

            with pytest.raises(DeepSeekAPIError) as exc_info:
                async for _ in client._stream_chat_internal(messages, max_retries=3):
                    pass

            assert "temporarily unavailable" in str(exc_info.value).lower()
            assert call_count == 3


@pytest.mark.asyncio
async def test_stream_chat_internal_unknown_error():
    """Test handling of unknown errors."""
    client = DeepSeekClient(api_key="test-key")

    async def mock_stream():
        raise ValueError("Unknown error")
        yield  # Make it a generator

    mock_create = AsyncMock(return_value=mock_stream())

    with patch.object(client.client.chat.completions, "create", mock_create):
        messages = [{"role": "user", "content": "Hi"}]

        with pytest.raises(DeepSeekAPIError) as exc_info:
            async for _ in client._stream_chat_internal(messages):
                pass

        assert "temporarily unavailable" in str(exc_info.value).lower()


# Property-Based Tests


@settings(deadline=None)
@given(st.integers(min_value=1, max_value=5))
@pytest.mark.asyncio
async def test_property_retries_occur_for_transient_failures(max_retries):
    """Property: Retries occur for transient failures up to max_retries."""
    client = DeepSeekClient(api_key="test-key")

    call_count = 0

    async def mock_stream_generator():
        nonlocal call_count
        call_count += 1
        raise Exception("500 Internal Server Error")
        yield  # Make it a generator

    def create_mock(**kwargs):
        return mock_stream_generator()

    mock_create = AsyncMock(side_effect=create_mock)

    with patch.object(client.client.chat.completions, "create", mock_create):
        with patch(
            "app.services.deepseek_client.asyncio.sleep", new_callable=AsyncMock
        ):
            messages = [{"role": "user", "content": "Hi"}]

            with pytest.raises(DeepSeekAPIError):
                async for _ in client._stream_chat_internal(
                    messages, max_retries=max_retries
                ):
                    pass

            assert call_count == max_retries


@settings(deadline=None)
@given(st.floats(min_value=0.0, max_value=2.0))
@pytest.mark.asyncio
async def test_property_temperature_range_respected(temperature):
    """Property: Temperature parameter is within valid range."""
    client = DeepSeekClient(api_key="test-key", temperature=temperature)

    assert 0.0 <= client.temperature <= 2.0


@settings(deadline=None)
@given(st.integers(min_value=1, max_value=4000))
@pytest.mark.asyncio
async def test_property_max_tokens_positive(max_tokens):
    """Property: max_tokens is always positive."""
    client = DeepSeekClient(api_key="test-key", max_tokens=max_tokens)

    assert client.max_tokens > 0
