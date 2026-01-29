# Workflow Restructuring Plan - Iubar Hackathon

**Date**: January 23, 2026  
**Status**: PLANNING - DO NOT IMPLEMENT YET  
**Estimated Effort**: 6-8 hours (can be done tonight + tomorrow)  
**Expected Impact**: 77% context reduction, 3-4x longer sessions, 95%+ task completion

---

## Executive Summary

This plan restructures the Kiro workflow to eliminate context overflow, enable resumable execution, and enforce clear scope boundaries. Based on comprehensive research of Kiro capabilities and analysis of current issues.

**Key Changes**:
1. Context reduction: 26,500 → 6,000 tokens (77%)
2. Spec decomposition: 1 monolith → 5 focused phases
3. Steering consolidation: 6 files → 1 core + 5 references
4. State tracking: Manual markdown + hooks
5. Meta rules: New AGENTS.md for communication style

---

## Part 1: Create AGENTS.md (Root Level)

### Location
`AGENTS.md` (project root)

### Purpose
Define meta-communication rules that apply to ALL agent interactions. Keep this EXTREMELY short and direct.

### Content

```markdown
# Agent Communication Rules

## Style
Direct. Concise. Efficient. No fluff.

## Token Preservation
- Short answers in chat (2-3 sentences max unless asked for detail)
- Ask clarifying questions before long implementations
- Use bullet points, not paragraphs
- Reference files instead of quoting them

## Context Preservation
- Read state.md FIRST every session
- Update state.md LAST every session
- Stay in current phase scope
- Don't load unnecessary files

## Efficiency Rules
- Ask "What's the goal?" if unclear
- Propose approach before coding
- Validate with user before large changes
- Stop and ask if stuck (don't guess)

## Quality Gates
- Run diagnostics before/after changes
- Tests must pass
- No files outside task scope
- State tracking always current

---

**This file defines HOW we communicate. See .kiro/steering/core-rules.md for WHAT to do.**
```

**Rationale**: Separates meta-rules (communication style) from domain rules (development practices). Keeps both files focused and short.

---

## Part 2: Steering Consolidation

### Current State (PROBLEM)
```
.kiro/steering/
├── lsp-mandatory.md       (~2,500 tokens, always loaded)
├── product.md             (~2,500 tokens, always loaded)
├── shell-commands.md      (~1,500 tokens, always loaded)
├── structure.md           (~2,500 tokens, always loaded)
├── tech.md                (~2,000 tokens, always loaded)
└── testing-strategy.md    (~4,000 tokens, always loaded)

TOTAL: ~15,000 tokens ALWAYS loaded
```

### Target State (SOLUTION)
```
.kiro/steering/
├── core-rules.md          (~1,200 tokens, inclusion: always)
├── lsp-mandatory.md       (~2,500 tokens, inclusion: conditional, fileMatch: **/*.{py,ts,tsx})
├── testing-strategy.md    (~4,000 tokens, inclusion: conditional, fileMatch: **/tests/**)
├── product.md             (~2,500 tokens, inclusion: manual)
├── tech.md                (~2,000 tokens, inclusion: manual)
├── structure.md           (~2,500 tokens, inclusion: manual)
└── shell-commands.md      (~1,500 tokens, inclusion: manual)

TYPICAL LOAD: ~1,200 tokens (92% reduction)
MAX LOAD (with conditionals): ~7,700 tokens (49% reduction)
```

### Action Items

#### 2.1 Create core-rules.md

**File**: `.kiro/steering/core-rules.md`

