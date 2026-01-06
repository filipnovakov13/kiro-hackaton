# Design Document: Advanced Kiro Features for Iubar

## Overview

This design specifies the configuration and implementation of advanced Kiro IDE features for the Iubar project. The solution encompasses three main areas:

1. **Hooks** - Automated workflows triggered by IDE events (code formatting, PR creation)
2. **MCP Servers** - External tool integrations for documentation access
3. **Specialized Agents** - Task-focused AI assistants with constrained permissions
4. **LSP Configuration** - Language server setup for Python and TypeScript

All configurations will be stored in the `.kiro/` directory structure, following Kiro's standard patterns.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Kiro IDE                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Hooks     │  │    MCP      │  │    Specialized Agents   │  │
│  │             │  │   Servers   │  │                         │  │
│  │ • Format    │  │             │  │ • Backend Agent         │  │
│  │ • PR Auto   │  │ • AWS Docs  │  │ • Frontend Agent        │  │
│  │             │  │             │  │ • Review Agent          │  │
│  │             │  │             │  │ • UX Agent              │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                 │
│  ┌──────▼────────────────▼─────────────────────▼─────────────┐  │
│  │                    LSP Integration                         │  │
│  │         Python (Pylance)  │  TypeScript (tsserver)         │  │
│  └────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                     Project Files                                │
│   backend/  │  frontend/  │  .kiro/  │  data/                   │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Hook System

#### 1.1 Code Formatting Hook

**Location:** `.kiro/hooks/format-on-save.json`

**Trigger:** `onFileSave` event

**Configuration:**
```json
{
  "name": "format-on-save",
  "trigger": "onFileSave",
  "conditions": [
    {
      "filePattern": "backend/**/*.py",
      "command": "black --quiet ${file}"
    },
    {
      "filePattern": "frontend/**/*.{ts,tsx}",
      "command": "npx prettier --write ${file}"
    }
  ],
  "timeout": 2000,
  "onError": "notify"
}
```

**Behavior:**
- Detects file type from path pattern
- Executes appropriate formatter
- Shows notification on failure with installation instructions

#### 1.2 PR Automation Hook

**Location:** `.kiro/hooks/create-pr.json`

**Trigger:** Manual invocation via prompt or agent completion

**Configuration:**
```json
{
  "name": "create-feature-pr",
  "trigger": "manual",
  "steps": [
    {
      "name": "run-backend-tests",
      "command": "cd backend && pytest --tb=short",
      "continueOnError": false
    },
    {
      "name": "run-frontend-tests", 
      "command": "cd frontend && npm test -- --run",
      "continueOnError": false
    },
    {
      "name": "create-branch",
      "command": "git checkout -b feature/${featureName}"
    },
    {
      "name": "commit-changes",
      "command": "git add -A && git commit -m \"feat: ${featureName}\""
    },
    {
      "name": "create-pr",
      "command": "gh pr create --title \"${featureName}\" --body \"${prBody}\""
    }
  ],
  "onSuccess": "updateDevlog",
  "onFailure": "showTestResults"
}
```

**PR Body Template:**
```markdown
## Summary
${featureSummary}

## Test Results
- Backend: ${backendTestResult}
- Frontend: ${frontendTestResult}

## Requirements
${linkedRequirements}

## Changes
${changesSummary}
```

### 2. MCP Server Configuration

**Location:** `.kiro/settings/mcp.json`

```json
{
  "mcpServers": {
    "aws-docs": {
      "command": "uvx",
      "args": ["awslabs.aws-documentation-mcp-server@latest"],
      "env": {
        "FASTMCP_LOG_LEVEL": "ERROR"
      },
      "disabled": false,
      "autoApprove": ["search_documentation"]
    }
  }
}
```

**Prerequisites Check Script:** `.kiro/scripts/check-mcp-deps.ps1`
```powershell
# Check if uvx is available
if (-not (Get-Command uvx -ErrorAction SilentlyContinue)) {
    Write-Host "uvx not found. Install uv first:"
    Write-Host "  pip install uv"
    Write-Host "  # or via installer: https://docs.astral.sh/uv/getting-started/installation/"
    exit 1
}
Write-Host "MCP dependencies OK"
```

### 3. Specialized Agents

#### 3.1 Backend Agent

**Location:** `.kiro/agents/backend-agent.json`

```json
{
  "name": "backend-specialist",
  "description": "Specialized agent for Python/FastAPI backend development",
  "prompt": "You are a backend development specialist for the Iubar project. You have deep expertise in:\n- FastAPI async patterns and route design\n- SQLAlchemy ORM and database modeling\n- Chroma vector store operations\n- LlamaIndex RAG pipelines\n\nFollow PEP 8, use type hints, and ensure all code is compatible with Python 3.11+. Reference the project's tech.md for coding standards.",
  "tools": ["read", "write", "shell"],
  "allowedTools": [
    "read:backend/**/*",
    "write:backend/**/*",
    "shell:pytest*",
    "shell:pip*"
  ],
  "resources": [
    "file://backend/app/**/*.py",
    "file://.kiro/steering/tech.md"
  ],
  "model": "claude-sonnet-4"
}
```

