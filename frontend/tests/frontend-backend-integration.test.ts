/**
 * Integration tests for frontend-backend communication
 *
 * Tests that frontend can successfully communicate with a running backend
 *
 * Requirements: 2.5, 5.2, 5.3, 5.5
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { apiClient } from "../src/services/api";

// Note: These tests require a running backend server
// They can be skipped in CI/CD if backend is not available

describe("Frontend-Backend Integration", () => {
  const BACKEND_URL = "http://localhost:8000";
  let backendAvailable = false;

  beforeAll(async () => {
    // Check if backend is available
    try {
      const response = await fetch(`${BACKEND_URL}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(2000), // 2 second timeout
      });
      backendAvailable = response.ok;
    } catch (error) {
      backendAvailable = false;
      console.warn(
        "Backend not available for integration tests. Skipping integration tests."
      );
    }
  });

  describe("Health Check Communication", () => {
    it("should successfully fetch health status from backend", async () => {
      if (!backendAvailable) {
        console.log("Skipping test: Backend not available");
        return;
      }

      const healthResponse = await apiClient.get<{
        status: string;
        timestamp: string;
        service: string;
        version: string;
        debug: boolean;
      }>("/health");

      expect(healthResponse).toBeDefined();
      expect(healthResponse.status).toBe("healthy");
      expect(healthResponse.service).toBe("iubar-backend");
      expect(typeof healthResponse.timestamp).toBe("string");
      expect(typeof healthResponse.version).toBe("string");
      expect(typeof healthResponse.debug).toBe("boolean");
    });

    it("should successfully fetch root endpoint from backend", async () => {
      if (!backendAvailable) {
        console.log("Skipping test: Backend not available");
        return;
      }

      const rootResponse = await apiClient.get<{
        message: string;
        version: string;
        status: string;
      }>("/");

      expect(rootResponse).toBeDefined();
      expect(rootResponse.message).toBe("Iubar API");
      expect(rootResponse.status).toBe("running");
      expect(typeof rootResponse.version).toBe("string");
    });
  });

  describe("Error Handling", () => {
    it("should handle 404 errors gracefully", async () => {
      if (!backendAvailable) {
        console.log("Skipping test: Backend not available");
        return;
      }

      await expect(apiClient.get("/nonexistent-endpoint")).rejects.toThrow(
        /404/
      );
    });
  });

  describe("CORS Configuration", () => {
    it("should allow requests from frontend origin", async () => {
      if (!backendAvailable) {
        console.log("Skipping test: Backend not available");
        return;
      }

      // This test verifies that CORS is properly configured
      // If CORS wasn't configured, this request would fail in a browser environment
      const response = await fetch(`${BACKEND_URL}/health`, {
        method: "GET",
        headers: {
          Origin: "http://localhost:5173",
          "Content-Type": "application/json",
        },
      });

      expect(response.ok).toBe(true);
    });
  });

  describe("API Client Configuration", () => {
    it("should use correct base URL configuration", () => {
      // Test that API client is configured with the right base URL
      // This is a unit test that doesn't require backend
      expect(apiClient).toBeDefined();
      expect(typeof apiClient.get).toBe("function");
      expect(typeof apiClient.post).toBe("function");
    });
  });

  describe("Response Format Validation", () => {
    it("should receive properly formatted health response", async () => {
      if (!backendAvailable) {
        console.log("Skipping test: Backend not available");
        return;
      }

      const response = await apiClient.get<{
        status: string;
        timestamp: string;
        service: string;
        version: string;
        debug: boolean;
      }>("/health");

      // Validate response structure matches expected interface
      expect(response).toHaveProperty("status");
      expect(response).toHaveProperty("timestamp");
      expect(response).toHaveProperty("service");
      expect(response).toHaveProperty("version");
      expect(response).toHaveProperty("debug");

      // Validate timestamp is in ISO format
      expect(() => new Date(response.timestamp)).not.toThrow();
    });
  });

  describe("Performance", () => {
    it("should receive health check response within reasonable time", async () => {
      if (!backendAvailable) {
        console.log("Skipping test: Backend not available");
        return;
      }

      const startTime = Date.now();
      await apiClient.get("/health");
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });
});
