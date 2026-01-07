/**
 * Tests for App component functionality
 *
 * Requirements: 2.5, 5.2, 5.3, 5.5
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../src/App";
import { apiClient } from "../src/services/api";

// Mock the API client
vi.mock("../src/services/api", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockApiClient = vi.mocked(apiClient);

describe("App Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the main heading", () => {
      mockApiClient.get.mockResolvedValueOnce({
        status: "healthy",
        timestamp: "2024-01-01T00:00:00Z",
        service: "iubar-backend",
      });

      render(<App />);

      expect(
        screen.getByText("Iubar - AI-Enhanced Personal Knowledge Management")
      ).toBeInTheDocument();
    });

    it("should render welcome message", () => {
      mockApiClient.get.mockResolvedValueOnce({
        status: "healthy",
        timestamp: "2024-01-01T00:00:00Z",
        service: "iubar-backend",
      });

      render(<App />);

      expect(
        screen.getByText(
          "Welcome to Iubar, your intelligent learning companion."
        )
      ).toBeInTheDocument();
    });

    it("should render backend connection status section", () => {
      mockApiClient.get.mockResolvedValueOnce({
        status: "healthy",
        timestamp: "2024-01-01T00:00:00Z",
        service: "iubar-backend",
      });

      render(<App />);

      expect(screen.getByText("Backend Connection Status")).toBeInTheDocument();
    });

    it("should render next steps section", () => {
      mockApiClient.get.mockResolvedValueOnce({
        status: "healthy",
        timestamp: "2024-01-01T00:00:00Z",
        service: "iubar-backend",
      });

      render(<App />);

      expect(screen.getByText("Next Steps")).toBeInTheDocument();
      expect(
        screen.getByText("Upload your first document")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Start a conversation with the AI")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Explore your knowledge connections")
      ).toBeInTheDocument();
    });
  });

  describe("Backend Health Check", () => {
    it("should show checking status initially", () => {
      mockApiClient.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<App />);

      expect(screen.getByText(/Status:.*Checking\.\.\./)).toBeInTheDocument();
    });

    it("should show healthy status when backend responds successfully", async () => {
      mockApiClient.get.mockResolvedValueOnce({
        status: "healthy",
        timestamp: "2024-01-01T00:00:00Z",
        service: "iubar-backend",
      });

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText(/Status:.*Backend is healthy \(iubar-backend\)/)
        ).toBeInTheDocument();
      });

      expect(mockApiClient.get).toHaveBeenCalledWith("/health");
    });

    it("should show unavailable status when backend request fails", async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error("Connection failed"));

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText(/Status:.*Backend unavailable/)
        ).toBeInTheDocument();
      });

      expect(screen.getByText(/Error:.*Connection failed/)).toBeInTheDocument();
    });

    it("should handle unknown errors gracefully", async () => {
      mockApiClient.get.mockRejectedValueOnce("Unknown error");

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText(/Status:.*Backend unavailable/)
        ).toBeInTheDocument();
      });

      expect(screen.getByText(/Error:.*Unknown error/)).toBeInTheDocument();
    });
  });

  describe("API Integration", () => {
    it("should call health check endpoint on component mount", async () => {
      mockApiClient.get.mockResolvedValueOnce({
        status: "healthy",
        timestamp: "2024-01-01T00:00:00Z",
        service: "iubar-backend",
      });

      render(<App />);

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith("/health");
      });
    });

    it("should handle different backend service names", async () => {
      mockApiClient.get.mockResolvedValueOnce({
        status: "healthy",
        timestamp: "2024-01-01T00:00:00Z",
        service: "test-backend",
      });

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText(/Status:.*Backend is healthy \(test-backend\)/)
        ).toBeInTheDocument();
      });
    });

    it("should handle different backend status values", async () => {
      mockApiClient.get.mockResolvedValueOnce({
        status: "running",
        timestamp: "2024-01-01T00:00:00Z",
        service: "iubar-backend",
      });

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText(/Status:.*Backend is running \(iubar-backend\)/)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error Display", () => {
    it("should not show error section when backend is healthy", async () => {
      mockApiClient.get.mockResolvedValueOnce({
        status: "healthy",
        timestamp: "2024-01-01T00:00:00Z",
        service: "iubar-backend",
      });

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText(/Status:.*Backend is healthy/)
        ).toBeInTheDocument();
      });

      expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
    });

    it("should show error section when backend request fails", async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error("Network timeout"));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Error:.*Network timeout/)).toBeInTheDocument();
      });
    });
  });
});
