# Requirements Document

## Introduction

This specification defines the configuration and setup of advanced Kiro IDE features for the Iubar project. The focus is on creating concrete, actionable configurations for hooks, MCP servers, LSP, and specialized agents - not restating coding standards already defined in steering files.

## Glossary

- **Hook**: An automated action triggered by specific IDE events (file save, session start, agent completion)
- **MCP_Server**: A Model Context Protocol server that extends Kiro's capabilities with external tools
- **LSP**: Language Server Protocol providing code intelligence (autocomplete, diagnostics, go-to-definition)
- **Agent**: A specialized AI assistant configured with specific tools, context, and instructions

## Requirements

### Requirement 1: Code Formatting Hooks

**User Story:** As a developer, I want code to be automatically formatted on save, so that I maintain consistent style without manual intervention.

#### Acceptance Criteria

1. WHEN a Python file in the backend/ directory is saved, THE Hook SHALL execute Black formatter on that file
2. WHEN a TypeScript file in the frontend/ directory is saved, THE Hook SHALL execute Prettier on that file
3. IF the formatter is not installed, THEN THE Hook SHALL display an error message with installation instructions
4. THE Hook SHALL complete formatting within 2 seconds for files under 1000 lines

### Requirement 2: Git Pull Request Automation Hook

**User Story:** As a developer, I want automated pull request creation when a feature is complete, so that my code is properly reviewed with validated tests before merging.

#### Acceptance Criteria

1. WHEN a feature implementation is marked complete, THE PR_Hook SHALL run all relevant tests (pytest for backend, Jest for frontend)
2. WHEN all tests pass, THE PR_Hook SHALL create a new git branch following the naming convention `feature/{feature-name}`
3. WHEN creating a pull request, THE PR_Hook SHALL include a summary of changes, test results, and linked requirements
4. IF any test fails, THEN THE PR_Hook SHALL halt PR creation and display failing test details with suggestions
5. WHEN the PR is created, THE PR_Hook SHALL update the DEVLOG with the PR link and feature summary
6. THE PR_Hook SHALL enforce that no PR can be created without at least one passing test per modified module

### Requirement 3: AWS Documentation MCP Server

**User Story:** As a developer, I want to query AWS documentation directly from Kiro, so that I can get accurate service information without leaving the IDE.

#### Acceptance Criteria

1. THE MCP_Configuration SHALL include the aws-docs server using uvx with awslabs.aws-documentation-mcp-server
2. WHEN the aws-docs server is configured, THE System SHALL be able to search AWS documentation for services like S3, Lambda, and Bedrock
3. IF uvx is not installed, THEN THE Configuration SHALL include instructions for installing uv package manager

### Requirement 4: Python Development Environment

**User Story:** As a backend developer, I want LSP support for my Python environment, so that I get accurate autocomplete and type checking.

#### Acceptance Criteria

1. THE LSP_Configuration SHALL use Pylance or Pyright as the Python language server
2. WHEN a virtual environment exists at backend/.venv, THE LSP SHALL use that environment for package resolution
3. THE LSP SHALL provide autocomplete for FastAPI route decorators, SQLAlchemy models, and LlamaIndex classes
4. WHEN type errors exist, THE LSP SHALL display them inline with severity indicators

### Requirement 5: TypeScript Development Environment

**User Story:** As a frontend developer, I want LSP support for TypeScript and React, so that I get accurate type checking and JSX support.

#### Acceptance Criteria

1. THE LSP_Configuration SHALL use the TypeScript language server with strict mode enabled
2. WHEN editing TSX files, THE LSP SHALL provide React component prop validation
3. THE LSP SHALL respect the tsconfig.json in the frontend/ directory
4. WHEN importing from node_modules, THE LSP SHALL provide auto-import suggestions

### Requirement 6: Backend Specialist Agent

**User Story:** As a developer, I want a specialized agent for backend work, so that I get focused assistance with FastAPI, databases, and RAG implementation.

#### Acceptance Criteria

1. THE Backend_Agent SHALL have access to read and write tools for the backend/ directory
2. THE Backend_Agent SHALL include backend/app/ as a resource for context
3. THE Backend_Agent prompt SHALL specify expertise in FastAPI, SQLAlchemy, Chroma, and LlamaIndex
4. THE Backend_Agent SHALL have shell access restricted to pytest and pip commands

### Requirement 7: Frontend Specialist Agent

**User Story:** As a developer, I want a specialized agent for frontend work, so that I get focused assistance with React, TypeScript, and Vite.

#### Acceptance Criteria

1. THE Frontend_Agent SHALL have access to read and write tools for the frontend/ directory
2. THE Frontend_Agent SHALL include frontend/src/ as a resource for context
3. THE Frontend_Agent prompt SHALL specify expertise in React 18, TypeScript, Vite, and accessibility
4. THE Frontend_Agent SHALL have shell access restricted to npm and jest commands

### Requirement 8: Code Review Agent

**User Story:** As a developer, I want a code review agent, so that I can get security and quality feedback before committing.

#### Acceptance Criteria

1. THE Review_Agent SHALL have read-only access to the entire codebase
2. THE Review_Agent prompt SHALL focus on security vulnerabilities, performance issues, and adherence to project standards
3. THE Review_Agent SHALL reference the coding standards in tech.md when reviewing
4. THE Review_Agent SHALL NOT have write or shell access


### Requirement 9: UX Validation Agent

**User Story:** As a developer, I want an agent that can visually inspect frontend components in a browser, so that I can verify UI changes match requirements and maintain usability standards.

#### Acceptance Criteria

1. THE UX_Agent SHALL have access to a browser automation tool (Playwright or Puppeteer) for visual inspection
2. WHEN a frontend component is modified, THE UX_Agent SHALL be able to launch the dev server and navigate to the component
3. THE UX_Agent SHALL capture screenshots of components and compare them against requirements descriptions
4. WHEN reviewing a component, THE UX_Agent SHALL check for accessibility compliance (WCAG guidelines)
5. THE UX_Agent SHALL verify that interactive elements (buttons, forms, links) are functional and responsive
6. IF a usability issue is detected, THEN THE UX_Agent SHALL provide specific feedback with suggested fixes
7. THE UX_Agent SHALL reference the product.md user journey when evaluating user experience flows
