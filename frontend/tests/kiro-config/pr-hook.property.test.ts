import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Property-Based Tests for PR Automation Hook Configuration
 * 
 * Feature: advanced-kiro-features
 * Property 2: PR Branch Naming Convention
 * Property 3: PR Body Completeness
 * Property 4: PR Test Enforcement
 * Validates: Requirements 2.2, 2.3, 2.6
 */

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the hook configuration
const hookConfigPath = path.resolve(__dirname, '../../../.kiro/hooks/create-pr.json');
const hookConfig = JSON.parse(fs.readFileSync(hookConfigPath, 'utf-8'));

// Helper function to sanitize feature name for git branch
function sanitizeFeatureName(featureName: string): string {
  return featureName
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^a-z0-9-_]/g, '')    // Remove invalid characters
    .replace(/-+/g, '-')            // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');         // Remove leading/trailing hyphens
}

// Helper function to create branch name from feature name
function createBranchName(featureName: string): string {
  const sanitized = sanitizeFeatureName(featureName);
  // If sanitized is empty, use a default placeholder
  const branchSuffix = sanitized || 'unnamed';
  return `feature/${branchSuffix}`;
}

// Helper function to check if branch name is valid for git
function isValidGitBranchName(branchName: string): boolean {
  // Git branch name rules:
  // - Cannot be empty after feature/
  // - Cannot start with '.' or '-' (after the prefix)
  // - Cannot contain '..' or '//'
  // - Cannot end with '/' or '.lock'
  // - Cannot contain control characters, space, ~, ^, :, ?, *, [
  
  // Must have something after feature/
  if (branchName === 'feature/' || branchName === 'feature') {
    return false;
  }
  
  const invalidPatterns = [
    /\/\./,          // Segment starts with .
    /\/-/,           // Segment starts with -
    /\.\./,          // Contains ..
    /\/\//,          // Contains //
    /\/$/,           // Ends with /
    /\.lock$/,       // Ends with .lock
    /[\x00-\x1f\x7f]/, // Control characters
    /[ ~^:?*\[]/,    // Invalid characters
  ];
  
  return !invalidPatterns.some(pattern => pattern.test(branchName));
}

// Helper to generate PR body from template
function generatePRBody(
  featureSummary: string,
  backendTestResult: string,
  frontendTestResult: string,
  linkedRequirements: string
): string {
  const sections = hookConfig.prBodyTemplate.sections;
  let body = '';
  
  for (const section of sections) {
    body += `## ${section.title}\n`;
    let content = section.content
      .replace('${featureSummary}', featureSummary)
      .replace('${backendTestResult}', backendTestResult)
      .replace('${frontendTestResult}', frontendTestResult)
      .replace('${linkedRequirements}', linkedRequirements);
    body += `${content}\n\n`;
  }
  
  return body;
}


// Arbitrary generators - only valid feature name characters
const featureNameArbitrary = fc.stringOf(
  fc.constantFrom(
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    ' ', '-', '_'
  ),
  { minLength: 1, maxLength: 50 }
);

// Generator that includes special characters to test sanitization
const featureNameWithSpecialChars = fc.stringOf(
  fc.constantFrom(
    'a', 'b', 'c', ' ', '-', '_', '!', '@', '#', '$', '%', '^', '&',
    '*', '(', ')', '+', '=', '[', ']', '{', '}', '|', '/', ':',
    ';', '<', '>', ',', '.', '?', '`', '~'
  ),
  { minLength: 1, maxLength: 30 }
);

// Generator for valid summaries (alphanumeric with spaces and basic punctuation)
const summaryArbitrary = fc.stringOf(
  fc.constantFrom(
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    ' ', '.', ',', '-', '_', '!', '?'
  ),
  { minLength: 10, maxLength: 200 }
);

const testResultArbitrary = fc.constantFrom('PASSED', 'FAILED', '5 passed, 0 failed', 'All tests passed');
const requirementsArbitrary = fc.array(
  fc.tuple(fc.integer({ min: 1, max: 10 }), fc.integer({ min: 1, max: 5 }))
    .map(([req, sub]: [number, number]) => `${req}.${sub}`),
  { minLength: 0, maxLength: 5 }
).map((reqs: string[]) => reqs.join(', '));

describe('PR Automation Hook Configuration', () => {
  describe('Hook Configuration Structure', () => {
    it('should have valid hook configuration', () => {
      expect(hookConfig.name).toBe('create-feature-pr');
      expect(hookConfig.trigger).toBe('manual');
      expect(hookConfig.steps).toBeDefined();
      expect(Array.isArray(hookConfig.steps)).toBe(true);
    });

    it('should have required input fields', () => {
      expect(hookConfig.inputs.featureName).toBeDefined();
      expect(hookConfig.inputs.featureName.required).toBe(true);
      expect(hookConfig.inputs.featureSummary).toBeDefined();
      expect(hookConfig.inputs.featureSummary.required).toBe(true);
    });
  });


  describe('Property 2: PR Branch Naming Convention', () => {
    /**
     * Feature: advanced-kiro-features, Property 2: PR Branch Naming Convention
     * For any feature name provided to the PR hook, the created branch SHALL follow
     * the pattern `feature/{feature-name}` where feature-name is the sanitized input.
     * Validates: Requirements 2.2
     */
    
    it('should create branch names starting with feature/', () => {
      fc.assert(
        fc.property(featureNameArbitrary, (featureName: string) => {
          const branchName = createBranchName(featureName);
          expect(branchName.startsWith('feature/')).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should produce valid git branch names for any input', () => {
      fc.assert(
        fc.property(featureNameWithSpecialChars, (featureName: string) => {
          const branchName = createBranchName(featureName);
          // Branch name should be valid for git (after sanitization with fallback)
          expect(isValidGitBranchName(branchName)).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should sanitize special characters from feature names', () => {
      fc.assert(
        fc.property(featureNameWithSpecialChars, (featureName: string) => {
          const sanitized = sanitizeFeatureName(featureName);
          // Should only contain lowercase letters, numbers, hyphens, underscores (or be empty)
          expect(/^[a-z0-9-_]*$/.test(sanitized)).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should have create-branch step with correct pattern', () => {
      const createBranchStep = hookConfig.steps.find(
        (s: { name: string }) => s.name === 'create-branch'
      );
      expect(createBranchStep).toBeDefined();
      expect(createBranchStep.command).toContain('feature/${featureName}');
    });
  });

  describe('Property 3: PR Body Completeness', () => {
    /**
     * Feature: advanced-kiro-features, Property 3: PR Body Completeness
     * For any pull request created by the PR hook, the PR body SHALL contain
     * all required sections: summary, test results, and linked requirements.
     * Validates: Requirements 2.3
     */
    
    it('should have all required sections in PR body template', () => {
      const sectionTitles = hookConfig.prBodyTemplate.sections.map(
        (s: { title: string }) => s.title
      );
      expect(sectionTitles).toContain('Summary');
      expect(sectionTitles).toContain('Test Results');
      expect(sectionTitles).toContain('Requirements');
    });

    it('should generate PR body with all sections populated', () => {
      fc.assert(
        fc.property(
          summaryArbitrary,
          testResultArbitrary,
          testResultArbitrary,
          requirementsArbitrary,
          (summary: string, backendResult: string, frontendResult: string, requirements: string) => {
            const prBody = generatePRBody(summary, backendResult, frontendResult, requirements);
            
            // Check all sections are present
            expect(prBody).toContain('## Summary');
            expect(prBody).toContain('## Test Results');
            expect(prBody).toContain('## Requirements');
            expect(prBody).toContain('## Changes');
            
            // Check content is populated (summary should appear in body)
            expect(prBody).toContain(summary);
            expect(prBody).toContain(backendResult);
            expect(prBody).toContain(frontendResult);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have valid markdown structure in generated PR body', () => {
      fc.assert(
        fc.property(
          summaryArbitrary,
          testResultArbitrary,
          testResultArbitrary,
          requirementsArbitrary,
          (summary: string, backendResult: string, frontendResult: string, requirements: string) => {
            const prBody = generatePRBody(summary, backendResult, frontendResult, requirements);
            
            // Count section headers (## )
            const headerCount = (prBody.match(/^## /gm) || []).length;
            expect(headerCount).toBe(4); // Summary, Test Results, Requirements, Changes
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  describe('Property 4: PR Test Enforcement', () => {
    /**
     * Feature: advanced-kiro-features, Property 4: PR Test Enforcement
     * For any PR creation attempt, the hook SHALL verify that at least one test
     * exists and passes for each modified module before allowing PR creation.
     * Validates: Requirements 2.6
     */
    
    it('should have test validation configuration', () => {
      expect(hookConfig.validation).toBeDefined();
      expect(hookConfig.validation.requirePassingTests).toBe(true);
      expect(hookConfig.validation.minimumTestsPerModule).toBeGreaterThanOrEqual(1);
    });

    it('should have test steps that block on failure', () => {
      const backendTestStep = hookConfig.steps.find(
        (s: { name: string }) => s.name === 'run-backend-tests'
      );
      const frontendTestStep = hookConfig.steps.find(
        (s: { name: string }) => s.name === 'run-frontend-tests'
      );
      
      expect(backendTestStep).toBeDefined();
      expect(backendTestStep.continueOnError).toBe(false);
      
      expect(frontendTestStep).toBeDefined();
      expect(frontendTestStep.continueOnError).toBe(false);
    });

    it('should run tests before branch creation', () => {
      const stepNames = hookConfig.steps.map((s: { name: string }) => s.name);
      const backendTestIndex = stepNames.indexOf('run-backend-tests');
      const frontendTestIndex = stepNames.indexOf('run-frontend-tests');
      const createBranchIndex = stepNames.indexOf('create-branch');
      
      // Tests should come before branch creation
      expect(backendTestIndex).toBeLessThan(createBranchIndex);
      expect(frontendTestIndex).toBeLessThan(createBranchIndex);
    });

    it('should have failure handling configured', () => {
      expect(hookConfig.onFailure).toBeDefined();
      expect(hookConfig.onFailure.action).toBe('showTestResults');
    });
  });

  describe('Step Configuration', () => {
    it('should have all required steps in correct order', () => {
      const expectedSteps = [
        'run-backend-tests',
        'run-frontend-tests',
        'create-branch',
        'stage-changes',
        'commit-changes',
        'push-branch',
        'create-pr'
      ];
      
      const actualSteps = hookConfig.steps.map((s: { name: string }) => s.name);
      expect(actualSteps).toEqual(expectedSteps);
    });

    it('should have timeout configured for test steps', () => {
      const testSteps = hookConfig.steps.filter(
        (s: { name: string }) => s.name.includes('test')
      );
      
      for (const step of testSteps) {
        expect(step.timeout).toBeDefined();
        expect(step.timeout).toBeGreaterThan(0);
      }
    });
  });
});
