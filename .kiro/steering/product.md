# Product Overview

## Product Purpose
Iubar is an AI-enhanced personal knowledge management and structured learning web app. It makes thinking, learning, and creating feel effortless through a hybrid RAG architecture combining vector search with structured memory for intelligent, context-aware interactions.

## Core Value Proposition
1. **Contextual Intelligence**: AI that truly understands your documents and provides structured guidance
2. **Frictionless Experience**: Apple-level simplicity where AI handles administrative burden
3. **Cost-Efficient Scale**: Lean architecture with smart AI optimizations

## Target Users
- **Primary (Continuous Learner)**: Self-improvement focused, moderate-high technical comfort
- **Secondary (Project Builder)**: Personal projects needing structured AI guidance
- **Tertiary (Curious Procrastinator)**: Many interests, needs zero-friction to engage

## UX Philosophy (Apple-Level Simplicity)
- Progressive disclosure: Show only what's needed, when it's needed
- One primary action per screen
- Instant feedback on every interaction (<100ms)
- Beautiful defaults that just work
- Delight in the details
- Desktop-optimized (no mobile in MVP)

## Key UI Components
- **Chat-first interface** with document upload prompt
- **Split-pane layout**: Document viewer (left) + AI chat (right)
- **Focus caret (spark)**: Glowing indicator for contextual awareness
  - Arrow ↑↓ keys move caret by paragraph
  - Click to place caret anywhere
  - AI receives context around caret position
- **Markdown renderer** for all documents
- **Drag-and-drop** file upload
- **Streaming chat responses** with source attribution

## AI Personality: Adaptive Socratic
- Adapts to user's expertise level and learning style
- Guides through questions rather than just providing answers
- **Anti-sycophancy**: Sparse praise, no empty validation, direct engagement
- Honest feedback without sugar-coating

## User Profile System
- Persistent light profile (foundation for future knowledge graph)
- Optional 2-question onboarding (purpose + background), skippable
- Implicit learning from vocabulary and questions
- Cross-session memory persistence

## Error Handling
- Simple, concise, and informative
- No technical jargon for users
- Friendly and actionable error states

## Session Behavior
- No timeout
- Auto-save on every interaction
- Restore on refresh

## User Journey
1. **Welcome**: Chat-first with upload prompt (30-second onboarding)
2. **Document Processing**: Drag-drop → progress indicator → Markdown view
3. **Exploration**: Split-pane with focus caret for contextual AI chat
4. **Deep Learning**: Socratic AI adapts to user level, remembers context

## Success Criteria
- **Functionality**: Core RAG works flawlessly end-to-end
- **UX Excellence**: Apple-level simplicity—intuitive, beautiful, delightful
- **Innovation**: Demonstrates hybrid architecture + cost optimization
- **Performance**: <2s response times, <100ms UI feedback

## MVP Scope

**In Scope**:
- Chat-first interface with document upload
- Document upload (PDF, TXT, MD) via Docling
- URL and GitHub repo ingestion
- Document viewer with focus caret
- AI chat with RAG-powered responses
- Source attribution
- Suggested questions
- Basic session persistence
- Cost tracking display

**Out of Scope (Post-MVP)**:
- Full dashboard with knowledge base management
- Multi-model routing
- Knowledge graph visualization
- Learning progress tracking
- User authentication/multi-user
- Mobile/tablet support
