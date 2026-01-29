/**
 * React hook for managing focus caret position in documents.
 * Handles caret placement, keyboard navigation, and context extraction.
 */

import { useState, useCallback } from "react";
import type { FocusContext } from "../types/chat";

interface UseFocusCaretReturn {
  position: number | null;
  context: string;
  focusContext: FocusContext | null;
  placeCaret: (pos: number) => void;
  moveCaretLeft: () => void;
  moveCaretRight: () => void;
  clearCaret: () => void;
}

const CONTEXT_CHARS = 150; // ±150 characters around caret

/**
 * Hook for managing focus caret in document text
 */
export function useFocusCaret(documentText: string): UseFocusCaretReturn {
  const [position, setPosition] = useState<number | null>(null);
  const [context, setContext] = useState<string>("");
  const [focusContext, setFocusContext] = useState<FocusContext | null>(null);

  /**
   * Extract context around a position (±150 chars)
   */
  const extractContext = useCallback(
    (pos: number): string => {
      if (!documentText || pos < 0 || pos > documentText.length) {
        return "";
      }

      const start = Math.max(0, pos - CONTEXT_CHARS);
      const end = Math.min(documentText.length, pos + CONTEXT_CHARS);

      return documentText.substring(start, end);
    },
    [documentText],
  );

  /**
   * Create FocusContext object for API
   */
  const createFocusContext = useCallback(
    (pos: number): FocusContext | null => {
      if (!documentText || pos < 0 || pos > documentText.length) {
        return null;
      }

      const start = Math.max(0, pos - CONTEXT_CHARS);
      const end = Math.min(documentText.length, pos + CONTEXT_CHARS);
      const contextText = documentText.substring(start, end);

      return {
        start_char: start,
        end_char: end,
        context_text: contextText,
      };
    },
    [documentText],
  );

  /**
   * Place caret at specific position
   */
  const placeCaret = useCallback(
    (pos: number) => {
      if (pos < 0 || pos > documentText.length) {
        return;
      }

      setPosition(pos);
      setContext(extractContext(pos));
      setFocusContext(createFocusContext(pos));
    },
    [documentText, extractContext, createFocusContext],
  );

  /**
   * Move caret left by one character
   */
  const moveCaretLeft = useCallback(() => {
    if (position === null || position <= 0) {
      return;
    }

    const newPos = position - 1;
    setPosition(newPos);
    setContext(extractContext(newPos));
    setFocusContext(createFocusContext(newPos));
  }, [position, extractContext, createFocusContext]);

  /**
   * Move caret right by one character
   */
  const moveCaretRight = useCallback(() => {
    if (position === null || position >= documentText.length) {
      return;
    }

    const newPos = position + 1;
    setPosition(newPos);
    setContext(extractContext(newPos));
    setFocusContext(createFocusContext(newPos));
  }, [position, documentText, extractContext, createFocusContext]);

  /**
   * Clear caret position
   */
  const clearCaret = useCallback(() => {
    setPosition(null);
    setContext("");
    setFocusContext(null);
  }, []);

  return {
    position,
    context,
    focusContext,
    placeCaret,
    moveCaretLeft,
    moveCaretRight,
    clearCaret,
  };
}
