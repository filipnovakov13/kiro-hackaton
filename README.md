# Iubar - AI-Enhanced Personal Knowledge Management

Iubar is an AI-enhanced personal knowledge management and structured learning web app that makes thinking, learning, and creating feel effortless and enjoyable. Built with a Hybrid RAG architecture using vector search and structured memory for intelligent, context-aware interactions.

**Core Value Proposition**:
- **Contextual Intelligence**: AI that truly understands your documents and provides structured guidance
- **Frictionless Experience**: Apple-level simplicity where AI handles the administrative burden
- **Cost-Efficient Scale**: Lean architecture with smart AI optimizations

## Target Users

- **Continuous Learners**: Self-improvement focused, wants efficient learning with tangible progress
- **Project Builders**: Transform ideas into reality with AI as a thinking partner
- **Curious Procrastinators**: Many interests, killed by friction—reduce friction to near-zero and they engage deeply

## Prerequisites

- **Python 3.12+** (Required: ChromaDB compatibility - Python 3.14+ not supported)
- Node.js 18+ (for frontend)
- Git

> **Note**: Python 3.12 is required due to ChromaDB 1.4.1 using Pydantic V1, which does not support Python 3.14+. See [migration guide](.kiro/documentation/python-3.12-migration-guide.md) if upgrading from Python 3.14.

## Quick Start


### 1. Clone and Setup Project
```bash
git clone <repository-url>
cd iubar
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment (if not exists)
python -m venv ../.venv

# Activate virtual environment
# Windows:
..\.venv\Scripts\activate
# Linux/Mac:
source ../.venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template (optional)
cp .env.template .env
# Edit .env if needed for custom configuration
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment template (optional)
cp .env.template .env.local
# Edit .env.local if needed for custom API URL
```

### 4. Run Development Servers

**Backend Server:**
```bash
# From backend/ directory
# Option A: Using startup script (recommended)
python start_server.py

# Option B: Using uvicorn directly
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend Server:**
```bash
# From frontend/ directory
npm run dev
```

### 5. Verify Setup (Optional)

Run the setup verification script to ensure everything is configured correctly:

```bash
# From project root
python setup-verify.py
```

This script will check:
- Python and Node.js versions
- Virtual environment setup
- Required file structure
- Backend import functionality
- Backend health endpoint (if running)

### 6. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Architecture & Codebase Overview

### System Architecture

**Hybrid RAG with Structured Memory**:
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Documents     │──▶│   Vector Store   │───▶│   DeepSeek      │
│  (via Docling)  │    │    (Chroma)      │    │   V3.2-Exp      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                ▲                        │
┌─────────────────┐     ┌──────────────────┐             ▼
│ Structured      │───▶│    SQLite DB     │    ┌─────────────────┐
│ Memory (JSON)   │     │  (User Profile)  │    │   AI Response   │
└─────────────────┘     └──────────────────┘    └─────────────────┘
```

### Technology Stack
- **Backend**: Python 3.11+ with FastAPI (async support, auto-generated docs)
- **Frontend**: React 18+ with TypeScript, Vite, and TailwindCSS
- **AI/ML**: 
  - **LLM**: DeepSeek V3.2-Exp (95% cheaper than GPT-5, frontier performance)
  - **Embeddings**: Voyage 3.5 Lite (80.3% nDCG, quality-first)
  - **Vector Store**: Chroma (embedded, no external dependencies)
  - **Document Processing**: Docling (PDF/DOCX/HTML → Markdown)
  - **GitHub Ingestion**: gitingest (repos → Markdown)
- **Database**: SQLite (judge-friendly, no setup required)
- **Memory**: JSON-based structured memory store + persistent user profiles
- **Development**: Kiro IDE for agentic development

### Directory Structure
```
iubar/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI routes and endpoints
│   │   ├── core/            # Core business logic
│   │   ├── models/          # SQLAlchemy models
│   │   ├── services/        # AI and RAG services
│   │   └── utils/           # Helper functions
│   ├── tests/               # Backend tests
│   ├── requirements.txt     # Python dependencies
│   └── main.py              # FastAPI application entry point
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page-level components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API client functions
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Frontend utilities
│   ├── public/              # Static assets
│   ├── package.json         # Node.js dependencies
│   └── vite.config.ts       # Vite configuration
├── .kiro/
│   ├── steering/            # Project guidelines and context
│   ├── prompts/             # Custom Kiro commands
│   ├── hooks/               # Automated workflows
│   ├── agents/              # Specialized AI agents
│   └── documentation/       # Project documentation
├── data/                    # Local data storage (SQLite, uploads)
└── README.md                # Project overview and setup
```

