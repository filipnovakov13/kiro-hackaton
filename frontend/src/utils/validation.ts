/**
 * API response validation schemas using Zod.
 * Ensures type safety and prevents malformed responses from causing errors.
 */

import { z } from "zod";

// =============================================================================
// CHAT SCHEMAS
// =============================================================================

export const SourceSchema = z.object({
  chunk_id: z.string(),
  page_number: z.number().optional(),
  similarity_score: z.number(),
  content_preview: z.string().optional(),
});

export const MessageMetadataSchema = z.object({
  sources: z.array(SourceSchema).optional(),
  tokens: z
    .object({
      prompt_tokens: z.number(),
      cached_tokens: z.number(),
      completion_tokens: z.number(),
    })
    .optional(),
  cost_usd: z.number().optional(),
});

export const ChatMessageSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  created_at: z.string(),
  metadata: MessageMetadataSchema.optional(),
});

export const SessionSchema = z.object({
  id: z.string(),
  document_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  metadata: z
    .object({
      document_name: z.string().optional(),
      message_count: z.number().optional(),
    })
    .optional(),
});

export const SessionStatsSchema = z.object({
  session_id: z.string(),
  total_messages: z.number(),
  total_tokens: z.number(),
  cached_tokens: z.number(),
  total_cost_usd: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

// =============================================================================
// DOCUMENT SCHEMAS
// =============================================================================

export const DocumentSchema = z.object({
  id: z.string(),
  original_name: z.string(),
  file_type: z.string(),
  file_size: z.number(),
  upload_date: z.string(),
  markdown_content: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UploadResponseSchema = z.object({
  task_id: z.string(),
  status: z.enum(["pending"]),
});

// =============================================================================
// ERROR SCHEMAS
// =============================================================================

export const ErrorResponseSchema = z.object({
  detail: z.string(),
  error_code: z.string().optional(),
  status_code: z.number().optional(),
});

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate API response against schema.
 * Throws descriptive error if validation fails.
 */
export function validateResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  context: string,
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => issue.message).join(", ");
      throw new Error(`Invalid ${context} response: ${issues}`);
    }
    throw new Error(`Failed to validate ${context} response`);
  }
}

/**
 * Safely validate response without throwing.
 * Returns null if validation fails.
 */
export function safeValidateResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Source = z.infer<typeof SourceSchema>;
export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type SessionStats = z.infer<typeof SessionStatsSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
