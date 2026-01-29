# Context Management Strategy for AI Agent Development

## Problem Statement

AI agents operating in spec-driven development face critical context management challenges:

1. **Context Overflow**: Large spec files (3000+ lines) + steering files (15,000+ tokens) exceed effective context windows
2. **Instruction Conflicts**: Multiple steering files with overlapping/conflicting guidance
3. **State Loss**: No persistent state tracking leads to lost progress on interruption
4. **Scope Creep**: Agents lose focus and modify files outside intended scope
5. **Recovery Failure**: No mechanism to resume from interruption points

## Core Principles

### 1. Progressive Context Loading
Load only what's needed, when it's needed. Don't front-load entire context.

### 2. Phase-Based Chunking
Break large specs into digestible phases that can be executed independently.

### 3. Explicit State Tracking
Maintain persistent state that survives interruptions and context resets.

### 4. Instruction Hierarchy
Clear priority system for resolving conflicts between multiple instruction sources.

### 5. Checkpoint-Driven Execution
Regular checkpoints enable recovery and provide progress visibility.

---

## Strategy 1: Phase-Based Spec Decomposition

### Current Problem
Single monolithic spec with:
- requirements.md (1000+ lines)
- design.md (800+ lines)
- tasks.md (1200+ lines)
- Total: 3000+ lines loaded at once

### Solution: Phase-Based Specs

Break specs into independent phases:

```
.kiro/specs/
├── phase-1-foundation/
│   ├── requirements.md (200-300 lines)
│   ├── design.md (200-300 lines)
│   ├── tasks.md (200-300 lines)
│   └── state.json (execution state)
├── phase-2-core-features/
│   ├── requirements.md
│   ├── design.md
│   ├── tasks.md
│   └── state.json
├── phase-3-integration/
│   ├── requirements.md
│   ├── design.md
│   ├── tasks.md
│   └── state.json
└── phase-4-polish/
    ├── requirements.md
    ├── design.md
    ├── tasks.md
    └── state.json
```

### Phase Characteristics
- **Self-Contained**: Each phase can be executed independently
- **Focused Scope**: 10-15 tasks per phase maximum
- **Clear Dependencies**: Explicit prerequisites from previous phases
- **Bounded Context**: Only relevant files and concepts
- **Testable Completion**: Clear acceptance criteria per phase

### Phase Transition Protocol
```markdown
## Phase Completion Checklist
- [ ] All tasks in phase completed (✅)
- [ ] All phase tests passing
- [ ] All phase validation commands passing
- [ ] Phase documentation updated
- [ ] State file updated
- [ ] Ready for next phase

## Phase Handoff
- Previous Phase: [NAME]
- Completed: [DATE]
- Key Artifacts: [LIST]
- Known Issues: [LIST]
- Next Phase Prerequisites: [LIST]
```

---

## Strategy 2: Steering File Optimization

### Current Problem
6 steering files totaling 15,000+ tokens:
- product.md (2,500 tokens)
- tech.md (2,000 tokens)
- structure.md (2,500 tokens)
- testing-strategy.md (4,000 tokens)
- lsp-mandatory.md (2,500 tokens)
- shell-commands.md (1,500 tokens)

### Solution: Conditional Loading + Consolidation

#### Approach A: Conditional Inclusion
Use frontmatter to control when steering files load:

```markdown
---
inclusion: conditional
triggers:
  - file_pattern: "backend/**/*.py"
  - task_type: "backend"
  - phase: "core-features"
---
```

#### Approach B: Consolidated Core Steering
Create single `core-rules.md` with essential rules only:

```markdown
# Core Development Rules (Essential Only)

## File Operations
- NEVER delete files without permission
- ALWAYS use LSP diagnostics before/after code changes
- ALWAYS update task status in tasks.md

## Instruction Priority
1. Critical Safety (file deletion, data integrity)
2. User Explicit Instructions
3. Spec Requirements
4. LSP Validation
5. Testing Patterns

## Quality Gates
- All tests must pass
- LSP diagnostics must show no new errors
- No files outside scope modified

## Checkpoints
- Every 3 tasks
- Every 30 minutes
- Before high-risk operations

[Link to detailed guides for reference]
```

#### Approach C: Just-In-Time Reference
Keep detailed guides but don't load them. Reference them when needed:

```markdown
For detailed testing patterns, see: .kiro/steering/testing-strategy.md
For LSP usage details, see: .kiro/steering/lsp-mandatory.md
```

Agent reads these only when encountering relevant tasks.

---

