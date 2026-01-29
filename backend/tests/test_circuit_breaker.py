"""Tests for CircuitBreaker service."""

import pytest
import asyncio
from datetime import datetime, timedelta
from hypothesis import given, strategies as st, settings

from app.services.circuit_breaker import (
    CircuitBreaker,
    CircuitState,
    CircuitBreakerError,
)


# Unit Tests


def test_circuit_breaker_initialization():
    """Test circuit breaker initializes with correct defaults."""
    breaker = CircuitBreaker()

    assert breaker.state == CircuitState.CLOSED
    assert breaker.failure_count == 0
    assert breaker.success_count == 0
    assert breaker.last_failure_time is None
    assert breaker.failure_threshold == 5
    assert breaker.success_threshold == 2


def test_circuit_breaker_custom_thresholds():
    """Test circuit breaker with custom thresholds."""
    breaker = CircuitBreaker(
        failure_threshold=3, recovery_timeout_seconds=30, success_threshold=1
    )

    assert breaker.failure_threshold == 3
    assert breaker.recovery_timeout == timedelta(seconds=30)
    assert breaker.success_threshold == 1


@pytest.mark.asyncio
async def test_call_success_in_closed_state():
    """Test successful call in CLOSED state."""
    breaker = CircuitBreaker()

    async def success_func():
        return "success"

    result = await breaker.call(success_func)

    assert result == "success"
    assert breaker.state == CircuitState.CLOSED
    assert breaker.failure_count == 0


@pytest.mark.asyncio
async def test_call_failure_in_closed_state():
    """Test failed call in CLOSED state."""
    breaker = CircuitBreaker(failure_threshold=3)

    async def fail_func():
        raise ValueError("Test error")

    # First failure
    with pytest.raises(ValueError):
        await breaker.call(fail_func)

    assert breaker.state == CircuitState.CLOSED
    assert breaker.failure_count == 1

    # Second failure
    with pytest.raises(ValueError):
        await breaker.call(fail_func)

    assert breaker.state == CircuitState.CLOSED
    assert breaker.failure_count == 2


@pytest.mark.asyncio
async def test_circuit_opens_after_threshold():
    """Test circuit opens after reaching failure threshold."""
    breaker = CircuitBreaker(failure_threshold=3)

    async def fail_func():
        raise ValueError("Test error")

    # Trigger failures to reach threshold
    for i in range(3):
        with pytest.raises(ValueError):
            await breaker.call(fail_func)

    assert breaker.state == CircuitState.OPEN
    assert breaker.failure_count == 3
    assert breaker.last_failure_time is not None


@pytest.mark.asyncio
async def test_circuit_rejects_calls_when_open():
    """Test circuit rejects calls when OPEN."""
    breaker = CircuitBreaker(failure_threshold=2)

    async def fail_func():
        raise ValueError("Test error")

    # Open the circuit
    for i in range(2):
        with pytest.raises(ValueError):
            await breaker.call(fail_func)

    assert breaker.state == CircuitState.OPEN

    # Try to call - should raise CircuitBreakerError
    async def success_func():
        return "success"

    with pytest.raises(CircuitBreakerError) as exc_info:
        await breaker.call(success_func)

    assert "temporarily unavailable" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_circuit_transitions_to_half_open():
    """Test circuit transitions to HALF_OPEN after recovery timeout."""
    breaker = CircuitBreaker(failure_threshold=2, recovery_timeout_seconds=1)

    async def fail_func():
        raise ValueError("Test error")

    # Open the circuit
    for i in range(2):
        with pytest.raises(ValueError):
            await breaker.call(fail_func)

    assert breaker.state == CircuitState.OPEN

    # Wait for recovery timeout
    await asyncio.sleep(1.1)

    # Next call should transition to HALF_OPEN
    async def success_func():
        return "success"

    result = await breaker.call(success_func)

    assert result == "success"
    assert breaker.state == CircuitState.HALF_OPEN
    assert breaker.success_count == 1


@pytest.mark.asyncio
async def test_circuit_closes_after_success_threshold():
    """Test circuit closes after reaching success threshold in HALF_OPEN."""
    breaker = CircuitBreaker(
        failure_threshold=2, recovery_timeout_seconds=1, success_threshold=2
    )

    async def fail_func():
        raise ValueError("Test error")

    # Open the circuit
    for i in range(2):
        with pytest.raises(ValueError):
            await breaker.call(fail_func)

    # Wait for recovery timeout
    await asyncio.sleep(1.1)

    # Successful calls to close circuit
    async def success_func():
        return "success"

    # First success - should be HALF_OPEN
    await breaker.call(success_func)
    assert breaker.state == CircuitState.HALF_OPEN
    assert breaker.success_count == 1

    # Second success - should close circuit
    await breaker.call(success_func)
    assert breaker.state == CircuitState.CLOSED
    assert breaker.success_count == 0
    assert breaker.failure_count == 0


