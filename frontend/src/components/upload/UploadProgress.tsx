/**
 * Upload progress display component.
 * Shows processing status with visual feedback.
 */

import { useEffect, useRef } from "react";
import type {
  UploadProgressProps,
  ProcessingStatus,
} from "../../types/document";
import { getTaskStatus, ApiError } from "../../services/api";

const POLL_INTERVAL = 2000; // 2 seconds

interface ProgressState {
  status: ProcessingStatus;
  progress: string;
  error: string | null;
}

export function UploadProgress({
  taskId,
  onComplete,
  onError,
}: UploadProgressProps) {
  const pollRef = useRef<number | null>(null);
  const stateRef = useRef<ProgressState>({
    status: "pending",
    progress: "Starting...",
    error: null,
  });

  useEffect(() => {
    const poll = async () => {
      try {
        const status = await getTaskStatus(taskId);
        stateRef.current = {
          status: status.status,
          progress: status.progress,
          error: status.error,
        };

        if (status.status === "complete") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          onComplete(status.document_id);
        } else if (status.status === "error") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          onError(status.error || "Processing failed");
        }
      } catch (err) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        onError(
          err instanceof ApiError ? err.message : "Failed to check status"
        );
      }
    };

    // Initial poll
    poll();
    // Continue polling
    pollRef.current = window.setInterval(poll, POLL_INTERVAL);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [taskId, onComplete, onError]);

  const { status, progress, error } = stateRef.current;

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

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
      {getStatusIcon()}
      <div className="flex-1">
        <p className={`font-medium ${getStatusColor()}`}>
          {status === "complete"
            ? "Document ready!"
            : status === "error"
            ? "Processing failed"
            : progress}
        </p>
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    </div>
  );
}
