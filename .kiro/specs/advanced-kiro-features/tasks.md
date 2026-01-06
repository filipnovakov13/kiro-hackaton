# Implementation Plan: Advanced Kiro Features for Iubar

## Overview

This plan implements the advanced Kiro IDE features in phases: hooks first, then MCP servers, then specialized agents, and finally LSP configuration. Each phase builds on the previous and includes validation tests.

## Tasks

- [x] 1. Set up Kiro configuration structure
  - Create `.kiro/hooks/` directory for hook configurations
  - Create `.kiro/agents/` directory for agent configurations
  - Create `.kiro/scripts/` directory for helper scripts
  - Verify `.kiro/settings/` exists for MCP configuration
  - _Requirements: 1.1, 2.1, 3.1, 6.1, 7.1, 8.1, 9.1_

- [x] 2. Implement Code Formatting Hooks
  - [x] 2.1 Create format-on-save hook configuration
    - Create `.kiro/hooks/format-on-save.json` with Python/TypeScript patterns
    - Configure Black for `backend/**/*.py` files
    - Configure Prettier for `frontend/**/*.{ts,tsx}` files
    - Set 2-second timeout and error notification behavior
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x]* 2.2 Write property test for format hook patterns

    - **Property 1: Format-on-Save Hook Execution**
    - **Validates: Requirements 1.1, 1.2**

- [x] 3. Implement PR Automation Hook
  - [x] 3.1 Create PR automation hook configuration
    - Create `.kiro/hooks/create-pr.json` with test and PR steps
    - Configure pytest execution for backend tests
    - Configure Jest execution for frontend tests
    - Set up branch naming with `feature/{feature-name}` pattern
    - Configure PR body template with summary, test results, requirements
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 3.2 Create PR automation prompt
    - Create `.kiro/prompts/create-pr.md` for manual PR trigger
    - Include instructions for feature name input and test validation
    - Add DEVLOG update step on success
    - _Requirements: 2.1, 2.5_

  - [x]* 3.3 Write property tests for PR hook

    - **Property 2: PR Branch Naming Convention**
    - **Property 3: PR Body Completeness**
    - **Property 4: PR Test Enforcement**
    - **Validates: Requirements 2.2, 2.3, 2.6**

- [x] 4. Checkpoint - Verify hooks configuration
  - Ensure hook JSON files are valid
  - Test format-on-save manually with a Python and TypeScript file
  - Ask the user if questions arise

- [x] 5. Configure MCP Servers
  - [x] 5.1 Update MCP configuration with AWS docs server
    - Update `.kiro/settings/mcp.json` with aws-docs server
    - Configure uvx command with awslabs.aws-documentation-mcp-server
    - Set FASTMCP_LOG_LEVEL to ERROR
    - Add autoApprove for search_documentation
    - _Requirements: 3.1, 3.2_

  - [x] 5.2 Create MCP dependency check script
    - Create `.kiro/scripts/check-mcp-deps.ps1` for Windows
    - Check if uvx is available
    - Display installation instructions if missing
    - _Requirements: 3.3_

- [x] 6. Implement Specialized Agents
  - [x] 6.1 Create Backend Specialist Agent
    - Create `.kiro/agents/backend-agent.json`
    - Configure read/write access to `backend/` directory
    - Add `backend/app/` and `tech.md` as resources
    - Write prompt with FastAPI, SQLAlchemy, Chroma, LlamaIndex expertise
    - Restrict shell to pytest and pip commands
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 6.2 Create Frontend Specialist Agent
    - Create `.kiro/agents/frontend-agent.json`
    - Configure read/write access to `frontend/` directory
    - Add `frontend/src/` and `tech.md` as resources
    - Write prompt with React 18, TypeScript, Vite, accessibility expertise
    - Restrict shell to npm, jest, and playwright commands
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 6.3 Create Code Review Agent
    - Create `.kiro/agents/review-agent.json`
    - Configure read-only access to entire codebase
    - Add `tech.md` and `structure.md` as resources
    - Write prompt focusing on security, performance, standards
    - Ensure NO write or shell access
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 6.4 Create UX Validation Agent
    - Create `.kiro/agents/ux-agent.json`
    - Configure read access to `frontend/` and shell for Playwright
    - Add `frontend/src/` and `product.md` as resources
    - Write prompt for visual inspection, accessibility, user flows
    - Allow npm run dev and npx playwright commands
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ]* 6.5 Write property tests for agent configurations

    - **Property 5: Agent Permission Boundaries**
    - **Property 6: Agent Prompt Expertise Keywords**
    - **Property 7: Agent Resource Inclusion**
    - **Validates: Requirements 6.1-6.4, 7.1-7.4, 8.1-8.4, 9.1, 9.7**

- [x] 7. Checkpoint - Verify agents configuration
  - Ensure all agent JSON files are valid
  - Test switching between agents
  - Ask the user if questions arise

- [x] 8. Configure LSP Settings
  - [x] 8.1 Configure Python LSP (Pylance)
    - Update `.vscode/settings.json` with Python LSP settings
    - Set Pylance as language server
    - Configure virtual environment path to `backend/.venv`
    - Enable type checking mode and auto-import completions
    - Configure Black as formatter with format-on-save
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 8.2 Configure TypeScript LSP
    - Update `.vscode/settings.json` with TypeScript settings
    - Point to frontend's TypeScript installation
    - Configure Prettier as formatter for TS/TSX files
    - Enable format-on-save for TypeScript files
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 8.3 Verify/Update TypeScript configuration
    - Ensure `frontend/tsconfig.json` has strict mode enabled
    - Configure path aliases for clean imports
    - Set appropriate compiler options for React 18
    - _Requirements: 5.1, 5.3_

- [x] 9. Create UX Validation Test Infrastructure
  - [x] 9.1 Set up Playwright for UX testing
    - Create `frontend/tests/ux-validation.spec.ts`
    - Add screenshot capture test
    - Add basic accessibility check structure
    - Configure test to work with dev server
    - _Requirements: 9.2, 9.3, 9.4, 9.5_

- [x] 10. Final Checkpoint - Complete validation
  - Run all property tests
  - Verify all configurations load without errors
  - Test each agent can be activated
  - Ensure all tests pass, ask the user if questions arise

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate configuration correctness
- All configurations use JSON format compatible with Kiro IDE
