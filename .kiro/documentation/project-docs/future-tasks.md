# Future Tasks

Tasks to be triggered when specific project milestones are reached.

---

## Necessary Next Phase Tasks (Critical - Process Hanging Fix)

**Priority**: P0 - Must fix immediately (blocks development workflow)  
**Estimated Time**: 4-6 hours  
**Context**: Root cause analysis identified three separate issues causing terminal hanging after Ctrl+C

### Background

**Problem**: Backend server hangs indefinitely after pressing Ctrl+C, requiring manual process kill via Task Manager. This is the same pattern as the test runner hanging issue documented in DEVLOG Day 10.

**Root Causes Identified**:
1. **ThreadPoolExecutor in EmbeddingService** - 4 non-daemon worker threads never shut down
2. **Uncancelled asyncio background tasks** - SessionManager and RateLimiter cleanup loops
3. **No shutdown event handler** - FastAPI has no `@app.on_event("shutdown")` to cleanup resources

---

### Task 1: Implement Singleton Pattern for EmbeddingService

**Effort**: 2-3 hours | **Impact**: Prevents thread leaks, enables proper lifecycle management

**Problem**: `EmbeddingService` creates a new `ThreadPoolExecutor` (4 workers) every time it's instantiated. The executor's `shutdown()` method exists but is never called. These non-daemon threads prevent Python process from exiting.

**Current Pattern** (Anti-pattern):
```python
# In documents.py line 421, 541
embedding_service = EmbeddingService(settings.voyage_api_key)
# ... use service ...
# ThreadPoolExecutor never shut down!

# In chat.py line 443
embedding_service = EmbeddingService(api_key=settings.voyage_api_key)
# ... use service ...
# ThreadPoolExecutor never shut down!
```

**Solution**: Implement singleton pattern with FastAPI dependency injection

**Implementation**:

1. **Create singleton service manager** (`backend/app/core/service_manager.py`):
```python
"""
Singleton service manager for application-wide services.
Ensures single instance and proper lifecycle management.
"""
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

from app.services.embedding_service import EmbeddingService
from app.services.session_manager import SessionManager
from app.services.rate_limiter import RateLimiter
from app.config import settings

class ServiceManager:
    """Manages singleton service instances with lifecycle"""
    
    _instance: Optional['ServiceManager'] = None
    _initialized: bool = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self._embedding_service: Optional[EmbeddingService] = None
            self._session_manager: Optional[SessionManager] = None
            self._rate_limiter: Optional[RateLimiter] = None
            ServiceManager._initialized = True
    
    def get_embedding_service(self) -> EmbeddingService:
        """Get or create singleton EmbeddingService"""
        if self._embedding_service is None:
            self._embedding_service = EmbeddingService(
                api_key=settings.voyage_api_key,
                enable_cache=True
            )
        return self._embedding_service
    
    def get_session_manager(self, db_session) -> SessionManager:
        """Get or create singleton SessionManager"""
        if self._session_manager is None:
            self._session_manager = SessionManager(db_session)
        return self._session_manager
    
    def get_rate_limiter(self) -> RateLimiter:
        """Get or create singleton RateLimiter"""
        if self._rate_limiter is None:
            self._rate_limiter = RateLimiter()
        return self._rate_limiter
    
    async def shutdown_all(self):
        """Shutdown all managed services"""
        if self._embedding_service:
            self._embedding_service.shutdown()
        
        if self._session_manager:
            await self._session_manager.stop_cleanup_task()
        
        if self._rate_limiter:
            await self._rate_limiter.stop_cleanup_task()

# Global singleton instance
service_manager = ServiceManager()
```

2. **Create FastAPI dependency** (`backend/app/dependencies/services.py`):
```python
"""
FastAPI dependencies for singleton services.
"""
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.service_manager import service_manager
from app.core.database import get_db
from app.services.embedding_service import EmbeddingService
from app.services.session_manager import SessionManager
from app.services.rate_limiter import RateLimiter

def get_embedding_service() -> EmbeddingService:
    """Dependency for EmbeddingService singleton"""
    return service_manager.get_embedding_service()

def get_session_manager(db: AsyncSession = Depends(get_db)) -> SessionManager:
    """Dependency for SessionManager singleton"""
    return service_manager.get_session_manager(db)

def get_rate_limiter() -> RateLimiter:
    """Dependency for RateLimiter singleton"""
    return service_manager.get_rate_limiter()
```

3. **Update endpoint usage**:
```python
# In documents.py
from app.dependencies.services import get_embedding_service

async def process_document_task(
    task_id: str,
    file_path: str,
    file_type: str,
    db: AsyncSession,
    embedding_service: EmbeddingService = Depends(get_embedding_service)
):
    # ... use embedding_service ...
    # No need to call shutdown() - managed by ServiceManager

# In chat.py
from app.dependencies.services import (
    get_embedding_service,
    get_session_manager,
    get_rate_limiter
)

@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: str,
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
    session_manager: SessionManager = Depends(get_session_manager),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
):
    # ... use services ...
    # No manual cleanup needed
```

**Files to modify**:
- Create: `backend/app/core/service_manager.py`
- Create: `backend/app/dependencies/services.py`
- Update: `backend/app/api/documents.py` (2 locations)
- Update: `backend/app/api/chat.py` (1 location)
- Update: `backend/main.py` (add shutdown handler)

