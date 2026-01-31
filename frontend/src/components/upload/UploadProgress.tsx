/**
 * Upload progress display component.
 * Shows processing status with visual feedback.
 * Works with useDocumentUpload hook data.
 *
 * Stages:
 * - uploading: Progress bar (0-100%)
 * - processing: Animated spinner
 * - ready: Checkmark icon (green)
 * - failed: X icon (red) + error message
 */

import { backgrounds, text, accents, spacing } from "../../design-system";

type UploadStage = "uploading" | "processing" | "ready" | "failed";

interface UploadProgressProps {
  stage: UploadStage;
  progress?: number; // 0-100 for uploading stage
  error?: string | null;
}

export function UploadProgress({
  stage,
  progress = 0,
  error,
}: UploadProgressProps) {
  // Styles
  const containerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: `${spacing.md}px`,
    padding: `${spacing.md}px`,
    backgroundColor: backgrounds.panel,
    borderRadius: "4px",
  };

  const iconStyle: React.CSSProperties = {
    width: "24px",
    height: "24px",
    flexShrink: 0,
  };

  const spinnerStyle: React.CSSProperties = {
    ...iconStyle,
    border: `2px solid ${backgrounds.hover}`,
    borderTopColor: accents.highlight,
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  };

  const progressBarContainerStyle: React.CSSProperties = {
    flex: 1,
    height: "8px",
    backgroundColor: backgrounds.hover,
    borderRadius: "4px",
    overflow: "hidden",
  };

  const progressBarFillStyle: React.CSSProperties = {
    height: "100%",
    width: `${progress}%`,
    backgroundColor: accents.highlight,
    transition: "width 0.3s ease-out",
  };

  const messageStyle: React.CSSProperties = {
    fontSize: "14px",
    color: text.primary,
  };

  const errorStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "#E74C3C",
    marginTop: `${spacing.xs}px`,
  };

  return (
    <>
      <div style={containerStyle} data-testid="upload-progress">
        {/* Uploading stage */}
        {stage === "uploading" && (
          <>
            <span style={messageStyle}>Uploading...</span>
            <div style={progressBarContainerStyle}>
              <div style={progressBarFillStyle} />
            </div>
            <span style={{ ...messageStyle, color: text.secondary }}>
              {progress}%
            </span>
          </>
        )}

        {/* Processing stage */}
        {stage === "processing" && (
          <>
            <div style={spinnerStyle} data-testid="spinner" />
            <span style={messageStyle}>Processing...</span>
          </>
        )}

        {/* Ready stage */}
        {stage === "ready" && (
          <>
            <svg
              style={{ ...iconStyle, color: "#27AE60" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              data-testid="success-icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span style={{ ...messageStyle, color: "#27AE60" }}>Ready!</span>
          </>
        )}

        {/* Failed stage */}
        {stage === "failed" && (
          <>
            <svg
              style={{ ...iconStyle, color: "#E74C3C" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              data-testid="error-icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <div style={{ flex: 1 }}>
              <span style={{ ...messageStyle, color: "#E74C3C" }}>
                Upload failed
              </span>
              {error && <div style={errorStyle}>{error}</div>}
            </div>
          </>
        )}
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
