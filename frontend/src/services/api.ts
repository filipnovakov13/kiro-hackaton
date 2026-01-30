/**
 * API client for backend communication.
 * Handles document upload, status polling, and CRUD operations.
 */

import type {
  DocumentDetail,
  DocumentSummary,
  ErrorResponse,
  TaskStatusResponse,
  UploadResponse,
} from "../types/document";
import {
  mapHTTPError,
  mapUploadError,
  mapNetworkError,
} from "../utils/errorMapping";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ============================================================================
// Error Handling
// ============================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let error: ErrorResponse;
    try {
      error = await response.json();
    } catch {
      // If JSON parsing fails, use status text
      error = {
        error: response.statusText || "Unknown error",
        message: `HTTP ${response.status}: ${
          response.statusText || "Unknown error"
        }`,
      };
    }

    // Map error to user-friendly message
    const userMessage = mapHTTPError(response.status, error.message);

    throw new ApiError(userMessage, response.status, error.details);
  }
  return response.json();
}

// ============================================================================
// Document Upload
// ============================================================================

export async function uploadDocument(file: File): Promise<UploadResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
      method: "POST",
      body: formData,
    });

    return handleResponse<UploadResponse>(response);
  } catch (err) {
    if (err instanceof ApiError) {
      // Re-throw with upload-specific error mapping
      throw new ApiError(
        mapUploadError(err.message),
        err.statusCode,
        err.details,
      );
    }
    if (err instanceof Error) {
      throw new Error(mapNetworkError(err));
    }
    throw err;
  }
}

export async function ingestUrl(url: string): Promise<UploadResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    return handleResponse<UploadResponse>(response);
  } catch (err) {
    if (err instanceof ApiError) {
      // Re-throw with upload-specific error mapping
      throw new ApiError(
        mapUploadError(err.message),
        err.statusCode,
        err.details,
      );
    }
    if (err instanceof Error) {
      throw new Error(mapNetworkError(err));
    }
    throw err;
  }
}

// ============================================================================
// Status Polling
// ============================================================================

export async function getTaskStatus(
  taskId: string,
): Promise<TaskStatusResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/documents/status/${taskId}`,
  );
  return handleResponse<TaskStatusResponse>(response);
}

// ============================================================================
// Document CRUD
// ============================================================================

export async function listDocuments(): Promise<DocumentSummary[]> {
  const response = await fetch(`${API_BASE_URL}/api/documents`);
  const data = await handleResponse<{ documents: DocumentSummary[] }>(response);
  return data.documents;
}

export async function getDocument(id: string): Promise<DocumentDetail> {
  const response = await fetch(`${API_BASE_URL}/api/documents/${id}`);
  return handleResponse<DocumentDetail>(response);
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 204) {
    const error: ErrorResponse = await response.json().catch(() => ({
      error: "Deletion failed",
      message: "Could not delete document. Please try again.",
    }));
    throw new ApiError(error.message, response.status);
  }
}

// ============================================================================
// Legacy API Client (for backward compatibility)
// ============================================================================

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<T>(response);
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
