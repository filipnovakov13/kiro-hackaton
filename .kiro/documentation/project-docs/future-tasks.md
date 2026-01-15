# Future Tasks

Tasks to be triggered when specific project milestones are reached.

---

## Trigger: Frontend Directory Created

**When:** `frontend/` directory is created with `package.json` and test infrastructure

### ❌ Task: Kiro Configuration Property Tests (REMOVED)

**Status:** Removed on 2026-01-13

**Rationale:** The Kiro configuration tests (`frontend/tests/kiro-config/`) were removed because:
- Agent configurations were significantly updated with PRD-aligned prompts
- Hook configurations changed (format-on-save.json removed, new .kiro.hook format adopted)
- Tests were tightly coupled to specific configuration structures that evolved
- Maintaining tests for rapidly changing configuration files added overhead without proportional value

**Decision:** Focus testing efforts on core application functionality rather than IDE configuration files.

**Files removed:**
- `frontend/tests/kiro-config/format-hook.property.test.ts`
- `frontend/tests/kiro-config/agent-config.property.test.ts`
- `.kiro/hooks/format-on-save.json`
- `.kiro/hooks/create-pr.json`


---

## Trigger: Core MVP Functionality Complete

**When:** RAG pipeline working, chat interface functional (around Day 7-8)

### 🎨 Task: Visual Identity Design

**Priority**: High (Critical for "Apple-level simplicity" goal)
**Estimated Time**: 2-4 hours dedicated session
**Best Timing**: After core functionality works, before final polish (Day 8-9)

#### Scope

Create a cohesive visual identity for Iubar that embodies:
- Apple-level simplicity and attention to detail
- Calm, focused learning environment
- Delight in subtle interactions

#### Deliverables

1. **Color Palette**
   - Primary colors (background, text)
   - Accent color (for spark caret, interactive elements)
   - Semantic colors (success, error, warning)
   - Dark mode consideration (if time permits)

2. **Typography**
   - Font selection (heading, body, code)
   - Type scale (sizes, weights, line heights)
   - Reading-optimized settings for document viewer

3. **Spacing System**
   - Base unit and scale
   - Component spacing guidelines
   - Generous whitespace philosophy

4. **Component Styling**
   - Buttons (primary, secondary, ghost)
   - Input fields
   - Cards/panels
   - Chat bubbles
   - Focus caret (spark) design

5. **Micro-interactions**
   - Hover states
   - Focus states
   - Loading animations
   - Transition timings

6. **Icons & Illustrations**
   - Icon style (outline, filled, custom)
   - Empty states
   - Onboarding illustrations (if any)

#### Reference Inspiration
- [ ] Collect 5-10 reference apps/websites
- [ ] Note specific elements that resonate
- [ ] Define what "Iubar aesthetic" means

#### Questions to Answer
- What emotion should the app evoke? (calm? energizing? focused?)
- Should the spark caret be warm (amber/gold) or cool (blue/white)?
- How playful vs. professional should the tone be?
- Any specific design systems to build on? (Tailwind defaults? Custom?)

#### Implementation Notes
- Use TailwindCSS for rapid iteration
- Create design tokens in `tailwind.config.js`
- Consider creating a simple style guide component for reference

---

### 📄 Task: Define Demo Documents

**Priority**: High (Required for hackathon demo)
**Estimated Time**: 1-2 hours
**Best Timing**: Day 8-9, after core functionality stable

#### Scope

Select and prepare 3 demo documents that showcase Iubar's capabilities across different domains.

#### Deliverables

| Domain | Document Type | Purpose |
|--------|---------------|---------|
| **Technical** | ML paper, programming tutorial, or technical documentation | Demonstrate expertise adaptation, technical depth |
| **Business/Strategy** | Business case study, market analysis, or strategy document | Show professional context, structured thinking |
| **Creative/Philosophical** | Philosophy essay, creative writing guide, or thought piece | Showcase abstract reasoning, open-ended exploration |

#### Selection Criteria
- Documents should be publicly available or created for demo
- Length: 10-50 pages (enough to demonstrate chunking and navigation)
- Content should be engaging and demonstrate clear value
- Should highlight different aspects of the AI's adaptive personality

#### Questions to Answer
- Should we use real published documents or create custom demo content?
- What specific topics would resonate with hackathon judges?
- Do we need documents in multiple languages to show multilingual support?

#### Preparation Steps
- [ ] Source/create 3 documents
- [ ] Test each document through the full pipeline
- [ ] Prepare talking points for each demo scenario
- [ ] Create a demo script with specific questions to ask

---

### 🔄 Task: API Resilience Strategy

