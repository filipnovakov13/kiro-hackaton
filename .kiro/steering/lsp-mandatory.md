---
inclusion: fileMatch
fileMatchPattern: "**/*.{py,ts,tsx,js,jsx}"
---

# LSP Mandatory Usage

## Core Rule
**NEVER** code without LSP validation. **ALWAYS** run `getDiagnostics` before/after changes.

## Protocol

### Before Code Changes
1. `getDiagnostics(target_files)` - check health
2. Report LSP status
3. Stop if critical errors found

### After Code Changes
1. `getDiagnostics(modified_files)` - validate
2. Verify no new errors
3. Report results

## Quality Gates
- [ ] Pre-task LSP check passed
- [ ] Post-task LSP validation passed
- [ ] No new critical errors
- [ ] Type safety maintained
- [ ] All imports resolve

## Error Handling
- **Minor warnings**: Report, continue
- **Critical errors**: STOP, report, wait for fix
- **LSP unavailable**: STOP, report, escalate

## Required in Every Response
```
LSP Status: [PASSED/FAILED/WARNINGS]
Errors: [NONE/LIST]
```