**Content**:
```markdown
# Core Development Rules

## Safety First (Priority 0)

1. **NEVER delete files without explicit permission**
2. **NEVER modify files outside current task scope**
3. **ALWAYS run getDiagnostics after code changes**
4. **ALWAYS update state.md after task completion**

## Instruction Priority (When Conflicts)

1. User direct command (this chat) → HIGHEST
2. Current phase spec (requirements/design/tasks)
3. Safety rules (above)
4. LSP diagnostics (type checking)
5. Detailed steering (load when needed)

## Quality Gates (Every Task)

Before marking complete:
- [ ] LSP diagnostics clean
- [ ] Tests passing (>80% coverage)
- [ ] Files modified in scope only
- [ ] state.md updated
- [ ] Commit message clear

## State Management Protocol

**BEFORE task**:
1. Read current phase state.md
2. Note current task number
3. Read task from tasks.md

**AFTER task**:
1. Update state.md with completion
2. Record duration, files, tests
3. Note any issues

## When Uncertain

1. Check current phase spec
2. Check detailed steering (if relevant)
3. Ask user (don't guess)
4. Document in state.md

## Detailed Guides (Load When Needed)

- Testing: `.kiro/steering/testing-strategy.md` (when writing tests)
- LSP: `.kiro/steering/lsp-mandatory.md` (when coding)
- Tech: `.kiro/steering/tech.md` (when choosing libraries)
- Product: `.kiro/steering/product.md` (when unclear on vision)
- Structure: `.kiro/steering/structure.md` (when organizing code)
- Shell: `.kiro/steering/shell-commands.md` (when running commands)

---

**Inclusion**: always
```

#### 2.2 Update Existing Steering Files

**lsp-mandatory.md** - Add frontmatter:
```markdown
---
inclusion: conditional
fileMatchPattern: "**/*.{py,ts,tsx}"
---

# LSP Mandatory Rules
[existing content]
```

**testing-strategy.md** - Add frontmatter:
```markdown
---
inclusion: conditional
fileMatchPattern: "**/tests/**"
---

# Testing Strategy
[existing content]
```

**product.md** - Add frontmatter:
```markdown
---
inclusion: manual
---

# Product Vision
[existing content]
```

**tech.md** - Add frontmatter:
```markdown
---
inclusion: manual
---

# Tech Stack
[existing content]
```

**structure.md** - Add frontmatter:
```markdown
---
inclusion: manual
---

# Project Structure
[existing content]
```

**shell-commands.md** - Add frontmatter:
```markdown
---
inclusion: manual
---

# Shell Commands
[existing content]
```

---

## Part 3: Spec Decomposition (DEFERRED - NOT IMPLEMENTING NOW)

### Decision
**We will NOT implement spec decomposition at this time.** The current `rag-core-phase` spec will remain as-is. When we need to create focused sub-specs for specific work, we'll create new spec folders alongside the existing one.

### Current State (KEEPING THIS)
```
.kiro/specs/
└── rag-core-phase/
    ├── requirements.md  (keep as-is)
    ├── design.md        (keep as-is)
    └── tasks.md         (keep as-is)
```

### Future Approach (When Needed)
When working on a specific subset of tasks, create a focused spec folder:

```
.kiro/specs/
├── rag-core-phase/           (KEEP - master reference)
│   ├── requirements.md
│   ├── design.md
│   └── tasks.md
│
└── task-5-6-breakdown/       (NEW - when needed)
    ├── requirements.md       (focused subset)
    ├── design.md             (focused subset)
    ├── tasks.md              (detailed breakdown)
    └── state.md              (progress tracking)
```

### Rationale
- Keep master spec intact for reference
- Create focused specs only when needed for specific work
- Avoid premature decomposition
- Maintain flexibility

### Action Items
**NONE** - This part is deferred until we need focused sub-specs

---

## Part 4: Task Breakdown Documents

### Current Approach (KEEP THIS)
You mentioned creating separate breakdown documents for complex tasks:
- Task 4.6 breakdown (already done)
- Task 5 & 6 breakdown (planned)
- Task 7 breakdown (planned)
- Task 8 breakdown (planned)
- Task 9 breakdown (planned)

### Recommended Structure

```
.kiro/specs/phase-2a-rag-services/
├── requirements.md
├── design.md
├── tasks.md
├── state.md
└── breakdowns/
    ├── task-2.7-rag-orchestration.md
    ├── task-2.8-document-summary.md
    ├── task-2.9-chunk-service.md
    └── task-2.10-embedding-service.md
```

