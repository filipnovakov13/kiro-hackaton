---
description: Execute an implementation plan with state tracking and recovery
argument-hint: [path-to-plan]
---

# Execute: Implement from Plan

## METADATA
- Execution Mode: Spec-Driven Implementation
- State Tracking: MANDATORY
- Checkpoint Frequency: Every tasks OR every 20 minutes
- Recovery: Automatic state restoration on interruption

---

## Plan to Execute

Read plan file: `$ARGUMENTS`

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

## Task State Tracking Protocol

### Status Emojis (MANDATORY)
Use these emojis to track task status in the tasks.md file:

- `⏳` **IN_PROGRESS** - Task currently being worked on
- `✅` **COMPLETE** - Task finished and validated
- `❌` **FAILED** - Task attempted but failed (document reason)
- `⏸️` **PAUSED** - Task started but paused (document reason)
- `🔄` **RETRY** - Task failed, attempting retry
- `⏭️` **SKIPPED** - Task intentionally skipped (document reason)

### State Update Requirements

**Before starting ANY task:**
```markdown
## Task X.Y: [Task Name]
Status: ⏳ IN_PROGRESS
Started: [TIMESTAMP]
```

**After completing a task:**
```markdown
## Task X.Y: [Task Name]
Status: ✅ COMPLETE
Started: [TIMESTAMP]
Completed: [TIMESTAMP]
Duration: [MINUTES]
Files Modified: [LIST]
Validation: [COMMAND_RUN] - [RESULT]
```

**If a task fails:**
```markdown
## Task X.Y: [Task Name]
Status: ❌ FAILED
Started: [TIMESTAMP]
Failed: [TIMESTAMP]
Reason: [DETAILED_EXPLANATION]
Attempted Solutions: [LIST]
Next Steps: [RECOMMENDATION]
```

---

## Checkpoint System (MANDATORY)

### Checkpoint Frequency
Create a checkpoint after:
- Every 1 completed tasks
- Every 20 minutes of execution
- Before any high-risk operation (refactoring, schema changes, etc.)
- When prompted by user

### Checkpoint Content
Each checkpoint must include:

```markdown
## CHECKPOINT [NUMBER] - [TIMESTAMP]

### Completed Since Last Checkpoint
- Task X.Y: [Name] - ✅ [Duration]
- Task X.Z: [Name] - ✅ [Duration]

### Current State
- Total Tasks: [COMPLETED]/[TOTAL]
- Current Task: [X.Y] - [Name]
- Time Elapsed: [MINUTES]

### Files Modified
- [FILE_1]: [CHANGES_SUMMARY]
- [FILE_2]: [CHANGES_SUMMARY]

### Tests Status
- Passing: [NUMBER]
- Failing: [NUMBER]
- Not Run: [NUMBER]

### Issues Encountered
- [ISSUE_1]: [STATUS/RESOLUTION]
- [ISSUE_2]: [STATUS/RESOLUTION]

### Next Steps
1. [NEXT_TASK]
2. [NEXT_TASK]

### Validation Commands Run
```bash
[COMMAND_1] - [RESULT]
[COMMAND_2] - [RESULT]
```

### Ready to Continue: [YES/NO]
[If NO, explain what needs resolution]
```

---

## Execution Workflow

### Phase 1: Pre-Execution Analysis

1. **Read the ENTIRE plan carefully**
   - Understand all tasks and dependencies
   - Note validation commands
   - Review testing strategy
   - Identify high-risk tasks

2. **Classify tasks by type**
   - Backend: Python, FastAPI, database, services
   - Frontend: React, TypeScript, components, UI
   - Integration: API contracts, shared types
   - Testing: Test files, test infrastructure

3. **Identify dependencies**
   - Which tasks must be done sequentially?
   - Which tasks can be done independently?
   - What are the critical path tasks?

4. **Create execution plan**
   - Order tasks by dependencies
   - Group related tasks
   - Identify checkpoint locations
   - Estimate time per task

### Phase 2: Task Execution

For each task:

1. **Update task status to ⏳ IN_PROGRESS**
2. **Read relevant context**
   - Review related files
   - Check existing patterns
   - Understand dependencies
3. **Run LSP diagnostics** (if code task)
   - Check file health before changes
   - Document any existing issues
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
7. **Update task status to ✅ COMPLETE**
   - Document duration
   - List files modified
   - Record validation results

### Phase 3: Testing Implementation

After completing implementation tasks:

1. **Create test files** as specified in plan
2. **Implement test cases** mentioned in plan
3. **Follow testing-strategy.md** patterns
4. **Ensure edge case coverage**
5. **Run unified test suite:**
   ```bash
   cmd /c .kiro\scripts\run-all-tests.cmd
   ```
