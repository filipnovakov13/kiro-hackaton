# Future Tasks

Tasks to be triggered when specific project milestones are reached.

---

## Trigger: Frontend Directory Created

**When:** `frontend/` directory is created with `package.json` and test infrastructure

### ✅ Task: Add Kiro Configuration Property Tests (COMPLETED)

**Status:** Completed on 2026-01-06

Add property-based tests for validating Kiro hook configurations.

**Location:** `frontend/tests/kiro-config/`

**Dependencies to add:**
```bash
cd frontend && npm install --save-dev fast-check vitest
```

**Files created:**
- ✅ `frontend/tests/kiro-config/format-hook.property.test.ts`
- ✅ `frontend/vitest.config.ts`

**Test requirements:**
- ✅ Property 1: Format-on-Save Hook Execution (validates Requirements 1.1, 1.2)
- ✅ Test that Python files in `backend/**/*.py` trigger Black formatter
- ✅ Test that TypeScript files in `frontend/**/*.{ts,tsx}` trigger Prettier formatter
- ✅ Test that files outside configured directories don't trigger formatters
- ✅ Verify timeout (2000ms) and error notification settings

**Reference:** `.kiro/specs/advanced-kiro-features/design.md` - Correctness Properties section


### ❌ Task: Add PR Hook Property Tests (REMOVED)

**Status:** Removed on 2026-01-07

**Rationale:** After comparative analysis, the `create-pr.md` prompt was determined to be superior to the `create-pr.json` hook for PR automation:
- Prompts provide richer error handling with contextual suggestions
- Prompts can ask clarifying questions mid-process and handle edge cases
- Hooks have rigid sequential execution with no recovery options
- The hook's `prBodyTemplate` wasn't actually used (referenced static file instead)
- Prompts have explicit scope boundaries and forbidden actions for safety

**Decision:** Use `@create-pr` prompt instead of hook-based automation.

**Files removed:**
- `frontend/tests/kiro-config/pr-hook.property.test.ts`
- `.kiro/hooks/create-pr.json`
- `.kiro/hooks/pr-body-template.md`
