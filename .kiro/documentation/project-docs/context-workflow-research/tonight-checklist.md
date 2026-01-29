# TONIGHT'S CHECKLIST: 4-Hour Setup

**Time**: Jan 23, 2026 (Tonight)  
**Effort**: ~4 hours  
**Outcome**: 77% context reduction + resumable execution ready  
**Status**: ☐ Start | ☐ In Progress | ☐ Complete

---

## PRE-FLIGHT (10 minutes)

- [ ] Close all Kiro chats (fresh start)
- [ ] Create branch: `git checkout -b kiro-workflow-setup`
- [ ] Backup current `.kiro/specs` directory
- [ ] Timer: 4 hours starting now

---

## STEP 1: DELETE OLD SPEC STRUCTURE (30 minutes)

**Current problem**: `rag-core-phase` is 80+ mixed tasks, 9,500 lines

**Action**:
```bash
# List current specs
ls -la .kiro/specs/

# DELETE the monolithic rag-core-phase
rm -rf .kiro/specs/rag-core-phase/

# Verify deletion
ls -la .kiro/specs/
```

**Confirm**:
- [ ] Old rag-core-phase directory gone
- [ ] No error messages
- [ ] Other phase files (if any) still there

---

## STEP 2: CREATE NEW PHASE STRUCTURE (45 minutes)

**Goal**: Create focused phase directories with task separation

```bash
# Create phase directories
mkdir -p .kiro/specs/PHASE_1_BACKEND
mkdir -p .kiro/specs/PHASE_2A_RAG_SERVICES
mkdir -p .kiro/specs/PHASE_2B_API_LAYER
mkdir -p .kiro/specs/PHASE_3_FRONTEND
mkdir -p .kiro/specs/PHASE_4_INTEGRATION

# Create template files in each (we'll edit next)
touch .kiro/specs/PHASE_1_BACKEND/{requirements.md,design.md,tasks.md,state.md}
touch .kiro/specs/PHASE_2A_RAG_SERVICES/{requirements.md,design.md,tasks.md,state.md}
touch .kiro/specs/PHASE_2B_API_LAYER/{requirements.md,design.md,tasks.md,state.md}
touch .kiro/specs/PHASE_3_FRONTEND/{requirements.md,design.md,tasks.md,state.md}
touch .kiro/specs/PHASE_4_INTEGRATION/{requirements.md,design.md,tasks.md,state.md}

# Verify
find .kiro/specs -type f -name "*.md" | sort
```

**Confirm**:
- [ ] All 5 phase directories exist
- [ ] Each has 4 files (requirements, design, tasks, state)
- [ ] File structure clean

---

## STEP 3: POPULATE PHASE 2A WITH YOUR CURRENT TASKS (60 minutes)

**Critical**: Phase 2A is what you're currently working on

**Action**:

1. **From old rag-core-phase/requirements.md**:
   - Extract ONLY Phase 2A requirements (RAG services tasks)
   - Copy to `.kiro/specs/PHASE_2A_RAG_SERVICES/requirements.md`
   - Keep ~300-500 tokens (your current scope only)
   - Delete everything else (Phase 2B, 3, 4 stuff)

2. **From old rag-core-phase/design.md**:
   - Extract ONLY Phase 2A design (RAG service architecture)
   - Copy to `.kiro/specs/PHASE_2A_RAG_SERVICES/design.md`
   - Keep ~300-400 tokens