@pytest.mark.asyncio
async def test_circuit_reopens_on_failure_in_half_open():
    """Test circuit reopens on failure during HALF_OPEN state."""
    breaker = CircuitBreaker(failure_threshold=2, recovery_timeout_seconds=1)

    async def fail_func():
        raise ValueError("Test error")

    # Open the circuit
    for i in range(2):
        with pytest.raises(ValueError):
            await breaker.call(fail_func)

    # Wait for recovery timeout
    await asyncio.sleep(1.1)

    # Successful call to enter HALF_OPEN
    async def success_func():
        return "success"

    await breaker.call(success_func)
    assert breaker.state == CircuitState.HALF_OPEN

    # Failure should reopen circuit
    with pytest.raises(ValueError):
        await breaker.call(fail_func)

    assert breaker.state == CircuitState.OPEN
    assert breaker.success_count == 0


@pytest.mark.asyncio
async def test_success_resets_failure_count_in_closed():
    """Test success resets failure count in CLOSED state."""
    breaker = CircuitBreaker(failure_threshold=5)

    async def fail_func():
        raise ValueError("Test error")

    async def success_func():
        return "success"

    # Some failures
    for i in range(3):
        with pytest.raises(ValueError):
            await breaker.call(fail_func)

    assert breaker.failure_count == 3

    # Success should reset count
    await breaker.call(success_func)
    assert breaker.failure_count == 0
    assert breaker.state == CircuitState.CLOSED


def test_get_state():
    """Test get_state returns correct information."""
    breaker = CircuitBreaker()

    state = breaker.get_state()

    assert state["state"] == "closed"
    assert state["failure_count"] == 0
    assert state["success_count"] == 0
    assert state["last_failure_time"] is None


@pytest.mark.asyncio
async def test_get_state_after_failure():
    """Test get_state after failures."""
    breaker = CircuitBreaker(failure_threshold=2)

    async def fail_func():
        raise ValueError("Test error")

    # Trigger failure
    with pytest.raises(ValueError):
        await breaker.call(fail_func)

    state = breaker.get_state()

    assert state["state"] == "closed"
    assert state["failure_count"] == 1
    assert state["last_failure_time"] is not None


@pytest.mark.asyncio
async def test_call_with_args_and_kwargs():
    """Test call passes args and kwargs correctly."""
    breaker = CircuitBreaker()

    async def func_with_args(a, b, c=None):
        return f"{a}-{b}-{c}"

    result = await breaker.call(func_with_args, "x", "y", c="z")

    assert result == "x-y-z"


# Property-Based Tests


@settings(deadline=None)
@given(st.integers(min_value=1, max_value=10))
@pytest.mark.asyncio
async def test_property_circuit_opens_after_threshold(failure_threshold):
    """Property: Circuit opens after exactly failure_threshold consecutive failures."""
    breaker = CircuitBreaker(failure_threshold=failure_threshold)

    async def fail_func():
        raise ValueError("Test error")

    # Trigger failures up to threshold
    for i in range(failure_threshold):
        with pytest.raises(ValueError):
            await breaker.call(fail_func)

    # Circuit should be open
    assert breaker.state == CircuitState.OPEN
    assert breaker.failure_count == failure_threshold


@settings(deadline=None)
@given(st.integers(min_value=1, max_value=5))
@pytest.mark.asyncio
async def test_property_circuit_closes_after_success_threshold(success_threshold):
    """Property: Circuit closes after success_threshold successes in HALF_OPEN."""
    breaker = CircuitBreaker(
        failure_threshold=2,
        recovery_timeout_seconds=1,
        success_threshold=success_threshold,
    )

    async def fail_func():
        raise ValueError("Test error")

    async def success_func():
        return "success"

    # Open circuit
    for i in range(2):
        with pytest.raises(ValueError):
            await breaker.call(fail_func)

    # Wait for recovery
    await asyncio.sleep(1.1)

    # Trigger successes to close circuit
    for i in range(success_threshold):
        await breaker.call(success_func)

    # Circuit should be closed
    assert breaker.state == CircuitState.CLOSED
    assert breaker.failure_count == 0


@settings(deadline=None)
@given(st.integers(min_value=1, max_value=60))
@pytest.mark.asyncio
async def test_property_recovery_timeout_respected(timeout_seconds):
    """Property: Circuit stays OPEN until recovery timeout passes."""
    breaker = CircuitBreaker(
        failure_threshold=1, recovery_timeout_seconds=timeout_seconds
    )

    async def fail_func():
        raise ValueError("Test error")

    async def success_func():
        return "success"

    # Open circuit
    with pytest.raises(ValueError):
        await breaker.call(fail_func)

    assert breaker.state == CircuitState.OPEN

    # Manually set last_failure_time to test timeout
    breaker.last_failure_time = datetime.now() - timedelta(seconds=timeout_seconds - 1)

    # Should still be rejected (timeout not reached)
    with pytest.raises(CircuitBreakerError):
        await breaker.call(success_func)

    # Set time past timeout
    breaker.last_failure_time = datetime.now() - timedelta(seconds=timeout_seconds + 1)

    # Should transition to HALF_OPEN
    result = await breaker.call(success_func)
    assert result == "success"
    assert breaker.state == CircuitState.HALF_OPEN
