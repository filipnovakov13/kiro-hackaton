/**
 * SessionControls Component
 *
 * Provides session management controls:
 * - New Session button
 * - Delete Session button with confirmation dialog
 *
 * @see .kiro/specs/frontend-integration/phase-2/part1/requirements-part1.md (7.1.3, 7.1.4)
 */

import { useState } from "react";
import {
  backgrounds,
  accents,
  text,
  semantic,
  spacing,
  borderRadius,
  fontFamilies,
  typography,
  zIndex,
} from "../../design-system";

// =============================================================================
// TYPES
// =============================================================================

interface SessionControlsProps {
  /** Current session ID (null if no session) */
  currentSessionId: string | null;
  /** Callback when "New Session" is clicked */
  onNewSession: () => void;
  /** Callback when "Delete Session" is confirmed */
  onDeleteSession: (sessionId: string) => void;
  /** Whether controls are disabled */
  disabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SessionControls({
  currentSessionId,
  onNewSession,
  onDeleteSession,
  disabled = false,
}: SessionControlsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Handle delete button click
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  // Handle delete confirmation
  const handleConfirmDelete = () => {
    if (currentSessionId) {
      onDeleteSession(currentSessionId);
    }
    setShowDeleteConfirm(false);
  };

  // Handle delete cancellation
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Button base styles
  const buttonBaseStyle: React.CSSProperties = {
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: `${borderRadius.md}px`,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: fontFamilies.heading,
    fontSize: `${typography.small.fontSize}px`,
    fontWeight: typography.h4.fontWeight,
    transition: "all 150ms ease-out",
    opacity: disabled ? 0.5 : 1,
  };

  // New Session button styles
  const newSessionButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: backgrounds.hover,
    color: text.primary,
  };

  // Delete Session button styles
  const deleteSessionButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: backgrounds.hover,
    color: semantic.critical,
  };

  // Modal overlay styles
  const modalOverlayStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: zIndex.modal,
  };

  // Modal content styles
  const modalContentStyle: React.CSSProperties = {
    backgroundColor: backgrounds.panel,
    padding: `${spacing.xl}px`,
    borderRadius: `${borderRadius.lg}px`,
    maxWidth: "400px",
    width: "90%",
    boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4)`,
  };

  // Modal title styles
  const modalTitleStyle: React.CSSProperties = {
    fontFamily: fontFamilies.heading,
    fontSize: `${typography.h3.fontSize}px`,
    fontWeight: typography.h3.fontWeight,
    color: text.primary,
    marginBottom: `${spacing.md}px`,
  };

  // Modal message styles
  const modalMessageStyle: React.CSSProperties = {
    fontFamily: fontFamilies.body,
    fontSize: `${typography.body.fontSize}px`,
    color: text.secondary,
    lineHeight: typography.body.lineHeight,
    marginBottom: `${spacing.xl}px`,
  };

  // Modal button container styles
  const modalButtonContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: `${spacing.md}px`,
    justifyContent: "flex-end",
  };

  // Confirm button styles
  const confirmButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: semantic.critical,
    color: backgrounds.canvas,
  };

  // Cancel button styles
  const cancelButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: backgrounds.hover,
    color: text.primary,
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: `${spacing.md}px`,
          alignItems: "center",
        }}
        data-testid="session-controls"
      >
        {/* New Session Button */}
        <button
          style={newSessionButtonStyle}
          onClick={onNewSession}
          disabled={disabled}
          data-testid="new-session-button"
          aria-label="Create new session"
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = backgrounds.active;
              e.currentTarget.style.color = accents.highlight;
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = backgrounds.hover;
              e.currentTarget.style.color = text.primary;
            }
          }}
        >
          New Session
        </button>

        {/* Delete Session Button */}
        <button
          style={deleteSessionButtonStyle}
          onClick={handleDeleteClick}
          disabled={disabled || !currentSessionId}
          data-testid="delete-session-button"
          aria-label="Delete current session"
          onMouseEnter={(e) => {
            if (!disabled && currentSessionId) {
              e.currentTarget.style.backgroundColor = backgrounds.active;
              e.currentTarget.style.color = semantic.critical;
              e.currentTarget.style.fontWeight =
                typography.h4.fontWeight.toString();
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled && currentSessionId) {
              e.currentTarget.style.backgroundColor = backgrounds.hover;
              e.currentTarget.style.color = semantic.critical;
            }
          }}
        >
          Delete Session
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={modalOverlayStyle}
          onClick={handleCancelDelete}
          data-testid="delete-confirm-modal"
        >
          <div
            style={modalContentStyle}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <h3 id="delete-modal-title" style={modalTitleStyle}>
              Delete Session?
            </h3>
            <p style={modalMessageStyle}>
              This will permanently delete this conversation and all its
              messages. This action cannot be undone.
            </p>
            <div style={modalButtonContainerStyle}>
              <button
                style={cancelButtonStyle}
                onClick={handleCancelDelete}
                data-testid="cancel-delete-button"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = backgrounds.active;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = backgrounds.hover;
                }}
              >
                Cancel
              </button>
              <button
                style={confirmButtonStyle}
                onClick={handleConfirmDelete}
                data-testid="confirm-delete-button"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = semantic.critical;
                  e.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = semantic.critical;
                  e.currentTarget.style.opacity = "1";
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
