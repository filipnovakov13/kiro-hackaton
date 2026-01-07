# Iubar - AI-Enhanced Personal Knowledge Management

Iubar is an AI-enhanced personal knowledge management and structured learning web app that combines the best of PKM (Personal Knowledge Management) with AI tutoring capabilities. Built with a Hybrid RAG architecture using vector search and structured memory for intelligent, long-term user interactions.

## Prerequisites

- Python 3.11+
- Node.js 18+ (for frontend)
- Git
- Kiro CLI installed and authenticated

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

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
│   Documents     │──▶│   Vector Store   │───▶│  Smart Routing  │
│   (PDF, Text)   │    │    (Chroma)      │    │   LLM Layer     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                ▲                        │
┌─────────────────┐     ┌──────────────────┐             ▼
│ Structured      │───▶│    SQLite DB     │    ┌─────────────────┐
│ Memory (JSON)   │     │  (Relationships) │    │   AI Response   │
└─────────────────┘     └──────────────────┘    └─────────────────┘
```

### Technology Stack
- **Backend**: Python 3.11+ with FastAPI (async support, auto-generated docs)
- **Frontend**: React 18+ with TypeScript and Vite (modern, fast development)
- **AI/ML**: 
  - Vector Store: Chroma (embedded, no external dependencies)
  - RAG Framework: LlamaIndex (superior document processing)
  - LLM Integration: 
- **Database**: SQLite (judge-friendly, no setup required)
- **Memory**: JSON-based structured memory store
- **Development**: Kiro IDE for agentic development

### Directory Structure
```
iubar/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI routes and endpoints
│   │   ├── core/             # Core business logic
│   │   ├── models/           # SQLAlchemy models
│   │   ├── services/         # AI and RAG services
│   │   └── utils/            # Helper functions
│   ├── tests/                # Backend tests
│   ├── requirements.txt      # Python dependencies
│   └── main.py               # FastAPI application entry point
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
- **RAG Engine** (`backend/app/services/rag_service.py`): Core AI retrieval and generation logic
- **Document Processing** (`backend/app/services/document_service.py`): PDF/text chunking and embedding
- **Smart LLM Router** (`backend/app/services/llm_router.py`): Cost-optimized AI model selection
- **Chat Interface** (`frontend/src/components/ChatInterface.tsx`): Main user interaction component
- **Knowledge Graph** (`frontend/src/components/KnowledgeGraph.tsx`): Visualization of document relationships

## Deep Dive

### Hybrid RAG Process
1. **Document Ingestion**: Upload and intelligently chunk various document types
2. **Vector Embedding**: Generate embeddings using state-of-the-art models
3. **Structured Memory**: Store relationships and user preferences in SQLite
4. **Smart Retrieval**: Combine vector similarity with structured queries
5. **LLM Routing**: Route queries to appropriate AI model based on complexity
6. **Response Generation**: Synthesize contextual responses with source attribution

### Advanced Kiro IDE Integration
- **Specialized Agents**: 4 domain-specific agents (backend, frontend, review, UX)
- **Automated Hooks**: Code formatting on save, PR automation with test validation
- **Property-Based Testing**: 23 tests validating configurations and workflows
- **LSP Configuration**: Enhanced code intelligence for Python (Pylance) and TypeScript

### Performance Optimizations
- **Embedded Vector Store**: Chroma eliminates external database dependencies
- **Smart Caching**: JSON-based memory store for user preferences and session history
- **Async Processing**: FastAPI with async/await for concurrent request handling
- **Cost Optimization**: Intelligent LLM routing

### User Journey
1. **Onboarding**: Upload initial documents, set learning goals and interests
2. **Knowledge Building**: Add documents, notes, and ideas to the system
3. **AI Interaction**: Ask questions, get tutoring, explore connections
4. **Project Development**: Transform ideas into structured project plans
5. **Progress Tracking**: Monitor learning advancement and knowledge growth
6. **Continuous Learning**: Iterative improvement through AI-guided discovery

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
- **Backend**: pytest for unit tests, FastAPI TestClient for integration
- **Frontend**: Vitest + React Testing Library for component tests
- **E2E**: Playwright for critical user journeys and UX validation
- **Property-Based**: fast-check for configuration and workflow validation

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

**Current Phase**: Foundation & Architecture (Week 1)
- ✅ Hybrid RAG architecture design completed
- ✅ Advanced Kiro IDE features implemented (hooks, agents, testing)
- ✅ Frontend testing infrastructure with TypeScript + Vitest + Playwright
- ✅ Property-based testing for configuration validation (23 tests passing)
- 🚧 Backend API development in progress
- 🚧 Frontend React components in progress
- ⏳ RAG engine implementation planned
- ⏳ Document processing pipeline planned

**Time Investment**: ~5 hours (Architecture decisions, Kiro setup, testing infrastructure)

**Next Milestones**:
1. FastAPI + React project structure setup
2. Basic Chroma vector store implementation
3. Document upload and chunking pipeline
4. Core Q&A functionality with AI tutoring

## Contributing

This project uses Kiro IDE for development automation. Key workflows:

1. **Code Formatting**: Automatic on save (Black for Python, Prettier for TypeScript)
2. **Pull Requests**: Automated creation with test validation via `@create-pr`
3. **Code Review**: Security and quality analysis via specialized review agent
4. **Testing**: Property-based validation of configurations and workflows