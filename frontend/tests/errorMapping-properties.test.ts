/**
 * Property-Based Tests for Error Message Mapping
 *
 * Validates: Requirement 7.3
 *
 * Tests verify that all backend error codes and messages map to user-friendly
 * messages that are clear, actionable, and helpful to users.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  mapHTTPError,
  mapUploadError,
  mapValidationError,
  mapNetworkError,
} from "../src/utils/errorMapping";

describe("Error Message Mapping Properties", () => {
  /**
   * Property 1: HTTP error codes always return user-friendly messages
   *
   * For any HTTP status code:
   * - Returns a non-empty string
   * - Message is user-friendly (no technical jargon)
   * - Message provides actionable guidance
   */
  it("Property 1: HTTP errors map to user-friendly messages", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(404, 429, 500, 503, 400, 401, 403),
        (statusCode) => {
          const message = mapHTTPError(statusCode);

          // Must return a non-empty string
          expect(message).toBeTruthy();
          expect(typeof message).toBe("string");
          expect(message.length).toBeGreaterThan(0);

          // Should not contain technical terms
          expect(message.toLowerCase()).not.toContain("http");
          expect(message.toLowerCase()).not.toContain("status");
          expect(message.toLowerCase()).not.toContain("code");

          // Should end with proper punctuation
          expect(message).toMatch(/[.!]$/);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 2: Known HTTP errors have specific messages
   *
   * For known HTTP status codes (404, 429, 500, 503):
   * - Each has a unique, specific message
   * - Messages are consistent across calls
   */
  it("Property 2: Known HTTP errors have consistent specific messages", () => {
    const knownErrors = [
      { code: 404, expectedSubstring: "not found" },
      { code: 429, expectedSubstring: "too many" },
      { code: 500, expectedSubstring: "went wrong" },
      { code: 503, expectedSubstring: "unavailable" },
    ];

    knownErrors.forEach(({ code, expectedSubstring }) => {
      const message = mapHTTPError(code);
      expect(message.toLowerCase()).toContain(expectedSubstring);
    });
  });

  /**
   * Property 3: Upload errors map to specific user-friendly messages
   *
   * For any known upload error:
   * - Returns the correct user-friendly message
   * - Message is actionable and clear
   * - Provides guidance on how to fix the issue
   */
  it("Property 3: Upload errors map to specific messages", () => {
    const uploadErrors = [
      {
        backend: "File too large",
        expected: "This file is too large. Maximum size is 10MB.",
      },
      {
        backend: "Unsupported file type",
        expected:
          "This file type is not supported. Please upload PDF, DOCX, TXT, or MD files.",
      },
      {
        backend: "Could not read this file",
        expected:
          "Could not read this file. It may be corrupted or password-protected.",
      },
      {
        backend: "Processing timeout",
        expected:
          "Document processing took too long. Please try a smaller file.",
      },
      {
        backend: "Invalid file format",
        expected:
          "This file format is invalid. Please upload a valid document.",
      },
    ];

    uploadErrors.forEach(({ backend, expected }) => {
      const mapped = mapUploadError(backend);
      expect(mapped).toBe(expected);
    });
  });

  /**
   * Property 4: Partial upload error matches work correctly
   *
   * For any upload error containing known keywords:
   * - Partial matches return the correct message
   * - Case-insensitive matching works
   */
  it("Property 4: Partial upload error matching works", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "file too large for processing",
          "UNSUPPORTED FILE TYPE: .exe",
          "Could not read this file - corrupted",
          "processing timeout exceeded",
          "invalid file format detected",
        ),
        (errorMessage) => {
          const mapped = mapUploadError(errorMessage);

          // Should not return the default fallback
          expect(mapped).not.toBe(
            "Failed to upload document. Please try again.",
          );

          // Should return a specific message
          expect(mapped.length).toBeGreaterThan(30);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 5: Unknown upload errors return safe fallback
   *
   * For any unknown upload error:
   * - Returns a generic but helpful message
   * - Never returns empty string or undefined
   * - Message is still user-friendly
   */
  it("Property 5: Unknown upload errors return safe fallback", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 100 })
          .filter(
            (s) =>
              !s.toLowerCase().includes("large") &&
              !s.toLowerCase().includes("unsupported") &&
              !s.toLowerCase().includes("read") &&
              !s.toLowerCase().includes("timeout") &&
              !s.toLowerCase().includes("invalid"),
          ),
        (unknownError) => {
          const mapped = mapUploadError(unknownError);

          // Must return the fallback message
          expect(mapped).toBe("Failed to upload document. Please try again.");
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 6: Validation errors map correctly by field
   *
   * For any validation error:
   * - Field-specific errors return appropriate messages
   * - Messages provide clear guidance
   */
  it("Property 6: Validation errors map correctly by field", () => {
    const validationTests = [
      {
        field: "message",
        error: "empty",
        expected: "Message cannot be empty.",
      },
      {
        field: "message",
        error: "too long",
        expected: "Message is too long. Maximum length is 6000 characters.",
      },
      {
        field: "message",
        error: "no session",
        expected: "No active session. Please upload a document first.",
      },
      {
        field: "file",
        error: "too large",
        expected: "File is too large. Maximum size is 10MB.",
      },
      {
        field: "file",
        error: "invalid type",
        expected:
          "Invalid file type. Please upload PDF, DOCX, TXT, or MD files.",
      },
      {
        field: "file",
        error: "empty",
        expected: "Please select a file to upload.",
      },
    ];

    validationTests.forEach(({ field, error, expected }) => {
      const mapped = mapValidationError(field, error);
      expect(mapped).toBe(expected);
    });
  });

  /**
   * Property 7: Network errors map to connection-related messages
   *
   * For any network error:
   * - TypeError maps to connection error
   * - Timeout errors mention timeout
   * - Abort errors mention cancellation
   */
  it("Property 7: Network errors map to appropriate messages", () => {
    // Test TypeError (connection error)
    const typeError = new TypeError("Failed to fetch");
    const typeErrorMessage = mapNetworkError(typeError);
    expect(typeErrorMessage.toLowerCase()).toContain("connect");
    expect(typeErrorMessage.toLowerCase()).toContain("server");

    // Test timeout error
    const timeoutError = new Error("Request timeout exceeded");
    const timeoutMessage = mapNetworkError(timeoutError);
    expect(timeoutMessage.toLowerCase()).toMatch(/timeout|timed out/);

    // Test abort error
    const abortError = new Error("Request aborted by user");
    const abortMessage = mapNetworkError(abortError);
    expect(abortMessage.toLowerCase()).toContain("cancel");

    // Test generic error
    const genericError = new Error("Something went wrong");
    const genericMessage = mapNetworkError(genericError);
    expect(genericMessage.toLowerCase()).toContain("network");
  });

  /**
   * Property 8: All error messages are user-friendly
   *
   * For any error message returned by mapping functions:
   * - No technical jargon (HTTP, status code, stack trace)
   * - Proper capitalization and punctuation
   * - Actionable guidance when possible
   */
  it("Property 8: All error messages follow user-friendly guidelines", () => {
    const allMessages = [
      mapHTTPError(404),
      mapHTTPError(429),
      mapHTTPError(500),
      mapHTTPError(503),
      mapUploadError("File too large"),
      mapUploadError("Unsupported file type"),
      mapValidationError("message", "empty"),
      mapValidationError("file", "too large"),
      mapNetworkError(new TypeError("Failed to fetch")),
    ];

    allMessages.forEach((message) => {
      // Must be non-empty
      expect(message.length).toBeGreaterThan(0);

      // Must start with capital letter
      expect(message[0]).toMatch(/[A-Z]/);

      // Must end with punctuation
      expect(message).toMatch(/[.!]$/);

      // Should not contain technical terms
      expect(message.toLowerCase()).not.toContain("http");
      expect(message.toLowerCase()).not.toContain("exception");
      expect(message.toLowerCase()).not.toContain("stack");
      expect(message.toLowerCase()).not.toContain("undefined");
      expect(message.toLowerCase()).not.toContain("null");
    });
  });

  /**
   * Property 9: Error messages are consistent across multiple calls
   *
   * For any error input:
   * - Same input always produces same output
   * - No randomness or state dependency
   */
  it("Property 9: Error messages are deterministic", () => {
    fc.assert(
      fc.property(fc.constantFrom(404, 429, 500, 503), (statusCode) => {
        const message1 = mapHTTPError(statusCode);
        const message2 = mapHTTPError(statusCode);
        const message3 = mapHTTPError(statusCode);

        // All calls return identical messages
        expect(message1).toBe(message2);
        expect(message2).toBe(message3);
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property 10: Error messages have reasonable length
   *
   * For any error message:
   * - Not too short (at least 20 characters)
   * - Not too long (at most 200 characters)
   * - Concise but informative
   */
  it("Property 10: Error messages have reasonable length", () => {
    const allMessages = [
      mapHTTPError(404),
      mapHTTPError(429),
      mapHTTPError(500),
      mapUploadError("File too large"),
      mapUploadError("Unsupported file type"),
      mapValidationError("message", "empty"),
      mapNetworkError(new TypeError("Failed to fetch")),
    ];

    allMessages.forEach((message) => {
      expect(message.length).toBeGreaterThanOrEqual(20);
      expect(message.length).toBeLessThanOrEqual(200);
    });
  });
});
