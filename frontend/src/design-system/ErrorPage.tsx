/**
 * ErrorPage Component
 *
 * Displays error messages with retry functionality.
 * Used for session loading errors and other critical failures.
 */

import { backgrounds, text, accents, semantic } from "./colors";

interface ErrorPageProps {
  error: string;
  onRetry: () => void;
}

export function ErrorPage({ error, onRetry }: ErrorPageProps) {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: backgrounds.canvas,
        color: text.primary,
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          textAlign: "center",
        }}
      >
        {/* Error Icon */}
        <div
          style={{
            fontSize: "48px",
            marginBottom: "1.5rem",
            color: semantic.critical,
          }}
        >
          ⚠️
        </div>

        {/* Error Title */}
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
            marginBottom: "1rem",
            color: text.primary,
          }}
        >
          Something went wrong
        </h1>

        {/* Error Message */}
        <p
          style={{
            fontSize: "16px",
            lineHeight: "1.5",
            marginBottom: "2rem",
            color: text.secondary,
          }}
        >
          {error}
        </p>

        {/* Retry Button */}
        <button
          onClick={onRetry}
          style={{
            backgroundColor: accents.highlight,
            color: backgrounds.canvas,
            border: "none",
            borderRadius: "6px",
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "background-color 150ms ease-out",
            marginBottom: "2rem",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = accents.muted;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = accents.highlight;
          }}
        >
          Retry
        </button>

        {/* Debug Info */}
        <div
          style={{
            fontSize: "14px",
            color: text.disabled,
            marginTop: "2rem",
            paddingTop: "2rem",
            borderTop: `1px solid ${backgrounds.hover}`,
          }}
        >
          <p style={{ marginBottom: "0.5rem" }}>
            Backend URL:{" "}
            <code style={{ color: text.secondary }}>{API_BASE_URL}</code>
          </p>
          <p style={{ fontSize: "12px" }}>
            If the problem persists, check that the backend server is running.
          </p>
        </div>
      </div>
    </div>
  );
}
