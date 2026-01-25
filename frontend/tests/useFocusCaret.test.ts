/**
 * Unit tests for useFocusCaret hook
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFocusCaret } from "../src/hooks/useFocusCaret";

describe("useFocusCaret", () => {
  const sampleText =
    "The quick brown fox jumps over the lazy dog. This is a sample text for testing the focus caret functionality. It should be long enough to test context extraction properly.";

  describe("initial state", () => {
    it("should have null position initially", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      expect(result.current.position).toBeNull();
      expect(result.current.context).toBe("");
      expect(result.current.focusContext).toBeNull();
    });
  });

  describe("placeCaret", () => {
    it("should place caret at valid position", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(10);
      });

      expect(result.current.position).toBe(10);
      expect(result.current.context).toBeTruthy();
      expect(result.current.focusContext).not.toBeNull();
    });

    it("should extract context around position", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(50);
      });

      expect(result.current.context).toContain("fox");
      expect(result.current.context).toContain("lazy");
    });

    it("should create focus context with correct boundaries", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(50);
      });

      const fc = result.current.focusContext;
      expect(fc).not.toBeNull();
      expect(fc!.start_char).toBeLessThanOrEqual(50);
      expect(fc!.end_char).toBeGreaterThanOrEqual(50);
      expect(fc!.context_text).toBeTruthy();
    });

    it("should handle position at start of text", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(0);
      });

      expect(result.current.position).toBe(0);
      expect(result.current.focusContext).not.toBeNull();
      expect(result.current.focusContext!.start_char).toBe(0);
    });

    it("should handle position at end of text", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(sampleText.length);
      });

      expect(result.current.position).toBe(sampleText.length);
      expect(result.current.focusContext).not.toBeNull();
      expect(result.current.focusContext!.end_char).toBe(sampleText.length);
    });

    it("should ignore negative positions", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(-10);
      });

      expect(result.current.position).toBeNull();
    });

    it("should ignore positions beyond text length", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(sampleText.length + 100);
      });

      expect(result.current.position).toBeNull();
    });

    it("should extract ±150 chars context", () => {
      const longText = "a".repeat(500);
      const { result } = renderHook(() => useFocusCaret(longText));

      act(() => {
        result.current.placeCaret(250);
      });

      const fc = result.current.focusContext;
      expect(fc).not.toBeNull();
      expect(fc!.start_char).toBe(100); // 250 - 150
      expect(fc!.end_char).toBe(400); // 250 + 150
      expect(fc!.context_text.length).toBe(300); // 150 + 150
    });
  });

  describe("moveCaretLeft", () => {
    it("should move caret left by one character", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(50);
      });

      expect(result.current.position).toBe(50);

      act(() => {
        result.current.moveCaretLeft();
      });

      expect(result.current.position).toBe(49);
    });

    it("should update context after moving left", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(50);
      });

      const contextBefore = result.current.context;

      act(() => {
        result.current.moveCaretLeft();
      });

      // Context should be updated (might be slightly different)
      expect(result.current.context).toBeTruthy();
    });

    it("should not move left from position 0", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(0);
      });

      act(() => {
        result.current.moveCaretLeft();
      });

      expect(result.current.position).toBe(0);
    });

    it("should not move left when position is null", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.moveCaretLeft();
      });

      expect(result.current.position).toBeNull();
    });

    it("should handle multiple left moves", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(10);
      });

      act(() => {
        result.current.moveCaretLeft();
      });

      act(() => {
        result.current.moveCaretLeft();
      });

      act(() => {
        result.current.moveCaretLeft();
      });

      expect(result.current.position).toBe(7);
    });
  });

  describe("moveCaretRight", () => {
    it("should move caret right by one character", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(50);
      });

      expect(result.current.position).toBe(50);

      act(() => {
        result.current.moveCaretRight();
      });

      expect(result.current.position).toBe(51);
    });

    it("should update context after moving right", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(50);
      });

      act(() => {
        result.current.moveCaretRight();
      });

      expect(result.current.context).toBeTruthy();
      expect(result.current.focusContext).not.toBeNull();
    });

    it("should not move right from end of text", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(sampleText.length);
      });

      act(() => {
        result.current.moveCaretRight();
      });

      expect(result.current.position).toBe(sampleText.length);
    });

    it("should not move right when position is null", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.moveCaretRight();
      });

      expect(result.current.position).toBeNull();
    });

    it("should handle multiple right moves", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(10);
      });

      act(() => {
        result.current.moveCaretRight();
      });

      act(() => {
        result.current.moveCaretRight();
      });

      act(() => {
        result.current.moveCaretRight();
      });

      expect(result.current.position).toBe(13);
    });
  });

  describe("clearCaret", () => {
    it("should clear caret position and context", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(50);
      });

      expect(result.current.position).toBe(50);
      expect(result.current.context).toBeTruthy();
      expect(result.current.focusContext).not.toBeNull();

      act(() => {
        result.current.clearCaret();
      });

      expect(result.current.position).toBeNull();
      expect(result.current.context).toBe("");
      expect(result.current.focusContext).toBeNull();
    });

    it("should handle clearing when already null", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.clearCaret();
      });

      expect(result.current.position).toBeNull();
      expect(result.current.context).toBe("");
      expect(result.current.focusContext).toBeNull();
    });
  });

  describe("keyboard navigation", () => {
    it("should navigate left and right", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(50);
      });

      act(() => {
        result.current.moveCaretRight();
      });

      act(() => {
        result.current.moveCaretRight();
      });

      expect(result.current.position).toBe(52);

      act(() => {
        result.current.moveCaretLeft();
      });

      expect(result.current.position).toBe(51);
    });

    it("should maintain context during navigation", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(50);
      });

      act(() => {
        result.current.moveCaretRight();
      });

      expect(result.current.focusContext).not.toBeNull();
      expect(result.current.focusContext!.context_text).toBeTruthy();
    });
  });

  describe("edge cases", () => {
    it("should handle empty document text", () => {
      const { result } = renderHook(() => useFocusCaret(""));

      act(() => {
        result.current.placeCaret(0);
      });

      expect(result.current.position).toBe(0);
      expect(result.current.context).toBe("");
    });

    it("should handle very short text", () => {
      const shortText = "Hi";
      const { result } = renderHook(() => useFocusCaret(shortText));

      act(() => {
        result.current.placeCaret(1);
      });

      expect(result.current.position).toBe(1);
      expect(result.current.context).toBe("Hi");
      expect(result.current.focusContext!.context_text).toBe("Hi");
    });

    it("should handle text exactly 300 chars (2 * 150)", () => {
      const exactText = "a".repeat(300);
      const { result } = renderHook(() => useFocusCaret(exactText));

      act(() => {
        result.current.placeCaret(150);
      });

      const fc = result.current.focusContext;
      expect(fc).not.toBeNull();
      expect(fc!.start_char).toBe(0);
      expect(fc!.end_char).toBe(300);
      expect(fc!.context_text.length).toBe(300);
    });

    it("should update when document text changes", () => {
      const { result, rerender } = renderHook(
        ({ text }) => useFocusCaret(text),
        { initialProps: { text: "Initial text" } },
      );

      act(() => {
        result.current.placeCaret(5);
      });

      expect(result.current.context).toContain("Initial");

      // Change document text
      rerender({ text: "Updated text content" });

      act(() => {
        result.current.placeCaret(5);
      });

      expect(result.current.context).toContain("Updated");
    });
  });

  describe("focusContext structure", () => {
    it("should have correct FocusContext structure", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(50);
      });

      const fc = result.current.focusContext;
      expect(fc).not.toBeNull();
      expect(fc).toHaveProperty("start_char");
      expect(fc).toHaveProperty("end_char");
      expect(fc).toHaveProperty("context_text");
      expect(typeof fc!.start_char).toBe("number");
      expect(typeof fc!.end_char).toBe("number");
      expect(typeof fc!.context_text).toBe("string");
    });

    it("should have start_char <= position <= end_char", () => {
      const { result } = renderHook(() => useFocusCaret(sampleText));

      act(() => {
        result.current.placeCaret(75);
      });

      const fc = result.current.focusContext;
      expect(fc).not.toBeNull();
      expect(fc!.start_char).toBeLessThanOrEqual(75);
      expect(fc!.end_char).toBeGreaterThanOrEqual(75);
    });
  });
});
