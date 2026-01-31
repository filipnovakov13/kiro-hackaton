/**
 * Property-Based Tests for GitHub URL Validation
 *
 * Feature: frontend-integration-phase-2-part1
 * Property 9: GitHub URL Validation
 * **Validates: Requirements 15.4.3**
 *
 * Tests verify that GitHub URL validation works correctly:
 * - Only strings matching https://github.com/{owner}/{repo} are accepted
 * - All other inputs are rejected with descriptive error
 */

import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import { render, screen, fireEvent } from "@testing-library/react";
import { GitHubInput } from "../src/components/upload/GitHubInput";

// Valid GitHub URL pattern
const GITHUB_URL_REGEX = /^https:\/\/github\.com\/[\w-]+\/[\w-]+\/?$/;

describe("GitHub URL Validation Properties", () => {
  /**
   * Property 9: GitHub URL Validation
   *
   * For any string input to GitHub upload:
   * - Only strings matching https://github.com/{owner}/{repo} should be accepted
   * - All other inputs should be rejected with a descriptive error
   *
   * **Validates: Requirements 15.4.3**
   */
  it("Property 9: Valid GitHub URLs are accepted", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,39}$/), // owner
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,100}$/), // repo
        ),
        ([owner, repo]) => {
          const url = `https://github.com/${owner}/${repo}`;
          const handleSubmit = vi.fn();

          const { unmount } = render(<GitHubInput onSubmit={handleSubmit} />);

          const input = screen.getByLabelText("GitHub repository URL");
          const button = screen.getByLabelText("Ingest GitHub repository");

          // Enter valid URL
          fireEvent.change(input, { target: { value: url } });
          fireEvent.click(button);

          // Should call submit handler
          expect(handleSubmit).toHaveBeenCalledTimes(1);
          expect(handleSubmit).toHaveBeenCalledWith(url);

          // Should not show error
          expect(screen.queryByRole("alert")).not.toBeInTheDocument();

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9a: Invalid URLs are rejected
   *
   * For any string that doesn't match the GitHub URL pattern:
   * - Should show an error message
   * - Should not call the submit handler
   */
  it("Property 9a: Invalid URLs are rejected with error", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s.trim() !== "" && !GITHUB_URL_REGEX.test(s)),
        (invalidUrl) => {
          const handleSubmit = vi.fn();

          const { unmount } = render(<GitHubInput onSubmit={handleSubmit} />);

          const input = screen.getByLabelText("GitHub repository URL");
          const button = screen.getByLabelText("Ingest GitHub repository");

          // Enter invalid URL
          fireEvent.change(input, { target: { value: invalidUrl } });
          fireEvent.click(button);

          // Should not call submit handler
          expect(handleSubmit).not.toHaveBeenCalled();

          // Should show error
          const error = screen.getByRole("alert");
          expect(error).toBeInTheDocument();
          expect(error.textContent).toContain("Invalid GitHub URL");

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9b: Empty string disables submit button
   *
   * For empty or whitespace-only strings:
   * - Submit button should be disabled
   * - Should not call the submit handler
   */
  it("Property 9b: Empty string disables submit button", () => {
    const handleSubmit = vi.fn();

    const { unmount } = render(<GitHubInput onSubmit={handleSubmit} />);

    const input = screen.getByLabelText("GitHub repository URL");
    const button = screen.getByLabelText("Ingest GitHub repository");

    // Initially button should be disabled (empty input)
    expect(button).toBeDisabled();

    // Enter whitespace
    fireEvent.change(input, { target: { value: "   " } });

    // Button should still be disabled
    expect(button).toBeDisabled();

    // Try to click (should not work)
    fireEvent.click(button);

    // Should not call submit handler
    expect(handleSubmit).not.toHaveBeenCalled();

    unmount();
  });

  /**
   * Property 9c: Trailing slash is normalized
   *
   * For valid GitHub URLs with or without trailing slash:
   * - Both should be accepted
   * - Trailing slash should be removed before submission
   */
  it("Property 9c: Trailing slash is normalized", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,39}$/), // owner
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,100}$/), // repo
          fc.boolean(), // with or without trailing slash
        ),
        ([owner, repo, withSlash]) => {
          const urlWithoutSlash = `https://github.com/${owner}/${repo}`;
          const url = withSlash ? `${urlWithoutSlash}/` : urlWithoutSlash;
          const handleSubmit = vi.fn();

          const { unmount } = render(<GitHubInput onSubmit={handleSubmit} />);

          const input = screen.getByLabelText("GitHub repository URL");
          const button = screen.getByLabelText("Ingest GitHub repository");

          // Enter URL
          fireEvent.change(input, { target: { value: url } });
          fireEvent.click(button);

          // Should call submit handler with normalized URL (no trailing slash)
          expect(handleSubmit).toHaveBeenCalledTimes(1);
          expect(handleSubmit).toHaveBeenCalledWith(urlWithoutSlash);

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9d: Non-GitHub domains are rejected
   *
   * For URLs with different domains:
   * - Should be rejected with error
   */
  it("Property 9d: Non-GitHub domains are rejected", () => {
    fc.assert(
      fc.property(
        fc.webUrl().filter((url) => !url.includes("github.com")),
        (nonGitHubUrl) => {
          const handleSubmit = vi.fn();

          const { unmount } = render(<GitHubInput onSubmit={handleSubmit} />);

          const input = screen.getByLabelText("GitHub repository URL");
          const button = screen.getByLabelText("Ingest GitHub repository");

          // Enter non-GitHub URL
          fireEvent.change(input, { target: { value: nonGitHubUrl } });
          fireEvent.click(button);

          // Should not call submit handler
          expect(handleSubmit).not.toHaveBeenCalled();

          // Should show error
          expect(screen.getByRole("alert")).toBeInTheDocument();

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9e: HTTP (non-HTTPS) URLs are rejected
   *
   * For HTTP URLs (not HTTPS):
   * - Should be rejected with error
   */
  it("Property 9e: HTTP URLs are rejected", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,39}$/), // owner
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,100}$/), // repo
        ),
        ([owner, repo]) => {
          const httpUrl = `http://github.com/${owner}/${repo}`;
          const handleSubmit = vi.fn();

          const { unmount } = render(<GitHubInput onSubmit={handleSubmit} />);

          const input = screen.getByLabelText("GitHub repository URL");
          const button = screen.getByLabelText("Ingest GitHub repository");

          // Enter HTTP URL
          fireEvent.change(input, { target: { value: httpUrl } });
          fireEvent.click(button);

          // Should not call submit handler
          expect(handleSubmit).not.toHaveBeenCalled();

          // Should show error
          expect(screen.getByRole("alert")).toBeInTheDocument();

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9f: URLs with extra path segments are rejected
   *
   * For GitHub URLs with additional path segments:
   * - Should be rejected with error
   */
  it("Property 9f: URLs with extra path segments are rejected", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,39}$/), // owner
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,100}$/), // repo
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/), // extra path
        ),
        ([owner, repo, extraPath]) => {
          const urlWithExtra = `https://github.com/${owner}/${repo}/${extraPath}`;
          const handleSubmit = vi.fn();

          const { unmount } = render(<GitHubInput onSubmit={handleSubmit} />);

          const input = screen.getByLabelText("GitHub repository URL");
          const button = screen.getByLabelText("Ingest GitHub repository");

          // Enter URL with extra path
          fireEvent.change(input, { target: { value: urlWithExtra } });
          fireEvent.click(button);

          // Should not call submit handler
          expect(handleSubmit).not.toHaveBeenCalled();

          // Should show error
          expect(screen.getByRole("alert")).toBeInTheDocument();

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9g: Error clears when valid input is entered
   *
   * After showing an error, entering valid input should clear the error
   */
  it("Property 9g: Error clears when valid input is entered", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc
            .string()
            .filter((s) => s.trim() !== "" && !GITHUB_URL_REGEX.test(s)), // invalid
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,39}$/), // owner
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,100}$/), // repo
        ),
        ([invalidUrl, owner, repo]) => {
          const validUrl = `https://github.com/${owner}/${repo}`;
          const handleSubmit = vi.fn();

          const { unmount } = render(<GitHubInput onSubmit={handleSubmit} />);

          const input = screen.getByLabelText("GitHub repository URL");
          const button = screen.getByLabelText("Ingest GitHub repository");

          // Enter invalid URL
          fireEvent.change(input, { target: { value: invalidUrl } });
          fireEvent.click(button);

          // Should show error
          expect(screen.getByRole("alert")).toBeInTheDocument();

          // Enter valid URL
          fireEvent.change(input, { target: { value: validUrl } });

          // Error should be cleared
          expect(screen.queryByRole("alert")).not.toBeInTheDocument();

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });
});