#### 3.2 Frontend Agent

**Location:** `.kiro/agents/frontend-agent.json`

```json
{
  "name": "frontend-specialist",
  "description": "Specialized agent for React/TypeScript frontend development",
  "prompt": "You are a frontend development specialist for the Iubar project. You have deep expertise in:\n- React 18 with hooks and functional components\n- TypeScript with strict type checking\n- Vite build tooling and HMR\n- Accessibility (WCAG 2.1 AA compliance)\n\nFollow the project's ESLint/Prettier configuration. All components must be accessible and responsive.",
  "tools": ["read", "write", "shell"],
  "allowedTools": [
    "read:frontend/**/*",
    "write:frontend/**/*",
    "shell:npm*",
    "shell:npx jest*",
    "shell:npx playwright*"
  ],
  "resources": [
    "file://frontend/src/**/*.{ts,tsx}",
    "file://.kiro/steering/tech.md"
  ],
  "model": "claude-sonnet-4"
}
```

#### 3.3 Code Review Agent

**Location:** `.kiro/agents/review-agent.json`

```json
{
  "name": "code-reviewer",
  "description": "Security and quality focused code review agent",
  "prompt": "You are a code review specialist. Focus on:\n- Security vulnerabilities (injection, XSS, auth issues)\n- Performance bottlenecks and optimization opportunities\n- Adherence to project coding standards in tech.md\n- Test coverage gaps\n- Accessibility compliance\n\nProvide specific, actionable feedback with code examples when suggesting improvements. Never make changes directly.",
  "tools": ["read"],
  "allowedTools": [
    "read:**/*"
  ],
  "resources": [
    "file://.kiro/steering/tech.md",
    "file://.kiro/steering/structure.md"
  ],
  "model": "claude-sonnet-4"
}
```

#### 3.4 UX Validation Agent

**Location:** `.kiro/agents/ux-agent.json`

```json
{
  "name": "ux-validator",
  "description": "UX validation agent with browser automation capabilities",
  "prompt": "You are a UX validation specialist. Your role is to:\n- Visually inspect frontend components using Playwright\n- Verify UI matches requirements and design specs\n- Check accessibility compliance (WCAG 2.1 AA)\n- Test interactive elements for proper functionality\n- Evaluate user flows against product.md journey\n\nCapture screenshots for documentation. Provide specific feedback with suggested fixes for any issues found.",
  "tools": ["read", "shell"],
  "allowedTools": [
    "read:frontend/**/*",
    "read:.kiro/steering/product.md",
    "shell:npx playwright*",
    "shell:npm run dev*"
  ],
  "resources": [
    "file://frontend/src/**/*.tsx",
    "file://.kiro/steering/product.md"
  ],
  "model": "claude-sonnet-4"
}
```

**Playwright Test Script:** `frontend/tests/ux-validation.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('UX Validation', () => {
  test('capture component screenshot', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.screenshot({ path: 'screenshots/homepage.png', fullPage: true });
  });

  test('check accessibility', async ({ page }) => {
    await page.goto('http://localhost:5173');
    // Accessibility checks via axe-core
    const accessibilityResults = await page.evaluate(() => {
      // axe-core integration
    });
  });
});
```

### 4. LSP Configuration

#### 4.1 Python LSP (Pylance)

**Location:** `.vscode/settings.json` (Kiro uses VS Code settings)

```json
{
  "python.languageServer": "Pylance",
  "python.analysis.typeCheckingMode": "basic",
  "python.defaultInterpreterPath": "${workspaceFolder}/backend/.venv/Scripts/python.exe",
  "python.analysis.extraPaths": ["${workspaceFolder}/backend"],
  "python.analysis.autoImportCompletions": true,
  "python.analysis.diagnosticMode": "workspace",
  "python.formatting.provider": "black",
  "[python]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "ms-python.black-formatter"
  }
}
```

#### 4.2 TypeScript LSP

**Location:** `.vscode/settings.json`

```json
{
  "typescript.tsdk": "frontend/node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.preferences.importModuleSpecifier": "relative",
  "[typescript]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

**TypeScript Config:** `frontend/tsconfig.json`
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## Data Models

### Hook Configuration Schema

```typescript
interface HookConfig {
  name: string;
  trigger: 'onFileSave' | 'onAgentComplete' | 'onSessionStart' | 'manual';
  conditions?: HookCondition[];
  steps?: HookStep[];
  timeout?: number;
  onError?: 'notify' | 'silent' | 'abort';
  onSuccess?: string;
  onFailure?: string;
}

interface HookCondition {
  filePattern: string;
  command: string;
}

interface HookStep {
  name: string;
  command: string;
  continueOnError?: boolean;
}
```

### Agent Configuration Schema

```typescript
interface AgentConfig {
  name: string;
  description: string;
  prompt: string;
  tools: ('read' | 'write' | 'shell' | 'web_search' | 'web_fetch')[];
  allowedTools: string[];
  resources: string[];
  model: string;
}
```

### MCP Server Configuration Schema

```typescript
interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  disabled?: boolean;
  autoApprove?: string[];
}
```
