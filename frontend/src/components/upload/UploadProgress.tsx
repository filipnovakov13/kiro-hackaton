/**
 * Upload progress display component.
 * Shows processing status with visual feedback.
 * Works with useDocumentUpload hook data.
 */

import type { ProcessingStatus } from "../../types/document";

interface UploadProgressProps {
  status: ProcessingStatus | null;
  progress: string | null;
  error: string | null;
}

export function UploadProgress({
  status,
  progress,
  error,
}: UploadProgressProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "complete":
        return (
          <svg
            className="w-6 h-6 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case "error":
        return (
          <svg
            className="w-6 h-6 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      default:
        return (
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "complete":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusMessage = () => {
    if (status === "complete") return "Document ready!";
    if (status === "error") return "Processing failed";
    return progress || "Processing...";
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
      {getStatusIcon()}
      <div className="flex-1">
        <p className={`font-medium ${getStatusColor()}`}>
          {getStatusMessage()}
        </p>
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    </div>
  );
}
