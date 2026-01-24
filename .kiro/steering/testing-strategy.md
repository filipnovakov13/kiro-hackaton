---
inclusion: fileMatch
fileMatchPattern: "**/tests/**"
---

# Testing Strategy

## Run Tests from Root
```bash
# ✅ CORRECT
python -m pytest backend/tests/test_file.py -v

# ❌ WRONG
cd backend && pytest tests/test_file.py
```
Python imports require root as working directory.


## Async Patterns

### Async Generators (CRITICAL)
```python
# ✅ Factory returns fresh generator each call
def mock_deepseek_client():
    client = MagicMock()
    async def mock_stream():
        yield {"type": "token", "content": "Hello"}
    def create_stream(*args, **kwargs):  # MUST accept *args, **kwargs
        return mock_stream()
    client.stream_chat = MagicMock(side_effect=create_stream)  # NOT AsyncMock
    return client

# ❌ Reuses exhausted generator
client.stream_chat = AsyncMock(return_value=mock_stream())
```

### Async Methods
```python
# ✅ Use AsyncMock for async methods
mock_service.embed_query = AsyncMock(return_value=[0.1] * 512)

# ❌ MagicMock doesn't work with await
mock_service.embed_query = MagicMock(return_value=[0.1] * 512)
```

### Async Test Markers
```python
@pytest.mark.asyncio  # Required for async tests
async def test_async_function():
    result = await some_async_function()
```


## Property-Based Testing (Hypothesis)

### Create Mocks Inside Tests
```python
# ✅ Fresh mocks per example
@settings(deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.integers(min_value=1, max_value=10000))
@pytest.mark.asyncio
async def test_property(length):
    mock_client = MagicMock()  # Create inside test
    # ... test logic

# ❌ Fixtures reused across examples
@given(st.integers(min_value=1, max_value=10000))
async def test_property(mock_client, length):  # Fixture causes issues
```

### Health Check Suppressions
```python
@settings(
    deadline=None,  # Remove timeout for async
    suppress_health_check=[
        HealthCheck.function_scoped_fixture,
        HealthCheck.large_base_example
    ]
)
```

### Common Properties
```python
# Output bounded
@given(st.integers(min_value=1, max_value=10000))
async def test_property_bounded(size):
    assert len(result) <= MAX_SIZE

# Dimensions correct
@given(st.lists(st.floats(), min_size=512, max_size=512))
async def test_property_dimensions(embedding):
    assert len(result) == 512
```


## Database Testing

```python
@pytest.fixture
def mock_db_session():
    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    return db

# Query with results
@pytest.mark.asyncio
async def test_get_data(mock_db_session):
    mock_result = MagicMock()
    mock_result.fetchone = AsyncMock(return_value=("data1", "data2"))
    mock_db_session.execute = AsyncMock(return_value=mock_result)
    result = await service.get_data()
```

### BLOB Serialization
```python
import numpy as np
embedding_bytes = np.array([0.1] * 512, dtype=np.float32).tobytes()
embedding = np.frombuffer(embedding_bytes, dtype=np.float32).tolist()
```


## Test Organization

### Structure
```
backend/tests/
├── test_service.py              # Unit tests
├── test_service_properties.py   # Property-based tests
└── test_integration.py          # Integration tests
```

### Naming
- Unit: `test_method_success`, `test_method_error_handling`
- Property: `test_property_invariant_description`
- Integration: `test_integration_full_flow`


## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `TypeError: 'async for' requires __aiter__` | Exhausted async generator | Use factory pattern |
| Hypothesis tests fail intermittently | Fixture reused across examples | Create mocks inside test |
| `ModuleNotFoundError: No module named 'app'` | Running from wrong directory | Run from workspace root |
| `TypeError: object MagicMock can't be used in 'await'` | MagicMock instead of AsyncMock | Use AsyncMock for async methods |
| Tests timeout | Default deadline too short | Add `@settings(deadline=None)` |


## Coverage Guidelines

- **Unit**: Happy path, error cases, boundaries, state transitions
- **Property**: Invariants, boundaries, constraints, idempotency
- **Integration**: End-to-end flows, error recovery, external failures, concurrency


## Server Integration Testing

### Use Subprocess, Not Threading
```python
# ✅ Subprocess - clean isolation and termination
import subprocess
import sys

@pytest.fixture(scope="class")
def running_server():
    backend_root = Path(__file__).parent.parent
    server_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", 
         "--host", "127.0.0.1", "--port", "8001"],
        cwd=str(backend_root),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    # Wait for server startup...
    yield "http://127.0.0.1:8001"
    server_process.terminate()
    server_process.wait(timeout=5)

# ❌ Threading - creates non-daemon threads that hang process
server_thread = threading.Thread(target=run_server, daemon=True)
```

**Why**: Database connection pools create non-daemon threads that prevent process exit.
## References

- [Pytest Documentation](https://docs.pytest.org/)
- [Hypothesis Documentation](https://hypothesis.readthedocs.io/)
- [Python AsyncIO Testing](https://docs.python.org/3/library/unittest.mock.html#unittest.mock.AsyncMock)
- [Property-Based Testing Guide](https://hypothesis.works/articles/what-is-property-based-testing/)
- [Python Subprocess Module](https://docs.python.org/3/library/subprocess.html)