/**
 * Drag-and-drop upload zone component.
 * Supports file picker, URL input, and GitHub repository ingestion.
 * Follows Iubar visual identity and WCAG 2.1 AA accessibility.
 *
 * This is a presentational component - upload logic is handled by parent via useDocumentUpload hook.
 */

import { useCallback, useRef, useState } from "react";
import type { UploadZoneProps } from "../../types/document";
import { UrlInput } from "./UrlInput";
import { GitHubInput } from "./GitHubInput";
import {
  bgClasses,
  textClasses,
  borderClasses,
  focusRing,
  colorTransition,
  accents,
  semantic,
} from "../../design-system/colors";
import { spacing } from "../../design-system/layout";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type UploadMode = "file" | "url" | "github";

export function UploadZone({
  onFileSelect,
  onUrlSubmit,
  onGitHubSubmit,
  isUploading = false,
  progress = null,
  error = null,
  disabled = false,
  uploadStatus = null,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<UploadMode>("file");
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Supported formats: PDF, DOCX, TXT, MD`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `Maximum file size is ${MAX_FILE_SIZE_MB}MB`;
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setValidationError(validationError);
        return;
      }
      // Clear any previous validation errors
      setValidationError(null);
      // Pass file to parent component which will handle upload via hook
      onFileSelect(file);
    },
    [validateFile, onFileSelect],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled || isUploading) return;
      const files = e.dataTransfer.files;
      if (files.length > 0) handleFile(files[0]);
    },
    [disabled, isUploading, handleFile],
  );

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) fileInputRef.current?.click();
  }, [disabled, isUploading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !disabled && !isUploading) {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [disabled, isUploading],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) handleFile(files[0]);
      e.target.value = "";
    },
    [handleFile],
  );

  const handleUrlSubmit = useCallback(
    async (url: string) => {
      if (onUrlSubmit) {
        onUrlSubmit(url);
      }
    },
    [onUrlSubmit],
  );

  const handleGitHubSubmit = useCallback(
    async (repoUrl: string) => {
      if (onGitHubSubmit) {
        onGitHubSubmit(repoUrl);
      }
    },
    [onGitHubSubmit],
  );

  const isInteractive = !disabled && !isUploading;
  const baseClasses = `min-h-[200px] border-2 border-dashed rounded-lg text-center ${colorTransition}`;

  const stateClasses = isDragging
    ? `${borderClasses.active} ${bgClasses.panel}`
    : !isInteractive
      ? `${borderClasses.disabled} ${bgClasses.panel} cursor-not-allowed`
      : `${borderClasses.default} hover:${borderClasses.hover} ${bgClasses.canvas} hover:${bgClasses.panel}`;

  return (
    <div
      data-testid="upload-zone"
      className={`${baseClasses} ${stateClasses}`}
      style={{ padding: `${spacing["2xl"]}px` }}
    >
      {/* Upload Tabs */}
      <div
        className="flex gap-2 mb-6 justify-center"
        role="tablist"
        aria-label="Upload method"
      >
        {(["file", "url", "github"] as const).map((tabMode) => (
          <button
            key={tabMode}
            role="tab"
            aria-selected={mode === tabMode}
            aria-controls={`${tabMode}-panel`}
            onClick={() => setMode(tabMode)}
            disabled={!isInteractive}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${focusRing} ${
              mode === tabMode
                ? `${bgClasses.panel} ${textClasses.primary}`
                : `${bgClasses.canvas} ${textClasses.secondary} hover:${bgClasses.panel}`
            } ${!isInteractive ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            style={
              mode === tabMode
                ? { borderBottom: `2px solid ${accents.highlight}` }
                : undefined
            }
          >
            {tabMode === "file" && "File"}
            {tabMode === "url" && "URL"}
            {tabMode === "github" && "GitHub"}
          </button>
        ))}
      </div>

      {isUploading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{
                borderColor: `${accents.highlight} transparent transparent transparent`,
              }}
            />
            <span className={textClasses.primary} style={{ fontSize: "16px" }}>
              {progress || "Processing..."}
            </span>
          </div>
          {error && (
            <p
              className="text-sm"
              style={{ color: semantic.critical, fontWeight: 500 }}
            >
              {error}
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Show validation error if present */}
          {validationError && (
            <div
              className="mb-4 p-3 rounded-lg"
              style={{
                backgroundColor: semantic.critical + "20",
                border: `1px solid ${semantic.critical}`,
              }}
            >
              <p
                className="text-sm"
                style={{ color: semantic.critical, fontWeight: 500 }}
              >
                {validationError}
              </p>
            </div>
          )}

          {/* File Upload Panel */}
          {mode === "file" && (
            <div
              id="file-panel"
              role="tabpanel"
              aria-labelledby="file-tab"
              className="cursor-pointer"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              tabIndex={isInteractive ? 0 : -1}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Browse files"
                disabled={!isInteractive}
              />
              <div className="flex flex-col items-center gap-2">
                <svg
                  className={`w-12 h-12 ${textClasses.secondary}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className={textClasses.primary}>
                  Drop a document here, or click to browse
                </p>
                <p className={`text-sm ${textClasses.secondary}`}>
                  Supports PDF, DOCX, TXT, MD (max {MAX_FILE_SIZE_MB}MB)
                </p>
              </div>
            </div>
          )}

          {/* URL Input Panel */}
          {mode === "url" && (
            <div id="url-panel" role="tabpanel" aria-labelledby="url-tab">
              <UrlInput onSubmit={handleUrlSubmit} disabled={!isInteractive} />
            </div>
          )}

          {/* GitHub Input Panel */}
          {mode === "github" && (
            <div id="github-panel" role="tabpanel" aria-labelledby="github-tab">
              <GitHubInput
                onSubmit={handleGitHubSubmit}
                disabled={!isInteractive}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
