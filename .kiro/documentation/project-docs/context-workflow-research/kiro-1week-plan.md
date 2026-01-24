# Iubar AI Agent Optimization - Kiro IDE Edition
## 1-Week Hackathon Implementation Plan

**ADAPTED FOR KIRO CAPABILITIES** • Immediately implementable • Zero third-party integrations  
**Date**: January 23-30, 2026 | **Effort**: ~14 hours | **ROI**: 3-4x longer sessions, 95%+ task completion

---

## THE SITUATION

- **Time Remaining**: 7 days
- **Platform**: Kiro IDE (Claude backend, agent hooks, steering, specs)
- **Current Issues**: Context overflow, mid-task stopping, no state tracking, scope creep
- **Target**: Production-ready hackathon completion

---

## KIRO CAPABILITIES (What Actually Works)

### ✅ Available Features

1. **Agent Steering** (`.kiro/steering/*.md`)
   - Configure project context and rules
   - `inclusion: always` for critical rules
   - `inclusion: fileMatch` for conditional rules
   - `inclusion: manual` for reference docs

2. **Agent Hooks** (`.kiro/hooks/`)
   - Trigger on: File Save, Agent Stop, Prompt Submit, Manual Trigger
   - Execute: Agent prompts or shell commands
   - Use case: Auto-update state.md, run validation, force checkpoints

3. **Spec Mode** (`.kiro/specs/*/`)
   - Requirements + Design + Tasks (all in sync)
   - Can reference specific specs with `#spec` context provider
   - Auto-generates commit messages

4. **Context Management**
   - `#spec` provider: Reference entire spec or specific files
   - `#codebase`: Auto-find relevant files
   - `#file`: Reference specific files
   - Resources field: Persistent context (configure in agent config)
   - Max 75% of context window for files

5. **Diagnostics**
   - LSP integration for type checking
   - Can reference via `#terminal` for build output
   - Kiro understands errors and suggests fixes

### ❌ NOT Available in Kiro (Don't Try)

- LangGraph or stateful frameworks
- Automatic checkpointing between turns
- Vector database for semantic search
- External observability platforms
- Multi-agent systems or subagents

---

## IMPLEMENTATION PLAN (Tonight + Next Week)

### TONIGHT (4 hours): Core Context Reduction

**Goal**: Reduce context overhead from 26,500 → 8,000 tokens (70% reduction)

#### Step 1: Create Core Steering (`core-rules.md`)
```
.kiro/steering/core-rules.md
```

```markdown
# CORE DEVELOPMENT RULES FOR IUBAR

## Priority: CRITICAL (Always Include)

### 1. Safety First
- NEVER delete files without explicit user permission
- NEVER modify files outside current task scope
- ALWAYS run diagnostics after code changes
- ALWAYS commit after completed tasks

### 2. Instruction Hierarchy (When Conflicts Occur)
1. User direct commands in this chat → HIGHEST
2. Current phase spec (Phase N requirements/design/tasks)
3. Safety rules (above)
4. Steering file details (when needed)
5. LSP diagnostics (type checking)

### 3. Quality Gates (Every Task)
✓ LSP diagnostics clean (no new errors)
✓ Passing tests
✓ Files modified in task scope only
✓ state.md updated
✓ Task marked complete

### 4. State Management (Required)
- READ state.md BEFORE starting task
- UPDATE state.md AFTER completing task
- Never leave state.md stale (more than 1 task behind)

### 5. When Uncertain
- Check current phase spec first
- Ask user for clarification (don't guess)
- Document the uncertainty in state.md

---

## Detailed Guides (Read Only When Needed)

See specific steering files:
- Testing: `.kiro/steering/testing-patterns.md`
- Code style: `.kiro/steering/code-style.md`  
- Architecture: `.kiro/steering/architecture.md`
- API design: `.kiro/steering/api-design.md`
```

