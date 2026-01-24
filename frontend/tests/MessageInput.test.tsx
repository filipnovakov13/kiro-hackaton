/**
 * MessageInput Component Tests
 *
 * Tests for message input with character limit and send functionality
 *
 * @see frontend/src/components/chat/MessageInput.tsx
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MessageInput } from "../src/components/chat/MessageInput";

describe("MessageInput", () => {
  describe("Rendering", () => {
    it("renders input container", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      expect(screen.getByTestId("message-input-container")).toBeInTheDocument();
    });

    it("renders textarea", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      expect(screen.getByTestId("message-input")).toBeInTheDocument();
    });

    it("renders send button", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      expect(screen.getByTestId("send-button")).toBeInTheDocument();
    });

    it("renders character count", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      expect(screen.getByTestId("char-count")).toBeInTheDocument();
    });

    it("renders default placeholder", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByTestId("message-input");
      expect(textarea).toHaveAttribute("placeholder", "Type your message...");
    });

    it("renders custom placeholder", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} placeholder="Custom placeholder" />);
      const textarea = screen.getByTestId("message-input");
      expect(textarea).toHaveAttribute("placeholder", "Custom placeholder");
    });
  });

  describe("Input Handling", () => {
    it("updates value when typing", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByTestId(
        "message-input",
      ) as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: "Hello world" } });

      expect(textarea.value).toBe("Hello world");
    });

    it("enforces character limit", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} maxLength={10} />);
      const textarea = screen.getByTestId(
        "message-input",
      ) as HTMLTextAreaElement;

      fireEvent.change(textarea, {
        target: { value: "This is a very long message" },
      });

      expect(textarea.value).toBe("");
    });

    it("allows input up to character limit", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} maxLength={10} />);
      const textarea = screen.getByTestId(
        "message-input",
      ) as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: "1234567890" } });

      expect(textarea.value).toBe("1234567890");
    });

    it("updates character count as user types", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} maxLength={100} />);
      const textarea = screen.getByTestId("message-input");
      const charCount = screen.getByTestId("char-count");

      expect(charCount.textContent).toContain("100");

      fireEvent.change(textarea, { target: { value: "Hello" } });

      expect(charCount.textContent).toContain("95");
    });

    it("shows warning when near character limit", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} maxLength={100} />);
      const textarea = screen.getByTestId("message-input");
      const charCount = screen.getByTestId("char-count");

      // Type 95 characters (5 remaining)
      fireEvent.change(textarea, {
        target: { value: "a".repeat(95) },
      });

      expect(charCount.textContent).toContain("⚠️");
    });
  });

  describe("Send Functionality", () => {
    it("calls onSend when send button is clicked", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByTestId("message-input");
      const sendButton = screen.getByTestId("send-button");

      fireEvent.change(textarea, { target: { value: "Test message" } });
      fireEvent.click(sendButton);

      expect(onSend).toHaveBeenCalledWith("Test message");
    });

    it("trims whitespace before sending", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByTestId("message-input");
      const sendButton = screen.getByTestId("send-button");

      fireEvent.change(textarea, { target: { value: "  Test message  " } });
      fireEvent.click(sendButton);

      expect(onSend).toHaveBeenCalledWith("Test message");
    });

    it("clears input after sending", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByTestId(
        "message-input",
      ) as HTMLTextAreaElement;
      const sendButton = screen.getByTestId("send-button");

      fireEvent.change(textarea, { target: { value: "Test message" } });
      fireEvent.click(sendButton);

      expect(textarea.value).toBe("");
    });

    it("does not send empty messages", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const sendButton = screen.getByTestId("send-button");

      fireEvent.click(sendButton);

      expect(onSend).not.toHaveBeenCalled();
    });

    it("does not send whitespace-only messages", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByTestId("message-input");
      const sendButton = screen.getByTestId("send-button");

      fireEvent.change(textarea, { target: { value: "   " } });
      fireEvent.click(sendButton);

      expect(onSend).not.toHaveBeenCalled();
    });

    it("disables send button when input is empty", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const sendButton = screen.getByTestId("send-button");

      expect(sendButton).toBeDisabled();
    });

    it("enables send button when input has content", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByTestId("message-input");
      const sendButton = screen.getByTestId("send-button");

      fireEvent.change(textarea, { target: { value: "Test" } });

      expect(sendButton).not.toBeDisabled();
    });
  });

  describe("Keyboard Handling", () => {
    it("sends message on Enter key", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByTestId("message-input");

      fireEvent.change(textarea, { target: { value: "Test message" } });
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

      expect(onSend).toHaveBeenCalledWith("Test message");
    });

    it("does not send on Shift+Enter", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByTestId("message-input");

      fireEvent.change(textarea, { target: { value: "Test message" } });
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

      expect(onSend).not.toHaveBeenCalled();
    });

    it("allows new line on Shift+Enter", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByTestId("message-input");

      fireEvent.change(textarea, { target: { value: "Line 1" } });
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

      // Shift+Enter should not trigger send
      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe("Disabled State", () => {
    it("disables textarea when disabled prop is true", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} disabled={true} />);
      const textarea = screen.getByTestId("message-input");

      expect(textarea).toBeDisabled();
    });

    it("disables send button when disabled prop is true", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} disabled={true} />);
      const sendButton = screen.getByTestId("send-button");

      expect(sendButton).toBeDisabled();
    });

    it("does not send message when disabled", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} disabled={true} />);
      const textarea = screen.getByTestId("message-input");
      const sendButton = screen.getByTestId("send-button");

      fireEvent.change(textarea, { target: { value: "Test" } });
      fireEvent.click(sendButton);

      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has aria-label on textarea", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByTestId("message-input");

      expect(textarea).toHaveAttribute("aria-label", "Message input");
    });

    it("has aria-label on send button", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const sendButton = screen.getByTestId("send-button");

      expect(sendButton).toHaveAttribute("aria-label", "Send message");
    });
  });
});
