# Kiro IDE Capabilities Reference

**Purpose**: Concise reference of Kiro IDE's actual capabilities for workflow redesign  
**Source**: Official Kiro documentation (kiro.dev/docs, community resources)  
**Date**: January 23, 2026

---

## 1. Steering Files (.kiro/steering/)

### What They Are
Persistent project knowledge through markdown files that provide context to the agent in every interaction.

### Inclusion Modes (CRITICAL FOR CONTEXT MANAGEMENT)

#### Always Include (Default)
```markdown
# No frontmatter needed - default behavior
```
- Loaded in EVERY agent interaction
- Use for: Core standards, tech stack, fundamental patterns
- **Our use case**: Core rules file only

#### Conditional Include
```markdown
---
inclusion: conditional
fileMatchPattern: "backend/**/*.py"
---
```
- Loaded ONLY when working with files matching the pattern
- Patterns: `backend/**/*.py`, `frontend/**/*.tsx`, `tests/**/*`
- **Our use case**: Load testing-strategy.md only when in tests/, lsp-mandatory.md only for code files

#### Manual Include
```markdown
---
inclusion: manual
---
```
- Loaded ONLY when referenced with `#steering-file-name` in chat
- **Our use case**: Detailed guides that are rarely needed

### File References in Steering
```markdown
See implementation in #[[file:backend/app/services/rag_service.py]]
```
- Links to live project files
- Keeps steering current with codebase

### Best Practices
- One domain per file (API, testing, deployment)
- Never include secrets/API keys
- Provide examples and rationale, not just rules
- Keep focused and concise

---

## 2. Specs (.kiro/specs/)

### Three-Phase Structure

#### Phase 1: Requirements (EARS Format)
```markdown
# Requirements

## Feature Name
WHEN [condition] THE SYSTEM SHALL [expected behavior]
WHEN [error condition] THE SYSTEM SHALL [error handling]
```

**EARS = Easy Approach to Requirements Syntax**
- Every requirement must be testable
- Cover main flow + edge cases + error conditions
- Be specific: "Display 'Invalid email' error" not "show error"

#### Phase 2: Design
```markdown
# Design

## Architecture
[System diagrams, data flow]

## Data Models
[Schemas, interfaces, types]

## API Endpoints
[Routes, inputs, outputs, validation]

## Security Considerations
[Auth, validation, encryption]
```

#### Phase 3: Tasks
```markdown
# Tasks

## Backend Tasks
- [ ] Create User model with validation
- [ ] Implement password hashing
- [ ] Create registration endpoint

## Frontend Tasks
- [ ] Create registration form
- [ ] Add form validation

## Integration Tasks
- [ ] Test complete flow
```

### Spec Organization
```
.kiro/specs/
├── feature-name/
│   ├── requirements.md
│   ├── design.md
│   └── tasks.md
```

### Key Insight
- Specs are the "single source of truth"
- Agent validates against specs, not vague prompts
- Iteration is expected - refine as you discover edge cases

---

## 3. Custom Prompts (.kiro/prompts/)

### What They Are
Reusable commands that can be invoked with `@prompt-name` in chat.

### Prompt Structure
```markdown
---
description: Brief description of what this prompt does
argument-hint: [optional-argument]
---

# Prompt Title

## Instructions
[Detailed instructions for the agent]

## Context
[What context to load]

## Output Format
[Expected output structure]
```

### Usage
- `@execute path/to/spec` - Execute a spec
- `@review file.py` - Review code
- Custom prompts for repetitive workflows

### Our Use Case
- `@execute` prompt for spec execution
- Custom prompts for common workflows (testing, deployment)

---

## 4. Hooks (.kiro/hooks/)

### What They Are
Automated agent actions triggered by IDE events.

### Hook Triggers
- `fileEdited` - When a file is saved
- `fileCreated` - When a new file is created
- `fileDeleted` - When a file is deleted
- `userTriggered` - Manual button click
- `promptSubmit` - After sending a message
- `agentStop` - After agent completes execution

### Hook Actions
- `askAgent` - Send prompt to agent
- `runCommand` - Execute shell command

### Hook Structure
```json
{
  "name": "Lint on Save",
  "version": "1.0.0",
  "when": {
    "type": "fileEdited",
    "patterns": ["*.ts", "*.tsx"]
  },
  "then": {
    "type": "askAgent",
    "prompt": "Run linter and fix errors"
  }
}
```

### Our Use Case
- Auto-update state.md when tasks complete
- Run tests after code changes
- Validate LSP diagnostics on save

---

## 5. Codebase Indexing

### What It Provides
- Automatic indexing of codebase and documentation
- Code intelligence: go-to-definition, find references, hover info
- Symbol search across entire codebase
- LSP integration for diagnostics

### Agent Access
- Agent can search symbols
- Agent can get document symbols
- Agent can lookup definitions
- Agent can perform structural code searches