**Tokens**: ~800 tokens  
**Include Setting**: `inclusion: always`

#### Step 2: Reorganize Specs for Current Phase

Current structure (problem):
```
.kiro/specs/
└── rag-core-phase/
    ├── requirements.md (9,500 lines - TOO BIG)
    ├── design.md
    └── tasks.md (80+ tasks)
```

New structure (solution):
```
.kiro/specs/
├── PHASE_1_COMPLETE/
│   ├── requirements.md
│   ├── design.md
│   ├── tasks.md
│   └── state.md
│
├── PHASE_2A_RAG_SERVICES/ (CURRENT)
│   ├── requirements.md (300 tokens - in-scope tasks only)
│   ├── design.md
│   ├── tasks.md (15 tasks instead of 80)
│   └── state.md
│
├── PHASE_2B_API_LAYER/ (NEXT)
│   ├── requirements.md
│   ├── design.md
│   ├── tasks.md
│   └── state.md
│
└── PHASE_3_FRONTEND/ (FUTURE)
    ├── requirements.md
    ├── design.md
    ├── tasks.md
    └── state.md
```

**Action**: 
- Extract current in-progress tasks from rag-core into phase-2a-requirements.md
- Extract remaining tasks into phase-2b, phase-3, etc.
- Delete old rag-core-phase files
- Create empty state.md for each phase

**Result**: Specs context reduced from 9,500 → 2,500 tokens

#### Step 3: Configure Agent Resources

Add to `.kiro/agent.json` (or agent config):
```json
{
  "name": "iubar-agent",
  "description": "Iubar hackathon development agent",
  "resources": [
    "file://.kiro/steering/core-rules.md",
    "file://.kiro/specs/PHASE_2A_RAG_SERVICES/requirements.md",
    "file://.kiro/specs/PHASE_2A_RAG_SERVICES/design.md",
    "file://.kiro/specs/PHASE_2A_RAG_SERVICES/state.md"
  ],
  "settings": {
    "compaction": {
      "enabled": true,
      "excludeMessages": 3
    }
  }
}
```

This ensures only core rules + current phase spec are always loaded.

**Result**: Total context ~5,000 tokens (77% reduction from original 26,500)

---

### DAY 1 (3 hours): Resumable Execution via Hooks + State

**Goal**: Implement auto-checkpoint system that lets you resume mid-task

#### Step 1: Create State Tracking Hook

Create `.kiro/hooks/state-tracking.md`:

```markdown
# Hook: Auto-Update State on Agent Stop

**Trigger Type**: Agent Stop

**Agent Prompt**:
You just completed a task. Update the state file with:

1. Task status: mark as ✅ COMPLETE with timestamp
2. Files modified: list all files you touched
3. Tests: report pass/fail status
4. Issues: add any blockers or notes
5. Next task: what should happen next?

Files to update:
- .kiro/specs/PHASE_2A_RAG_SERVICES/state.md

Format:
```markdown
## ✅ Task [ID]: [Title] - Completed 2026-01-24 15:30

**Duration**: 45 minutes
**Files Modified**:
- backend/app/services/rag_service.py
- backend/tests/test_rag_service.py

**Tests**: ✅ All passing (12 tests, 89% coverage)

**Notes**: Streaming response still needs work, see next task

**Next Task**: Task 2.5 - Add response caching
```

**Behavior**: When you click "Stop" on agent, this hook automatically updates state.md with completion details.
```

#### Step 2: Create State.md Template

Create `.kiro/specs/PHASE_2A_RAG_SERVICES/state.md`:

