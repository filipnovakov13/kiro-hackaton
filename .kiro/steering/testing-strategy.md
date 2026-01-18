# Testing Strategy & Best Practices

## Overview

This document captures testing patterns, common pitfalls, and solutions discovered during the development of Iubar. Follow these guidelines to write robust, maintainable tests.

---

## Running Tests

### Critical: Always Run from Root Directory

**Problem**: Running pytest from subdirectories (e.g., `cd backend && pytest`) causes import failures and test discovery issues.

**Solution**: Always run tests from the workspace root:

```bash
# ✅ CORRECT - Run from root
python -m pytest backend/tests/test_document_summary.py -v

# ❌ WRONG - Don't cd into backend first
cd backend && python -m pytest tests/test_document_summary.py -v
```

**Why**: Python's import system and pytest's test discovery rely on the root directory being the working directory to resolve module paths correctly.

---

## Async Testing Patterns

### 1. Mocking Async Generators (CRITICAL)

**Problem**: Async generators cannot be reused. Once exhausted, they cannot be iterated again. Using `return_value` or incorrect `side_effect` patterns causes `TypeError: 'async for' requires an object with __aiter__ method`.

**Solution**: Use a factory function that returns a **fresh generator instance** each time:

```python
# ✅ CORRECT - Factory function returns new generator each time
@pytest.fixture
def mock_deepseek_client():
    client = MagicMock()

    async def mock_stream():
        yield {"type": "token", "content": "Hello"}
        yield {"type": "done", "prompt_tokens": 10}

    # Factory function that returns a new generator
    # MUST accept *args, **kwargs to handle method call arguments
    def create_stream(*args, **kwargs):
        return mock_stream()

    # Use MagicMock (NOT AsyncMock) with side_effect
    client.stream_chat = MagicMock(side_effect=create_stream)
    return client

# ❌ WRONG - Using AsyncMock instead of MagicMock
def mock_deepseek_client():
    client = MagicMock()
    
    async def mock_stream():
        yield {"type": "token", "content": "Hello"}
    
    def create_stream(*args, **kwargs):
        return mock_stream()
    
    # AsyncMock wraps the result in a coroutine, breaking async iteration
    client.stream_chat = AsyncMock(side_effect=create_stream)
    return client

# ❌ WRONG - Factory function doesn't accept arguments
def mock_deepseek_client():
    client = MagicMock()
    
    async def mock_stream():
        yield {"type": "token", "content": "Hello"}
    
    # Missing *args, **kwargs - will fail when method is called with arguments
    def create_stream():
        return mock_stream()
    
    client.stream_chat = MagicMock(side_effect=create_stream)
    return client

# ❌ WRONG - Reuses same generator (fails on second call)
def mock_deepseek_client():
    client = MagicMock()
    
    async def mock_stream():
        yield {"type": "token", "content": "Hello"}
    
    # This creates ONE generator that gets exhausted
    client.stream_chat = AsyncMock(return_value=mock_stream())
    return client
```

**Key Pattern**:
1. Define the async generator function
2. Create a factory function that **returns** the generator (not calls it)
3. Factory function MUST accept `*args, **kwargs` to handle method call arguments
4. Use `MagicMock(side_effect=factory_function)` - NOT AsyncMock
5. No lambda, no call parentheses on the factory function

### 2. Mocking Async Methods

```python
# ✅ CORRECT - Use AsyncMock for async methods
mock_service.embed_query = AsyncMock(return_value=[0.1] * 512)
mock_db.execute = AsyncMock()
mock_db.commit = AsyncMock()

# ❌ WRONG - Regular MagicMock doesn't work with await
mock_service.embed_query = MagicMock(return_value=[0.1] * 512)
```

### 3. Async Test Markers

```python
# ✅ CORRECT - Mark async tests
@pytest.mark.asyncio
async def test_async_function():
    result = await some_async_function()
    assert result is not None

# ❌ WRONG - Missing marker causes test to be skipped
async def test_async_function():
    result = await some_async_function()
```

