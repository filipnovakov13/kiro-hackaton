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
  }

  /**
   * Get all chat sessions
   */
  async getSessions(): Promise<ChatSession[]> {
    const response = await fetch(`${this.baseURL}/api/chat/sessions`);
    const data = await handleResponse<SessionListResponse>(response);
    return data.sessions;
  }

  /**
   * Get a specific chat session with message history
   */
  async getSession(id: string): Promise<ChatSession> {
    const response = await fetch(`${this.baseURL}/api/chat/sessions/${id}`);
    return handleResponse<ChatSession>(response);
  }

  /**
   * Delete a chat session
   */
  async deleteSession(id: string): Promise<void> {
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
  }

  /**
   * Get session statistics
   */
  async getSessionStats(id: string): Promise<SessionStats> {
    const response = await fetch(
      `${this.baseURL}/api/chat/sessions/${id}/stats`,
    );
    return handleResponse<SessionStats>(response);
  }

  /**
   * Get messages for a session
   */
  async getMessages(
    sessionId: string,
    limit = 50,
    offset = 0,
  ): Promise<GetMessagesResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(
      `${this.baseURL}/api/chat/sessions/${sessionId}/messages?${params}`,
    );
    return handleResponse<GetMessagesResponse>(response);
  }
}

// Export singleton instance
export const chatAPI = new ChatAPI();
