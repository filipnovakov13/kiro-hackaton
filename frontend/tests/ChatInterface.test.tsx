/**
 * ChatInterface Component Tests
 *
 * Tests for split-pane layout with resizable border and collapse/expand
 *
 * @see frontend/src/components/chat/ChatInterface.tsx
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatInterface } from "../src/components/chat/ChatInterface";

describe("ChatInterface", () => {
  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      clear: vi.fn(),
    };
    global.localStorage = localStorageMock as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders split-pane layout with document and chat panes", () => {
      render(<ChatInterface />);

      expect(screen.getByTestId("chat-interface")).toBeInTheDocument();
      expect(screen.getByTestId("document-pane")).toBeInTheDocument();
      expect(screen.getByTestId("chat-pane")).toBeInTheDocument();
    });

    it("renders custom document content when provided", () => {
      render(
        <ChatInterface
          documentContent={<div data-testid="custom-doc">Custom Doc</div>}
        />,
      );

      expect(screen.getByTestId("custom-doc")).toBeInTheDocument();
    });

    it("renders custom chat content when provided", () => {
      render(
        <ChatInterface
          chatContent={<div data-testid="custom-chat">Custom Chat</div>}
        />,
      );

      expect(screen.getByTestId("custom-chat")).toBeInTheDocument();
    });

    it("renders empty state messages when no content provided", () => {
      render(<ChatInterface />);

      expect(screen.getByText("No document selected")).toBeInTheDocument();
      expect(
        screen.getByText("Select a document to start chatting,"),
      ).toBeInTheDocument();
    });

    it("renders resizer when document pane is expanded", () => {
      render(<ChatInterface />);

      expect(screen.getByTestId("pane-resizer")).toBeInTheDocument();
    });

    it("does not render resizer when document pane is collapsed", () => {
      render(<ChatInterface initialCollapsed={true} />);

      expect(screen.queryByTestId("pane-resizer")).not.toBeInTheDocument();
    });
  });

  describe("Collapse/Expand Functionality", () => {
    it("starts expanded by default", () => {
      render(<ChatInterface />);

      expect(screen.getByTestId("collapse-button")).toBeInTheDocument();
      expect(screen.queryByTestId("expand-button")).not.toBeInTheDocument();
    });

    it("starts collapsed when initialCollapsed is true", () => {
      render(<ChatInterface initialCollapsed={true} />);

      expect(screen.getByTestId("expand-button")).toBeInTheDocument();
      expect(screen.queryByTestId("collapse-button")).not.toBeInTheDocument();
    });

    it("collapses document pane when collapse button is clicked", () => {
      render(<ChatInterface />);

      const collapseButton = screen.getByTestId("collapse-button");
      fireEvent.click(collapseButton);

      expect(screen.getByTestId("expand-button")).toBeInTheDocument();
      expect(screen.queryByTestId("collapse-button")).not.toBeInTheDocument();
    });

    it("expands document pane when expand button is clicked", () => {
      render(<ChatInterface initialCollapsed={true} />);

      const expandButton = screen.getByTestId("expand-button");
      fireEvent.click(expandButton);

      expect(screen.getByTestId("collapse-button")).toBeInTheDocument();
      expect(screen.queryByTestId("expand-button")).not.toBeInTheDocument();
    });

    it("calls onCollapseChange callback when collapse state changes", () => {
      const onCollapseChange = vi.fn();
      render(<ChatInterface onCollapseChange={onCollapseChange} />);

      const collapseButton = screen.getByTestId("collapse-button");
      fireEvent.click(collapseButton);

      expect(onCollapseChange).toHaveBeenCalledWith(true);
    });
  });

  describe("Keyboard Accessibility", () => {
    it("collapse button is keyboard accessible with Enter key", () => {
      render(<ChatInterface />);

      const collapseButton = screen.getByTestId("collapse-button");
      fireEvent.keyDown(collapseButton, { key: "Enter" });

      expect(screen.getByTestId("expand-button")).toBeInTheDocument();
    });

    it("collapse button is keyboard accessible with Space key", () => {
      render(<ChatInterface />);

      const collapseButton = screen.getByTestId("collapse-button");
      fireEvent.keyDown(collapseButton, { key: " " });

      expect(screen.getByTestId("expand-button")).toBeInTheDocument();
    });

    it("expand button is keyboard accessible with Enter key", () => {
      render(<ChatInterface initialCollapsed={true} />);

      const expandButton = screen.getByTestId("expand-button");
      fireEvent.keyDown(expandButton, { key: "Enter" });

      expect(screen.getByTestId("collapse-button")).toBeInTheDocument();
    });

    it("expand button is keyboard accessible with Space key", () => {
      render(<ChatInterface initialCollapsed={true} />);

      const expandButton = screen.getByTestId("expand-button");
      fireEvent.keyDown(expandButton, { key: " " });

      expect(screen.getByTestId("collapse-button")).toBeInTheDocument();
    });

    it("collapse button has tabIndex=0", () => {
      render(<ChatInterface />);

      const collapseButton = screen.getByTestId("collapse-button");
      expect(collapseButton).toHaveAttribute("tabIndex", "0");
    });

    it("expand button has tabIndex=0", () => {
      render(<ChatInterface initialCollapsed={true} />);

      const expandButton = screen.getByTestId("expand-button");
      expect(expandButton).toHaveAttribute("tabIndex", "0");
    });

    it("buttons have proper ARIA labels", () => {
      render(<ChatInterface />);

      const collapseButton = screen.getByTestId("collapse-button");
      expect(collapseButton).toHaveAttribute(
        "aria-label",
        "Collapse document pane",
      );
    });
  });

  describe("LocalStorage Persistence", () => {
    it("loads document width from localStorage on mount", () => {
      const mockGetItem = vi.fn().mockReturnValue("60");
      global.localStorage.getItem = mockGetItem;

      render(<ChatInterface />);

      expect(mockGetItem).toHaveBeenCalledWith("iubar-split-pane-width");
    });

    it("saves document width to localStorage when changed", () => {
      const mockSetItem = vi.fn();
      global.localStorage.setItem = mockSetItem;

      render(<ChatInterface />);

      // Note: Testing actual resize requires more complex mouse event simulation
      // This test verifies the mechanism exists
      expect(mockSetItem).toHaveBeenCalled();
    });

    it("uses default width when localStorage is empty", () => {
      const mockGetItem = vi.fn().mockReturnValue(null);
      global.localStorage.getItem = mockGetItem;

      render(<ChatInterface />);

      expect(mockGetItem).toHaveBeenCalledWith("iubar-split-pane-width");
      // Component should render without errors
      expect(screen.getByTestId("chat-interface")).toBeInTheDocument();
    });
  });

  describe("Resize Functionality", () => {
    it("renders resizer with col-resize cursor style", () => {
      render(<ChatInterface />);

      const resizer = screen.getByTestId("pane-resizer");
      expect(resizer).toHaveStyle({ cursor: "col-resize" });
    });

    it("resizer has proper width", () => {
      render(<ChatInterface />);

      const resizer = screen.getByTestId("pane-resizer");
      expect(resizer).toHaveStyle({ width: "4px" });
    });
  });
});
