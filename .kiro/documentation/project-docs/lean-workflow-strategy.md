# Lean Workflow Strategy for Iubar Development with Kiro Agent

**Goal**: Create a leaner, more manageable workflow that handles project complexity while maximizing Kiro agent productivity

**Status**: Planning Phase - Iteration 1  
**Date**: January 23, 2026

---

## Executive Summary

Based on comprehensive research and critical analysis of what's actually implementable in Kiro IDE, this strategy focuses on **high-impact, low-effort improvements** that can be implemented immediately without requiring custom tooling or infrastructure.

### Key Insight from Research

The research recommends sophisticated solutions (LangGraph, vector databases, observability frameworks), but **Kiro IDE doesn't support these yet**. We need to work within Kiro's current capabilities while preparing for future enhancements.

### What Kiro IDE Actually Supports (Current Reality)

✅ **Available**:
- File operations (read, write, delete with tools)
- Command execution (executePwsh, controlPwshProcess)
- LSP diagnostics (getDiagnostics)
- Custom prompts (.kiro/prompts/)
- Steering files (.kiro/steering/)
- Spec files (.kiro/specs/)
- Manual state tracking (markdown files, JSON files)

❌ **NOT Available** (Yet):
- LangGraph or stateful agent frameworks
- Automatic checkpointing systems
- Vector database integration for context retrieval
- Observability frameworks (Langfuse, Prometheus)
- Multi-agent orchestration
- Automatic task decomposition via LLM

### Our Pragmatic Approach

**Focus on what we CAN do NOW that will produce the BIGGEST gains:**

1. **Simplify Context** (70% reduction possible)
2. **Manual State Tracking** (simple JSON + markdown)
3. **Phase-Based Specs** (break monolith into chunks)
4. **Consolidated Steering** (one core file + references)
5. **Structured Tasks** (templates with explicit scope)

---

## Strategy 1: Immediate Context Reduction (HIGHEST PRIORITY)

### Problem
- Current: 26,500 tokens loaded every time
- Agent loses focus, forgets instructions, makes mistakes

### Solution: Three-Tier Context System

#### Tier 1: Core Rules (ALWAYS LOADED)
Create `.kiro/steering/core-rules.md` - **1,500 tokens max**

```markdown
# Core Development Rules

## CRITICAL SAFETY (Priority 0)
- NEVER delete files without explicit permission
- ALWAYS run getDiagnostics before/after code changes
- ALWAYS update task status in current phase tasks.md

## Instruction Priority (When Conflicts Occur)
1. Critical Safety (above)
2. User Direct Instructions (current conversation)
3. Current Phase Spec (requirements.md, design.md, tasks.md)
4. LSP Validation (type safety, imports)
5. Testing Patterns (see testing-strategy.md when writing tests)

## Quality Gates (Every Task)
- [ ] LSP diagnostics clean (no new errors)
- [ ] Tests pass
- [ ] Files modified are in task scope
- [ ] Task status updated

## Checkpoints (Every Task or after 20 minutes)
Document: tasks completed, files modified, tests status, issues

## When Uncertain
1. Check current phase spec first
2. If still unclear, check detailed steering file
3. If still unclear, STOP and ask user

---

**Detailed Guides** (read only when needed):
- Testing patterns: `.kiro/steering/testing-strategy.md`
- LSP usage: `.kiro/steering/lsp-mandatory.md`
- Tech stack: `.kiro/steering/tech.md`
- Product vision: `.kiro/steering/product.md`
- Project structure: `.kiro/steering/structure.md`
- Shell commands: `.kiro/steering/shell-commands.md`
```

**Impact**: Reduce steering context from 15,000 → 1,500 tokens (90% reduction)

#### Tier 2: Current Phase Only (PHASE-SPECIFIC)
Instead of loading entire rag-core-phase (9,500 tokens), break into phases:

```
.kiro/specs/
├── phase-1-backend-foundation/     (COMPLETED)
│   ├── requirements.md (300 tokens)
│   ├── design.md (300 tokens)
│   ├── tasks.md (400 tokens)
│   └── state.md (status tracking)
│
├── phase-2-rag-core/               (CURRENT)
│   ├── requirements.md (800 tokens)
│   ├── design.md (600 tokens)
│   ├── tasks.md (1,200 tokens)
│   └── state.md
│
├── phase-3-frontend-core/          (NEXT)
│   ├── requirements.md
│   ├── design.md
│   ├── tasks.md
│   └── state.md
│
└── phase-4-integration/            (FUTURE)
    ├── requirements.md
    ├── design.md
    ├── tasks.md
    └── state.md
```

**Impact**: Reduce spec context from 9,500 → 2,600 tokens (73% reduction)

