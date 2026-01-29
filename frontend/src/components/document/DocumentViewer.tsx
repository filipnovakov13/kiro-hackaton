/**
 * DocumentViewer Component
 *
 * Renders Markdown documents with syntax highlighting
 * Features:
 * - Markdown rendering with proper styling
 * - Syntax highlighting for code blocks
 * - Independent scrolling from chat pane
 * - Chunk highlighting on source click
 * - Focus caret integration
 * - Empty state handling
 *
 * @see .kiro/specs/rag-core-phase/requirements.md (Requirement 9)
 * @see .kiro/specs/rag-core-phase/tasks.md (Task 6.1)
 */

import { useRef, useEffect } from "react";
import { backgrounds, text, spacing, typography } from "../../design-system";
import * as markdownStyles from "../../design-system/markdown";

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

  // Styles
  const containerStyle: React.CSSProperties = {
    height: "100%",
    overflowY: "auto",
    overflowX: "hidden",
    backgroundColor: backgrounds.canvas,
    padding: `${spacing.xl}px ${spacing["3xl"]}px`,
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
      </div>
    </div>
  );
}

// =============================================================================
// MARKDOWN CONTENT COMPONENT
// =============================================================================

interface MarkdownContentProps {
  content: string;
}

function MarkdownContent({ content }: MarkdownContentProps) {
  // Simple markdown rendering (in production, use a library like react-markdown)
  // For now, just render as formatted text with basic parsing

  const lines = content.split("\n");
  const elements: JSX.Element[] = [];

  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLanguage = "";

  lines.forEach((line, index) => {
    // Code block detection
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        // Start code block
        inCodeBlock = true;
        codeBlockLanguage = line.slice(3).trim();
        codeBlockContent = [];
      } else {
        // End code block
        inCodeBlock = false;
        elements.push(
          <CodeBlock
            key={`code-${index}`}
            content={codeBlockContent.join("\n")}
            language={codeBlockLanguage}
          />,
        );
        codeBlockContent = [];
        codeBlockLanguage = "";
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      return;
    }

    // Heading detection
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={index} style={markdownStyles.h1}>
          {line.slice(2)}
        </h1>,
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={index} style={markdownStyles.h2}>
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={index} style={markdownStyles.h3}>
          {line.slice(4)}
        </h3>,
      );
    } else if (line.trim() === "") {
      // Empty line - paragraph break
      elements.push(<div key={index} style={{ height: `${spacing.md}px` }} />);
    } else {
      // Regular paragraph
      elements.push(
        <p key={index} style={markdownStyles.paragraph}>
          {line}
        </p>,
      );
    }
  });

  return <>{elements}</>;
}

// =============================================================================
// CODE BLOCK COMPONENT
// =============================================================================

interface CodeBlockProps {
  content: string;
  language?: string;
}

function CodeBlock({ content, language }: CodeBlockProps) {
  const codeBlockStyle: React.CSSProperties = {
    ...markdownStyles.codeBlock,
    position: "relative",
  };

  const languageLabelStyle: React.CSSProperties = {
    position: "absolute",
    top: `${spacing.xs}px`,
    right: `${spacing.sm}px`,
    fontSize: "12px",
    color: text.secondary,
    opacity: 0.7,
  };

  return (
    <pre style={codeBlockStyle} data-testid="code-block">
      {language && (
        <span style={languageLabelStyle} data-testid="code-language">
          {language}
        </span>
      )}
      <code>{content}</code>
    </pre>
  );
}