## Strategy 3: Task-Level State Tracking

### Current Problem
- No persistent state across interruptions
- No way to know what was completed
- No recovery mechanism

### Solution: State File Per Phase

**state.json structure:**
```json
{
  "phase": "phase-2-core-features",
  "started": "2026-01-20T10:00:00Z",
  "last_updated": "2026-01-20T14:30:00Z",
  "status": "in_progress",
  "tasks": {
    "2.1": {
      "status": "complete",
      "started": "2026-01-20T10:00:00Z",
      "completed": "2026-01-20T10:45:00Z",
      "duration_minutes": 45,
      "files_modified": ["backend/app/services/rag_service.py"],
      "validation_passed": true,
      "notes": "Implemented RAG service with vector search"
    },
    "2.2": {
      "status": "in_progress",
      "started": "2026-01-20T14:00:00Z",
      "files_modified": ["backend/app/api/chat.py"],
      "notes": "Working on chat endpoint"
    },
    "2.3": {
      "status": "pending",
      "blocked_by": ["2.2"]
    }
  },
  "checkpoints": [
    {
      "number": 1,
      "timestamp": "2026-01-20T12:00:00Z",
      "tasks_completed": ["2.1"],
      "tests_passing": 45,
      "tests_failing": 0
    }
  ],
  "files_modified": [
    "backend/app/services/rag_service.py",
    "backend/app/api/chat.py"
  ],
  "tests_added": [
    "backend/tests/test_rag_service.py"
  ],
  "issues": [
    {
      "task": "2.1",
      "description": "Initial LSP errors in imports",
      "resolution": "Fixed import paths",
      "resolved": true
    }
  ]
}
```

### State Management Protocol

**On task start:**
```python
update_state(task_id, {
    "status": "in_progress",
    "started": timestamp(),
    "files_modified": []
})
```

**On task complete:**
```python
update_state(task_id, {
    "status": "complete",
    "completed": timestamp(),
    "duration_minutes": calculate_duration(),
    "validation_passed": True,
    "notes": "Task completion summary"
})
```

**On interruption recovery:**
```python
state = load_state()
last_complete = find_last_complete_task(state)
in_progress = find_in_progress_tasks(state)
resume_from(in_progress or next_task_after(last_complete))
```

---

## Strategy 4: Focused Task Templates

### Current Problem
Tasks lack structure, leading to scope creep and incomplete implementations.

### Solution: Structured Task Templates

**Task Template:**
```markdown
## Task X.Y: [Task Name]

### Status
⏳ IN_PROGRESS

### Metadata
- Type: [BACKEND/FRONTEND/INTEGRATION/TEST]
- Priority: [CRITICAL/HIGH/MEDIUM/LOW]
- Estimated Duration: [MINUTES]
- Dependencies: [TASK_IDS]

### Scope
**In Scope:**
- File: `backend/app/services/rag_service.py`
- Function: `search_documents()`
- Lines: 45-120

**Out of Scope:**
- All other files
- All other functions in this file
- Database schema changes

### Requirements
1. Implement vector search using Chroma
2. Return top-K results with relevance scores
3. Handle empty query gracefully
4. Add error handling for Chroma failures

### Acceptance Criteria
- [ ] Function returns List[SearchResult]
- [ ] Relevance scores between 0.0-1.0
- [ ] Empty query returns empty list
- [ ] ChromaError caught and logged
- [ ] Unit tests pass
- [ ] LSP diagnostics clean

### Validation Commands
```bash
python -m pytest backend/tests/test_rag_service.py::test_search_documents -v
```

### Context Files
Read these before starting:
- `backend/app/services/vector_store.py` (existing pattern)
- `backend/app/models/schemas.py` (SearchResult schema)

### Notes
[Space for execution notes, issues, decisions]


---

## Strategy 5: Checkpoint-Driven Execution

### Current Problem
No visibility into progress, no recovery points.

### Solution: Mandatory Checkpoints

**Checkpoint Frequency:**
- Every 3 completed tasks
- Every 30 minutes of execution
- Before high-risk operations
- On user request

**Checkpoint Content:**
```markdown
## CHECKPOINT 3 - 2026-01-20 14:30

### Progress
- Tasks Completed: 6/15 (40%)
- Time Elapsed: 2h 30min
- Current Task: 2.7 - Implement chat streaming

### Files Modified Since Last Checkpoint
- backend/app/api/chat.py (added streaming endpoint)
- backend/app/services/deepseek_client.py (added stream method)
- backend/tests/test_chat_api.py (added streaming tests)

