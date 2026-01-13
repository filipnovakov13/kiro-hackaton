---
description: Execute an implementation plan
argument-hint: [path-to-plan]
---

# Execute: Implement from Plan

## Plan to Execute

Read plan file: `$ARGUMENTS`

## Execution Instructions

### 1. Read and Understand

- Read the ENTIRE plan carefully
- Understand all tasks and their dependencies
- Note the validation commands to run
- Review the testing strategy
- **Identify which tasks are backend vs frontend** for subagent delegation

### 2. Task Classification

Before executing, classify each task:

| Task Type | Indicators | Subagent |
|-----------|------------|----------|
| **Backend** | `backend/`, Python files, FastAPI, API endpoints, database, RAG | `backend-specialist` |
| **Frontend** | `frontend/`, React, TypeScript, components, UI, styling | `frontend-specialist` |
| **Mixed/Integration** | Both backend and frontend, API contracts | Main agent coordinates |

### 3. Execute Tasks with Subagents

#### For Independent Backend/Frontend Tasks (Parallel Execution)

When backend and frontend tasks have NO dependencies on each other:

**Spawn subagents in parallel:**
- Use `backend-specialist` subagent (from `.kiro/agents/backend-agent.json`) for backend tasks
- Use `frontend-specialist` subagent (from `.kiro/agents/frontend-agent.json`) for frontend tasks

Example delegation:
```
Run subagents to implement in parallel:
1. Backend subagent (backend-specialist): Implement the API endpoint in backend/app/api/
2. Frontend subagent (frontend-specialist): Implement the React component in frontend/src/
```

#### For Dependent Tasks (Sequential Execution)

When tasks have dependencies (e.g., frontend needs backend API first):
1. Execute backend task first (via backend-specialist subagent)
2. Wait for completion
3. Execute frontend task (via frontend-specialist subagent)

#### For Integration Tasks

Handle directly in main agent:
- API contract definitions
- Shared types/interfaces
- Integration testing
- Cross-cutting concerns

### 4. Subagent Task Format

When delegating to a subagent, provide:

```
Task: [Clear description of what to implement]
Files: [Specific files to create/modify]
Requirements: [Relevant requirements from plan]
Validation: [How to verify the task is complete]
```

### 5. Implement Testing Strategy

After completing implementation tasks:

- Create all test files specified in the plan
- Implement all test cases mentioned
- Follow the testing approach outlined
- Ensure tests cover edge cases

**Run unified test suite:**
```bash
cmd /c .kiro\scripts\run-all-tests.cmd
```

### 6. Run Validation Commands

Execute ALL validation commands from the plan in order.

If any command fails:
- Fix the issue
- Re-run the command
- Continue only when it passes

### 7. Final Verification

Before completing:

- ✅ All tasks from plan completed
- ✅ All subagent tasks returned successfully
- ✅ All tests created and passing
- ✅ All validation commands pass
- ✅ Code follows project conventions
- ✅ Documentation added/updated as needed

## Output Report

Provide summary:

### Completed Tasks
- List of all tasks completed
- Files created (with paths)
- Files modified (with paths)
- **Subagent delegation summary** (which subagent handled which tasks)

### Tests Added
- Test files created
- Test cases implemented
- Test results

### Validation Results
```bash
# Output from each validation command
```

### Ready for Commit
- Confirm all changes are complete
- Confirm all validations pass
- Ready for `@create-pr` prompt

## Safety Clauses

- If any validation command fails 3 times consecutively, STOP and report the issue to user
- DO NOT proceed to next task until current task validates successfully
- DO NOT modify files not specified in the plan
- If plan is ambiguous, ask for clarification rather than assume
- **Subagents cannot access specs** - provide all necessary context in the delegation

## Checkpoint Requirements

- After each phase, summarize what was completed before proceeding
- Before any destructive operations (delete, overwrite), confirm intent
- If deviating from plan, document the reason BEFORE making changes
- **After subagent completion**, verify results before proceeding

## Constraints

- DO NOT skip validation steps under any circumstances
- DO NOT introduce dependencies not specified in the plan
- DO NOT refactor code outside the current task scope
- DO NOT continue if tests fail without attempting resolution

## Notes

- If you encounter issues not addressed in the plan, document them and ask for guidance
- If you need to deviate from the plan, explain why before proceeding
- If tests fail, attempt to fix implementation - if stuck after 3 attempts, report to user
- **Subagents have their own context** - results are returned to main agent automatically
- **Steering files work in subagents** - they will have access to tech.md, product.md, etc.
