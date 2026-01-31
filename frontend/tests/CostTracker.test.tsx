/**
 * CostTracker Component Tests
 *
 * Tests for the CostTracker component that displays session statistics
 * including tokens, cost, and cache hit rate.
 *
 * @see .kiro/specs/frontend-integration/phase-2/part1/requirements-part1.md Requirement 8.8
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CostTracker } from "../src/components/chat/CostTracker";

// =============================================================================
// SETUP
// =============================================================================

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// TESTS
// =============================================================================

describe("CostTracker", () => {
  describe("Data Fetching", () => {
    it("fetches stats from correct API endpoint", async () => {
      const sessionId = "test-session-123";
      const mockStats = {
        total_tokens: 1000,
        cached_tokens: 500,
        total_cost_usd: 0.0142,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<CostTracker sessionId={sessionId} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/chat/sessions/${sessionId}/stats`),
        );
      });
    });

    it("displays fetched stats correctly", async () => {
      const mockStats = {
        total_tokens: 1500,
        cached_tokens: 1200,
        total_cost_usd: 0.0256,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<CostTracker sessionId="test-session" />);

      await waitFor(() => {
        expect(screen.getByTestId("tokens-display")).toHaveTextContent(
          "Tokens: 1,500",
        );
      });

      expect(screen.getByTestId("cost-display")).toHaveTextContent(
        "Cost: $0.0256",
      );
      expect(screen.getByTestId("cache-display")).toHaveTextContent(
        "Cache: 80.0%",
      );
    });

    it("refetches stats when sessionId changes", async () => {
      const mockStats1 = {
        total_tokens: 1000,
        cached_tokens: 500,
        total_cost_usd: 0.01,
      };
      const mockStats2 = {
        total_tokens: 2000,
        cached_tokens: 1800,
        total_cost_usd: 0.02,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStats1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStats2,
        });

      const { rerender } = render(<CostTracker sessionId="session-1" />);

      await waitFor(() => {
        expect(screen.getByTestId("tokens-display")).toHaveTextContent(
          "Tokens: 1,000",
        );
      });

      // Change session ID
      rerender(<CostTracker sessionId="session-2" />);

      await waitFor(() => {
        expect(screen.getByTestId("tokens-display")).toHaveTextContent(
          "Tokens: 2,000",
        );
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("Display Formatting", () => {
    it("formats large token counts with commas", async () => {
      const mockStats = {
        total_tokens: 1234567,
        cached_tokens: 0,
        total_cost_usd: 1.5,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<CostTracker sessionId="test-session" />);

      await waitFor(() => {
        expect(screen.getByTestId("tokens-display")).toHaveTextContent(
          "Tokens: 1,234,567",
        );
      });
    });

    it("formats cost with 4 decimal places", async () => {
      const mockStats = {
        total_tokens: 1000,
        cached_tokens: 0,
        total_cost_usd: 0.123456789,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<CostTracker sessionId="test-session" />);

      await waitFor(() => {
        expect(screen.getByTestId("cost-display")).toHaveTextContent(
          "Cost: $0.1235",
        );
      });
    });

    it("formats cache hit rate with 1 decimal place", async () => {
      const mockStats = {
        total_tokens: 1000,
        cached_tokens: 333,
        total_cost_usd: 0.01,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<CostTracker sessionId="test-session" />);

      await waitFor(() => {
        expect(screen.getByTestId("cache-display")).toHaveTextContent(
          "Cache: 33.3%",
        );
      });
    });

    it("displays 0.0% cache rate when total_tokens is 0", async () => {
      const mockStats = {
        total_tokens: 0,
        cached_tokens: 0,
        total_cost_usd: 0.0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<CostTracker sessionId="test-session" />);

      await waitFor(() => {
        expect(screen.getByTestId("cache-display")).toHaveTextContent(
          "Cache: 0.0%",
        );
      });
    });

    it("displays 100.0% cache rate when all tokens cached", async () => {
      const mockStats = {
        total_tokens: 5000,
        cached_tokens: 5000,
        total_cost_usd: 0.007,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<CostTracker sessionId="test-session" />);

      await waitFor(() => {
        expect(screen.getByTestId("cache-display")).toHaveTextContent(
          "Cache: 100.0%",
        );
      });
    });
  });

  describe("Error Handling", () => {
    it("does not render when fetch fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<CostTracker sessionId="test-session" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Component should not render anything
      expect(screen.queryByTestId("cost-tracker")).not.toBeInTheDocument();
    });

    it("does not render when API returns non-OK status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      render(<CostTracker sessionId="test-session" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(screen.queryByTestId("cost-tracker")).not.toBeInTheDocument();
    });

    it("logs error to console when fetch fails", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<CostTracker sessionId="test-session" />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to fetch session stats:",
          expect.any(Error),
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Design System Integration", () => {
    it("uses design system tokens for styling", async () => {
      const mockStats = {
        total_tokens: 1000,
        cached_tokens: 500,
        total_cost_usd: 0.01,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<CostTracker sessionId="test-session" />);

      await waitFor(() => {
        const tracker = screen.getByTestId("cost-tracker");
        expect(tracker).toBeInTheDocument();
      });

      const tracker = screen.getByTestId("cost-tracker");
      const styles = window.getComputedStyle(tracker);

      // Verify monospace font family is used
      expect(styles.fontFamily).toContain("JetBrains Mono");
    });

    it("displays separator pipes between stats", async () => {
      const mockStats = {
        total_tokens: 1000,
        cached_tokens: 500,
        total_cost_usd: 0.01,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<CostTracker sessionId="test-session" />);

      await waitFor(() => {
        expect(screen.getByTestId("cost-tracker")).toBeInTheDocument();
      });

      const tracker = screen.getByTestId("cost-tracker");
      expect(tracker.textContent).toMatch(/\|.*\|/);
    });
  });

  describe("Edge Cases", () => {
    it("handles very small cost values", async () => {
      const mockStats = {
        total_tokens: 10,
        cached_tokens: 5,
        total_cost_usd: 0.0001,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<CostTracker sessionId="test-session" />);

      await waitFor(() => {
        expect(screen.getByTestId("cost-display")).toHaveTextContent(
          "Cost: $0.0001",
        );
      });
    });

    it("handles zero cost", async () => {
      const mockStats = {
        total_tokens: 0,
        cached_tokens: 0,
        total_cost_usd: 0.0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<CostTracker sessionId="test-session" />);

      await waitFor(() => {
        expect(screen.getByTestId("cost-display")).toHaveTextContent(
          "Cost: $0.0000",
        );
      });
    });

    it("handles cached_tokens greater than total_tokens gracefully", async () => {
      // This shouldn't happen in practice, but test defensive coding
      const mockStats = {
        total_tokens: 100,
        cached_tokens: 150,
        total_cost_usd: 0.001,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<CostTracker sessionId="test-session" />);

      await waitFor(() => {
        expect(screen.getByTestId("cache-display")).toHaveTextContent(
          "Cache: 150.0%",
        );
      });
    });
  });
});
