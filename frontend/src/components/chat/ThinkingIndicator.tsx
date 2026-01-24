/**
 * ThinkingIndicator Component
 *
 * Pulsing glow effect for AI thinking state
 * Features:
 * - Golden glow (#D4A574) pulsing animation
 * - Opacity 0.5 → 1.0 with 1.5s cycle
 * - Aligned with "light through clarity" visual identity
 *
 * @see .kiro/specs/rag-core-phase/requirements.md (Requirement 9)
 * @see .kiro/documentation/project-docs/visual-identity.md (Section VI)
 */

import { accents, text, spacing } from "../../design-system";

// =============================================================================
// TYPES
// =============================================================================

interface ThinkingIndicatorProps {
  /** Optional message to display */
  message?: string;
  /** Size variant */
  size?: "small" | "medium" | "large";
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_MESSAGE = "Thinking...";

const SIZE_CONFIG = {
  small: {
    glowSize: 8,
    fontSize: 12,
    spacing: 6,
  },
  medium: {
    glowSize: 12,
    fontSize: 14,
    spacing: 8,
  },
  large: {
    glowSize: 16,
    fontSize: 16,
    spacing: 10,
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ThinkingIndicator({
  message = DEFAULT_MESSAGE,
  size = "medium",
}: ThinkingIndicatorProps) {
  const config = SIZE_CONFIG[size];

  // Styles
  const containerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: `${config.spacing}px`,
    padding: `${spacing.sm}px 0`,
  };

  const glowContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: `${config.spacing / 2}px`,
    alignItems: "center",
  };

  const glowStyle: React.CSSProperties = {
    width: `${config.glowSize}px`,
    height: `${config.glowSize}px`,
    borderRadius: "50%",
    backgroundColor: accents.highlight,
    boxShadow: `0 0 ${config.glowSize}px ${accents.highlight}`,
    animation: "thinkingPulse 1.5s ease-in-out infinite",
  };

  const messageStyle: React.CSSProperties = {
    fontSize: `${config.fontSize}px`,
    color: text.secondary,
    fontStyle: "italic",
  };

  return (
    <div style={containerStyle} data-testid="thinking-indicator">
      {/* Pulsing glow dots */}
      <div style={glowContainerStyle}>
        <div
          style={{
            ...glowStyle,
            animationDelay: "0s",
          }}
          data-testid="glow-dot-1"
        />
        <div
          style={{
            ...glowStyle,
            animationDelay: "0.2s",
          }}
          data-testid="glow-dot-2"
        />
        <div
          style={{
            ...glowStyle,
            animationDelay: "0.4s",
          }}
          data-testid="glow-dot-3"
        />
      </div>

      {/* Message */}
      {message && (
        <span style={messageStyle} data-testid="thinking-message">
          {message}
        </span>
      )}

      {/* Keyframe animation */}
      <style>{`
        @keyframes thinkingPulse {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