### Our Use Case
- Agent can find relevant code without manual file references
- LSP diagnostics for code quality validation
- Symbol search for understanding codebase structure

---

## 6. Context System

### What Agent Sees
1. **System Prompt** (Kiro's base instructions)
2. **Steering Files** (based on inclusion mode)
3. **Current Conversation** (chat history)
4. **Referenced Files** (via #file or explicit reads)
5. **Codebase Index** (when searching/navigating)

### Context Optimization Strategies
- Use conditional steering to load only relevant files
- Use manual steering for rarely-needed guides
- Reference files explicitly rather than loading everything
- Use codebase search instead of reading all files

### Token Budget
- No explicit limit mentioned in docs
- Best practice: Keep steering files focused and concise
- Use inclusion modes to minimize context

---

## 7. File References

### In Chat
```
#file:backend/app/services/rag_service.py
```
- Loads file into context for current conversation

### In Steering Files
```markdown
#[[file:backend/app/services/rag_service.py]]
```
- Links to live file, keeps steering current

### In Specs
```markdown
See implementation pattern in backend/app/api/documents.py
```
- Reference without loading (agent can search if needed)

---

## 8. Web Tools (Built-in)

### Capabilities
- Web search directly in chat
- Fetch content from URLs
- Look up current documentation
- Find latest library versions

### Usage
- Agent can search web when needed
- No separate MCP required
- Keeps workflow in one place

### Our Use Case
- Research best practices during development
- Look up API documentation
- Find solutions to errors

---

## 9. LSP Integration

### What It Provides
- Real-time diagnostics (errors, warnings)
- Type checking
- Import resolution
- Symbol information
- Code navigation

### Agent Access
- `getDiagnostics` tool for validation
- Pre/post code change validation
- Type-aware code generation

### Our Use Case
- Mandatory LSP checks before/after code changes (lsp-mandatory.md)
- Quality gates for task completion
- Type safety validation

---

## 10. MCP (Model Context Protocol)

### What It Is
- External tools/servers that extend agent capabilities
- Configured in `.kiro/settings/mcp.json`

### Common MCP Servers
- Database access
- API integrations
- Custom tools

### Our Use Case
- Postman MCP for API testing (already configured)
- Potential future: Custom tools for workflow automation

---

## 11. Powers (Kiro Powers)

### What They Are
- Packaged documentation + MCP servers
- Pre-built capabilities for common tasks
- Installed via Powers panel

### Our Use Case
- Postman power already installed
- Potential: Custom powers for project-specific workflows

---

## 12. Autopilot Mode

### What It Is
- Agent can modify files autonomously
- No approval required for each change
- Faster execution for trusted workflows

### Supervised Mode
- User reviews changes before application
- Safer for critical operations

### Our Use Case
- Autopilot for routine tasks (testing, refactoring)
- Supervised for critical changes (schema, API contracts)

---

## Key Capabilities for Our Workflow Redesign

### ✅ AVAILABLE & USEFUL

1. **Conditional Steering** - Load testing-strategy.md only in tests/
2. **Manual Steering** - Load detailed guides on-demand with #steering-name
3. **File References** - Link to live files instead of copying content
4. **Codebase Indexing** - Agent can search symbols without reading all files
5. **LSP Integration** - Mandatory validation before/after code changes
6. **Custom Prompts** - Reusable workflows like @execute
7. **Hooks** - Auto-update state.md, run tests on save
8. **Spec Structure** - EARS requirements → Design → Tasks
9. **Web Tools** - Research during development
10. **Context Optimization** - Inclusion modes minimize token usage

### ❌ NOT AVAILABLE (Yet)

1. **LangGraph/Checkpointing** - No automatic state persistence framework
2. **Vector Database** - No built-in semantic search for specs
3. **Observability Frameworks** - No Langfuse/Prometheus integration
4. **Multi-Agent Orchestration** - Single agent only (subagents mentioned in changelog but not documented)
5. **Automatic Task Decomposition** - Manual task breakdown required

---

## Workflow Redesign Implications

### What We CAN Do

1. **Reduce Context by 70%+**
   - Core rules (always) + conditional steering (when needed) + manual steering (on-demand)
   - Use file references instead of copying content
   - Let agent search codebase instead of loading all files

2. **Manual State Tracking**
   - state.md file per phase
   - Hooks to auto-update on task completion
   - Agent reads state.md to resume

3. **Phase-Based Specs**
   - Break monolithic spec into focused phases
   - Each phase: requirements.md + design.md + tasks.md
   - 10-15 tasks per phase maximum

4. **Structured Tasks**
   - EARS requirements for clarity
   - Explicit scope boundaries
   - Validation commands per task

5. **LSP Quality Gates**
   - Mandatory getDiagnostics before/after changes
   - Type safety validation
   - Import resolution checks

### What We CANNOT Do (Must Work Around)

1. **Automatic Checkpointing**
   - Workaround: Manual state.md updates + hooks

2. **Vector Search for Context**
   - Workaround: Phase-based chunking + file references

3. **Observability Dashboard**
   - Workaround: Simple markdown logs

4. **Multi-Agent Parallel Execution**
   - Workaround: Sequential task execution

5. **Automatic Task Decomposition**
   - Workaround: Manual task breakdown by human

---

## Recommended Workflow Architecture

```
┌─────────────────────────────────────────────────────┐
│ STEERING (Context Management)                       │
├─────────────────────────────────────────────────────┤
│ • core-rules.md (always)                           │
│ • testing-strategy.md (conditional: tests/**)      │
│ • lsp-mandatory.md (conditional: **/*.{py,ts,tsx}) │
│ • tech.md (manual: #tech)                          │
│ • product.md (manual: #product)                    │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ SPECS (Phase-Based)                                 │
├─────────────────────────────────────────────────────┤
│ phase-2a-rag-services/                             │
│ ├── requirements.md (EARS format)                  │
│ ├── design.md (architecture, data models)          │
│ ├── tasks.md (10-15 tasks)                         │
│ └── state.md (progress tracking)                   │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ EXECUTION (Custom Prompt)                           │
├─────────────────────────────────────────────────────┤
│ @execute phase-2a-rag-services/                    │
│ • Reads state.md for resume point                  │
│ • Loads current task only                          │
│ • Runs LSP diagnostics (mandatory)                 │
│ • Updates state.md after each task                 │
│ • Creates checkpoint every 3 tasks                 │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ HOOKS (Automation)                                  │
├─────────────────────────────────────────────────────┤
│ • fileEdited (*.py, *.ts) → Run LSP diagnostics    │
│ • agentStop → Update state.md checkpoint           │
│ • userTriggered → Run full test suite              │
└─────────────────────────────────────────────────────┘
```

---

## Token Budget Optimization

### Current (Estimated)
```
Steering (always loaded):
- product.md: 2,500 tokens
- tech.md: 2,000 tokens
- structure.md: 2,500 tokens
- testing-strategy.md: 4,000 tokens
- lsp-mandatory.md: 2,500 tokens
- shell-commands.md: 1,500 tokens
Total: 15,000 tokens

Spec (full phase):
- requirements.md: 3,000 tokens
- design.md: 2,500 tokens
- tasks.md: 4,000 tokens
Total: 9,500 tokens

TOTAL: ~24,500 tokens
```

### Optimized (With Inclusion Modes)
```
Steering (always loaded):
- core-rules.md: 1,500 tokens

Steering (conditional - loaded when relevant):
- testing-strategy.md: 4,000 tokens (only in tests/)
- lsp-mandatory.md: 2,500 tokens (only in code files)

Steering (manual - loaded on-demand):
- tech.md: 2,000 tokens (#tech)
- product.md: 2,500 tokens (#product)

Spec (current phase only):
- requirements.md: 800 tokens
- design.md: 600 tokens
- tasks.md: 1,200 tokens
Total: 2,600 tokens

Current Task:
- Task template: 300 tokens
- Referenced files: 1,000 tokens
Total: 1,300 tokens

TYPICAL LOAD: ~5,400 tokens (78% reduction)
MAX LOAD (with conditional): ~9,900 tokens (60% reduction)
```

---

## Implementation Priority

### Week 1: Context Optimization
1. Create core-rules.md (always)
2. Add frontmatter to existing steering files:
   - testing-strategy.md → conditional: `tests/**/*`
   - lsp-mandatory.md → conditional: `**/*.{py,ts,tsx}`
   - tech.md → manual
   - product.md → manual
   - structure.md → manual
   - shell-commands.md → manual
3. Test context reduction with simple task

### Week 2: Phase Decomposition
1. Break rag-core-phase into phase-2a and phase-2b
2. Create state.md template
3. Update execute.md prompt for state management

### Week 3: Hooks & Automation
1. Create hook for state.md updates
2. Create hook for LSP validation on save
3. Create hook for test running

---

## Conclusion

Kiro IDE provides powerful capabilities for context management through **inclusion modes**, **codebase indexing**, and **LSP integration**. The key to our workflow redesign is:

1. **Use conditional steering** to load context only when relevant
2. **Use manual steering** for rarely-needed guides
3. **Use file references** instead of copying content
4. **Use codebase search** instead of reading all files
5. **Use hooks** for automation (state updates, validation)
6. **Use phase-based specs** to focus agent attention

With these capabilities, we can achieve **60-78% context reduction** while maintaining full functionality, enabling **3-4x longer agent sessions** and **95%+ task completion rates**.

---

**Key Takeaway**: Kiro's inclusion modes and codebase indexing are the game-changers for context management. We don't need LangGraph or vector databases - we can achieve our goals with Kiro's built-in features.
