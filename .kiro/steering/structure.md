# Project Structure

## Directory Layout
```
iubar/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI routes and endpoints
│   │   ├── core/             # Core business logic
│   │   ├── models/           # SQLAlchemy/Pydantic models
│   │   ├── services/         # AI, RAG, and document processing services
│   │   └── utils/            # Helper functions
│   ├── tests/                # Backend tests (pytest)
│   ├── requirements.txt      # Python dependencies
│   ├── main.py               # FastAPI application entry point
│   └── start_server.py       # Server startup script
├── frontend/
│   ├── src/
│   │   ├── components/       # React components (atomic design)
│   │   ├── pages/            # Page-level components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API client functions
│   │   ├── types/            # TypeScript type definitions
│   │   └── utils/            # Frontend utilities
│   ├── tests/                # Frontend tests (Vitest + Playwright)
│   ├── public/               # Static assets
│   ├── screenshots/          # E2E test screenshots
│   ├── package.json          # Node.js dependencies
│   ├── vite.config.ts        # Vite configuration
│   ├── vitest.config.ts      # Vitest test configuration
│   └── playwright.config.ts  # Playwright E2E configuration
├── .kiro/
│   ├── steering/             # Project guidelines and context
│   ├── prompts/              # Custom Kiro commands
│   ├── specs/                # Feature specifications
│   ├── hooks/                # Agent hooks
│   ├── scripts/              # Utility scripts (test runners, etc.)
│   ├── settings/             # Kiro settings (MCP config)
│   └── documentation/        # Project documentation
│       └── project-docs/     # PRD, future tasks, etc.
├── data/                     # Local data storage
│   ├── uploads/              # User uploaded documents
│   ├── chroma/               # Vector embeddings (Chroma DB)
│   └── iubar.db              # SQLite database
├── examples/                 # Example files and devlog
├── .agents/                  # Agent-generated artifacts
│   └── code-reviews/         # Code review documents
└── README.md                 # Project overview and setup
```

## Architecture Overview

**Hybrid RAG with Structured Memory**:
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Documents     │──▶│   Vector Store   │───▶│   DeepSeek      │
│  (via Docling)  │    │    (Chroma)      │    │   V3.2-Exp      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                ▲                        │
┌─────────────────┐     ┌──────────────────┐             ▼
│ Structured      │───▶│    SQLite DB     │    ┌─────────────────┐
│ Memory (JSON)   │     │  (Relationships) │    │   AI Response   │
└─────────────────┘     └──────────────────┘    └─────────────────┘
```

**Document Processing Pipeline**:
```
PDF/DOCX/URL/GitHub → Docling/gitingest → Markdown → Chunker → Voyage Embeddings → Chroma
```

## File Naming Conventions
- **General**: Descriptive names for maximum readability
- **Python**: snake_case for files, modules, functions, variables
- **TypeScript**: camelCase for variables/functions
- **Components**: PascalCase (e.g., `DocumentUpload.tsx`, `ChatInterface.tsx`)
- **Services**: Descriptive names (e.g., `rag_service.py`, `document_processor.py`)
- **Tests**: `test_*.py` for Python, `*.test.ts(x)` for TypeScript, `*.spec.ts` for Playwright

## Module Organization

### Backend Services
- **Document Processing**: Docling integration, gitingest for GitHub repos
- **RAG Service**: Vector search, context retrieval, response generation
- **LLM Service**: DeepSeek V3.2-Exp integration with caching
- **Embedding Service**: Voyage 3.5 Lite embeddings
- **Memory Service**: User profile and session management

### API Routes
- `/api/documents` - Document upload, processing, retrieval
- `/api/chat` - AI chat with RAG-powered responses
- `/api/memory` - User profile and session management
- `/api/health` - Health checks and status

### Frontend Components
- **Atomic Design**: atoms → molecules → organisms → templates → pages
- **Core Components**: DocumentViewer, ChatInterface, FocusCaret, UploadZone
- **Layout**: Split-pane (document left, chat right)

## Configuration Files
- **Backend**: `.env` for secrets, `config.py` for app settings
- **Frontend**: `vite.config.ts`, `tsconfig.json`, `.env.local`
- **Testing**: `vitest.config.ts`, `playwright.config.ts`
- **Kiro**: `.kiro/settings/mcp.json` for MCP server configuration

## Documentation Structure
- **README.md**: Project overview, setup instructions
- **PRD.md**: Product requirements document (`.kiro/documentation/project-docs/`)
- **DEVLOG.md**: Development timeline, decisions, time tracking (`examples/`)
- **API Docs**: Auto-generated via FastAPI/Swagger at `/docs`

## Data Storage
- **SQLite**: `data/iubar.db` - User profiles, document metadata, sessions
- **Chroma**: `data/chroma/` - Vector embeddings for RAG
- **Uploads**: `data/uploads/` - Original uploaded documents
- **Memory**: JSON-based structured memory store

## Build Artifacts
- **Backend**: Python interpreted (no compilation)
- **Frontend**: `frontend/dist/` - Built React application
- **Logs**: `logs/` directory for application logs

## Environment-Specific Files
- **Development**: `.env.development`, local SQLite, embedded Chroma
- **Testing**: `.env.test`, separate test database, mocked LLM responses
- **Demo**: `.env.demo`, optimized for hackathon judge evaluation

## Supported Input Types (MVP)
| Type | Example | Processing |
|------|---------|------------|
| **PDF** | Research papers, books | Docling → Markdown → Chunks |
| **URL** | Blog posts, articles | Web scrape → Markdown → Chunks |
| **Text/MD** | Notes, documentation | Direct → Chunks |
| **GitHub** | Repositories | gitingest/repo2txt → Markdown → Chunks |
