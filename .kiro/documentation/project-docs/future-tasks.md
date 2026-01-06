# Future Tasks

Tasks to be triggered when specific project milestones are reached.

---

## Trigger: Frontend Directory Created

**When:** `frontend/` directory is created with `package.json`

### Task: Add Kiro Configuration Property Tests

Add property-based tests for validating Kiro hook configurations.

**Location:** `frontend/tests/kiro-config/`

**Dependencies to add:**
```bash
cd frontend && npm install --save-dev fast-check vitest
```

**Files to create:**
- `frontend/tests/kiro-config/format-hook.property.test.ts`

**Test requirements:**
- Property 1: Format-on-Save Hook Execution (validates Requirements 1.1, 1.2)
- Test that Python files in `backend/**/*.py` trigger Black formatter
- Test that TypeScript files in `frontend/**/*.{ts,tsx}` trigger Prettier formatter
- Test that files outside configured directories don't trigger formatters
- Verify timeout (2000ms) and error notification settings

**Reference:** `.kiro/specs/advanced-kiro-features/design.md` - Correctness Properties section

---

## Trigger: Frontend Directory Created

**When:** `frontend/` directory is created with `package.json` and test infrastructure

### Task: Add PR Hook Property Tests

Add property-based tests for validating PR automation hook configurations.

**Location:** `frontend/tests/kiro-config/`

**Dependencies to add:**
```bash
cd frontend && npm install --save-dev fast-check vitest
```

**Files to create:**
- `frontend/tests/kiro-config/pr-hook.property.test.ts`

**Test requirements:**

**Property 2: PR Branch Naming Convention**
- *For any* feature name provided to the PR hook, the created branch SHALL follow the pattern `feature/{feature-name}` where feature-name is the sanitized input
- Test with various feature names (spaces, special characters, unicode)
- Verify sanitization produces valid git branch names
- **Validates: Requirements 2.2**

**Property 3: PR Body Completeness**
- *For any* pull request created by the PR hook, the PR body SHALL contain all required sections: summary, test results, and linked requirements
- Test that all template variables are populated
- Verify markdown structure is valid
- **Validates: Requirements 2.3**

**Property 4: PR Test Enforcement**
- *For any* PR creation attempt, the hook SHALL verify that at least one test exists and passes for each modified module before allowing PR creation
- Test that PR creation fails when tests fail
- Test that PR creation succeeds only when all tests pass
- **Validates: Requirements 2.6**

**Reference:** `.kiro/specs/advanced-kiro-features/design.md` - Correctness Properties section

**Example test structure:**
```typescript
import fc from 'fast-check';
import { describe, test, expect } from 'vitest';

// Property 2: PR Branch Naming
describe('PR Branch Naming Convention', () => {
  test('branch follows feature/{name} pattern for any feature name', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), (featureName) => {
        const branchName = createBranchName(featureName);
        return branchName.startsWith('feature/') && isValidGitBranchName(branchName);
      }),
      { numRuns: 100 }
    );
  });
});

// Property 3: PR Body Completeness
describe('PR Body Completeness', () => {
  test('PR body contains all required sections', () => {
    fc.assert(
      fc.property(
        fc.record({
          featureSummary: fc.string({ minLength: 1 }),
          backendTestResult: fc.string(),
          frontendTestResult: fc.string(),
          linkedRequirements: fc.string()
        }),
        (inputs) => {
          const prBody = generatePRBody(inputs);
          return prBody.includes('## Summary') &&
                 prBody.includes('## Test Results') &&
                 prBody.includes('## Requirements');
        }
      ),
      { numRuns: 100 }
    );
  });
});
```
