/**
 * CostTracker Component
 *
 * Displays session statistics including:
 * - Total tokens used
 * - Total cost in USD
 * - Cache hit rate percentage
 *
 * Fetches data from /api/chat/sessions/{id}/stats endpoint
 *
 * @see .kiro/specs/frontend-integration/phase-2/part1/requirements-part1.md Requirement 8.8
 */

import { useState, useEffect } from "react";
import { text, spacing } from "../../design-system";
import { typography, fontFamilies } from "../../design-system/typography";

// =============================================================================
// TYPES
// =============================================================================

interface SessionStats {
  total_tokens: number;
  cached_tokens: number;
  total_cost_usd: number;
}

interface CostTrackerProps {
  /** Session ID to fetch stats for */
  sessionId: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CostTracker({ sessionId }: CostTrackerProps) {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiBaseUrl =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
        const response = await fetch(
          `${apiBaseUrl}/api/chat/sessions/${sessionId}/stats`,
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch session stats:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch stats");
      }
    };

    fetchStats();
  }, [sessionId]);

  // Don't render if no stats or error
  if (error || !stats) {
    return null;
  }

  // Calculate cache hit rate
  const cacheHitRate =
    stats.total_tokens > 0
      ? ((stats.cached_tokens / stats.total_tokens) * 100).toFixed(1)
      : "0.0";

  return (
    <div
      style={{
        fontSize: `${typography.caption.fontSize}px`,
        color: text.secondary,
        fontFamily: fontFamilies.mono,
        padding: `${spacing.sm}px ${spacing.md}px`,
        display: "flex",
        alignItems: "center",
        gap: `${spacing.sm}px`,
      }}
      data-testid="cost-tracker"
    >
      <span data-testid="tokens-display">
        Tokens: {stats.total_tokens.toLocaleString()}
      </span>
      <span>|</span>
      <span data-testid="cost-display">
        Cost: ${stats.total_cost_usd.toFixed(4)}
      </span>
      <span>|</span>
      <span data-testid="cache-display">Cache: {cacheHitRate}%</span>
    </div>
  );
}
