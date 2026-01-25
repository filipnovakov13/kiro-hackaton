# Task Breakdown: Task 8 - Integration & Testing

## Parent Task
Task 8: Integration & Testing

## Complexity
MEDIUM

## Estimated Duration
4-5 hours total

## Overview
End-to-end integration tests covering the complete RAG flow, focus caret, caching, error handling, and rate limiting.

---

## Sub-Task 8.1: End-to-End RAG Flow Test
**Duration**: 90 min  
**Files**: `backend/tests/test_e2e_rag_flow.py`  
**Dependencies**: All backend services, frontend API  

**Scope**:
- Create session → send message → receive streaming response
- Verify source attribution is correct
- Verify cost tracking is accurate
- Test with missing document summaries (fallback)

**Acceptance**:
- [ ] Full RAG flow works end-to-end
- [ ] Sources returned correctly
- [ ] Cost tracking accurate
- [ ] Fallback works without summaries
- [ ] Test passes consistently

**Test Structure**:
```python
def test_e2e_rag_flow():
    # 1. Upload document
    doc_id = upload_test_document()
    
    # 2. Create session
    session = create_session(doc_id)
    
    # 3. Send message
    response = send_message(session.id, "What is this document about?")
    
    # 4. Verify streaming response
    assert response.status == "streaming"
    tokens = collect_stream_tokens(response)
    assert len(tokens) > 0
    
    # 5. Verify sources
    sources = get_message_sources(session.id)
    assert len(sources) > 0
    assert all(s.document_id == doc_id for s in sources)
    
    # 6. Verify cost tracking
    stats = get_session_stats(session.id)
    assert stats.total_cost > 0
    assert stats.total_tokens > 0
```

---

## Sub-Task 8.2: Focus Caret Integration Test
**Duration**: 60 min  
**Files**: `backend/tests/test_focus_caret_integration.py`  
**Dependencies**: RAG service, focus caret logic  

**Scope**:
- Send query with focus context
- Verify chunk boosting is applied
- Verify context is included in prompt
- Verify focus context is stored in metadata

**Acceptance**:
- [ ] Focus context sent correctly
- [ ] Chunk boosting works (similarity adjusted)
- [ ] Context in prompt
- [ ] Metadata stored
- [ ] Test passes consistently

**Test Structure**:
```python
def test_focus_caret_integration():
    # 1. Create session with document
    session = create_session(doc_id)
    
    # 2. Send message with focus context
    focus_context = {
        "start_char": 100,
        "end_char": 250,
        "context_text": "relevant section..."
    }
    response = send_message(
        session.id, 
        "Explain this section",
        focus_context=focus_context
    )
    
    # 3. Verify chunk boosting
    sources = get_message_sources(session.id)
    focused_chunks = [s for s in sources if overlaps_focus(s, focus_context)]
    assert len(focused_chunks) > 0
    assert focused_chunks[0].similarity < 0.1  # boosted
    
    # 4. Verify context in prompt
    message = get_message(session.id, response.message_id)
    assert focus_context["context_text"] in message.metadata["prompt"]
    
    # 5. Verify metadata stored
    assert message.metadata["focus_context"] == focus_context
```

---

## Sub-Task 8.3: Cache Integration Test
**Duration**: 45 min  
**Files**: `backend/tests/test_cache_integration.py`  
**Dependencies**: ResponseCache, RAG service  

**Scope**:
- Send identical queries
- Verify cache hit on second query
- Verify cost savings (0 for cached)
- Test cache invalidation on document update

**Acceptance**:
- [ ] Cache hit works
- [ ] Cost is 0 for cached response
- [ ] Cache invalidates on document update
- [ ] Test passes consistently

**Test Structure**:
```python
def test_cache_integration():
    # 1. Send first query
    response1 = send_message(session.id, "What is AI?")
    cost1 = get_session_stats(session.id).total_cost
    
    # 2. Send identical query
    response2 = send_message(session.id, "What is AI?")
    cost2 = get_session_stats(session.id).total_cost
    
    # 3. Verify cache hit
    assert response1.content == response2.content
    assert cost2 == cost1  # no additional cost
    
    # 4. Update document
    update_document(doc_id, "new content")
    
    # 5. Send query again
    response3 = send_message(session.id, "What is AI?")
    cost3 = get_session_stats(session.id).total_cost
    
    # 6. Verify cache invalidated
    assert cost3 > cost2  # new cost incurred
```

