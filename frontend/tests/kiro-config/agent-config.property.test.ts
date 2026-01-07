import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Property-Based Tests for Agent Configuration
 *
 * Feature: advanced-kiro-features
 * Property 5: Agent Permission Boundaries
 * Property 6: Agent Prompt Expertise Keywords
 * Property 7: Agent Resource Inclusion
 * Validates: Requirements 6.1-6.4, 7.1-7.4, 8.1-8.4, 9.1, 9.7
 */

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load all agent configurations
const agentConfigDir = path.resolve(__dirname, "../../../.kiro/agents");
const agentConfigs = {
  backend: JSON.parse(
    fs.readFileSync(path.join(agentConfigDir, "backend-agent.json"), "utf-8")
  ),
  frontend: JSON.parse(
    fs.readFileSync(path.join(agentConfigDir, "frontend-agent.json"), "utf-8")
  ),
  review: JSON.parse(
    fs.readFileSync(path.join(agentConfigDir, "review-agent.json"), "utf-8")
  ),
  ux: JSON.parse(
    fs.readFileSync(path.join(agentConfigDir, "ux-agent.json"), "utf-8")
  ),
};

// Helper function to check if a tool permission matches expected pattern
function checkToolPermission(
  permission: string,
  expectedPattern: RegExp
): boolean {
  return expectedPattern.test(permission);
}

// Helper function to check if prompt contains required keywords
function promptContainsKeywords(prompt: string, keywords: string[]): boolean {
  const lowerPrompt = prompt.toLowerCase();
  return keywords.every((keyword) =>
    lowerPrompt.includes(keyword.toLowerCase())
  );
}

// Helper function to check if resources include required patterns
function resourcesIncludePattern(
  resources: string[],
  pattern: RegExp
): boolean {
  return resources.some((resource) => pattern.test(resource));
}

// Arbitrary generators for testing
const pathArbitrary = fc.stringOf(
  fc.constantFrom(
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
    "/",
    "_",
    "-",
    "."
  ),
  { minLength: 1, maxLength: 50 }
);

const commandArbitrary = fc.stringOf(
  fc.constantFrom(
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
    "-",
    "_",
    " "
  ),
  { minLength: 1, maxLength: 30 }
);