### Breakdown Template

```markdown
# Task Breakdown: [Task ID] - [Task Name]

## Parent Task
Task [ID] from phase-2a-rag-services/tasks.md

## Complexity
[HIGH/MEDIUM/LOW]

## Estimated Duration
[X hours]

## Sub-Tasks

### Sub-Task 1: [Name]
- **Duration**: [X min]
- **Files**: [list]
- **Dependencies**: [list]
- **Acceptance**: [criteria]

### Sub-Task 2: [Name]
- **Duration**: [X min]
- **Files**: [list]
- **Dependencies**: [list]
- **Acceptance**: [criteria]

[... more sub-tasks]

## Implementation Order
1. Sub-task [X]
2. Sub-task [Y]
3. Sub-task [Z]

## Testing Strategy
[How to test this task]

## Rollback Plan
[If something goes wrong]
```

**Rationale**: Keep breakdowns separate from main tasks.md. Load only when working on that specific task.

---

## Part 5: State Tracking System

### State File Structure

Each phase has a `state.md` file tracking progress.

### State Update Protocol

**Manual Updates** (you do this):
- Before starting work: Update "Current Task"
- After completing task: Move to "Completed Tasks"
- When blocked: Add to "Issues & Blockers"

**Hook-Assisted Updates** (agent does this):
- On agent stop: Auto-update completion details
- On task complete: Auto-record duration, files, tests

### State Template (Detailed)

```markdown
# Phase [X]: [Name] - State Tracking

## Phase Status
- **Status**: [NOT_STARTED | IN_PROGRESS | BLOCKED | COMPLETE]
- **Started**: [date]
- **Target Completion**: [date]
- **Progress**: [X]/[Y] tasks ([Z]%)
- **Estimated Remaining**: [X hours]

## Current Task

### Task [ID]: [Name]
- **Status**: ⏳ IN_PROGRESS
- **Started**: [timestamp]
- **Estimated Duration**: [X min]
- **Actual Duration**: [Y min] (updated on completion)
- **Files In Scope**:
  - [file1]
  - [file2]
- **Files Modified**:
  - [file1] (created/modified)
- **Context**: [brief note on what you're doing]
- **Blockers**: [any issues]

## Completed Tasks

### ✅ Task [ID]: [Name] - COMPLETED [timestamp]
- **Duration**: [X min] (estimated [Y min])
- **Files Modified**:
  - [file1]
  - [file2]
- **Tests**: ✅ [X] passing, [Y]% coverage
- **Issues**: [any problems encountered]
- **Notes**: [lessons learned]

[... more completed tasks]

## Pending Tasks
[ID], [ID], [ID], ... (list of not-started tasks)

## Files Modified This Phase
- [file1] (Task [ID])
- [file2] (Task [ID])
- [file3] (Task [ID])

## Tests Status
- **Passing**: [X]
- **Failing**: [Y]
- **Coverage**: [Z]%
- **Last Run**: [timestamp]

## Checkpoints

### Checkpoint #1 - [timestamp]
- **Tasks Completed**: [ID], [ID], [ID]
- **Tests**: ✅ All passing
- **Coverage**: [X]%
- **Issues**: [any problems]
- **Ready to Continue**: YES/NO

[... more checkpoints]

## Issues & Blockers

### Issue #1: [Description]
- **Severity**: [HIGH | MEDIUM | LOW]
- **Impact**: [what's blocked]
- **Status**: [OPEN | RESOLVED]
- **Resolution**: [how it was fixed]

[... more issues]

## Phase Notes
[Any general notes about this phase]

## Next Phase
Phase [X+1]: [Name] (starts after this phase completes)
```

---

## Part 6: Hooks for Automation

### Hook 1: State Update on Agent Stop

**File**: `.kiro/hooks/state-update.json`

