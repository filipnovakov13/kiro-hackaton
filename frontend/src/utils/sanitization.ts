/**
 * Input sanitization utilities for security.
 * Prevents XSS attacks by sanitizing user input and markdown content.
 */

import DOMPurify from "dompurify";

/**
 * Sanitize markdown content before rendering.
 * Removes potentially dangerous HTML/JS while preserving safe formatting.
 */
export function sanitizeMarkdown(content: string): string {
  // Add hook to remove data URIs
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    // Remove data URIs from src and href attributes
    if (
      node.hasAttribute("src") &&
      node.getAttribute("src")?.startsWith("data:")
    ) {
      node.removeAttribute("src");
    }
    if (
      node.hasAttribute("href") &&
      node.getAttribute("href")?.startsWith("data:")
    ) {
      node.removeAttribute("href");
    }
  });

  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "a",
      "code",
      "pre",
      "blockquote",
      "strong",
      "em",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "br",
      "hr",
      "img",
      "span",
      "div",
    ],
    ALLOWED_ATTR: ["href", "class", "src", "alt", "title"],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true, // Force parsing as body content to handle malformed HTML
  });

  // Remove the hook after sanitization
  DOMPurify.removeAllHooks();

  return sanitized;
}

/**
 * Sanitize HTML content for display.
 * More restrictive than markdown sanitization.
 */
export function sanitizeHtml(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "code"],
    ALLOWED_ATTR: [],
  });
}

/**
 * Validate URL before opening or fetching.
 * Returns true if URL is safe to use.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Sanitize URL by validating and normalizing.
 * Returns null if URL is invalid.
 */
export function sanitizeUrl(url: string): string | null {
  if (!isValidUrl(url)) {
    return null;
  }

  try {
    const parsed = new URL(url);
    // Remove any javascript: or data: protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
