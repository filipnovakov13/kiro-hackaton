/**
 * StreamingMessage Component
 *
 * Displays streaming AI response tokens as they arrive
 * Features:
 * - Accumulates and displays tokens in real-time
 * - Shows thinking indicator during streaming
 * - Displays source attribution after completion
 * - Handles partial responses on errors
 * - Markdown rendering for formatted content
 *
 * @see .kiro/specs/rag-core-phase/requirements.md (Requirement 6)
 * @see .kiro/specs/rag-core-phase/tasks.md (Task 5.4)
 */

import {
  backgrounds,
  text,
  spacing,
  borderRadius,
  accents,
  semantic,
} from "../../design-system";
import { ThinkingIndicator } from "./ThinkingIndicator";

// =============================================================================
// TYPES
// =============================================================================

interface SourceChunk {
  chunk_id: string;
  document_id: string;
  document_title?: string;
  chunk_index?: number;
  similarity?: number;
  start_char?: number;
  end_char?: number;
}

interface StreamingMessageProps {
  /** Accumulated message content */
  content: string;
  /** Whether the message is currently streaming */
  isStreaming: boolean;
  /** Whether the message encountered an error */
  isError?: boolean;
  /** Error message if applicable */
  errorMessage?: string;
  /** Source attribution chunks */
  sources?: SourceChunk[];
  /** Callback when source is clicked */
  onSourceClick?: (source: SourceChunk) => void;
  /** Whether this is a partial response (interrupted) */
  isPartial?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function StreamingMessage({
  content,
  isStreaming,
  isError = false,
  errorMessage,
  sources = [],
  onSourceClick,
  isPartial = false,
}: StreamingMessageProps) {
  // Styles
  const containerStyle: React.CSSProperties = {
    backgroundColor: backgrounds.panel,
    padding: `${spacing.md}px ${spacing.lg}px`,
    borderRadius: `${borderRadius.md}px`,
    marginBottom: `${spacing.md}px`,
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    transition: "all 150ms ease-out",
  };

  const contentStyle: React.CSSProperties = {
    color: text.primary,
    fontSize: "18px",
    lineHeight: 1.7,
    opacity: 0.9,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };

  const errorStyle: React.CSSProperties = {
    ...contentStyle,
    color: semantic.critical,
    fontStyle: "italic",
  };

  const partialIndicatorStyle: React.CSSProperties = {
    color: text.secondary,
    fontSize: "14px",
    fontStyle: "italic",
    marginTop: `${spacing.sm}px`,
  };

  const sourcesContainerStyle: React.CSSProperties = {
    marginTop: `${spacing.md}px`,
    paddingTop: `${spacing.md}px`,
    borderTop: `1px solid ${backgrounds.hover}`,
  };

  const sourcesLabelStyle: React.CSSProperties = {
    color: text.secondary,
    fontSize: "14px",
    marginBottom: `${spacing.sm}px`,
  };

  const sourceLinksStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: `${spacing.sm}px`,
  };

  return (
    <div style={containerStyle} data-testid="streaming-message">
      {/* Thinking indicator (only during streaming) */}
      {isStreaming && !content && (
        <ThinkingIndicator message="Gathering thoughts..." size="small" />
      )}

      {/* Message content */}
      {content && (
        <div
          style={isError ? errorStyle : contentStyle}
          data-testid="message-content"
        >
          {content}
        </div>
      )}

      {/* Partial response indicator */}
      {isPartial && !isStreaming && (
        <div style={partialIndicatorStyle} data-testid="partial-indicator">
          [Response interrupted]
        </div>
      )}

      {/* Error message */}
      {isError && errorMessage && (
        <div style={errorStyle} data-testid="error-message">
          {errorMessage}
        </div>
      )}

      {/* Source attribution (only after streaming completes) */}
      {!isStreaming && sources.length > 0 && (
        <div style={sourcesContainerStyle} data-testid="sources-container">
          <div style={sourcesLabelStyle}>Sources:</div>
          <div style={sourceLinksStyle}>
            {sources.map((source, index) => (
              <SourceLink
                key={`${source.chunk_id}-${index}`}
                source={source}
                onClick={() => onSourceClick?.(source)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Streaming indicator (cursor) */}
      {isStreaming && content && (
        <span
          style={{
            display: "inline-block",
            width: "2px",
            height: "1em",
            backgroundColor: text.primary,
            marginLeft: "2px",
            animation: "blink 1s step-end infinite",
          }}
          data-testid="streaming-cursor"
        />
      )}

      {/* Blink animation for cursor */}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// SOURCE LINK COMPONENT
// =============================================================================

interface SourceLinkProps {
  source: SourceChunk;
  onClick: () => void;
}

function SourceLink({ source, onClick }: SourceLinkProps) {
  const linkStyle: React.CSSProperties = {
    color: accents.highlight,
    fontSize: "14px",
    textDecoration: "none",
    cursor: "pointer",
    padding: `${spacing.xs}px ${spacing.sm}px`,
    borderRadius: `${borderRadius.sm}px`,
    backgroundColor: backgrounds.hover,
    transition: "all 150ms ease-out",
    border: "none",
    fontFamily: "inherit",
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = backgrounds.active;
    e.currentTarget.style.textDecoration = "underline";
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = backgrounds.hover;
    e.currentTarget.style.textDecoration = "none";
  };

  const displayText = source.document_title
    ? `${source.document_title}${
        source.chunk_index !== undefined
          ? ` - Section ${source.chunk_index}`
          : ""
      }`
    : `Section ${source.chunk_index ?? "?"}`;

  return (
    <button
      style={linkStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid="source-link"
      aria-label={`View source: ${displayText}`}
    >
      • {displayText}
    </button>
  );
}