```json
{
  "name": "Auto-Update State on Stop",
  "version": "1.0.0",
  "description": "Updates state.md when agent stops",
  "when": {
    "type": "agentStop"
  },
  "then": {
    "type": "askAgent",
    "prompt": "Update the current phase state.md file with task completion details. Include: task status (✅ COMPLETE), duration, files modified, tests status, any issues. Format as shown in state.md template."
  }
}
```

### Hook 2: LSP Validation on Save

**File**: `.kiro/hooks/lsp-validate.json`

```json
{
  "name": "LSP Validation on Save",
  "version": "1.0.0",
  "description": "Runs LSP diagnostics after saving code files",
  "when": {
    "type": "fileEdited",
    "patterns": ["**/*.py", "**/*.ts", "**/*.tsx"]
  },
  "then": {
    "type": "askAgent",
    "prompt": "Run getDiagnostics on the saved file. If errors exist, report them. If clean, confirm."
  }
}
```

### Hook 3: Resume Helper

**File**: `.kiro/hooks/resume.json`

```json
{
  "name": "Resume Work Helper",
  "version": "1.0.0",
  "description": "Helps resume work by reading state.md",
  "when": {
    "type": "userTriggered"
  },
  "then": {
    "type": "askAgent",
    "prompt": "Read the current phase state.md. Show: current task, what was done last, what's next. Ask if ready to continue."
  }
}
```

---

## Part 7: Implementation Timeline

### Tonight (4 hours) - CRITICAL PATH

**Hour 1: AGENTS.md + Core Rules**
- [ ] Create `AGENTS.md` in project root
- [ ] Create `.kiro/steering/core-rules.md`
- [ ] Add frontmatter to existing steering files
- [ ] Test: Start chat, verify only core-rules loaded

**Hour 2: Hooks Setup**
- [ ] Create `.kiro/hooks/` directory
- [ ] Create state-update hook
- [ ] Create lsp-validate hook
- [ ] Create resume hook
- [ ] Test: Verify hooks trigger correctly

**Hour 3: Task Breakdowns Structure**
- [ ] Create `.kiro/specs/rag-core-phase/breakdowns/` directory
- [ ] Move existing task 4.6 breakdown (if exists)
- [ ] Create breakdown templates for tasks 5-9
- [ ] Document breakdown usage in README

**Hour 4: Validation + Documentation**
- [ ] Test: Start chat, verify context < 8,000 tokens
- [ ] Test: Type "resume", verify hook works
- [ ] Update project README with new workflow
- [ ] Create quick-start guide

### Tomorrow (2 hours) - POLISH

