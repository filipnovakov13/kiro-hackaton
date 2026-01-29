import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChunkHighlight } from "../src/components/document/ChunkHighlight";
import { backgrounds } from "../src/design-system";

describe("ChunkHighlight", () => {
  const defaultProps = {
    chunkId: "chunk-123",
    startChar: 100,
    endChar: 200,
    children: "This is a highlighted chunk of text.",
  };

  describe("Rendering", () => {
    it("renders children content", () => {
      render(<ChunkHighlight {...defaultProps} />);
      expect(
        screen.getByText("This is a highlighted chunk of text."),
      ).toBeInTheDocument();
    });

    it("applies correct background color", () => {
      render(<ChunkHighlight {...defaultProps} />);
      const chunk = screen.getByTestId("chunk-highlight");
      expect(chunk).toHaveStyle({ backgroundColor: backgrounds.hover });
    });

    it("sets data attributes correctly", () => {
      render(<ChunkHighlight {...defaultProps} />);
      const chunk = screen.getByTestId("chunk-highlight");
      expect(chunk).toHaveAttribute("data-chunk-id", "chunk-123");
      expect(chunk).toHaveAttribute("data-start-char", "100");
      expect(chunk).toHaveAttribute("data-end-char", "200");
    });

    it("renders without onClick handler", () => {
      render(<ChunkHighlight {...defaultProps} />);
      const chunk = screen.getByTestId("chunk-highlight");
      expect(chunk).not.toHaveAttribute("role");
      expect(chunk).not.toHaveAttribute("tabIndex");
    });
  });

  describe("Scroll Behavior", () => {
    it("scrolls into view when scrollIntoView is true", () => {
      const scrollIntoViewMock = vi.fn();
      HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      render(<ChunkHighlight {...defaultProps} scrollIntoView={true} />);

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "center",
      });
    });

    it("does not scroll when scrollIntoView is false", () => {
      const scrollIntoViewMock = vi.fn();
      HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      render(<ChunkHighlight {...defaultProps} scrollIntoView={false} />);

      expect(scrollIntoViewMock).not.toHaveBeenCalled();
    });

    it("does not scroll by default", () => {
      const scrollIntoViewMock = vi.fn();
      HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      render(<ChunkHighlight {...defaultProps} />);

      expect(scrollIntoViewMock).not.toHaveBeenCalled();
    });
  });

  describe("Click Interaction", () => {
    it("calls onClick when clicked", () => {
      const onClick = vi.fn();

      render(<ChunkHighlight {...defaultProps} onClick={onClick} />);
      const chunk = screen.getByTestId("chunk-highlight");

      fireEvent.click(chunk);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick when not provided", () => {
      render(<ChunkHighlight {...defaultProps} />);
      const chunk = screen.getByTestId("chunk-highlight");

      // Should not throw
      fireEvent.click(chunk);
    });

    it("sets role and tabIndex when onClick is provided", () => {
      const onClick = vi.fn();
      render(<ChunkHighlight {...defaultProps} onClick={onClick} />);
      const chunk = screen.getByTestId("chunk-highlight");

      expect(chunk).toHaveAttribute("role", "button");
      expect(chunk).toHaveAttribute("tabIndex", "0");
    });

    it("sets cursor to pointer when onClick is provided", () => {
      const onClick = vi.fn();
      render(<ChunkHighlight {...defaultProps} onClick={onClick} />);
      const chunk = screen.getByTestId("chunk-highlight");

      expect(chunk).toHaveStyle({ cursor: "pointer" });
    });

    it("sets cursor to default when onClick is not provided", () => {
      render(<ChunkHighlight {...defaultProps} />);
      const chunk = screen.getByTestId("chunk-highlight");

      expect(chunk).toHaveStyle({ cursor: "default" });
    });
  });

  describe("Keyboard Interaction", () => {
    it("calls onClick when Enter key is pressed", () => {
      const onClick = vi.fn();

      render(<ChunkHighlight {...defaultProps} onClick={onClick} />);
      const chunk = screen.getByTestId("chunk-highlight");

      chunk.focus();
      fireEvent.keyDown(chunk, { key: "Enter" });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("calls onClick when Space key is pressed", () => {
      const onClick = vi.fn();

      render(<ChunkHighlight {...defaultProps} onClick={onClick} />);
      const chunk = screen.getByTestId("chunk-highlight");

      chunk.focus();
      fireEvent.keyDown(chunk, { key: " " });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick for other keys", () => {
      const onClick = vi.fn();

      render(<ChunkHighlight {...defaultProps} onClick={onClick} />);
      const chunk = screen.getByTestId("chunk-highlight");

      chunk.focus();
      fireEvent.keyDown(chunk, { key: "Escape" });
      fireEvent.keyDown(chunk, { key: "Tab" });

      expect(onClick).not.toHaveBeenCalled();
    });

    it("does not call onClick on keyboard when onClick is not provided", () => {
      render(<ChunkHighlight {...defaultProps} />);
      const chunk = screen.getByTestId("chunk-highlight");

      // Should not throw
      fireEvent.keyDown(chunk, { key: "Enter" });
    });
  });

  describe("Styling", () => {
    it("applies correct padding", () => {
      render(<ChunkHighlight {...defaultProps} />);
      const chunk = screen.getByTestId("chunk-highlight");
      expect(chunk).toHaveStyle({ padding: "8px 12px" });
    });

    it("applies correct border radius", () => {
      render(<ChunkHighlight {...defaultProps} />);
      const chunk = screen.getByTestId("chunk-highlight");
      expect(chunk).toHaveStyle({ borderRadius: "4px" });
    });

    it("applies correct margin", () => {
      render(<ChunkHighlight {...defaultProps} />);
      const chunk = screen.getByTestId("chunk-highlight");
      expect(chunk).toHaveStyle({ margin: "8px 0" });
    });

    it("applies transition for background color", () => {
      render(<ChunkHighlight {...defaultProps} />);
      const chunk = screen.getByTestId("chunk-highlight");
      expect(chunk).toHaveStyle({
        transition: "background-color 200ms ease-out",
      });
    });
  });

  describe("Accessibility", () => {
    it("has aria-label when onClick is provided", () => {
      const onClick = vi.fn();
      render(<ChunkHighlight {...defaultProps} onClick={onClick} />);
      const chunk = screen.getByTestId("chunk-highlight");

      expect(chunk).toHaveAttribute(
        "aria-label",
        "Chunk from position 100 to 200",
      );
    });

    it("does not have aria-label when onClick is not provided", () => {
      render(<ChunkHighlight {...defaultProps} />);
      const chunk = screen.getByTestId("chunk-highlight");

      expect(chunk).not.toHaveAttribute("aria-label");
    });

    it("is keyboard accessible when interactive", () => {
      const onClick = vi.fn();
      render(<ChunkHighlight {...defaultProps} onClick={onClick} />);
      const chunk = screen.getByTestId("chunk-highlight");

      expect(chunk).toHaveAttribute("tabIndex", "0");
      expect(chunk).toHaveAttribute("role", "button");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty children", () => {
      render(<ChunkHighlight {...defaultProps} children={null} />);
      const chunk = screen.getByTestId("chunk-highlight");
      expect(chunk).toBeInTheDocument();
    });

    it("handles zero character positions", () => {
      render(<ChunkHighlight {...defaultProps} startChar={0} endChar={0} />);
      const chunk = screen.getByTestId("chunk-highlight");
      expect(chunk).toHaveAttribute("data-start-char", "0");
      expect(chunk).toHaveAttribute("data-end-char", "0");
    });

    it("handles large character positions", () => {
      render(
        <ChunkHighlight
          {...defaultProps}
          startChar={999999}
          endChar={1000000}
        />,
      );
      const chunk = screen.getByTestId("chunk-highlight");
      expect(chunk).toHaveAttribute("data-start-char", "999999");
      expect(chunk).toHaveAttribute("data-end-char", "1000000");
    });

    it("handles complex children content", () => {
      render(
        <ChunkHighlight {...defaultProps}>
          <div>
            <p>Paragraph 1</p>
            <p>Paragraph 2</p>
          </div>
        </ChunkHighlight>,
      );
      expect(screen.getByText("Paragraph 1")).toBeInTheDocument();
      expect(screen.getByText("Paragraph 2")).toBeInTheDocument();
    });
  });
});