```markdown
# Phase 2A: RAG Services - State Tracking

## Phase Status
- **Status**: IN_PROGRESS
- **Started**: 2026-01-20
- **Target Completion**: 2026-01-28
- **Progress**: 0/15 tasks (0%)

## Current Task
- **Task**: 2.1 - Implement RAG service
- **Status**: ⏳ IN_PROGRESS
- **Started**: 2026-01-24 14:00
- **Duration**: 30 minutes estimated
- **Files**: backend/app/services/rag_service.py
- **Context**: Use embedding service from Phase 1

## Completed Tasks
(None yet - update as you go)

## Pending Tasks
2.1 - Implement RAG service (current)
2.2 - Add vector search
2.3 - Create embedding service
... (rest of 15 tasks)

## Files Modified This Phase
(Updated as tasks complete)

## Tests Status
- Passing: 0
- Failing: 0
- Coverage: TBD

## Last Checkpoint
- When: N/A (just started)
- Tasks completed: 0
- All validations: N/A
- Ready to continue: YES

## Issues & Blockers
(None yet)
```

#### Step 3: Create Resume Hook

Create `.kiro/hooks/resume-task.md`:

```markdown
# Hook: Resume Task on Chat Start

**Trigger Type**: Prompt Submit (only if message = "resume")

**Agent Prompt**:
The developer is resuming work on Phase 2A.

1. Read .kiro/specs/PHASE_2A_RAG_SERVICES/state.md
2. Show: Current task, what was done last, what's next
3. Ask: "Ready to continue with [current task]?" or "Start next task?"
4. Load current task spec details for context

This is a recovery mechanism - be helpful and clear.
```

This lets you literally type "resume" in chat and pick up where you left off.

**Result**: Full recovery from interruptions, 100% work preservation

---

### DAY 2 (2 hours): Consolidate Steering (Zero Ambiguity)

**Goal**: One clear ruleset, no conflicting instructions

#### Step 1: Audit Current Steering Files

Check `.kiro/steering/`:
- List all files (product.md, technical.md, testing.md, etc.)
- Identify overlaps and conflicts
- Consolidate into: core-rules.md + specific guides

#### Step 2: Create Final Steering Structure

Keep:
- ✅ `core-rules.md` (800 tokens, always included)

Reference-only (manual include when needed):
- `testing-patterns.md` (reference for test writing)
- `code-style.md` (reference for coding)
- `architecture.md` (reference for design decisions)
- `api-design.md` (reference for endpoints)

Delete:
- Any duplicative or conflicting files

#### Step 3: Update Core Rules with Conflicts Section

Add to core-rules.md:

```markdown
## Known Conflicts & Resolution

### Conflict 1: Speed vs. Quality
- Requirement: Fast delivery (hackathon deadline)
- Requirement: Production quality code
- Resolution: Write tests first, then code (test-driven)

### Conflict 2: Feature Completeness vs. Scope
- Requirement: Full feature set in requirements
- Requirement: Only implement current phase
- Resolution: Stay in current phase, mark others as "Phase 3+"

### Conflict 3: Documentation vs. Time
- Requirement: Comprehensive docs
- Requirement: Finish by deadline
- Resolution: Inline code comments + README updates, formal docs after hackathon
```

**Result**: Zero instruction ambiguity, clear conflict resolution

---

### DAY 3-4 (3 hours): Update Execute.md for Better Focus

**Goal**: Better initial prompt that sets agent up for success

#### Step 1: Create execute.md

Create `.kiro/prompts/execute.md`:

