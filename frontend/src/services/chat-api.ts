/**
 * Chat API client for session and message management.
 * Handles all chat-related HTTP requests to the backend.
 */

import type {
  ChatSession,
  CreateSessionRequest,
  CreateSessionResponse,
  GetMessagesResponse,
  SessionListResponse,
  SessionStats,
} from "../types/chat";
import { ApiError, handleResponse } from "./api";
import { mapNetworkError } from "../utils/errorMapping";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ============================================================================
// Chat API Client
// ============================================================================

export class ChatAPI {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Create a new chat session
   */
  async createSession(documentId?: string): Promise<ChatSession> {
    try {
      const body: CreateSessionRequest = documentId
        ? { document_id: documentId }
        : {};

      const response = await fetch(`${this.baseURL}/api/chat/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await handleResponse<CreateSessionResponse>(response);
      return data.session;
    } catch (err) {
      if (err instanceof Error && !(err instanceof ApiError)) {
        throw new Error(mapNetworkError(err));
      }
      throw err;
    }
  }

  /**
   * Get all chat sessions
   */
  async getSessions(): Promise<ChatSession[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/chat/sessions`);
      const data = await handleResponse<SessionListResponse>(response);
      return data.sessions;
    } catch (err) {
      if (err instanceof Error && !(err instanceof ApiError)) {
        throw new Error(mapNetworkError(err));
      }
      throw err;
    }
  }

  /**
   * Get a specific chat session with message history
   */
  async getSession(id: string): Promise<ChatSession> {
    try {
      const response = await fetch(`${this.baseURL}/api/chat/sessions/${id}`);
      return handleResponse<ChatSession>(response);
    } catch (err) {
      if (err instanceof Error && !(err instanceof ApiError)) {
        throw new Error(mapNetworkError(err));
      }
      throw err;
    }
  }

  /**
   * Delete a chat session
   */
  async deleteSession(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/api/chat/sessions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({
          error: "Deletion failed",
          message: "Could not delete session. Please try again.",
        }));
        throw new ApiError(error.message, response.status);
      }
    } catch (err) {
      if (err instanceof Error && !(err instanceof ApiError)) {
        throw new Error(mapNetworkError(err));
      }
      throw err;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(id: string): Promise<SessionStats> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/chat/sessions/${id}/stats`,
      );
      return handleResponse<SessionStats>(response);
    } catch (err) {
      if (err instanceof Error && !(err instanceof ApiError)) {
        throw new Error(mapNetworkError(err));
      }
      throw err;
    }
  }

  /**
   * Get messages for a session
   */
  async getMessages(
    sessionId: string,
    limit = 50,
    offset = 0,
  ): Promise<GetMessagesResponse> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const response = await fetch(
        `${this.baseURL}/api/chat/sessions/${sessionId}/messages?${params}`,
      );
      return handleResponse<GetMessagesResponse>(response);
    } catch (err) {
      if (err instanceof Error && !(err instanceof ApiError)) {
        throw new Error(mapNetworkError(err));
      }
      throw err;
    }
  }
}

// Export singleton instance
export const chatAPI = new ChatAPI();
