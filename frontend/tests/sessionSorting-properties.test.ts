/**
 * Property-Based Tests for Session Sorting
 *
 * Feature: frontend-integration-phase-2-part1
 * Property 1: Session Sorting Invariant
 * **Validates: Requirements 7.1.1**
 *
 * Tests verify that sessions are correctly sorted by updated_at DESC,
 * placing the most recently updated session first.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { ChatSession } from "../src/types/chat";

/**
 * Sort sessions by updated_at DESC (most recent first)
 */
function sortSessions(sessions: ChatSession[]): ChatSession[] {
  return [...sessions].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

describe("Session Sorting Properties", () => {
  /**
   * Property 1: Session Sorting Invariant
   *
   * For any array of sessions, sorting by updated_at DESC should:
   * - Place the most recently updated session first
   * - Maintain descending order throughout the array
   * - Be stable for sessions with identical timestamps
   *
   * **Validates: Requirements 7.1.1**
   */
  it("Property 1: Sessions are sorted by updated_at DESC", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            document_id: fc.oneof(fc.uuid(), fc.constant(null)),
            created_at: fc.date().map((d) => d.toISOString()),
            updated_at: fc.date().map((d) => d.toISOString()),
            message_count: fc.integer({ min: 0, max: 1000 }),
          }),
          { minLength: 0, maxLength: 50 },
        ),
        (sessions) => {
          const sorted = sortSessions(sessions);

          // Verify descending order
          for (let i = 0; i < sorted.length - 1; i++) {
            const current = new Date(sorted[i].updated_at).getTime();
            const next = new Date(sorted[i + 1].updated_at).getTime();
            expect(current).toBeGreaterThanOrEqual(next);
          }

          // Verify all sessions are present (no loss)
          expect(sorted.length).toBe(sessions.length);

          // Verify all original sessions are in sorted array
          sessions.forEach((session) => {
            expect(sorted.find((s) => s.id === session.id)).toBeDefined();
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2: Most recent session is first
   *
   * For any non-empty array of sessions with distinct timestamps,
   * the first element after sorting should be the one with the
   * latest updated_at timestamp.
   */
  it("Property 2: Most recent session is always first", () => {
    fc.assert(
      fc.property(
        fc
          .array(
            fc.record({
              id: fc.uuid(),
              document_id: fc.oneof(fc.uuid(), fc.constant(null)),
              created_at: fc.date().map((d) => d.toISOString()),
              updated_at: fc.date().map((d) => d.toISOString()),
              message_count: fc.integer({ min: 0, max: 1000 }),
            }),
            { minLength: 1, maxLength: 50 },
          )
          .filter((sessions) => sessions.length > 0),
        (sessions) => {
          const sorted = sortSessions(sessions);

          // Find the session with the maximum updated_at
          const maxUpdatedAt = Math.max(
            ...sessions.map((s) => new Date(s.updated_at).getTime()),
          );

          // First session should have the maximum updated_at
          const firstSessionTime = new Date(sorted[0].updated_at).getTime();
          expect(firstSessionTime).toBe(maxUpdatedAt);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3: Sorting is stable for identical timestamps
   *
   * For sessions with identical updated_at timestamps,
   * the relative order should be preserved (stable sort).
   */
  it("Property 3: Sorting is stable for identical timestamps", () => {
    fc.assert(
      fc.property(
        fc.date().map((d) => d.toISOString()),
        fc.array(fc.uuid(), { minLength: 2, maxLength: 10 }),
        (timestamp, ids) => {
          // Create sessions with identical timestamps but different IDs
          const sessions: ChatSession[] = ids.map((id) => ({
            id,
            document_id: null,
            created_at: timestamp,
            updated_at: timestamp,
            message_count: 0,
          }));

          const sorted = sortSessions(sessions);

          // Verify all sessions have the same timestamp
          sorted.forEach((session) => {
            expect(session.updated_at).toBe(timestamp);
          });

          // Verify order is preserved (stable sort)
          // JavaScript's sort is stable as of ES2019
          expect(sorted.map((s) => s.id)).toEqual(ids);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4: Empty array handling
   *
   * Sorting an empty array should return an empty array.
   */
  it("Property 4: Empty array returns empty array", () => {
    const sorted = sortSessions([]);
    expect(sorted).toEqual([]);
    expect(sorted.length).toBe(0);
  });

  /**
   * Property 5: Single session handling
   *
   * Sorting a single-element array should return the same array.
   */
  it("Property 5: Single session returns unchanged", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          document_id: fc.oneof(fc.uuid(), fc.constant(null)),
          created_at: fc.date().map((d) => d.toISOString()),
          updated_at: fc.date().map((d) => d.toISOString()),
          message_count: fc.integer({ min: 0, max: 1000 }),
        }),
        (session) => {
          const sorted = sortSessions([session]);
          expect(sorted.length).toBe(1);
          expect(sorted[0]).toEqual(session);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6: Sorting does not mutate original array
   *
   * The original array should remain unchanged after sorting.
   */
  it("Property 6: Original array is not mutated", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            document_id: fc.oneof(fc.uuid(), fc.constant(null)),
            created_at: fc.date().map((d) => d.toISOString()),
            updated_at: fc.date().map((d) => d.toISOString()),
            message_count: fc.integer({ min: 0, max: 1000 }),
          }),
          { minLength: 2, maxLength: 20 },
        ),
        (sessions) => {
          // Create a copy to compare against
          const original = JSON.parse(JSON.stringify(sessions));

          // Sort the sessions
          sortSessions(sessions);

          // Verify original array is unchanged
          expect(sessions).toEqual(original);
        },
      ),
      { numRuns: 100 },
    );
  });
});
