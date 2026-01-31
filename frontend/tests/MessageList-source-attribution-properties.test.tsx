/**
 * Property-Based Tests for Source Attribution Rendering
 *
 * Feature: frontend-integration-phase-2-part1
 * Property 8: Source Attribution Rendering
 * **Validates: Requirements 15.3.1**
 *
 * Tests verify that SourceAttribution renders correctly:
 * - For any message with sources in metadata, renders clickable source links
 * - Clicking a link triggers the scroll-to-chunk handler with correct chunk ID
 * - All sources are rendered
 */

import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  SourceAttribution,
  SourceChunk,
} from "../src/components/chat/SourceAttribution";

describe("Source Attribution Rendering Properties", () => {
  /**
   * Property 8: Source Attribution Rendering
   *
   * For any message with sources in metadata:
   * - The MessageList should render clickable source links for each source
   * - Clicking a link should trigger the scroll-to-chunk handler with the correct chunk ID
   *
   * **Validates: Requirements 15.3.1**
   */
  it("Property 8: All sources render as clickable links", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            chunk_id: fc.uuid(),
            document_id: fc.uuid(),
            document_title: fc.option(
              fc.string({ minLength: 1, maxLength: 50 }),
              { nil: undefined },
            ),
            chunk_index: fc.option(fc.integer({ min: 0, max: 100 }), {
              nil: undefined,
            }),
            similarity: fc.option(fc.float({ min: 0, max: 1 }), {
              nil: undefined,
            }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (sources) => {
          const handleClick = vi.fn();
          const { unmount } = render(
            <SourceAttribution
              sources={sources}
              onSourceClick={handleClick}
              groupByDocument={false}
            />,
          );

          // Verify container renders
          expect(screen.getByTestId("source-attribution")).toBeInTheDocument();

          // Verify all sources render as links
          const links = screen.getAllByTestId("source-link");
          expect(links.length).toBe(sources.length);

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8a: Click handler receives correct chunk ID
   *
   * For any source, clicking its link should call the handler with that source's data
   */
  it("Property 8a: Click handler receives correct source data", () => {
    fc.assert(
      fc.property(
        fc.record({
          chunk_id: fc.uuid(),
          document_id: fc.uuid(),
          document_title: fc.option(
            fc.string({ minLength: 1, maxLength: 50 }),
            { nil: undefined },
          ),
          chunk_index: fc.option(fc.integer({ min: 0, max: 100 }), {
            nil: undefined,
          }),
        }),
        (source) => {
          const handleClick = vi.fn();
          const { unmount } = render(
            <SourceAttribution
              sources={[source]}
              onSourceClick={handleClick}
              groupByDocument={false}
            />,
          );

          // Click the source link
          const link = screen.getByTestId("source-link");
          fireEvent.click(link);

          // Verify handler was called with correct source
          expect(handleClick).toHaveBeenCalledTimes(1);
          expect(handleClick).toHaveBeenCalledWith(source);

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8b: Empty sources array renders nothing
   *
   * For an empty sources array, the component should not render
   */
  it("Property 8b: Empty sources array renders nothing", () => {
    const { container } = render(
      <SourceAttribution sources={[]} onSourceClick={vi.fn()} />,
    );

    expect(screen.queryByTestId("source-attribution")).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  /**
   * Property 8c: Null/undefined sources renders nothing
   *
   * For null or undefined sources, the component should not render
   */
  it("Property 8c: Null/undefined sources renders nothing", () => {
    const { container: container1 } = render(
      <SourceAttribution sources={null as any} onSourceClick={vi.fn()} />,
    );
    expect(container1.firstChild).toBeNull();

    const { container: container2 } = render(
      <SourceAttribution sources={undefined as any} onSourceClick={vi.fn()} />,
    );
    expect(container2.firstChild).toBeNull();
  });

  /**
   * Property 8d: Multiple clicks on same source
   *
   * Clicking the same source multiple times should call the handler each time
   */
  it("Property 8d: Multiple clicks call handler each time", () => {
    fc.assert(
      fc.property(
        fc.record({
          chunk_id: fc.uuid(),
          document_id: fc.uuid(),
        }),
        fc.integer({ min: 1, max: 5 }),
        (source, clickCount) => {
          const handleClick = vi.fn();
          const { unmount } = render(
            <SourceAttribution
              sources={[source]}
              onSourceClick={handleClick}
              groupByDocument={false}
            />,
          );

          const link = screen.getByTestId("source-link");

          // Click multiple times
          for (let i = 0; i < clickCount; i++) {
            fireEvent.click(link);
          }

          // Verify handler was called correct number of times
          expect(handleClick).toHaveBeenCalledTimes(clickCount);

          unmount();
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 8e: Grouped sources render correctly
   *
   * When groupByDocument is true, sources should be grouped by document_id
   */
  it("Property 8e: Grouped sources render by document", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            chunk_id: fc.uuid(),
            document_id: fc.uuid(),
            document_title: fc.string({ minLength: 1, maxLength: 50 }),
            chunk_index: fc.integer({ min: 0, max: 100 }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (sources) => {
          const { unmount } = render(
            <SourceAttribution
              sources={sources}
              onSourceClick={vi.fn()}
              groupByDocument={true}
            />,
          );

          // Verify container renders
          expect(screen.getByTestId("source-attribution")).toBeInTheDocument();

          // Count unique documents
          const uniqueDocIds = new Set(sources.map((s) => s.document_id));

          // Verify document groups render
          const groups = screen.getAllByTestId("document-group");
          expect(groups.length).toBe(uniqueDocIds.size);

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8f: Custom label renders correctly
   *
   * For any custom label string, it should be displayed
   */
  it("Property 8f: Custom label renders correctly", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.array(
          fc.record({
            chunk_id: fc.uuid(),
            document_id: fc.uuid(),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        (label, sources) => {
          const { unmount } = render(
            <SourceAttribution
              sources={sources}
              onSourceClick={vi.fn()}
              label={label}
              groupByDocument={false}
            />,
          );

          const labelElement = screen.getByTestId("source-label");
          expect(labelElement.textContent).toBe(label);

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8g: All sources are clickable
   *
   * For any array of sources, every rendered link should be clickable
   */
  it("Property 8g: All rendered links are clickable", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            chunk_id: fc.uuid(),
            document_id: fc.uuid(),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (sources) => {
          const handleClick = vi.fn();
          const { unmount } = render(
            <SourceAttribution
              sources={sources}
              onSourceClick={handleClick}
              groupByDocument={false}
            />,
          );

          const links = screen.getAllByTestId("source-link");

          // Click each link
          links.forEach((link) => {
            fireEvent.click(link);
          });

          // Verify handler was called for each source
          expect(handleClick).toHaveBeenCalledTimes(sources.length);

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8h: No handler provided doesn't crash
   *
   * When onSourceClick is undefined, clicking should not crash
   */
  it("Property 8h: Missing handler doesn't crash on click", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            chunk_id: fc.uuid(),
            document_id: fc.uuid(),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        (sources) => {
          const { unmount } = render(
            <SourceAttribution sources={sources} groupByDocument={false} />,
          );

          const links = screen.getAllByTestId("source-link");

          // Should not throw when clicking
          expect(() => {
            links.forEach((link) => fireEvent.click(link));
          }).not.toThrow();

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });
});
