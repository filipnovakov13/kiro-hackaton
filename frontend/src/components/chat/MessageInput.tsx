/**
 * MessageInput Component
 *
 * Text input for sending chat messages
 * Features:
 * - 6000 character limit
 * - Send button
 * - Enter key to send (Shift+Enter for new line)
 * - Disable during streaming
 *
 * @see .kiro/specs/rag-core-phase/breakdowns/tasks-5-6-frontend-components.md
 */

import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import {
  backgrounds,
  text,
  accents,
  spacing,
  borderRadius,
  padding,
  semantic,
} from "../../design-system";

// =============================================================================
// TYPES
// =============================================================================

interface MessageInputProps {
  /** Callback when message is sent */
  onSend: (message: string) => void;
  /** Whether input is disabled (e.g., during streaming) */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Maximum character limit */
  maxLength?: number;
  /** Error message to display */
  error?: string | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_MAX_LENGTH = 6000;
const DEFAULT_PLACEHOLDER = "Type your message...";

// =============================================================================
// COMPONENT
// =============================================================================

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = DEFAULT_PLACEHOLDER,
  maxLength = DEFAULT_MAX_LENGTH,
  error = null,
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle input change
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // Enforce character limit
    if (newValue.length <= maxLength) {
      setValue(newValue);
    }
  };

  // Handle send
  const handleSend = () => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setValue("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  // Calculate remaining characters
  const remaining = maxLength - value.length;
  const isNearLimit = remaining < 100;

  // Styles
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: `${spacing.sm}px`,
    padding: `${spacing.md}px 0`,
  };

  const inputContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: `${spacing.sm}px`,
    alignItems: "flex-end",
  };

  const textareaStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: backgrounds.panel,
    border: `1px solid ${backgrounds.hover}`,
    color: text.primary,
    padding: padding.input,
    borderRadius: `${borderRadius.md}px`,
    fontSize: "16px",
    lineHeight: 1.5,
    fontFamily: "inherit",
    resize: "none",
    minHeight: "80px",
    maxHeight: "200px",
    transition: "all 150ms ease-out",
    outline: "none",
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: disabled ? backgrounds.hover : accents.highlight,
    color: disabled ? text.disabled : backgrounds.canvas,
    padding: padding.button,
    borderRadius: `${borderRadius.md}px`,
    border: "none",
    fontSize: "16px",
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 150ms ease-out",
    opacity: disabled ? 0.5 : 1,
    whiteSpace: "nowrap",
  };

  const charCountStyle: React.CSSProperties = {
    fontSize: "12px",
    color: isNearLimit ? "#C9A876" : text.secondary, // caution color if near limit
    textAlign: "right",
  };

  return (
    <div style={containerStyle} data-testid="message-input-container">
      {/* Error message display */}
      {error && (
        <div
          style={{
            padding: `${spacing.sm}px ${spacing.md}px`,
            backgroundColor: backgrounds.hover,
            color: semantic.critical,
            border: `1px solid ${semantic.critical}`,
            borderRadius: `${borderRadius.md}px`,
            fontSize: "14px",
            marginBottom: `${spacing.sm}px`,
          }}
          data-testid="message-error"
        >
          {error}
        </div>
      )}

      <div style={inputContainerStyle}>
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            handleChange(e);
            handleInput(e);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          style={textareaStyle}
          data-testid="message-input"
          aria-label="Message input"
          onFocus={(e) => {
            if (!disabled) {
              e.currentTarget.style.borderColor = accents.highlight;
              e.currentTarget.style.boxShadow = `0 0 0 2px ${accents.highlight}33`; // 20% opacity
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = backgrounds.hover;
            e.currentTarget.style.boxShadow = "none";
          }}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          style={buttonStyle}
          data-testid="send-button"
          aria-label="Send message"
          onMouseEnter={(e) => {
            if (!disabled && value.trim()) {
              e.currentTarget.style.backgroundColor = accents.muted;
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = accents.highlight;
            }
          }}
          onMouseDown={(e) => {
            if (!disabled && value.trim()) {
              e.currentTarget.style.backgroundColor = accents.deep;
            }
          }}
          onMouseUp={(e) => {
            if (!disabled && value.trim()) {
              e.currentTarget.style.backgroundColor = accents.muted;
            }
          }}
        >
          Send
        </button>
      </div>

      {/* Character count */}
      <div style={charCountStyle} data-testid="char-count">
        {remaining.toLocaleString()} characters remaining
        {isNearLimit && " ⚠️"}
      </div>
    </div>
  );
}
