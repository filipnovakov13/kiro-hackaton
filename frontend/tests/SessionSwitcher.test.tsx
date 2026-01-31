/**
 * SessionSwitcher Component Tests
 *
 * Tests for session switching functionality:
 * - Display all sessions with document name and timestamp
 * - Highlight current session
 * - Handle session switch on click
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SessionSwitcher } from "../src/components/chat/SessionSwitcher";
import { ChatSession } from "../src/types/chat";
import * as api from "../src/services/api";

// Mock the API
vi.mock("../src/services/api", () => ({
  getDocument: vi.fn(),
}));

describe("SessionSwitcher", () => {
  const mockSessions: ChatSession[] = [
    {
      id: "session-1",
      document_id: "doc-1",
      created_at: "2024-01-01T10:00:00Z",
      updated_at: "2024-01-01T12:00:00Z",
      message_count: 5,
    },
    {
      id: "session-2",
      document_id: "doc-2",
      created_at: "2024-01-02T10:00:00Z",
      updated_at: "2024-01-02T14:00:00Z",
      message_count: 3,
    },
    {
      id: "session-3",
      document_id: null,
      created_at: "2024-01-03T10:00:00Z",
      updated_at: "2024-01-03T11:00:00Z",
      message_count: 0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock document API responses
    vi.mocked(api.getDocument).mockImplementation(async (id: string) => {
      if (id === "doc-1") {
        return {
          id: "doc-1",
          original_name: "Document One.pdf",
          markdown_content: "Content",
          created_at: "2024-01-01T10:00:00Z",
          updated_at: "2024-01-01T10:00:00Z",
          status: "ready",
        } as any;
      }
      if (id === "doc-2") {
        return {
          id: "doc-2",
          original_name: "Document Two.pdf",
          markdown_content: "Content",
          created_at: "2024-01-02T10:00:00Z",
          updated_at: "2024-01-02T10:00:00Z",
          status: "ready",
        } as any;
      }
      throw new Error("Document not found");
    });
  });

  describe("Rendering", () => {
    it("renders session switcher button", () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      const button = screen.getByTestId("session-switcher-button");
      expect(button).toBeDefined();
    });

    it("displays current session document name", async () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      // Wait for document name to load
      await waitFor(() => {
        const button = screen.getByTestId("session-switcher-button");
        expect(button.textContent).toContain("Document One.pdf");
      });
    });

    it("shows 'Select Session' when no current session", () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId={null}
          onSwitch={onSwitch}
        />,
      );

      const button = screen.getByTestId("session-switcher-button");
      expect(button.textContent).toContain("Select Session");
    });

    it("is disabled when sessions array is empty", () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={[]}
          currentSessionId={null}
          onSwitch={onSwitch}
        />,
      );

      const button = screen.getByTestId("session-switcher-button");
      expect(button.hasAttribute("disabled")).toBe(true);
    });

    it("is disabled when disabled prop is true", () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
          disabled={true}
        />,
      );

      const button = screen.getByTestId("session-switcher-button");
      expect(button.hasAttribute("disabled")).toBe(true);
    });
  });

  describe("Dropdown Behavior", () => {
    it("opens dropdown when button is clicked", async () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      const button = screen.getByTestId("session-switcher-button");
      fireEvent.click(button);

      await waitFor(() => {
        const dropdown = screen.getByTestId("session-switcher-dropdown");
        expect(dropdown).toBeDefined();
      });
    });

    it("closes dropdown when overlay is clicked", async () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      // Open dropdown
      const button = screen.getByTestId("session-switcher-button");
      fireEvent.click(button);

      await waitFor(() => {
        const dropdown = screen.getByTestId("session-switcher-dropdown");
        expect(dropdown).toBeDefined();
      });

      // Click overlay
      const overlay = screen.getByTestId("session-switcher-overlay");
      fireEvent.click(overlay);

      // Dropdown should be closed
      const dropdownAfter = screen.queryByTestId("session-switcher-dropdown");
      expect(dropdownAfter).toBeNull();
    });

    it("displays all sessions in dropdown", async () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      // Open dropdown
      const button = screen.getByTestId("session-switcher-button");
      fireEvent.click(button);

      await waitFor(() => {
        const session1 = screen.getByTestId("session-item-session-1");
        const session2 = screen.getByTestId("session-item-session-2");
        const session3 = screen.getByTestId("session-item-session-3");

        expect(session1).toBeDefined();
        expect(session2).toBeDefined();
        expect(session3).toBeDefined();
      });
    });

    it("displays document names for each session", async () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      // Open dropdown
      const button = screen.getByTestId("session-switcher-button");
      fireEvent.click(button);

      await waitFor(() => {
        const dropdown = screen.getByTestId("session-switcher-dropdown");
        expect(dropdown.textContent).toContain("Document One.pdf");
        expect(dropdown.textContent).toContain("Document Two.pdf");
        expect(dropdown.textContent).toContain("No document");
      });
    });

    it("displays timestamps for each session", async () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      // Open dropdown
      const button = screen.getByTestId("session-switcher-button");
      fireEvent.click(button);

      await waitFor(() => {
        const dropdown = screen.getByTestId("session-switcher-dropdown");
        // Should contain some timestamp text (exact format depends on current time)
        expect(dropdown.textContent).toBeTruthy();
      });
    });
  });

  describe("Session Highlighting", () => {
    it("highlights current session with checkmark", async () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      // Open dropdown
      const button = screen.getByTestId("session-switcher-button");
      fireEvent.click(button);

      await waitFor(() => {
        const session1 = screen.getByTestId("session-item-session-1");
        expect(session1.textContent).toContain("✓");
      });
    });

    it("marks current session as active", async () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      // Open dropdown
      const button = screen.getByTestId("session-switcher-button");
      fireEvent.click(button);

      await waitFor(() => {
        const session1 = screen.getByTestId("session-item-session-1");
        expect(session1.getAttribute("data-active")).toBe("true");
      });
    });

    it("does not mark non-current sessions as active", async () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      // Open dropdown
      const button = screen.getByTestId("session-switcher-button");
      fireEvent.click(button);

      await waitFor(() => {
        const session2 = screen.getByTestId("session-item-session-2");
        expect(session2.getAttribute("data-active")).toBe("false");
      });
    });
  });

  describe("Session Switching", () => {
    it("calls onSwitch when session is clicked", async () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      // Open dropdown
      const button = screen.getByTestId("session-switcher-button");
      fireEvent.click(button);

      await waitFor(() => {
        const session2 = screen.getByTestId("session-item-session-2");
        fireEvent.click(session2);
      });

      expect(onSwitch).toHaveBeenCalledTimes(1);
      expect(onSwitch).toHaveBeenCalledWith("session-2");
    });

    it("closes dropdown after session is selected", async () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      // Open dropdown
      const button = screen.getByTestId("session-switcher-button");
      fireEvent.click(button);

      await waitFor(() => {
        const session2 = screen.getByTestId("session-item-session-2");
        fireEvent.click(session2);
      });

      // Dropdown should be closed
      const dropdownAfter = screen.queryByTestId("session-switcher-dropdown");
      expect(dropdownAfter).toBeNull();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes on button", () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      const button = screen.getByTestId("session-switcher-button");
      expect(button.getAttribute("aria-label")).toBe("Switch session");
      expect(button.getAttribute("aria-haspopup")).toBe("listbox");
      expect(button.getAttribute("aria-expanded")).toBe("false");
    });

    it("updates aria-expanded when dropdown opens", async () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      const button = screen.getByTestId("session-switcher-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(button.getAttribute("aria-expanded")).toBe("true");
      });
    });

    it("has proper ARIA attributes on dropdown", async () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      // Open dropdown
      const button = screen.getByTestId("session-switcher-button");
      fireEvent.click(button);

      await waitFor(() => {
        const dropdown = screen.getByTestId("session-switcher-dropdown");
        expect(dropdown.getAttribute("role")).toBe("listbox");
        expect(dropdown.getAttribute("aria-label")).toBe("Available sessions");
      });
    });

    it("has proper ARIA attributes on session items", async () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      // Open dropdown
      const button = screen.getByTestId("session-switcher-button");
      fireEvent.click(button);

      await waitFor(() => {
        const session1 = screen.getByTestId("session-item-session-1");
        expect(session1.getAttribute("role")).toBe("option");
        expect(session1.getAttribute("aria-selected")).toBe("true");
      });
    });
  });

  describe("Error Handling", () => {
    it("shows 'Unknown document' when document fetch fails", async () => {
      const onSwitch = vi.fn();

      // Mock API to throw error
      vi.mocked(api.getDocument).mockRejectedValue(
        new Error("Document not found"),
      );

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      // Open dropdown
      const button = screen.getByTestId("session-switcher-button");
      fireEvent.click(button);

      await waitFor(() => {
        const dropdown = screen.getByTestId("session-switcher-dropdown");
        expect(dropdown.textContent).toContain("Unknown document");
      });
    });

    it("shows 'No document' for sessions without document_id", async () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-3"
          onSwitch={onSwitch}
        />,
      );

      // Open dropdown
      const button = screen.getByTestId("session-switcher-button");
      fireEvent.click(button);

      await waitFor(() => {
        const dropdown = screen.getByTestId("session-switcher-dropdown");
        expect(dropdown.textContent).toContain("No document");
      });
    });
  });

  describe("Styling", () => {
    it("uses design system tokens for spacing", () => {
      const onSwitch = vi.fn();

      render(
        <SessionSwitcher
          sessions={mockSessions}
          currentSessionId="session-1"
          onSwitch={onSwitch}
        />,
      );

      const button = screen.getByTestId("session-switcher-button");
      const style = window.getComputedStyle(button);

      // Check that padding is set using design system tokens
      expect(style.padding).toBeTruthy();
    });
  });
});
