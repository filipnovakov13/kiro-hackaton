/**
 * SourceAttribution Component Tests
 *
 * Test coverage:
 * - Rendering with sources
 * - Empty state handling
 * - Grouped vs flat view
 * - Source link interaction
 * - Document grouping logic
 * - Custom labels
 * - Accessibility
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  SourceAttribution,
  SourceChunk,
} from "../src/components/chat/SourceAttribution";

describe("SourceAttribution", () => {
  const mockSources: SourceChunk[] = [
    {
      chunk_id: "chunk1",
      document_id: "doc1",
      document_title: "Document 1",
      chunk_index: 5,
    },
    {
      chunk_id: "chunk2",
      document_id: "doc1",
      document_title: "Document 1",
      chunk_index: 7,
    },
    {
      chunk_id: "chunk3",
      document_id: "doc2",
      document_title: "Document 2",
      chunk_index: 3,
    },
  ];

  // =============================================================================
  // RENDERING TESTS
  // =============================================================================

  describe("Rendering", () => {
    it("should render with sources", () => {
      render(<SourceAttribution sources={mockSources} />);
      expect(screen.getByTestId("source-attribution")).toBeInTheDocument();
    });

    it("should render default label", () => {
      render(<SourceAttribution sources={mockSources} />);
      expect(screen.getByTestId("source-label")).toHaveTextContent("Sources:");
    });

    it("should render custom label", () => {
      render(<SourceAttribution sources={mockSources} label="References:" />);
      expect(screen.getByTestId("source-label")).toHaveTextContent(
        "References:",
      );
    });

    it("should not render when sources is empty array", () => {
      render(<SourceAttribution sources={[]} />);
      expect(
        screen.queryByTestId("source-attribution"),
      ).not.toBeInTheDocument();
    });

    it("should not render when sources is undefined", () => {
      render(<SourceAttribution sources={undefined as any} />);
      expect(
        screen.queryByTestId("source-attribution"),
      ).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // GROUPED VIEW TESTS
  // =============================================================================

  describe("Grouped View", () => {
    it("should render document groups by default", () => {
      render(<SourceAttribution sources={mockSources} />);
      const groups = screen.getAllByTestId("document-group");
      expect(groups).toHaveLength(2); // 2 unique documents
    });

    it("should display document titles in groups", () => {
      render(<SourceAttribution sources={mockSources} />);
      expect(screen.getByText("• Document 1")).toBeInTheDocument();
      expect(screen.getByText("• Document 2")).toBeInTheDocument();
    });

    it("should display section numbers for each chunk", () => {
      render(<SourceAttribution sources={mockSources} />);
      const sectionLinks = screen.getAllByTestId("section-link");
      expect(sectionLinks).toHaveLength(3);
      expect(sectionLinks[0]).toHaveTextContent("5");
      expect(sectionLinks[1]).toHaveTextContent("7");
      expect(sectionLinks[2]).toHaveTextContent("3");
    });

    it("should group chunks from same document", () => {
      render(<SourceAttribution sources={mockSources} />);
      const groups = screen.getAllByTestId("document-group");
      // First group should have Document 1 with 2 sections
      const firstGroup = groups[0];
      expect(firstGroup).toHaveTextContent("Document 1");
      expect(firstGroup).toHaveTextContent("5");
      expect(firstGroup).toHaveTextContent("7");
    });

    it("should handle sources without document title", () => {
      const sourcesWithoutTitle: SourceChunk[] = [
        {
          chunk_id: "chunk1",
          document_id: "doc123",
          chunk_index: 1,
        },
      ];
      render(<SourceAttribution sources={sourcesWithoutTitle} />);
      // Should use truncated document ID as fallback
      expect(screen.getByText(/Document doc123/)).toBeInTheDocument();
    });
  });

  // =============================================================================
  // FLAT VIEW TESTS
  // =============================================================================

  describe("Flat View", () => {
    it("should render flat view when groupByDocument is false", () => {
      render(
        <SourceAttribution sources={mockSources} groupByDocument={false} />,
      );
      expect(screen.queryByTestId("document-group")).not.toBeInTheDocument();
      const sourceLinks = screen.getAllByTestId("source-link");
      expect(sourceLinks).toHaveLength(3);
    });

    it("should display full source text in flat view", () => {
      render(
        <SourceAttribution sources={mockSources} groupByDocument={false} />,
      );
      expect(screen.getByText("• Document 1 - Section 5")).toBeInTheDocument();
      expect(screen.getByText("• Document 1 - Section 7")).toBeInTheDocument();
      expect(screen.getByText("• Document 2 - Section 3")).toBeInTheDocument();
    });

    it("should handle sources without title in flat view", () => {
      const sourcesWithoutTitle: SourceChunk[] = [
        {
          chunk_id: "chunk1",
          document_id: "doc1",
          chunk_index: 5,
        },
      ];
      render(
        <SourceAttribution
          sources={sourcesWithoutTitle}
          groupByDocument={false}
        />,
      );
      expect(screen.getByText("• Section 5")).toBeInTheDocument();
    });

    it("should handle sources without chunk index in flat view", () => {
      const sourcesWithoutIndex: SourceChunk[] = [
        {
          chunk_id: "chunk1",
          document_id: "doc1",
          document_title: "Test Doc",
        },
      ];
      render(
        <SourceAttribution
          sources={sourcesWithoutIndex}
          groupByDocument={false}
        />,
      );
      expect(screen.getByText("• Test Doc")).toBeInTheDocument();
    });
  });

  // =============================================================================
  // INTERACTION TESTS
  // =============================================================================

  describe("Interaction", () => {
    it("should call onSourceClick when section link is clicked in grouped view", () => {
      const handleClick = vi.fn();
      render(
        <SourceAttribution sources={mockSources} onSourceClick={handleClick} />,
      );

      const sectionLinks = screen.getAllByTestId("section-link");
      fireEvent.click(sectionLinks[0]);

      expect(handleClick).toHaveBeenCalledWith(mockSources[0]);
    });

    it("should call onSourceClick when source link is clicked in flat view", () => {
      const handleClick = vi.fn();
      render(
        <SourceAttribution
          sources={mockSources}
          onSourceClick={handleClick}
          groupByDocument={false}
        />,
      );

      const sourceLinks = screen.getAllByTestId("source-link");
      fireEvent.click(sourceLinks[0]);

      expect(handleClick).toHaveBeenCalledWith(mockSources[0]);
    });

    it("should call onSourceClick for each section in grouped view", () => {
      const handleClick = vi.fn();
      render(
        <SourceAttribution sources={mockSources} onSourceClick={handleClick} />,
      );

      const sectionLinks = screen.getAllByTestId("section-link");
      fireEvent.click(sectionLinks[0]);
      fireEvent.click(sectionLinks[1]);
      fireEvent.click(sectionLinks[2]);

      expect(handleClick).toHaveBeenCalledTimes(3);
      expect(handleClick).toHaveBeenNthCalledWith(1, mockSources[0]);
      expect(handleClick).toHaveBeenNthCalledWith(2, mockSources[1]);
      expect(handleClick).toHaveBeenNthCalledWith(3, mockSources[2]);
    });

    it("should not error when onSourceClick is not provided", () => {
      render(<SourceAttribution sources={mockSources} />);
      const sectionLinks = screen.getAllByTestId("section-link");
      expect(() => fireEvent.click(sectionLinks[0])).not.toThrow();
    });
  });

  // =============================================================================
  // STYLING TESTS
  // =============================================================================

  describe("Styling", () => {
    it("should apply hover state to section links", () => {
      render(<SourceAttribution sources={mockSources} />);
      const sectionLink = screen.getAllByTestId("section-link")[0];

      fireEvent.mouseEnter(sectionLink);
      expect(sectionLink).toHaveStyle({ textDecoration: "underline" });

      fireEvent.mouseLeave(sectionLink);
      expect(sectionLink).toHaveStyle({ textDecoration: "none" });
    });

    it("should apply hover state to source links in flat view", () => {
      render(
        <SourceAttribution sources={mockSources} groupByDocument={false} />,
      );
      const sourceLink = screen.getAllByTestId("source-link")[0];

      fireEvent.mouseEnter(sourceLink);
      expect(sourceLink).toHaveStyle({ textDecoration: "underline" });

      fireEvent.mouseLeave(sourceLink);
      expect(sourceLink).toHaveStyle({ textDecoration: "none" });
    });

    it("should have border-top separator", () => {
      render(<SourceAttribution sources={mockSources} />);
      const container = screen.getByTestId("source-attribution");
      const styles = window.getComputedStyle(container);
      expect(styles.borderTop).toBeTruthy();
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================

  describe("Accessibility", () => {
    it("should have aria-label on section links", () => {
      render(<SourceAttribution sources={mockSources} />);
      const sectionLinks = screen.getAllByTestId("section-link");
      expect(sectionLinks[0]).toHaveAttribute("aria-label", "View section 5");
      expect(sectionLinks[1]).toHaveAttribute("aria-label", "View section 7");
    });

    it("should have aria-label on source links in flat view", () => {
      render(
        <SourceAttribution sources={mockSources} groupByDocument={false} />,
      );
      const sourceLinks = screen.getAllByTestId("source-link");
      expect(sourceLinks[0]).toHaveAttribute(
        "aria-label",
        "View source: Document 1 - Section 5",
      );
    });

    it("should use button elements for clickable links", () => {
      render(<SourceAttribution sources={mockSources} />);
      const sectionLinks = screen.getAllByTestId("section-link");
      sectionLinks.forEach((link) => {
        expect(link.tagName).toBe("BUTTON");
      });
    });

    it("should have proper testids for all elements", () => {
      render(<SourceAttribution sources={mockSources} />);
      expect(screen.getByTestId("source-attribution")).toBeInTheDocument();
      expect(screen.getByTestId("source-label")).toBeInTheDocument();
      expect(screen.getAllByTestId("document-group")).toHaveLength(2);
      expect(screen.getAllByTestId("section-link")).toHaveLength(3);
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe("Edge Cases", () => {
    it("should handle single source", () => {
      const singleSource: SourceChunk[] = [mockSources[0]];
      render(<SourceAttribution sources={singleSource} />);
      expect(screen.getByTestId("source-attribution")).toBeInTheDocument();
      expect(screen.getAllByTestId("section-link")).toHaveLength(1);
    });

    it("should handle sources with missing chunk_index", () => {
      const sourcesWithoutIndex: SourceChunk[] = [
        {
          chunk_id: "chunk1",
          document_id: "doc1",
          document_title: "Test",
        },
      ];
      render(<SourceAttribution sources={sourcesWithoutIndex} />);
      expect(screen.getByTestId("section-link")).toHaveTextContent("?");
    });

    it("should handle multiple sources from same document", () => {
      const sameDocs: SourceChunk[] = [
        {
          chunk_id: "chunk1",
          document_id: "doc1",
          document_title: "Same Doc",
          chunk_index: 1,
        },
        {
          chunk_id: "chunk2",
          document_id: "doc1",
          document_title: "Same Doc",
          chunk_index: 2,
        },
        {
          chunk_id: "chunk3",
          document_id: "doc1",
          document_title: "Same Doc",
          chunk_index: 3,
        },
      ];
      render(<SourceAttribution sources={sameDocs} />);
      const groups = screen.getAllByTestId("document-group");
      expect(groups).toHaveLength(1);
      expect(screen.getAllByTestId("section-link")).toHaveLength(3);
    });
  });
});
