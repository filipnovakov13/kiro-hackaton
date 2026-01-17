/**
 * Drag-and-drop upload zone component.
 * Supports file picker and visual feedback on drag.
 * Follows Iubar visual identity and WCAG 2.1 AA accessibility.
 */

import { useCallback, useRef, useState } from "react";
import type { UploadZoneProps } from "../../types/document";
import { uploadDocument, ApiError } from "../../services/api";
import {
  bgClasses,
  textClasses,
  borderClasses,
  accentClasses,
  focusRing,
  colorTransition,
} from "../../design-system/colors";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function UploadZone({
  onUploadStart,
  onUploadError,
  disabled = false,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
    async (file: File) => {
      const error = validateFile(file);
      if (error) {
        onUploadError(error);
        return;
      }
      setIsUploading(true);
      try {
        const response = await uploadDocument(file);
        onUploadStart(response.task_id);
      } catch (err) {
        onUploadError(
          err instanceof ApiError
            ? err.message
            : "Upload failed. Please try again."
        );
      } finally {
        setIsUploading(false);
      }
    },
    [validateFile, onUploadStart, onUploadError]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
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
    [disabled, isUploading, handleFile]
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
    [disabled, isUploading]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) handleFile(files[0]);
      e.target.value = "";
    },
    [handleFile]
  );

  const isInteractive = !disabled && !isUploading;
  const baseClasses = `min-h-[200px] border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${colorTransition}`;

  const stateClasses = isDragging
    ? `${borderClasses.active} ${bgClasses.panel}`
    : !isInteractive
    ? `${borderClasses.disabled} ${bgClasses.panel} cursor-not-allowed`
    : `${borderClasses.default} hover:${borderClasses.hover} ${bgClasses.canvas} hover:${bgClasses.panel}`;

  return (
    <div
      data-testid="upload-zone"
      className={`${baseClasses} ${stateClasses} ${focusRing}`}
      tabIndex={isInteractive ? 0 : -1}
      role="button"
      aria-disabled={!isInteractive}
      aria-label="Upload document zone - drop a file or press Enter to browse"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
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

      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <div
            className={`w-8 h-8 border-2 ${accentClasses.border} border-t-transparent rounded-full animate-spin`}
            role="status"
            aria-label="Uploading"
          />
          <p className={textClasses.secondary}>Uploading...</p>
        </div>
      ) : (
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
          <p className={`text-sm ${textClasses.disabled}`}>
            Supports PDF, DOCX, TXT, MD (max {MAX_FILE_SIZE_MB}MB)
          </p>
        </div>
      )}
    </div>
  );
}