#### Tier 3: Current Task Only (TASK-SPECIFIC)
Agent only sees current task details, not all 80+ tasks

**Impact**: Additional 1,000-2,000 token reduction

### Total Context Reduction
```
BEFORE: 26,500 tokens
AFTER:  ~6,000 tokens
REDUCTION: 77%
```

**Effort**: 1-2 days to reorganize files  
**Gain**: 3-4x longer agent sessions before context limits

---

## Strategy 2: Manual State Tracking (HIGH PRIORITY)

### Problem
- Agent stops mid-task, no way to resume
- No visibility into what's been completed

### Solution: Simple JSON + Markdown State Files

Since Kiro doesn't have automatic checkpointing, we use manual state tracking that the agent updates.

#### Phase State File: `state.md`

```markdown
# Phase 2: RAG Core - State Tracking

## Phase Info
- **Status**: IN_PROGRESS
- **Started**: 2026-01-20
- **Last Updated**: 2026-01-23 14:30
- **Progress**: 6/15 tasks (40%)

## Task Status

### ✅ Completed Tasks
- [x] 2.1 - Implement RAG service (45 min) - 2026-01-20
- [x] 2.2 - Add vector search (30 min) - 2026-01-20
- [x] 2.3 - Create embedding service (40 min) - 2026-01-21

### ⏳ In Progress
- [ ] 2.4 - Implement chat endpoint (current)
  - Started: 2026-01-23 14:00
  - Files modified: backend/app/api/chat.py
  - Notes: Working on streaming response

### ⏭️ Pending
- [ ] 2.5 - Add response caching
- [ ] 2.6 - Implement session management
- [ ] 2.7 - Add rate limiting
... (remaining tasks)

## Files Modified This Phase
- backend/app/services/rag_service.py
- backend/app/services/embedding_service.py
- backend/app/api/chat.py (in progress)
- backend/tests/test_rag_service.py
- backend/tests/test_embedding_service.py

## Tests Status
- Passing: 52
- Failing: 0
- Coverage: 87%

## Issues Log
1. **RESOLVED** - AsyncMock not working with generators
   - Solution: Used MagicMock with side_effect factory
   - Reference: testing-strategy.md

## Last Checkpoint: #3 - 2026-01-23 12:00
- Tasks completed since last: 2.3
- Tests added: test_embedding_service.py
- All validations passing: YES
- Ready to continue: YES

## Next Checkpoint Due
- After task 2.6 completes OR
- At 2026-01-23 15:00 (whichever comes first)
```

#### Agent Instructions for State Management

Add to execute.md:

```markdown
## State Management Protocol

### Before Starting ANY Task
1. Read current phase `state.md`
2. Update task status to ⏳ IN_PROGRESS
3. Add timestamp and your name

### After Completing Task
1. Update task status to ✅ COMPLETE
2. Add duration, files modified
3. Update "Files Modified This Phase" section
4. Update "Tests Status" section
5. Add any issues to "Issues Log"

### Every 3 Tasks (Checkpoint)
1. Create checkpoint entry in state.md
2. Summarize progress
3. Verify all validations passing
4. Document any blockers

### On Interruption/Error
1. Update current task with notes
2. Mark status as ⏸️ PAUSED or ❌ FAILED
3. Document what was attempted
4. Save state.md immediately
```

**Effort**: 1 day to create templates and update execute.md  
**Gain**: 100% recovery from interruptions, full visibility

---

## Strategy 3: Phase-Based Spec Decomposition (HIGH PRIORITY)

### Problem
- Current rag-core-phase has 80+ tasks
- Agent gets overwhelmed, loses focus

### Solution: Break into 4 Focused Phases

#### Phase Breakdown

**Phase 1: Backend Foundation** (COMPLETED)
- Database setup
- Basic models
- Configuration
- **Tasks**: 15 (all ✅)

**Phase 2: RAG Core** (CURRENT - SPLIT THIS)
Split into 2 sub-phases:

**Phase 2A: RAG Services** (10 tasks)
- RAG service implementation
- Vector store integration
- Embedding service
- Document processing
- Chunking service

**Phase 2B: API Layer** (8 tasks)
- Chat endpoint
- Document endpoints
- Streaming responses
- Error handling
- Rate limiting

**Phase 3: Frontend Core** (15 tasks)
- React components
- Document viewer
- Chat interface
- Upload functionality
- Styling

**Phase 4: Integration & Polish** (12 tasks)
- Frontend-backend integration
- E2E testing
- Performance optimization
- Documentation
- Deployment prep

#### Phase Template Structure

