---
inclusion: always
---

# Core Development Rules

## Safety First (Priority 0)

1. **NEVER delete files without explicit permission**
2. **NEVER modify files outside current task scope**
3. **ALWAYS run getDiagnostics after code changes**
4. **ALWAYS update state.md after task completion**

## Instruction Priority (When Conflicts)

1. User direct command (this chat) → HIGHEST (THIS DOES NOT MEAN TO COMPLETELY GO IN THE OPPOSITE DIRECTION OF YOUR INITIAL PLAN, ASK CLARIFYING QUESTIONS IF UNSURE WHAT IS ASKED OF YOU)
2. Current phase spec (requirements/design/tasks)
3. Safety rules (above)
4. LSP diagnostics (type checking)
5. Detailed steering (load when needed)

## Quality Gates (Every Task)

Before marking complete:
- [ ] LSP diagnostics clean
- [ ] Tests passing (>80% coverage)
- [ ] Files modified in scope only
- [ ] state.md updated
- [ ] Commit message clear

## State Management Protocol

**BEFORE task**:
1. Read current phase state.md
2. Note current task number
3. Read task from tasks.md

**AFTER task**:
1. Update state.md with completion
2. Record duration, files, tests
3. Note any issues

## When Uncertain

1. Check current phase spec
2. Check detailed steering (if relevant)
3. Ask user (don't guess)
4. Document in state.md

## Detailed Guides (Load When Needed)

- Testing: #[[file:.kiro/steering/testing-strategy.md]] (when writing tests)
- LSP: #[[file:.kiro/steering/lsp-mandatory.md]] (when coding)
- Tech: #[[file:.kiro/steering/tech.md]] (when choosing libraries)
- Product: #[[file:.kiro/steering/product.md]] (when unclear on vision)
- Structure: #[[file:.kiro/steering/structure.md]] (when organizing code)
- Shell: #[[file:.kiro/steering/shell-commands.md]] (when running commands)