### Tests Status
- Passing: 52 (+7 since last checkpoint)
- Failing: 0
- New Tests: 7

### Issues Resolved
- Issue: AsyncMock not working with generators
- Solution: Used MagicMock with side_effect factory pattern
- Reference: testing-strategy.md section on async generators

### Next Steps
1. Complete task 2.7 (streaming)
2. Run integration tests
3. Create checkpoint 4

### Validation Status
```bash
python -m pytest backend/tests/ -v
# 52 passed in 12.3s
```

### Ready to Continue: YES


---

## Strategy 6: Instruction Priority System

### Current Problem
Conflicting instructions from multiple sources cause confusion.

### Solution: Clear Hierarchy

**Priority Order (Highest to Lowest):**

1. **CRITICAL SAFETY** (Non-negotiable)
   - File deletion policy
   - Data integrity rules
   - Security requirements
   - Source: execute.md, lsp-mandatory.md

2. **USER EXPLICIT INSTRUCTIONS** (Current conversation)
   - Direct commands from user
   - Clarifications and corrections
   - Source: Current chat context

3. **SPEC REQUIREMENTS** (Phase-specific)
   - requirements.md
   - design.md
   - tasks.md
   - Source: Current phase spec

4. **LSP VALIDATION** (Code quality)
   - Diagnostic requirements
   - Type safety rules
   - Source: lsp-mandatory.md

5. **TESTING PATTERNS** (Test quality)
   - Test structure
   - Mock patterns
   - Source: testing-strategy.md

6. **TECHNICAL STANDARDS** (Implementation)
   - Tech stack rules
   - Architecture patterns
   - Source: tech.md

7. **PRODUCT GUIDANCE** (UX/Design)
   - Product vision
   - UX philosophy
   - Source: product.md

8. **PROJECT STRUCTURE** (Organization)
   - File organization
   - Naming conventions
   - Source: structure.md

9. **PLATFORM COMMANDS** (Execution)
   - Shell command syntax
   - Source: shell-commands.md

**Conflict Resolution:**
When instructions conflict, follow the higher priority source. Document the conflict and resolution in checkpoint notes.

---

## Strategy 7: Recovery Protocols

### Interruption Recovery

**On resumption:**
1. Load state.json from current phase
2. Identify last completed task (status: "complete")
3. Check for in-progress tasks (status: "in_progress")
4. Read last checkpoint for context
5. Resume from in-progress task or next pending task

**Recovery Checklist:**
```markdown
## Recovery from Interruption

### State Assessment
- Last Checkpoint: [NUMBER] at [TIMESTAMP]
- Last Completed Task: [TASK_ID] - [NAME]
- In-Progress Tasks: [LIST]
- Time Since Last Update: [DURATION]

### Context Restoration
- [ ] Read last checkpoint notes
- [ ] Review in-progress task requirements
- [ ] Check files modified since last checkpoint
- [ ] Verify tests still passing
- [ ] Check LSP diagnostics

### Validation Before Resuming
- [ ] All completed tasks still validated
- [ ] No unexpected file changes
- [ ] Development environment ready
- [ ] Dependencies installed

### Resume Point
Resuming at: Task [X.Y] - [NAME]
Reason: [IN_PROGRESS / NEXT_AFTER_LAST_COMPLETE]
```

### Failure Recovery

**On repeated task failure (3+ attempts):**
1. Mark task as FAILED in state.json
2. Document all attempted solutions
3. Create failure report
4. Identify blocked tasks
5. STOP execution
6. Report to user with recommendations

**Failure Report Template:**
```markdown
## FAILURE REPORT - Task X.Y

### Task Description
[WHAT_WAS_ATTEMPTED]

### Failure Symptoms
[ERROR_MESSAGES_OR_BEHAVIOR]

### Attempted Solutions
1. [SOLUTION_1] - [RESULT]
2. [SOLUTION_2] - [RESULT]
3. [SOLUTION_3] - [RESULT]

### Root Cause Analysis
[BEST_GUESS_AT_CAUSE]

### Impact Assessment
- Blocked Tasks: [LIST]
- Critical Path Impact: [YES/NO]
- Workaround Possible: [YES/NO]

### Recommended Next Steps
1. [RECOMMENDATION_1]
2. [RECOMMENDATION_2]

### User Input Needed
[SPECIFIC_QUESTIONS_OR_DECISIONS]
```

---

## Implementation Roadmap

