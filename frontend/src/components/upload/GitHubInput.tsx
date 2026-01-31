/**
 * GitHub repository input component for ingesting repository content.
 * Uses gitingest API to convert GitHub repos to text.
 */

import { useCallback, useState } from "react";
import {
  textClasses,
  bgClasses,
  borderClasses,
  focusRing,
  semantic,
} from "../../design-system/colors";
import { spacing } from "../../design-system/layout";

interface GitHubInputProps {
  onSubmit: (repoUrl: string) => void;
  disabled?: boolean;
}

const GITHUB_URL_REGEX = /^https:\/\/github\.com\/[\w-]+\/[\w-]+\/?$/;

export function GitHubInput({ onSubmit, disabled = false }: GitHubInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validateGitHubUrl = useCallback((value: string): string | null => {
    if (!value.trim()) {
      return "Please enter a GitHub repository URL";
    }

    // Remove trailing slash for validation
    const normalizedUrl = value.trim().replace(/\/$/, "");

    if (!GITHUB_URL_REGEX.test(normalizedUrl)) {
      return "Invalid GitHub URL. Format: https://github.com/owner/repo";
    }

    return null;
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const validationError = validateGitHubUrl(url);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      onSubmit(url.trim().replace(/\/$/, ""));
      setUrl("");
    },
    [url, validateGitHubUrl, onSubmit],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUrl(e.target.value);
      if (error) {
        setError(null);
      }
    },
    [error],
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={handleChange}
          placeholder="https://github.com/owner/repo"
          disabled={disabled}
          className={`flex-1 px-4 py-2 border rounded-lg ${focusRing} ${
            error ? borderClasses.error : borderClasses.default
          } ${disabled ? `${bgClasses.disabled} cursor-not-allowed` : bgClasses.canvas} ${textClasses.primary}`}
          style={{ padding: `${spacing.sm}px ${spacing.md}px` }}
          aria-label="GitHub repository URL"
          aria-invalid={!!error}
          aria-describedby={error ? "github-error" : undefined}
        />
        <button
          type="submit"
          disabled={disabled || !url.trim()}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${focusRing} ${
            disabled || !url.trim()
              ? `${bgClasses.disabled} cursor-not-allowed ${textClasses.disabled}`
              : `hover:opacity-90 ${textClasses.primary}`
          }`}
          style={{
            backgroundColor:
              disabled || !url.trim() ? undefined : semantic.info,
            padding: `${spacing.sm}px ${spacing.md}px`,
          }}
          aria-label="Ingest GitHub repository"
        >
          Ingest Repo
        </button>
      </div>
      {error && (
        <p
          id="github-error"
          className="text-sm"
          style={{ color: semantic.error }}
          role="alert"
        >
          {error}
        </p>
      )}
      <p className={`text-xs ${textClasses.disabled}`}>
        Public repositories only. Uses gitingest.com to convert repo to text.
      </p>
    </form>
  );
}
