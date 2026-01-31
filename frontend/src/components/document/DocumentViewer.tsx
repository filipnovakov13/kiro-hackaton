/**
 * DocumentViewer Component
 *
 * Renders Markdown documents with syntax highlighting
 * Features:
 * - Markdown rendering with react-markdown and remark-gfm
 * - Syntax highlighting for code blocks with react-syntax-highlighter
 * - Independent scrolling from chat pane
 * - Chunk highlighting on source click
 * - Focus caret integration
 * - Empty state handling
 * - Input sanitization for security
 *
 * @see .kiro/specs/rag-core-phase/requirements.md (Requirement 9)
 */

import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  backgrounds,
  text,
  spacing,
  typography,
  accents,
} from "../../design-system";
import * as markdownStyles from "../../design-system/markdown";
import { FocusCaret } from "./FocusCaret";
import { sanitizeMarkdown } from "../../utils/sanitization";

// =============================================================================
// TYPES
// =============================================================================

interface DocumentViewerProps {
  /** Markdown content to render */
  content?: string;
  /** Document title */
  title?: string;
  /** Whether document is loading */
  isLoading?: boolean;
  /** Highlighted chunk ID */
  highlightedChunkId?: string;
  /** Scroll to character position */
  scrollToPosition?: number;
  /** Callback when content is clicked */
  onContentClick?: (position: number) => void;
  /** Focus caret position */
  caretPosition?: number;
  /** Callback when caret moves */
  onCaretMove?: (position: number) => void;
  /** Whether focus mode is enabled */
  focusModeEnabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DocumentViewer({
  content,
  title,
  isLoading = false,
  highlightedChunkId,
  scrollToPosition,
  onContentClick,
  caretPosition,
  onCaretMove,
  focusModeEnabled = false,
}: DocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll to position when requested
  useEffect(() => {
    if (scrollToPosition !== undefined && contentRef.current) {
      // Find element at position (simplified - would need more sophisticated logic)
      contentRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [scrollToPosition]);

  // Handle content click
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onContentClick && contentRef.current) {
      // Calculate approximate character position (simplified)
      const rect = contentRef.current.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const approximatePosition = Math.floor(
        (clickY / rect.height) * (content?.length || 0),
      );
      onContentClick(approximatePosition);
    }
  };

  // Keyboard navigation for focus caret
  useEffect(() => {
    if (!focusModeEnabled || !onCaretMove || !content) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!caretPosition) return;

      let newPosition = caretPosition;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          // Move to previous paragraph
          newPosition = findPreviousParagraph(content, caretPosition);
          break;
        case "ArrowDown":
          e.preventDefault();
          // Move to next paragraph
          newPosition = findNextParagraph(content, caretPosition);
          break;
        case "Home":
          e.preventDefault();
          newPosition = 0;
          break;
        case "End":
          e.preventDefault();
          newPosition = content.length - 1;
          break;
        default:
          return;
      }

      if (newPosition !== caretPosition) {
        onCaretMove(newPosition);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusModeEnabled, caretPosition, content, onCaretMove]);

  // Styles
  const containerStyle: React.CSSProperties = {
    height: "100%",
    overflowY: "auto",
    overflowX: "hidden",
    backgroundColor: backgrounds.canvas,
    padding: `${spacing["3xl"]}px`,
  };

  const titleStyle: React.CSSProperties = {
    ...typography.h1,
    color: text.primary,
    marginBottom: `${spacing.lg}px`,
  };

  const contentStyle: React.CSSProperties = {
    ...markdownStyles.documentContainer,
    color: text.primary,
    maxWidth: "800px",
    margin: "0 auto",
  };

  const emptyStateStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: text.secondary,
    fontSize: "18px",
    textAlign: "center",
    padding: `${spacing.xl}px`,
  };

  const loadingStyle: React.CSSProperties = {
    ...emptyStateStyle,
    fontStyle: "italic",
  };

  // Render loading state
  if (isLoading) {
    return (
      <div style={containerStyle} data-testid="document-viewer">
        <div style={loadingStyle} data-testid="loading-state">
          Loading document...
        </div>
      </div>
    );
  }

  // Render empty state
  if (!content) {
    return (
      <div style={containerStyle} data-testid="document-viewer">
        <div style={emptyStateStyle} data-testid="empty-state">
          <div>No document selected</div>
          <div style={{ fontSize: "14px", marginTop: `${spacing.sm}px` }}>
            Upload a document to get started
          </div>
        </div>
      </div>
    );
  }

  // Render document
  return (
    <div
      ref={containerRef}
      style={containerStyle}
      data-testid="document-viewer"
    >
      {title && (
        <h1 style={titleStyle} data-testid="document-title">
          {title}
        </h1>
      )}
      <div
        ref={contentRef}
        style={contentStyle}
        onClick={handleClick}
        data-testid="document-content"
        data-highlighted-chunk={highlightedChunkId}
      >
        <MarkdownContent content={content} />
        {/* Render FocusCaret when enabled */}
        {focusModeEnabled && (
          <FocusCaret
            position={caretPosition}
            content={content}
            enableKeyboard={false} // Keyboard handled by DocumentViewer
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function findPreviousParagraph(content: string, position: number): number {
  const beforePosition = content.slice(0, position);
  const lastParagraphBreak = beforePosition.lastIndexOf("\n\n");
  return lastParagraphBreak === -1 ? 0 : lastParagraphBreak + 2;
}

function findNextParagraph(content: string, position: number): number {
  const afterPosition = content.slice(position);
  const nextParagraphBreak = afterPosition.indexOf("\n\n");
  return nextParagraphBreak === -1
    ? content.length - 1
    : position + nextParagraphBreak + 2;
}

// =============================================================================
// MARKDOWN CONTENT COMPONENT
// =============================================================================

interface MarkdownContentProps {
  content: string;
}

function MarkdownContent({ content }: MarkdownContentProps) {
  // Sanitize content before rendering to prevent XSS
  const sanitizedContent = sanitizeMarkdown(content);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          return !inline && match ? (
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={match[1]}
              PreTag="div"
              customStyle={{
                borderLeft: `3px solid ${accents.highlight}`,
                borderRadius: "4px",
                margin: `${spacing.md}px 0`,
                ...markdownStyles.codeBlock,
              }}
              {...props}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          ) : (
            <code
              className={className}
              style={markdownStyles.inlineCode}
              {...props}
            >
              {children}
            </code>
          );
        },
        h1({ children }) {
          return <h1 style={markdownStyles.h1}>{children}</h1>;
        },
        h2({ children }) {
          return <h2 style={markdownStyles.h2}>{children}</h2>;
        },
        h3({ children }) {
          return <h3 style={markdownStyles.h3}>{children}</h3>;
        },
        p({ children }) {
          return <p style={markdownStyles.paragraph}>{children}</p>;
        },
        ul({ children }) {
          return <ul style={markdownStyles.list}>{children}</ul>;
        },
        ol({ children }) {
          return <ol style={markdownStyles.list}>{children}</ol>;
        },
        li({ children }) {
          return <li style={markdownStyles.listItem}>{children}</li>;
        },
        blockquote({ children }) {
          return (
            <blockquote style={markdownStyles.blockquote}>
              {children}
            </blockquote>
          );
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              style={markdownStyles.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          );
        },
      }}
    >
      {sanitizedContent}
    </ReactMarkdown>
  );
}

// Code block component is now handled by react-syntax-highlighter above
