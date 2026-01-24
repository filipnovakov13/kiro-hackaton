/**
 * StreamingMessage Component Tests
 *
 * Test coverage:
 * - Rendering with different states (streaming, complete, error)
 * - Thinking indicator display
 * - Content display and formatting
 * - Source attribution rendering and interaction
 * - Partial response handling
 * - Streaming cursor animation
 * - Error message display
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StreamingMessage } from "../src/components/chat/StreamingMessage";

describe("StreamingMessage", () => {
  // =============================================================================
  // RENDERING TESTS
  // =============================================================================

  describe("Rendering", () => {
    it("should render container", () => {
      render(<StreamingMessage content="" isStreaming={false} />);
      expect(screen.getByTestId("streaming-message")).toBeInTheDocument();
    });

    it("should render message content when provided", () => {
      render(<StreamingMessage content="Hello, world!" isStreaming={false} />);
      expect(screen.getByTestId("message-content")).toHaveTextContent(
        "Hello, world!",
      );
    });

    it("should not render content when empty", () => {
      render(<StreamingMessage content="" isStreaming={false} />);
      expect(screen.queryByTestId("message-content")).not.toBeInTheDocument();
    });

    it("should render with multiline content", () => {
      const multilineContent = "Line 1\nLine 2\nLine 3";
      render(
        <StreamingMessage content={multilineContent} isStreaming={false} />,
      );
      const content = screen.getByTestId("message-content");
      // Check that content is present (whitespace handling varies by browser)
      expect(content).toBeInTheDocument();
      expect(content.textContent).toContain("Line 1");
      expect(content.textContent).toContain("Line 2");
      expect(content.textContent).toContain("Line 3");
    });
  });

  // =============================================================================
  // STREAMING STATE TESTS
  // =============================================================================

  describe("Streaming State", () => {
    it("should show thinking indicator when streaming with no content", () => {
      render(<StreamingMessage content="" isStreaming={true} />);
      expect(screen.getByTestId("thinking-indicator")).toBeInTheDocument();
    });

    it("should not show thinking indicator when streaming with content", () => {
      render(<StreamingMessage content="Hello" isStreaming={true} />);
      expect(
        screen.queryByTestId("thinking-indicator"),
      ).not.toBeInTheDocument();
    });

    it("should show streaming cursor when streaming with content", () => {
      render(<StreamingMessage content="Hello" isStreaming={true} />);
      expect(screen.getByTestId("streaming-cursor")).toBeInTheDocument();
    });

    it("should not show streaming cursor when not streaming", () => {
      render(<StreamingMessage content="Hello" isStreaming={false} />);
      expect(screen.queryByTestId("streaming-cursor")).not.toBeInTheDocument();
    });

    it("should not show sources while streaming", () => {
      const sources = [
        {
          chunk_id: "1",
          document_id: "doc1",
          document_title: "Test Doc",
        },
      ];
      render(
        <StreamingMessage
          content="Hello"
          isStreaming={true}
          sources={sources}
        />,
      );
      expect(screen.queryByTestId("sources-container")).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // ERROR STATE TESTS
  // =============================================================================

  describe("Error State", () => {
    it("should display error message when isError is true", () => {
      render(
        <StreamingMessage
          content=""
          isStreaming={false}
          isError={true}
          errorMessage="Something went wrong"
        />,
      );
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Something went wrong",
      );
    });

    it("should not display error message when isError is false", () => {
      render(
        <StreamingMessage
          content="Normal content"
          isStreaming={false}
          isError={false}
          errorMessage="This should not appear"
        />,
      );
      expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
    });

    it("should apply error styling to content when isError is true", () => {
      render(
        <StreamingMessage
          content="Error content"
          isStreaming={false}
          isError={true}
        />,
      );
      const content = screen.getByTestId("message-content");
      expect(content).toHaveStyle({ fontStyle: "italic" });
    });
  });

  // =============================================================================
  // PARTIAL RESPONSE TESTS
  // =============================================================================

  describe("Partial Response", () => {
    it("should show partial indicator when isPartial is true and not streaming", () => {
      render(
        <StreamingMessage
          content="Partial content"
          isStreaming={false}
          isPartial={true}
        />,
      );
      expect(screen.getByTestId("partial-indicator")).toHaveTextContent(
        "[Response interrupted]",
      );
    });

    it("should not show partial indicator when streaming", () => {
      render(
        <StreamingMessage
          content="Content"
          isStreaming={true}
          isPartial={true}
        />,
      );
      expect(screen.queryByTestId("partial-indicator")).not.toBeInTheDocument();
    });

    it("should not show partial indicator when isPartial is false", () => {
      render(
        <StreamingMessage
          content="Complete content"
          isStreaming={false}
          isPartial={false}
        />,
      );
      expect(screen.queryByTestId("partial-indicator")).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // SOURCE ATTRIBUTION TESTS
  // =============================================================================

  describe("Source Attribution", () => {
    const mockSources = [
      {
        chunk_id: "chunk1",
        document_id: "doc1",
        document_title: "Document 1",
        chunk_index: 5,
      },
      {
        chunk_id: "chunk2",
        document_id: "doc2",
        document_title: "Document 2",
        chunk_index: 10,
      },
    ];

    it("should render sources container when sources provided and not streaming", () => {
      render(
        <StreamingMessage
          content="Content"
          isStreaming={false}
          sources={mockSources}
        />,
      );
      expect(screen.getByTestId("sources-container")).toBeInTheDocument();
    });

    it("should render correct number of source links", () => {
      render(
        <StreamingMessage
          content="Content"
          isStreaming={false}
          sources={mockSources}
        />,
      );
      const links = screen.getAllByTestId("source-link");
      expect(links).toHaveLength(2);
    });

    it("should display source with document title and section", () => {
      render(
        <StreamingMessage
          content="Content"
          isStreaming={false}
          sources={[mockSources[0]]}
        />,
      );
      expect(screen.getByTestId("source-link")).toHaveTextContent(
        "• Document 1 - Section 5",
      );
    });

    it("should display source without document title", () => {
      const sourceWithoutTitle = {
        chunk_id: "chunk1",
        document_id: "doc1",
        chunk_index: 3,
      };
      render(
        <StreamingMessage
          content="Content"
          isStreaming={false}
          sources={[sourceWithoutTitle]}
        />,
      );
      expect(screen.getByTestId("source-link")).toHaveTextContent(
        "• Section 3",
      );
    });

    it("should call onSourceClick when source link is clicked", () => {
      const handleSourceClick = vi.fn();
      render(
        <StreamingMessage
          content="Content"
          isStreaming={false}
          sources={[mockSources[0]]}
          onSourceClick={handleSourceClick}
        />,
      );

      fireEvent.click(screen.getByTestId("source-link"));
      expect(handleSourceClick).toHaveBeenCalledWith(mockSources[0]);
    });

    it("should not render sources when empty array", () => {
      render(
        <StreamingMessage content="Content" isStreaming={false} sources={[]} />,
      );
      expect(screen.queryByTestId("sources-container")).not.toBeInTheDocument();
    });

    it("should not render sources when not provided", () => {
      render(<StreamingMessage content="Content" isStreaming={false} />);
      expect(screen.queryByTestId("sources-container")).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // STYLING TESTS
  // =============================================================================

  describe("Styling", () => {
    it("should apply correct content styling", () => {
      render(<StreamingMessage content="Test" isStreaming={false} />);
      const content = screen.getByTestId("message-content");
      expect(content).toHaveStyle({
        fontSize: "18px",
        lineHeight: 1.7,
        opacity: 0.9,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      });
    });

    it("should apply cursor animation styles", () => {
      const { container } = render(
        <StreamingMessage content="Test" isStreaming={true} />,
      );
      const styleTag = container.querySelector("style");
      expect(styleTag).toBeInTheDocument();
      expect(styleTag?.textContent).toContain("@keyframes blink");
    });

    it("should have hover state on source links", () => {
      const mockSource = {
        chunk_id: "chunk1",
        document_id: "doc1",
        document_title: "Test",
      };
      render(
        <StreamingMessage
          content="Content"
          isStreaming={false}
          sources={[mockSource]}
        />,
      );

      const link = screen.getByTestId("source-link");
      fireEvent.mouseEnter(link);
      expect(link).toHaveStyle({ textDecoration: "underline" });

      fireEvent.mouseLeave(link);
      expect(link).toHaveStyle({ textDecoration: "none" });
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================

  describe("Accessibility", () => {
    it("should have aria-label on source links", () => {
      const mockSource = {
        chunk_id: "chunk1",
        document_id: "doc1",
        document_title: "Test Document",
        chunk_index: 5,
      };
      render(
        <StreamingMessage
          content="Content"
          isStreaming={false}
          sources={[mockSource]}
        />,
      );

      const link = screen.getByTestId("source-link");
      expect(link).toHaveAttribute(
        "aria-label",
        "View source: Test Document - Section 5",
      );
    });

    it("should have proper button role for source links", () => {
      const mockSource = {
        chunk_id: "chunk1",
        document_id: "doc1",
        document_title: "Test",
      };
      render(
        <StreamingMessage
          content="Content"
          isStreaming={false}
          sources={[mockSource]}
        />,
      );

      const link = screen.getByTestId("source-link");
      expect(link.tagName).toBe("BUTTON");
    });
  });

  // =============================================================================
  // INTEGRATION TESTS
  // =============================================================================

  describe("Integration", () => {
    it("should handle complete message with all features", () => {
      const mockSources = [
        {
          chunk_id: "chunk1",
          document_id: "doc1",
          document_title: "Document 1",
          chunk_index: 5,
        },
      ];
      const handleSourceClick = vi.fn();

      render(
        <StreamingMessage
          content="Complete message content"
          isStreaming={false}
          sources={mockSources}
          onSourceClick={handleSourceClick}
        />,
      );

      expect(screen.getByTestId("message-content")).toHaveTextContent(
        "Complete message content",
      );
      expect(screen.getByTestId("sources-container")).toBeInTheDocument();
      expect(screen.queryByTestId("streaming-cursor")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("thinking-indicator"),
      ).not.toBeInTheDocument();
    });

    it("should handle streaming state correctly", () => {
      render(<StreamingMessage content="Streaming..." isStreaming={true} />);

      expect(screen.getByTestId("message-content")).toHaveTextContent(
        "Streaming...",
      );
      expect(screen.getByTestId("streaming-cursor")).toBeInTheDocument();
      expect(screen.queryByTestId("sources-container")).not.toBeInTheDocument();
    });

    it("should handle error with partial response", () => {
      render(
        <StreamingMessage
          content="Partial content before error"
          isStreaming={false}
          isError={true}
          errorMessage="Connection lost"
          isPartial={true}
        />,
      );

      expect(screen.getByTestId("message-content")).toBeInTheDocument();
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Connection lost",
      );
      expect(screen.getByTestId("partial-indicator")).toHaveTextContent(
        "[Response interrupted]",
      );
    });
  });
});
