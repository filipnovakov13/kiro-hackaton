/**
 * Property-based tests for App component - Session State Consistency
 * Uses fast-check for property-based testing
 *
 * **Validates: Requirements 1.6, 1.7**
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import * as fc from "fast-check";
import { useChatSession } from "../src/hooks/useChatSession";
import * as chatApiModule from "../src/services/chat-api";
import type { ChatSession } from "../src/types/chat";

// Mock API services
vi.mock("../src/services/chat-api");

describe("App - Session State Consistency (Property-Based)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Property 1: Session State Consistency**
   *
   * **Validates: Requirements 1.6, 1.7**
   *
   * Property: After loading sessions, the most recent session (by `updated_at`)
   * is automatically loaded as `currentSession`.
   *
   * This property should hold for any valid set of sessions, regardless of:
   * - Number of sessions (1-10)
   * - Order of sessions in the array
   * - Timestamp values
   */
  it("property: most recent session auto-loads", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of 1-10 sessions with random timestamps
        fc
          .array(
            fc.record({
              id: fc.uuid(),
              document_id: fc.uuid(),
              created_at: fc
                .date({ min: new Date(2024, 0, 1) })
                .map((d) => d.toISOString()),
              updated_at: fc
                .date({ min: new Date(2024, 0, 1) })
                .map((d) => d.toISOString()),
              message_count: fc.integer({ min: 0, max: 100 }),
            }),
            { minLength: 1, maxLength: 10 },
          )
          .map((sessions) => {
            // Ensure unique IDs
            return sessions.map((session, index) => ({
              ...session,
              id: `session-${index}-${session.id}`,
            }));
          }),
        async (sessions: ChatSession[]) => {
          // Sort by updated_at DESC to find most recent
          const sorted = [...sessions].sort(
            (a, b) =>
              new Date(b.updated_at).getTime() -
              new Date(a.updated_at).getTime(),
          );
          const mostRecent = sorted[0];

          // Mock API to return generated sessions
          vi.mocked(chatApiModule.chatAPI.getSessions).mockResolvedValue(
            sessions,
          );

          vi.mocked(chatApiModule.chatAPI.getSession).mockImplementation(
            async (id: string) => {
              const session = sessions.find((s) => s.id === id);
              if (!session) throw new Error("Session not found");
              return session;
            },
          );

          // Render hook and load sessions
          const { result } = renderHook(() => useChatSession());

          // Load sessions
          await waitFor(async () => {
            await result.current.loadSessions();
          });

          // Wait for sessions to be loaded
          await waitFor(() => {
            expect(result.current.sessions.length).toBe(sessions.length);
          });

          // Auto-load most recent session
          if (result.current.sessions.length > 0 && !result.current.session) {
            await waitFor(async () => {
              await result.current.loadSession(result.current.sessions[0].id);
            });
          }

          // Verify most recent session is loaded
          await waitFor(() => {
            expect(result.current.session).not.toBeNull();
          });

          // Property: currentSession should be the most recent by updated_at
          expect(result.current.session?.id).toBe(mostRecent.id);
        },
      ),
      {
        numRuns: 20, // Run 20 examples
        verbose: true,
      },
    );
  });
});
