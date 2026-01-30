/**
 * Maps backend error codes and messages to user-friendly messages
 */

export function mapHTTPError(status: number, message?: string): string {
  switch (status) {
    case 404:
      return "Resource not found. It may have been deleted.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 500:
      return "Something went wrong on our end. Please try again.";
    case 503:
      return "Service temporarily unavailable. Please try again later.";
    default:
      return message || "An error occurred. Please try again.";
  }
}

export function mapUploadError(error: string): string {
  // Handle non-string inputs safely
  if (typeof error !== "string") {
    return "Failed to upload document. Please try again.";
  }

  const errorMappings: Record<string, string> = {
    "File too large": "This file is too large. Maximum size is 10MB.",
    "Unsupported file type":
      "This file type is not supported. Please upload PDF, DOCX, TXT, or MD files.",
    "Could not read this file":
      "Could not read this file. It may be corrupted or password-protected.",
    "Processing timeout":
      "Document processing took too long. Please try a smaller file.",
    "Invalid file format":
      "This file format is invalid. Please upload a valid document.",
  };

  // Check for exact matches
  if (errorMappings[error]) {
    return errorMappings[error];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(errorMappings)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // Default fallback
  return "Failed to upload document. Please try again.";
}

export function mapValidationError(field: string, error: string): string {
  const validationMappings: Record<string, Record<string, string>> = {
    message: {
      empty: "Message cannot be empty.",
      "too long": "Message is too long. Maximum length is 6000 characters.",
      "no session": "No active session. Please upload a document first.",
    },
    file: {
      "too large": "File is too large. Maximum size is 10MB.",
      "invalid type":
        "Invalid file type. Please upload PDF, DOCX, TXT, or MD files.",
      empty: "Please select a file to upload.",
    },
  };

  const fieldMappings = validationMappings[field];
  if (!fieldMappings) {
    return error;
  }

  // Check for exact matches
  if (fieldMappings[error]) {
    return fieldMappings[error];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(fieldMappings)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  return error;
}

export function mapNetworkError(error: Error): string {
  if (error instanceof TypeError) {
    return "Cannot connect to server. Please check your connection.";
  }

  if (error.message.includes("timeout")) {
    return "Request timed out. Please try again.";
  }

  if (error.message.includes("abort")) {
    return "Request was cancelled. Please try again.";
  }

  return "Network error. Please check your connection and try again.";
}
