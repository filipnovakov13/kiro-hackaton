# LSP Mandatory Usage Guidelines

## Core LSP Requirements

### MANDATORY: All code operations MUST use LSP context
- **NEVER** read, edit, or refactor code without LSP validation
- **ALWAYS** run `getDiagnostics` before any code operation
- **REQUIRED** LSP status reporting in all responses
- **FAILURE** to use LSP = operation failure

## Pre-Code-Operation Protocol

### 1. LSP Health Check (MANDATORY)
```
BEFORE any code reading/editing/refactoring:
1. Run getDiagnostics on target files
2. Verify LSP is active and providing information
3. Check for critical errors that would break operations
4. Report LSP status to user
```

### 2. Critical Error Handling
```
IF critical LSP errors found:
- STOP all code operations immediately
- Report specific errors to user
- Provide fix suggestions
- DO NOT proceed until errors resolved
```

### 3. LSP Context Gathering
```
FOR code reading operations:
- Use getDiagnostics to understand file health
- Gather symbol information when available
- Identify type definitions and relationships
- Report enhanced context in responses
```

## Post-Code-Operation Validation

### 1. Mandatory Validation Steps
```
AFTER any code changes:
1. Run getDiagnostics on modified files
2. Check for newly introduced errors/warnings
3. Validate imports and references still resolve
4. Report validation results to user
```

### 2. Quality Gates
```
Code operation is NOT complete until:
- LSP validation passes
- No new critical errors introduced
- Type safety maintained
- All imports resolve correctly
```

## LSP Usage Patterns

### Code Reading Operations
```
REQUIRED PATTERN:
1. getDiagnostics(target_files) → Check file health
2. readFile/readMultipleFiles → Get content
3. Analyze LSP context → Understand symbols/types
4. Report enhanced understanding → Include LSP insights
```

### Code Editing Operations
```
REQUIRED PATTERN:
1. getDiagnostics(target_files) → Pre-edit validation
2. Perform code changes → Make modifications
3. getDiagnostics(modified_files) → Post-edit validation
4. Report results → Include LSP status and any issues
```

### Refactoring Operations
```
REQUIRED PATTERN:
1. getDiagnostics(all_affected_files) → Pre-refactor check
2. Plan refactoring → Use LSP context for safety
3. Execute changes → Implement modifications
4. getDiagnostics(all_affected_files) → Post-refactor validation
5. Verify references → Ensure all connections maintained
```

## Error Handling Procedures

### LSP Not Available
```
IF LSP is not responding:
1. Report LSP unavailability to user
2. Suggest LSP configuration fixes
3. DO NOT proceed with code operations
4. Escalate to user for manual intervention
```

### Critical Errors Found
```
IF critical errors detected:
1. List all critical errors clearly
2. Explain impact on code operations
3. Provide specific fix recommendations
4. BLOCK further operations until resolved
```

### Type Safety Violations
```
IF type errors introduced:
1. Report specific type violations
2. Show affected code locations
3. Suggest type-safe alternatives
4. Require fixes before proceeding
```

## Quality Gates for Operations

### Task Execution Quality Gates
- [ ] Pre-task LSP health check passed
- [ ] All code changes validated with LSP
- [ ] No new critical errors introduced
- [ ] Type safety maintained throughout
- [ ] All imports and references resolve
- [ ] Post-task LSP validation passed

### Spec Workflow Quality Gates
- [ ] Requirements: LSP analysis of existing codebase
- [ ] Design: Type-aware architecture decisions
- [ ] Tasks: LSP-informed implementation planning
- [ ] Execution: LSP validation at each task step

### Code Review Quality Gates
- [ ] Pre-review LSP diagnostic check
- [ ] Changes don't break existing functionality
- [ ] New code follows type safety standards
- [ ] All dependencies properly resolved

## Escalation Protocols

### Level 1: Automatic Recovery
```
FOR minor LSP warnings:
- Report warnings to user
- Continue with operation
- Include warnings in final report
```

### Level 2: User Intervention Required
```
FOR critical LSP errors:
- STOP operation immediately
- Report detailed error information
- Provide fix suggestions
- Wait for user resolution
```

### Level 3: Configuration Issues
```
FOR LSP configuration problems:
- Report configuration issues
- Suggest specific fixes
- Provide setup instructions
- Escalate to user for manual setup
```

## Reporting Requirements

### LSP Status Reporting (MANDATORY)
Every code operation response MUST include:
```
## LSP Status Report
- **Pre-operation diagnostics**: [PASSED/FAILED/WARNINGS]
- **LSP availability**: [ACTIVE/INACTIVE/PARTIAL]
- **Critical errors**: [NONE/LIST_ERRORS]
- **Post-operation validation**: [PASSED/FAILED/WARNINGS]
- **Type safety**: [MAINTAINED/VIOLATED]
```

### Error Reporting Format
```
## LSP Errors Detected
- **File**: [filename]
- **Line**: [line_number]
- **Error**: [error_message]
- **Severity**: [ERROR/WARNING/INFO]
- **Fix Suggestion**: [recommended_action]
```

## Tool Usage Enforcement

### ALWAYS Use These Tools
- `getDiagnostics` - Before and after code operations
- Enhanced code reading with LSP context
- Type-aware code generation
- Safe refactoring with LSP guidance

### NEVER Do These Without LSP
- Raw file editing without diagnostic checks
- Symbol renaming without LSP rename functionality
- Import changes without resolution validation
- Type modifications without safety checks

## Integration with Existing Workflows

### Spec Task Execution
- Every task MUST start with LSP health check
- Task completion requires LSP validation
- Task status updates include LSP status

### Code Generation
- All generated code MUST pass LSP validation
- Type definitions MUST be LSP-verified
- Imports MUST resolve correctly

### Bug Fixes
- Root cause analysis MUST include LSP diagnostics
- Fixes MUST be validated with LSP
- Resolution MUST not introduce new LSP errors

---

**REMEMBER: LSP usage is not optional. It is a mandatory requirement for all code operations in this workspace.**