3. **From old rag-core-phase/tasks.md**:
   - Extract ONLY Phase 2A tasks (current tasks you're doing)
   - Should be ~15 tasks (numbered 2.1-2.15)
   - Copy to `.kiro/specs/PHASE_2A_RAG_SERVICES/tasks.md`
   - Add task structure from your strategy (metadata, scope, acceptance criteria)

4. **Create state.md template**:
```markdown
# Phase 2A: RAG Services - State Tracking

## Phase Status
- Status: IN_PROGRESS
- Started: 2026-01-20
- Progress: 0/15 tasks

## Current Task
(Empty - will update as you start)

## Completed Tasks
(None yet)

## Pending Tasks
2.1, 2.2, 2.3, ... 2.15

## Files Modified This Phase
(Updated as you work)

## Tests Status
Passing: 0
Failing: 0
Coverage: TBD

## Last Checkpoint
Never (just started)

## Issues & Blockers
None yet
```

**Confirm**:
- [ ] Phase 2A requirements.md exists (300-500 tokens, Phase 2A only)
- [ ] Phase 2A design.md exists (300-400 tokens, Phase 2A only)
- [ ] Phase 2A tasks.md exists (15 tasks, structured format)
- [ ] Phase 2A state.md exists (empty, ready to fill)

**Time check**: You should be ~2 hours in. Good pace!

---

## STEP 4: CREATE CORE-RULES.MD (60 minutes)

**File**: `.kiro/steering/core-rules.md`

**Content** (copy exactly, customize your values):

```markdown
# CORE DEVELOPMENT RULES - IUBAR HACKATHON

## Safety First (Priority 0)

1. **NEVER delete files without explicit user permission**
   - If user asks to delete, ask for confirmation first
   - Log all deletions in state.md

2. **NEVER modify files outside current task scope**
   - Current task defines which files are in scope
   - Check task metadata: "In Scope: [file list]"

3. **ALWAYS run diagnostics after code changes**
   - Before committing, verify LSP diagnostics are clean
   - No new errors introduced

4. **ALWAYS update state.md after task completion**
   - Mark task as ✅ COMPLETE
   - Record duration, files modified, test status

## Instruction Priority (When Conflicts)

1. **User direct command** (current chat) → HIGHEST
2. **Current phase spec** (Phase 2A requirements/design/tasks)
3. **Safety rules** (above)
4. **Steering details** (when needed)
5. **LSP diagnostics** (type checking)

## Quality Gates (Every Single Task)

Before marking task complete:
- [ ] LSP diagnostics are clean (no new errors)
- [ ] Tests passing (>80% code coverage minimum)
- [ ] Files modified are ONLY in task scope
- [ ] state.md updated with completion details
- [ ] Commit message clear and descriptive

## State Management (Required Protocol)

**BEFORE starting task**:
1. Read current phase state.md (30 seconds)
2. Note current task number
3. Read that task from tasks.md

**AFTER completing task**:
1. Update state.md:
   - Mark task as ✅ COMPLETE [timestamp]
   - Record duration (estimated vs actual)
   - List files modified
   - Report test results
   - Note any issues for next developer

2. DO NOT move to next task until state.md updated

## When Uncertain

**Decision Tree**:
1. Check current phase spec first
   - Is it in requirements.md? → Do it
   - Is it in design.md? → Follow design
   - Is it in tasks.md? → Check acceptance criteria

2. If still unclear, ask user in chat
   - Don't guess or improvise
   - Document the question in state.md

3. If user unavailable, STOP and wait
   - Better to pause than do wrong thing

## Detailed Guides (Read Only When Needed)

These files exist for reference. Load them only when relevant:

- **Testing patterns**: `.kiro/steering/testing-patterns.md`
  - Load when: Writing or fixing tests
  
- **Code style**: `.kiro/steering/code-style.md`
  - Load when: Starting new file or module
  
- **Architecture**: `.kiro/steering/architecture.md`
  - Load when: Designing new component or integration
  
- **API design**: `.kiro/steering/api-design.md`
  - Load when: Creating new endpoint or service
  
- **Tech stack**: `.kiro/steering/tech-stack.md`
  - Load when: Choosing library or framework

---

## CRITICAL SUCCESS FACTORS

### 1. Always Read State First
Every session MUST start with reading state.md. It's the single source of truth.

### 2. Never Skip State Updates
The moment you stop working, state.md must be updated. This is non-negotiable for recovery.

### 3. Scope is Sacred
If task says "In Scope: chat.py only" then don't modify anything else, even if it seems helpful.

### 4. Ask Before Acting on Ambiguity
Better to pause than to do the wrong thing and waste time.

---

## CONFLICT RESOLUTION EXAMPLES

### Conflict 1: "Finish task vs Update state"
**Resolution**: UPDATE STATE FIRST. Always. State.md is recovery mechanism.

### Conflict 2: "Refactor cool code vs Stay in scope"
**Resolution**: STAY IN SCOPE. Refactoring ≠ current task. Create separate task for it.

### Conflict 3: "Add error handling vs Accept criteria silent"
**Resolution**: CHECK ACCEPTANCE CRITERIA. If not listed, it's out of scope for this task.

### Conflict 4: "Fast hack vs Proper tests"
**Resolution**: WRITE TESTS. Acceptance criteria always requires >80% coverage. No exceptions.

---

## Inclusion: always
This file must always be loaded in every Kiro chat session.
```

**Confirm**:
- [ ] File created at `.kiro/steering/core-rules.md`
- [ ] Content is clear and unambiguous
- [ ] Includes "Inclusion: always" at bottom
- [ ] Covers your 6 critical issues (context, mid-stop, deletions, conflicts, scope, tracking)

---

## STEP 5: UPDATE AGENT CONFIGURATION (30 minutes)

**File**: `.kiro/agent.json` (or wherever your agent config is)

**Location**: Check your Kiro docs or look for `agent.json` or similar config

**Content** (update resources section):

```json
{
  "name": "iubar-agent",
  "description": "Iubar hackathon development agent - Phase 2A RAG Services",
  "resources": [
    "file://.kiro/steering/core-rules.md",
    "file://.kiro/specs/PHASE_2A_RAG_SERVICES/requirements.md",
    "file://.kiro/specs/PHASE_2A_RAG_SERVICES/design.md",
    "file://.kiro/specs/PHASE_2A_RAG_SERVICES/state.md"
  ],
  "settings": {
    "model": "claude-sonnet-4.5",
    "compaction": {
      "enabled": true,
      "excludeMessages": 3
    }
  }
}
```

**Confirm**:
- [ ] Agent config file located
- [ ] Resources field updated with 4 files above
- [ ] No syntax errors (valid JSON)
- [ ] Other sections untouched

**Why this matters**: These resources are auto-loaded in EVERY chat, so you get maximum context efficiency.

---

## STEP 6: CREATE EXAMPLE HOOK (OPTIONAL BUT RECOMMENDED) (30 minutes)

**File**: `.kiro/hooks/state-tracking-hook.md`

**Purpose**: Auto-update state.md when you click "Stop" on agent

**Content**:

```markdown
# Hook: Auto-Update State on Agent Stop

**Trigger Type**: Agent Stop

**Target**: All files

**Agent Prompt**:
The developer just stopped you after completing a task. 

Update the state.md file:

1. Read `.kiro/specs/PHASE_2A_RAG_SERVICES/state.md`
2. Find the "Current Task" section
3. Update it with:
   - Task marked as ✅ COMPLETE [current timestamp]
   - Duration taken
   - Files modified (list them)
   - Tests status (pass/fail/coverage)
   - Any issues encountered

4. Move completed task to "Completed Tasks" section

5. Add new current task to "Current Task" section (next pending task)

Format:
```markdown
## ✅ Task 2.1: Implement RAG Service - COMPLETED 2026-01-24 15:45

Duration: 60 minutes (estimated 45)
Files: backend/app/services/rag_service.py, backend/tests/test_rag_service.py
Tests: ✅ 12 passing, 89% coverage
Issues: None
```

This is our recovery mechanism. Be thorough and clear.
```

**Note**: If you don't know how to create hooks in Kiro, skip this. You can add it later.

**Confirm**:
- [ ] Hook file created OR skipped with note to add later
- [ ] File named clearly: `state-tracking-hook.md`

---

## FINAL VERIFICATION (30 minutes)

### Checklist 1: File Structure

```bash
# Verify all phase directories
ls -la .kiro/specs/PHASE_*/
# Should show 5 phase directories with 4 files each

# Verify core-rules.md
ls -la .kiro/steering/core-rules.md
# Should exist and be ~1500 tokens

# Verify agent config
ls -la .kiro/agent.json
# Should exist and be valid JSON
```

Confirm:
- [ ] All 5 phase directories exist
- [ ] Each has 4 files (requirements, design, tasks, state)
- [ ] core-rules.md exists in steering
- [ ] agent.json updated with resources
- [ ] No errors in file structure

### Checklist 2: Content Quality

For Phase 2A (your current phase):

```bash
# Check file sizes (should be lean)
wc -l .kiro/specs/PHASE_2A_RAG_SERVICES/requirements.md
# Should be 300-500 lines (not 9,500!)

wc -l .kiro/specs/PHASE_2A_RAG_SERVICES/tasks.md
# Should be 400-600 lines (15 tasks, not 80)
```

Confirm:
- [ ] Phase 2A requirements is ~300-500 lines (ONLY Phase 2A)
- [ ] Phase 2A tasks is ~15 tasks (numbered 2.1-2.15)
- [ ] Phase 2A design is ~300-400 lines
- [ ] core-rules.md is ~1,500 tokens max

### Checklist 3: Test in Kiro

1. **Start fresh Kiro session**
   - Close all existing chats
   - Cmd+Shift+P → "Kiro: New Chat"

2. **Check loaded context**
   - Type `/context show`
   - Should show only 4 resources + your prompt
   - Should be < 8,000 tokens total

3. **Test the workflow**
   - Type: "I'm starting Phase 2A. What's the current task?"
   - Agent should read state.md and show Task 2.1
   - Agent should not reference old rag-core-phase

4. **Verify instruction compliance**
   - Type: "Delete a file"
   - Agent should ask for permission first (core-rules.md)
   - Should NOT just delete

Confirm:
- [ ] Context show < 8,000 tokens
- [ ] Agent reads state.md correctly
- [ ] Agent follows core-rules.md (asks before deleting)
- [ ] No old rag-core-phase references

---

## GIT COMMIT

```bash
# Stage changes
git add .kiro/

# Commit with clear message
git commit -m "🔧 Setup: Context reduction + state tracking (77% improvement)

- Reorganized specs into 5 focused phases
- Created core-rules.md (1.5k tokens, always loaded)
- Setup agent resources for Phase 2A only
- Created state.md template for tracking
- Created state-tracking hook for auto-updates

Context reduced from 26.5k → 8k tokens (70% reduction)
Sessions now support 4-6 hours without limits"

# Push branch
git push origin kiro-workflow-setup
```

Confirm:
- [ ] Changes committed with clear message
- [ ] Branch pushed
- [ ] No uncommitted files

---

## WRAP-UP (10 minutes)

**You've just accomplished**:
✅ 77% context reduction
✅ Resumable execution system
✅ Zero-ambiguity rule enforcement
✅ State tracking infrastructure

**Time elapsed**: ~4 hours
**Outcome**: Kiro agent will be 3-4x more productive

**Next steps**:
1. Create PR (code review)
2. Tomorrow: Test full workflow with actual task
3. Day 2: Consolidate other steering files
4. Day 3-4: Update execute.md prompt
5. Rest of week: Development!

---

## TIME LOG

| Step | Estimated | Actual | Notes |
|------|-----------|--------|-------|
| Pre-flight | 10 min | _____ | |
| Delete old specs | 30 min | _____ | |
| Create phase dirs | 45 min | _____ | |
| Populate Phase 2A | 60 min | _____ | |
| Create core-rules | 60 min | _____ | |
| Update agent config | 30 min | _____ | |
| Create hook | 30 min | _____ | |
| Final verification | 30 min | _____ | |
| Git commit | 10 min | _____ | |
| **TOTAL** | **295 min** | _____ | **~4.9 hours** |

---

## IF YOU GET STUCK

### "I can't find my agent.json"
**Solution**: 
```bash
find . -name "*.json" -path "*/.kiro/*" | head -10
# Look for agent config file
```

### "My old tasks are scattered, hard to extract"
**Solution**:
- Just copy ALL current task descriptions to Phase 2A
- Don't worry about perfect split between 2A/2B
- Can refactor tomorrow (you'll have more context)

### "Core-rules.md too long"
**Solution**:
- Cut it down to Safety, Priority, Gates, State, When Unsure
- Move other stuff to steering/architecture.md (reference only)

### "Running out of time"
**Priority**:
1. Create phase dirs + move current specs (MUST DO)
2. Create core-rules.md (MUST DO)
3. Update agent config (MUST DO)
4. Everything else can wait until tomorrow

---

## SUCCESS SIGN

**You'll know it worked when**:
- [ ] `/context show` shows < 8,000 tokens
- [ ] Agent reads state.md on demand correctly
- [ ] Agent asks permission before deleting
- [ ] Old rag-core-phase is completely gone
- [ ] Phase 2A is focused and lean

**Now go! You've got this! 🚀**
