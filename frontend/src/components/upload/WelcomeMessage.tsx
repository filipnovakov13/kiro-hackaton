/**
 * WelcomeMessage Component
 *
 * Displays welcome message on first load
 * Features:
 * - Title: "What would you like to explore today?"
 * - Subtitle: "Ask me about the content, or just start exploring"
 * - Design system typography
 */

import { text, spacing, typography } from "../../design-system";

export function WelcomeMessage() {
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: `${spacing.md}px`,
    marginBottom: `${spacing["2xl"]}px`,
    textAlign: "center",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: `${typography.h2.fontSize}px`,
    fontWeight: typography.h2.fontWeight,
    lineHeight: typography.h2.lineHeight,
    color: text.primary,
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: `${typography.body.fontSize}px`,
    lineHeight: typography.body.lineHeight,
    color: text.secondary,
    margin: 0,
  };

  return (
    <div style={containerStyle} data-testid="welcome-message">
      <h2 style={titleStyle} data-testid="welcome-title">
        What would you like to explore today?
      </h2>
      <p style={subtitleStyle} data-testid="welcome-subtitle">
        Ask me about the content, or just start exploring
      </p>
    </div>
  );
}
