# Project Structure

## Directory Layout
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
│   └── documentation/       # Project documentation
├── data/                    # Local data storage (SQLite, uploads)
├── docs/                    # Additional documentation
└── README.md                # Project overview and setup
```

## File Naming Conventions
- **General**: every variable/function/class/file/module should be descriptively named so it is maximally readable
- **Python**: snake_case for files, modules, functions, variables
- **TypeScript**: camelCase for variables/functions
- **Components**: PascalCase (e.g., `DocumentUpload.tsx`, `ChatInterface.tsx`)
- **Services**: Descriptive names (e.g., `rag_service.py`, `llm_router.py`)
- **Tests**: `test_*.py` for Python, `*.test.tsx` for TypeScript

## Module Organization
- **Backend Services**: Separate modules for RAG, LLM routing, memory management
- **API Routes**: Grouped by functionality (documents, chat, memory, health)
- **Frontend Components**: Atomic design principles (atoms, molecules, organisms)
- **Shared Types**: Common TypeScript interfaces between frontend and backend
- **Utilities**: Pure functions, no side effects, easily testable

## Configuration Files
- **Backend**: `.env` for environment variables, `config.py` for app settings
- **Frontend**: `vite.config.ts`, `tsconfig.json`, `.env.local`
- **Development**: `pyproject.toml` for Python tooling, `eslint.config.js`
- **Kiro**: `.kiro/settings/mcp.json` for MCP server configuration

## Documentation Structure
- **README.md**: Project overview, setup instructions, architecture
- **DEVLOG.md**: Development timeline, decisions, challenges, time tracking
- **API Documentation**: Auto-generated via FastAPI/Swagger
- **Component Docs**: Storybook for React components (if time permits)

## Asset Organization
- **Static Assets**: `frontend/public/` for images, icons, fonts
- **Generated Assets**: Build outputs in `frontend/dist/`
- **User Uploads**: `data/uploads/` with organized subdirectories
- **Vector Embeddings**: `data/chroma/` for Chroma database files

## Build Artifacts
- **Backend**: No compilation needed (Python interpreted)
- **Frontend**: `frontend/dist/` contains built React application
- **Database**: `data/iubar.db` SQLite database file
- **Logs**: `logs/` directory for application logs

## Environment-Specific Files
- **Development**: `.env.development`, local SQLite, embedded Chroma
- **Testing**: `.env.test`, separate test database, mocked LLM responses
- **Hackathon Demo**: `.env.demo`, optimized for judge evaluation
