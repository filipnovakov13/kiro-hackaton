---
description: Execute an implementation plan with state tracking and recovery
argument-hint: [path-to-plan]
---

# Execute: Implement from Plan

## METADATA
- Execution Mode: Spec-Driven Implementation
- State Tracking: MANDATORY (state.md file)
- Checkpoint Frequency: Every 3 tasks OR every 20 minutes
- Recovery: Automatic state restoration on interruption

---

## Files to Read

1. **Plan/Tasks File**: `$ARGUMENTS` (contains tasks to execute)
2. **State File**: `state.md` in same directory as plan (tracks progress and enables recovery)
3. **State Template**: `#[[file:.kiro/specs/state-template.md]]` (format reference)

**CRITICAL**: The plan file (`$ARGUMENTS`) is only for completed tasks. All state tracking goes in `state.md`.

---

## CRITICAL RULES - READ FIRST

### File Deletion Policy (ABSOLUTE)
**NEVER delete ANY file without EXPLICIT user permission. This includes:**
- Documentation files (*.md, *.txt)
- Configuration files
- Test files
- Source code files
- ANY file in the workspace

**If you believe a file should be deleted:**
1. STOP execution immediately
2. Document WHY you think it should be deleted
3. ASK the user for explicit permission
4. WAIT for confirmation before proceeding

**Violation of this rule is a CRITICAL FAILURE.**

### Instruction Priority Hierarchy

When instructions conflict, follow this priority order:

1. **CRITICAL SAFETY** (file deletion policy, data integrity, security)
2. **USER EXPLICIT INSTRUCTIONS** (direct commands in current conversation)
3. **SPEC REQUIREMENTS** (requirements.md, design.md, tasks.md)
4. **LSP-MANDATORY.MD** (code quality, diagnostics, validation)
5. **TESTING-STRATEGY.MD** (test patterns, best practices)
6. **TECH.MD** (technology stack, architecture)
7. **PRODUCT.MD** (product vision, UX philosophy)
8. **STRUCTURE.MD** (project organization)
9. **SHELL-COMMANDS.MD** (platform-specific commands)

**When in doubt:** Ask for clarification rather than assume.

---

## State Tracking Protocol

### File Structure
- **Plan File** (`$ARGUMENTS`): - Contains tasks, requirements, validation commands
- **State File** (`state.md`): WRITE - Tracks progress, enables recovery, documents execution

**Location**: `state.md` is in the same directory as the plan file.

**Example**:
- Plan: `.kiro/specs/rag-core-phase/tasks.md`
- State: `.kiro/specs/rag-core-phase/state.md`

### State File Format
Follow the template at `#[[file:.kiro/specs/state-template.md]]`

### Status Emojis (MANDATORY)
Use these emojis to track task status in the $ARGUMENTS and state.md file:

- `⏳` **IN_PROGRESS** - Task currently being worked on
- `✅` **COMPLETE** - Task finished and validated
- `❌` **FAILED** - Task attempted but failed (document reason)
- `⏸️` **PAUSED** - Task started but paused (document reason)
- `🔄` **RETRY** - Task failed, attempting retry
- `⏭️` **SKIPPED** - Task intentionally skipped (document reason)

### State Update Requirements

**Before starting ANY task:**
1. Read current `state.md` to understand context
2. Update "Current Task" section:
```markdown
## Current Task

### Task X.Y: [Task Name]
- **Status**: ⏳ IN_PROGRESS
- **Started**: [TIMESTAMP]
- **Estimated Duration**: [X min]
- **Files In Scope**: [LIST]
- **Context**: [What you're about to do]
```

**After completing a task:**
1. Move task from "Current Task" to "Completed Tasks":
```markdown
## Completed Tasks

### ✅ Task X.Y: [Task Name] - COMPLETED [TIMESTAMP]
- **Duration**: [X min] (estimated [Y min])
- **Files Modified**: [LIST]
- **Tests**: ✅ [X] passing, [Y]% coverage
- **Validation**: [COMMAND] - [RESULT]
- **Issues**: [any problems encountered]
- **Notes**: [lessons learned]
```
2. Update "Phase Status" progress counter
3. Update "Files Modified This Phase" list
4. Update "Tests Status" section

