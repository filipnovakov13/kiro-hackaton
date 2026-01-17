/**
 * Custom hook for document upload state management.
 * Handles upload, polling, and status tracking.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  uploadDocument,
  ingestUrl,
  getTaskStatus,
  ApiError,
} from "../services/api";
import type { ProcessingStatus, TaskStatusResponse } from "../types/document";

interface UploadState {
  isUploading: boolean;
  taskId: string | null;
  status: ProcessingStatus | null;
  progress: string | null;
  error: string | null;
  documentId: string | null;
}

const POLL_INTERVAL = 2000; // 2 seconds

export function useDocumentUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    taskId: null,
    status: null,
    progress: null,
    error: null,
    documentId: null,
  });

  const pollIntervalRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (taskId: string) => {
      stopPolling();

      const poll = async () => {
        try {
          const status: TaskStatusResponse = await getTaskStatus(taskId);

          setState((prev) => ({
            ...prev,
            status: status.status,
            progress: status.progress,
            error: status.error,
            documentId: status.document_id,
          }));

          if (status.status === "complete" || status.status === "error") {
            stopPolling();
            setState((prev) => ({ ...prev, isUploading: false }));
          }
        } catch (err) {
          stopPolling();
          setState((prev) => ({
            ...prev,
            isUploading: false,
            error:
              err instanceof ApiError ? err.message : "Failed to check status",
          }));
        }
      };

      // Initial poll
      poll();
      // Continue polling
      pollIntervalRef.current = window.setInterval(poll, POLL_INTERVAL);
    },
    [stopPolling]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      setState({
        isUploading: true,
        taskId: null,
        status: "pending",
        progress: "Uploading...",
        error: null,
        documentId: null,
      });

      try {
        const response = await uploadDocument(file);
        setState((prev) => ({ ...prev, taskId: response.task_id }));
        startPolling(response.task_id);
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isUploading: false,
          error: err instanceof ApiError ? err.message : "Upload failed",
        }));
      }
    },
    [startPolling]
  );

  const submitUrl = useCallback(
    async (url: string) => {
      setState({
        isUploading: true,
        taskId: null,
        status: "pending",
        progress: "Fetching URL...",
        error: null,
        documentId: null,
      });

      try {
        const response = await ingestUrl(url);
        setState((prev) => ({ ...prev, taskId: response.task_id }));
        startPolling(response.task_id);
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isUploading: false,
          error: err instanceof ApiError ? err.message : "URL ingestion failed",
        }));
      }
    },
    [startPolling]
  );

  const reset = useCallback(() => {
    stopPolling();
    setState({
      isUploading: false,
      taskId: null,
      status: null,
      progress: null,
      error: null,
      documentId: null,
    });
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    ...state,
    uploadFile,
    submitUrl,
    reset,
  };
}