**Priority**: Medium-High (Critical for demo reliability)
**Estimated Time**: 2-3 hours
**Best Timing**: Day 7-8, during Intelligence Layer phase

#### Scope

Define strategies for handling unresponsive or failing external APIs (DeepSeek, Voyage) to ensure graceful degradation during demos.

#### Scenarios to Handle

1. **DeepSeek API Timeout/Failure**
   - Retry logic with exponential backoff
   - Fallback to cached responses if available
   - User-friendly error message
   - Optional: Secondary LLM fallback (e.g., local Ollama)

2. **Voyage Embedding API Failure**
   - Retry logic
   - Queue failed embeddings for later processing
   - Graceful degradation (show document without semantic search)
   - Optional: Local embedding fallback (all-MiniLM-L6-v2)

3. **Rate Limiting**
   - Request throttling
   - Queue management
   - User feedback on wait times

4. **Network Issues**
   - Connection timeout handling
   - Offline mode considerations
   - Clear error messaging

#### Deliverables

1. **Error Handling Middleware**
   - Centralized error handling for all API calls
   - Consistent error response format
   - Logging for debugging

2. **Retry Configuration**
   - Max retries per API
   - Backoff strategy (exponential with jitter)
   - Timeout thresholds

3. **Fallback Chain**
   - Primary → Retry → Cache → Fallback → Error
   - Document which fallbacks are available

4. **User Communication**
   - Loading states during retries
   - Clear error messages (simple, concise, informative)
   - Recovery suggestions

#### Error Message Tone
- Simple, concise, and informative
- No technical jargon for user-facing messages
- Include actionable next steps when possible

**Examples:**
- ✅ "Taking longer than usual. Retrying..." (during retry)
- ✅ "Couldn't reach the AI service. Try again in a moment." (after failure)
- ✅ "Using cached response while we reconnect." (fallback active)
- ❌ "DeepSeek API returned 503 Service Unavailable" (too technical)

---

## Post-MVP Tasks

### 📊 Task: Knowledge Graph Visualization

**Priority**: Medium (Future feature, architecturally important)
**Estimated Time**: TBD
**Best Timing**: Post-MVP

#### Concept
Visual representation of user's evolving knowledge system:
- Nodes = concepts/topics learned
- Edges = connections between concepts
- Size/color = mastery level
- Clusters = knowledge domains

#### Technical Considerations
- Graph database vs. SQLite with JSON
- Visualization library (D3.js, vis.js, custom WebGL)
- Real-time updates vs. periodic refresh
- Performance with large graphs

---

### 🔀 Task: Multi-Model Routing

**Priority**: Medium (Cost optimization enhancement)
**Estimated Time**: TBD
**Best Timing**: Post-MVP

#### Concept
Intelligent routing between multiple LLMs based on query complexity:
- Simple queries → DeepSeek (cheapest)
- Complex reasoning → Gemini 3 Flash
- Long context → Grok 4.1 Fast

#### Technical Considerations
- Query classification model/heuristics
- Fallback handling
- Cost tracking per model
- A/B testing framework

---

### 🔐 Task: User Authentication

**Priority**: Low for hackathon, High for production
**Estimated Time**: TBD
**Best Timing**: Post-hackathon

#### Scope
- User registration/login
- OAuth providers (Google, GitHub)
- Session management
- Data isolation between users

---

*Last Updated: January 13, 2026*


---

## Production Hardening Tasks (Added January 14, 2026)

These tasks were identified during Phase 1 Foundation design review. They address architectural improvements needed before production scale deployment.

### Priority Legend
- **P0**: Must fix before production deployment (blockers)
- **P1**: Should fix before scaling (>50 users)
- **P2**: Plan for production scale (>500 users)

---

## P0 - Production Blockers

### P0-1: Replace In-Memory Task Queue with Celery + Redis
**Effort**: 3-5 days | **Impact**: Data loss prevention, horizontal scaling

**Problem**: Current `TaskManager` uses in-memory dictionary. Server restart loses all task status. Cannot scale horizontally.

**Solution**:
```python
# Replace TaskManager with Celery tasks
from celery import Celery

celery_app = Celery('iubar', broker='redis://localhost:6379/0')

@celery_app.task(bind=True)
def process_document_task(self, task_id: str, file_path: str, file_type: str):
    self.update_state(state='CONVERTING', meta={'progress': 'Converting...'})
    # ... processing logic
```

**Files to modify**:
- `backend/app/services/task_manager.py` → Replace with Celery integration
- `backend/main.py` → Add Celery worker startup
- `docker-compose.yml` → Add Redis service
- `requirements.txt` → Add `celery`, `redis`

