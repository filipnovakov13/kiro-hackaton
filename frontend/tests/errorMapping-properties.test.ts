/**
 * Property-Based Tests for Error Mapping Type Safety
 *
 * Feature: frontend-integration-phase-2-part1
 * Property 3: Error Mapping Type Safety
 * **Validates: Requirements 7.1.7**
 *
 * Tests verify that mapUploadError handles non-string inputs safely:
 * - Returns fallback string for non-string inputs
 * - Never throws an error
 * - Never returns a non-string value
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { mapUploadError } from "../src/utils/errorMapping";

const FALLBACK_MESSAGE = "Failed to upload document. Please try again.";

describe("Error Mapping Type Safety Properties", () => {
  /**
   * Property 3: Error Mapping Type Safety
   *
   * For any non-string input to mapUploadError:
   * - The function should return the fallback string
   * - The function should not throw an error
   * - The function should never return a non-string value
   *
   * **Validates: Requirements 7.1.7**
   */
  it("Property 3: Non-string inputs return fallback without throwing", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.float(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
          fc.array(fc.string()),
          fc.object(),
          fc.func(fc.string()),
          fc.constant(Symbol("test")),
          fc.date(),
        ),
        (nonStringInput) => {
          // Should not throw
          let result: string;
          expect(() => {
            result = mapUploadError(nonStringInput);
          }).not.toThrow();

          // Should return fallback string
          result = mapUploadError(nonStringInput);
          expect(result).toBe(FALLBACK_MESSAGE);

          // Should always return a string
          expect(typeof result).toBe("string");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3b: Function objects return fallback
   *
   * For any function object passed to mapUploadError:
   * - Should return the fallback string
   * - Should not attempt to call the function
   * - Should not throw an error
   *
   * **Validates: Requirements 7.1.7**
   */
  it("Property 3b: Function objects return fallback safely", () => {
    fc.assert(
      fc.property(fc.func(fc.anything()), (funcInput) => {
        const result = mapUploadError(funcInput);

        // Should return fallback string
        expect(result).toBe(FALLBACK_MESSAGE);

        // Should be a string
        expect(typeof result).toBe("string");
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3c: Objects return fallback
   *
   * For any object (including arrays) passed to mapUploadError:
   * - Should return the fallback string
   * - Should not throw an error
   *
   * **Validates: Requirements 7.1.7**
   */
  it("Property 3c: Objects and arrays return fallback", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.object(),
          fc.array(fc.anything()),
          fc.dictionary(fc.string(), fc.anything()),
        ),
        (objectInput) => {
          const result = mapUploadError(objectInput);

          // Should return fallback string
          expect(result).toBe(FALLBACK_MESSAGE);

          // Should be a string
          expect(typeof result).toBe("string");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3d: Null and undefined return fallback
   *
   * For null or undefined inputs:
   * - Should return the fallback string
   * - Should not throw an error
   *
   * **Validates: Requirements 7.1.7**
   */
  it("Property 3d: Null and undefined return fallback", () => {
    // Test null
    const nullResult = mapUploadError(null);
    expect(nullResult).toBe(FALLBACK_MESSAGE);
    expect(typeof nullResult).toBe("string");

    // Test undefined
    const undefinedResult = mapUploadError(undefined);
    expect(undefinedResult).toBe(FALLBACK_MESSAGE);
    expect(typeof undefinedResult).toBe("string");
  });

  /**
   * Property 3e: Numbers return fallback
   *
   * For any numeric input (integer, float, NaN, Infinity):
   * - Should return the fallback string
   * - Should not throw an error
   *
   * **Validates: Requirements 7.1.7**
   */
  it("Property 3e: Numbers return fallback", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.float(),
          fc.constant(NaN),
          fc.constant(Infinity),
          fc.constant(-Infinity),
        ),
        (numericInput) => {
          const result = mapUploadError(numericInput);

          // Should return fallback string
          expect(result).toBe(FALLBACK_MESSAGE);

          // Should be a string
          expect(typeof result).toBe("string");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3f: Booleans return fallback
   *
   * For boolean inputs (true/false):
   * - Should return the fallback string
   * - Should not throw an error
   *
   * **Validates: Requirements 7.1.7**
   */
  it("Property 3f: Booleans return fallback", () => {
    // Test true
    const trueResult = mapUploadError(true);
    expect(trueResult).toBe(FALLBACK_MESSAGE);
    expect(typeof trueResult).toBe("string");

    // Test false
    const falseResult = mapUploadError(false);
    expect(falseResult).toBe(FALLBACK_MESSAGE);
    expect(typeof falseResult).toBe("string");
  });

  /**
   * Property 3g: String inputs work correctly
   *
   * For valid string inputs:
   * - Should return appropriate error message (mapped or fallback)
   * - Should always return a string
   * - Should not throw an error
   *
   * This verifies the function still works correctly for valid inputs.
   *
   * **Validates: Requirements 7.1.7**
   */
  it("Property 3g: String inputs return appropriate messages", () => {
    fc.assert(
      fc.property(fc.string(), (stringInput) => {
        const result = mapUploadError(stringInput);

        // Should always return a string
        expect(typeof result).toBe("string");

        // Should not be empty
        expect(result.length).toBeGreaterThan(0);

        // Should not throw
        expect(() => mapUploadError(stringInput)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3h: Known error strings are mapped correctly
   *
   * For known error strings:
   * - Should return the mapped user-friendly message
   * - Should not return the fallback message
   *
   * **Validates: Requirements 7.1.7**
   */
  it("Property 3h: Known error strings are mapped correctly", () => {
    const knownErrors = [
      {
        input: "File too large",
        expected: "This file is too large. Maximum size is 10MB.",
      },
      {
        input: "Unsupported file type",
        expected:
          "This file type is not supported. Please upload PDF, DOCX, TXT, or MD files.",
      },
      {
        input: "Could not read this file",
        expected:
          "Could not read this file. It may be corrupted or password-protected.",
      },
      {
        input: "Processing timeout",
        expected:
          "Document processing took too long. Please try a smaller file.",
      },
      {
        input: "Invalid file format",
        expected:
          "This file format is invalid. Please upload a valid document.",
      },
    ];

    knownErrors.forEach(({ input, expected }) => {
      const result = mapUploadError(input);
      expect(result).toBe(expected);
      expect(typeof result).toBe("string");
    });
  });

  /**
   * Property 3i: Unknown error strings return fallback
   *
   * For unknown error strings:
   * - Should return the fallback message
   * - Should not throw an error
   *
   * **Validates: Requirements 7.1.7**
   */
  it("Property 3i: Unknown error strings return fallback", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => {
          // Filter out known error strings
          const knownPatterns = [
            "file too large",
            "unsupported file type",
            "could not read",
            "processing timeout",
            "invalid file format",
          ];
          const lowerS = s.toLowerCase();
          return !knownPatterns.some((pattern) => lowerS.includes(pattern));
        }),
        (unknownError) => {
          const result = mapUploadError(unknownError);

          // Should return fallback for unknown errors
          expect(result).toBe(FALLBACK_MESSAGE);

          // Should be a string
          expect(typeof result).toBe("string");
        },
      ),
      { numRuns: 100 },
    );
  });
});
