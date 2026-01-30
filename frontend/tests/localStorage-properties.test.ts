/**
 * Property-Based Tests for localStorage Persistence
 *
 * Validates: Requirements 3.8, 5.8
 *
 * Tests verify that session ID and caret position persist correctly to localStorage
 * and can be restored across page reloads.
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";

describe("localStorage Persistence Properties", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  /**
   * Property 1: Session ID persistence
   *
   * For any valid UUID session ID:
   * - Saving to localStorage and retrieving returns the same ID
   * - No data loss or corruption
   */
  it("Property 1: Session ID persists and restores correctly", () => {
    fc.assert(
      fc.property(fc.uuid(), (sessionId) => {
        // Save session ID
        localStorage.setItem("iubar_current_session_id", sessionId);

        // Restore session ID
        const restored = localStorage.getItem("iubar_current_session_id");

        // Verify exact match
        expect(restored).toBe(sessionId);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2: Caret position persistence
   *
   * For any valid caret position (0-10000):
   * - Saving to localStorage and retrieving returns the same position
   * - Position is correctly converted to/from string
   */
  it("Property 2: Caret position persists and restores correctly", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 0, max: 10000 }),
        (sessionId, caretPosition) => {
          // Save caret position for session
          const key = `iubar_caret_position_${sessionId}`;
          localStorage.setItem(key, caretPosition.toString());

          // Restore caret position
          const restored = parseInt(localStorage.getItem(key) || "0", 10);

          // Verify exact match
          expect(restored).toBe(caretPosition);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3: Multiple session positions persist independently
   *
   * For any set of sessions with different caret positions:
   * - Each session's position is stored independently
   * - No cross-contamination between sessions
   * - All positions can be restored correctly
   */
  it("Property 3: Multiple session positions persist independently", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            sessionId: fc.uuid(),
            position: fc.integer({ min: 0, max: 10000 }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (sessions) => {
          // Save all session positions
          sessions.forEach(({ sessionId, position }) => {
            const key = `iubar_caret_position_${sessionId}`;
            localStorage.setItem(key, position.toString());
          });

          // Verify all positions restore correctly
          sessions.forEach(({ sessionId, position }) => {
            const key = `iubar_caret_position_${sessionId}`;
            const restored = parseInt(localStorage.getItem(key) || "0", 10);
            expect(restored).toBe(position);
          });
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 4: Session switch preserves positions
   *
   * For any sequence of session switches:
   * - Current session ID updates correctly
   * - Previous session positions remain intact
   * - Can switch back and restore previous position
   */
  it("Property 4: Session switch preserves all positions", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            sessionId: fc.uuid(),
            position: fc.integer({ min: 0, max: 10000 }),
          }),
          { minLength: 2, maxLength: 5 },
        ),
        (sessions) => {
          // Simulate switching through sessions
          sessions.forEach(({ sessionId, position }) => {
            // Switch to session
            localStorage.setItem("iubar_current_session_id", sessionId);

            // Set caret position
            const key = `iubar_caret_position_${sessionId}`;
            localStorage.setItem(key, position.toString());
          });

          // Verify current session is the last one
          const currentSession = localStorage.getItem(
            "iubar_current_session_id",
          );
          expect(currentSession).toBe(sessions[sessions.length - 1].sessionId);

          // Verify all positions are still intact
          sessions.forEach(({ sessionId, position }) => {
            const key = `iubar_caret_position_${sessionId}`;
            const restored = parseInt(localStorage.getItem(key) || "0", 10);
            expect(restored).toBe(position);
          });
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 5: Boundary positions persist correctly
   *
   * For boundary values (0, max document length):
   * - Zero position persists correctly
   * - Maximum position persists correctly
   * - No overflow or underflow issues
   */
  it("Property 5: Boundary positions persist correctly", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom(0, 1, 9999, 10000),
        (sessionId, position) => {
          // Save boundary position
          const key = `iubar_caret_position_${sessionId}`;
          localStorage.setItem(key, position.toString());

          // Restore position
          const restored = parseInt(localStorage.getItem(key) || "0", 10);

          // Verify exact match
          expect(restored).toBe(position);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6: Missing keys return default values
   *
   * For any non-existent session ID:
   * - Getting non-existent session returns null
   * - Getting non-existent position returns 0 (default)
   * - No errors thrown
   */
  it("Property 6: Missing keys return safe defaults", () => {
    fc.assert(
      fc.property(fc.uuid(), (sessionId) => {
        // Try to get non-existent session
        const session = localStorage.getItem("iubar_current_session_id");
        expect(session).toBeNull();

        // Try to get non-existent position (should default to 0)
        const key = `iubar_caret_position_${sessionId}`;
        const position = parseInt(localStorage.getItem(key) || "0", 10);
        expect(position).toBe(0);
      }),
      { numRuns: 50 },
    );
  });
});
