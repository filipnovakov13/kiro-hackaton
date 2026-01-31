/**
 * Property-Based Tests for ThinkingIndicator Message Display
 *
 * Feature: frontend-integration-phase-2-part1
 * Property 5: ThinkingIndicator Message Display
 * **Validates: Requirements 9.3**
 *
 * Tests verify that ThinkingIndicator displays any string message correctly:
 * - For any string message, the component displays that exact message
 * - The message is rendered in the UI with the correct testid
 * - Empty strings are handled correctly (no message element rendered)
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { render, screen } from "@testing-library/react";
import { ThinkingIndicator } from "../src/components/chat/ThinkingIndicator";

describe("ThinkingIndicator Message Display Properties", () => {
  /**
   * Property 5: ThinkingIndicator Message Display
   *
   * For any string message passed to ThinkingIndicator:
   * - The component should display that exact message in the UI
   * - The message should be accessible via the thinking-message testid
   * - The message content should match exactly what was passed
   *
   * **Validates: Requirements 9.3**
   */
  it("Property 5: Any string message is displayed exactly as provided", () => {
    fc.assert(
      fc.property(fc.string(), (message) => {
        const { unmount } = render(<ThinkingIndicator message={message} />);

        if (message === "") {
          // Empty string should not render message element
          expect(
            screen.queryByTestId("thinking-message"),
          ).not.toBeInTheDocument();
        } else {
          // Non-empty string should render with exact content
          const messageElement = screen.getByTestId("thinking-message");
          expect(messageElement).toBeInTheDocument();
          expect(messageElement.textContent).toBe(message);
        }

        // Cleanup for next iteration
        unmount();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5a: Unicode and special characters are displayed correctly
   *
   * For any string containing unicode or special characters:
   * - The component should display the message without corruption
   * - Special characters should be preserved exactly
   *
   * **Validates: Requirements 9.3**
   */
  it("Property 5a: Unicode and special characters are preserved", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s.length > 0),
        (message) => {
          const { unmount } = render(<ThinkingIndicator message={message} />);

          const messageElement = screen.getByTestId("thinking-message");
          expect(messageElement.textContent).toBe(message);

          // Verify no HTML encoding issues
          expect(messageElement.textContent?.length).toBe(message.length);

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5b: Long messages are displayed completely
   *
   * For any string message of any length:
   * - The entire message should be rendered
   * - No truncation should occur
   *
   * **Validates: Requirements 9.3**
   */
  it("Property 5b: Long messages are displayed without truncation", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 500 }), (message) => {
        const { unmount } = render(<ThinkingIndicator message={message} />);

        const messageElement = screen.getByTestId("thinking-message");
        expect(messageElement.textContent).toBe(message);
        expect(messageElement.textContent?.length).toBe(message.length);

        unmount();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5c: Whitespace is preserved
   *
   * For any string containing whitespace:
   * - Leading, trailing, and internal whitespace should be preserved
   * - The exact whitespace pattern should be maintained
   *
   * **Validates: Requirements 9.3**
   */
  it("Property 5c: Whitespace is preserved in messages", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s.length > 0 && /\s/.test(s)), // Must contain whitespace
        (message) => {
          const { unmount } = render(<ThinkingIndicator message={message} />);

          const messageElement = screen.getByTestId("thinking-message");
          expect(messageElement.textContent).toBe(message);

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5d: Message with different sizes
   *
   * For any string message and any size variant:
   * - The message should be displayed correctly regardless of size
   * - The content should remain unchanged
   *
   * **Validates: Requirements 9.3**
   */
  it("Property 5d: Messages display correctly across all size variants", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s.length > 0),
        fc.constantFrom("small", "medium", "large"),
        (message, size) => {
          const { unmount } = render(
            <ThinkingIndicator
              message={message}
              size={size as "small" | "medium" | "large"}
            />,
          );

          const messageElement = screen.getByTestId("thinking-message");
          expect(messageElement.textContent).toBe(message);

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5e: Default message when undefined
   *
   * When message prop is undefined:
   * - Should display the default "Thinking..." message
   * - Should not crash or render empty
   *
   * **Validates: Requirements 9.3**
   */
  it("Property 5e: Default message is displayed when prop is undefined", () => {
    const { unmount } = render(<ThinkingIndicator />);

    const messageElement = screen.getByTestId("thinking-message");
    expect(messageElement).toBeInTheDocument();
    expect(messageElement.textContent).toBe("Thinking...");

    unmount();
  });

  /**
   * Property 5f: Component always renders container
   *
   * For any message (including empty):
   * - The thinking-indicator container should always be present
   * - The glow dots should always be rendered
   *
   * **Validates: Requirements 9.3**
   */
  it("Property 5f: Container and glow dots always render regardless of message", () => {
    fc.assert(
      fc.property(fc.string(), (message) => {
        const { unmount } = render(<ThinkingIndicator message={message} />);

        // Container should always be present
        expect(screen.getByTestId("thinking-indicator")).toBeInTheDocument();

        // Glow dots should always be present
        expect(screen.getByTestId("glow-dot-1")).toBeInTheDocument();
        expect(screen.getByTestId("glow-dot-2")).toBeInTheDocument();
        expect(screen.getByTestId("glow-dot-3")).toBeInTheDocument();

        unmount();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5g: HTML/Script tags are rendered as text
   *
   * For any string containing HTML or script tags:
   * - Tags should be rendered as plain text, not executed
   * - No XSS vulnerability should exist
   *
   * **Validates: Requirements 9.3**
   */
  it("Property 5g: HTML and script tags are rendered as text, not executed", () => {
    const testCases = [
      "<script>alert('xss')</script>",
      "<img src=x onerror=alert(1)>",
      "<div>Test</div>",
      "<b>Bold</b>",
      "Normal <script>evil</script> text",
    ];

    testCases.forEach((message) => {
      const { unmount } = render(<ThinkingIndicator message={message} />);

      const messageElement = screen.getByTestId("thinking-message");
      // Should render as text, not HTML
      expect(messageElement.textContent).toBe(message);

      unmount();
    });
  });
});
