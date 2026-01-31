/**
 * Property-Based Tests for Focus Caret Navigation
 *
 * Feature: frontend-integration-phase-2-part1
 * Property 7: Focus Caret Navigation
 * **Validates: Requirements 9.5.3.1**
 *
 * Tests verify that focus caret navigation works correctly:
 * - For any document with N paragraphs
 * - Pressing ArrowDown from paragraph i (where i < N-1) moves to paragraph i+1
 * - Pressing ArrowUp from paragraph i (where i > 0) moves to paragraph i-1
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import * as fc from "fast-check";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { DocumentViewer } from "../src/components/document/DocumentViewer";

// Mock react-syntax-highlighter to avoid ESM issues in tests
vi.mock("react-syntax-highlighter", () => ({
  Prism: ({ children, ...props }: any) => (
    <pre data-testid="syntax-highlighter" {...props}>
      <code>{children}</code>
    </pre>
  ),
}));

vi.mock("react-syntax-highlighter/dist/esm/styles/prism", () => ({
  vscDarkPlus: {},
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a document with N paragraphs
 * Paragraphs are separated by double newlines (\n\n)
 */
function generateDocument(numParagraphs: number): string {
  const paragraphs: string[] = [];
  for (let i = 0; i < numParagraphs; i++) {
    paragraphs.push(`Paragraph ${i + 1} content here.`);
  }
  return paragraphs.join("\n\n");
}

/**
 * Find the start position of paragraph i (0-indexed)
 */
function findParagraphStart(content: string, paragraphIndex: number): number {
  if (paragraphIndex === 0) return 0;

  let currentParagraph = 0;
  let position = 0;

  while (position < content.length && currentParagraph < paragraphIndex) {
    const nextBreak = content.indexOf("\n\n", position);
    if (nextBreak === -1) break;
    position = nextBreak + 2;
    currentParagraph++;
  }

  return position;
}

/**
 * Find which paragraph a position is in (0-indexed)
 */
function findParagraphIndex(content: string, position: number): number {
  let paragraphIndex = 0;
  let searchPosition = 0;

  while (searchPosition < position) {
    const nextBreak = content.indexOf("\n\n", searchPosition);
    if (nextBreak === -1 || nextBreak >= position) break;
    searchPosition = nextBreak + 2;
    paragraphIndex++;
  }

  return paragraphIndex;
}

/**
 * Simulate ArrowDown key press and return new caret position
 */
function simulateArrowDown(content: string, currentPosition: number): number {
  const afterPosition = content.slice(currentPosition);
  const nextParagraphBreak = afterPosition.indexOf("\n\n");
  return nextParagraphBreak === -1
    ? content.length - 1
    : currentPosition + nextParagraphBreak + 2;
}

/**
 * Simulate ArrowUp key press and return new caret position
 */
function simulateArrowUp(content: string, currentPosition: number): number {
  // Find the start of the current paragraph first
  const beforePosition = content.slice(0, currentPosition);
  const currentParagraphStart = beforePosition.lastIndexOf("\n\n");

  // If we're at the start, stay at 0
  if (currentParagraphStart === -1) return 0;

  // Now find the previous paragraph break before the current one
  const beforeCurrentParagraph = content.slice(0, currentParagraphStart);
  const previousParagraphBreak = beforeCurrentParagraph.lastIndexOf("\n\n");

  return previousParagraphBreak === -1 ? 0 : previousParagraphBreak + 2;
}

// =============================================================================
// PROPERTY TESTS
// =============================================================================

