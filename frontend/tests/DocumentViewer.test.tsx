/**
 * DocumentViewer Component Tests
 *
 * Test coverage:
 * - Rendering with content
 * - Empty state handling
 * - Loading state
 * - Title display
 * - Markdown parsing (headings, paragraphs, code blocks)
 * - Scrolling behavior
 * - Click handling
 * - Chunk highlighting
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DocumentViewer } from "../src/components/document/DocumentViewer";

describe("DocumentViewer", () => {
  const sampleMarkdown = `# Heading 1
This is a paragraph.

## Heading 2
Another paragraph here.

### Heading 3
More content.

\`\`\`javascript
const code = "example";
\`\`\``;

  // =============================================================================
  // RENDERING TESTS
  // =============================================================================

  describe("Rendering", () => {
    it("should render container", () => {
      render(<DocumentViewer />);
      expect(screen.getByTestId("document-viewer")).toBeInTheDocument();
    });

    it("should render content when provided", () => {
      render(<DocumentViewer content="Test content" />);
      expect(screen.getByTestId("document-content")).toBeInTheDocument();
    });

    it("should render title when provided", () => {
      render(<DocumentViewer content="Content" title="Test Document" />);
      expect(screen.getByTestId("document-title")).toHaveTextContent(
        "Test Document",
      );
    });

    it("should not render title when not provided", () => {
      render(<DocumentViewer content="Content" />);
      expect(screen.queryByTestId("document-title")).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // EMPTY STATE TESTS
  // =============================================================================

  describe("Empty State", () => {
    it("should show empty state when no content", () => {
      render(<DocumentViewer />);
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    it("should display empty state message", () => {
      render(<DocumentViewer />);
      expect(screen.getByText("No document selected")).toBeInTheDocument();
      expect(
        screen.getByText("Upload a document to get started"),
      ).toBeInTheDocument();
    });

    it("should not show content when empty", () => {
      render(<DocumentViewer />);
      expect(screen.queryByTestId("document-content")).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // LOADING STATE TESTS
  // =============================================================================

  describe("Loading State", () => {
    it("should show loading state when isLoading is true", () => {
      render(<DocumentViewer isLoading={true} />);
      expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    });

    it("should display loading message", () => {
      render(<DocumentViewer isLoading={true} />);
      expect(screen.getByText("Loading document...")).toBeInTheDocument();
    });

    it("should not show content when loading", () => {
      render(<DocumentViewer content="Content" isLoading={true} />);
      expect(screen.queryByTestId("document-content")).not.toBeInTheDocument();
    });

    it("should not show empty state when loading", () => {
      render(<DocumentViewer isLoading={true} />);
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // MARKDOWN PARSING TESTS
  // =============================================================================

  describe("Markdown Parsing", () => {
    it("should render H1 headings", () => {
      render(<DocumentViewer content="# Heading 1" />);
      const content = screen.getByTestId("document-content");
      expect(content.querySelector("h1")).toHaveTextContent("Heading 1");
    });

    it("should render H2 headings", () => {
      render(<DocumentViewer content="## Heading 2" />);
      const content = screen.getByTestId("document-content");
      expect(content.querySelector("h2")).toHaveTextContent("Heading 2");
    });

    it("should render H3 headings", () => {
      render(<DocumentViewer content="### Heading 3" />);
      const content = screen.getByTestId("document-content");
      expect(content.querySelector("h3")).toHaveTextContent("Heading 3");
    });

    it("should render paragraphs", () => {
      render(<DocumentViewer content="This is a paragraph." />);
      const content = screen.getByTestId("document-content");
      expect(content.querySelector("p")).toHaveTextContent(
        "This is a paragraph.",
      );
    });

    it("should render code blocks", () => {
      const codeContent = "```javascript\nconst x = 1;\n```";
      render(<DocumentViewer content={codeContent} />);
      expect(screen.getByTestId("code-block")).toBeInTheDocument();
    });

    it("should display code language label", () => {
      const codeContent = "```javascript\nconst x = 1;\n```";
      render(<DocumentViewer content={codeContent} />);
      expect(screen.getByTestId("code-language")).toHaveTextContent(
        "javascript",
      );
    });

    it("should render code block content", () => {
      const codeContent = "```javascript\nconst x = 1;\n```";
      render(<DocumentViewer content={codeContent} />);
      const codeBlock = screen.getByTestId("code-block");
      expect(codeBlock.textContent).toContain("const x = 1;");
    });

    it("should handle multiple markdown elements", () => {
      render(<DocumentViewer content={sampleMarkdown} />);
      const content = screen.getByTestId("document-content");
      expect(content.querySelector("h1")).toBeInTheDocument();
      expect(content.querySelector("h2")).toBeInTheDocument();
      expect(content.querySelector("h3")).toBeInTheDocument();
      expect(content.querySelectorAll("p").length).toBeGreaterThan(0);
      expect(screen.getByTestId("code-block")).toBeInTheDocument();
    });

    it("should handle empty lines as paragraph breaks", () => {
      const contentWithBreaks = "Line 1\n\nLine 2";
      render(<DocumentViewer content={contentWithBreaks} />);
      const content = screen.getByTestId("document-content");
      // Should have spacing div between paragraphs
      expect(content.children.length).toBeGreaterThan(2);
    });
  });

  // =============================================================================
  // INTERACTION TESTS
  // =============================================================================

  describe("Interaction", () => {
    it("should call onContentClick when content is clicked", () => {
      const handleClick = vi.fn();
      render(
        <DocumentViewer content="Test content" onContentClick={handleClick} />,
      );

      fireEvent.click(screen.getByTestId("document-content"));
      expect(handleClick).toHaveBeenCalled();
    });

    it("should pass approximate position to onContentClick", () => {
      const handleClick = vi.fn();
      render(
        <DocumentViewer content="Test content" onContentClick={handleClick} />,
      );

      fireEvent.click(screen.getByTestId("document-content"));
      expect(handleClick).toHaveBeenCalledWith(expect.any(Number));
    });

    it("should not error when onContentClick is not provided", () => {
      render(<DocumentViewer content="Test content" />);
      expect(() =>
        fireEvent.click(screen.getByTestId("document-content")),
      ).not.toThrow();
    });
  });

  // =============================================================================
  // CHUNK HIGHLIGHTING TESTS
  // =============================================================================

  describe("Chunk Highlighting", () => {
    it("should set highlighted chunk data attribute", () => {
      render(
        <DocumentViewer content="Content" highlightedChunkId="chunk-123" />,
      );
      const content = screen.getByTestId("document-content");
      expect(content).toHaveAttribute("data-highlighted-chunk", "chunk-123");
    });

    it("should not set data attribute when no chunk highlighted", () => {
      render(<DocumentViewer content="Content" />);
      const content = screen.getByTestId("document-content");
      // When undefined, React doesn't set the attribute at all
      expect(content.getAttribute("data-highlighted-chunk")).toBeNull();
    });
  });

  // =============================================================================
  // STYLING TESTS
  // =============================================================================

  describe("Styling", () => {
    it("should apply container styles", () => {
      render(<DocumentViewer content="Content" />);
      const container = screen.getByTestId("document-viewer");
      expect(container).toHaveStyle({
        height: "100%",
        overflowY: "auto",
      });
    });

    it("should apply content max-width", () => {
      render(<DocumentViewer content="Content" />);
      const content = screen.getByTestId("document-content");
      expect(content).toHaveStyle({ maxWidth: "800px" });
    });

    it("should center content", () => {
      render(<DocumentViewer content="Content" />);
      const content = screen.getByTestId("document-content");
      expect(content).toHaveStyle({ margin: "0 auto" });
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================

  describe("Accessibility", () => {
    it("should have proper testids", () => {
      render(<DocumentViewer content="Content" title="Test" />);
      expect(screen.getByTestId("document-viewer")).toBeInTheDocument();
      expect(screen.getByTestId("document-title")).toBeInTheDocument();
      expect(screen.getByTestId("document-content")).toBeInTheDocument();
    });

    it("should use semantic HTML for headings", () => {
      render(<DocumentViewer content="# Heading" />);
      const content = screen.getByTestId("document-content");
      const h1 = content.querySelector("h1");
      expect(h1?.tagName).toBe("H1");
    });

    it("should use semantic HTML for paragraphs", () => {
      render(<DocumentViewer content="Paragraph text" />);
      const content = screen.getByTestId("document-content");
      const p = content.querySelector("p");
      expect(p?.tagName).toBe("P");
    });

    it("should use pre and code tags for code blocks", () => {
      const codeContent = "```javascript\nconst x = 1;\n```";
      render(<DocumentViewer content={codeContent} />);
      const pre = screen.getByTestId("code-block");
      expect(pre.tagName).toBe("PRE");
      expect(pre.querySelector("code")).toBeInTheDocument();
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe("Edge Cases", () => {
    it("should handle empty string content", () => {
      render(<DocumentViewer content="" />);
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    it("should handle very long content", () => {
      const longContent = "Line\n".repeat(1000);
      render(<DocumentViewer content={longContent} />);
      expect(screen.getByTestId("document-content")).toBeInTheDocument();
    });

    it("should handle code blocks without language", () => {
      const codeContent = "```\nconst x = 1;\n```";
      render(<DocumentViewer content={codeContent} />);
      expect(screen.getByTestId("code-block")).toBeInTheDocument();
      expect(screen.queryByTestId("code-language")).not.toBeInTheDocument();
    });

    it("should handle nested markdown elements", () => {
      const nestedContent = "# Heading\nParagraph\n## Subheading\nMore text";
      render(<DocumentViewer content={nestedContent} />);
      const content = screen.getByTestId("document-content");
      expect(content.querySelector("h1")).toBeInTheDocument();
      expect(content.querySelector("h2")).toBeInTheDocument();
      expect(content.querySelectorAll("p").length).toBe(2);
    });

    it("should handle special characters in content", () => {
      const specialContent = "Content with <>&\"' special chars";
      render(<DocumentViewer content={specialContent} />);
      expect(screen.getByTestId("document-content")).toHaveTextContent(
        specialContent,
      );
    });
  });
});
