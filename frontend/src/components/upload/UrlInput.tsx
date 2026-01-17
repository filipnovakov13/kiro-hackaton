/**
 * URL input component for ingesting web content.
 */

import { useCallback, useState } from "react";
import type { UrlInputProps } from "../../types/document";

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
    [url, validateUrl, onSubmit]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUrl(e.target.value);
      if (error) {
        setError(null);
      }
    },
    [error]
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={handleChange}
          placeholder="Or paste a URL..."
          disabled={disabled}
          className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? "border-red-500" : "border-gray-300"
          } ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
        />
        <button
          type="submit"
          disabled={disabled || !url.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Add URL
        </button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}
