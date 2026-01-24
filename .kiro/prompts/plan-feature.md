---
description: "Create comprehensive feature plan with complexity scoring and codebase analysis"
---

# Plan a new task

## Feature: $ARGUMENTS

## Mission

Transform feature request into **comprehensive implementation plan** through systematic codebase analysis, external research, and complexity scoring.

**Core Principle**: Planning only - no code. Create context-rich plan enabling one-pass implementation.

**Philosophy**: Context is King. Plan must contain ALL information needed - patterns, docs, validation commands, complexity scores.

## Critical Constraints

- DO NOT write implementation code - planning only
- DO NOT assume unclear requirements - ASK user
- DO NOT skip codebase analysis or complexity scoring
- Plan must enable one-pass implementation

## When to Ask

Ask user if:
- Feature scope ambiguous or multiple interpretations
- Multiple architectural approaches with significant trade-offs
- Security implications unclear or potentially significant
- Performance requirements unspecified but likely important
- Feature conflicts with existing patterns

## Forbidden

- Plans requiring additional research during execution
- Vague tasks like "implement the feature"
- Missing validation commands
- No codebase pattern references
- No complexity scores

## Planning Process

### Phase 1: Feature Understanding

**Deep Analysis:**
- Extract core problem and user value
- Feature type: New/Enhancement/Refactor/Bug Fix
- Map affected systems and components

**User Story (create or refine):**
```
As a <user type>
I want to <action>
So that <benefit>
```

### Phase 2: Complexity Scoring

**Score using deterministic rules (pick HIGHEST):**

1. **Scope** (Files/modules):
   - 1 = Single file
   - 2 = Single module
   - 3 = 2-3 modules
   - 4 = 3-5 modules
   - 5 = 5+ modules

2. **Dependencies**:
   - 1 = None
   - 2 = 1 internal
   - 3 = 2-3 dependencies
   - 4 = 3-5 OR 1 external API
   - 5 = 5+ OR multiple APIs OR migration

3. **Data Persistence**:
   - 1 = No changes
   - 2 = Query changes only
   - 3 = 1-2 schema changes
   - 4 = Multiple OR migration
   - 5 = Breaking changes OR backfill

4. **Testing**:
   - 1 = None or trivial (<10 cases)
   - 2 = Basic (10-30 cases)
   - 3 = Integration (30-100 cases)
   - 4 = Complex + E2E (100+ cases)
   - 5 = Multiple suites + security + performance

5. **Uncertainty**:
   - 1 = Crystal clear
   - 2 = 1-2 unknowns
   - 3 = 3-4 unknowns
   - 4 = 5+ OR needs POC
   - 5 = Research required

**Final Complexity = MAX(all 5 rules)**

**Duration Estimates:**
- 1 (Trivial): < 30 min
- 2 (Simple): 30 min - 1.5 hrs
- 3 (Moderate): 1.5 - 4 hrs
- 4 (Complex): 4 - 12 hrs
- 5 (Very Complex): 1+ days

### Phase 3: Codebase Intelligence

**Use subagents for parallel analysis:**

1. **Project Structure**
   - Languages, frameworks, versions
   - Directory structure, architectural patterns
   - Service boundaries, integration points
   - Config files, build processes

2. **Pattern Recognition**
   - Similar implementations
   - Coding conventions (naming, organization, error handling, logging)
   - Domain patterns
   - Anti-patterns to avoid
   - Project-specific rules in steering docs

3. **Dependency Analysis**
   - External libraries relevant to feature
   - Integration patterns (imports, configs)
   - Documentation in docs/, ai_docs/, .agents/reference
   - Versions and compatibility

4. **Testing Patterns**
   - Framework and structure
   - Similar test examples
   - Organization (unit vs integration)
   - Coverage requirements

5. **Integration Points**
   - Files to update
   - Files to create and locations
   - Router/API registration patterns
   - Database/model patterns
   - Auth/authorization patterns

**Clarify ambiguities before continuing.**

### Phase 4: External Research

**Use subagents for documentation:**
- Latest library versions and best practices
- Official docs with section anchors
- Implementation examples and tutorials
- Common gotchas and known issues
- Breaking changes and migration guides
- Current best practices
- Performance optimization patterns
- Security considerations

**Compile references:**
```markdown
## Relevant Documentation
- [Library Docs](url#section) - Why: Needed for X
- [Framework Guide](url#integration) - Why: Shows Y pattern
```

### Phase 5: Strategic Thinking

**Consider:**
- Architectural fit
- Critical dependencies and order
- Edge cases, race conditions, errors
- Comprehensive testing approach
- Performance implications
- Security considerations
- Maintainability

**Design Decisions:**
- Choose approaches with clear rationale
- Design for extensibility
- Plan for backward compatibility
- Consider scalability

### Phase 6: Plan Generation

**Create plan with structure below.**

---

## PLAN TEMPLATE

