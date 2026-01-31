/**
 * SessionSwitcher Component
 *
 * Displays all sessions with document name and timestamp.
 * Highlights current session and handles session switching.
 *
 * @see .kiro/specs/frontend-integration/phase-2/part1/requirements-part1.md (7.1.5)
 */

import { useState, useEffect } from "react";
import {
  backgrounds,
  accents,
  text,
  spacing,
  borderRadius,
  fontFamilies,
  typography,
  zIndex,
} from "../../design-system";
import { ChatSession } from "../../types/chat";
import { getDocument } from "../../services/api";

// =============================================================================
// TYPES
// =============================================================================

interface SessionSwitcherProps {
  /** All available sessions */
  sessions: ChatSession[];
  /** Current session ID */
  currentSessionId: string | null;
  /** Callback when session is switched */
  onSwitch: (sessionId: string) => void;
  /** Whether switcher is disabled */
  disabled?: boolean;
}

interface SessionWithDocument extends ChatSession {
  documentName?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SessionSwitcher({
  sessions,
  currentSessionId,
  onSwitch,
  disabled = false,
}: SessionSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionsWithDocs, setSessionsWithDocs] = useState<
    SessionWithDocument[]
  >([]);

  // Fetch document names for sessions
  useEffect(() => {
    const fetchDocumentNames = async () => {
      const enrichedSessions = await Promise.all(
        sessions.map(async (session) => {
          if (!session.document_id) {
            return { ...session, documentName: "No document" };
          }
          try {
            const doc = await getDocument(session.document_id);
            return { ...session, documentName: doc.original_name };
          } catch {
            return { ...session, documentName: "Unknown document" };
          }
        }),
      );
      setSessionsWithDocs(enrichedSessions);
    };

    if (sessions.length > 0) {
      fetchDocumentNames();
    }
  }, [sessions]);

  // Handle session selection
  const handleSessionClick = (sessionId: string) => {
    onSwitch(sessionId);
    setIsOpen(false);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Find current session
  const currentSession = sessionsWithDocs.find(
    (s) => s.id === currentSessionId,
  );

  // Button styles
  const buttonStyle: React.CSSProperties = {
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: `${borderRadius.md}px`,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: fontFamilies.heading,
    fontSize: `${typography.small.fontSize}px`,
    fontWeight: typography.h4.fontWeight,
    backgroundColor: backgrounds.hover,
    color: text.primary,
    transition: "all 150ms ease-out",
    opacity: disabled ? 0.5 : 1,
    display: "flex",
    alignItems: "center",
    gap: `${spacing.xs}px`,
  };

  // Dropdown container styles
  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: `${spacing.xs}px`,
    backgroundColor: backgrounds.panel,
    borderRadius: `${borderRadius.md}px`,
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
    zIndex: zIndex.dropdown,
    minWidth: "300px",
    maxHeight: "400px",
    overflowY: "auto",
  };

  // Session item styles
  const sessionItemStyle = (isActive: boolean): React.CSSProperties => ({
    padding: `${spacing.md}px`,
    cursor: "pointer",
    borderBottom: `1px solid ${backgrounds.hover}`,
    backgroundColor: isActive ? backgrounds.active : "transparent",
    transition: "background-color 150ms ease-out",
  });

  // Session name styles
  const sessionNameStyle: React.CSSProperties = {
    fontFamily: fontFamilies.body,
    fontSize: `${typography.body.fontSize}px`,
    fontWeight: typography.body.fontWeight,
    color: text.primary,
    marginBottom: `${spacing.xs}px`,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  // Session timestamp styles
  const sessionTimestampStyle: React.CSSProperties = {
    fontFamily: fontFamilies.mono,
    fontSize: `${typography.caption.fontSize}px`,
    color: text.secondary,
  };

  return (
    <div style={{ position: "relative" }} data-testid="session-switcher">
      {/* Switcher Button */}
      <button
        style={buttonStyle}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || sessions.length === 0}
        data-testid="session-switcher-button"
        aria-label="Switch session"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onMouseEnter={(e) => {
          if (!disabled && sessions.length > 0) {
            e.currentTarget.style.backgroundColor = backgrounds.active;
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && sessions.length > 0) {
            e.currentTarget.style.backgroundColor = backgrounds.hover;
          }
        }}
      >
        <span>
          {currentSession
            ? currentSession.documentName || "Session"
            : "Select Session"}
        </span>
        <span style={{ fontSize: "10px" }}>▼</span>
      </button>

      {/* Dropdown List */}
      {isOpen && sessionsWithDocs.length > 0 && (
        <>
          {/* Overlay to close dropdown */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: zIndex.dropdown - 1,
            }}
            onClick={() => setIsOpen(false)}
            data-testid="session-switcher-overlay"
          />

          {/* Dropdown */}
          <div
            style={dropdownStyle}
            role="listbox"
            aria-label="Available sessions"
            data-testid="session-switcher-dropdown"
          >
            {sessionsWithDocs.map((session) => {
              const isActive = session.id === currentSessionId;
              return (
                <div
                  key={session.id}
                  style={sessionItemStyle(isActive)}
                  onClick={() => handleSessionClick(session.id)}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = backgrounds.hover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                  role="option"
                  aria-selected={isActive}
                  data-testid={`session-item-${session.id}`}
                  data-active={isActive}
                >
                  <div style={sessionNameStyle}>
                    {session.documentName || "Untitled"}
                    {isActive && (
                      <span
                        style={{
                          marginLeft: `${spacing.xs}px`,
                          color: accents.highlight,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <div style={sessionTimestampStyle}>
                    {formatTimestamp(session.updated_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