### Key Components
- **Document Processing** (`backend/app/services/document_processor.py`): Docling-powered document → Markdown conversion
- **Chunking Service** (`backend/app/services/chunk_service.py`): Token-aware chunking with tiktoken (512-1024 tokens, 15% overlap)
- **Embedding Service** (`backend/app/services/embedding_service.py`): Voyage AI integration for 512-dimensional embeddings
- **Vector Store** (`backend/app/services/vector_store.py`): ChromaDB abstraction layer with cosine similarity
- **Task Manager** (`backend/app/services/task_manager.py`): Background task tracking for document pipeline
- **Documents API** (`backend/app/api/documents.py`): Full CRUD + upload/URL endpoints
- **Upload Components** (`frontend/src/components/upload/`): Drag-drop upload, URL input, progress tracking
- **Document List** (`frontend/src/components/documents/DocumentList.tsx`): Document management interface
- **RAG Engine** (`backend/app/services/rag_service.py`): Core AI retrieval and generation logic (Phase 2)
- **Chat Interface** (`frontend/src/components/ChatInterface.tsx`): Main user interaction component (Phase 2)
- **Document Viewer** (`frontend/src/components/DocumentViewer.tsx`): Split-pane Markdown viewer with focus caret (Phase 2)
- **Focus Caret**: Spark/light indicator for contextual AI awareness (arrow keys + click navigation) (Phase 2)

## Deep Dive

### Hybrid RAG Process (Phase 1 Complete, Phase 2 In Progress)

**Phase 1: Document Ingestion Pipeline ✅**
1. **Document Upload**: Drag-drop or URL ingestion (PDF, DOCX, TXT, MD, HTML)
2. **Docling Conversion**: Convert documents to clean Markdown
3. **Intelligent Chunking**: Split into 512-1024 token chunks with 15% overlap
4. **Vector Embedding**: Generate 512-dimensional embeddings with Voyage AI
5. **ChromaDB Storage**: Persist embeddings with cosine similarity search
6. **Status Tracking**: Real-time progress updates via polling

**Phase 2: RAG Query & Chat (Next)**
7. **Smart Retrieval**: Combine vector similarity with structured queries
8. **LLM Routing**: Route queries to DeepSeek V3.2-Exp
9. **Response Generation**: Synthesize contextual responses with source attribution
10. **Streaming Output**: Real-time chat responses with suggested questions

### Advanced Kiro IDE Integration
- **Specialized Agents**: 4 domain-specific agents (backend, frontend, review, UX)
- **Automated Hooks**: Code formatting on save, PR automation with test validation
- **Property-Based Testing**: 23 tests validating configurations and workflows
- **LSP Configuration**: Enhanced code intelligence for Python (Pylance) and TypeScript

### Performance Optimizations
- **Embedded Vector Store**: Chroma eliminates external database dependencies
- **Smart Caching**: DeepSeek context caching (90% cheaper on repeated queries)
- **Async Processing**: FastAPI with async/await for concurrent request handling
- **Quality Embeddings**: Voyage 3.5 Lite for precise semantic retrieval (fewer chunks needed)

### User Journey
1. **Zero-Friction Start**: Drop a document, paste a URL, or link a GitHub repo
2. **Instant Processing**: Docling/gitingest converts to Markdown, Voyage embeds
3. **Chat-First Exploration**: AI asks clarifying questions (Socratic style)
4. **Deep Dive**: Split-pane view with focus caret for contextual questions
5. **Adaptive Learning**: AI adjusts to your expertise level and learning style
6. **Persistent Context**: Profile and session auto-save, restore on refresh

## Development Workflow

### Kiro IDE Customization
- **Custom Prompts**: `@create-pr`, `@update-devlog`, `@code-review`
- **Steering Documents**: Define architecture, coding standards, and project structure
- **Automated Testing**: Property-based tests for configuration validation

### Specialized Agents
- **Backend Agent**: FastAPI, SQLAlchemy, Chroma, and LlamaIndex expertise
- **Frontend Agent**: React 18, TypeScript, Vite, and accessibility focus
- **Review Agent**: Security, performance, and code quality analysis
- **UX Agent**: Visual inspection with Playwright, accessibility compliance

### Testing Strategy
- **Backend**: pytest for unit tests, FastAPI TestClient for integration (81 tests passing)
- **Frontend**: Vitest + React Testing Library for component tests (28 tests passing)
- **E2E**: Playwright for critical user journeys and upload flow validation (7 tests passing)
- **Property-Based**: Hypothesis for correctness guarantees (10 properties validated)
- **Unified Runner**: `.kiro/scripts/run-all-tests.cmd` for backend + frontend tests

## Troubleshooting

### Setup Issues

**Python Virtual Environment Issues**
```bash
# If virtual environment doesn't exist, create it:
python -m venv .venv

# If activation fails on Windows:
.venv\Scripts\activate.bat

# If pip install fails, upgrade pip:
python -m pip install --upgrade pip
```

