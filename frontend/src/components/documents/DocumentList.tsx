/**
 * Document list component.
 * Displays uploaded documents with status and delete functionality.
 */

import { useCallback, useEffect, useState } from "react";
import type { DocumentSummary, ProcessingStatus } from "../../types/document";
import { listDocuments, deleteDocument, ApiError } from "../../services/api";

interface DocumentListProps {
  refreshTrigger?: number;
  onDocumentSelect?: (id: string) => void;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status: ProcessingStatus) {
  const baseClasses = "px-2 py-1 text-xs rounded-full";
  switch (status) {
    case "complete":
      return (
        <span className={`${baseClasses} bg-green-100 text-green-700`}>
          Ready
        </span>
      );
    case "error":
      return (
        <span className={`${baseClasses} bg-red-100 text-red-700`}>Error</span>
      );
    case "pending":
    case "converting":
    case "chunking":
    case "embedding":
      return (
        <span className={`${baseClasses} bg-blue-100 text-blue-700`}>
          Processing
        </span>
      );
    default:
      return (
        <span className={`${baseClasses} bg-gray-100 text-gray-700`}>
          {status}
        </span>
      );
  }
}

function getFileTypeIcon(fileType: string) {
  const iconClasses = "w-8 h-8";
  switch (fileType) {
    case "pdf":
      return (
        <div
          className={`${iconClasses} bg-red-100 text-red-600 rounded flex items-center justify-center text-xs font-bold`}
        >
          PDF
        </div>
      );
    case "docx":
      return (
        <div
          className={`${iconClasses} bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs font-bold`}
        >
          DOC
        </div>
      );
    case "txt":
    case "md":
      return (
        <div
          className={`${iconClasses} bg-gray-100 text-gray-600 rounded flex items-center justify-center text-xs font-bold`}
        >
          TXT
        </div>
      );
    case "url":
    case "html":
      return (
        <div
          className={`${iconClasses} bg-purple-100 text-purple-600 rounded flex items-center justify-center text-xs font-bold`}
        >
          URL
        </div>
      );
    default:
      return (
        <div
          className={`${iconClasses} bg-gray-100 text-gray-600 rounded flex items-center justify-center text-xs font-bold`}
        >
          FILE
        </div>
      );
  }
}

export function DocumentList({
  refreshTrigger,
  onDocumentSelect,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load documents"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, refreshTrigger]);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to delete document"
      );
    } finally {
      setDeletingId(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        {error}
        <button
          onClick={fetchDocuments}
          className="ml-2 underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No documents yet. Upload one to get started!
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => onDocumentSelect?.(doc.id)}
        >
          {getFileTypeIcon(doc.file_type)}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {doc.original_name}
            </p>
            <p className="text-sm text-gray-500">
              {formatFileSize(doc.file_size)} • {formatDate(doc.upload_time)}
              {doc.chunk_count > 0 && ` • ${doc.chunk_count} chunks`}
            </p>
          </div>
          {getStatusBadge(doc.processing_status)}
          <button
            onClick={(e) => handleDelete(doc.id, e)}
            disabled={deletingId === doc.id}
            className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
            title="Delete document"
          >
            {deletingId === doc.id ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