```markdown
# EXECUTE: RAG Core Development

You are building Phase 2A: RAG Services for Iubar.

## Your Mission
Implement the RAG (Retrieval-Augmented Generation) service that enables the chatbot to:
1. Embed documents into vector space
2. Retrieve relevant context from knowledge base
3. Integrate context into chat responses

## Current Phase
- Phase: 2A - RAG Services
- Tasks: 15 total
- Scope: Backend services only (no frontend yet)
- Dependencies: Phase 1 backend foundation (COMPLETE)

## Your Workflow
1. Read state.md (2 seconds)
2. Pick next ⏳ task from state.md
3. Read task spec from tasks.md
4. Implement
5. Run tests
6. Update state.md
7. Repeat

## Critical Rules
- CORE-RULES in `.kiro/steering/core-rules.md` always apply
- Stay in current phase scope
- Update state.md after EVERY task
- Run diagnostics before/after changes
- Ask user if unclear

## When Stuck
1. Check tasks.md for task details
2. Check design.md for architecture
3. Check requirements.md for intent
4. Ask user in chat

## Files You'll Work With
- `backend/app/services/` - service implementations
- `backend/tests/` - test files
- `.kiro/specs/PHASE_2A_RAG_SERVICES/state.md` - update this!

## Success Looks Like
- ✅ All 15 tasks complete
- ✅ All tests passing
- ✅ Zero out-of-scope modifications
- ✅ state.md fully updated
- ✅ Ready for Phase 2B
```

#### Step 2: Kiro Hook for Execute Reminder

Create `.kiro/hooks/execute-reminder.md`:

```markdown
# Hook: Remind of Execute Pattern

**Trigger Type**: Agent Stop (after completing task)

**Shell Command**:
```bash
echo "NEXT STEP: Read .kiro/prompts/execute.md and continue with next task"
```

This reminds you to stay in the workflow pattern after each completion.
```

---

### DAY 5-7 (2 hours): Validate & Polish

#### Step 1: Test Full Workflow

```
1. Start fresh chat session
2. Type: "I'm resuming Phase 2A"
3. Agent should:
   - Read current state.md
   - Show what's done
   - Show current task
   - Ask if ready to continue

4. Confirm with: "Yes, let's do task 2.1"
5. Agent implements task 2.1
6. You stop agent
7. Hook auto-updates state.md
8. Next session: type "resume"
9. Agent picks up where it left off
```

#### Step 2: Measure Success

| Metric | Target | How to Check |
|--------|--------|-------------|
| Context size | < 8,000 tokens | Type `/context show` in Kiro chat |
| Session duration | 4+ hours | Work uninterrupted for extended time |
| Task completion | 95%+ | Tasks completed / total tasks |
| State tracking | 100% | state.md always current |
| File safety | 0 deletions | No unintended file operations |

#### Step 3: Document for Team

Create `.kiro/README-WORKFLOW.md`:

```markdown
# Iubar Hackathon Workflow

## Quick Start
1. Open Kiro
2. Type "resume" to pick up where you left off
3. Follow the current task in state.md
4. When done, click Stop (auto-updates state)
5. Next session: type "resume" again

## Files to Know
- `.kiro/steering/core-rules.md` - The rules
- `.kiro/specs/PHASE_2A_RAG_SERVICES/state.md` - Current progress
- `.kiro/specs/PHASE_2A_RAG_SERVICES/tasks.md` - What to build
- `.kiro/prompts/execute.md` - How to work

## If Something Goes Wrong
1. Check state.md - is it current?
2. Type "resume" to see what state thinks
3. If state is wrong, manually update it
4. Ask agent to continue

## Success Metrics
- All tasks in state.md marked ✅
- Zero unauthorized file deletions
- All tests passing
- Ready for Phase 2B
```

---

## KIRO-SPECIFIC OPTIMIZATIONS (Advanced)

### 1. Use `#spec` Context Provider
Instead of loading all specs:
```
# Instead of: loading entire rag-core-phase
# Use this in chat:
#spec:PHASE_2A_RAG_SERVICES update design.md to add caching layer
```

### 2. Use Hooks for LSP Validation
Create hook that runs after file save:
```markdown
# Hook: Auto-Validate on Save

**Trigger**: File Save (*.py)

**Shell Command**:
```bash
cd backend
python -m mypy --strict app/
pytest tests/ --cov
```
```

### 3. Use Hooks for Auto-Commit
Create hook that auto-stages changes:
```markdown
# Hook: Auto-Commit Completed Task

**Trigger**: Manual (you click when task done)

**Shell Command**:
```bash
git add -A
git commit -m "Complete task [ID]: [description from state.md]"
```
```

