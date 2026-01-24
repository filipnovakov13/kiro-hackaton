/**
 * ChatInterface Component
 *
 * Split-pane layout with document viewer (left) and chat (right)
 * Features:
 * - Resizable border with drag handling
 * - Document pane collapse/expand
 * - Width persistence to localStorage
 * - Minimum width enforcement (40% doc, 20% chat)
 *
 * @see .kiro/specs/rag-core-phase/breakdowns/tasks-5-6-frontend-components.md
 */

import { useState, useEffect, useRef, useCallback, ReactNode } from "react";
import {
  backgrounds,
  splitPane,
  chatInterface,
  accents,
  text,
} from "../../design-system";

// =============================================================================
// TYPES
// =============================================================================

interface ChatInterfaceProps {
  /** Document viewer content (left pane) */
  documentContent?: ReactNode;
  /** Chat content (right pane) */
  chatContent?: ReactNode;
  /** Whether document pane is initially collapsed */
  initialCollapsed?: boolean;
  /** Callback when document pane collapse state changes */
  onCollapseChange?: (collapsed: boolean) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = "iubar-split-pane-width";
const DEFAULT_DOC_WIDTH = splitPane.documentDefault; // 70%
const MIN_DOC_WIDTH = splitPane.documentMin; // 40%
const MIN_CHAT_WIDTH = splitPane.chatMin; // 20%
const MAX_DOC_WIDTH = 100 - MIN_CHAT_WIDTH; // 80%

// =============================================================================
// COMPONENT
// =============================================================================

export function ChatInterface({
  documentContent,
  chatContent,
  initialCollapsed = false,
  onCollapseChange,
}: ChatInterfaceProps) {
  // State
  const [documentWidth, setDocumentWidth] = useState<number>(() => {
    // Load from localStorage or use default
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseFloat(saved) : DEFAULT_DOC_WIDTH;
  });
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);

  // Persist width to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, documentWidth.toString());
  }, [documentWidth]);

  // Handle collapse toggle
  const handleCollapseToggle = useCallback(() => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
  }, [isCollapsed, onCollapseChange]);

  // Handle mouse down on resizer
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  // Handle mouse move (resize)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;

      // Calculate new document width as percentage
      let newDocWidth = (mouseX / containerWidth) * 100;

      // Enforce minimum and maximum widths
      newDocWidth = Math.max(
        MIN_DOC_WIDTH,
        Math.min(MAX_DOC_WIDTH, newDocWidth),
      );

      setDocumentWidth(newDocWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Calculate chat width
  const chatWidth = 100 - documentWidth;

  // Styles
  const containerStyle: React.CSSProperties = {
    display: "flex",
    height: "100vh",
    width: "100%",
    backgroundColor: backgrounds.canvas,
    overflow: "hidden",
  };

  const documentPaneStyle: React.CSSProperties = {
    width: isCollapsed ? "0%" : `${documentWidth}%`,
    height: "100%",
    backgroundColor: backgrounds.canvas,
    overflow: "auto",
    transition: isCollapsed ? "width 300ms ease-out" : "none",
    position: "relative",
  };

  const resizerStyle: React.CSSProperties = {
    width: isCollapsed ? "0px" : "4px",
    height: "100%",
    backgroundColor: backgrounds.hover,
    cursor: "col-resize",
    flexShrink: 0,
    transition: isCollapsed
      ? "width 300ms ease-out, background-color 150ms ease-out"
      : "background-color 150ms ease-out",
    ...(isDragging && {
      backgroundColor: backgrounds.active,
    }),
  };

  const chatPaneStyle: React.CSSProperties = {
    width: isCollapsed ? "100%" : `${chatWidth}%`,
    height: "100%",
    backgroundColor: backgrounds.panel,
    overflow: "auto",
    padding: `${chatInterface.padding}px`,
    transition: isCollapsed ? "width 300ms ease-out" : "none",
  };

  const expandButtonStyle: React.CSSProperties = {
    position: "fixed",
    left: "8px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "32px",
    height: "32px",
    backgroundColor: backgrounds.panel,
    border: `1px solid ${backgrounds.hover}`,
    borderRadius: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: accents.highlight,
    fontSize: "18px",
    zIndex: 10,
    transition: "all 150ms ease-out",
  };

  return (
    <div ref={containerRef} style={containerStyle} data-testid="chat-interface">
      {/* Document Pane */}
      <div style={documentPaneStyle} data-testid="document-pane">
        {!isCollapsed && (
          <>
            {documentContent || (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: text.secondary,
                  fontSize: "16px",
                }}
              >
                No document selected
              </div>
            )}
          </>
        )}
      </div>

      {/* Resizer */}
      {!isCollapsed && (
        <div
          ref={resizerRef}
          style={resizerStyle}
          onMouseDown={handleMouseDown}
          data-testid="pane-resizer"
        />
      )}

      {/* Expand Button (when collapsed) */}
      {isCollapsed && (
        <button
          style={expandButtonStyle}
          onClick={handleCollapseToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleCollapseToggle();
            }
          }}
          tabIndex={0}
          data-testid="expand-button"
          aria-label="Expand document pane"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = backgrounds.hover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = backgrounds.panel;
          }}
        >
          ▶
        </button>
      )}

      {/* Chat Pane */}
      <div style={chatPaneStyle} data-testid="chat-pane">
        {chatContent || (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: text.secondary,
              fontSize: "16px",
              textAlign: "center",
            }}
          >
            <p>Select a document to start chatting,</p>
            <p>or ask a general question</p>
          </div>
        )}

        {/* Collapse Button (when expanded) */}
        {!isCollapsed && (
          <button
            style={{
              position: "absolute",
              left: "8px",
              top: "8px",
              width: "32px",
              height: "32px",
              backgroundColor: backgrounds.hover,
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: accents.highlight,
              fontSize: "18px",
              transition: "all 150ms ease-out",
            }}
            onClick={handleCollapseToggle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleCollapseToggle();
              }
            }}
            tabIndex={0}
            data-testid="collapse-button"
            aria-label="Collapse document pane"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = backgrounds.active;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = backgrounds.hover;
            }}
          >
            ◀
          </button>
        )}
      </div>
    </div>
  );
}
