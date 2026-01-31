/**
 * URL input component for ingesting web content.
 */

import { useCallback, useState } from "react";
import type { UrlInputProps } from "../../types/document";
import {
  textClasses,
  bgClasses,
  borderClasses,
  focusRing,
  semantic,
} from "../../design-system/colors";
import { spacing } from "../../design-system/layout";

export function UrlInput({ onSubmit, disabled = false }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validateUrl = useCallback((value: string): string | null => {
    if (!value.trim()) {
      return "Please enter a URL";
    }
    if (!value.startsWith("http://") && !value.startsWith("https://")) {
      return "URL must start with http:// or https://";
    }
    if (value.length > 2048) {
      return "URL is too long (max 2048 characters)";
    }
    return null;
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const validationError = validateUrl(url);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      onSubmit(url);
      setUrl("");
    },
    [url, validateUrl, onSubmit],
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
          placeholder="https://example.com/document"
          disabled={disabled}
          className={`flex-1 px-4 py-2 border rounded-lg ${focusRing} ${
            error ? borderClasses.error : borderClasses.default
          } ${disabled ? `${bgClasses.disabled} cursor-not-allowed` : bgClasses.canvas} ${textClasses.primary}`}
          style={{ padding: `${spacing.sm}px ${spacing.md}px` }}
          aria-label="Document URL"
          aria-invalid={!!error}
          aria-describedby={error ? "url-error" : undefined}
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
          aria-label="Add URL"
        >
          Add URL
        </button>
      </div>
      {error && (
        <p
          id="url-error"
          className="text-sm"
          style={{ color: semantic.error }}
          role="alert"
        >
          {error}
        </p>
      )}
    </form>
  );
}
