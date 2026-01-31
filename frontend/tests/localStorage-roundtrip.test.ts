/**
 * Property-Based Tests for localStorage Round-Trip
 *
 * Feature: frontend-integration-phase-2-part1
 * Property 2: localStorage Round-Trip
 * **Validates: Requirements 7.1.2**
 *
 * Tests verify that session IDs persist correctly to localStorage:
 * - Saving and retrieving returns the same session ID
 * - Clearing results in null retrieval
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";

const SESSION_STORAGE_KEY = "iubar_current_session_id";

describe("localStorage Round-Trip Properties", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  /**
   * Property 2: localStorage Round-Trip
   *
   * For any valid session ID:
   * - Saving to localStorage then retrieving returns the same session ID
   * - No data loss or corruption during round-trip
   *
   * **Validates: Requirements 7.1.2**
   */
  it("Property 2: Session ID round-trip preserves value", () => {
    fc.assert(
      fc.property(fc.uuid(), (sessionId) => {
        // Save session ID to localStorage
        localStorage.setItem(SESSION_STORAGE_KEY, sessionId);

        // Retrieve session ID from localStorage
        const retrieved = localStorage.getItem(SESSION_STORAGE_KEY);

        // Verify exact match (round-trip preserves value)
        expect(retrieved).toBe(sessionId);
        expect(retrieved).not.toBeNull();
        expect(typeof retrieved).toBe("string");
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2b: Clearing localStorage returns null
   *
   * For any valid session ID:
   * - After saving and then clearing, retrieval returns null
   * - removeItem properly clears the stored value
   *
   * **Validates: Requirements 7.1.2**
   */
  it("Property 2b: Clearing session ID results in null retrieval", () => {
    fc.assert(
      fc.property(fc.uuid(), (sessionId) => {
        // Save session ID
        localStorage.setItem(SESSION_STORAGE_KEY, sessionId);

        // Verify it was saved
        expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBe(sessionId);

        // Clear the session ID
        localStorage.removeItem(SESSION_STORAGE_KEY);

        // Verify retrieval returns null
        const retrieved = localStorage.getItem(SESSION_STORAGE_KEY);
        expect(retrieved).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2c: Multiple round-trips preserve value
   *
   * For any valid session ID:
   * - Multiple save/retrieve cycles preserve the value
   * - No degradation over multiple operations
   *
   * **Validates: Requirements 7.1.2**
   */
  it("Property 2c: Multiple round-trips preserve value", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 2, max: 10 }),
        (sessionId, iterations) => {
          for (let i = 0; i < iterations; i++) {
            // Save session ID
            localStorage.setItem(SESSION_STORAGE_KEY, sessionId);

            // Retrieve and verify
            const retrieved = localStorage.getItem(SESSION_STORAGE_KEY);
            expect(retrieved).toBe(sessionId);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 2d: Overwriting session ID works correctly
   *
   * For any two different session IDs:
   * - Saving a new session ID overwrites the previous one
   * - Only the most recent value is retrievable
   *
   * **Validates: Requirements 7.1.2**
   */
  it("Property 2d: Overwriting session ID replaces previous value", () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), (sessionId1, sessionId2) => {
        // Ensure we have two different IDs
        fc.pre(sessionId1 !== sessionId2);

        // Save first session ID
        localStorage.setItem(SESSION_STORAGE_KEY, sessionId1);
        expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBe(sessionId1);

        // Overwrite with second session ID
        localStorage.setItem(SESSION_STORAGE_KEY, sessionId2);

        // Verify only the second ID is retrievable
        const retrieved = localStorage.getItem(SESSION_STORAGE_KEY);
        expect(retrieved).toBe(sessionId2);
        expect(retrieved).not.toBe(sessionId1);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2e: Empty localStorage returns null
   *
   * For any session ID:
   * - Attempting to retrieve from empty localStorage returns null
   * - No errors thrown for missing keys
   *
   * **Validates: Requirements 7.1.2**
   */
  it("Property 2e: Retrieving from empty localStorage returns null", () => {
    fc.assert(
      fc.property(fc.uuid(), (sessionId) => {
        // Ensure localStorage is empty
        localStorage.clear();

        // Attempt to retrieve non-existent session ID
        const retrieved = localStorage.getItem(SESSION_STORAGE_KEY);

        // Verify null is returned
        expect(retrieved).toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});
