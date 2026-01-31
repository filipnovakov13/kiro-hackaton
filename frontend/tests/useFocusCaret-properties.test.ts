/**
 * Property-based tests for useFocusCaret hook
 *
 * **Validates: Requirement 5.4**
 *
 * These tests verify that focus context extraction maintains correctness
 * properties across all possible document texts and caret positions.
 */

import { describe, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFocusCaret } from "../src/hooks/useFocusCaret";
import * as fc from "fast-check";

const CONTEXT_CHARS = 150; // ±150 characters around caret

describe("useFocusCaret - Property-Based Tests", () => {
  /**
   * Property: Focus context extraction always returns ±150 chars (or less at boundaries)
   *
   * **Validates: Requirement 5.4**
   *
   * For any document text and any valid position within that text:
   * - start_char = max(0, position - 150)
   * - end_char = min(text.length, position + 150)
   * - context_text = text.substring(start_char, end_char)
   * - position is always within [start_char, end_char]
   */
  it("property: focus context extraction is always ±150 chars", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random document text (10-1000 chars)
        fc.string({ minLength: 10, maxLength: 1000 }),
        // Generate random position within text bounds
        fc.nat(),
        async (documentText, positionSeed) => {
          // Ensure position is within valid range
          const position = positionSeed % (documentText.length + 1);

          const { result } = renderHook(() => useFocusCaret(documentText));

          await act(async () => {
            result.current.placeCaret(position);
          });

          const fc = result.current.focusContext;

          // Property 1: focusContext should exist for valid position
          if (fc === null) {
            throw new Error(
              `focusContext is null for position ${position} in text of length ${documentText.length}`,
            );
          }

          // Property 2: start_char should be max(0, position - 150)
          const expectedStart = Math.max(0, position - CONTEXT_CHARS);
          if (fc.start_char !== expectedStart) {
            throw new Error(
              `start_char mismatch: expected ${expectedStart}, got ${fc.start_char} (position=${position}, textLength=${documentText.length})`,
            );
          }

          // Property 3: end_char should be min(text.length, position + 150)
          const expectedEnd = Math.min(
            documentText.length,
            position + CONTEXT_CHARS,
          );
          if (fc.end_char !== expectedEnd) {
            throw new Error(
              `end_char mismatch: expected ${expectedEnd}, got ${fc.end_char} (position=${position}, textLength=${documentText.length})`,
            );
          }

          // Property 4: context_text should match substring
          const expectedContext = documentText.substring(
            expectedStart,
            expectedEnd,
          );
          if (fc.context_text !== expectedContext) {
            throw new Error(
              `context_text mismatch: expected "${expectedContext.substring(0, 50)}...", got "${fc.context_text.substring(0, 50)}..." (position=${position})`,
            );
          }

          // Property 5: position should be within [start_char, end_char]
          if (position < fc.start_char || position > fc.end_char) {
            throw new Error(
              `position ${position} is outside range [${fc.start_char}, ${fc.end_char}]`,
            );
          }

          // Property 6: context length should be at most 300 chars (150 + 150)
          if (fc.context_text.length > 2 * CONTEXT_CHARS) {
            throw new Error(
              `context_text too long: ${fc.context_text.length} chars (max ${2 * CONTEXT_CHARS})`,
            );
          }

          // Property 7: context length should match end - start
          const expectedLength = expectedEnd - expectedStart;
          if (fc.context_text.length !== expectedLength) {
            throw new Error(
              `context_text length mismatch: expected ${expectedLength}, got ${fc.context_text.length}`,
            );
          }
        },
      ),
      { numRuns: 100 }, // Run 100 random test cases
    );
  });

  /**
   * Property: Context extraction at boundaries never exceeds document bounds
   *
   * **Validates: Requirement 5.4**
   *
   * For positions at or near document boundaries (start/end):
   * - start_char >= 0
   * - end_char <= document.length
   * - No out-of-bounds access
   */
  it("property: boundary positions never exceed document bounds", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random document text
        fc.string({ minLength: 1, maxLength: 500 }),
        async (documentText) => {
          const { result } = renderHook(() => useFocusCaret(documentText));

          // Test position at start (0)
          await act(async () => {
            result.current.placeCaret(0);
          });

          let fc = result.current.focusContext;
          if (fc === null) {
            throw new Error("focusContext is null for position 0");
          }

          if (fc.start_char < 0) {
            throw new Error(`start_char is negative: ${fc.start_char}`);
          }

          if (fc.end_char > documentText.length) {
            throw new Error(
              `end_char exceeds text length: ${fc.end_char} > ${documentText.length}`,
            );
          }

          // Test position at end (documentText.length)
          await act(async () => {
            result.current.placeCaret(documentText.length);
          });

          fc = result.current.focusContext;
          if (fc === null) {
            throw new Error(
              `focusContext is null for position ${documentText.length}`,
            );
          }

          if (fc.start_char < 0) {
            throw new Error(`start_char is negative at end: ${fc.start_char}`);
          }

          if (fc.end_char > documentText.length) {
            throw new Error(
              `end_char exceeds text length at end: ${fc.end_char} > ${documentText.length}`,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Moving caret maintains context extraction correctness
   *
   * **Validates: Requirement 5.4**
   *
   * After moving caret left or right, the focus context should still
   * satisfy all extraction properties for the new position.
   */
  it("property: caret movement maintains extraction correctness", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random document text
        fc.string({ minLength: 50, maxLength: 500 }),
        // Generate random starting position
        fc.nat(),
        // Generate random number of moves (1-20)
        fc.integer({ min: 1, max: 20 }),
        // Generate random direction for each move
        fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
        async (documentText, positionSeed, moveCount, directions) => {
          const startPosition = positionSeed % (documentText.length + 1);

          const { result } = renderHook(() => useFocusCaret(documentText));

          // Place caret at starting position
          await act(async () => {
            result.current.placeCaret(startPosition);
          });

          // Perform random moves
          for (let i = 0; i < Math.min(moveCount, directions.length); i++) {
            const moveRight = directions[i];

            await act(async () => {
              if (moveRight) {
                result.current.moveCaretRight();
              } else {
                result.current.moveCaretLeft();
              }
            });

            const position = result.current.position;
            const fc = result.current.focusContext;

            // Skip if position is null (boundary reached)
            if (position === null) {
              continue;
            }

            // Verify extraction properties still hold
            if (fc === null) {
              throw new Error(
                `focusContext is null after move ${i} at position ${position}`,
              );
            }

            const expectedStart = Math.max(0, position - CONTEXT_CHARS);
            const expectedEnd = Math.min(
              documentText.length,
              position + CONTEXT_CHARS,
            );

            if (
              fc.start_char !== expectedStart ||
              fc.end_char !== expectedEnd
            ) {
              throw new Error(
                `Extraction incorrect after move ${i}: position=${position}, expected [${expectedStart}, ${expectedEnd}], got [${fc.start_char}, ${fc.end_char}]`,
              );
            }

            if (position < fc.start_char || position > fc.end_char) {
              throw new Error(
                `Position ${position} outside range [${fc.start_char}, ${fc.end_char}] after move ${i}`,
              );
            }
          }
        },
      ),
      { numRuns: 50 }, // Fewer runs due to complexity
    );
  });

  /**
   * Property: Context text is always a valid substring of document
   *
   * **Validates: Requirement 5.4**
   *
   * The extracted context_text should always be findable in the original
   * document at the specified position.
   */
  it("property: context text is always a valid substring", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 1000 }),
        fc.nat(),
        async (documentText, positionSeed) => {
          const position = positionSeed % (documentText.length + 1);

          const { result } = renderHook(() => useFocusCaret(documentText));

          await act(async () => {
            result.current.placeCaret(position);
          });

          const fc = result.current.focusContext;

          if (fc === null) {
            throw new Error(`focusContext is null for position ${position}`);
          }

          // Verify context_text appears in document at the specified location
          const actualSubstring = documentText.substring(
            fc.start_char,
            fc.end_char,
          );

          if (fc.context_text !== actualSubstring) {
            throw new Error(
              `context_text does not match document substring at [${fc.start_char}, ${fc.end_char}]`,
            );
          }

          // Verify we can find the context in the document
          const foundIndex = documentText.indexOf(fc.context_text);
          if (foundIndex === -1) {
            throw new Error("context_text not found in document");
          }

          // Verify the found index matches start_char (or is a duplicate substring)
          if (foundIndex !== fc.start_char) {
            // Check if it's a duplicate substring case
            const isDuplicate =
              documentText.indexOf(fc.context_text, foundIndex + 1) !== -1;
            if (!isDuplicate && foundIndex !== fc.start_char) {
              throw new Error(
                `context_text found at wrong position: expected ${fc.start_char}, found ${foundIndex}`,
              );
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