---

## Sub-Task 8.4: Error Handling Integration Test
**Duration**: 60 min  
**Files**: `backend/tests/test_error_handling_integration.py`  
**Dependencies**: All services  

**Scope**:
- Test DeepSeek API failures during streaming
- Test network timeouts
- Test invalid input handling
- Test spending limit enforcement
- Verify user-friendly error messages

**Acceptance**:
- [ ] API failures handled gracefully
- [ ] Timeouts handled
- [ ] Invalid input rejected
- [ ] Spending limit enforced
- [ ] Error messages user-friendly
- [ ] Test passes consistently

**Test Structure**:
```python
def test_error_handling():
    # 1. Test API failure
    with mock_deepseek_failure():
        response = send_message(session.id, "test")
        assert response.status == "error"
        assert "temporarily unavailable" in response.error.lower()
    
    # 2. Test timeout
    with mock_timeout():
        response = send_message(session.id, "test")
        assert response.status == "error"
        assert "timeout" in response.error.lower()
    
    # 3. Test invalid input
    response = send_message(session.id, "x" * 10000)  # exceeds limit
    assert response.status == "error"
    assert "too long" in response.error.lower()
    
    # 4. Test spending limit
    set_spending_limit(session.id, 0.01)
    # Send expensive query
    response = send_message(session.id, "long query...")
    assert response.status == "error"
    assert "spending limit" in response.error.lower()
```

---

## Sub-Task 8.5: Rate Limiting Integration Test
**Duration**: 45 min  
**Files**: `backend/tests/test_rate_limiting_integration.py`  
**Dependencies**: RateLimiter service  

**Scope**:
- Test concurrent stream limits
- Test queries per hour limits
- Test backpressure handling
- Verify 429 responses with retry-after

**Acceptance**:
- [ ] Concurrent streams limited
- [ ] Queries per hour limited
- [ ] Backpressure works
- [ ] 429 responses correct
- [ ] Test passes consistently

**Test Structure**:
```python
def test_rate_limiting():
    # 1. Test concurrent streams
    sessions = [create_session() for _ in range(10)]
    responses = []
    for s in sessions:
        r = send_message_async(s.id, "test")
        responses.append(r)
    
    # Wait for all
    results = await_all(responses)
    
    # Verify some were rate limited
    limited = [r for r in results if r.status_code == 429]
    assert len(limited) > 0
    
    # 2. Test queries per hour
    for i in range(150):  # exceed 100/hour limit
        response = send_message(session.id, f"query {i}")
        if i >= 100:
            assert response.status_code == 429
            assert "retry-after" in response.headers
```

---

## Implementation Order

1. **Phase 1: Core Flow** (1.5 hours)
   - 8.1: E2E RAG flow test

2. **Phase 2: Feature Tests** (1.5 hours)
   - 8.2: Focus caret integration
   - 8.3: Cache integration

3. **Phase 3: Resilience Tests** (1.5 hours)
   - 8.4: Error handling
   - 8.5: Rate limiting

---

## Testing Strategy

### Test Environment
- Use test database (separate from dev/prod)
- Mock external APIs (DeepSeek) when needed
- Use test documents (small, predictable)

### Test Data
- Create fixtures for common test scenarios
- Use factories for generating test data
- Clean up after each test

### Assertions
- Verify functional correctness
- Verify performance (response times)
- Verify resource usage (memory, connections)

---

## Rollback Plan

If tests fail:
1. Identify failing component
2. Check logs for errors
3. Isolate issue with unit tests
4. Fix and re-run integration tests

---

## Notes

- Use pytest for Python tests
- Use pytest-asyncio for async tests
- Use pytest-mock for mocking
- Run tests in CI/CD pipeline
- Aim for >80% coverage on integration paths