**Hour 1: Refinement**
- [ ] Review core-rules.md for clarity
- [ ] Test conditional steering (edit a .py file, verify lsp-mandatory loads)
- [ ] Test manual steering (reference #tech in chat)
- [ ] Adjust hook prompts if needed

**Hour 2: Documentation**
- [ ] Document AGENTS.md usage
- [ ] Document hook usage
- [ ] Document breakdown approach
- [ ] Create troubleshooting guide

---

## Part 8: Success Metrics

### Context Reduction
```
BEFORE: ~15,000 tokens (steering always loaded)
AFTER:  ~1,200 tokens (core-rules only)
TARGET: 92% reduction in base context
MEASURE: /context show in Kiro chat
```

### Session Duration
```
BEFORE: 1-2 hours before context limits
AFTER:  4-6 hours
TARGET: 3-4x improvement
MEASURE: Work uninterrupted
```

### Task Completion Rate
```
CURRENT: Maintain current rate
TARGET: Improve with clearer rules
MEASURE: ✅ tasks / total tasks
```

### File Safety
```
BEFORE: 2 deletion incidents
AFTER:  0
TARGET: 0 unauthorized operations
MEASURE: Git history audit
```

### Communication Efficiency
```
TARGET: Shorter responses, more questions
MEASURE: Agent response length in chat
```

---

## Part 9: Risk Mitigation

### Risk 1: state.md Gets Out of Sync
**Mitigation**: 
- Hook auto-updates on agent stop
- Manual verification before each session
- Git tracks all changes

### Risk 2: Phase Boundaries Blur
**Status**: NOT APPLICABLE (keeping current spec structure)
**Mitigation**: N/A

### Risk 3: Core Rules Grow Too Large
**Mitigation**:
- 1,200 token hard limit
- Move details to specific steering files
- Weekly review

### Risk 4: Still Hit Context Limits
**Mitigation**:
- Use `/context show` to monitor
- Type `/compact` to compress old messages
- Start new session if needed

---

## Part 10: Validation Checklist

### After Implementation

**Context Validation**:
- [ ] `/context show` reports < 8,000 tokens
- [ ] Only core-rules.md loaded by default
- [ ] Conditional steering loads when relevant
- [ ] Manual steering loads on-demand

**Spec Validation**:
- [ ] rag-core-phase spec remains intact
- [ ] breakdowns/ directory created
- [ ] Breakdown templates exist for tasks 5-9
- [ ] No specs deleted

**Steering Validation**:
- [ ] core-rules.md exists and is < 1,500 tokens
- [ ] All steering files have frontmatter
- [ ] Inclusion modes set correctly
- [ ] No conflicting instructions

**Hook Validation**:
- [ ] state-update hook exists
- [ ] lsp-validate hook exists
- [ ] resume hook exists
- [ ] Hooks trigger correctly

**State Validation**:
- [ ] state.md template exists in Phase 2A
- [ ] Format matches template
- [ ] Current task section empty (ready to fill)
- [ ] Pending tasks listed

**AGENTS.md Validation**:
- [ ] File exists in project root
- [ ] Content is short and direct
- [ ] Covers communication style
- [ ] References core-rules.md

---

## Part 11: Rollback Plan

If something goes wrong:

### Rollback Step 1: Git
```bash
git checkout main
git branch -D kiro-workflow-setup
```

### Rollback Step 2: Restore Old Specs
**NOT NEEDED** - We're keeping the current spec structure

### Rollback Step 3: Remove New Files
```bash
rm AGENTS.md
rm .kiro/steering/core-rules.md
rm -rf .kiro/hooks/
rm -rf .kiro/specs/rag-core-phase/breakdowns/
```

### Rollback Step 4: Restore Steering
```bash
# Remove frontmatter from steering files
# (manual edit)
```

---

## Part 12: Post-Implementation

### Day 1 After Implementation

**Morning**:
- [ ] Start fresh Kiro session
- [ ] Verify context size with `/context show`
- [ ] Test conditional steering (edit .py file)
- [ ] Test manual steering (reference #tech)

**Afternoon**:
- [ ] Work on current tasks
- [ ] Verify agent follows AGENTS.md style
- [ ] Check responses are concise
- [ ] Note any issues

**Evening**:
- [ ] Review what worked well
- [ ] Note any adjustments needed
- [ ] Plan refinements

### Week 1 After Implementation

**Metrics to Track**:
- Context size (should stay < 8,000 tokens)
- Session duration (should be 4+ hours)
- Response conciseness (should be shorter)
- File safety (should be 0 incidents)

**Adjustments**:
- If context still high: Move more to manual steering
- If responses too long: Refine AGENTS.md
- If scope creep: Strengthen core-rules.md
- If hooks not working: Adjust hook prompts

---

## Summary

This plan restructures the Kiro workflow to:

1. **Reduce context by 92%** (15,000 → 1,200 tokens base)
2. **Enable efficient communication** (AGENTS.md style guide)
3. **Enforce scope boundaries** (core-rules.md)
4. **Preserve current spec structure** (no decomposition yet)
5. **Add automation** (hooks for common tasks)

**Total Effort**: 6 hours (4 tonight, 2 tomorrow)  
**Expected ROI**: 3-4x improvement in session duration, clearer communication  
**Risk Level**: Low (all changes reversible via git)

**Next Step**: Review this plan, then execute Part 7 (Implementation Timeline).

---

**Status**: PLANNING COMPLETE - READY FOR REVIEW  
**Date**: January 23, 2026  
**Prepared by**: Kiro Agent
