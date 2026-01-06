# Technical Architecture

## Technology Stack
- **Backend**: Python 3.11+ with FastAPI (async support, auto-generated docs)
- **Frontend**: React 18+ with TypeScript and Vite (modern, fast development)
- **AI/ML**: 
  - Vector Store: Chroma (embedded, no external dependencies)
  - RAG Framework: LlamaIndex (superior document processing)
  - LLM Integration: OpenAI GPT-4o, Anthropic Claude, local Ollama fallback
- **Database**: SQLite (judge-friendly, no setup required)
- **Memory**: JSON-based structured memory store
- **Development**: Kiro IDE for agentic development

## Architecture Overview
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

## Development Environment
- **Python**: 3.11+ with virtual environment
- **Node.js**: 18+ for frontend development
- **Package Managers**: pip (Python), npm (Node.js)
- **Development Server**: uvicorn (backend), Vite dev server (frontend)
- **IDE**: Kiro IDE with Python, TypeScript

## Code Standards
- **Python**: PEP 8, Black formatting, type hints with mypy
- **TypeScript**: ESLint + Prettier, strict TypeScript configuration
- **API Design**: RESTful endpoints, OpenAPI/Swagger documentation
- **Git**: Conventional commits, feature branch workflow
- **Documentation**: Inline docstrings, README-driven development

## Testing Strategy
- **Backend**: pytest for unit tests, FastAPI TestClient for integration, Postman power for API testing
- **Frontend**: Jest + React Testing Library for component tests
- **AI Integration**: Mock LLM responses for consistent testing
- **E2E**: Playwright for critical user journeys
- **Coverage**: Minimum 90% for core business logic

## Deployment Process
- **Development**: Local development with hot reload
- **Hackathon Demo**: Single-command setup (pip install + uvicorn)
- **Production Ready**: Docker containerization, environment variables
- **CI/CD**: GitHub Actions for automated testing and deployment

## Performance Requirements
- **Response Time**: <2s for most queries, up to 30s for complex synthesis, <100ms on UI responses
- **Concurrent Users**: Support up to 5 simultaneous users (hackathon demo)
- **Document Processing**: Handle PDFs up to 50MB, 1000+ pages. For larger documents create a chunking strategy
- **Memory Usage**: <2GB RAM for full application stack

## Security Considerations
- **API Keys**: Environment variables, never committed to git
- **Input Validation**: Sanitize all user inputs and all external data, file upload restrictions
- **Authentication**: JWT tokens for session management (if time permits)
- **Data Privacy**: Local storage by default, clear data handling policies
- **LLM Safety**: Content filtering, rate limiting, cost controls, prompt injection defense