**If a task fails:**
1. Move to "Completed Tasks" with ❌ status:
```markdown
### ❌ Task X.Y: [Task Name] - FAILED [TIMESTAMP]
- **Duration**: [X min]
- **Reason**: [DETAILED_EXPLANATION]
- **Attempted Solutions**: [LIST]
- **Next Steps**: [RECOMMENDATION]
```
2. Add to "Issues & Blockers" section:
```markdown
### Issue #N: Task X.Y Failed - [Brief Description]
- **Severity**: [HIGH | MEDIUM | LOW]
- **Impact**: [what's blocked]
- **Status**: OPEN
- **Resolution**: [pending/attempted fixes]
```

---

## Checkpoint System (MANDATORY)

### Checkpoint Frequency
Create a checkpoint in `state.md` after:
- Every 3 completed tasks
- Every 20 minutes of execution
- Before any high-risk operation (refactoring, schema changes, etc.)
- When prompted by user

### Checkpoint Content
Add to "Checkpoints" section in `state.md`:

```markdown
## Checkpoints

### Checkpoint #N - [TIMESTAMP]
- **Tasks Completed**: [ID], [ID], [ID]
- **Total Progress**: [X]/[Y] tasks ([Z]%)
- **Time Elapsed**: [MINUTES] since phase start
- **Files Modified**: [COUNT] files
- **Tests**: ✅ [X] passing, ❌ [Y] failing, [Z]% coverage
- **Issues**: [any problems]
- **Validation Commands Run**:
  ```bash
  [COMMAND_1] - [RESULT]
  [COMMAND_2] - [RESULT]
  ```
- **Ready to Continue**: YES/NO
  [If NO, explain what needs resolution]


**Purpose**: Checkpoints enable recovery after interruption. They capture a known-good state.

---

## Execution Workflow

### Phase 1: Pre-Execution Setup

1. **Locate state file**
   - Determine directory of `$ARGUMENTS` file
   - Check if `state.md` exists in same directory
   - If it does not exist, create from template `#[[file:.kiro/specs/state-template.md]]`

2. **Read current state**
   - Open `state.md`
   - Check "Phase Status" - is this a new phase or resuming?
   - Check "Current Task" - is there an incomplete task?
   - Check "Completed Tasks" - what's already done?
   - Check "Issues & Blockers" - any known problems?

3. **Read the plan**
   - Open `$ARGUMENTS` (tasks.md or plan file)
   - Understand all tasks and dependencies
   - Note validation commands
   - Review testing strategy
   - Identify high-risk tasks

4. **Determine starting point**
   - If resuming: Start from task marked ⏳ IN_PROGRESS or first incomplete task
   - If new: Start from Task 1
   - Update `state.md` "Current Task" section

5. **Create execution strategy**
   - Order tasks by dependencies
   - Group related tasks
   - Identify checkpoint locations (every 3 tasks)
   - Estimate time per task

### Phase 2: Task Execution

For each task:

1. **Update state.md - Task Start**
   - Set "Current Task" to ⏳ IN_PROGRESS
   - Add timestamp, estimated duration, files in scope
   
2. **Read relevant context**
   - Review related files
   - Check existing patterns
   - Understand dependencies
   
3. **Run LSP diagnostics** (if code task)
   - Check file health before changes
   - Document any existing issues in state.md
   
4. **Implement the task**
   - Follow spec requirements exactly
   - Preserve existing functionality
   - Add error handling
   - Add logging where appropriate
   
5. **Run LSP diagnostics** (if code task)
   - Verify no new errors introduced
   - Check type safety
   - Validate imports
   
6. **Run validation commands**
   - Execute specified validation
   - Fix any failures
   - Re-run until passing
   
7. **Update state.md - Task Complete**
   - Move task to "Completed Tasks" with ✅ status
   - Document duration, files modified, validation results
   - Update "Phase Status" progress
   - Update "Files Modified This Phase"
   - Update "Tests Status"

8. **Create checkpoint if needed**
   - After every 3 tasks, add checkpoint to state.md
   - Verify all validations passing
   - Document ready-to-continue status

### Phase 3: Testing Implementation

After completing implementation tasks:

1. **Create test files** as specified in plan
2. **Implement test cases** mentioned in plan
3. **Follow [[file:.kiro/steering/testing-strategy.md]]** patterns
4. **Ensure edge case coverage**
5. **Run unified test suite:**
   ```bash
   cmd /c .kiro\scripts\run-all-tests.cmd
   ```
6. **Fix any test failures**
7. **Update state.md "Tests Status"** section
8. **Document test results** in completed task entries

### Phase 4: Final Validation

Before marking execution complete:

1. **Run ALL validation commands** from plan
2. **Verify all tasks completed** (all ✅ in state.md)
3. **Check no files outside scope** modified
4. **Confirm code follows conventions**
5. **Verify documentation updated**
6. **Run final test suite**
7. **Create final checkpoint** in state.md
8. **Update "Phase Status"** to COMPLETE

---

## Recovery Mechanisms

### If Execution Interrupted

1. **Read the state.md file** in the phase directory
2. **Check "Phase Status"** - understand overall progress
3. **Check "Current Task"** - find task marked ⏳ IN_PROGRESS
4. **Check "Completed Tasks"** - see what's already done
5. **Check last "Checkpoint"** - understand last known-good state
6. **Check "Issues & Blockers"** - any known problems
7. **Resume from current/next incomplete task**

**Recovery Example**:
```markdown
# Reading state.md shows:
- Phase Status: IN_PROGRESS, 7/15 tasks (47%)
- Current Task: 2.8 - ⏳ IN_PROGRESS (started 10:30)
- Last Checkpoint: #2 at 10:15 (tasks 2.4-2.6 complete)
- Issues: None blocking

# Action: Resume Task 2.8 from where it was interrupted
```

### If Task Fails 3 Times

1. **Update state.md**:
   - Move task to "Completed Tasks" with ❌ FAILED status
   - Document all attempted solutions
   - Add to "Issues & Blockers" section

2. **Create detailed failure report in state.md**:
   ```markdown
   ### Issue #N: Task X.Y Failed - [Brief Description]
   - **Severity**: HIGH
   - **Impact**: [which tasks are blocked]
   - **Status**: OPEN
   - **Attempted Solutions**:
     1. [SOLUTION_1] - [RESULT]
     2. [SOLUTION_2] - [RESULT]
     3. [SOLUTION_3] - [RESULT]
   - **Root Cause Analysis**: [BEST_GUESS]
   - **Recommended Next Steps**: [SUGGESTIONS]
   ```

3. **STOP execution**
4. **Report to user** and await guidance

### If Ambiguity Encountered

1. **PAUSE execution**
2. **Document in state.md "Phase Notes"**:
   ```markdown
   ## Phase Notes
   
   ### Ambiguity Encountered - [TIMESTAMP]
   - **Task**: X.Y
   - **Question**: [What is unclear?]
   - **Possible Interpretations**:
     1. [OPTION_1] - [IMPLICATIONS]
     2. [OPTION_2] - [IMPLICATIONS]
   - **Status**: PAUSED - Awaiting user clarification
   ```
3. **Apply ambiguity resolution rules** (see below)
4. **If still uncertain, ASK user**

### If state.md is Missing or Corrupted

1. **Create new state.md** from template
2. **Analyze plan file** to determine progress:
   - Check git history for recent changes
   - Check test files for what's implemented
   - Check file timestamps
3. **Make best-effort reconstruction**:
   - Mark obvious completed tasks as ✅
   - Mark current work as ⏳ IN_PROGRESS
   - Document uncertainty in "Phase Notes"
4. **Ask user to verify** reconstructed state

---

## Ambiguity Resolution Rules

When encountering ambiguity, apply these rules in order:

1. **Security First**: Choose the more secure interpretation
2. **Preserve Existing Behavior**: When in doubt, don't change it
3. **Follow Existing Patterns**: Match what's already in the codebase
4. **Minimal Change**: Prefer smaller, surgical changes
5. **LSP-Mandatory Compliance**: Ensure code quality and validation
6. **Testing-Strategy Compliance**: Follow established test patterns
7. **Ask for Clarification**: If still uncertain, stop and ask

---

## Quality Gates

### Before Proceeding to Next Task
- [ ] Current task moved to "Completed Tasks" with ✅ status in state.md
- [ ] All validation commands passed
- [ ] LSP diagnostics show no new errors
- [ ] No files outside scope modified
- [ ] state.md "Phase Status" progress updated
- [ ] state.md "Files Modified This Phase" updated
- [ ] state.md "Tests Status" updated

### Before Creating Checkpoint
- [ ] All tasks since last checkpoint are ✅ or ❌ in state.md
- [ ] No tasks left in ⏳ IN_PROGRESS state
- [ ] All validation commands run
- [ ] Test status documented in state.md
- [ ] Issues documented in "Issues & Blockers" section