---

## Property-Based Testing with Hypothesis

### 1. Function-Scoped Fixtures Issue

**Problem**: Hypothesis runs tests multiple times with different inputs. Function-scoped fixtures are created once per test function, not per example, causing issues when fixtures contain mutable state or generators.

**Solution**: Create fresh mocks **inside** the test function, not as fixtures:

```python
# ✅ CORRECT - Create mocks inside test for property-based tests
@settings(deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.integers(min_value=1, max_value=10000))
@pytest.mark.asyncio
async def test_property_summary_never_exceeds_500_chars(length):
    # Create fresh mocks for each hypothesis example
    mock_deepseek = MagicMock()
    
    async def mock_stream():
        yield {"type": "token", "content": "A" * length}
        yield {"type": "done"}
    
    def create_stream():
        return mock_stream()
    
    mock_deepseek.stream_chat = AsyncMock(side_effect=create_stream)
    
    # Create service with fresh mocks
    service = DocumentSummaryService(mock_deepseek, mock_embedding, mock_db)
    result = await service.generate_summary("test-doc", "content", "title")
    
    assert len(result.summary_text) <= 500

# ❌ WRONG - Using fixtures causes issues with multiple examples
@given(st.integers(min_value=1, max_value=10000))
@pytest.mark.asyncio
async def test_property_summary_never_exceeds_500_chars(summary_service, length):
    # Fixture is reused across examples - can cause failures
    result = await summary_service.generate_summary("test-doc", "content", "title")
```

### 2. Health Check Suppressions

```python
# Suppress function-scoped fixture warning
@settings(suppress_health_check=[HealthCheck.function_scoped_fixture])

# Suppress large base example warning (for large data structures like 512-element lists)
@settings(suppress_health_check=[HealthCheck.large_base_example])

# Suppress both
@settings(suppress_health_check=[
    HealthCheck.function_scoped_fixture,
    HealthCheck.large_base_example
])

# Remove deadline for async tests (prevents timeout issues)
@settings(deadline=None)
```

### 3. Common Property-Based Test Patterns

```python
# Property: Output never exceeds limit
@given(st.integers(min_value=1, max_value=10000))
async def test_property_output_bounded(input_size):
    result = await process(input_size)
    assert len(result) <= MAX_SIZE

# Property: Dimensions are always correct
@given(st.lists(st.floats(min_value=-1.0, max_value=1.0), min_size=512, max_size=512))
async def test_property_dimensions_correct(embedding):
    result = await embed(embedding)
    assert len(result) == 512

# Property: Retries occur correctly
@given(st.integers(min_value=1, max_value=5))
async def test_property_retries_respected(max_retries):
    call_count = 0
    # Test that retries happen exactly max_retries times
    assert call_count == max_retries
```

---

## Database Testing

### 1. Mocking Database Sessions

```python
@pytest.fixture
def mock_db_session():
    """Create mock database session."""
    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    return db

# For queries that return results
@pytest.mark.asyncio
async def test_get_data(mock_db_session):
    mock_result = MagicMock()
    mock_result.fetchone = AsyncMock(return_value=("data1", "data2"))
    mock_db_session.execute = AsyncMock(return_value=mock_result)
    
    result = await service.get_data()
    assert result is not None
```

### 2. Testing BLOB Serialization

```python
import numpy as np

# Serialize embedding to bytes
embedding_bytes = np.array([0.1] * 512, dtype=np.float32).tobytes()

# Deserialize from bytes
embedding = np.frombuffer(embedding_bytes, dtype=np.float32).tolist()

# Test round-trip
assert len(embedding) == 512
assert all(abs(a - b) < 0.0001 for a, b in zip(original, embedding))
```

---

## Test Organization

### 1. File Structure

```
backend/tests/
├── test_service_name.py          # Unit tests for service
├── test_service_name_properties.py  # Property-based tests (optional separate file)
└── test_integration.py           # Integration tests
```

### 2. Test Sections