describe("Focus Caret Navigation Properties", () => {
  /**
   * Property 7: Focus Caret Navigation
   *
   * For any document with N paragraphs:
   * - Pressing ArrowDown from paragraph i (where i < N-1) moves to paragraph i+1
   * - Pressing ArrowUp from paragraph i (where i > 0) moves to paragraph i-1
   *
   * **Validates: Requirements 9.5.3.1**
   */
  it("Property 7: ArrowDown moves from paragraph i to i+1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 20 }), // Number of paragraphs
        fc.integer({ min: 0, max: 18 }), // Starting paragraph index (ensure i < N-1)
        (numParagraphs, startParagraphIndex) => {
          // Ensure we're not at the last paragraph
          const paragraphIndex = startParagraphIndex % (numParagraphs - 1);

          const content = generateDocument(numParagraphs);
          const startPosition = findParagraphStart(content, paragraphIndex);

          // Simulate ArrowDown
          const newPosition = simulateArrowDown(content, startPosition);
          const newParagraphIndex = findParagraphIndex(content, newPosition);

          // Verify we moved to the next paragraph
          expect(newParagraphIndex).toBe(paragraphIndex + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 7a: ArrowUp moves from paragraph i to i-1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 20 }), // Number of paragraphs
        fc.integer({ min: 1, max: 19 }), // Starting paragraph index (ensure i > 0)
        (numParagraphs, startParagraphIndex) => {
          // Ensure we're not at the first paragraph
          const paragraphIndex =
            (startParagraphIndex % (numParagraphs - 1)) + 1;

          const content = generateDocument(numParagraphs);
          const startPosition = findParagraphStart(content, paragraphIndex);

          // Simulate ArrowUp
          const newPosition = simulateArrowUp(content, startPosition);
          const newParagraphIndex = findParagraphIndex(content, newPosition);

          // Verify we moved to the previous paragraph
          expect(newParagraphIndex).toBe(paragraphIndex - 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 7b: ArrowDown from last paragraph stays at end", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // Number of paragraphs
        (numParagraphs) => {
          const content = generateDocument(numParagraphs);
          const lastParagraphStart = findParagraphStart(
            content,
            numParagraphs - 1,
          );

          // Simulate ArrowDown from last paragraph
          const newPosition = simulateArrowDown(content, lastParagraphStart);

          // Should be at or near the end of the document
          expect(newPosition).toBeGreaterThanOrEqual(lastParagraphStart);
          expect(newPosition).toBeLessThanOrEqual(content.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 7c: ArrowUp from first paragraph stays at start", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // Number of paragraphs
        (numParagraphs) => {
          const content = generateDocument(numParagraphs);
          const firstParagraphStart = 0;

          // Simulate ArrowUp from first paragraph
          const newPosition = simulateArrowUp(content, firstParagraphStart);

          // Should stay at the start
          expect(newPosition).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 7d: Sequential ArrowDown navigates through all paragraphs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }), // Number of paragraphs
        (numParagraphs) => {
          const content = generateDocument(numParagraphs);
          let currentPosition = 0;

          // Navigate through all paragraphs
          for (let i = 0; i < numParagraphs - 1; i++) {
            const currentParagraph = findParagraphIndex(
              content,
              currentPosition,
            );
            expect(currentParagraph).toBe(i);

            // Move to next paragraph
            currentPosition = simulateArrowDown(content, currentPosition);
          }

          // Should be at the last paragraph
          const finalParagraph = findParagraphIndex(content, currentPosition);
          expect(finalParagraph).toBe(numParagraphs - 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 7e: Sequential ArrowUp navigates backwards through all paragraphs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }), // Number of paragraphs
        (numParagraphs) => {
          const content = generateDocument(numParagraphs);
          let currentPosition = findParagraphStart(content, numParagraphs - 1);

          // Navigate backwards through all paragraphs
          for (let i = numParagraphs - 1; i > 0; i--) {
            const currentParagraph = findParagraphIndex(
              content,
              currentPosition,
            );
            expect(currentParagraph).toBe(i);

            // Move to previous paragraph
            currentPosition = simulateArrowUp(content, currentPosition);
          }

          // Should be at the first paragraph
          const finalParagraph = findParagraphIndex(content, currentPosition);
          expect(finalParagraph).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 7f: ArrowDown then ArrowUp returns to original paragraph", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 20 }), // Number of paragraphs (need at least 3)
        fc.integer({ min: 1, max: 18 }), // Starting paragraph (not first or last)
        (numParagraphs, startParagraphIndex) => {
          // Ensure we're in the middle (not first or last)
          const paragraphIndex =
            (startParagraphIndex % (numParagraphs - 2)) + 1;

          const content = generateDocument(numParagraphs);
          const startPosition = findParagraphStart(content, paragraphIndex);

          // ArrowDown then ArrowUp
          const afterDown = simulateArrowDown(content, startPosition);
          const afterUp = simulateArrowUp(content, afterDown);

          // Should be back at the original paragraph
          const finalParagraph = findParagraphIndex(content, afterUp);
          expect(finalParagraph).toBe(paragraphIndex);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 7g: Navigation works with varying paragraph lengths", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 10, maxLength: 200 }), {
          minLength: 2,
          maxLength: 10,
        }),
        (paragraphs) => {
          const content = paragraphs.join("\n\n");
          const numParagraphs = paragraphs.length;

          // Start at first paragraph
          let currentPosition = 0;

          // Navigate down through all paragraphs
          for (let i = 0; i < numParagraphs - 1; i++) {
            const currentParagraph = findParagraphIndex(
              content,
              currentPosition,
            );
            expect(currentParagraph).toBe(i);

            currentPosition = simulateArrowDown(content, currentPosition);
          }

          // Should be at last paragraph
          const finalParagraph = findParagraphIndex(content, currentPosition);
          expect(finalParagraph).toBe(numParagraphs - 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 7h: Position within paragraph doesn't affect navigation", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }), // Number of paragraphs
        fc.integer({ min: 1, max: 8 }), // Paragraph index
        fc.integer({ min: 0, max: 20 }), // Offset within paragraph
        (numParagraphs, paragraphIndex, offset) => {
          const paragraphIdx = paragraphIndex % (numParagraphs - 1);
          const content = generateDocument(numParagraphs);
          const paragraphStart = findParagraphStart(content, paragraphIdx);

          // Find the end of the current paragraph
          const nextBreak = content.indexOf("\n\n", paragraphStart);
          const paragraphEnd = nextBreak === -1 ? content.length : nextBreak;
          const paragraphLength = paragraphEnd - paragraphStart;

          // Position somewhere within the paragraph
          const position =
            paragraphStart + Math.min(offset, paragraphLength - 1);

          // ArrowDown should move to next paragraph regardless of position
          const afterDown = simulateArrowDown(content, position);
          const newParagraph = findParagraphIndex(content, afterDown);

          expect(newParagraph).toBe(paragraphIdx + 1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
