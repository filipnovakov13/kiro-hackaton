/**
 * Property-Based Tests for useDocumentUpload Hook
 *
 * Tests universal properties that must hold for all inputs using fast-check.
 * Validates: Requirement 2.2 (Upload status polling)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDocumentUpload } from "../src/hooks/useDocumentUpload";
import * as api from "../src/services/api";
import * as fc from "fast-check";

vi.mock("../src/services/api");

describe("useDocumentUpload - Property-Based Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  /**
   * Property 1: Upload Polling Intervals
   *
   * **Validates: Requirement 2.2**
   *
   * Property: Status polling continues every 2 seconds until status is 'complete' or 'error'.
   *
   * For any number of poll attempts (1-10), the hook should:
   * 1. Poll at exactly 2-second intervals
   * 2. Call getTaskStatus the correct number of times
   * 3. Stop polling when status becomes 'complete'
   */
  it("property: polls at 2-second intervals for any poll count", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 10 }), async (pollCount) => {
        // Clear mocks for this iteration
        vi.clearAllMocks();

        // Setup: Create mock responses (N processing, then complete)
        const responses = Array(pollCount).fill({
          status: "chunking" as const,
          progress: "Processing...",
          error: null,
          document_id: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        responses.push({
          status: "complete" as const,
          progress: "Complete",
          error: null,
          document_id: "doc-123",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        let callIndex = 0;
        vi.mocked(api.getTaskStatus).mockImplementation(async () => {
          const response = responses[callIndex];
          callIndex++;
          return response;
        });

        vi.mocked(api.uploadDocument).mockResolvedValue({
          task_id: "task-123",
          status: "pending",
        });

        // Execute: Upload file and advance timers
        const { result } = renderHook(() => useDocumentUpload());

        const uploadPromise = result.current.uploadFile(
          new File(["test"], "test.txt"),
        );

        // Initial poll happens immediately
        await vi.runOnlyPendingTimersAsync();

        // Advance through all polling intervals
        for (let i = 0; i < pollCount; i++) {
          await vi.advanceTimersByTimeAsync(2000);
        }

        await uploadPromise;

        // Verify: Correct number of polls (initial + N intervals)
        const mockGetTaskStatus = vi.mocked(api.getTaskStatus);
        expect(mockGetTaskStatus).toHaveBeenCalledTimes(pollCount + 1);

        // Verify: All calls used correct task ID
        for (let i = 0; i <= pollCount; i++) {
          expect(mockGetTaskStatus).toHaveBeenNthCalledWith(i + 1, "task-123");
        }

        // Verify: Final status is complete
        expect(result.current.status).toBe("complete");
        expect(result.current.documentId).toBe("doc-123");
        expect(result.current.isUploading).toBe(false);
      }),
      { numRuns: 20 }, // Test with 20 random poll counts
    );
  });

  /**
   * Property 2: Polling Stops on Error
   *
   * **Validates: Requirement 2.2**
   *
   * Property: Polling stops immediately when status becomes 'error'.
   *
   * For any number of successful polls before error (0-10), the hook should:
   * 1. Stop polling when error status received
   * 2. Not make additional polls after error
   * 3. Set error state correctly
   */
  it("property: stops polling on error for any error position", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 10 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (pollsBeforeError, errorMessage) => {
          // Clear mocks for this iteration
          vi.clearAllMocks();

          // Setup: Create mock responses (N chunking, then error)
          const responses = Array(pollsBeforeError).fill({
            status: "chunking" as const,
            progress: "Processing...",
            error: null,
            document_id: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          responses.push({
            status: "error" as const,
            progress: "",
            error: errorMessage,
            document_id: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          let callIndex = 0;
          vi.mocked(api.getTaskStatus).mockImplementation(async () => {
            const response = responses[callIndex];
            callIndex++;
            return response;
          });

          vi.mocked(api.uploadDocument).mockResolvedValue({
            task_id: "task-456",
            status: "pending",
          });

          // Execute: Upload file and advance timers
          const { result } = renderHook(() => useDocumentUpload());

          const uploadPromise = result.current.uploadFile(
            new File(["test"], "test.txt"),
          );

          // Initial poll
          await vi.runOnlyPendingTimersAsync();

          // Advance through all polling intervals until error
          for (let i = 0; i < pollsBeforeError; i++) {
            await vi.advanceTimersByTimeAsync(2000);
          }

          await uploadPromise;

          // Verify: Correct number of polls (stopped at error)
          const mockGetTaskStatus = vi.mocked(api.getTaskStatus);
          expect(mockGetTaskStatus).toHaveBeenCalledTimes(pollsBeforeError + 1);

          // Verify: Error state set correctly
          expect(result.current.status).toBe("error");
          expect(result.current.error).toBe(errorMessage);
          expect(result.current.isUploading).toBe(false);

          // Verify: No additional polls after error
          const callsBefore = mockGetTaskStatus.mock.calls.length;
          await vi.advanceTimersByTimeAsync(10000); // Advance 10 seconds
          expect(mockGetTaskStatus).toHaveBeenCalledTimes(callsBefore);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 3: Polling Interval Consistency
   *
   * **Validates: Requirement 2.2**
   *
   * Property: Each poll happens exactly 2000ms after the previous poll.
   *
   * For any sequence of polls, the time between consecutive polls should be 2000ms.
   */
  it("property: maintains 2000ms interval between all consecutive polls", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 8 }), async (pollCount) => {
        // Setup: Track call timestamps
        const callTimestamps: number[] = [];

        const responses = Array(pollCount).fill({
          status: "chunking" as const,
          progress: "Processing...",
          error: null,
          document_id: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        responses.push({
          status: "complete" as const,
          progress: "Complete",
          error: null,
          document_id: "doc-789",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        let callIndex = 0;
        vi.mocked(api.getTaskStatus).mockImplementation(async () => {
          callTimestamps.push(Date.now());
          const response = responses[callIndex];
          callIndex++;
          return response;
        });

        vi.mocked(api.uploadDocument).mockResolvedValue({
          task_id: "task-789",
          status: "pending",
        });

        // Execute: Upload and advance timers
        const { result } = renderHook(() => useDocumentUpload());

        const uploadPromise = result.current.uploadFile(
          new File(["test"], "test.txt"),
        );

        // Initial poll
        await vi.runOnlyPendingTimersAsync();

        // Advance through all intervals
        for (let i = 0; i < pollCount; i++) {
          await vi.advanceTimersByTimeAsync(2000);
        }

        await uploadPromise;

        // Verify: Check intervals between consecutive calls
        for (let i = 1; i < callTimestamps.length; i++) {
          const interval = callTimestamps[i] - callTimestamps[i - 1];
          expect(interval).toBe(2000);
        }
      }),
      { numRuns: 15 },
    );
  });

  /**
   * Property 4: Polling Cleanup on Unmount
   *
   * **Validates: Requirement 2.2**
   *
   * Property: Polling stops when component unmounts, preventing memory leaks.
   *
   * For any poll count, unmounting should stop all polling immediately.
   */
  it("property: stops polling on unmount at any point", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (pollsBeforeUnmount) => {
          // Setup: Create long-running chunking
          vi.mocked(api.getTaskStatus).mockResolvedValue({
            status: "chunking" as const,
            progress: "Processing...",
            error: null,
            document_id: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          vi.mocked(api.uploadDocument).mockResolvedValue({
            task_id: "task-cleanup",
            status: "pending",
          });

          // Execute: Upload and unmount after N polls
          const { result, unmount } = renderHook(() => useDocumentUpload());

          result.current.uploadFile(new File(["test"], "test.txt"));

          // Initial poll
          await vi.runOnlyPendingTimersAsync();

          // Advance through some intervals
          for (let i = 0; i < pollsBeforeUnmount; i++) {
            await vi.advanceTimersByTimeAsync(2000);
          }

          const mockGetTaskStatus = vi.mocked(api.getTaskStatus);
          const callsBeforeUnmount = mockGetTaskStatus.mock.calls.length;

          // Unmount component
          unmount();

          // Verify: No additional polls after unmount
          await vi.advanceTimersByTimeAsync(10000); // Advance 10 seconds
          expect(mockGetTaskStatus).toHaveBeenCalledTimes(callsBeforeUnmount);
        },
      ),
      { numRuns: 15 },
    );
  });
});