```python
"""Tests for ServiceName."""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck

# Unit Tests

@pytest.fixture
def mock_dependency():
    """Create mock dependency."""
    pass

def test_initialization():
    """Test service initializes correctly."""
    pass

@pytest.mark.asyncio
async def test_method_success():
    """Test method succeeds with valid input."""
    pass

@pytest.mark.asyncio
async def test_method_error_handling():
    """Test method handles errors correctly."""
    pass

# Property-Based Tests

@settings(deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.integers(min_value=1, max_value=100))
@pytest.mark.asyncio
async def test_property_invariant(value):
    """Property: Invariant holds for all inputs."""
    pass
```

### 3. Test Naming Conventions

```python
# Unit tests
def test_method_name_success()
def test_method_name_with_invalid_input()
def test_method_name_error_handling()

# Property-based tests
def test_property_invariant_description()
def test_property_boundary_condition()

# Integration tests
def test_integration_full_flow()
def test_integration_error_recovery()
```

---

## Common Pitfalls & Solutions

### 1. Async Generator Exhaustion

**Symptom**: `TypeError: 'async for' requires an object with __aiter__ method, got coroutine`

**Cause**: Trying to reuse an exhausted async generator

**Solution**: Use factory function pattern (see Async Testing Patterns above)

### 2. Hypothesis Fixture Conflicts

**Symptom**: Tests fail intermittently or only on certain hypothesis examples

**Cause**: Function-scoped fixtures being reused across hypothesis examples

**Solution**: Create mocks inside test function, suppress health check

### 3. Import Errors in Tests

**Symptom**: `ModuleNotFoundError: No module named 'app'`

**Cause**: Running tests from wrong directory

**Solution**: Always run from workspace root

### 4. Async Mock Not Awaitable

**Symptom**: `TypeError: object MagicMock can't be used in 'await' expression`

**Cause**: Using `MagicMock` instead of `AsyncMock` for async methods

**Solution**: Use `AsyncMock` for all async methods

### 5. Test Timeout with Property-Based Tests

**Symptom**: Tests timeout or take very long

**Cause**: Default deadline is too short for async property tests

**Solution**: Add `@settings(deadline=None)` to async property tests

---

## Test Coverage Guidelines

### 1. Unit Test Coverage

- Test happy path (success case)
- Test error cases (invalid input, exceptions)
- Test boundary conditions (empty, max size, edge values)
- Test state transitions (for stateful services)

### 2. Property-Based Test Coverage

- Test invariants (properties that always hold)
- Test boundaries (min/max values)
- Test data structure constraints (size, dimensions)
- Test idempotency (same input → same output)

### 3. Integration Test Coverage

- Test full user flows (end-to-end)
- Test error recovery
- Test external service failures
- Test concurrent operations

---

## Performance Testing

### 1. Async Performance

```python
import asyncio
import time

@pytest.mark.asyncio
async def test_concurrent_operations():
    """Test service handles concurrent operations."""
    start = time.time()
    
    tasks = [service.process(i) for i in range(10)]
    results = await asyncio.gather(*tasks)
    
    elapsed = time.time() - start
    assert elapsed < 1.0  # Should complete in under 1 second
```

### 2. Rate Limiting Tests

```python
@pytest.mark.asyncio
async def test_rate_limit_enforcement():
    """Test rate limiter enforces limits."""
    # Make requests up to limit
    for i in range(100):
        await rate_limiter.check_query_limit("user-1")
    
    # Next request should fail
    with pytest.raises(RateLimitError):
        await rate_limiter.check_query_limit("user-1")
```

---

## Debugging Tests

### 1. Print Debugging

```python
# Use pytest -s to see print output
@pytest.mark.asyncio
async def test_with_debug():
    result = await service.method()
    print(f"Result: {result}")  # Visible with pytest -s
    assert result is not None
```

### 2. Hypothesis Debugging

