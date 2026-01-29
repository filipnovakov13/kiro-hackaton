/**
 * React hook for managing chat session state.
 * Handles session CRUD operations and statistics.
 */

import { useState, useCallback } from "react";
import { chatAPI } from "../services/chat-api";
import type { ChatSession, SessionStats } from "../types/chat";

interface UseChatSessionReturn {
  session: ChatSession | null;
  sessions: ChatSession[];
  stats: SessionStats | null;
  loading: boolean;
  error: string | null;
  createSession: (documentId?: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: () => Promise<void>;
  fetchStats: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing chat sessions
 */
export function useChatSession(): UseChatSessionReturn {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new chat session
   */
  const createSession = useCallback(async (documentId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const newSession = await chatAPI.createSession(documentId);
      setSession(newSession);
    } catch (err: any) {
      setError(err.message || "Failed to create session");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load all chat sessions
   */
  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const allSessions = await chatAPI.getSessions();
      setSessions(allSessions);
    } catch (err: any) {
      setError(err.message || "Failed to load sessions");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load a specific chat session
   */
  const loadSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const loadedSession = await chatAPI.getSession(sessionId);
      setSession(loadedSession);
    } catch (err: any) {
      setError(err.message || "Failed to load session");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete the current session
   */
  const deleteSession = useCallback(async () => {
    if (!session) {
      setError("No session to delete");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await chatAPI.deleteSession(session.id);
      setSession(null);
      setStats(null);
    } catch (err: any) {
      setError(err.message || "Failed to delete session");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  /**
   * Fetch statistics for the current session
   */
  const fetchStats = useCallback(async () => {
    if (!session) {
      setError("No session selected");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sessionStats = await chatAPI.getSessionStats(session.id);
      setStats(sessionStats);
    } catch (err: any) {
      setError(err.message || "Failed to fetch stats");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    session,
    sessions,
    stats,
    loading,
    error,
    createSession,
    loadSessions,
    loadSession,
    deleteSession,
    fetchStats,
    clearError,
  };
}