### Phase 1: Immediate Fixes (DONE)
- [x] Rewrite execute.md with file deletion policy
- [x] Add task state tracking protocol
- [x] Add checkpoint system
- [x] Add instruction priority hierarchy
- [x] Add recovery mechanisms

### Phase 2: State Management (Next)
- [ ] Create state.json template
- [ ] Add state update functions to execute.md
- [ ] Test interruption recovery
- [ ] Document state management protocol

### Phase 3: Spec Decomposition (Future)
- [ ] Break rag-core-phase into smaller phases
- [ ] Create phase templates
- [ ] Define phase transition protocol
- [ ] Test phase-based execution

### Phase 4: Steering Optimization (Future)
- [ ] Create consolidated core-rules.md
- [ ] Add conditional loading to detailed guides
- [ ] Test context reduction impact
- [ ] Measure token usage improvements

### Phase 5: Task Templates (Future)
- [ ] Create structured task template
- [ ] Update existing tasks to use template
- [ ] Add task validation checklist
- [ ] Test task-focused execution

---

## Success Metrics

### Context Efficiency
- **Target**: Reduce active context from 15,000 to 5,000 tokens
- **Measure**: Token count in agent context at task execution
- **Method**: Conditional loading + consolidation

### Recovery Success Rate
- **Target**: 100% successful recovery from interruptions
- **Measure**: Ability to resume without re-doing work
- **Method**: State tracking + checkpoints

### Task Completion Rate
- **Target**: 95% of tasks complete on first attempt
- **Measure**: Ratio of ✅ to ❌ tasks
- **Method**: Better task structure + validation

### Scope Adherence
- **Target**: Zero out-of-scope file modifications
- **Measure**: Files modified vs. files in task scope
- **Method**: Explicit scope definition + validation

### Instruction Conflict Resolution
- **Target**: Zero ambiguity-related failures
- **Measure**: Tasks failed due to unclear instructions
- **Method**: Priority hierarchy + ambiguity resolution rules

---

## Best Practices

### For Spec Authors
1. Keep phases under 15 tasks
2. Make tasks self-contained when possible
3. Define explicit scope boundaries
4. Include validation commands
5. Specify acceptance criteria
6. Link to context files

### For Agent Execution
1. Always update state before and after tasks
2. Create checkpoints regularly
3. Follow instruction priority hierarchy
4. Document ambiguities and resolutions
5. Stop and ask when uncertain
6. Never delete files without permission

### For Recovery
1. Always check state.json first
2. Read last checkpoint for context
3. Validate environment before resuming
4. Don't assume previous work is correct
5. Re-run validations after recovery

---

## Appendix: Token Budget Analysis

### Current Context Load
```
Steering Files:
- product.md: 2,500 tokens
- tech.md: 2,000 tokens
- structure.md: 2,500 tokens
- testing-strategy.md: 4,000 tokens
- lsp-mandatory.md: 2,500 tokens
- shell-commands.md: 1,500 tokens
Total: 15,000 tokens

Spec Files (rag-core-phase):
- requirements.md: 3,000 tokens
- design.md: 2,500 tokens
- tasks.md: 4,000 tokens
Total: 9,500 tokens

Execute Prompt:
- execute.md: 2,000 tokens

TOTAL CONTEXT: ~26,500 tokens
```

### Optimized Context Load (Target)
```
Core Rules:
- core-rules.md: 1,500 tokens

Current Phase Spec:
- phase-2/requirements.md: 800 tokens
- phase-2/design.md: 600 tokens
- phase-2/tasks.md: 1,200 tokens
Total: 2,600 tokens

Execute Prompt:
- execute.md: 2,000 tokens

Current Task Context:
- Task template: 300 tokens
- Referenced files: 1,000 tokens
Total: 1,300 tokens

TOTAL CONTEXT: ~7,400 tokens
```

**Reduction: 72% (from 26,500 to 7,400 tokens)**

---

## Conclusion

This context management strategy addresses the core issues causing agent misbehavior:

1. **File Deletion**: Explicit policy in execute.md
2. **Mid-Task Stopping**: State tracking + checkpoints enable recovery
3. **Instruction Conflicts**: Clear priority hierarchy
4. **Context Overflow**: Phase-based specs + conditional loading
5. **Scope Creep**: Explicit scope boundaries in task templates

Implementation should be phased, starting with immediate fixes (execute.md rewrite) and progressing to structural improvements (phase-based specs, state management).

The goal is to create a development workflow where the agent:
- Always knows what to do next
- Can recover from any interruption
- Never violates safety rules
- Operates within bounded context
- Produces consistent, high-quality results