```python
# Add seed to reproduce specific failure
@settings(deadline=None)
@given(st.integers(min_value=1, max_value=100))
def test_property(value):
    # If test fails, hypothesis prints seed
    # Add @seed(12345) to reproduce
    pass

# Run with specific seed
@seed(182007920495910947573713311906866559484)
@given(st.integers(min_value=1, max_value=100))
def test_property(value):
    pass
```

### 3. Verbose Output

```bash
# Run with verbose output
python -m pytest backend/tests/test_file.py -v

# Run with extra verbose output (shows test names as they run)
python -m pytest backend/tests/test_file.py -vv

# Run with print statements visible
python -m pytest backend/tests/test_file.py -s

# Run specific test
python -m pytest backend/tests/test_file.py::test_name -v
```

---

## Server Integration Testing

### Critical: Use Subprocess for Server Tests, Not Threading

**Problem**: Starting servers (like uvicorn) in threads for integration tests can create non-daemon threads (e.g., `_connection_worker_thread` from database connection pools) that prevent the test process from exiting, causing tests to hang indefinitely.

**Symptom**: 
- All tests pass successfully
- Test process hangs after completion
- Manual process kill required (Task Manager on Windows, `kill` on Unix)
- Thread enumeration shows non-daemon threads still alive

**Root Cause**: When uvicorn runs in a thread, its database connection pool creates non-daemon worker threads that keep the process alive even after tests complete.

**Solution**: Use `subprocess.Popen()` instead of `threading.Thread()` for server integration tests:

```python
# ✅ CORRECT - Use subprocess for server
import subprocess
import sys
from pathlib import Path

@pytest.fixture(scope="class")
def running_server():
    """Start the FastAPI server for testing."""
    backend_root = Path(__file__).parent.parent
    server_process = None
    
    try:
        test_port = 8001
        
        # Start server in subprocess
        server_process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(test_port),
                "--log-level",
                "error",
            ],
            cwd=str(backend_root),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        
        # Wait for server to start
        base_url = f"http://127.0.0.1:{test_port}"
        max_attempts = 30
        for attempt in range(max_attempts):
            try:
                response = requests.get(f"{base_url}/health", timeout=1)
                if response.status_code == 200:
                    break
            except requests.exceptions.RequestException:
                pass
            time.sleep(0.1)
        else:
            if server_process:
                server_process.terminate()
            pytest.fail("Server failed to start within timeout")
        
        yield base_url
    
    finally:
        # Properly terminate the server process
        if server_process:
            server_process.terminate()
            try:
                server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server_process.kill()

# ❌ WRONG - Using threading creates hanging threads
import threading
import uvicorn

@pytest.fixture(scope="class")
def running_server():
    """Start the FastAPI server for testing."""
    def run_server():
        uvicorn.run(app, host="127.0.0.1", port=8001)
    
    # This creates non-daemon threads that prevent process exit
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    time.sleep(2)  # Wait for server to start
    yield "http://127.0.0.1:8001"
    
    # No clean way to stop the server - threads remain alive
```

**Key Benefits of Subprocess Approach**:
1. **Clean Isolation**: Server runs in separate process with its own resources
2. **Proper Cleanup**: `terminate()` and `kill()` ensure process stops
3. **No Thread Leaks**: Parent process exits cleanly without waiting for threads
4. **Better Control**: Can monitor server startup and handle failures gracefully

**When to Use Each Approach**:
- **Subprocess**: Server integration tests, long-running processes, external services
- **Threading**: Only for truly short-lived background tasks that don't create their own threads
- **AsyncIO**: Async operations within the same event loop (preferred for most async code)

---

## References

- [Pytest Documentation](https://docs.pytest.org/)
- [Hypothesis Documentation](https://hypothesis.readthedocs.io/)
- [Python AsyncIO Testing](https://docs.python.org/3/library/unittest.mock.html#unittest.mock.AsyncMock)
- [Property-Based Testing Guide](https://hypothesis.works/articles/what-is-property-based-testing/)
- [Python Subprocess Module](https://docs.python.org/3/library/subprocess.html)