**References**:
- [Celery + FastAPI Guide](https://testdriven.io/courses/fastapi-celery/intro/)
- [Slack's Job Queue Architecture](https://slack.engineering/scaling-slacks-job-queue/)

---

### P0-2: Move Heavy Processing from BackgroundTasks to Celery Workers
**Effort**: 2-3 days | **Impact**: API performance, worker isolation

**Problem**: FastAPI's `BackgroundTasks` runs in the same event loop. Docling processing (5-10 min) blocks API responsiveness.

**Solution**: Use Celery workers in separate processes:
```python
# In api/documents.py
from app.tasks import process_document_task

@router.post("/upload")
async def upload_document(file: UploadFile):
    task_id = str(uuid.uuid4())
    # ... save file ...
    
    # Queue to Celery instead of BackgroundTasks
    process_document_task.delay(task_id, file_path, file_type)
    
    return {"task_id": task_id, "status": "pending"}
```

---

### P0-3: Add Circuit Breaker for Embedding Service
**Effort**: 1 day | **Impact**: Prevent cascading failures

**Problem**: No circuit breaker pattern. If Voyage AI is down, every request waits through all retries.

**Solution**:
```python
from circuitbreaker import circuit

class EmbeddingService:
    @circuit(failure_threshold=5, recovery_timeout=60)
    async def _embed_batch(self, texts: List[str], input_type: str):
        # ... existing logic ...
```

**Package**: `circuitbreaker` or `pybreaker`

---

### P0-4: Implement Docling Fallback Strategy (PyMuPDF)
**Effort**: 2-3 days | **Impact**: Reliability, 50x speed improvement for fallback

**Problem**: Docling can hang indefinitely, crash on certain PDFs, and is 50-100x slower than alternatives.

**Solution**: Multi-strategy processing pipeline:
```python
class DocumentProcessor:
    def __init__(self):
        self._strategies = [
            DoclingStrategy(timeout=120),  # Try sophisticated extraction first
            PyMuPDFStrategy(),              # Fast fallback (8s vs 8min)
            PlainTextStrategy()             # Last resort
        ]
    
    async def process_file(self, file_path: str, file_type: str):
        for strategy in self._strategies:
            try:
                return await asyncio.wait_for(
                    strategy.process(file_path),
                    timeout=strategy.timeout
                )
            except (asyncio.TimeoutError, ProcessingError):
                continue
        raise ProcessingError("All processing strategies failed")
```

**Packages**: `pymupdf` (PyMuPDF)

---

### P0-5: Add Authentication/Authorization Framework
**Effort**: 3-4 days | **Impact**: Security compliance

**Problem**: No user authentication. Anyone can list/delete all documents.

**Solution**:
```python
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    return payload["user_id"]

@router.get("/documents")
async def list_documents(user_id: str = Depends(get_current_user)):
    return get_documents_for_user(user_id)
```

---

## P1 - Pre-Scale Improvements

### P1-1: Implement Structured Logging + Distributed Tracing
**Effort**: 2-3 days | **Impact**: Debugging, performance optimization

**Problem**: No correlation IDs, can't trace requests across services.

**Solution**:
```python
import structlog
from opentelemetry import trace

structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)

@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    structlog.contextvars.bind_contextvars(correlation_id=correlation_id)
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = correlation_id
    return response
```

**Packages**: `structlog`, `opentelemetry-api`, `opentelemetry-sdk`

---

### P1-2: Add Prometheus Metrics + Alerting
**Effort**: 2 days | **Impact**: Proactive issue detection

**Metrics to track**:
- `document_processing_duration_seconds` (histogram)
- `embedding_api_calls_total` (counter)
- `embedding_api_errors_total` (counter)
- `vector_store_query_duration_seconds` (histogram)
- `active_processing_tasks` (gauge)

```python
from prometheus_client import Counter, Histogram, generate_latest

EMBEDDING_CALLS = Counter('embedding_api_calls_total', 'Total embedding API calls')
PROCESSING_TIME = Histogram('document_processing_seconds', 'Document processing time')

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

---

### P1-3: Add Rate Limiting to API Endpoints
**Effort**: 4 hours | **Impact**: Abuse prevention

**Problem**: No rate limiting. Malicious actor could exhaust disk space or overwhelm embedding service.

**Solution**:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/upload")
@limiter.limit("10/minute")  # 10 uploads per minute per IP
async def upload_document(request: Request, file: UploadFile):
    # ...
```

**Package**: `slowapi`

---

### P1-4: Implement File Cleanup Strategy
**Effort**: 1 day | **Impact**: Prevent disk exhaustion

**Problem**: Orphaned files and temp files persist indefinitely.

**Solution**:
```python
# Scheduled cleanup task (run daily)
async def cleanup_orphaned_files():
    upload_dir = settings.upload_path
    db_files = await get_all_document_filenames()
    
    for filename in os.listdir(upload_dir):
        if filename not in db_files:
            file_path = os.path.join(upload_dir, filename)
            file_age = time.time() - os.path.getmtime(file_path)
            if file_age > 86400:  # 24 hours
                os.remove(file_path)
                logger.info(f"Cleaned up orphaned file: {filename}")
```

---

### P1-5: Add SSRF Protection for URL Ingestion
**Effort**: 4 hours | **Impact**: Security

**Problem**: URL ingestion allows access to internal networks.

**Solution**:
```python
import ipaddress
from urllib.parse import urlparse

BLOCKED_IP_RANGES = [
    ipaddress.ip_network('127.0.0.0/8'),     # Localhost
    ipaddress.ip_network('10.0.0.0/8'),      # Private
    ipaddress.ip_network('172.16.0.0/12'),   # Private
    ipaddress.ip_network('192.168.0.0/16'),  # Private
    ipaddress.ip_network('169.254.0.0/16'),  # Link-local
]

async def validate_url_safe(url: str) -> bool:
    parsed = urlparse(url)
    try:
        ip = ipaddress.ip_address(parsed.hostname)
        for blocked in BLOCKED_IP_RANGES:
            if ip in blocked:
                raise ValidationError("URL points to internal network")
    except ValueError:
        pass  # Hostname, not IP - resolve and check
    return True
```

---

## P2 - Production Scale (>500 users)

### P2-1: Migrate SQLite → PostgreSQL
**Trigger**: >20 concurrent users OR "database locked" errors

**Effort**: 1 week

**Changes**:
- Update `DATABASE_URL` to PostgreSQL connection string
- Add `asyncpg` driver
- Consider `pgvector` extension for future vector storage consolidation
- Add connection pooling with `asyncpg`

---

### P2-2: Migrate ChromaDB → Qdrant Cluster
**Trigger**: >50K documents OR >50ms query latency

**Effort**: 3-5 days

**Benefits**:
- 3-4x faster queries
- Better filtering capabilities
- Horizontal scaling with sharding
- Built-in quantization (INT8/binary)

**Changes**:
- Implement `QdrantVectorStore(VectorStoreInterface)`
- Deploy Qdrant cluster (3+ nodes)
- Migrate existing embeddings

---

### P2-3: Migrate Local Storage → S3/MinIO
**Trigger**: Multi-server deployment OR >100GB storage

**Effort**: 2-3 days

**Changes**:
- Replace file operations with `boto3` S3 client
- Add presigned URLs for direct uploads
- Implement lifecycle policies for cleanup

---

### P2-4: Add Load Testing Suite
**Effort**: 2 days

**Tools**: Locust or k6

**Scenarios**:
- Concurrent document uploads (10, 50, 100 users)
- Embedding API rate limit behavior
- ChromaDB query performance at scale
- Memory usage under load

```python
# locustfile.py
from locust import HttpUser, task, between

class IubarUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def upload_document(self):
        with open("test.pdf", "rb") as f:
            self.client.post("/api/documents/upload", files={"file": f})
    
    @task(1)
    def list_documents(self):
        self.client.get("/api/documents")
```

---

## Architecture Evolution Roadmap

### Phase 1: MVP (Current)
```
FastAPI → SQLite + ChromaDB + Local Files
         ↓
    BackgroundTasks (in-process)
```

### Phase 1.5: MVP Hardening (2-3 weeks)
```
FastAPI → Redis → Celery Workers
    ↓                    ↓
SQLite (WAL)      ChromaDB + Local Files
```

### Phase 2: Horizontal Scale (4-6 weeks)
```
Load Balancer → FastAPI (N instances)
                    ↓
              Redis Cluster
                    ↓
              Celery Workers (N)
                    ↓
    ┌───────────────┼───────────────┐
    ↓               ↓               ↓
PostgreSQL    Qdrant Cluster    S3 Storage
```

---

## References

- [Slack Job Queue Architecture](https://slack.engineering/scaling-slacks-job-queue/)
- [FastAPI + Celery Best Practices](https://testdriven.io/courses/fastapi-celery/intro/)
- [SQLite in Production](https://blog.driftingruby.com/using-sqlite-in-production/)
- [Qdrant vs ChromaDB Comparison](https://airbyte.com/data-engineering-resources/chroma-db-vs-qdrant)
- [RAG Chunking Strategies](https://www.firecrawl.dev/blog/best-chunking-strategies-rag-2025)
- [Docling Alternatives](https://unstract.com/blog/docling-alternative/)

---

*Updated: January 14, 2026*
