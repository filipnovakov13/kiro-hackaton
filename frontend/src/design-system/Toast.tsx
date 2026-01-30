/**
 * Toast Component
 *
 * Notification toast for temporary messages
 * Features:
 * - Auto-dismiss after duration
 * - Manual dismiss button
 * - Type variants (success, error, info)
 * - Design system styling
 */

import { useEffect } from "react";
import { backgrounds, text, semantic, spacing, borderRadius } from ".";

// =============================================================================
// TYPES
// =============================================================================

export interface ToastProps {
  /** Toast message */
  message: string;
  /** Toast type */
  type?: "success" | "error" | "info";
  /** Auto-dismiss duration in ms (0 = no auto-dismiss) */
  duration?: number;
  /** Callback when dismissed */
  onDismiss: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Toast({
  message,
  type = "info",
  duration = 5000,
  onDismiss,
}: ToastProps) {
  // Auto-dismiss after duration
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  // Type-specific colors
  const getColors = () => {
    switch (type) {
      case "success":
        return {
          bg: backgrounds.hover,
          border: semantic.success,
          text: semantic.success,
        };
      case "error":
        return {
          bg: backgrounds.hover,
          border: semantic.critical,
          text: semantic.critical,
        };
      default:
        return {
          bg: backgrounds.panel,
          border: backgrounds.active,
          text: text.primary,
        };
    }
  };

  const colors = getColors();

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    bottom: `${spacing.xl}px`,
    right: `${spacing.xl}px`,
    backgroundColor: colors.bg,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: `${borderRadius.md}px`,
    padding: `${spacing.md}px ${spacing.lg}px`,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
    display: "flex",
    alignItems: "center",
    gap: `${spacing.md}px`,
    maxWidth: "400px",
    zIndex: 1000,
    animation: "slideIn 200ms ease-out",
  };

  const dismissButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    color: text.secondary,
    cursor: "pointer",
    fontSize: "18px",
    padding: "0",
    marginLeft: `${spacing.sm}px`,
    transition: "color 150ms ease-out",
  };

  return (
    <>
      <div style={containerStyle} data-testid="toast" role="alert">
        <span style={{ flex: 1 }}>{message}</span>
        <button
          style={dismissButtonStyle}
          onClick={onDismiss}
          aria-label="Dismiss notification"
          data-testid="toast-dismiss"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = text.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = text.secondary;
          }}
        >
          ×
        </button>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