6. **Fix any test failures**
7. **Document test results**

### Phase 4: Final Validation

Before marking execution complete:

1. **Run ALL validation commands** from plan
2. **Verify all tasks completed** (all ✅)
3. **Check no files outside scope** modified
4. **Confirm code follows conventions**
5. **Verify documentation updated**
6. **Run final test suite**
7. **Create final checkpoint**

---

## Recovery Mechanisms

### If Execution Interrupted

1. **Read the tasks.md file** to find last checkpoint
2. **Identify last completed task** (last ✅)
3. **Check for any ⏳ IN_PROGRESS** tasks
4. **Review checkpoint notes** for context
5. **Resume from next incomplete task**

### If Task Fails 3 Times

1. **Mark task as ❌ FAILED**
2. **Document all attempted solutions**
3. **Create detailed failure report:**
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
   
   ### Recommended Next Steps
   [SUGGESTIONS_FOR_USER]
   
   ### Impact on Remaining Tasks
   [WHICH_TASKS_ARE_BLOCKED]
   ```
4. **STOP execution**
5. **Report to user** and await guidance

### If Ambiguity Encountered

1. **PAUSE execution**
2. **Document the ambiguity:**
   - What is unclear?
   - What are the possible interpretations?
   - What are the implications of each?
3. **Apply ambiguity resolution rules** (see below)
4. **If still uncertain, ASK user**

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
- [ ] Current task status is ✅ COMPLETE
- [ ] All validation commands passed
- [ ] LSP diagnostics show no new errors
- [ ] No files outside scope modified
- [ ] Changes documented in task notes

### Before Creating Checkpoint
- [ ] All tasks since last checkpoint are ✅ or ❌
- [ ] No tasks left in ⏳ IN_PROGRESS state
- [ ] All validation commands run
- [ ] Test status documented
- [ ] Issues documented with resolutions

### Before Marking Execution Complete
- [ ] All tasks completed (✅) or documented failures (❌)
- [ ] All tests created and passing
- [ ] All validation commands pass
- [ ] Code follows project conventions
- [ ] Documentation added/updated
- [ ] Final checkpoint created
- [ ] Ready for code review

---

## Output Report Format

### Execution Summary

```markdown
# Execution Report: [SPEC_NAME]

## Overview
- Execution Date: [DATE]
- Total Duration: [HOURS:MINUTES]
- Tasks Completed: [NUMBER]/[TOTAL]
- Tasks Failed: [NUMBER]
- Tasks Skipped: [NUMBER]

## Completed Tasks
| Task ID | Name | Duration | Status | Notes |
|---------|------|----------|--------|-------|
| X.Y | [NAME] | [MIN] | ✅ | [NOTES] |
| X.Z | [NAME] | [MIN] | ✅ | [NOTES] |

## Failed Tasks
| Task ID | Name | Reason | Recommendation |
|---------|------|--------|----------------|
| X.Y | [NAME] | [REASON] | [NEXT_STEPS] |

## Files Modified
- [FILE_1]: [CHANGES_SUMMARY]
- [FILE_2]: [CHANGES_SUMMARY]

## Files Created
- [FILE_1]: [PURPOSE]
- [FILE_2]: [PURPOSE]

## Tests Added
- [TEST_FILE_1]: [TEST_CASES_COUNT] tests
- [TEST_FILE_2]: [TEST_CASES_COUNT] tests

## Validation Results
```bash
# Command 1
[COMMAND] - [RESULT]

# Command 2
[COMMAND] - [RESULT]
```

## Issues Encountered
1. [ISSUE_1]: [RESOLUTION]
2. [ISSUE_2]: [RESOLUTION]

## Checkpoints Created
- Checkpoint 1: [TIMESTAMP] - [TASKS_COMPLETED]
- Checkpoint 2: [TIMESTAMP] - [TASKS_COMPLETED]

## Ready for Next Phase
- [ ] All critical tasks complete
- [ ] All tests passing
- [ ] All validations passing
- [ ] Documentation updated
- [ ] Code review ready

## Recommendations
[ANY_SUGGESTIONS_FOR_NEXT_STEPS]
```

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

- **Context Awareness**: You have access to all steering files (product.md, tech.md, structure.md, testing-strategy.md, lsp-mandatory.md, shell-commands.md). Use them for guidance.
- **State Persistence**: Always update task status in tasks.md file so execution can be resumed if interrupted.
- **Checkpoint Discipline**: Create checkpoints regularly. They are your recovery points.
- **Failure Documentation**: Document failures thoroughly. They help diagnose systemic issues.
- **User Communication**: When in doubt, ask. Better to clarify than to assume incorrectly.

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
