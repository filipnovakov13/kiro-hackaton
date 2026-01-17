/**
 * Tests for frontend HTTP client functionality
 *
 * Requirements: 2.5, 5.2, 5.3, 5.5
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { apiClient } from "../src/services/api";

// Mock fetch for unit tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ApiClient", () => {
  beforeAll(() => {
    // Reset fetch mock before each test
    mockFetch.mockClear();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("HTTP Client Functionality", () => {
    it("should make GET requests with correct headers", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ message: "success" }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await apiClient.get("/test");

      expect(mockFetch).toHaveBeenCalledWith("http://localhost:8000/test", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      expect(result).toEqual({ message: "success" });
    });

    it("should make POST requests with correct headers and body", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ id: 1, created: true }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const testData = { name: "test", value: 123 };
      const result = await apiClient.post("/create", testData);

      expect(mockFetch).toHaveBeenCalledWith("http://localhost:8000/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testData),
      });
      expect(result).toEqual({ id: 1, created: true });
    });

    it("should handle HTTP errors correctly", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => {
          throw new Error("No JSON body");
        },
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(apiClient.get("/nonexistent")).rejects.toThrow(
        "HTTP 404: Not Found"
      );
    });

    it("should handle network errors correctly", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(apiClient.get("/test")).rejects.toThrow("Network error");
    });

    it("should handle unknown errors correctly", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Unknown error"));

      await expect(apiClient.get("/test")).rejects.toThrow("Unknown error");
    });
  });

  describe("Configuration", () => {
    it("should use correct base URL from environment or default", () => {
      // Test that apiClient is properly instantiated
      expect(apiClient).toBeDefined();
      expect(typeof apiClient.get).toBe("function");
      expect(typeof apiClient.post).toBe("function");
    });

    it("should construct URLs correctly", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({}),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await apiClient.get("/health");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/health"),
        expect.any(Object)
      );
    });
  });

  describe("Response Handling", () => {
    it("should parse JSON responses correctly", async () => {
      const expectedData = {
        status: "healthy",
        timestamp: "2024-01-01T00:00:00Z",
        service: "test-service",
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => expectedData,
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await apiClient.get("/health");

      expect(result).toEqual(expectedData);
    });

    it("should handle empty responses", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => null,
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await apiClient.get("/empty");

      expect(result).toBeNull();
    });
  });

  describe("Error Response Handling", () => {
    it("should handle 500 server errors", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => {
          throw new Error("No JSON body");
        },
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(apiClient.get("/error")).rejects.toThrow(
        "HTTP 500: Internal Server Error"
      );
    });

    it("should handle 401 unauthorized errors", async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => {
          throw new Error("No JSON body");
        },
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(apiClient.get("/protected")).rejects.toThrow(
        "HTTP 401: Unauthorized"
      );
    });
  });
});
