import React, { useEffect, useRef } from "react";
import { backgrounds } from "../../design-system";

interface ChunkHighlightProps {
  /** Chunk ID to highlight */
  chunkId: string;
  /** Start character position in document */
  startChar: number;
  /** End character position in document */
  endChar: number;
  /** Whether to scroll to this chunk */
  scrollIntoView?: boolean;
  /** Callback when highlight is clicked */
  onClick?: () => void;
  /** Children content (the chunk text) */
  children: React.ReactNode;
}

/**
 * ChunkHighlight Component
 *
 * Highlights a document chunk with a subtle background color when referenced
 * by source attribution. Supports scrolling to the chunk and click interactions.
 *
 * Features:
 * - Subtle background highlight (#253550)
 * - Smooth scroll to chunk
 * - Click callback support
 * - Design system tokens
 */
export const ChunkHighlight: React.FC<ChunkHighlightProps> = ({
  chunkId,
  startChar,
  endChar,
  scrollIntoView = false,
  onClick,
  children,
}) => {
  const chunkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollIntoView && chunkRef.current) {
      chunkRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [scrollIntoView]);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      ref={chunkRef}
      data-testid="chunk-highlight"
      data-chunk-id={chunkId}
      data-start-char={startChar}
      data-end-char={endChar}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      aria-label={
        onClick ? `Chunk from position ${startChar} to ${endChar}` : undefined
      }
      style={{
        backgroundColor: backgrounds.hover, // #253550
        padding: "8px 12px",
        borderRadius: "4px",
        margin: "8px 0",
        transition: "background-color 200ms ease-out",
        cursor: onClick ? "pointer" : "default",
        ...(onClick && {
          ":hover": {
            backgroundColor: backgrounds.active, // #314662
          },
        }),
      }}
    >
      {children}
    </div>
  );
};

export default ChunkHighlight;
