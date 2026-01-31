/**
 * MessageList Component
 *
 * Displays user and assistant messages in a scrollable list
 * Features:
 * - Auto-scroll to latest message
 * - Empty state handling
 * - Message styling per design system
 *
 * @see .kiro/specs/rag-core-phase/breakdowns/tasks-5-6-frontend-components.md
 */

import { useEffect, useRef } from "react";
import {
  backgrounds,
  text,
  spacing,
  borderRadius,
  padding,
} from "../../design-system";
import { StreamingMessage } from "./StreamingMessage";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { SourceAttribution, type SourceChunk } from "./SourceAttribution";

// =============================================================================
// TYPES
// =============================================================================

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  metadata?: {
    sources?: SourceChunk[];
  };
}

interface MessageListProps {
  /** Array of messages to display */
  messages: Message[];
  /** Whether messages are currently loading */
  isLoading?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Streaming content from assistant */
  streamingContent?: string;
  /** Whether streaming is active */
  isStreaming?: boolean;
  /** Callback when source is clicked */
  onSourceClick?: (source: SourceChunk) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MessageList({
  messages,
  isLoading = false,
  emptyMessage = "No messages yet. Start a conversation!",
  streamingContent,
  isStreaming = false,
  onSourceClick,
}: MessageListProps) {
  const listEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Styles
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: `${spacing.md}px`,
    padding: `${spacing.md}px 0`,
    overflowY: "auto",
    flex: 1,
  };

  const messageStyle = (role: "user" | "assistant"): React.CSSProperties => ({
    backgroundColor: backgrounds.panel,
    color: `${text.primary}e6`, // 90% opacity
    padding: padding.card,
    borderRadius: `${borderRadius.lg}px`,
    fontSize: "18px",
    lineHeight: 1.7,
    fontFamily: '"iA Writer Quattro", "Merriweather", Georgia, serif',
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
    transition: "all 150ms ease-out",
    alignSelf: role === "user" ? "flex-end" : "flex-start",
    maxWidth: "85%",
    wordWrap: "break-word",
  });

  const emptyStateStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: text.secondary,
    fontSize: "16px",
    textAlign: "center",
    padding: `${spacing.xl}px`,
  };

  const roleIndicatorStyle = (
    role: "user" | "assistant",
  ): React.CSSProperties => ({
    fontSize: "12px",
    fontWeight: 500,
    color: text.secondary,
    marginBottom: `${spacing.xs}px`,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  });

  const timestampStyle: React.CSSProperties = {
    fontSize: "12px",
    color: text.disabled,
    marginTop: `${spacing.xs}px`,
  };

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div style={emptyStateStyle} data-testid="message-list-empty">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div ref={containerRef} style={containerStyle} data-testid="message-list">
      {messages.map((message) => (
        <div
          key={message.id}
          style={messageStyle(message.role)}
          data-testid="message"
          data-role={message.role}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = backgrounds.hover;
            e.currentTarget.style.boxShadow =
              "0 2px 8px rgba(212, 165, 116, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = backgrounds.panel;
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.2)";
          }}
        >
          {/* Role indicator */}
          <div style={roleIndicatorStyle(message.role)}>
            {message.role === "user" ? "You" : "Assistant"}
          </div>

          {/* Message content */}
          <div>{message.content}</div>

          {/* Source attribution for assistant messages */}
          {message.role === "assistant" &&
            message.metadata?.sources &&
            message.metadata.sources.length > 0 && (
              <SourceAttribution
                sources={message.metadata.sources}
                onSourceClick={onSourceClick}
              />
            )}

          {/* Timestamp (if provided) */}
          {message.timestamp && (
            <div style={timestampStyle}>
              {message.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>
      ))}

      {/* Show ThinkingIndicator when streaming but no content yet */}
      {isStreaming && !streamingContent && <ThinkingIndicator />}

      {/* Show StreamingMessage when content exists */}
      {streamingContent && (
        <StreamingMessage
          content={streamingContent}
          isStreaming={isStreaming}
        />
      )}

      {/* Scroll anchor */}
      <div ref={listEndRef} />
    </div>
  );
}
