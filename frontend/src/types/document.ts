/**
 * TypeScript types for document management.
 * Matches backend Pydantic schemas.
 */

// ============================================================================
// Enums
// ============================================================================

export type FileType = "pdf" | "docx" | "txt" | "md" | "url" | "html";

export type ProcessingStatus =
  | "pending"
  | "converting"
  | "chunking"
  | "embedding"
  | "complete"
  | "error";

// ============================================================================
// API Response Types
// ============================================================================

export interface UploadResponse {
  task_id: string;
  status: "pending";
}

export interface TaskStatusResponse {
  status: ProcessingStatus;
  progress: string;
  document_id: string;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentMetadata {
  title: string | null;
  detected_language: string;
}

export interface DocumentSummary {
  id: string;
  original_name: string;
  file_type: FileType;
  file_size: number | null;
  upload_time: string;
  processing_status: ProcessingStatus;
  chunk_count: number;
}

export interface DocumentDetail extends DocumentSummary {
  markdown_content: string | null;
  metadata: DocumentMetadata | null;
}

export interface DocumentListResponse {
  documents: DocumentSummary[];
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  progress?: string | null;
  error?: string | null;
  uploadStatus?: ProcessingStatus | null;
  disabled?: boolean;
}

export interface UploadProgressProps {
  taskId: string;
  onComplete: (documentId: string) => void;
  onError: (error: string) => void;
}

export interface UrlInputProps {
  onSubmit: (url: string) => void;
  disabled?: boolean;
}