**Backend Startup Issues**
```bash
# Check if you're in the correct directory:
pwd  # Should show .../backend

# Verify Python can import the app:
python -c "from main import app; print('App loads successfully')"

# Check if dependencies are installed:
pip list | grep fastapi
```

**Frontend Build Issues**
```bash
# Clear node modules and reinstall:
rm -rf node_modules package-lock.json
npm install

# Check Node.js version (requires 18+):
node --version

# Verify TypeScript compilation:
npx tsc --noEmit
```

**Port Conflicts**
```bash
# Backend (change port):
python -m uvicorn main:app --reload --port 8001

# Frontend (change port):
npm run dev -- --port 3000
```

**CORS Issues**
- Ensure backend CORS is configured for your frontend port
- Check `backend/app/config.py` for allowed origins
- Default allows: `http://localhost:3000` and `http://localhost:5173`

### Common Issues

**Vector embeddings are slow**
- Check if Chroma database exists: `ls data/chroma/`
- Verify embedding model is downloaded
- Monitor memory usage during large document processing

**AI responses are inconsistent**
- Check API key configuration in `.env`
- Verify LLM routing logic in `backend/app/services/llm_router.py`
- Review cost optimization settings

**Frontend build fails**
- Clear node modules: `rm -rf frontend/node_modules && npm install`
- Check Node.js version: `node --version` (requires 18+)
- Verify TypeScript configuration in `frontend/tsconfig.json`

**Backend startup errors**
- Ensure virtual environment is activated
- Check Python version: `python --version` (requires 3.11+)
- Verify all dependencies: `pip install -r requirements.txt`

**Kiro hooks not triggering**
- Check hook configuration: `ls .kiro/hooks/`
- Verify file patterns in hook conditions

### Performance Issues

**Memory usage is high**
- Check Chroma vector store size: `du -sh data/chroma/`
- Review JSON memory store for large objects
- Implement cleanup for old embeddings

### Getting Help
- Check application logs: `tail -f logs/app.log`
- Review Kiro IDE documentation: https://kiro.dev/docs/
- Monitor API endpoints: http://localhost:8000/docs
- Open an issue on GitHub with error details and system information

## Development Status

**Current Phase**: Foundation Phase Complete ✅ (Week 3)

### Completed Features

**Phase 1: Foundation (100% Complete)**
- ✅ Document upload and processing (PDF, DOCX, TXT, MD, URL)
- ✅ Docling integration for document conversion to Markdown
- ✅ Chunking service (512-1024 tokens, 15% overlap, tiktoken)
- ✅ Voyage AI embeddings (voyage-3.5-lite, 512 dimensions)
- ✅ ChromaDB vector storage with abstraction layer
- ✅ FastAPI backend with async SQLite + WAL mode
- ✅ Background task processing for document pipeline
- ✅ React frontend with drag-and-drop upload
- ✅ Document CRUD operations (list, get, delete)
- ✅ Status tracking and polling
- ✅ Health and status endpoints
- ✅ Comprehensive test suite (116 tests passing)
  - 81 backend tests (unit + property-based + integration)
  - 28 frontend tests (unit + integration)
  - 7 E2E Playwright tests

**Infrastructure & Tooling**
- ✅ Hybrid RAG architecture design completed
- ✅ PRD finalized with all core decisions
- ✅ Advanced Kiro IDE features (hooks, agents, specialized prompts)
- ✅ Property-based testing with Hypothesis
- ✅ E2E testing with Playwright
- ✅ LSP integration (Pylance + TypeScript)
- ✅ Unified test runner for backend + frontend

### In Progress

**Phase 2: RAG Core (Next)**
- 🚧 DeepSeek V3.2-Exp LLM integration
- 🚧 RAG query pipeline with vector search
- 🚧 Chat interface with streaming responses
- 🚧 Source attribution and suggested questions
- ⏳ Split-pane UI with focus caret
- ⏳ User profile system

**Time Investment**: ~34 hours
- Architecture & Planning: 5h
- Backend Development: 12h
- Frontend Development: 6h
- Testing & Debugging: 13h
- Configuration & Tooling: 3h

**Next Milestones**:
1. DeepSeek chat integration with RAG
2. Split-pane UI with document viewer
3. Focus caret implementation (spark indicator)
4. Streaming chat responses with source attribution

## Contributing

This project uses Kiro IDE for development automation. Key workflows:

1. **Code Formatting**: Automatic on save (Black for Python, Prettier for TypeScript)
2. **Pull Requests**: Automated creation with test validation via `@create-pr`
3. **Code Review**: Security and quality analysis via specialized review agent
4. **Testing**: Property-based validation of configurations and workflows