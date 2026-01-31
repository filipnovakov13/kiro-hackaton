/**
 * Property-based tests for useStreamingMessage hook
 *
 * **Validates: Requirements 4.2, 4.3**
 *
 * These tests verify that SSE token accumulation maintains correctness
 * properties across all possible token streams - no loss, no duplication,
 * correct ordering.
 */

import { describe, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStreamingMessage } from "../src/hooks/useStreamingMessage";
import { SSEClient } from "../src/services/sse-client";
import * as fc from "fast-check";

// Mock SSEClient
vi.mock("../src/services/sse-client", () => {
  return {
    SSEClient: vi.fn(),
  };
});

describe("useStreamingMessage - Property-Based Tests", () => {
  let mockSSEClient: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock SSE client
    mockSSEClient = {
      connect: vi.fn(),
      close: vi.fn(),
      onToken: vi.fn(),
      onSource: vi.fn(),
      onDone: vi.fn(),
      onError: vi.fn(),
    };

    // Mock SSEClient constructor
    vi.mocked(SSEClient).mockImplementation(() => mockSSEClient as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property: Token accumulation preserves all tokens in order
   *
   * **Validates: Requirements 4.2, 4.3**
   *
   * For any sequence of token strings:
   * - All tokens are accumulated in the message
   * - Tokens appear in the exact order they were received
   * - No tokens are lost
   * - No tokens are duplicated
   * - Final message = concatenation of all tokens
   */
  it("property: token accumulation preserves all tokens in order", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of 1-50 random token strings
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
          minLength: 1,
          maxLength: 50,
        }),
        async (tokens) => {
          const { result } = renderHook(() =>
            useStreamingMessage("session-test"),
          );

          // Send message to trigger streaming
          await act(async () => {
            await result.current.sendMessage("test message");
          });

          // Get the onToken callback (use the LAST call since mock accumulates)
          const callIndex = mockSSEClient.onToken.mock.calls.length - 1;
          const onTokenCallback =
            mockSSEClient.onToken.mock.calls[callIndex][0];

          // Simulate receiving all tokens
          for (const token of tokens) {
            act(() => {
              onTokenCallback(token);
            });
          }

          // Property: Final message should be exact concatenation of all tokens
          const expectedMessage = tokens.join("");
          const actualMessage = result.current.message;

          if (actualMessage !== expectedMessage) {
            throw new Error(
              `Token accumulation failed:\n` +
                `Expected: "${expectedMessage}"\n` +
                `Got: "${actualMessage}"\n` +
                `Tokens: ${JSON.stringify(tokens)}`,
            );
          }

          // Property: Message length should equal sum of token lengths
          const expectedLength = tokens.reduce(
            (sum, token) => sum + token.length,
            0,
          );
          if (actualMessage.length !== expectedLength) {
            throw new Error(
              `Message length mismatch: expected ${expectedLength}, got ${actualMessage.length}`,
            );
          }

          // Property: Each token should appear in the message in order
          let position = 0;
          for (const token of tokens) {
            const foundIndex = actualMessage.indexOf(token, position);
            if (foundIndex !== position) {
              throw new Error(
                `Token "${token}" not found at expected position ${position}, found at ${foundIndex}`,
              );
            }
            position += token.length;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Empty tokens don't affect accumulation
   *
   * **Validates: Requirement 4.2**
   *
   * Empty string tokens should not break accumulation or add extra characters.
   */
  it("property: empty tokens don't affect accumulation", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array with mix of empty and non-empty tokens
        fc.array(
          fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 10 })),
          { minLength: 5, maxLength: 30 },
        ),
        async (tokens) => {
          const { result } = renderHook(() =>
            useStreamingMessage("session-test"),
          );

          await act(async () => {
            await result.current.sendMessage("test");
          });

          const callIndex = mockSSEClient.onToken.mock.calls.length - 1;
          const onTokenCallback =
            mockSSEClient.onToken.mock.calls[callIndex][0];

          for (const token of tokens) {
            act(() => {
              onTokenCallback(token);
            });
          }

          // Property: Final message should equal concatenation (empty strings have no effect)
          const expectedMessage = tokens.join("");
          const actualMessage = result.current.message;

          if (actualMessage !== expectedMessage) {
            throw new Error(
              `Empty token handling failed:\n` +
                `Expected: "${expectedMessage}"\n` +
                `Got: "${actualMessage}"`,
            );
          }

          // Property: Non-empty tokens should all be present
          const nonEmptyTokens = tokens.filter((t) => t.length > 0);
          let position = 0;
          for (const token of nonEmptyTokens) {
            const foundIndex = actualMessage.indexOf(token, position);
            if (foundIndex !== position) {
              throw new Error(
                `Non-empty token "${token}" not found at position ${position}`,
              );
            }
            position += token.length;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Token accumulation is idempotent per token
   *
   * **Validates: Requirement 4.3**
   *
   * Each token callback should add exactly that token once, no more, no less.
   */
  it("property: each token callback adds exactly one token", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 15 }), {
          minLength: 1,
          maxLength: 30,
        }),
        async (tokens) => {
          const { result } = renderHook(() =>
            useStreamingMessage("session-test"),
          );

          await act(async () => {
            await result.current.sendMessage("test");
          });

          const callIndex = mockSSEClient.onToken.mock.calls.length - 1;
          const onTokenCallback =
            mockSSEClient.onToken.mock.calls[callIndex][0];

          // Track message after each token
          const messageSnapshots: string[] = [];

          for (const token of tokens) {
            const messageBefore = result.current.message;

            act(() => {
              onTokenCallback(token);
            });

            const messageAfter = result.current.message;
            messageSnapshots.push(messageAfter);

            // Property: Message should grow by exactly the token length
            const growth = messageAfter.length - messageBefore.length;
            if (growth !== token.length) {
              throw new Error(
                `Token "${token}" caused incorrect growth: expected ${token.length}, got ${growth}`,
              );
            }

            // Property: New content should be exactly the token
            const addedContent = messageAfter.substring(messageBefore.length);
            if (addedContent !== token) {
              throw new Error(
                `Token "${token}" was not added correctly: got "${addedContent}"`,
              );
            }
          }

          // Property: Final message should match last snapshot
          const finalMessage = result.current.message;
          const lastSnapshot = messageSnapshots[messageSnapshots.length - 1];
          if (finalMessage !== lastSnapshot) {
            throw new Error(
              `Final message doesn't match last snapshot:\n` +
                `Final: "${finalMessage}"\n` +
                `Last snapshot: "${lastSnapshot}"`,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Token accumulation handles special characters correctly
   *
   * **Validates: Requirement 4.2**
   *
   * Special characters (unicode, emojis, newlines, etc.) should be
   * accumulated correctly without corruption.
   */
  it("property: special characters are accumulated correctly", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 10 }), // Regular strings
            fc.constant("\n"), // Newlines
            fc.constant("\t"), // Tabs
            fc.constant("🚀"), // Emojis
            fc.constant("中文"), // Unicode
            fc.constant("'\""), // Quotes
            fc.constant("\\"), // Backslash
          ),
          { minLength: 5, maxLength: 25 },
        ),
        async (tokens) => {
          const { result } = renderHook(() =>
            useStreamingMessage("session-test"),
          );

          await act(async () => {
            await result.current.sendMessage("test");
          });

          const callIndex = mockSSEClient.onToken.mock.calls.length - 1;
          const onTokenCallback =
            mockSSEClient.onToken.mock.calls[callIndex][0];

          for (const token of tokens) {
            act(() => {
              onTokenCallback(token);
            });
          }

          // Property: All special characters should be preserved
          const expectedMessage = tokens.join("");
          const actualMessage = result.current.message;

          if (actualMessage !== expectedMessage) {
            throw new Error(
              `Special character handling failed:\n` +
                `Expected: ${JSON.stringify(expectedMessage)}\n` +
                `Got: ${JSON.stringify(actualMessage)}`,
            );
          }

          // Property: Character count should match
          if (actualMessage.length !== expectedMessage.length) {
            throw new Error(
              `Character count mismatch: expected ${expectedMessage.length}, got ${actualMessage.length}`,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Message resets correctly between sends
   *
   * **Validates: Requirement 4.2**
   *
   * When sending a new message, the previous accumulated tokens should
   * be cleared, and new tokens should start fresh.
   */
  it("property: message resets between sends", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two separate token arrays
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), {
          minLength: 1,
          maxLength: 15,
        }),
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), {
          minLength: 1,
          maxLength: 15,
        }),
        async (firstTokens, secondTokens) => {
          const { result } = renderHook(() =>
            useStreamingMessage("session-test"),
          );

          // First message
          await act(async () => {
            await result.current.sendMessage("first message");
          });

          let callIndex = mockSSEClient.onToken.mock.calls.length - 1;
          let onTokenCallback = mockSSEClient.onToken.mock.calls[callIndex][0];
          let onDoneCallback =
            mockSSEClient.onDone.mock.calls[
              mockSSEClient.onDone.mock.calls.length - 1
            ][0];

          for (const token of firstTokens) {
            act(() => {
              onTokenCallback(token);
            });
          }

          const firstMessage = result.current.message;
          const expectedFirstMessage = firstTokens.join("");

          if (firstMessage !== expectedFirstMessage) {
            throw new Error(
              `First message accumulation failed: expected "${expectedFirstMessage}", got "${firstMessage}"`,
            );
          }

          // Complete first message
          act(() => {
            onDoneCallback({ tokens: 100, cost: 0.001 });
          });

          // Second message - should reset
          await act(async () => {
            await result.current.sendMessage("second message");
          });

          callIndex = mockSSEClient.onToken.mock.calls.length - 1;
          onTokenCallback = mockSSEClient.onToken.mock.calls[callIndex][0];

          for (const token of secondTokens) {
            act(() => {
              onTokenCallback(token);
            });
          }

          const secondMessage = result.current.message;
          const expectedSecondMessage = secondTokens.join("");

          // Property: Second message should NOT contain first message
          if (secondMessage.includes(firstMessage) && firstMessage.length > 0) {
            throw new Error(
              `Second message contains first message - reset failed:\n` +
                `First: "${firstMessage}"\n` +
                `Second: "${secondMessage}"`,
            );
          }

          // Property: Second message should be exactly the second tokens
          if (secondMessage !== expectedSecondMessage) {
            throw new Error(
              `Second message accumulation failed:\n` +
                `Expected: "${expectedSecondMessage}"\n` +
                `Got: "${secondMessage}"`,
            );
          }
        },
      ),
      { numRuns: 50 }, // Fewer runs due to complexity
    );
  });
});
