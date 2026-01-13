# Product Requirements Document: Iubar

## Executive Summary

Iubar is an AI-enhanced personal knowledge management and structured learning web application designed to make thinking, learning, and creating feel effortless and enjoyable. The system uses a hybrid RAG (Retrieval-Augmented Generation) architecture combining vector search with structured memory for intelligent, context-aware interactions that understand your knowledge deeply.

The core value proposition is threefold:
1. **Contextual Intelligence**: AI that truly understands your documents and provides structured guidance, not just answers
2. **Frictionless Experience**: Apple-level simplicity where the AI handles administrative burden (organizing, connecting, tracking) so users can focus on thinking and creating
3. **Cost-Efficient Scale**: A lean architecture with smart AI optimizations that remains inexpensive even with large knowledge bases and heavy usage

**MVP Goal**: Deliver a polished, intuitive application where users experience the "wow" of contextual AI understanding while feeling their learning process has become fun, challenging, and liberating—all within 10 days.

## Mission

**Mission Statement**: Remove the friction between curiosity and understanding. Empower individuals to learn, think, and create with an AI companion that handles the administrative burden while making the journey feel fun, challenging, and liberating.

**Core Principles**:
1. **Zero-Friction First**: Every interaction should feel effortless; if it feels like work, redesign it
2. **Context is Everything**: AI that remembers, connects, and builds on previous interactions
3. **Fun Over Features**: A delightful experience beats a feature-rich but clunky one
4. **Lean & Mean**: Cost-efficient architecture that scales without breaking the bank
5. **User Autonomy**: Users control their data and learning journey; AI assists, never dictates

**UX Philosophy** (Apple-Level Simplicity):
- Progressive disclosure: Show only what's needed, when it's needed
- One primary action per screen
- Instant feedback on every interaction
- Beautiful defaults that just work
- Delight in the details

## Target Users

**Primary Persona: The Continuous Learner**
- Individuals focused on self-improvement and skill development
- Technical comfort: Moderate to high (comfortable with web apps)
- Motivation: Wants to learn efficiently and see tangible progress
- Pain points:
  - Information scattered across multiple sources
  - Difficulty connecting concepts across different domains
  - No persistent context in AI interactions
  - Learning progress not tracked systematically
  - Spends too much time organizing instead of learning

**Secondary Persona: The Project Builder**
- People working on personal projects needing structured guidance
- Technical comfort: Varies
- Motivation: Transform ideas into reality with AI as a thinking partner
- Pain points:
  - Ideas remain unstructured and unactionable
  - Lack of AI assistance that understands project context
  - No system to track project evolution
  - Overwhelmed by the gap between idea and execution

**Tertiary Persona: The Curious Procrastinator**
- People with many interests who struggle to follow through due to friction
- Technical comfort: Low to moderate (wants things to "just work")
- Motivation: Wants to explore interests without the overhead of "getting started"
- Pain points:
  - High friction kills curiosity before it can flourish
  - Too many steps between "I'm curious about X" and actually learning
  - Organizational overhead feels like work, not exploration
  - Previous tools required too much setup/maintenance
  - Guilt about unfinished learning projects
- Key insight: **Reduce friction to near-zero and they'll engage deeply**

## MVP Scope

### In Scope (10-Day Timeline)

**Core Functionality**
- ✅ Chat-first interface with document upload prompt
- ✅ Document upload (PDF, TXT, MD) via Docling
- ✅ URL ingestion (web pages, articles)
- ✅ GitHub repo ingestion (via gitingest/repo2txt → Markdown)
- ✅ Document chunking and vector embedding
- ✅ AI chat with RAG-powered contextual responses
- ✅ **Document viewer with focus indicator** (ChapterPal-style)
- ✅ Source attribution linked to document sections
- ✅ Suggested questions after document processing
- ✅ Basic session persistence

**Smart AI Layer**
- ✅ DeepSeek V3.2-Exp (single model, optimized via aggressive caching)
- ✅ Voyage 3.5 Lite embeddings (quality-first for semantic search)
- ✅ Response caching for repeated/similar queries
- ✅ Cost tracking display (tokens used, estimated cost)

**Technical**
- ✅ FastAPI backend with async support
- ✅ React + TypeScript + TailwindCSS frontend
- ✅ Chroma vector store (embedded)
- ✅ SQLite for structured data
- ✅ Docling for document processing

