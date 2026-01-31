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
    [stopPolling],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      setState({
        isUploading: true,
        taskId: null,
        status: "pending",
        progress: null,
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
    [startPolling],
  );

  const submitUrl = useCallback(
    async (url: string) => {
      setState({
        isUploading: true,
        taskId: null,
        status: "pending",
        progress: null,
        error: null,
        documentId: null,
      });

      try {
        const response = await ingestUrl(url);
        setState((prev) => ({
          ...prev,
          taskId: response.task_id,
        }));
        startPolling(response.task_id);
      } catch (err) {
        let errorMessage = "URL ingestion failed";

        if (err instanceof ApiError) {
          errorMessage = err.message;

          // Provide more helpful messages for common errors
          if (
            errorMessage.includes("Access denied") ||
            errorMessage.includes("login")
          ) {
            errorMessage = "URL requires authentication - try a public page";
          } else if (
            errorMessage.includes("404") ||
            errorMessage.includes("not found")
          ) {
            errorMessage = "URL not found - check the address";
          } else if (errorMessage.includes("timeout")) {
            errorMessage = "URL took too long to respond - try again";
          }
        }

        setState((prev) => ({
          ...prev,
          isUploading: false,
          error: errorMessage,
        }));
      }
    },
    [startPolling],
  );

  const submitGitHub = useCallback(
    async (repoUrl: string) => {
      setState({
        isUploading: true,
        taskId: null,
        status: "pending",
        progress: null,
        error: null,
        documentId: null,
      });

      try {
        // Fetch repository content via gitingest API
        const response = await fetch("https://gitingest.com/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: repoUrl }),
        });

        if (!response.ok) {
          let errorMessage = "Failed to fetch repository";

          if (response.status === 403) {
            errorMessage = "Private repository - authentication required";
          } else if (response.status === 429) {
            errorMessage = "Rate limit exceeded - please try again later";
          } else if (response.status === 413) {
            errorMessage = "Repository too large";
          } else if (response.status === 404) {
            errorMessage = "Repository not found - check the URL";
          } else if (response.status >= 500) {
            errorMessage = "GitHub service unavailable - try again later";
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();
        const content = data.content || data.text || "";

        if (!content) {
          throw new Error("No content received from repository");
        }

        // Create a file from the repository content and upload it
        const blob = new Blob([content], { type: "text/plain" });
        const repoName = repoUrl.split("/").slice(-2).join("_");
        const file = new File([blob], `${repoName}.txt`, {
          type: "text/plain",
        });

        // Upload the file through normal upload flow
        const uploadResponse = await uploadDocument(file);
        setState((prev) => ({
          ...prev,
          taskId: uploadResponse.task_id,
        }));
        startPolling(uploadResponse.task_id);
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isUploading: false,
          error: err instanceof Error ? err.message : "GitHub ingestion failed",
        }));
      }
    },
    [startPolling],
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
    submitGitHub,
    reset,
  };
}