```
phase-2a-rag-services/
├── requirements.md          # 300-500 lines
├── design.md                # 300-500 lines
├── tasks.md                 # 10-15 tasks
├── state.md                 # Status tracking
└── README.md                # Phase overview
```

Each phase:
- **Self-contained**: Can be executed independently
- **Focused**: 10-15 tasks maximum
- **Clear scope**: Explicit in/out of scope
- **Testable**: Clear acceptance criteria

**Effort**: 2-3 days to reorganize current spec  
**Gain**: Agent maintains focus, 95%+ task completion rate

---

## Strategy 4: Consolidated Steering (MEDIUM PRIORITY)

### Problem
- 6 steering files, 15,000 tokens
- Agent confused by conflicting instructions

### Solution: Core Rules + Just-In-Time References

Already covered in Strategy 1, but to emphasize:

**Keep**:
- core-rules.md (1,500 tokens) - ALWAYS loaded
- All detailed steering files - loaded ONLY when needed

**Agent behavior**:
- Starts with core-rules.md only
- When writing tests → reads testing-strategy.md
- When using LSP → reads lsp-mandatory.md
- When confused about tech → reads tech.md

**Effort**: 1 day to create core-rules.md  
**Gain**: 90% steering context reduction

---

## Strategy 5: Structured Task Templates (MEDIUM PRIORITY)

### Problem
- Tasks lack structure
- Scope creep common
- Incomplete implementations

### Solution: Mandatory Task Template

```markdown
## Task 2.4: Implement Chat Endpoint with Streaming

### Metadata
- **Type**: BACKEND
- **Priority**: HIGH
- **Estimated Duration**: 45 minutes
- **Dependencies**: 2.1 (RAG service), 2.2 (Vector search)

### Scope

**In Scope**:
- File: `backend/app/api/chat.py`
- Function: `chat_endpoint()` and `stream_response()`
- Lines: Create new file

**Out of Scope**:
- Authentication (separate task)
- Rate limiting (separate task)
- Frontend integration (Phase 3)

### Requirements
1. POST /api/chat endpoint accepting {session_id, message}
2. Stream response using SSE (Server-Sent Events)
3. Integrate with RAG service for context retrieval
4. Return sources with response
5. Handle errors gracefully (RAG failures, empty context)

### Acceptance Criteria
- [ ] Endpoint responds to POST /api/chat
- [ ] Response streams via SSE
- [ ] RAG context retrieved and used
- [ ] Sources included in response
- [ ] Errors return proper status codes
- [ ] Unit tests pass (>80% coverage)
- [ ] Integration test passes
- [ ] LSP diagnostics clean

### Validation Commands
```bash
# Unit tests
python -m pytest backend/tests/test_chat_api.py -v

# Integration test
python -m pytest backend/tests/test_chat_integration.py -v

# LSP check
# (agent runs getDiagnostics automatically)
```

### Context Files to Read
- `backend/app/services/rag_service.py` (RAG integration pattern)
- `backend/app/api/documents.py` (API endpoint pattern)
- `backend/tests/test_document_api.py` (test pattern)

### Implementation Notes
[Agent fills this in during execution]

### Completion Summary
[Agent fills this in after completion]
- Duration: [ACTUAL]
- Files created: [LIST]
- Files modified: [LIST]
- Tests added: [COUNT]
- Issues encountered: [LIST]
```

**Effort**: 1 day to create template, 2-3 days to update existing tasks  
**Gain**: Zero scope creep, 95%+ first-attempt completion

---

## Implementation Roadmap

### Week 1: Foundation (Immediate)

**Day 1-2: Context Reduction**
- [ ] Create core-rules.md (consolidate steering)
- [ ] Test with agent on simple task
- [ ] Measure token reduction

**Day 3-4: Phase Decomposition**
- [ ] Break rag-core-phase into phase-2a and phase-2b
- [ ] Create phase templates
- [ ] Move tasks to appropriate phases

**Day 5: State Tracking**
- [ ] Create state.md template
- [ ] Update execute.md with state management protocol
- [ ] Test recovery from interruption

**Deliverable**: 70%+ context reduction, resumable execution

### Week 2: Task Structure (Next)

**Day 1-2: Task Templates**
- [ ] Create structured task template
- [ ] Update 5-10 tasks as examples
- [ ] Test with agent

**Day 3-4: Remaining Tasks**
- [ ] Update all phase-2a tasks
- [ ] Update all phase-2b tasks
- [ ] Validate scope boundaries

**Day 5: Integration Testing**
- [ ] Run agent on full phase-2a
- [ ] Measure completion rate
- [ ] Document issues

**Deliverable**: 95%+ task completion rate

### Week 3: Refinement (Polish)

