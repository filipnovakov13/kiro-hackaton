# Create Feature Pull Request

Automate the creation of a pull request for a completed feature with test validation.

## INTENT & PURPOSE

### High-Level Goal
Create a pull request for a completed feature after validating all tests pass.

### Business Context
Ensures code quality by enforcing test validation before PR creation, maintains consistent branch naming, and documents changes in DEVLOG for project tracking.

### Success Definition
When this task is complete, a pull request exists on GitHub with passing tests, proper documentation, and the DEVLOG is updated with the PR link.

---

## REQUIRED INFORMATION

Before proceeding, gather the following from the user:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Feature Name | string | YES | Short, descriptive name (used for branch: `feature/{name}`) |
| Feature Summary | string | YES | Brief description of what the feature does |
| Linked Requirements | string | NO | Comma-separated requirement IDs this PR addresses |

---

## SCOPE BOUNDARIES

### Explicitly In Scope
- [x] Running backend tests (pytest)
- [x] Running frontend tests (Jest)
- [x] Creating feature branch
- [x] Staging and committing changes
- [x] Pushing to remote
- [x] Creating GitHub PR
- [x] Updating DEVLOG.md

### Explicitly Out of Scope (DO NOT MODIFY)
- [ ] Source code files (no code changes during PR creation)
- [ ] Test files (no test modifications)
- [ ] Configuration files
- [ ] Database schemas
- [ ] Any file not explicitly listed above

---

## PROCESS

### Step 1: Validate Tests

Run the unified test suite using the run-all-tests hook:

```bash
# Run unified test suite (backend + frontend)
cmd /c .kiro\scripts\run-all-tests.cmd
```

This runs:
- Backend tests (pytest)
- Frontend tests (vitest)

**CRITICAL: If any tests fail:**
1. Display the failing test details with full output
2. Provide specific suggestions for fixing the failures
3. **HALT** the PR creation process immediately
4. Ask user: "Tests failed. Would you like to fix the issues before retrying?"
5. **DO NOT** proceed to Step 2 until all tests pass

### Step 2: Create Feature Branch

```bash
git checkout -b feature/{feature-name}
```

**Feature name sanitization rules:**
- Convert spaces to hyphens (`my feature` → `my-feature`)
- Convert to lowercase (`MyFeature` → `myfeature`)
- Remove special characters except hyphens
- Trim leading/trailing whitespace
- Maximum length: 50 characters

**If branch already exists:**
- Ask user: "Branch `feature/{name}` already exists. Choose: (1) Delete and recreate, (2) Use different name"
- **DO NOT** automatically delete or overwrite

### Step 3: Stage and Commit Changes

```bash
git add -A
git commit -m "feat: {feature-name}"
```

**Commit message format:** Follow conventional commits (`feat:`, `fix:`, `docs:`, etc.)

### Step 4: Push and Create PR

```bash
git push -u origin feature/{feature-name}
gh pr create --title "feat: {feature-name}" --body "## Summary\n{feature-summary}\n\n## Test Results\n- Backend: ✅ Passed\n- Frontend: ✅ Passed\n\n## Requirements\n{linked-requirements}"
```

**PR body MUST include all of the following sections:**
- Summary of changes
- Test results (backend: pass/fail, frontend: pass/fail)
- Linked requirements
- Reviewer checklist

### Step 5: Update DEVLOG

On successful PR creation ONLY:
1. Read `.kiro/documentation/project-docs/DEVLOG.md`
2. Add entry under current date with:
   - PR link (full URL)
   - Feature summary
   - Requirements addressed
3. **DO NOT** modify any other sections of DEVLOG

---

## ERROR HANDLING

| Error Type | Detection | Response | Recovery |
|------------|-----------|----------|----------|
| Tests fail | Non-zero exit code from pytest/jest | Display full error output, halt process | Ask user to fix, then retry |
| Branch exists | Git error on checkout -b | Prompt user for action | User chooses: delete or rename |
| Git push fails | Non-zero exit code | Display git error message | Suggest checking remote config |
| gh CLI missing | Command not found | Display installation instructions | User installs, then retry |
| No remote configured | Git remote error | Display git remote setup instructions | User configures, then retry |
| Uncommitted changes | Git status check | Warn user about uncommitted changes | Ask to proceed or abort |

---

## FORBIDDEN ACTIONS

The following actions are explicitly prohibited:

1. **DO NOT** create PR if any tests fail
2. **DO NOT** modify any source code files
3. **DO NOT** modify any test files
4. **DO NOT** skip test validation step
5. **DO NOT** force push to any branch
6. **DO NOT** delete branches without explicit user confirmation
7. **DO NOT** modify DEVLOG if PR creation fails
8. **DO NOT** assume feature name - always ask user
9. **DO NOT** proceed past test failures without user acknowledgment
10. **DO NOT** create PR without all required sections in body

---

## PREREQUISITES

Before running this prompt, verify:

- [ ] Git configured with remote repository (`git remote -v` shows origin)
- [ ] GitHub CLI (`gh`) installed and authenticated (`gh auth status`)
- [ ] Backend dependencies installed (`backend/.venv` or `.venv` exists)
- [ ] Frontend dependencies installed (`frontend/node_modules` exists)
- [ ] Unified test runner available (`.kiro/scripts/run-all-tests.cmd` exists)
- [ ] No uncommitted changes that shouldn't be included

---

## AMBIGUITY RESOLUTION

When encountering ambiguity, apply these rules in order:

1. **Test Safety First**: If unsure whether tests pass, run them again
2. **Ask for Clarification**: If feature name is unclear, ask user
3. **Preserve Existing State**: If branch exists, ask before modifying
4. **Minimal Changes**: Only modify DEVLOG, nothing else
5. **Stop on Errors**: Any unexpected error halts the process

---

## ACCEPTANCE CRITERIA

Before marking complete, verify:

- [ ] All tests pass via unified test runner (run-all-tests.cmd exit code 0)
- [ ] Feature branch created with correct naming pattern
- [ ] All changes committed with conventional commit message
- [ ] Branch pushed to remote successfully
- [ ] PR created on GitHub with complete body
- [ ] DEVLOG updated with PR link and summary
- [ ] No files modified outside of DEVLOG

---

## EXAMPLE USAGE

**User**: "Create a PR for the document-upload feature"

**Agent Response**:
1. "What is the feature summary for document-upload?"
2. "Are there any requirement IDs to link? (optional)"
3. Run: `cmd /c .kiro\scripts\run-all-tests.cmd`
4. If tests pass: Create branch `feature/document-upload`
5. Commit: `git commit -m "feat: document-upload"`
6. Push and create PR
7. Update DEVLOG with PR link
8. Report: "PR created successfully: [PR_URL]"

**If tests fail**:
1. Display: "Tests failed: [error details from unified test runner]"
2. Ask: "Would you like to fix the failing tests before creating the PR?"
3. **STOP** - do not proceed until user responds