**References**:
- [FastAPI Singleton Dependencies](https://www.restack.io/p/ai-python-answer-using-fastapi-singleton-dependencies-cat-ai)
- [ThreadPoolExecutor Lifecycle](https://superfastpython.com/threadpoolexecutor-quick-start-guide/)
- [Python Context Managers for Resource Management](https://docs.python.org/3/library/contextlib.html)

---

### Task 2: Add FastAPI Lifespan Context Manager

**Effort**: 1-2 hours | **Impact**: Proper startup/shutdown orchestration

**Problem**: No shutdown event handler exists. Background tasks (SessionManager, RateLimiter cleanup loops) are never cancelled. Services are never cleaned up.

**Solution**: Implement modern FastAPI lifespan context manager (replaces deprecated `@app.on_event`)

**Implementation**:

Update `backend/main.py`:
```python
"""
Iubar Backend - FastAPI Application Entry Point with Lifecycle Management
"""
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.service_manager import service_manager
from app.core.database import init_db
from app.api.documents import router as documents_router
from app.api.chat import router as chat_router

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Application lifespan context manager.
    Handles startup and shutdown events with proper resource cleanup.
    """
    # ========== STARTUP ==========
    logger.info("Starting application startup sequence...")
    
    try:
        # Initialize database
        await init_db()
        logger.info("✓ Database initialized")
        
        # Start background cleanup tasks
        session_manager = service_manager.get_session_manager(None)  # Will be set per-request
        await session_manager.start_cleanup_task()
        logger.info("✓ SessionManager cleanup task started")
        
        rate_limiter = service_manager.get_rate_limiter()
        await rate_limiter.start_cleanup_task()
        logger.info("✓ RateLimiter cleanup task started")
        
        logger.info("Application startup completed successfully")
        
        yield  # Application runs here
        
    finally:
        # ========== SHUTDOWN ==========
        logger.info("Starting application shutdown sequence...")
        
        try:
            # Shutdown all managed services
            await service_manager.shutdown_all()
            logger.info("✓ All services shut down successfully")
            
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")
        
        logger.info("Application shutdown completed")

# Create FastAPI application with lifespan
app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    version=settings.api_version,
    lifespan=lifespan,  # Modern lifespan context manager
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(documents_router)
app.include_router(chat_router)

# ... rest of endpoints ...
```

**Key Changes**:
1. Replace deprecated `@app.on_event("startup")` with `lifespan` context manager
2. Add `finally` block for guaranteed cleanup
3. Call `service_manager.shutdown_all()` to cleanup all singletons
4. Proper error handling during shutdown (log but don't raise)

**Files to modify**:
- Update: `backend/main.py`

**References**:
- [FastAPI Lifespan Events](https://fastapi.tiangolo.com/advanced/events/)
- [FastAPI Application Lifecycle Management 2025](https://craftyourstartup.com/cys-docs/tutorials/fastapi-startup-and-shutdown-events-guide/)

---

### Task 3: Fix Background Task Cleanup

**Effort**: 30 minutes | **Impact**: Prevents asyncio task leaks

**Problem**: `SessionManager` and `RateLimiter` have `_periodic_cleanup()` methods running in infinite loops. These tasks are created with `asyncio.create_task()` but never cancelled. The `stop_cleanup_task()` methods exist but are never called.

**Solution**: Ensure cleanup tasks are properly cancelled during shutdown (already handled by Task 2's `service_manager.shutdown_all()`)

**Verification**:

1. **Confirm SessionManager.stop_cleanup_task() works**:
```python
# In backend/app/services/session_manager.py (already exists)
async def stop_cleanup_task(self):
    """Stop background cleanup task."""
    if self._cleanup_task:
        self._cleanup_task.cancel()
        try:
            await self._cleanup_task
        except asyncio.CancelledError:
            pass
        logger.info("Session cleanup task stopped")
```

2. **Confirm RateLimiter.stop_cleanup_task() works**:
```python
# In backend/app/services/rate_limiter.py (already exists)
async def stop_cleanup_task(self):
    """Stop background cleanup task."""
    if self._cleanup_task:
        self._cleanup_task.cancel()
        try:
            await self._cleanup_task
        except asyncio.CancelledError:
            pass
        logger.info("Rate limiter cleanup task stopped")
```

3. **Add logging to verify cleanup**:
```python
# In backend/app/services/session_manager.py
async def _periodic_cleanup(self):
    """Background task to clean up expired sessions."""
    logger.info("Session cleanup task started")
    while True:
        try:
            await asyncio.sleep(self.CLEANUP_INTERVAL_MINUTES * 60)
            await self._cleanup_expired_sessions()
        except asyncio.CancelledError:
            logger.info("Session cleanup task cancelled (shutdown)")
            break  # Exit cleanly
        except Exception as e:
            logger.error(
                "Session cleanup error",
                error_type=type(e).__name__,
                error_message=str(e),
            )
```

**Files to modify**:
- Update: `backend/app/services/session_manager.py` (add logging)
- Update: `backend/app/services/rate_limiter.py` (add logging)

---

### Task 4: Add Comprehensive Testing

**Effort**: 1 hour | **Impact**: Prevent regression

**Test Cases**:

1. **Test singleton behavior**:
```python
# backend/tests/test_service_manager.py
def test_embedding_service_singleton():
    """EmbeddingService should be singleton"""
    from app.core.service_manager import service_manager
    
    service1 = service_manager.get_embedding_service()
    service2 = service_manager.get_embedding_service()
    
    assert service1 is service2  # Same instance
    assert service1._executor is service2._executor  # Same ThreadPoolExecutor
```

2. **Test shutdown cleanup**:
```python
@pytest.mark.asyncio
async def test_service_manager_shutdown():
    """ServiceManager should cleanup all resources"""
    from app.core.service_manager import service_manager
    
    # Get services
    embedding_service = service_manager.get_embedding_service()
    rate_limiter = service_manager.get_rate_limiter()
    
    # Start cleanup tasks
    await rate_limiter.start_cleanup_task()
    
    # Shutdown
    await service_manager.shutdown_all()
    
    # Verify executor is shut down
    assert embedding_service._executor._shutdown
    
    # Verify cleanup tasks are cancelled
    assert rate_limiter._cleanup_task.cancelled()
```

3. **Test lifespan context manager**:
```python
@pytest.mark.asyncio
async def test_lifespan_startup_shutdown():
    """Lifespan should properly startup and shutdown"""
    from app.main import lifespan, app
    
    async with lifespan(app):
        # Application running
        pass
    
    # After context exit, all services should be shut down
    from app.core.service_manager import service_manager
    embedding_service = service_manager.get_embedding_service()
    assert embedding_service._executor._shutdown
```

**Files to create**:
- Create: `backend/tests/test_service_manager.py`
- Create: `backend/tests/test_lifespan.py`

---

### Task 5: Documentation and Verification

**Effort**: 30 minutes | **Impact**: Knowledge transfer

**Deliverables**:

1. **Update testing-strategy.md**:
```markdown
## Service Lifecycle Management

### Singleton Services

Services that manage expensive resources (ThreadPoolExecutor, connection pools) should be singletons:

- **EmbeddingService**: Manages ThreadPoolExecutor (4 workers)
- **SessionManager**: Manages background cleanup task
- **RateLimiter**: Manages background cleanup task

Use `ServiceManager` to access singletons:
```python
from app.core.service_manager import service_manager

embedding_service = service_manager.get_embedding_service()
```

### Shutdown Verification

After implementing lifecycle management, verify clean shutdown:

```bash
# Start server
python -m uvicorn main:app

# Press Ctrl+C
# Should see:
# INFO: Starting application shutdown sequence...
# INFO: ✓ All services shut down successfully
# INFO: Application shutdown completed
# INFO: Finished server process [PID]
# (Process exits immediately)
```

If process hangs, check:
1. ThreadPoolExecutor.shutdown() was called
2. Background asyncio tasks were cancelled
3. No daemon=False threads remain
```

2. **Add to DEVLOG**:
```markdown
### Day 12 (Jan 20) - Critical Bug Fix: Process Hanging [~4h]

**Root Cause Analysis**:
- Identified 3 separate causes of terminal hanging after Ctrl+C
- ThreadPoolExecutor in EmbeddingService never shut down (4 non-daemon threads)
- Background cleanup tasks never cancelled (SessionManager, RateLimiter)
- No FastAPI shutdown event handler

**Solution Implemented**:
- Singleton pattern for EmbeddingService with ServiceManager
- FastAPI lifespan context manager for proper startup/shutdown
- Guaranteed cleanup of all resources in finally block
- Comprehensive testing for lifecycle management

**Files Modified**:
- Created: `backend/app/core/service_manager.py`
- Created: `backend/app/dependencies/services.py`
- Updated: `backend/main.py` (lifespan context manager)
- Updated: `backend/app/api/documents.py`, `backend/app/api/chat.py`
- Created: `backend/tests/test_service_manager.py`, `backend/tests/test_lifespan.py`

**Verification**: Server now exits cleanly after Ctrl+C without manual process kill.
```

**Files to update**:
- Update: `.kiro/steering/testing-strategy.md`
- Update: `.kiro/documentation/project-docs/DEVLOG.md`

---

### Implementation Checklist

- [ ] Task 1: Implement ServiceManager singleton pattern (2-3h)
- [ ] Task 2: Add FastAPI lifespan context manager (1-2h)
- [ ] Task 3: Verify background task cleanup (30m)
- [ ] Task 4: Add comprehensive testing (1h)
- [ ] Task 5: Update documentation (30m)

**Total Estimated Time**: 4-6 hours

**Success Criteria**:
1. ✅ Server exits cleanly after Ctrl+C (no manual kill needed)
2. ✅ ThreadPoolExecutor.shutdown() called on exit
3. ✅ Background asyncio tasks cancelled on exit
4. ✅ All tests passing
5. ✅ No thread leaks (verify with threading.enumerate())

---

## Testing Suite Improvements (Post-Implementation)

**Priority**: P1 - Implement after all services added and API keys available  
**Estimated Time**: TBD  
**Trigger**: All RAG Core Phase tasks complete + API keys configured

### Scope

Once all backend services are implemented, all API endpoints are functional, and API keys are available for testing, the following improvements should be made to the testing suite:

**Areas for Enhancement**:
1. **Integration Test Coverage**
   - End-to-end tests with real API calls (DeepSeek, Voyage)
   - Full document processing pipeline tests
   - Streaming endpoint tests with actual SSE events
   - Multi-document RAG tests with real embeddings

2. **Property-Based Test Expansion**
   - Add properties for RAG retrieval quality
   - Test embedding consistency across service restarts
   - Validate cost calculation accuracy with real API responses
   - Test rate limiting under concurrent load

3. **Performance Benchmarking**
   - Document processing speed benchmarks
   - Embedding generation throughput tests
   - Vector search latency measurements
   - Streaming response time analysis

4. **Error Scenario Testing**
   - API timeout handling with real timeouts
   - Rate limit enforcement with actual API limits
   - Circuit breaker behavior under real failures
   - Partial response handling in streaming

5. **Load Testing**
   - Concurrent document uploads
   - Simultaneous chat sessions
   - Background task queue behavior
   - Resource cleanup under load

**Deliverables**:
- [ ] Comprehensive integration test suite (50+ tests)
- [ ] Performance benchmark suite with baseline metrics
- [ ] Load testing scenarios with Locust/k6
- [ ] CI/CD pipeline with API key management
- [ ] Test coverage report (target: 90%+ for core logic)

**Notes**:
- Tests requiring API keys should be skipped in CI without keys
- Use `@pytest.mark.skipif` for API-dependent tests
- Document expected performance baselines
- Create separate test environment with test API keys

---

## Trigger: Core MVP Functionality Complete

**When:** RAG pipeline working, chat interface functional (around Day 7-8)

### 🎨 Task: Visual Identity Design - Completed

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

### 🎨 Task: Responsive Design Enhancement

**Priority**: Medium (UX improvement for desktop/tablet/mobile users)
**Estimated Time**: 8-12 hours (4-6h desktop + 4-6h mobile/tablet)
**Best Timing**: Post-MVP, after core functionality stable

#### Context

Current visual-identity.md design uses fixed pixel values (px) for spacing, margins, and typography. While this works for the MVP target (1920px displays), it creates suboptimal experiences on smaller desktops (1024px-1280px) and ultra-wide displays (2560px+) and non-desktop devices.

#### Problem

1. **Fixed Document Margins (64px)**
   - On 1024px screens: 64px margins on both sides = 128px lost space
   - With 70% column width, content area becomes cramped
   - Example: 1024px → 717px document column → minus 128px margins = 589px for text

2. **No Minimum Width Constraints**
   - Two-column layout (70/30 split) feels cramped below 1280px
   - Chat sidebar (30%) becomes too narrow on small desktops
   - No guidance for ultra-wide displays (2560px+)

3. **Fixed Typography**
   - 18px body text, 42px H1 remain same across all desktop sizes
   - No scaling for readability on different screen sizes

#### Solution: Implement Full Responsive Design

**Scope**: Complete responsive design (320px mobile to 4K+ desktop)

**Total Estimated Time**: 8-12 hours
- Phase 1 (Desktop): 4-6 hours
- Phase 2 (Mobile/Tablet): 4-6 hours

**Deliverables**:

1. **Convert Fixed Units to Relative Units**
   - Replace `px` with `rem` for typography (1rem = 16px base)
   - Replace `px` with `em` for component spacing (relative to parent font-size)
   - Use `%` or `vw` for layout widths where appropriate
   
   ```css
   /* Before (fixed) */
   font-size: 18px;
   margin: 64px;
   padding: 24px;
   
   /* After (relative) */
   font-size: 1.125rem;  /* 18px / 16px = 1.125rem */
   margin: 4rem;         /* 64px / 16px = 4rem */
   padding: 1.5rem;      /* 24px / 16px = 1.5rem */
   ```

2. **Desktop Breakpoints**
   ```css
   /* Desktop Small: 1024px - 1279px */
   @media (min-width: 1024px) and (max-width: 1279px) {
     .document-viewer { padding: 0 2rem; }  /* 32px */
     .chat-sidebar { padding: 1rem; }       /* 16px */
   }
   
   /* Desktop Medium: 1280px - 1919px */
   @media (min-width: 1280px) and (max-width: 1919px) {
     .document-viewer { padding: 0 3rem; }  /* 48px */
     .chat-sidebar { padding: 1.5rem; }     /* 24px */
   }
   
   /* Desktop Large: 1920px+ */
   @media (min-width: 1920px) {
     .document-viewer { padding: 0 4rem; }  /* 64px */
     .chat-sidebar { padding: 1.5rem; }     /* 24px */
   }
   
   /* Ultra-Wide: 2560px+ */
   @media (min-width: 2560px) {
     .main-container { max-width: 1920px; margin: 0 auto; }
   }
   ```

3. **Layout Constraints**
   - Two-column layout: Maintain 70/30 split with resizable border
   - Document viewer: `max-width: 50rem` (800px, prevents ultra-wide text)
   - Chat sidebar: `min-width: 20rem` (320px, ensures usability)
   - Resizable border: Constrain between 60/40 and 80/20 splits

4. **Responsive Typography Scale**
   ```css
   /* Base font-size scales with viewport */
   html {
     font-size: 16px;  /* Base for 1920px */
   }
   
   @media (max-width: 1279px) {
     html { font-size: 15px; }  /* Slightly smaller for small desktops */
   }
   
   @media (min-width: 2560px) {
     html { font-size: 18px; }  /* Slightly larger for ultra-wide */
   }
   
   /* All rem-based typography scales automatically */
   h1 { font-size: 2.625rem; }  /* 42px at base, scales with html font-size */
   body { font-size: 1.125rem; } /* 18px at base, scales with html font-size */
   ```

5. **Update Design Tokens**
   ```json
   {
     "spacing": {
       "xs": "0.25rem",   /* 4px */
       "sm": "0.5rem",    /* 8px */
       "md": "1rem",      /* 16px */
       "lg": "1.5rem",    /* 24px */
       "xl": "2rem",      /* 32px */
       "2xl": "3rem",     /* 48px */
       "3xl": "4rem"      /* 64px */
     },
     "typography": {
       "h1": {"size": "2.625rem", "weight": 600, "lineHeight": 1.2},
       "h2": {"size": "2rem", "weight": 500, "lineHeight": 1.25},
       "body": {"size": "1.125rem", "weight": 400, "lineHeight": 1.7}
     }
   }
   ```

#### Files to Modify

- Update: `.kiro/documentation/project-docs/visual-identity.md`
  - Add "Responsive Design Specifications" section
  - Convert all px values to rem/em in examples
  - Add breakpoint specifications (desktop + mobile/tablet)
  - Update design tokens JSON
  - Add mobile layout patterns
  - Add touch interaction specs

- Update: `frontend/src/design-system/` (when created)
  - Implement responsive spacing scale
  - Implement responsive typography scale
  - Add breakpoint utilities
  - Add mobile-specific components

- Update: Component CSS/styles
  - Convert fixed px to relative units
  - Add media queries for responsive behavior
  - Add mobile/tablet layout variants

#### Phase 1: Desktop Responsive (4-6 hours)

**Scope**: Desktop-only responsiveness (1024px to 4K+)

**Deliverables**:

1. **Convert Fixed Units to Relative Units**
   - Replace `px` with `rem` for typography (1rem = 16px base)
   - Replace `px` with `em` for component spacing (relative to parent font-size)
   - Use `%` or `vw` for layout widths where appropriate
   
   ```css
   /* Before (fixed) */
   font-size: 18px;
   margin: 64px;
   padding: 24px;
   
   /* After (relative) */
   font-size: 1.125rem;  /* 18px / 16px = 1.125rem */
   margin: 4rem;         /* 64px / 16px = 4rem */
   padding: 1.5rem;      /* 24px / 16px = 1.5rem */
   ```

2. **Desktop Breakpoints**
   ```css
   /* Desktop Small: 1024px - 1279px */
   @media (min-width: 1024px) and (max-width: 1279px) {
     .document-viewer { padding: 0 2rem; }  /* 32px */
     .chat-sidebar { padding: 1rem; }       /* 16px */
   }
   
   /* Desktop Medium: 1280px - 1919px */
   @media (min-width: 1280px) and (max-width: 1919px) {
     .document-viewer { padding: 0 3rem; }  /* 48px */
     .chat-sidebar { padding: 1.5rem; }     /* 24px */
   }
   
   /* Desktop Large: 1920px+ */
   @media (min-width: 1920px) {
     .document-viewer { padding: 0 4rem; }  /* 64px */
     .chat-sidebar { padding: 1.5rem; }     /* 24px */
   }
   
   /* Ultra-Wide: 2560px+ */
   @media (min-width: 2560px) {
     .main-container { max-width: 1920px; margin: 0 auto; }
   }
   ```

3. **Layout Constraints**
   - Two-column layout: Maintain 70/30 split with resizable border
   - Document viewer: `max-width: 50rem` (800px, prevents ultra-wide text)
   - Chat sidebar: `min-width: 20rem` (320px, ensures usability)
   - Resizable border: Constrain between 60/40 and 80/20 splits

4. **Responsive Typography Scale**
   ```css
   /* Base font-size scales with viewport */
   html {
     font-size: 16px;  /* Base for 1920px */
   }
   
   @media (max-width: 1279px) {
     html { font-size: 15px; }  /* Slightly smaller for small desktops */
   }
   
   @media (min-width: 2560px) {
     html { font-size: 18px; }  /* Slightly larger for ultra-wide */
   }
   
   /* All rem-based typography scales automatically */
   h1 { font-size: 2.625rem; }  /* 42px at base, scales with html font-size */
   body { font-size: 1.125rem; } /* 18px at base, scales with html font-size */
   ```

5. **Update Design Tokens**
   ```json
   {
     "spacing": {
       "xs": "0.25rem",   /* 4px */
       "sm": "0.5rem",    /* 8px */
       "md": "1rem",      /* 16px */
       "lg": "1.5rem",    /* 24px */
       "xl": "2rem",      /* 32px */
       "2xl": "3rem",     /* 48px */
       "3xl": "4rem"      /* 64px */
     },
     "typography": {
       "h1": {"size": "2.625rem", "weight": 600, "lineHeight": 1.2},
       "h2": {"size": "2rem", "weight": 500, "lineHeight": 1.25},
       "body": {"size": "1.125rem", "weight": 400, "lineHeight": 1.7}
     }
   }
   ```

#### Phase 2: Mobile/Tablet Responsive (4-6 hours)

**Scope**: Mobile (320px-767px) and Tablet (768px-1023px) support

**Deliverables**:

1. **Mobile/Tablet Breakpoints**
   ```css
   /* Mobile: 320px - 767px */
   @media (max-width: 767px) {
     html { font-size: 14px; }  /* Smaller base for mobile */
     
     /* Single column layout */
     .main-layout {
       flex-direction: column;
     }
     
     .document-viewer {
       width: 100%;
       padding: 0 1rem;  /* 16px */
     }
     
     /* Chat as bottom sheet or drawer */
     .chat-sidebar {
       position: fixed;
       bottom: 0;
       left: 0;
       right: 0;
       height: 50vh;
       transform: translateY(100%);
       transition: transform 0.3s ease;
     }
     
     .chat-sidebar.open {
       transform: translateY(0);
     }
   }
   
   /* Tablet: 768px - 1023px */
   @media (min-width: 768px) and (max-width: 1023px) {
     html { font-size: 15px; }
     
     /* Stacked or drawer layout */
     .main-layout {
       flex-direction: column;
     }
     
     .document-viewer {
       width: 100%;
       padding: 0 2rem;  /* 32px */
     }
     
     /* Chat as side drawer */
     .chat-sidebar {
       position: fixed;
       right: 0;
       top: 0;
       bottom: 0;
       width: 24rem;  /* 384px */
       transform: translateX(100%);
       transition: transform 0.3s ease;
     }
     
     .chat-sidebar.open {
       transform: translateX(0);
     }
   }
   ```

2. **Mobile Layout Patterns**
   
   **Option A: Bottom Sheet (Recommended for Mobile)**
   ```
   ┌─────────────────────────────┐
   │ Header (minimal)            │
   ├─────────────────────────────┤
   │                             │
   │ Document Viewer (full)      │
   │                             │
   │ - Rendered Markdown         │
   │ - Tap word for focus        │
   │ - Scroll to read            │
   │                             │
   │                             │
   ├─────────────────────────────┤
   │ [Chat Button] 💬            │ ← Tap to open chat
   └─────────────────────────────┘
   
   When chat opened:
   ┌─────────────────────────────┐
   │ Document (dimmed)           │
   ├─────────────────────────────┤
   │ Chat (50% height)           │
   │ - Messages                  │
   │ - Input                     │
   │ [Close] ✕                   │
   └─────────────────────────────┘
   ```
   
   **Option B: Side Drawer (Recommended for Tablet)**
   ```
   ┌─────────────────────────────┐
   │ [☰] Document Title          │
   ├─────────────────────────────┤
   │                             │
   │ Document Viewer (full)      │
   │                             │
   │                             │
   └─────────────────────────────┘
   
   When drawer opened:
   ┌──────────────┬──────────────┐
   │ Document     │ Chat Drawer  │
   │ (dimmed)     │              │
   │              │ - Messages   │
   │              │ - Input      │
   │              │ [✕] Close    │
   └──────────────┴──────────────┘
   ```

3. **Touch Interaction Patterns**
   
   **Focus Indicator (Letter-Level) on Touch**
   ```javascript
   // Desktop: Click word → highlight anchor letter
   // Mobile: Tap word → highlight anchor letter + show context menu
   
   .word {
     -webkit-tap-highlight-color: transparent;
     touch-action: manipulation;
   }
   
   .word:active {
     /* Immediate visual feedback on tap */
     background: rgba(212, 165, 116, 0.1);
   }
   
   // Context menu appears on tap
   <div class="context-menu">
     <button>Ask AI about this</button>
     <button>Define</button>
     <button>Highlight</button>
   </div>
   ```
   
   **Swipe Gestures**
   ```javascript
   // Swipe up from bottom → Open chat
   // Swipe down on chat → Close chat
   // Swipe left/right on document → Navigate pages (if multi-page)
   ```
   
   **Tap Targets**
   - Minimum tap target: `44px × 44px` (Apple HIG)
   - Spacing between targets: `8px` minimum
   - Buttons: `min-height: 2.75rem` (44px)

4. **Mobile Typography Adjustments**
   ```css
   @media (max-width: 767px) {
     /* Reduce heading sizes for mobile */
     h1 { font-size: 1.75rem; }  /* 28px instead of 42px */
     h2 { font-size: 1.5rem; }   /* 24px instead of 32px */
     h3 { font-size: 1.25rem; }  /* 20px instead of 24px */
     
     /* Maintain body readability */
     body { font-size: 1rem; }   /* 16px instead of 18px */
     
     /* Tighter line-height for mobile */
     body { line-height: 1.6; }  /* Instead of 1.7 */
   }
   ```

5. **Mobile Navigation**
   ```
   ┌─────────────────────────────┐
   │ [☰] Iubar        [Search] 🔍│ ← Hamburger menu
   ├─────────────────────────────┤
   │                             │
   │ Content                     │
   │                             │
   └─────────────────────────────┘
   
   Menu opened:
   ┌─────────────────────────────┐
   │ [✕] Menu                    │
   │                             │
   │ • Documents                 │
   │ • Settings                  │
   │ • Help                      │
   │                             │
   └─────────────────────────────┘
   ```

6. **Mobile-Specific Components**
   
   **Floating Action Button (FAB) for Chat**
   ```css
   .chat-fab {
     position: fixed;
     bottom: 1rem;
     right: 1rem;
     width: 3.5rem;   /* 56px */
     height: 3.5rem;
     border-radius: 50%;
     background: #D4A574;
     box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
     z-index: 1000;
   }
   ```
   
   **Pull-to-Refresh (Optional)**
   ```javascript
   // Native browser pull-to-refresh
   // Or custom implementation for document reload
   ```

7. **Responsive Images/Media**
   ```css
   img, video {
     max-width: 100%;
     height: auto;
   }
   
   /* Prevent layout shift */
   img {
     aspect-ratio: attr(width) / attr(height);
   }
   ```

#### Testing Checklist

**Desktop**:
- [ ] Test at 1024px width (minimum desktop)
- [ ] Test at 1280px width (small desktop)
- [ ] Test at 1440px width (medium desktop)
- [ ] Test at 1920px width (full HD, optimal)
- [ ] Test at 2560px width (2K ultra-wide)
- [ ] Test at 3840px width (4K)
- [ ] Verify text remains readable at all sizes
- [ ] Verify two-column layout doesn't break
- [ ] Verify resizable border works at all sizes
- [ ] Verify no horizontal scrolling at any size

**Mobile**:
- [ ] Test at 320px width (iPhone SE)
- [ ] Test at 375px width (iPhone 12/13)
- [ ] Test at 390px width (iPhone 14)
- [ ] Test at 414px width (iPhone Plus)
- [ ] Test at 428px width (iPhone Pro Max)
- [ ] Verify tap targets are 44px minimum
- [ ] Verify chat bottom sheet opens/closes smoothly
- [ ] Verify focus indicator works with tap
- [ ] Verify no horizontal scrolling
- [ ] Test in portrait and landscape

**Tablet**:
- [ ] Test at 768px width (iPad Mini)
- [ ] Test at 810px width (iPad)
- [ ] Test at 1024px width (iPad Pro)
- [ ] Verify drawer opens/closes smoothly
- [ ] Verify layout switches correctly at breakpoint
- [ ] Test in portrait and landscape

**Touch Interactions**:
- [ ] Tap word → focus indicator appears
- [ ] Swipe up → chat opens
- [ ] Swipe down → chat closes
- [ ] Pinch zoom → document scales (if enabled)
- [ ] Long press → context menu (if implemented)

**Accessibility**:
- [ ] Test with screen reader (VoiceOver, TalkBack)
- [ ] Test with keyboard navigation (Bluetooth keyboard on tablet)
- [ ] Test with reduced motion preference
- [ ] Test with large text settings
- [ ] Verify color contrast at all sizes

#### Benefits

- **Better UX on small desktops**: More usable space on 1024px-1280px screens
- **Mobile support**: Full functionality on phones and tablets
- **Scalable typography**: Text scales appropriately with screen size
- **Touch-optimized**: Proper tap targets and gestures
- **Accessibility**: Respects user's browser font-size preferences
- **Maintainability**: Relative units easier to adjust globally
- **Future-proof**: Covers all device sizes from mobile to 4K

#### References

- [CSS rem vs em vs px](https://www.freecodecamp.org/news/css-units-when-to-use-each-one/)
- [Responsive Typography Best Practices](https://www.smashingmagazine.com/2022/01/modern-fluid-typography-css-clamp/)
- [Desktop Responsive Design Patterns](https://web.dev/patterns/layout/)
- [Mobile Touch Target Sizes](https://web.dev/accessible-tap-targets/)
- [Apple Human Interface Guidelines - Touch](https://developer.apple.com/design/human-interface-guidelines/inputs/touchscreen-gestures)
- [Material Design - Bottom Sheets](https://m3.material.io/components/bottom-sheets/overview)
- [Responsive Web Design Patterns](https://developers.google.com/web/fundamentals/design-and-ux/responsive/patterns)

---

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

*Last Updated: January 24, 2026*


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


---

## Visual Identity & UX Polish Tasks (Deferred from Phase 2)

**Priority**: P1 - Implement after Phase 2 core requirements complete  
**Estimated Time**: 8-12 hours total  
**Context**: Features identified in design adherence analysis but deferred to maintain Phase 2 focus

### Task: RSVP Mode Implementation

**Effort**: 4-6 hours | **Impact**: Advanced reading feature for power users

**Background**: Visual-identity.md specifies RSVP (Rapid Serial Visual Presentation) mode for speed reading. Letter-level focus indicator (40% anchor position) is designed to support this feature.

**Scope**:

1. **Playback Controls**
   - Play/Pause button
   - Speed adjustment (WPM slider: 200-800 WPM)
   - Progress indicator
   - Keyboard shortcuts (Space = play/pause, ←/→ = speed adjust)

2. **Auto-Advance Logic**
   ```typescript
   // Advance focus caret word-by-word at specified WPM
   const advanceCaret = (wpm: number) => {
     const delayMs = 60000 / wpm;  // Convert WPM to milliseconds per word
     setInterval(() => {
       moveCaretToNextWord();
     }, delayMs);
   };
   ```

3. **Visual Feedback**
   - Current word highlighted with golden glow (already implemented)
   - Anchor letter at 40% position (already implemented)
   - Fade-in/fade-out transitions between words
   - Pause indicator when stopped

4. **User Controls**
   - WPM display: "Reading at 350 WPM"
   - Progress: "Word 245 of 1,203"
   - Bookmark current position
   - Resume from last position

**Files to modify**:
- Create: `frontend/src/components/document/RSVPControls.tsx`
- Update: `frontend/src/hooks/useFocusCaret.ts` (add auto-advance mode)
- Update: `frontend/src/components/document/DocumentViewer.tsx` (integrate controls)

**References**:
- [RSVP Reading Research](https://en.wikipedia.org/wiki/Rapid_serial_visual_presentation)
- [Spritz Reading Technology](https://spritzinc.com/)
- [Optimal Reading Position (ORP)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4047569/)

---

### Task: Focus Caret Visual Review

**Effort**: 1-2 hours | **Impact**: Ensure letter-level glow is prominent and discoverable

**Background**: Design adherence analysis noted that focus caret should be more prominent, like a "spark" or "light ball" as described in PRD.

**Scope**:

1. **Visual Enhancement**
   - Increase glow intensity: `rgba(212, 165, 116, 0.7)` (from 0.5)
   - Add pulsing animation: Subtle 1.5s cycle
   - Increase blur radius: 4px (from 2px)
   - Add outer glow ring for prominence

2. **Discoverability**
   - Show tutorial on first document load
   - Animated demo: "Click any word to focus"
   - Keyboard shortcut hint: "Use ↑↓ to navigate"
   - Fade out after 5 seconds or first interaction

3. **Accessibility**
   - Ensure glow is visible in all lighting conditions
   - Test with color blindness simulators
   - Verify contrast ratio meets WCAG AA

**Files to modify**:
- Update: `frontend/src/components/document/FocusCaret.tsx` (enhance glow)
- Update: `frontend/src/design-system/animations.ts` (add pulse animation)
- Create: `frontend/src/components/document/FocusCaretTutorial.tsx` (first-time tutorial)

---

### Task: Suggested Questions After Document Upload

**Effort**: 2-3 hours | **Impact**: Improved discoverability and user engagement

**Background**: Visual-identity.md and PRD specify showing suggested questions after document processing to help users start conversations.

**Scope**:

1. **Backend: Question Generation**
   ```python
   # In document_processor.py
   async def generate_suggested_questions(document_summary: str) -> List[str]:
       """Generate 3-5 suggested questions based on document content"""
       prompt = f"""Based on this document summary, suggest 3-5 questions a user might ask:
       
       {document_summary}
       
       Questions should be:
       - Specific to the document content
       - Open-ended (not yes/no)
       - Varied in complexity
       
       Format: One question per line."""
       
       response = await deepseek_client.generate(prompt)
       return response.strip().split('\n')[:5]
   ```

2. **Frontend: Display Component**
   ```typescript
   // SuggestedQuestions.tsx
   interface SuggestedQuestionsProps {
     questions: string[];
     onSelect: (question: string) => void;
   }
   
   export function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
     return (
       <div className="suggested-questions">
         <h3>Suggested questions:</h3>
         {questions.map((q, i) => (
           <button key={i} onClick={() => onSelect(q)}>
             {q}
           </button>
         ))}
       </div>
     );
   }
   ```

3. **Integration**
   - Show after document processing completes
   - Position: Above chat input, below welcome message
   - Clicking question auto-fills input and sends
   - Dismiss button: "Ask my own question"

**Files to modify**:
- Update: `backend/app/services/document_processor.py` (add question generation)
- Create: `frontend/src/components/chat/SuggestedQuestions.tsx`
- Update: `frontend/src/components/chat/ChatInterface.tsx` (integrate component)
- Update: `backend/app/models/schemas.py` (add `suggested_questions` field)

---

### Task: Inline Action Buttons on Hover

**Effort**: 2-3 hours | **Impact**: Enhanced interactivity and discoverability

**Background**: Visual-identity.md mentions inline action buttons but doesn't specify details. This task requires UX design before implementation.

**Scope**:

1. **UX Design Phase** (1 hour)
   - Define which actions to include
   - Determine hover target (word, sentence, paragraph)
   - Design button appearance and positioning
   - Consider mobile/touch interaction

2. **Potential Actions**
   - "Ask AI about this" (selected text → chat)
   - "Define" (dictionary lookup)
   - "Highlight" (persistent highlight)
   - "Bookmark" (save position)
   - "Copy" (copy to clipboard)

3. **Implementation** (1-2 hours)
   ```typescript
   // InlineActions.tsx
   interface InlineActionsProps {
     selectedText: string;
     position: { x: number; y: number };
     onAction: (action: string, text: string) => void;
   }
   
   export function InlineActions({ selectedText, position, onAction }: InlineActionsProps) {
     return (
       <div 
         className="inline-actions"
         style={{ top: position.y, left: position.x }}
       >
         <button onClick={() => onAction('ask', selectedText)}>
           Ask AI
         </button>
         <button onClick={() => onAction('define', selectedText)}>
           Define
         </button>
         <button onClick={() => onAction('highlight', selectedText)}>
           Highlight
         </button>
       </div>
     );
   }
   ```

4. **Interaction Pattern**
   - Desktop: Hover over text → buttons appear
   - Mobile: Long-press text → context menu appears
   - Keyboard: Select text + Ctrl+K → actions menu

**Files to create**:
- `frontend/src/components/document/InlineActions.tsx`
- `frontend/src/hooks/useTextSelection.ts`

**Files to modify**:
- Update: `frontend/src/components/document/DocumentViewer.tsx` (integrate actions)

**Note**: Requires UX design approval before implementation.

---

### Task: PRD Deferred Features

**Effort**: Varies by feature | **Impact**: Post-MVP enhancements

**Background**: Features from PRD.md that are not critical for MVP but valuable for production.

#### 1. Dashboard with Knowledge Base Management (8-12 hours)

**Scope**:
- Document library view (grid/list)
- Search and filter documents
- Bulk operations (delete, export)
- Storage usage display
- Recent documents section

**Files to create**:
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/components/dashboard/DocumentGrid.tsx`
- `frontend/src/components/dashboard/DocumentCard.tsx`

#### 2. Collections/Folders Organization (4-6 hours)

**Scope**:
- Create/rename/delete collections
- Drag-and-drop documents into collections
- Collection-specific chat sessions
- Nested collections (optional)

**Database changes**:
```sql
CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES collections(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_collections (
  document_id TEXT REFERENCES documents(id),
  collection_id TEXT REFERENCES collections(id),
  PRIMARY KEY (document_id, collection_id)
);
```

#### 3. Learning Progress Tracking (6-8 hours)

**Scope**:
- Track documents read (% completion)
- Track concepts learned (extracted from chat)
- Spaced repetition reminders
- Progress visualization (charts)

**Database changes**:
```sql
CREATE TABLE reading_progress (
  document_id TEXT REFERENCES documents(id),
  user_id TEXT,
  last_position INTEGER,
  completion_percentage REAL,
  last_read_at TIMESTAMP
);

CREATE TABLE concepts_learned (
  id TEXT PRIMARY KEY,
  concept TEXT NOT NULL,
  document_id TEXT REFERENCES documents(id),
  confidence_level REAL,
  learned_at TIMESTAMP
);
```

#### 4. User Authentication System (12-16 hours)

**Scope**:
- Email/password registration and login
- OAuth providers (Google, GitHub)
- JWT token management
- Password reset flow
- User profile management

**Packages**: `python-jose`, `passlib`, `python-multipart`

#### 5. Export Functionality (4-6 hours)

**Scope**:
- Export chat history as PDF
- Export chat history as Markdown
- Export notes/highlights
- Export document with annotations

**Packages**: `reportlab` (PDF generation), `markdown2`

#### 6. Mobile/Tablet Responsive Design (8-12 hours)

**Scope**: See "Responsive Design Enhancement" task above for full details.

#### 7. Multi-Document Comparison View (8-10 hours)

**Scope**:
- Side-by-side document viewer (2-3 documents)
- Synchronized scrolling (optional)
- Cross-document chat (RAG across multiple docs)
- Highlight differences/similarities

#### 8. AI-Generated Personalized Learning Paths (16-20 hours)

**Scope**:
- Analyze user's reading history and chat interactions
- Identify knowledge gaps and learning patterns
- Generate personalized learning sequences
- Recommend next documents/topics to explore
- Adaptive difficulty progression
- Spaced repetition scheduling for concepts

**Implementation**:

1. **Learning Profile Analysis**
   ```python
   # backend/app/services/learning_path_service.py
   class LearningPathService:
       async def analyze_user_profile(self, user_id: str) -> LearningProfile:
           """Analyze user's learning history and patterns"""
           # Get reading history
           documents_read = await get_user_documents(user_id)
           chat_history = await get_user_chat_history(user_id)
           
           # Extract concepts learned
           concepts = await extract_concepts_from_chats(chat_history)
           
           # Identify knowledge gaps
           gaps = await identify_knowledge_gaps(concepts, documents_read)
           
           # Determine learning style (visual, analytical, exploratory)
           style = await infer_learning_style(chat_history)
           
           return LearningProfile(
               concepts_mastered=concepts,
               knowledge_gaps=gaps,
               learning_style=style,
               preferred_difficulty=self._calculate_difficulty_level(chat_history)
           )
   ```

2. **Path Generation with LLM**
   ```python
   async def generate_learning_path(
       self, 
       profile: LearningProfile, 
       goal: str
   ) -> LearningPath:
       """Generate personalized learning path using DeepSeek"""
       prompt = f"""Based on this learner profile, create a personalized learning path:
       
       Current Knowledge:
       {profile.concepts_mastered}
       
       Knowledge Gaps:
       {profile.knowledge_gaps}
       
       Learning Style: {profile.learning_style}
       Goal: {goal}
       
       Generate a 5-10 step learning path with:
       1. Topic/concept to learn
       2. Recommended document type (tutorial, reference, case study)
       3. Estimated time
       4. Prerequisites
       5. Success criteria
       
       Format as JSON."""
       
       response = await deepseek_client.generate(prompt)
       return LearningPath.parse_raw(response)
   ```

3. **Adaptive Recommendations**
   ```python
   async def get_next_recommendation(
       self, 
       user_id: str, 
       current_path: LearningPath
   ) -> Recommendation:
       """Get next step based on progress"""
       # Check completion of current step
       progress = await get_step_progress(user_id, current_path.current_step)
       
       if progress.completed:
           # Move to next step
           next_step = current_path.get_next_step()
       elif progress.struggling:
           # Recommend prerequisite or easier material
           next_step = await find_prerequisite(current_path.current_step)
       else:
           # Continue current step with different resource
           next_step = await find_alternative_resource(current_path.current_step)
       
       return Recommendation(
           step=next_step,
           reason=self._explain_recommendation(progress),
           estimated_time=next_step.duration
       )
   ```

4. **Spaced Repetition Integration**
   ```python
   async def schedule_review(
       self, 
       user_id: str, 
       concept: str, 
       mastery_level: float
   ):
       """Schedule concept review using spaced repetition algorithm"""
       # SM-2 algorithm for spaced repetition
       interval = self._calculate_review_interval(mastery_level)
       next_review = datetime.now() + timedelta(days=interval)
       
       await create_review_reminder(
           user_id=user_id,
           concept=concept,
           scheduled_for=next_review,
           review_type="concept_reinforcement"
       )
   ```

5. **Frontend: Learning Path Dashboard**
   ```typescript
   // frontend/src/components/learning/LearningPathDashboard.tsx
   interface LearningPathDashboardProps {
     userId: string;
   }
   
   export function LearningPathDashboard({ userId }: LearningPathDashboardProps) {
     const { path, progress } = useLearningPath(userId);
     
     return (
       <div className="learning-path-dashboard">
         <h2>Your Learning Journey</h2>
         
         {/* Progress visualization */}
         <ProgressTimeline steps={path.steps} current={progress.currentStep} />
         
         {/* Current step */}
         <CurrentStepCard step={path.currentStep} progress={progress} />
         
         {/* Next recommendation */}
         <NextRecommendation 
           recommendation={path.nextRecommendation}
           onAccept={handleAcceptRecommendation}
           onSkip={handleSkipRecommendation}
         />
         
         {/* Upcoming reviews */}
         <UpcomingReviews reviews={progress.scheduledReviews} />
         
         {/* Knowledge graph */}
         <KnowledgeGraph concepts={progress.conceptsMastered} />
       </div>
     );
   }
   ```

6. **Database Schema**
   ```sql
   CREATE TABLE learning_paths (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     goal TEXT NOT NULL,
     current_step INTEGER DEFAULT 0,
     status TEXT DEFAULT 'active',
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   
   CREATE TABLE learning_steps (
     id TEXT PRIMARY KEY,
     path_id TEXT REFERENCES learning_paths(id),
     step_number INTEGER NOT NULL,
     topic TEXT NOT NULL,
     description TEXT,
     document_type TEXT,
     estimated_minutes INTEGER,
     prerequisites TEXT,  -- JSON array
     success_criteria TEXT,
     completed BOOLEAN DEFAULT FALSE,
     completed_at TIMESTAMP
   );
   
   CREATE TABLE concept_reviews (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     concept TEXT NOT NULL,
     mastery_level REAL DEFAULT 0.0,
     last_reviewed TIMESTAMP,
     next_review TIMESTAMP,
     review_count INTEGER DEFAULT 0
   );
   ```

**Features**:
- Goal-based path generation ("Learn machine learning", "Master Python")
- Adaptive difficulty based on performance
- Prerequisite detection and recommendation
- Alternative resource suggestions when struggling
- Spaced repetition for concept retention
- Visual progress tracking
- Knowledge graph visualization
- Review reminders and notifications

**Packages**: 
- `scikit-learn` (learning pattern analysis)
- `networkx` (knowledge graph)
- `apscheduler` (review scheduling)

---

### Implementation Priority

**Phase 2 Completion** (Current):
1. Complete Requirement 15 (Visual Identity Adherence Fixes)
2. Complete Requirements 7-14 (Optimization & Polish)

**Post-Phase 2** (Next):
1. RSVP Mode Implementation (4-6h) - High user value
2. Focus Caret Visual Review (1-2h) - Quick win
3. Suggested Questions (2-3h) - Improves discoverability
4. Inline Action Buttons (2-3h) - After UX design

**Post-MVP** (Future):
1. Dashboard & Collections (12-18h) - Essential for multi-document users
2. User Authentication (12-16h) - Required for production
3. Mobile Responsive (8-12h) - Expand user base
4. Export Functionality (4-6h) - User-requested feature
5. Learning Progress Tracking (6-8h) - Differentiator
6. Multi-Document Comparison (8-10h) - Power user feature
7. AI-Generated Personalized Learning Paths (16-20h) - Core value proposition, adaptive learning

---

*Last Updated: January 30, 2026*


---

## Backend Service Optimizations (Deferred from Phase 2)

**Priority**: P2 - Implement after MVP complete  
**Estimated Time**: 20-24 hours total  
**Trigger**: Phase 2 complete, production deployment planned

### Context

Based on comprehensive research of Voyage AI and DeepSeek documentation (see `.kiro/documentation/project-docs/research/iubar_deepseek_voyage_optimization.md`), several advanced optimizations were identified but deferred to avoid scope creep during MVP development.

---

### Task: DeepSeek Reasoner Model Integration

**Priority**: Medium  
**Estimated Time**: 8-12 hours  
**Use Cases**: Learning plan generation, multi-document synthesis, knowledge graphs

#### Scope

Integrate DeepSeek Reasoner model for complex reasoning tasks that benefit from step-by-step thinking.

**When to Use Reasoner vs Chat**:
- **deepseek-chat**: RAG responses, conversational queries, document Q&A (95% of use cases)
- **deepseek-reasoner**: Learning plans, multi-document synthesis, complex analysis, knowledge graph generation

**Implementation**:

1. **Add Model Selection Logic**:
```python
# backend/app/services/deepseek_client.py
class DeepSeekClient:
    MODELS = {
        "chat": "deepseek-chat",
        "reasoner": "deepseek-reasoner"
    }
    
    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model_type: str = "chat",  # "chat" or "reasoner"
        max_retries: int = 3
    ) -> AsyncGenerator[dict, None]:
        model = self.MODELS.get(model_type, self.MODELS["chat"])
        # ... use selected model ...
```

2. **Query Classification**:
```python
# backend/app/services/rag_service.py
def _classify_query_for_model(self, query: str) -> str:
    """Classify query to determine if reasoner model is needed"""
    reasoner_patterns = [
        "create a learning plan",
        "synthesize information from",
        "compare and contrast",
        "analyze the relationship",
        "build a knowledge graph",
        "explain step by step"
    ]
    
    query_lower = query.lower()
    if any(pattern in query_lower for pattern in reasoner_patterns):
        return "reasoner"
    return "chat"
```

3. **Cost Tracking**:
```python
# Reasoner pricing: $0.55/M input, $0.55/M output (vs $0.28/$0.42 for chat)
def _calculate_cost(self, prompt_tokens, completion_tokens, cached_tokens, model_type):
    if model_type == "reasoner":
        input_cost = (prompt_tokens - cached_tokens) * 0.55 / 1_000_000
        cached_cost = cached_tokens * 0.055 / 1_000_000  # Assume 10x cache discount
        output_cost = completion_tokens * 0.55 / 1_000_000
    else:  # chat
        input_cost = (prompt_tokens - cached_tokens) * 0.28 / 1_000_000
        cached_cost = cached_tokens * 0.028 / 1_000_000
        output_cost = completion_tokens * 0.42 / 1_000_000
    
    return input_cost + cached_cost + output_cost
```

**Files to Modify**:
- Update: `backend/app/services/deepseek_client.py`
- Update: `backend/app/services/rag_service.py`
- Update: `backend/app/config.py` (add reasoner model config)
- Create: `backend/tests/test_reasoner_model.py`

**Testing**:
- Unit tests for model selection logic
- Integration tests with real reasoner API calls
- Cost calculation validation
- Performance comparison (reasoner vs chat)

---

### Task: DeepSeek Tool Calling / Function Calling

**Priority**: Medium  
**Estimated Time**: 16-20 hours  
**Use Cases**: Multi-step document discovery, dynamic filtering, structured actions

#### Scope

Implement DeepSeek function calling for advanced multi-step workflows where the model decides which documents to search and how to filter results.

**Benefits**:
- Model-driven document discovery (user asks "compare X and Y", model searches both)
- Dynamic metadata filtering (date ranges, authors, document types)
- Structured actions (create summaries, save notes, export data)

**Implementation**:

1. **Define Tool Schema**:
```python
# backend/app/services/rag_service.py
def get_tools_schema(self) -> List[Dict]:
    return [
        {
            "type": "function",
            "function": {
                "name": "search_documents",
                "description": "Search across all available documents",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search query"},
                        "max_results": {"type": "integer", "default": 5}
                    },
                    "required": ["query"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "search_specific_document",
                "description": "Search within a specific document",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "document_id": {"type": "string"},
                        "query": {"type": "string"}
                    },
                    "required": ["document_id", "query"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "list_documents",
                "description": "List all available documents",
                "parameters": {"type": "object", "properties": {}}
            }
        }
    ]
```

2. **Tool Execution Handler**:
```python
async def _execute_tool(self, tool_name: str, args: Dict, session_id: str) -> Dict:
    if tool_name == "search_documents":
        chunks = await self.retrieve_context(
            query=args["query"],
            n_results=args.get("max_results", 5)
        )
        return {
            "results": [
                {"document": chunk.metadata.get("document_title"), "content": chunk.content[:500]}
                for chunk in chunks.chunks
            ]
        }
    
    elif tool_name == "search_specific_document":
        chunks = await self.retrieve_context(
            query=args["query"],
            document_id=args["document_id"],
            n_results=5
        )
        return {"results": [chunk.content[:500] for chunk in chunks.chunks]}
    
    elif tool_name == "list_documents":
        documents = await self._get_user_documents(session_id)
        return {"documents": [{"id": doc["id"], "title": doc["title"]} for doc in documents]}
    
    else:
        return {"error": f"Unknown tool: {tool_name}"}
```

3. **Streaming with Tool Calls**:
```python
async def generate_response_with_tools(
    self,
    query: str,
    session_id: str,
    enable_tools: bool = True,
    max_tool_iterations: int = 3
) -> AsyncGenerator[dict, None]:
    messages = [{"role": "user", "content": query}]
    tools = self.get_tools_schema() if enable_tools else None
    
    tool_iterations = 0
    
    while tool_iterations < max_tool_iterations:
        response = await self.client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            tools=tools,
            tool_choice="auto",
            stream=False
        )
        
        message = response.choices[0].message
        
        if not message.tool_calls:
            # No tool calls, stream final response
            if message.content:
                yield {"type": "token", "content": message.content}
            yield {"type": "done", "metadata": {}}
            return
        
        # Process tool calls
        messages.append(message)
        
        for tool_call in message.tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)
            
            result = await self._execute_tool(function_name, function_args, session_id)
            
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(result)
            })
        
        tool_iterations += 1
    
    yield {"type": "error", "message": "Max tool iterations reached"}
```

**When NOT to Use**:
- Simple single-turn queries (adds 200-500ms latency)
- Time-sensitive operations
- Bandwidth-constrained environments

**Files to Modify**:
- Update: `backend/app/services/rag_service.py`
- Update: `backend/app/api/chat.py` (add tool calling endpoint)
- Create: `backend/tests/test_tool_calling.py`

**Testing**:
- Unit tests for tool schema validation
- Integration tests with real tool calls
- Multi-step workflow tests
- Error handling (max iterations, invalid tools)

---

### Task: Adaptive Chunk Selection

**Priority**: Low  
**Estimated Time**: 4-6 hours  
**Use Cases**: Dynamic retrieval based on query complexity

#### Scope

Implement dynamic chunk selection where the number of chunks retrieved adapts to query complexity.

**Implementation**:

```python
# backend/app/services/rag_service.py
def _assess_complexity(self, query: str) -> str:
    """Assess query complexity"""
    query_length = len(query.split())
    
    if query_length < 5:
        return "simple"
    elif query_length < 15:
        return "moderate"
    else:
        return "complex"

async def retrieve_context_adaptive(
    self,
    query: str,
    document_id: Optional[str] = None,
    query_complexity: str = "auto",
    ...
) -> RetrievalResult:
    if query_complexity == "auto":
        query_complexity = self._assess_complexity(query)
    
    # Adjust retrieval parameters
    if query_complexity == "simple":
        n_chunks = 3
        n_documents = 1
        threshold = 0.75
    elif query_complexity == "moderate":
        n_chunks = 5
        n_documents = 2
        threshold = 0.70
    else:  # complex
        n_chunks = 7
        n_documents = 3
        threshold = 0.65
    
    # Retrieve with adaptive parameters
    # ... existing logic ...
```

**Files to Modify**:
- Update: `backend/app/services/rag_service.py`
- Create: `backend/tests/test_adaptive_retrieval.py`

---

### Task: Comprehensive Metrics Dashboard

**Priority**: High (for production)  
**Estimated Time**: 20-24 hours  
**Use Cases**: Real-time monitoring, alerting, cost tracking

#### Scope

Implement comprehensive metrics tracking and dashboard for production monitoring.

**Metrics to Track**:

1. **Embedding Metrics**:
   - Total requests, cache hits/misses, hit rate
   - P95/P99 latency
   - Error rate
   - Token usage trends

2. **DeepSeek Metrics**:
   - Total requests, prompt/completion tokens
   - Cache hit rate (cached tokens)
   - P95/P99 latency
   - Estimated cost
   - Error rate

3. **RAG Pipeline Metrics**:
   - Total queries
   - Retrieval latency, generation latency, end-to-end latency
   - Average chunks retrieved
   - Query complexity distribution

**Implementation**:

```python
# backend/app/services/metrics.py
class RAGMetrics:
    def __init__(self):
        self.embedding_metrics = EmbeddingMetrics()
        self.deepseek_metrics = DeepSeekMetrics()
        self.rag_metrics = RAGPipelineMetrics()
    
    def get_dashboard_summary(self) -> dict:
        return {
            "embeddings": self.embedding_metrics.get_summary(),
            "generation": self.deepseek_metrics.get_summary(),
            "rag": self.rag_metrics.get_summary(),
            "timestamp": datetime.now().isoformat()
        }

class EmbeddingMetrics:
    def __init__(self):
        self.total_requests = 0
        self.cache_hits = 0
        self.latencies: List[float] = []
        self.errors = 0
    
    def get_summary(self) -> dict:
        import numpy as np
        return {
            "total_requests": self.total_requests,
            "cache_hit_rate": self.cache_hits / max(self.total_requests, 1),
            "avg_latency_ms": np.mean(self.latencies) if self.latencies else 0,
            "p95_latency_ms": np.percentile(self.latencies, 95) if self.latencies else 0,
            "error_rate": self.errors / max(self.total_requests, 1)
        }
```

**Real-Time Alerts**:
- Cache hit rate < 50% (multi-turn) or < 20% (single query)
- Error rate > 1%
- P95 latency > 5 seconds
- Circuit breaker open state

**Dashboard UI**:
- Real-time metrics display
- Historical trends (last 24h, 7d, 30d)
- Cost tracking and projections
- Alert configuration

**Files to Create**:
- Create: `backend/app/services/metrics.py`
- Create: `backend/app/api/metrics.py` (metrics endpoint)
- Create: `frontend/src/pages/MetricsDashboard.tsx`
- Create: `backend/tests/test_metrics.py`

---

### Task: Redis Embedding Cache

**Priority**: Low (only for horizontal scaling)  
**Estimated Time**: 4-6 hours  
**Use Cases**: Multi-instance deployments, distributed caching

#### Scope

Implement Redis-based embedding cache for multi-instance deployments where in-memory cache doesn't scale.

**Implementation**:

```python
# backend/app/services/embedding_service.py
import redis.asyncio as redis
import json

class RedisCachedEmbeddingService(EmbeddingService):
    def __init__(
        self,
        api_key: str,
        redis_client: redis.Redis,
        ttl_seconds: int = 86400
    ):
        super().__init__(api_key, enable_cache=False)
        self._redis = redis_client
        self._ttl = ttl_seconds
    
    async def _get_from_cache(self, cache_key: str) -> Optional[List[float]]:
        cached = await self._redis.get(f"emb:{cache_key}")
        if cached:
            return json.loads(cached)
        return None
    
    async def _set_in_cache(self, cache_key: str, embedding: List[float]):
        await self._redis.setex(
            f"emb:{cache_key}",
            self._ttl,
            json.dumps(embedding)
        )
```

**Configuration**:
```python
# backend/app/config.py
class Settings(BaseSettings):
    redis_url: Optional[str] = Field(default=None, alias="REDIS_URL")
    redis_cache_ttl: int = 86400  # 24 hours
```

**Files to Modify**:
- Update: `backend/app/services/embedding_service.py`
- Update: `backend/app/config.py`
- Update: `backend/requirements.txt` (add redis)
- Create: `backend/tests/test_redis_cache.py`

**When to Implement**:
- Deploying multiple backend instances
- Need shared cache across instances
- Horizontal scaling required

---

## Summary

These deferred optimizations provide significant value but are not critical for MVP:

| Task | Priority | Effort | Impact |
|------|----------|--------|--------|
| DeepSeek Reasoner | Medium | 8-12h | Advanced reasoning capabilities |
| Tool Calling | Medium | 16-20h | Multi-step workflows |
| Adaptive Chunks | Low | 4-6h | Minor quality improvement |
| Metrics Dashboard | High* | 20-24h | Production monitoring |
| Redis Cache | Low | 4-6h | Horizontal scaling |

*High priority for production, but not needed for MVP/demo

**Total Estimated Time**: 52-68 hours

**Recommended Implementation Order**:
1. Metrics Dashboard (production readiness)
2. DeepSeek Reasoner (feature differentiation)
3. Tool Calling (advanced use cases)
4. Redis Cache (if scaling needed)
5. Adaptive Chunks (nice-to-have)