**UX Polish**
- ✅ Drag-and-drop upload
- ✅ Processing progress indicators
- ✅ Instant visual feedback on all actions
- ✅ Clean, minimal interface (Apple-inspired)
- ✅ Desktop-optimized layout (no mobile support in MVP)

### Out of Scope (Post-MVP)

**Deferred Features**
- ❌ Full dashboard with knowledge base management
- ❌ Multi-model routing (Mistral, Gemini, Grok, etc.)
- ❌ Scientific paper (arXiv) integration
- ❌ Knowledge graph visualization
- ❌ Learning progress tracking
- ❌ User authentication/multi-user
- ❌ Collections/folders organization
- ❌ Browser-based embeddings (offline mode)
- ❌ Audio/video transcription
- ❌ Export functionality
- ❌ Mobile/tablet support

## User Stories

[PLACEHOLDER - To be refined through discussion]

1. **As a learner**, I want to upload my study materials, so that I can ask questions about them later.

2. **As a learner**, I want to chat with an AI that knows my documents, so that I get contextual answers.

3. **As a user**, I want to see which documents the AI used for its response, so that I can verify the information.

4. **As a user**, I want the AI to remember my preferences, so that responses are personalized.

5. **As a user**, I want a simple interface to upload and manage documents, so that I can easily build my knowledge base.

## Core Architecture

**Hybrid RAG Architecture**:
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Documents     │──▶│   Vector Store   │───▶│  DeepSeek       │
│  (via Docling)  │    │    (Chroma)      │    │  V3.2-Exp       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                ▲                        │
┌─────────────────┐     ┌──────────────────┐             ▼
│ Structured      │───▶│    SQLite DB     │    ┌─────────────────┐
│ Memory (JSON)   │     │  (Relationships) │    │   AI Response   │
└─────────────────┘     └──────────────────┘    └─────────────────┘
```

**Key Design Patterns**:
- Repository pattern for data access
- Service layer for business logic
- Async/await for concurrent processing
- Environment-based configuration

## User Flow Design

**Philosophy**: Chat-first for zero friction → Document viewer for deep exploration

### Flow 1: First-Time User (The "Wow" Moment)

```
┌─────────────────────────────────────────────────────────────────┐
│                     WELCOME SCREEN                               │
│                                                                  │
│     "What would you like to explore today?"                     │
│                                                                  │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  Drop a document, paste a link, or just ask...      │     │
│     │  ________________________________________________   │     │
│     │  📎 PDF  🔗 URL  📄 Text  🐙 GitHub                 │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                  │
│     Examples: "Explain this research paper"                     │
│               "Help me understand this codebase"                │
│               "What are the key concepts in this book?"         │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 2: Document Conversation (ChapterPal-style with Focus Caret)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────────┐  │
│  │      DOCUMENT VIEWER            │  │         AI CHAT                  │  │
│  │      (Rendered Markdown)        │  │                                  │  │
│  │                                 │  │  AI: "I've read through this    │  │
│  │  # Machine Learning Basics      │  │  document. It covers supervised │  │
│  │                                 │  │  learning and neural networks.  │  │
│  │  ## Chapter 1: Introduction     │  │  What draws your attention?"    │  │
│  │                                 │  │                                  │  │
│  │  Machine learning is a subset   │  │  Suggested:                      │  │
│  │  of artificial intelligence...  │  │  • "What's the main idea here?" │  │
│  │                                 │  │  • "Explain like I'm a beginner"│  │
│  │  ## Chapter 2: Supervised       │  │                                  │  │
│  │  Learning                       │  │  ────────────────────────────── │  │
│  │                                 │  │                                  │  │
│  │  ✨ ← FOCUS CARET (spark)       │  │  User: "Explain this part"      │  │
│  │                                 │  │                                  │  │
│  │  Supervised learning involves   │  │  AI: "This section introduces   │  │
│  │  training a model on labeled    │  │  supervised learning. Before I  │  │
│  │  data. The algorithm learns...  │  │  explain, what do you already   │  │
│  │                                 │  │  know about training data?"     │  │
│  │  ## Chapter 3: Neural Networks  │  │  [Source: Ch.2]                 │  │
│  │                                 │  │                                  │  │
│  │  Neural networks are...         │  │  ┌────────────────────────────┐ │  │
│  │                                 │  │  │ Ask about this section...  │ │  │
│  └─────────────────────────────────┘  │  └────────────────────────────┘ │  │
│                                       └──────────────────────────────────┘  │
│                                                                              │
│  Controls: ↑↓ Move caret | Click to place | Scroll follows caret            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Focus Caret Behavior**:
- Visual: Small glowing spark/light ball (✨) positioned at left margin
- Position: Follows user's scroll position (stays at bottom of visible area)
- Movement: Arrow ↑↓ keys move caret up/down by paragraph/section
- Placement: Click anywhere in document to place caret at that line
- Context: AI automatically receives the text around the caret position
- Implicit: "Explain this" or "What does this mean" uses caret context

