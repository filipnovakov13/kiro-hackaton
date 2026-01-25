/**
 * TypeScript types for chat functionality.
 * Matches backend Pydantic schemas for chat sessions and messages.
 */

// ============================================================================
// Chat Session Types
// ============================================================================

export interface ChatSession {
  id: string;
  document_id: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface SessionStats {
  message_count: number;
  total_tokens: number;
  total_cost: number;
  cache_hit_rate: number;
}

// ============================================================================
// Chat Message Types
// ============================================================================

export interface MessageMetadata {
  tokens?: number;
  cost?: number;
  sources?: Source[];
  focus_context?: FocusContext;
  cached?: boolean;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  metadata?: MessageMetadata;
}

// ============================================================================
// Focus Context Types
// ============================================================================

export interface FocusContext {
  start_char: number;
  end_char: number;
  context_text: string;
}

// ============================================================================
// Source Attribution Types
// ============================================================================

export interface Source {
  chunk_id: string;
  document_id: string;
  similarity: number;
  text: string;
}

// ============================================================================
// SSE Event Types
// ============================================================================

export type SSEEvent =
  | { type: "token"; data: string }
  | { type: "source"; data: Source }
  | { type: "done"; data?: { tokens: number; cost: number } }
  | { type: "error"; data: string };

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateSessionRequest {
  document_id?: string;
}

export interface CreateSessionResponse {
  session: ChatSession;
}

export interface SendMessageRequest {
  message: string;
  focus_context?: FocusContext;
}

export interface GetMessagesResponse {
  messages: ChatMessage[];
  total: number;
}

export interface SessionListResponse {
  sessions: ChatSession[];
}