```markdown
# Feature: <feature-name>

IMPORTANT: Validate docs, codebase patterns, and task sanity before implementing.
Pay attention to naming of existing utils, types, models. Import from correct files.

## Feature Description
<Detailed description, purpose, user value>

## User Story
As a <user type>
I want to <action>
So that <benefit>

## Problem Statement
<Specific problem or opportunity>

## Solution Statement
<Proposed solution and how it solves problem>

## Feature Metadata
**Type**: [New/Enhancement/Refactor/Bug Fix]
**Complexity Score**: [1-5] (see breakdown below)
**Duration Estimate**: [Based on complexity]
**Risk Level**: [Low/Medium/High/Very High]
**Primary Systems**: [Components/services]
**Dependencies**: [External libraries/services]

### Complexity Breakdown
- Scope: [X files/modules] → [1-5]
- Dependencies: [List] → [1-5]
- Data: [DB changes, type] → [1-5]
- Testing: [What's needed] → [1-5]
- Uncertainty: [Known unknowns] → [1-5]
**Final**: MAX(above) = **[1-5]**

---

## CONTEXT REFERENCES

### Relevant Codebase Files (READ BEFORE IMPLEMENTING!)
- `path/to/file.py` (lines 15-45) - Why: Pattern for X
- `path/to/model.py` (lines 100-120) - Why: DB model structure
- `path/to/test.py` - Why: Test pattern example

### New Files to Create
- `path/to/new_service.py` - Service for X
- `path/to/new_model.py` - Data model for Y
- `tests/path/to/test_new_service.py` - Unit tests

### Relevant Documentation (READ BEFORE IMPLEMENTING!)
- [Doc Link 1](url#section) - Section: Auth setup - Why: Secure endpoints
- [Doc Link 2](url#integration) - Section: DB integration - Why: Async patterns

### Patterns to Follow
<Specific patterns from codebase with code examples>

**Naming Conventions:**
**Error Handling:**
**Logging Pattern:**
**Other Patterns:**

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation
<Foundational work before main implementation>
**Tasks:**
- Set up base structures
- Configure dependencies
- Create utilities/helpers

### Phase 2: Core Implementation
<Main implementation work>
**Tasks:**
- Implement business logic
- Create service layer
- Add API endpoints
- Implement data models

### Phase 3: Integration
<Integration with existing functionality>
**Tasks:**
- Connect to routers/handlers
- Register components
- Update configs
- Add middleware/interceptors

### Phase 4: Testing & Validation
<Testing approach>
**Tasks:**
- Unit tests per component
- Integration tests for workflow
- Edge case tests
- Validate acceptance criteria

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute in order, top to bottom. Each task atomic and testable.

### Task Keywords:
- **CREATE**: New files/components
- **UPDATE**: Modify existing
- **ADD**: Insert new functionality
- **REMOVE**: Delete deprecated
- **REFACTOR**: Restructure without behavior change
- **MIRROR**: Copy pattern from elsewhere

### {ACTION} {target_file}
- **IMPLEMENT**: {Specific detail}
- **PATTERN**: {Reference - file:line}
- **IMPORTS**: {Required imports}
- **GOTCHA**: {Known issues to avoid}
- **VALIDATE**: `{executable command}`

<Continue with all tasks in dependency order...>

---

## TESTING STRATEGY

### Unit Tests
<Scope based on project standards>

### Integration Tests
<Scope based on project standards>

### Edge Cases
<Specific edge cases for this feature>

---

## VALIDATION COMMANDS

Execute every command for zero regressions and 100% correctness.

### Level 1: Syntax & Style
<Project-specific linting/formatting>

### Level 2: Unit Tests
<Project-specific unit test commands>

### Level 3: Integration Tests
<Project-specific integration test commands>

### Level 4: Manual Validation
<Feature-specific manual testing - API calls, UI testing>

### Level 5: Additional (Optional)
<MCP servers or additional CLI tools>

---

## ACCEPTANCE CRITERIA
- [ ] All functionality implemented
- [ ] All validation commands pass
- [ ] Unit test coverage meets requirements (80%+)
- [ ] Integration tests verify workflows
- [ ] Code follows project conventions
- [ ] No regressions
- [ ] Documentation updated (if applicable)
- [ ] Performance meets requirements (if applicable)
- [ ] Security addressed (if applicable)

---

## COMPLETION CHECKLIST
- [ ] All tasks completed in order
- [ ] Each task validation passed
- [ ] All validation commands successful
- [ ] Full test suite passes
- [ ] No linting/type errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria met
- [ ] Code reviewed for quality

---

## NOTES
<Additional context, design decisions, trade-offs>
```

---

## Output Format

**Filename**: `.agents/plans/{kebab-case-name}.md`
**Directory**: Create `.agents/plans/` if doesn't exist

Examples: `add-user-auth.md`, `implement-search-api.md`, `refactor-db-layer.md`

## Quality Criteria

### Context Completeness ✓
- [ ] All patterns identified and documented
- [ ] External library usage documented with links
- [ ] Integration points mapped
- [ ] Gotchas and anti-patterns captured
- [ ] Every task has validation command
- [ ] Complexity scored with breakdown

### Implementation Ready ✓
- [ ] Another dev could execute without additional context
- [ ] Tasks ordered by dependency
- [ ] Each task atomic and testable
- [ ] Pattern references include file:line

### Pattern Consistency ✓
- [ ] Tasks follow existing conventions
- [ ] New patterns justified
- [ ] No reinvention of existing patterns
- [ ] Testing matches project standards

### Information Density ✓
- [ ] No generic references (all specific)
- [ ] URLs include section anchors
- [ ] Task descriptions use codebase keywords
- [ ] Validation commands executable

## Success Metrics

**One-Pass Implementation**: Execution agent completes without additional research
**Validation Complete**: Every task has working validation command
**Context Rich**: Passes "No Prior Knowledge Test"
**Confidence Score**: X/10 for first-attempt success

## Report

After creating plan, provide:
- Summary of feature and approach
- Full path to plan file
- Complexity score and breakdown
- Duration estimate
- Key risks or considerations
- Confidence score for one-pass success