---

## TROUBLESHOOTING (Quick Fixes)

### Problem: Agent Forgets Previous Context Mid-Task
**Fix**: Agent is reaching context limit. Use `/context show` to check. If >70%, type `/compact` to compress older messages.

### Problem: Agent Modifies Wrong Files
**Fix**: Add file glob pattern to core-rules.md:
```markdown
### In-Scope Files
- backend/app/** (only here)
- backend/tests/** (only here)

### Protected Files
- Everything else
```

### Problem: Agent Stops Mid-Task, Can't Resume
**Fix**: state.md hook didn't trigger. Manually update state.md with:
```markdown
## ⏸️ Task [ID]: [Title] - PAUSED

**Stopped At**: Line [X], reason: [why]
**Resume Notes**: [what to do next]
```

Then type "resume" to pick up.

### Problem: State.md Gets Out of Sync
**Fix**: Always do this before each session:
```
1. Type "update state.md" in chat
2. Agent reviews what's actually in code
3. Agent updates state.md to match reality
4. Continue from there
```

---

## SUCCESS CRITERIA

| Metric | Current | Target | Measure |
|--------|---------|--------|---------|
| **Context Size** | 26,500 tokens | 8,000 tokens | `/context show` |
| **Session Duration** | 1-2 hours | 4-6 hours | Work uninterrupted |
| **Task Completion** | 70-80% | 95%+ | ✅ tasks / total |
| **Recovery Time** | Impossible | < 2 min | Type "resume" |
| **File Safety** | 2 deletion incidents | 0 | Audit logs |
| **Scope Violations** | Common | 0 | Files in scope |

---

## WEEK TIMELINE

```
MON-WED (Dec 23-25):  Project planning (not your responsibility)
THU JAN 23 (Tonight):   DO THIS: Reorg specs, create core-rules.md, setup hooks
FRI JAN 24 (Day 1):     DO THIS: Create state.md, test resumable execution
SAT JAN 25 (Day 2):     DO THIS: Consolidate steering, eliminate conflicts
SUN JAN 26 (Day 3-4):   DO THIS: Update execute.md, create hooks
MON JAN 27 (Day 5):     Validate workflow, run full tests
TUE JAN 28 (Day 6):     Polish, documentation
WED JAN 29 (Day 7):     Contingency + final push
THU JAN 30 (Deadline):  DONE ✅
```

---

## KEY DECISION: Don't Try to Replicate Expensive Research Solutions

❌ **DON'T DO**:
- LangGraph (Kiro doesn't support Python frameworks)
- Vector databases (overkill for 1-week hackathon)
- Observability platforms (too much setup)
- Multi-agent coordination (Kiro doesn't support subagents)

✅ **DO DO**:
- Simple state files (markdown + hooks)
- Spec organization (break monolith into phases)
- Steering consolidation (one clear ruleset)
- LSP diagnostics (built-in validation)

**Why**: Kiro is spec-driven and hook-driven. Work WITH its strengths, not against them.

---

## FINAL ADVICE

1. **Start tonight** with spec reorganization (biggest impact)
2. **Don't overthink** - simple solutions win in hackathons
3. **Focus on state.md** - this is your recovery mechanism
4. **Test early** - try "resume" workflow on Day 1
5. **Measure everything** - track context size, task completion, file safety
6. **Keep it lean** - core-rules.md should NEVER exceed 1,500 tokens

**You can do this in a week.** The research gave you frameworks; Kiro's design does most of the hard work. Focus on:
- Context reduction (tonight, 4 hours)
- State tracking (Day 1, 3 hours)
- The rest is refinement

Good luck! 🚀

---

**Status**: Ready to implement  
**Effort Estimate**: ~14 hours total (can be split across week)  
**Expected ROI**: 3-4x improvement in agent productivity  
**Risk**: Very low (all changes reversible)