**Key UX Principles**:
- Split-pane layout: Document (Markdown) on left, chat on right
- Everything rendered as Markdown for simplicity
- Focus caret is subtle but always visible
- Bidirectional linking: Chat references ↔ Document sections
- Context is implicit: No need to copy-paste or quote text

### Flow 3: Transition to Dashboard (Power Mode) [POST-MVP]

After initial conversation, user sees subtle prompt:
```
"Want more control? → Open Dashboard"
```

Dashboard provides (future):
- Knowledge base overview (all uploaded documents)
- Collections/folders for organization
- Search across all documents
- Learning progress tracking
- Settings and preferences

### Supported Input Types (MVP)

| Type | Example | Processing |
|------|---------|------------|
| **PDF** | Research papers, books | Docling → Markdown → Chunks |
| **URL** | Blog posts, articles | Web scrape → Markdown → Chunks |
| **Text/MD** | Notes, documentation | Direct → Chunks |
| **GitHub** | Repositories | gitingest/repo2txt → Markdown → Chunks |

**[FUTURE]**: Scientific papers (arXiv), YouTube transcripts, Audio files

## Technology Stack

**Backend**:
- Python 3.11+
- FastAPI (async web framework)
- LlamaIndex (RAG framework)
- Chroma (vector store)
- SQLite (structured data)
- Pydantic (data validation)
- **Docling** (document ingestion - PDF/DOCX/PPTX/HTML → Markdown)
- **gitingest** or **repo2txt** (GitHub repo → Markdown)

**Frontend**:
- React 18+
- TypeScript
- Vite (build tool)
- TailwindCSS (styling - utility-first for rapid UI development)

**AI/ML (MVP)**:
- **LLM**: DeepSeek V3.2-Exp ($0.028-0.42/M tokens)
- **Embeddings**: Voyage 3.5 Lite ($0.02/M tokens, 80.3% nDCG)
- **Vector Store**: Chroma (embedded, no external dependencies)

**Document Processing Pipeline**:
```
PDF/DOCX/URL/GitHub → Docling/gitingest → Markdown → Chunker → Voyage Embeddings → Chroma
```

## AI Cost Optimization Strategy

**Why This Matters**: For judges, demonstrating cost-awareness shows production-readiness. For users, it means the app can scale without becoming expensive.

### MVP Model Selection: DeepSeek V3.2-Exp Only

**Why DeepSeek V3.2-Exp**:
- **Pricing**: $0.028/M (cached) | $0.28/M input | $0.42/M output
- **Performance**: Matches frontier models (GPT-5 level) at 95% lower cost
- **Context**: 128K tokens (sufficient for most documents)
- **Caching**: Automatic context caching dramatically reduces costs for repeated queries
- **Simplicity**: Single model = simpler architecture, faster development

**Cost Comparison** (per 1M tokens):
| Model | Input Cost | Output Cost | vs DeepSeek |
|-------|------------|-------------|-------------|
| DeepSeek V3.2-Exp | $0.28 | $0.42 | baseline |
| DeepSeek (cached) | $0.028 | $0.42 | 90% cheaper input |
| GPT-5 Mini | $0.25 | $2.00 | 5× more expensive output |
| Gemini 3 Flash | $0.50 | $3.00 | 7× more expensive output |

**[FUTURE] Multi-Model Routing** (Post-MVP):
| Tier | Model | Use Case |
|------|-------|----------|
| Budget | DeepSeek V3.2-Exp | Default, cached queries |
| Fast | Grok 4.1 Fast | Long-context (2M tokens) |
| Quality | Gemini 3 Flash | Complex reasoning |

### Embedding Strategy: Voyage 3.5 Lite

