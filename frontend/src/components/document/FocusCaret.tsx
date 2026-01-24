/**
 * FocusCaret Component
 *
 * Letter-level focus indicator with golden glow
 * Features:
 * - Single letter highlighting (anchor at 40% of word)
 * - Click-to-place functionality
 * - Keyboard navigation (arrow keys)
 * - Extract surrounding context (±150 chars)
 * - Fade in/out animations (200ms/150ms)
 * - RSVP-ready design
 *
 * @see .kiro/specs/rag-core-phase/requirements.md (Requirement 10)
 * @see .kiro/documentation/project-docs/visual-identity.md (Section V)
 */

import { useEffect, useRef } from "react";
import { accents } from "../../design-system";

// =============================================================================
// TYPES
// =============================================================================

export interface FocusContext {
  document_id?: string;
  start_char: number;
  end_char: number;
  surrounding_text: string;
}

interface FocusCaretProps {
  /** Character position in document */
  position?: number;
  /** Document content for context extraction */
  content?: string;
  /** Document ID */
  documentId?: string;
  /** Callback when focus context changes */
  onFocusChange?: (context: FocusContext | null) => void;
  /** Whether keyboard navigation is enabled */
  enableKeyboard?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CONTEXT_CHARS = 150; // ±150 characters around focus
const ANCHOR_POSITION = 0.4; // 40% into word for anchor letter
const FADE_IN_MS = 200;
const FADE_OUT_MS = 150;

// =============================================================================
// COMPONENT
// =============================================================================

export function FocusCaret({
  position,
  content = "",
  documentId,
  onFocusChange,
  enableKeyboard = true,
}: FocusCaretProps) {
  const caretRef = useRef<HTMLSpanElement>(null);

  // Extract surrounding context
  useEffect(() => {
    if (position !== undefined && content && onFocusChange) {
      const start = Math.max(0, position - CONTEXT_CHARS);
      const end = Math.min(content.length, position + CONTEXT_CHARS);
      const surroundingText = content.slice(start, end);

      onFocusChange({
        document_id: documentId,
        start_char: position,
        end_char: position + 1,
        surrounding_text: surroundingText,
      });
    } else if (position === undefined && onFocusChange) {
      onFocusChange(null);
    }
  }, [position, content, documentId, onFocusChange]);

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboard || position === undefined || !content) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!onFocusChange) return;

      let newPosition = position;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          newPosition = Math.max(0, position - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          newPosition = Math.min(content.length - 1, position + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          // Move to previous paragraph (find previous \n\n)
          newPosition = findPreviousParagraph(content, position);
          break;
        case "ArrowDown":
          e.preventDefault();
          // Move to next paragraph (find next \n\n)
          newPosition = findNextParagraph(content, position);
          break;
        default:
          return;
      }

      if (newPosition !== position) {
        const start = Math.max(0, newPosition - CONTEXT_CHARS);
        const end = Math.min(content.length, newPosition + CONTEXT_CHARS);
        const surroundingText = content.slice(start, end);

        onFocusChange({
          document_id: documentId,
          start_char: newPosition,
          end_char: newPosition + 1,
          surrounding_text: surroundingText,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableKeyboard, position, content, documentId, onFocusChange]);

  // Don't render if no position
  if (position === undefined) {
    return null;
  }

  // Styles
  const caretStyle: React.CSSProperties = {
    position: "relative",
    display: "inline",
  };

  const glowStyle: React.CSSProperties = {
    position: "absolute",
    top: "-2px",
    left: "-1px",
    right: "-1px",
    bottom: "-2px",
    background: "transparent",
    borderRadius: "2px",
    boxShadow: `0 0 2px ${accents.highlight}80, 0 0 4px ${accents.highlight}40`,
    pointerEvents: "none",
    animation: `letterGlow ${FADE_IN_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
  };

  return (
    <>
      <span ref={caretRef} style={caretStyle} data-testid="focus-caret">
        <span style={glowStyle} data-testid="focus-glow" />
      </span>

      {/* Keyframe animations */}
      <style>{`
        @keyframes letterGlow {
          from {
            opacity: 0;
            box-shadow: 0 0 0px ${accents.highlight}00;
          }
          to {
            opacity: 1;
            box-shadow: 0 0 2px ${accents.highlight}80, 0 0 4px ${accents.highlight}40;
          }
        }

        @keyframes letterGlowOut {
          from {
            opacity: 1;
            box-shadow: 0 0 2px ${accents.highlight}80, 0 0 4px ${accents.highlight}40;
          }
          to {
            opacity: 0;
            box-shadow: 0 0 0px ${accents.highlight}00;
          }
        }
      `}</style>
    </>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Find the start of the previous paragraph
 */
function findPreviousParagraph(content: string, position: number): number {
  // Look backwards for double newline
  const beforePosition = content.slice(0, position);
  const lastParagraphBreak = beforePosition.lastIndexOf("\n\n");

  if (lastParagraphBreak === -1) {
    return 0; // Start of document
  }

  return lastParagraphBreak + 2; // After the double newline
}

/**
 * Find the start of the next paragraph
 */
function findNextParagraph(content: string, position: number): number {
  // Look forwards for double newline
  const afterPosition = content.slice(position);
  const nextParagraphBreak = afterPosition.indexOf("\n\n");

  if (nextParagraphBreak === -1) {
    return content.length - 1; // End of document
  }

  return position + nextParagraphBreak + 2; // After the double newline
}

/**
 * Calculate anchor letter position in a word (40% of word length)
 */
export function calculateAnchorPosition(word: string): number {
  return Math.floor(word.length * ANCHOR_POSITION);
}

/**
 * Extract word at position
 */
export function extractWordAtPosition(
  content: string,
  position: number,
): { word: string; startIndex: number; endIndex: number } | null {
  if (!content || position < 0 || position >= content.length) {
    return null;
  }

  // Find word boundaries
  let start = position;
  let end = position;

  // Move start backwards to word boundary
  while (start > 0 && /\w/.test(content[start - 1])) {
    start--;
  }

  // Move end forwards to word boundary
  while (end < content.length && /\w/.test(content[end])) {
    end++;
  }

  const word = content.slice(start, end);

  if (word.length === 0) {
    return null;
  }

  return {
    word,
    startIndex: start,
    endIndex: end,
  };
}