**Day 1-2: Optimize**
- [ ] Refine core-rules.md based on agent behavior
- [ ] Adjust phase boundaries if needed
- [ ] Improve task templates

**Day 3-4: Documentation**
- [ ] Document workflow for team
- [ ] Create quick-start guide
- [ ] Write troubleshooting guide

**Day 5: Validation**
- [ ] Full phase execution test
- [ ] Measure all success metrics
- [ ] Plan Phase 3 (frontend)

**Deliverable**: Production-ready workflow

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Context Size** | 26,500 tokens | 6,000 tokens | Token count in execute prompt |
| **Session Duration** | 1-2 hours | 4-6 hours | Time before context limits |
| **Task Completion** | 70-80% | 95%+ | ✅ tasks / total tasks |
| **Recovery Time** | N/A (impossible) | < 5 minutes | Time to resume after interruption |
| **Scope Violations** | Common | 0 | Files modified outside task scope |
| **File Deletions** | 2 incidents | 0 | Unauthorized deletions |

---

## What We're NOT Doing (And Why)

### ❌ LangGraph / Automatic Checkpointing
**Why**: Kiro IDE doesn't support external Python frameworks yet  
**Alternative**: Manual state tracking in markdown/JSON

### ❌ Vector Database for Context Retrieval
**Why**: Requires infrastructure setup, Kiro doesn't have built-in support  
**Alternative**: Phase-based chunking + manual references

### ❌ Observability Frameworks (Langfuse, Prometheus)
**Why**: Requires external services, complex setup  
**Alternative**: Simple markdown logs + manual metrics

### ❌ Multi-Agent Orchestration
**Why**: Kiro doesn't support subagents yet  
**Alternative**: Single agent with focused phases

### ❌ Automatic Task Decomposition via LLM
**Why**: Requires additional LLM calls, complex prompt engineering  
**Alternative**: Manual task decomposition by human

---

## Critical Success Factors

### 1. Discipline in State Management
Agent MUST update state.md after every task. This is non-negotiable.

### 2. Phase Boundaries Must Be Respected
Don't let agent jump between phases. Complete phase-2a before starting phase-2b.

### 3. Core Rules Must Be Minimal
If core-rules.md grows beyond 2,000 tokens, we've failed. Keep it lean.

### 4. Task Scope Must Be Explicit
Every task must have clear "In Scope" and "Out of Scope" sections.

### 5. Regular Checkpoints
Every 3 tasks, no exceptions. This is our recovery mechanism.

---

## Risks & Mitigation

### Risk 1: Agent Ignores State Management
**Mitigation**: Make state updates part of task acceptance criteria

### Risk 2: Phase Decomposition Too Granular
**Mitigation**: Keep phases at 10-15 tasks, no smaller

### Risk 3: Core Rules Grow Too Large
**Mitigation**: Regular review, move details to specific steering files

### Risk 4: Task Templates Too Rigid
**Mitigation**: Allow flexibility in "Implementation Notes" section

### Risk 5: Context Still Too Large
**Mitigation**: Further split phases, reduce task template size

---

## Next Steps (Immediate Actions)

1. **Review this strategy** with team/stakeholders
2. **Iterate on plan** based on feedback
3. **Create core-rules.md** (Day 1 of implementation)
4. **Test with agent** on simple task
5. **Measure results** and adjust

---

## Questions for Iteration

1. **Phase Granularity**: Is 10-15 tasks per phase the right size, or should we go smaller (5-8 tasks)?

2. **State Format**: Is markdown sufficient for state.md, or should we use JSON for easier parsing?

3. **Checkpoint Frequency**: Every 3 tasks or every 30 minutes - which is more practical?

4. **Task Template**: Is the proposed template too detailed or not detailed enough?

5. **Core Rules**: What's the absolute minimum that must be in core-rules.md?

6. **Steering References**: Should agent automatically load specific steering files based on task type, or always ask first?

7. **Recovery Protocol**: What should agent do if state.md is corrupted or missing?

---

## Conclusion

This strategy focuses on **pragmatic, implementable improvements** that work within Kiro IDE's current capabilities. By reducing context by 77%, implementing manual state tracking, and decomposing specs into focused phases, we can achieve:

- **3-4x longer agent sessions**
- **95%+ task completion rate**
- **100% recovery from interruptions**
- **Zero unauthorized file operations**

The key is **simplicity and discipline**. We're not building a sophisticated agent framework - we're creating a lean workflow that maximizes productivity with the tools we have.

**Total effort**: 2-3 weeks  
**Expected ROI**: 3-5x improvement in agent productivity  
**Risk level**: Low (all changes are reversible)

---

**Status**: Ready for review and iteration  
**Next**: Get feedback, refine plan, begin implementation
