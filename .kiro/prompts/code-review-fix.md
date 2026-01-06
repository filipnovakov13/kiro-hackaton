---
description: Process to fix bugs found in manual/AI code review
argument-hint: [code-review-file-or-description] [scope-files-or-modules]
---

## Intent

Fix issues identified in code review while preserving all existing functionality.

## Inputs

- **Code-review source**: $1 (file path to review document OR inline description of issues)
- **Scope**: $2 (specific files or modules that may be modified)

If Code-review is a file, read the entire file first to understand all issues presented.

## Process

For each issue identified:

1. **Understand**: Read the full context of the affected code
2. **Explain**: Document what was wrong and why it's a problem
3. **Fix**: Show the proposed fix with before/after comparison
4. **Verify**: Ensure fix doesn't break existing functionality
5. **Test**: Create or update tests to prevent regression

## Validation

After all fixes are complete:

```bash
# Run project linter
ruff check . --fix  # Python
# OR
npm run lint        # TypeScript/JavaScript

# Run type checker
mypy .              # Python
# OR
npm run typecheck   # TypeScript

# Run test suite
pytest              # Python
# OR
npm test            # TypeScript/JavaScript
```

All validation must pass before fixes are considered complete.

## Scope Boundaries

### In Scope
- Files explicitly listed in $2
- Test files corresponding to modified code

### Out of Scope (DO NOT MODIFY)
- Files not mentioned in scope parameter
- Unrelated code even if issues are noticed
- Configuration files unless explicitly in scope

## Constraints

- DO NOT modify files outside the specified scope
- DO NOT introduce new dependencies without explicit approval
- DO NOT change public API signatures unless the issue requires it
- DO NOT skip error handling in fixes
- Preserve all existing tests - they must continue to pass
- Each fix must be minimal and surgical

## Forbidden Outcomes

- Fixes that introduce new bugs or regressions
- Fixes that change unrelated code ("while I'm here" changes)
- Fixes without corresponding test coverage
- Fixes that break existing functionality

## When to Ask for Clarification

- If the issue description is ambiguous
- If multiple valid fix approaches exist
- If the fix would require changes outside scope
- If the fix might have unintended side effects