/**
 * MessageList Component Tests
 *
 * Tests for message display with auto-scroll and empty states
 *
 * @see frontend/src/components/chat/MessageList.tsx
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageList, Message } from "../src/components/chat/MessageList";

describe("MessageList", () => {
  const mockMessages: Message[] = [
    {
      id: "1",
      role: "user",
      content: "Hello, how are you?",
      timestamp: new Date("2026-01-24T10:00:00"),
    },
    {
      id: "2",
      role: "assistant",
      content: "I'm doing well, thank you!",
      timestamp: new Date("2026-01-24T10:00:05"),
    },
    {
      id: "3",
      role: "user",
      content: "Can you help me with something?",
    },
  ];

  describe("Rendering", () => {
    it("renders message list container", () => {
      render(<MessageList messages={mockMessages} />);
      expect(screen.getByTestId("message-list")).toBeInTheDocument();
    });

    it("renders all messages", () => {
      render(<MessageList messages={mockMessages} />);
      const messages = screen.getAllByTestId("message");
      expect(messages).toHaveLength(3);
    });

    it("renders user messages with correct role", () => {
      render(<MessageList messages={mockMessages} />);
      const messages = screen.getAllByTestId("message");
      expect(messages[0]).toHaveAttribute("data-role", "user");
      expect(messages[2]).toHaveAttribute("data-role", "user");
    });

    it("renders assistant messages with correct role", () => {
      render(<MessageList messages={mockMessages} />);
      const messages = screen.getAllByTestId("message");
      expect(messages[1]).toHaveAttribute("data-role", "assistant");
    });

    it("renders message content correctly", () => {
      render(<MessageList messages={mockMessages} />);
      expect(screen.getByText("Hello, how are you?")).toBeInTheDocument();
      expect(
        screen.getByText("I'm doing well, thank you!"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Can you help me with something?"),
      ).toBeInTheDocument();
    });

    it("renders role indicators", () => {
      render(<MessageList messages={mockMessages} />);
      const youLabels = screen.getAllByText("You");
      const assistantLabels = screen.getAllByText("Assistant");
      expect(youLabels).toHaveLength(2);
      expect(assistantLabels).toHaveLength(1);
    });

    it("renders timestamps when provided", () => {
      render(<MessageList messages={mockMessages} />);
      // Check that timestamps are rendered (format may vary by locale)
      const messages = screen.getAllByTestId("message");
      expect(messages[0].textContent).toContain("10:00");
      expect(messages[1].textContent).toContain("10:00");
    });

    it("does not render timestamps when not provided", () => {
      const messagesWithoutTimestamp: Message[] = [
        {
          id: "1",
          role: "user",
          content: "Test message",
        },
      ];
      render(<MessageList messages={messagesWithoutTimestamp} />);
      const message = screen.getByTestId("message");
      // Should only contain role and content, no timestamp
      expect(message.textContent).toBe("YouTest message");
    });
  });

  describe("Empty State", () => {
    it("renders empty state when no messages", () => {
      render(<MessageList messages={[]} />);
      expect(screen.getByTestId("message-list-empty")).toBeInTheDocument();
    });

    it("renders default empty message", () => {
      render(<MessageList messages={[]} />);
      expect(
        screen.getByText("No messages yet. Start a conversation!"),
      ).toBeInTheDocument();
    });

    it("renders custom empty message", () => {
      render(<MessageList messages={[]} emptyMessage="Custom empty message" />);
      expect(screen.getByText("Custom empty message")).toBeInTheDocument();
    });

    it("does not render empty state when loading", () => {
      render(<MessageList messages={[]} isLoading={true} />);
      expect(
        screen.queryByTestId("message-list-empty"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("renders loading indicator when isLoading is true", () => {
      render(<MessageList messages={mockMessages} isLoading={true} />);
      expect(screen.getByTestId("message-loading")).toBeInTheDocument();
    });

    it("renders loading indicator with correct content", () => {
      render(<MessageList messages={mockMessages} isLoading={true} />);
      const loadingIndicator = screen.getByTestId("message-loading");
      expect(loadingIndicator.textContent).toContain("Assistant");
      expect(loadingIndicator.textContent).toContain("Thinking...");
    });

    it("does not render loading indicator when isLoading is false", () => {
      render(<MessageList messages={mockMessages} isLoading={false} />);
      expect(screen.queryByTestId("message-loading")).not.toBeInTheDocument();
    });

    it("renders loading indicator even with empty messages", () => {
      render(<MessageList messages={[]} isLoading={true} />);
      expect(screen.getByTestId("message-loading")).toBeInTheDocument();
    });
  });

  describe("Auto-scroll Behavior", () => {
    it("calls scrollIntoView when messages change", () => {
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      const { rerender } = render(<MessageList messages={mockMessages} />);

      // Add a new message
      const newMessages: Message[] = [
        ...mockMessages,
        {
          id: "4",
          role: "assistant" as const,
          content: "New message",
        },
      ];

      rerender(<MessageList messages={newMessages} />);

      // scrollIntoView should be called with smooth behavior
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
    });
  });

  describe("Message Styling", () => {
    it("applies correct styles to user messages", () => {
      render(<MessageList messages={mockMessages} />);
      const messages = screen.getAllByTestId("message");
      const userMessage = messages[0];

      expect(userMessage).toHaveStyle({
        alignSelf: "flex-end",
      });
    });

    it("applies correct styles to assistant messages", () => {
      render(<MessageList messages={mockMessages} />);
      const messages = screen.getAllByTestId("message");
      const assistantMessage = messages[1];

      expect(assistantMessage).toHaveStyle({
        alignSelf: "flex-start",
      });
    });
  });
});
