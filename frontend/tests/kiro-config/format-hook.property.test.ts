import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Property-Based Tests for Format-on-Save Hook Configuration
 * 
 * Feature: advanced-kiro-features
 * Property 1: Format-on-Save Hook Execution
 * Validates: Requirements 1.1, 1.2
 */

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the hook configuration
const hookConfigPath = path.resolve(__dirname, '../../../.kiro/hooks/format-on-save.json');
const hookConfig = JSON.parse(fs.readFileSync(hookConfigPath, 'utf-8'));

// Helper function to check if a file path matches a glob pattern
function matchesPattern(filePath: string, pattern: string): boolean {
  // Convert glob pattern to regex properly
  let regexPattern = pattern
    // Escape special regex characters first (except * and {})
    .replace(/[.+^$|\\()]/g, '\\$&')
    // Handle ** (globstar) - matches any path including /
    .replace(/\*\*/g, '.*')
    // Handle * (single segment) - matches anything except /
    .replace(/\*/g, '[^/]*')
    // Handle {a,b} patterns
    .replace(/\{([^}]+)\}/g, (_: string, group: string) => `(${group.split(',').join('|')})`);
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

// Helper to get the formatter command for a file path
function getFormatterCommand(filePath: string): string | null {
  for (const condition of hookConfig.conditions) {
    if (matchesPattern(filePath, condition.filePattern)) {
      return condition.command;
    }
  }
  return null;
}

// Arbitrary generators for file paths
const pythonFileInBackend = fc.tuple(
  fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '_'), { minLength: 1, maxLength: 20 }),
  fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '_'), { minLength: 1, maxLength: 20 })
).map(([dir, file]: [string, string]) => `backend/${dir}/${file}.py`);

const typescriptFileInFrontend = fc.tuple(
  fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '_'), { minLength: 1, maxLength: 20 }),
  fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '_'), { minLength: 1, maxLength: 20 }),
  fc.constantFrom('.ts', '.tsx')
).map(([dir, file, ext]: [string, string, string]) => `frontend/${dir}/${file}${ext}`);

const fileOutsideConfiguredDirs = fc.tuple(
  fc.constantFrom('data', 'docs', 'scripts', 'config', 'lib'),
  fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '_'), { minLength: 1, maxLength: 20 }),
  fc.constantFrom('.py', '.ts', '.tsx', '.js', '.json')
).map(([dir, file, ext]: [string, string, string]) => `${dir}/${file}${ext}`);

describe('Format-on-Save Hook Configuration', () => {
  /**
   * Feature: advanced-kiro-features, Property 1: Format-on-Save Hook Execution
   * Validates: Requirements 1.1, 1.2
   */
  
  describe('Hook Configuration Structure', () => {
    it('should have valid hook configuration', () => {
      expect(hookConfig.name).toBe('format-on-save');
      expect(hookConfig.trigger).toBe('onFileSave');
      expect(hookConfig.conditions).toBeDefined();
      expect(Array.isArray(hookConfig.conditions)).toBe(true);
      expect(hookConfig.timeout).toBe(2000);
      expect(hookConfig.onError).toBe('notify');
    });

    it('should have Python and TypeScript formatters configured', () => {
      const patterns = hookConfig.conditions.map((c: { filePattern: string }) => c.filePattern);
      expect(patterns).toContain('backend/**/*.py');
      expect(patterns).toContain('frontend/**/*.{ts,tsx}');
    });
  });


  describe('Property 1: Python files in backend trigger Black formatter', () => {
    /**
     * For any Python file in the backend directory,
     * the format-on-save hook SHALL execute Black formatter on that file.
     * Validates: Requirements 1.1
     */
    it('should trigger Black for all Python files in backend/', () => {
      fc.assert(
        fc.property(pythonFileInBackend, (filePath: string) => {
          const command = getFormatterCommand(filePath);
          expect(command).not.toBeNull();
          expect(command).toContain('black');
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 1: TypeScript files in frontend trigger Prettier formatter', () => {
    /**
     * For any TypeScript file in the frontend directory,
     * the format-on-save hook SHALL execute Prettier on that file.
     * Validates: Requirements 1.2
     */
    it('should trigger Prettier for all TypeScript files in frontend/', () => {
      fc.assert(
        fc.property(typescriptFileInFrontend, (filePath: string) => {
          const command = getFormatterCommand(filePath);
          expect(command).not.toBeNull();
          expect(command).toContain('prettier');
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 1: Files outside configured directories do not trigger formatters', () => {
    /**
     * For any file outside the configured directories (backend/, frontend/),
     * the format-on-save hook SHALL NOT trigger any formatter.
     */
    it('should not trigger formatters for files outside configured directories', () => {
      fc.assert(
        fc.property(fileOutsideConfiguredDirs, (filePath: string) => {
          const command = getFormatterCommand(filePath);
          expect(command).toBeNull();
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Timeout and Error Handling Configuration', () => {
    it('should have 2-second timeout configured', () => {
      expect(hookConfig.timeout).toBe(2000);
    });

    it('should have error notification behavior configured', () => {
      expect(hookConfig.onError).toBe('notify');
    });

    it('should have error messages for missing formatters', () => {
      for (const condition of hookConfig.conditions) {
        expect(condition.errorMessage).toBeDefined();
        expect(typeof condition.errorMessage).toBe('string');
        expect(condition.errorMessage.length).toBeGreaterThan(0);
      }
    });
  });
});