describe("Agent Configuration Property Tests", () => {
  describe("Configuration Structure Validation", () => {
    it("should have all required agent configurations", () => {
      expect(agentConfigs.backend).toBeDefined();
      expect(agentConfigs.frontend).toBeDefined();
      expect(agentConfigs.review).toBeDefined();
      expect(agentConfigs.ux).toBeDefined();
    });

    it("should have valid JSON structure for all agents", () => {
      Object.values(agentConfigs).forEach((config) => {
        expect(config.name).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.prompt).toBeDefined();
        expect(config.tools).toBeDefined();
        expect(config.allowedTools).toBeDefined();
        expect(config.resources).toBeDefined();
        expect(config.model).toBeDefined();
      });
    });
  });

  describe("Property 5: Agent Permission Boundaries", () => {
    /**
     * Feature: advanced-kiro-features, Property 5: Agent Permission Boundaries
     * For any specialized agent configuration, the agent's allowedTools SHALL restrict
     * access to only the directories and commands specified in its requirements.
     * Validates: Requirements 6.1, 6.4, 7.1, 7.4, 8.1, 8.4, 9.1
     */

    describe("Backend Agent Permission Boundaries", () => {
      it("should restrict read/write access to backend directory only", () => {
        const backendConfig = agentConfigs.backend;
        const readWriteTools = backendConfig.allowedTools.filter(
          (tool: string) =>
            tool.startsWith("read:") || tool.startsWith("write:")
        );

        readWriteTools.forEach((tool: string) => {
          expect(tool).toMatch(/^(read|write):backend\/\*\*\/\*/);
        });
      });

      it("should restrict shell access to pytest and pip commands only", () => {
        const backendConfig = agentConfigs.backend;
        const shellTools = backendConfig.allowedTools.filter((tool: string) =>
          tool.startsWith("shell:")
        );

        shellTools.forEach((tool: string) => {
          expect(tool).toMatch(/^shell:(pytest|pip)\*/);
        });
      });

      it("should have backend directory access for any valid path", () => {
        fc.assert(
          fc.property(pathArbitrary, (subPath: string) => {
            const backendConfig = agentConfigs.backend;
            const hasBackendAccess = backendConfig.allowedTools.some(
              (tool: string) =>
                tool === "read:backend/**/*" || tool === "write:backend/**/*"
            );
            expect(hasBackendAccess).toBe(true);
            return true;
          }),
          { numRuns: 100 }
        );
      });
    });

    describe("Frontend Agent Permission Boundaries", () => {
      it("should restrict read/write access to frontend directory only", () => {
        const frontendConfig = agentConfigs.frontend;
        const readWriteTools = frontendConfig.allowedTools.filter(
          (tool: string) =>
            tool.startsWith("read:") || tool.startsWith("write:")
        );

        readWriteTools.forEach((tool: string) => {
          expect(tool).toMatch(/^(read|write):frontend\/\*\*\/\*/);
        });
      });

      it("should restrict shell access to npm, jest, and playwright commands only", () => {
        const frontendConfig = agentConfigs.frontend;
        const shellTools = frontendConfig.allowedTools.filter((tool: string) =>
          tool.startsWith("shell:")
        );

        const allowedCommands = ["npm", "npx jest", "npx playwright"];
        shellTools.forEach((tool: string) => {
          const hasAllowedCommand = allowedCommands.some((cmd) =>
            tool.startsWith(`shell:${cmd}`)
          );
          expect(hasAllowedCommand).toBe(true);
        });
      });
    });

    describe("Review Agent Permission Boundaries", () => {
      it("should have read-only access to entire codebase", () => {
        const reviewConfig = agentConfigs.review;

        // Should have read access to everything
        expect(reviewConfig.allowedTools).toContain("read:**/*");

        // Should NOT have write or shell access
        const writeTools = reviewConfig.allowedTools.filter(
          (tool: string) =>
            tool.startsWith("write:") || tool.startsWith("shell:")
        );
        expect(writeTools).toHaveLength(0);
      });

      it("should not have any write permissions for any path", () => {
        fc.assert(
          fc.property(pathArbitrary, (testPath: string) => {
            const reviewConfig = agentConfigs.review;
            const hasWriteAccess = reviewConfig.allowedTools.some(
              (tool: string) => tool.startsWith("write:")
            );
            expect(hasWriteAccess).toBe(false);
            return true;
          }),
          { numRuns: 100 }
        );
      });
    });

    describe("UX Agent Permission Boundaries", () => {
      it("should have read access to frontend and product.md only", () => {
        const uxConfig = agentConfigs.ux;
        const readTools = uxConfig.allowedTools.filter((tool: string) =>
          tool.startsWith("read:")
        );

        readTools.forEach((tool: string) => {
          expect(tool).toMatch(
            /^read:(frontend\/\*\*\/\*|\.kiro\/steering\/product\.md)$/
          );
        });
      });

      it("should restrict shell access to playwright and npm dev commands only", () => {
        const uxConfig = agentConfigs.ux;
        const shellTools = uxConfig.allowedTools.filter((tool: string) =>
          tool.startsWith("shell:")
        );

        const allowedCommands = ["npx playwright", "npm run dev"];
        shellTools.forEach((tool: string) => {
          const hasAllowedCommand = allowedCommands.some((cmd) =>
            tool.startsWith(`shell:${cmd}`)
          );
          expect(hasAllowedCommand).toBe(true);
        });
      });
    });
  });

  describe("Property 6: Agent Prompt Expertise Keywords", () => {
    /**
     * Feature: advanced-kiro-features, Property 6: Agent Prompt Expertise Keywords
     * For any specialized agent, its prompt SHALL contain all required expertise
     * keywords as specified in requirements.
     * Validates: Requirements 6.3, 7.3, 8.2
     */

    it("should have Backend agent with required expertise keywords", () => {
      const backendConfig = agentConfigs.backend;
      const requiredKeywords = [
        "FastAPI",
        "SQLAlchemy",
        "Chroma",
        "LlamaIndex",
      ];

      expect(
        promptContainsKeywords(backendConfig.prompt, requiredKeywords)
      ).toBe(true);

      // Test each keyword individually for better error reporting
      requiredKeywords.forEach((keyword) => {
        expect(backendConfig.prompt.toLowerCase()).toContain(
          keyword.toLowerCase()
        );
      });
    });

    it("should have Frontend agent with required expertise keywords", () => {
      const frontendConfig = agentConfigs.frontend;
      const requiredKeywords = [
        "React 18",
        "TypeScript",
        "Vite",
        "accessibility",
      ];

      expect(
        promptContainsKeywords(frontendConfig.prompt, requiredKeywords)
      ).toBe(true);

      // Test each keyword individually for better error reporting
      requiredKeywords.forEach((keyword) => {
        expect(frontendConfig.prompt.toLowerCase()).toContain(
          keyword.toLowerCase()
        );
      });
    });

    it("should have Review agent with required expertise keywords", () => {
      const reviewConfig = agentConfigs.review;
      const requiredKeywords = ["security", "performance", "standards"];

      expect(
        promptContainsKeywords(reviewConfig.prompt, requiredKeywords)
      ).toBe(true);

      // Test each keyword individually for better error reporting
      requiredKeywords.forEach((keyword) => {
        expect(reviewConfig.prompt.toLowerCase()).toContain(
          keyword.toLowerCase()
        );
      });
    });

    it("should maintain expertise keywords across prompt modifications", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }),
          (additionalText: string) => {
            // Simulate adding text to prompt (this tests that keywords remain)
            const backendConfig = agentConfigs.backend;
            const modifiedPrompt = backendConfig.prompt + " " + additionalText;
            const requiredKeywords = [
              "FastAPI",
              "SQLAlchemy",
              "Chroma",
              "LlamaIndex",
            ];

            expect(
              promptContainsKeywords(modifiedPrompt, requiredKeywords)
            ).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 7: Agent Resource Inclusion", () => {
    /**
     * Feature: advanced-kiro-features, Property 7: Agent Resource Inclusion
     * For any specialized agent, its resources array SHALL include the required
     * context files as specified in requirements.
     * Validates: Requirements 6.2, 7.2, 8.3, 9.7
     */

    it("should have Backend agent with required resource patterns", () => {
      const backendConfig = agentConfigs.backend;

      // Should include backend/app/ files
      expect(
        resourcesIncludePattern(
          backendConfig.resources,
          /file:\/\/backend\/app\/\*\*\/\*\.py/
        )
      ).toBe(true);

      // Should include tech.md
      expect(backendConfig.resources).toContain(
        "file://.kiro/steering/tech.md"
      );
    });

    it("should have Frontend agent with required resource patterns", () => {
      const frontendConfig = agentConfigs.frontend;

      // Should include frontend/src/ files
      expect(
        resourcesIncludePattern(
          frontendConfig.resources,
          /file:\/\/frontend\/src\/\*\*\/\*\.\{ts,tsx\}/
        )
      ).toBe(true);

      // Should include tech.md
      expect(frontendConfig.resources).toContain(
        "file://.kiro/steering/tech.md"
      );
    });

    it("should have Review agent with required resource patterns", () => {
      const reviewConfig = agentConfigs.review;

      // Should include tech.md and structure.md
      expect(reviewConfig.resources).toContain("file://.kiro/steering/tech.md");
      expect(reviewConfig.resources).toContain(
        "file://.kiro/steering/structure.md"
      );
    });

    it("should have UX agent with required resource patterns", () => {
      const uxConfig = agentConfigs.ux;

      // Should include frontend/src/ TSX files
      expect(
        resourcesIncludePattern(
          uxConfig.resources,
          /file:\/\/frontend\/src\/\*\*\/\*\.tsx/
        )
      ).toBe(true);

      // Should include product.md
      expect(uxConfig.resources).toContain("file://.kiro/steering/product.md");
    });

    it("should maintain required resources across any resource list modifications", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 5, maxLength: 50 }), {
            minLength: 0,
            maxLength: 5,
          }),
          (additionalResources: string[]) => {
            // Test that adding resources doesn't break required ones
            const backendConfig = agentConfigs.backend;
            const modifiedResources = [
              ...backendConfig.resources,
              ...additionalResources,
            ];

            // Required resources should still be present
            expect(modifiedResources).toContain(
              "file://.kiro/steering/tech.md"
            );
            expect(
              resourcesIncludePattern(
                modifiedResources,
                /file:\/\/backend\/app\/\*\*\/\*\.py/
              )
            ).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Agent Model Configuration", () => {
    it("should have appropriate model assignments", () => {
      // Backend and Frontend should use more capable models
      expect(["claude-sonnet-4.5", "claude-sonnet-4"]).toContain(
        agentConfigs.backend.model
      );
      expect(["claude-sonnet-4.5", "claude-sonnet-4"]).toContain(
        agentConfigs.frontend.model
      );

      // Review should use capable model for analysis
      expect(["claude-sonnet-4", "claude-sonnet-4.5"]).toContain(
        agentConfigs.review.model
      );

      // UX can use lighter model for basic validation
      expect(["claude-haiku-4.5", "claude-sonnet-4"]).toContain(
        agentConfigs.ux.model
      );
    });
  });

  describe("Cross-Agent Consistency", () => {
    it("should have consistent tool categories across agents", () => {
      Object.values(agentConfigs).forEach((config) => {
        // All agents should have basic tools defined
        expect(Array.isArray(config.tools)).toBe(true);
        expect(config.tools.length).toBeGreaterThan(0);

        // All agents should have allowedTools restrictions
        expect(Array.isArray(config.allowedTools)).toBe(true);
        expect(config.allowedTools.length).toBeGreaterThan(0);
      });
    });

    it("should have non-overlapping write permissions", () => {
      const backendWriteTools = agentConfigs.backend.allowedTools.filter(
        (tool: string) => tool.startsWith("write:")
      );
      const frontendWriteTools = agentConfigs.frontend.allowedTools.filter(
        (tool: string) => tool.startsWith("write:")
      );

      // Backend should only write to backend/
      backendWriteTools.forEach((tool: string) => {
        expect(tool).toMatch(/^write:backend\//);
      });

      // Frontend should only write to frontend/
      frontendWriteTools.forEach((tool: string) => {
        expect(tool).toMatch(/^write:frontend\//);
      });

      // Review and UX should have no write permissions
      expect(
        agentConfigs.review.allowedTools.filter((tool: string) =>
          tool.startsWith("write:")
        )
      ).toHaveLength(0);

      expect(
        agentConfigs.ux.allowedTools.filter((tool: string) =>
          tool.startsWith("write:")
        )
      ).toHaveLength(0);
    });
  });
});
