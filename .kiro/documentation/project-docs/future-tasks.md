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
