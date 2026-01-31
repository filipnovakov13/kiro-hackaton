/**
 * Property-Based Tests for Input Sanitization Safety
 *
 * Feature: frontend-integration-phase-2-part1
 * Property 10: Input Sanitization Safety
 * **Validates: Requirements 14.2**
 *
 * Tests verify that input sanitization removes dangerous content:
 * - For any user input containing HTML tags or JavaScript
 * - Sanitizing should remove or escape all potentially dangerous content
 * - While preserving safe formatting
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  sanitizeMarkdown,
  sanitizeHtml,
  isValidUrl,
  sanitizeUrl,
} from "../src/utils/sanitization";

describe("Input Sanitization Safety Properties", () => {
  /**
   * Property 10: Input Sanitization Safety
   *
   * For any user input string containing HTML tags or JavaScript:
   * - Sanitizing before rendering should remove or escape all potentially dangerous content
   * - While preserving safe formatting
   *
   * **Validates: Requirements 14.2**
   */
  it("Property 10: Script tags are removed from markdown", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom(
          "<script>alert('xss')</script>",
          "<script src='evil.js'></script>",
          "<script>document.cookie</script>",
        ),
        (safeContent, dangerousScript) => {
          const combined = `${safeContent}${dangerousScript}`;
          const sanitized = sanitizeMarkdown(combined);

          // Should not contain script tags
          expect(sanitized).not.toContain("<script");
          expect(sanitized).not.toContain("</script>");

          // Should always return a string
          expect(typeof sanitized).toBe("string");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10a: Event handlers are removed
   *
   * For any HTML with event handlers (onclick, onerror, etc.):
   * - Should remove all event handler attributes
   */
  it("Property 10a: Event handlers are removed", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "<img src=x onerror=alert(1)>",
          "<div onclick='alert(1)'>Click</div>",
          "<a href='#' onmouseover='alert(1)'>Link</a>",
          "<body onload='alert(1)'>",
          "<input onfocus='alert(1)'>",
        ),
        (dangerousHtml) => {
          const sanitized = sanitizeMarkdown(dangerousHtml);

          // Should not contain event handlers
          expect(sanitized).not.toMatch(/on\w+=/i);
          expect(sanitized).not.toContain("onerror");
          expect(sanitized).not.toContain("onclick");
          expect(sanitized).not.toContain("onload");
          expect(sanitized).not.toContain("onmouseover");
          expect(sanitized).not.toContain("onfocus");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10b: Data URIs with JavaScript are sanitized
   *
   * For any data: URI containing JavaScript:
   * - Script tags should be removed from the content
   */
  it("Property 10b: Data URIs with JavaScript are sanitized", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "<a href=\"data:text/html,<script>alert('xss')</script>\">Click</a>",
          "<img src=\"data:text/html,<script>alert('xss')</script>\">",
        ),
        (dangerousData) => {
          const sanitized = sanitizeMarkdown(dangerousData);

          // Should not contain script tags (even if data URI is preserved)
          expect(sanitized).not.toContain("<script");
          expect(sanitized).not.toContain("</script>");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10c: Safe HTML is preserved
   *
   * For safe HTML tags (p, strong, em, etc.):
   * - Should be preserved in the output
   * - Content may be HTML-encoded for safety
   */
  it("Property 10c: Safe HTML tags are preserved", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 100 })
          .filter(
            (s) => !s.includes("<") && !s.includes("&") && !s.includes(">"),
          ),
        (content) => {
          const safeHtml = `<p><strong>${content}</strong></p>`;
          const sanitized = sanitizeMarkdown(safeHtml);

          // Should preserve safe tags
          expect(sanitized).toContain("<p>");
          expect(sanitized).toContain("</p>");
          expect(sanitized).toContain("<strong>");
          expect(sanitized).toContain("</strong>");
          expect(sanitized).toContain(content);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10d: Sanitization is idempotent
   *
   * For any string, sanitizing multiple times should produce the same result
   */
  it("Property 10d: Sanitization is idempotent", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const sanitized1 = sanitizeMarkdown(input);
        const sanitized2 = sanitizeMarkdown(sanitized1);
        const sanitized3 = sanitizeMarkdown(sanitized2);

        // Multiple sanitizations should produce the same result
        expect(sanitized2).toBe(sanitized1);
        expect(sanitized3).toBe(sanitized1);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10e: HTML sanitization is more restrictive
   *
   * For any string, sanitizeHtml should be more restrictive than sanitizeMarkdown
   */
  it("Property 10e: HTML sanitization is more restrictive", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "<h1>Title</h1>",
          "<a href='#'>Link</a>",
          "<img src='image.jpg'>",
          "<table><tr><td>Cell</td></tr></table>",
        ),
        (html) => {
          const markdownSanitized = sanitizeMarkdown(html);
          const htmlSanitized = sanitizeHtml(html);

          // HTML sanitization should remove more tags
          expect(htmlSanitized.length).toBeLessThanOrEqual(
            markdownSanitized.length,
          );

          // HTML sanitization should not contain links, images, or tables
          expect(htmlSanitized).not.toContain("<a");
          expect(htmlSanitized).not.toContain("<img");
          expect(htmlSanitized).not.toContain("<table");
          expect(htmlSanitized).not.toContain("<h1");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10f: URL validation rejects dangerous protocols
   *
   * For any URL with dangerous protocols:
   * - Should return false
   */
  it("Property 10f: URL validation rejects dangerous protocols", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "javascript:alert(1)",
          "data:text/html,<script>alert(1)</script>",
          "vbscript:msgbox(1)",
          "file:///etc/passwd",
          "ftp://example.com",
        ),
        (dangerousUrl) => {
          const isValid = isValidUrl(dangerousUrl);

          // Should reject dangerous protocols
          expect(isValid).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10g: URL validation accepts safe protocols
   *
   * For any URL with http or https protocol:
   * - Should return true
   */
  it("Property 10g: URL validation accepts safe protocols", () => {
    fc.assert(
      fc.property(fc.webUrl({ validSchemes: ["http", "https"] }), (safeUrl) => {
        const isValid = isValidUrl(safeUrl);

        // Should accept safe protocols
        expect(isValid).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10h: URL sanitization removes dangerous protocols
   *
   * For any URL with dangerous protocols:
   * - Should return null
   */
  it("Property 10h: URL sanitization removes dangerous protocols", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "javascript:alert(1)",
          "data:text/html,<script>alert(1)</script>",
          "vbscript:msgbox(1)",
        ),
        (dangerousUrl) => {
          const sanitized = sanitizeUrl(dangerousUrl);

          // Should return null for dangerous URLs
          expect(sanitized).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10i: URL sanitization preserves safe URLs
   *
   * For any safe URL:
   * - Should return the normalized URL
   */
  it("Property 10i: URL sanitization preserves safe URLs", () => {
    fc.assert(
      fc.property(fc.webUrl({ validSchemes: ["http", "https"] }), (safeUrl) => {
        const sanitized = sanitizeUrl(safeUrl);

        // Should return a string (not null)
        expect(sanitized).not.toBeNull();
        expect(typeof sanitized).toBe("string");

        // Should be a valid URL
        expect(isValidUrl(sanitized!)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10j: Sanitization never throws errors
   *
   * For any input (including malformed):
   * - Sanitization functions should never throw
   */
  it("Property 10j: Sanitization never throws errors", () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        // Convert to string if not already, handle objects that can't be converted
        let str: string;
        try {
          str = String(input);
        } catch {
          // If String() throws (e.g., object with malformed toString), use fallback
          str = "[object]";
        }

        // Should not throw
        expect(() => sanitizeMarkdown(str)).not.toThrow();
        expect(() => sanitizeHtml(str)).not.toThrow();
        expect(() => isValidUrl(str)).not.toThrow();
        expect(() => sanitizeUrl(str)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });
});
