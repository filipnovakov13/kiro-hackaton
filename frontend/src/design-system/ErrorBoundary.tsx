/**
 * ErrorBoundary Component
 *
 * Catches React errors and displays fallback UI
 * Features:
 * - Error logging to console
 * - Refresh page button
 * - Design system styling
 */

import { Component, ReactNode } from "react";
import { backgrounds, text, semantic, spacing, accents } from ".";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const containerStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: backgrounds.canvas,
        color: text.primary,
        padding: `${spacing.xl}px`,
        textAlign: "center",
      };

      const titleStyle: React.CSSProperties = {
        fontSize: "24px",
        fontWeight: 600,
        marginBottom: `${spacing.md}px`,
        color: semantic.critical,
      };

      const messageStyle: React.CSSProperties = {
        fontSize: "16px",
        color: text.secondary,
        marginBottom: `${spacing.xl}px`,
        maxWidth: "600px",
      };

      const buttonStyle: React.CSSProperties = {
        padding: `${spacing.md}px ${spacing.xl}px`,
        backgroundColor: accents.highlight,
        color: backgrounds.canvas,
        border: "none",
        borderRadius: "8px",
        fontSize: "16px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "background-color 150ms ease-out",
      };

      const errorDetailsStyle: React.CSSProperties = {
        marginTop: `${spacing.xl}px`,
        padding: `${spacing.md}px`,
        backgroundColor: backgrounds.panel,
        borderRadius: "8px",
        fontSize: "14px",
        color: text.disabled,
        maxWidth: "800px",
        textAlign: "left",
        fontFamily: "monospace",
        overflowX: "auto",
      };

      return (
        <div style={containerStyle} data-testid="error-boundary">
          <div style={titleStyle}>Something went wrong</div>
          <div style={messageStyle}>
            The application encountered an unexpected error. Please refresh the
            page to continue.
          </div>
          <button
            style={buttonStyle}
            onClick={this.handleRefresh}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = accents.muted;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = accents.highlight;
            }}
            data-testid="refresh-button"
          >
            Refresh Page
          </button>
          {this.state.error && (
            <div style={errorDetailsStyle}>
              <strong>Error details:</strong>
              <br />
              {this.state.error.toString()}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
