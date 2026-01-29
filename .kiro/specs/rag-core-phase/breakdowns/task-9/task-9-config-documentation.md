# Task Breakdown: Task 9 - Configuration & Documentation

## Parent Task
Task 9: Configuration & Documentation

## Complexity
LOW

## Estimated Duration
2-3 hours total

## Overview
Update environment variables, API documentation, and README with Phase 2 features and setup instructions.

---

## Sub-Task 9.1: Update Environment Variables
**Duration**: 45 min  
**Files**: 
- `backend/.env.template`
- `frontend/.env.template`  
**Dependencies**: None  

**Scope**:
- Add all new env vars to templates
- Document each variable with description
- Set sensible defaults
- Update README with configuration guide

**Acceptance**:
- [ ] All env vars documented
- [ ] Descriptions clear
- [ ] Defaults sensible
- [ ] README updated

**Backend Environment Variables**:
```bash
# DeepSeek API
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# Voyage AI (Embeddings)
VOYAGE_API_KEY=your_voyage_api_key_here

# Response Cache
RESPONSE_CACHE_MAX_SIZE=1000
RESPONSE_CACHE_TTL_SECONDS=3600

# Rate Limiting
RATE_LIMIT_QUERIES_PER_HOUR=100
RATE_LIMIT_MAX_CONCURRENT_STREAMS=5

# Spending Limits
DEFAULT_SPENDING_LIMIT_USD=5.00

# Session Management
SESSION_CLEANUP_INTERVAL_HOURS=24
SESSION_MAX_AGE_DAYS=30

# Database
DATABASE_URL=sqlite:///./data/iubar.db

# Vector Store
CHROMA_PERSIST_DIRECTORY=./data/chroma
```

**Frontend Environment Variables**:
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT_MS=30000

# Feature Flags
VITE_ENABLE_FOCUS_CARET=true
VITE_ENABLE_SOURCE_ATTRIBUTION=true
VITE_ENABLE_STREAMING=true

# UI Configuration
VITE_MAX_MESSAGE_LENGTH=6000
VITE_DEFAULT_PANE_SPLIT=70
```

---

## Sub-Task 9.2: Update API Documentation
**Duration**: 60 min  
**Files**: 
- `README.md` (API section)
**Dependencies**: None  

**Scope**:
- Add all chat endpoints to documentation
- Document SSE event formats
- Add example requests/responses
- Document error codes

**Acceptance**:
- [ ] All endpoints documented in #[[file:README.md]]
- [ ] SSE format documented
- [ ] Examples provided
- [ ] Error codes listed

**Endpoints to Document**:

### POST /api/chat/sessions
Create a new chat session.

**Request**:
```json
{
  "document_id": "uuid-string"  // optional
}
```

**Response**:
```json
{
  "session_id": "uuid-string",
  "document_id": "uuid-string",
  "created_at": "2026-01-24T10:00:00Z",
  "message_count": 0
}
```

### GET /api/chat/sessions
List all chat sessions.

**Response**:
```json
{
  "sessions": [
    {
      "session_id": "uuid-string",
      "document_id": "uuid-string",
      "created_at": "2026-01-24T10:00:00Z",
      "message_count": 5
    }
  ]
}
```

### GET /api/chat/sessions/{id}
Get session details with message history.

**Response**:
```json
{
  "session_id": "uuid-string",
  "document_id": "uuid-string",
  "created_at": "2026-01-24T10:00:00Z",
  "messages": [
    {
      "id": "uuid-string",
      "role": "user",
      "content": "What is AI?",
      "created_at": "2026-01-24T10:01:00Z"
    },
    {
      "id": "uuid-string",
      "role": "assistant",
      "content": "AI is...",
      "created_at": "2026-01-24T10:01:05Z",
      "metadata": {
        "sources": [...]
      }
    }
  ]
}
```

### DELETE /api/chat/sessions/{id}
Delete a session and all its messages.

**Response**: 204 No Content

### POST /api/chat/sessions/{id}/messages
Send a message and receive streaming response.

**Request**:
```json
{
  "message": "What is this document about?",
  "focus_context": {
    "start_char": 100,
    "end_char": 250,
    "context_text": "relevant section..."
  }
}
```

**Response**: SSE stream

**SSE Event Formats**:
```
event: token
data: {"token": "Hello"}

event: source
data: {"chunk_id": "uuid", "document_id": "uuid", "similarity": 0.15, "text": "..."}

event: done
data: {}

event: error
data: {"error": "Error message"}
```

**Error Codes**:
- 400: Invalid input (message too long, invalid format)
- 404: Session or document not found
- 429: Rate limit exceeded
- 500: Internal server error
- 503: DeepSeek API unavailable

---

## Sub-Task 9.3: Update README
**Duration**: 45 min  
**Files**: 
- #[[file:README.md]]
**Dependencies**: None  

**Scope**:
- Document Phase 2 features
- Add setup instructions for new services
- Add usage examples
- Document testing procedures

**Acceptance**:
- [ ] Phase 2 features documented in #[[file:README.md]]
- [ ] Setup instructions clear
- [ ] Usage examples provided
- [ ] Testing procedures documented

**README Structure**:

```markdown
# Iubar - AI-Powered Document Chat

## Features

### Phase 1: Document Management ✅
- Document upload (PDF, TXT, MD)
- Chunking and embedding
- Vector storage with ChromaDB

### Phase 2: RAG Core ✅
- Chat sessions with message history
- Streaming responses via SSE
- Source attribution with chunk references
- Focus caret for contextual queries
- Response caching for cost optimization
- Rate limiting and spending controls
- Document summaries for better context

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- DeepSeek API key
- Voyage AI API key

### Backend Setup

1. Install dependencies:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

2. Configure environment:
```bash
cp .env.template .env
# Edit .env with your API keys
```

3. Run migrations:
```bash
python -m alembic upgrade head
```

4. Start server:
```bash
python start_server.py
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure environment:
```bash
cp .env.template .env
# Edit .env if needed
```

3. Start dev server:
```bash
npm run dev
```

## Usage

### Upload a Document
```bash
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@document.pdf"
```

### Create Chat Session
```bash
curl -X POST http://localhost:8000/api/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"document_id": "uuid-here"}'
```

### Send Message
```bash
curl -X POST http://localhost:8000/api/chat/sessions/{session_id}/messages \
  -H "Content-Type: application/json" \
  -d '{"message": "What is this document about?"}'
```

## Testing

### Run All Tests
```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

### Run Integration Tests
```bash
cd backend
pytest tests/test_*_integration.py
```

### Run E2E Tests
```bash
cd frontend
npm run test:e2e
```

## Architecture

See `steering/structure.md` for detailed architecture documentation.

## API Documentation

See `README.md` API section for complete API reference.

## License

MIT


---

## Implementation Order

1. **Phase 1: Environment Variables** (45 min)
   - 9.1: Update .env.template files

2. **Phase 2: API Documentation** (60 min)
   - 9.2: Document all endpoints and SSE format

3. **Phase 3: README** (45 min)
   - 9.3: Update README with Phase 2 features

---

## Testing Strategy

### Validation
- Verify all env vars are documented
- Verify API docs match actual endpoints
- Verify README instructions work (manual test)

### Review
- Have team member review documentation
- Check for clarity and completeness
- Verify examples are correct

---

## Rollback Plan

Documentation changes are low-risk:
1. Revert to previous commit if needed
2. Fix errors and re-commit

---

## Notes

- Keep documentation concise and clear
- Use examples liberally
- Link to detailed docs where appropriate
- Update documentation as features change
