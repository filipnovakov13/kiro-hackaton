# Technical Architecture

## Technology Stack
- **Backend**: Python 3.11+ with FastAPI (async support, auto-generated docs)
- **Frontend**: React 18+ with TypeScript, Vite, and TailwindCSS
- **AI/ML**: 
  - Vector Store: Chroma (embedded, no external dependencies)
  - RAG Framework: LlamaIndex (document processing)
  - LLM: DeepSeek V3.2-Exp (single model, cost-optimized via caching)
  - Embeddings: Voyage 3.5 Lite ($0.02/M tokens, 80.3% nDCG, 512 dimensions)
- **Document Processing**: 
  - Docling (PDF/DOCX/PPTX/HTML → Markdown)
  - gitingest/repo2txt (GitHub repos → Markdown)
- **Database**: SQLite (structured data, user profiles)
- **Memory**: JSON-based structured memory store
- **Development**: Kiro IDE for agentic development

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

## AI Cost Optimization

**LLM: DeepSeek V3.2-Exp**
- Input: $0.28/M tokens | Cached: $0.028/M (90% cheaper)
- Output: $0.42/M tokens
- Context: 128K tokens
- Automatic context caching for repeated queries

**Embeddings: Voyage 3.5 Lite**
- Cost: $0.02/M tokens
- Quality: 80.3% nDCG@10 (excellent retrieval)
- Dimensions: 512 (storage efficient)

**Optimization Techniques**:
- Response caching for repeated/similar queries
- Chunking: 512-1024 tokens with overlap
- Token-aware prompting (concise system prompts)
- Top-K retrieval with relevance threshold
- Batch embedding processing
- Cost tracking display (tokens used, estimated cost)

## Development Environment
- **Python**: 3.11+ with virtual environment (.venv in project root)
- **Node.js**: 18+ for frontend development
- **Package Managers**: pip (Python), npm (Node.js)
- **Development Server**: uvicorn (backend), Vite dev server (frontend)
- **IDE**: Kiro IDE with Python, TypeScript

## Code Standards
- **Keywords** DO NOT use restricted keywords for any naming
- **Python**: PEP 8, Black formatting, type hints with mypy
- **TypeScript**: ESLint + Prettier, strict TypeScript configuration
- **API Design**: RESTful endpoints, OpenAPI/Swagger documentation
- **Git**: Conventional commits, feature branch workflow
- **Documentation**: Inline docstrings, README-driven development

## Testing Strategy
- **Backend**: pytest for unit tests, FastAPI TestClient for integration
- **Frontend**: Vitest + React Testing Library for component tests
- **E2E**: Playwright for critical user journeys
- **AI Integration**: Mock LLM responses for consistent testing
- **Coverage**: Minimum 90% for core business logic
- **Unified Runner**: `cmd /c .kiro\scripts\run-all-tests.cmd`

## Performance Requirements
- **Response Time**: <2s for most queries, up to 30s for complex synthesis
- **UI Response**: <100ms for all interactions
- **Concurrent Users**: Support up to 5 simultaneous users (hackathon demo)
- **Document Processing**: Handle PDFs up to 10MB seamlessly
- **Memory Usage**: <2GB RAM for full application stack

## Security Considerations
- **API Keys**: Environment variables, never committed to git
- **Input Validation**: Sanitize all user inputs and external data
- **File Upload**: Restrictions on type and size
- **Prompt Injection**: Defense in RAG queries
- **Data Privacy**: Local storage by default
- **LLM Safety**: Content filtering, rate limiting, cost controls

## Deployment
- **Development**: Local with hot reload
- **Backend**: `python -m uvicorn main:app --reload`
- **Frontend**: `npm run dev`
- **Production**: Docker containerization, environment variables