**Why Voyage 3.5 Lite** ($0.02/M tokens):
- **Performance**: 80.3% nDCG@10 (excellent retrieval quality)
- **Dimensions**: 512 (storage efficient, fast similarity search)
- **Quality-First**: Better embeddings = better RAG responses
- **Cost**: 2× budget options but significantly better results

**Alternative for Future**: BAAI/bge-m3 ($0.01/M) for self-hosting

### Cost Optimization Techniques

1. **Smart Caching Layer**
   - Cache embeddings for uploaded documents (compute once, use forever)
   - Cache frequent query patterns and responses
   - Semantic similarity matching to serve cached responses for similar questions

2. **Efficient Chunking Strategy**
   - Optimal chunk sizes (512-1024 tokens) to balance context vs. cost
   - Overlap strategy to maintain coherence without redundancy
   - Metadata-rich chunks to enable precise retrieval (fewer chunks needed)

3. **Token-Aware Prompting**
   - Concise system prompts (every token counts)
   - Dynamic context window: include only relevant chunks
   - Response length guidance to prevent verbose outputs

4. **Retrieval Optimization**
   - Top-K retrieval with relevance threshold (don't send irrelevant context)
   - Hybrid search: vector + keyword to improve precision
   - Re-ranking to ensure best chunks are used

5. **[FUTURE] Multi-Model Routing**
   - Simple queries → cheaper models (GPT-3.5 or local)
   - Complex queries → GPT-4o
   - Classification layer to route intelligently

**Demo Metrics to Show**:
- Tokens used per query (average)
- Estimated cost per interaction
- Cache hit rate
- Comparison: naive RAG vs. optimized RAG cost

## Success Criteria

**MVP Success Definition**:
A polished demo where users experience the "wow" of contextual AI understanding, feel the joy of frictionless learning, and judges recognize both the UX excellence and the technical innovation in cost optimization.

**Judge-Focused Criteria**:
1. **Functionality** (Primary): Core RAG works flawlessly end-to-end
2. **UX Excellence**: Apple-level simplicity—intuitive, beautiful, delightful
3. **Innovation**: Demonstrates hybrid architecture + cost optimization benefits
4. **Leanness**: Visible evidence of smart AI layer optimizations

## AI Personality & Teaching Style

**Core Personality: Adaptive Socratic**

The AI adapts its communication style to the user's context while maintaining a Socratic foundation that guides through questions rather than just providing answers.

**Adaptive Dimensions**:
- **Expertise Level**: Detects beginner vs. advanced based on questions and vocabulary
- **Learning Style**: Adjusts explanations (visual metaphors, step-by-step, big-picture)
- **Pace**: Matches user's engagement speed (quick answers vs. deep dives)
- **Tone**: Professional for technical content, casual for exploration

**Socratic Foundation**:
- Asks clarifying questions before diving into explanations
- Challenges assumptions gently: "What makes you think that?"
- Guides discovery: "What do you notice about this pattern?"
- Encourages reflection: "How does this connect to what you learned earlier?"

**Anti-Sycophancy Rules**:
- **Sparse praise**: Acknowledgment is rare and only for genuine insights
- **No empty validation**: Avoid "Great question!" or "Excellent point!" patterns
- **Direct engagement**: Jump into substance, not pleasantries
- **Honest feedback**: If user's understanding is off, guide correction without sugar-coating

**Example Interactions**:

*Beginner asking about machine learning:*
> User: "What is supervised learning?"
> AI: "Have you ever taught someone by showing them examples? Like showing a child pictures of cats and dogs until they can tell them apart? That's the core idea. What do you think 'supervised' might mean in this context?"

*Advanced user asking about the same topic:*
> User: "Explain the bias-variance tradeoff in supervised learning"
> AI: "Given your question, I assume you're familiar with overfitting. How would you describe the relationship between model complexity and generalization error? That'll help me tailor my explanation."

*User makes an incorrect assumption:*
> User: "So neural networks are just like the human brain?"
> AI: "That's a common analogy, but it can be misleading. What specific similarities are you thinking of? The reality is more nuanced—neural networks borrow some concepts but work quite differently."

**System Prompt Principles**:
- Never be condescending
- Match the user's energy and depth
- Ask questions that advance understanding, not quiz questions
- Provide direct answers when the user clearly wants them
- Remember context from earlier in the conversation
- Praise sparingly—only for genuine breakthroughs or insights

## User Profile & Memory System

**MVP Implementation: Persistent Light Profile**

A simple but persistent user profile that captures learning context and preferences. This is the foundation for the future knowledge graph system.

**Profile Structure** (stored in SQLite + JSON):
```json
{
  "user_id": "uuid",
  "created_at": "timestamp",
  "profile": {
    "background": "student|professional|hobbyist|researcher",
    "interests": ["machine learning", "philosophy", "business strategy"],
    "expertise_areas": {
      "machine_learning": "intermediate",
      "philosophy": "beginner",
      "programming": "advanced"
    },
    "learning_preferences": {
      "style": "visual|conceptual|hands-on",
      "pace": "quick|thorough",
      "depth": "overview|deep-dive"
    }
  },
  "interaction_history": {
    "topics_explored": ["supervised learning", "neural networks"],
    "questions_asked": 47,
    "documents_uploaded": 5,
    "last_session": "timestamp"
  },
  "inferred_context": {
    "current_focus": "understanding ML fundamentals",
    "knowledge_gaps": ["backpropagation", "gradient descent"],
    "strengths": ["intuitive understanding", "pattern recognition"]
  }
}
```

**Profile Building**:
- **Optional onboarding**: Brief questions on first use (can skip)
- **Implicit learning**: AI infers expertise from vocabulary and questions
- **Explicit updates**: User can correct AI's assumptions through conversation
- **Cross-session memory**: Profile persists and evolves over time

**How AI Uses Profile**:
- Adjusts explanation complexity based on expertise_areas
- References previously explored topics for connections
- Avoids re-explaining concepts user has demonstrated understanding of
- Identifies and addresses knowledge_gaps proactively

**Onboarding Flow** (Optional, skippable):
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  "Quick question to help me understand you better"              │
│  (you can skip this)                                            │
│                                                                  │
│  What brings you here today?                                    │
│  ○ Learning something new                                       │
│  ○ Working on a project                                         │
│  ○ Exploring out of curiosity                                   │
│  ○ Skip for now                                                 │
│                                                                  │
│  [If not skipped]                                               │
│                                                                  │
│  What's your background?                                        │
│  ○ Student                                                      │
│  ○ Professional                                                 │
│  ○ Hobbyist/Self-learner                                        │
│  ○ Researcher                                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**[FUTURE] Knowledge Graph Evolution**:
- Profile becomes nodes in personal knowledge graph
- Connections between concepts user has learned
- Visual representation of learning journey
- Spaced repetition suggestions based on knowledge decay

## Demo Strategy

**Demo Domains** (to be refined with specific documents):

| Domain | Example Content | Demonstrates |
|--------|-----------------|--------------|
| **Technical** | ML paper, programming tutorial | Expertise adaptation, technical depth |
| **Business/Strategy** | Business case study, market analysis | Professional context, structured thinking |
| **Creative/Philosophical** | Philosophy essay, creative writing guide | Abstract reasoning, open-ended exploration |

**Demo Flow**:
1. **Cold start**: Show zero-friction upload experience
2. **First interaction**: AI asks clarifying question (Socratic)
3. **Focus caret**: Demonstrate contextual awareness
4. **Adaptation**: Show AI adjusting to user's level
5. **Cost display**: Show tokens used, estimated cost
6. **Profile**: Show how AI remembers context across questions

**Functional Requirements**:
- ✅ Upload documents with drag-and-drop simplicity
- ✅ Process documents up to 10MB seamlessly
- ✅ Generate contextual AI responses in <3 seconds
- ✅ Display source attribution elegantly (not cluttered)
- ✅ Auto-organize uploaded content (AI handles the admin)
- ✅ Persist context across sessions

**UX Requirements**:
- ✅ First-time user can upload and chat within 30 seconds
- ✅ Zero configuration required to start
- ✅ Every action provides instant visual feedback
- ✅ Error states are friendly and actionable
- ✅ Interface feels calm, not overwhelming

**Cost Optimization Requirements**:
- ✅ Response caching for repeated/similar queries
- ✅ Smart chunking to minimize token usage
- ✅ Efficient embedding strategy (batch processing)
- ✅ Demonstrate cost metrics in demo (tokens used, estimated cost)

## Implementation Phases

### Phase 1: Foundation (Days 1-3)
**Goal**: Document ingestion pipeline and basic UI shell

**Backend**:
- ✅ FastAPI project structure with async support
- ✅ Docling integration for PDF/DOCX → Markdown
- ✅ gitingest/repo2txt for GitHub → Markdown
- ✅ Chroma vector store setup
- ✅ Voyage 3.5 Lite embedding integration
- ✅ SQLite schema for user profiles and documents

**Frontend**:
- ✅ React + TypeScript + TailwindCSS setup
- ✅ Welcome screen with upload prompt
- ✅ Drag-and-drop file upload
- ✅ URL/GitHub input field
- ✅ Processing progress indicator

**Validation**: Can upload a PDF and see it converted to Markdown

### Phase 2: RAG Core (Days 4-6)
**Goal**: Working Q&A with document context

**Backend**:
- ✅ Document chunking pipeline (512-1024 tokens)
- ✅ DeepSeek V3.2-Exp integration
- ✅ RAG query endpoint with context retrieval
- ✅ Response caching layer
- ✅ Cost tracking (tokens, estimated cost)

**Frontend**:
- ✅ Split-pane layout (document viewer + chat)
- ✅ Markdown renderer for documents
- ✅ Focus caret (spark) implementation
- ✅ Arrow key navigation for caret
- ✅ Click-to-place caret
- ✅ Chat interface with streaming responses
- ✅ Source attribution links

**Validation**: Can ask questions about uploaded document, see focus caret work

### Phase 3: Intelligence Layer (Days 7-8)
**Goal**: Adaptive AI and user profile

**Backend**:
- ✅ User profile CRUD endpoints
- ✅ Profile inference from interactions
- ✅ Socratic system prompt with anti-sycophancy rules
- ✅ Context-aware response generation (uses caret position)

**Frontend**:
- ✅ Optional onboarding flow (background, interests)
- ✅ Suggested questions after document load
- ✅ Cost metrics display
- ✅ Session persistence

**Validation**: AI adapts to user level, remembers context across questions

### Phase 4: Polish & Demo Prep (Days 9-10)
**Goal**: Demo-ready application

**Polish**:
- ✅ Error handling and friendly error states
- ✅ Loading states and animations
- ✅ Visual refinement (Apple-level attention to detail)
- ✅ Performance optimization

**Demo Prep**:
- ✅ Prepare 3 demo documents (technical, business, creative)
- ✅ End-to-end testing with demo flow
- ✅ Documentation and README updates
- ✅ Demo script and talking points

**Validation**: Complete demo flow works flawlessly

## Risks & Mitigations

1. **Risk**: LLM API costs exceed budget
   - **Mitigation**: Implement response caching, limit document size

2. **Risk**: Document processing is too slow
   - **Mitigation**: Async processing, progress indicators

3. **Risk**: RAG responses are not relevant
   - **Mitigation**: Tune chunk size, improve prompts, test with real documents

4. **Risk**: Time runs out before core features complete
   - **Mitigation**: Strict MVP scope, daily progress checks

5. **Risk**: Integration issues between frontend/backend
   - **Mitigation**: API-first development, early integration testing

## Open Questions

**All Core Questions Resolved** ✅

- ✅ LLM choice: DeepSeek V3.2-Exp (single model, cost-optimized via caching)
- ✅ Embedding model: Voyage 3.5 Lite (quality-first)
- ✅ Document processing: Docling + gitingest
- ✅ AI personality: Adaptive Socratic with sparse praise
- ✅ User profile: Persistent light profile (foundation for knowledge graph)
- ✅ Focus indicator: Spark/light caret with arrow key navigation
- ✅ Mobile support: Desktop-only for MVP
- ✅ Onboarding flow: 2 questions (purpose + background), skippable
- ✅ Error handling tone: Simple, concise, and informative (no technical jargon)
- ✅ Session behavior: No timeout, auto-save on every interaction, restore on refresh

**Deferred to Dedicated Sessions** (see `project-docs/future-tasks.md`):
- 🎨 Visual Identity Design - dedicated deep-dive session planned
- 📄 Demo Documents Selection - choose specific documents for 3 domains
- 🔄 API Resilience Strategy - handling unresponsive APIs gracefully

---

*Document Version: 1.0*
*Last Updated: January 13, 2026*
*Status: Complete - Ready for implementation*
