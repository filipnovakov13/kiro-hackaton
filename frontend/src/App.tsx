import { useState, useCallback } from "react";
import { UploadZone } from "./components/upload/UploadZone";
import { UrlInput } from "./components/upload/UrlInput";
import { DocumentList } from "./components/documents/DocumentList";
import { useDocumentUpload } from "./hooks/useDocumentUpload";
import { ingestUrl, ApiError } from "./services/api";

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);

  const {
    isUploading,
    status,
    progress,
    error: uploadError,
    uploadFile,
    reset,
  } = useDocumentUpload();

  const handleUploadStart = useCallback((taskId: string) => {
    console.log("Upload started:", taskId);
    // Refresh document list after a short delay to show the new document
    setTimeout(() => setRefreshTrigger((prev) => prev + 1), 500);
  }, []);

  const handleUploadError = useCallback((error: string) => {
    console.error("Upload error:", error);
  }, []);

  const handleUrlSubmit = useCallback(async (url: string) => {
    setUrlError(null);
    setUrlLoading(true);
    try {
      await ingestUrl(url);
      // Refresh document list after a delay to allow processing to start
      setTimeout(() => setRefreshTrigger((prev) => prev + 1), 1000);
    } catch (err) {
      setUrlError(
        err instanceof ApiError ? err.message : "Failed to ingest URL"
      );
    } finally {
      setUrlLoading(false);
    }
  }, []);

  const handleDocumentSelect = useCallback((id: string) => {
    console.log("Document selected:", id);
    // Future: Navigate to document viewer
  }, []);

  // Refresh list when upload completes
  const handleUploadComplete = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
    reset();
  }, [reset]);

  // Check if upload just completed
  if (status === "complete" && !isUploading) {
    handleUploadComplete();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Iubar</h1>
          <p className="text-gray-600">
            AI-Enhanced Personal Knowledge Management
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Upload Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Add Documents
          </h2>

          {/* Upload Zone */}
          <UploadZone
            onUploadStart={handleUploadStart}
            onUploadError={handleUploadError}
            disabled={isUploading || urlLoading}
          />

          {/* Upload Progress */}
          {isUploading && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-blue-700">
                  {progress || "Processing..."}
                </span>
              </div>
            </div>
          )}

          {/* Upload Error */}
          {uploadError && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
              {uploadError}
              <button
                onClick={reset}
                className="ml-2 underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* URL Input */}
          <div className="mt-4">
            <UrlInput
              onSubmit={handleUrlSubmit}
              disabled={isUploading || urlLoading}
            />
            {urlError && (
              <p className="mt-2 text-sm text-red-600">{urlError}</p>
            )}
          </div>
        </section>

        {/* Documents Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Your Documents
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <DocumentList
              refreshTrigger={refreshTrigger}
              onDocumentSelect={handleDocumentSelect}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