### Before Marking Execution Complete
- [ ] All tasks completed (✅) or documented failures (❌) in state.md
- [ ] All tests created and passing
- [ ] All validation commands pass
- [ ] Code follows project conventions
- [ ] Documentation added/updated
- [ ] Final checkpoint created in state.md
- [ ] state.md "Phase Status" set to COMPLETE
- [ ] Ready for code review

---

## Output Report Format

At the end of execution, provide a summary (user can also check detailed state.md):

### Execution Summary

```markdown
# Execution Report: [SPEC_NAME]

## Overview
- Phase: [NAME]
- Execution Date: [DATE]
- Total Duration: [HOURS:MINUTES]
- Tasks Completed: [NUMBER]/[TOTAL] ([PERCENT]%)
- Tasks Failed: [NUMBER]
- Tasks Skipped: [NUMBER]

## Key Accomplishments
- [MAJOR_ACHIEVEMENT_1]
- [MAJOR_ACHIEVEMENT_2]
- [MAJOR_ACHIEVEMENT_3]

## Files Summary
- Created: [NUMBER] files
- Modified: [NUMBER] files
- Deleted: [NUMBER] files (if any, with user permission)

## Tests Summary
- Test Files: [NUMBER]
- Test Cases: [NUMBER]
- Passing: [NUMBER]
- Coverage: [PERCENT]%

## Validation Status
✅ All validation commands passing
❌ [NUMBER] validation failures (see state.md for details)

## Issues
- [NUMBER] issues encountered
- [NUMBER] resolved
- [NUMBER] open (see state.md "Issues & Blockers")

## Next Steps
[RECOMMENDATIONS_FOR_NEXT_PHASE_OR_ACTIONS]

## Detailed State
See `state.md` for complete execution details, checkpoints, and task-by-task breakdown.
```

**Note**: The state.md file contains the authoritative, detailed record. This summary is for quick reference.

---

## Safety Clauses

### The Rollback Clause
If at any point the implementation would result in:
- Breaking changes to existing functionality
- Data loss or corruption
- Security vulnerabilities
- Behavior significantly different from existing system

**STOP execution immediately.** Document the concern and await user clarification.

### The Scope Preservation Clause
- DO NOT modify files not specified in the plan
- DO NOT introduce dependencies not approved in the plan
- DO NOT refactor code outside current task scope
- DO NOT "improve" unrelated functionality

### The Validation Requirement Clause
- DO NOT skip validation steps under any circumstances
- DO NOT proceed if tests fail without attempting resolution
- DO NOT continue if LSP diagnostics show critical errors
- DO NOT mark task complete without running validation

### The Good Faith Clause
When ambiguity exists, choose the interpretation most aligned with:
- Software engineering best practices
- Security and data integrity
- Code maintainability
- The stated intent of the specification

---

## Notes

- **State Tracking**: All progress tracking goes in `state.md`, NOT in the plan file. The plan file is reference only.
- **Context Awareness**: You have access to all steering files (#[[file:.kiro/steering/testing-strategy.md]], #[[file:.kiro/steering/lsp-mandatory.md]], #[[file:.kiro/steering/tech.md]], #[[file:.kiro/steering/product.md]], #[[file:.kiro/steering/structure.md]], #[[file:.kiro/steering/shell-commands.md]]). Use them for guidance.
- **State Persistence**: Always update state.md so execution can be resumed if interrupted.
- **Checkpoint Discipline**: Create checkpoints every 3 tasks. They are your recovery points.
- **Failure Documentation**: Document failures thoroughly in state.md "Issues & Blockers". They help diagnose systemic issues.
- **User Communication**: When in doubt, ask. Better to clarify than to assume incorrectly.
- **Recovery**: If interrupted, read state.md first to understand where you left off.

---

## Emergency Stop Conditions

Immediately stop execution and report to user if:

1. **File Deletion Requested**: Any operation would delete a file
2. **Critical Test Failures**: Core functionality tests failing after changes
3. **LSP Critical Errors**: Type errors, import failures, syntax errors introduced
4. **Scope Violation**: About to modify files outside specified scope
5. **Security Concern**: About to introduce potential security vulnerability
6. **Data Integrity Risk**: Operation could cause data loss or corruption
7. **Repeated Failures**: Same task failing 3+ times
8. **Ambiguity Unresolved**: Cannot determine correct interpretation after applying resolution rules

**When stopped, provide:**
- Clear explanation of why execution stopped
- Current state summary
- Recommended next steps
- What user input is needed to proceed
