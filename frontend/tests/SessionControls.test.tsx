/**
 * SessionControls Component Tests
 *
 * Tests for session management controls:
 * - New Session button functionality
 * - Delete Session button with confirmation dialog
 * - Disabled states
 * - Styling and accessibility
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionControls } from "../src/components/chat/SessionControls";

describe("SessionControls", () => {
  describe("New Session Button", () => {
    it("renders New Session button", () => {
      const onNewSession = vi.fn();
      const onDeleteSession = vi.fn();

      render(
        <SessionControls
          currentSessionId="session-1"
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
        />,
      );

      const newButton = screen.getByTestId("new-session-button");
      expect(newButton).toBeDefined();
      expect(newButton.textContent).toBe("New Session");
    });

    it("calls onNewSession when clicked", () => {
      const onNewSession = vi.fn();
      const onDeleteSession = vi.fn();

      render(
        <SessionControls
          currentSessionId="session-1"
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
        />,
      );

      const newButton = screen.getByTestId("new-session-button");
      fireEvent.click(newButton);

      expect(onNewSession).toHaveBeenCalledTimes(1);
    });

    it("is disabled when disabled prop is true", () => {
      const onNewSession = vi.fn();
      const onDeleteSession = vi.fn();

      render(
        <SessionControls
          currentSessionId="session-1"
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
          disabled={true}
        />,
      );

      const newButton = screen.getByTestId("new-session-button");
      expect(newButton.hasAttribute("disabled")).toBe(true);
    });
  });

  describe("Delete Session Button", () => {
    it("renders Delete Session button", () => {
      const onNewSession = vi.fn();
      const onDeleteSession = vi.fn();

      render(
        <SessionControls
          currentSessionId="session-1"
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
        />,
      );

      const deleteButton = screen.getByTestId("delete-session-button");
      expect(deleteButton).toBeDefined();
      expect(deleteButton.textContent).toBe("Delete Session");
    });

    it("is disabled when no session exists", () => {
      const onNewSession = vi.fn();
      const onDeleteSession = vi.fn();

      render(
        <SessionControls
          currentSessionId={null}
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
        />,
      );

      const deleteButton = screen.getByTestId("delete-session-button");
      expect(deleteButton.hasAttribute("disabled")).toBe(true);
    });

    it("shows confirmation dialog when clicked", () => {
      const onNewSession = vi.fn();
      const onDeleteSession = vi.fn();

      render(
        <SessionControls
          currentSessionId="session-1"
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
        />,
      );

      const deleteButton = screen.getByTestId("delete-session-button");
      fireEvent.click(deleteButton);

      const modal = screen.getByTestId("delete-confirm-modal");
      expect(modal).toBeDefined();
    });
  });

  describe("Delete Confirmation Dialog", () => {
    it("displays confirmation message", () => {
      const onNewSession = vi.fn();
      const onDeleteSession = vi.fn();

      render(
        <SessionControls
          currentSessionId="session-1"
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
        />,
      );

      const deleteButton = screen.getByTestId("delete-session-button");
      fireEvent.click(deleteButton);

      const modalTitle = screen.getByText("Delete Session?");
      expect(modalTitle).toBeDefined();

      const modalMessage = screen.getByText(
        /permanently delete this conversation/i,
      );
      expect(modalMessage).toBeDefined();
    });

    it("calls onDeleteSession when confirmed", () => {
      const onNewSession = vi.fn();
      const onDeleteSession = vi.fn();

      render(
        <SessionControls
          currentSessionId="session-1"
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
        />,
      );

      // Open dialog
      const deleteButton = screen.getByTestId("delete-session-button");
      fireEvent.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByTestId("confirm-delete-button");
      fireEvent.click(confirmButton);

      expect(onDeleteSession).toHaveBeenCalledTimes(1);
      expect(onDeleteSession).toHaveBeenCalledWith("session-1");
    });

    it("closes dialog when cancelled", () => {
      const onNewSession = vi.fn();
      const onDeleteSession = vi.fn();

      render(
        <SessionControls
          currentSessionId="session-1"
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
        />,
      );

      // Open dialog
      const deleteButton = screen.getByTestId("delete-session-button");
      fireEvent.click(deleteButton);

      // Cancel deletion
      const cancelButton = screen.getByTestId("cancel-delete-button");
      fireEvent.click(cancelButton);

      // Modal should be gone
      const modal = screen.queryByTestId("delete-confirm-modal");
      expect(modal).toBeNull();

      // onDeleteSession should not be called
      expect(onDeleteSession).not.toHaveBeenCalled();
    });

    it("closes dialog when overlay is clicked", () => {
      const onNewSession = vi.fn();
      const onDeleteSession = vi.fn();

      render(
        <SessionControls
          currentSessionId="session-1"
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
        />,
      );

      // Open dialog
      const deleteButton = screen.getByTestId("delete-session-button");
      fireEvent.click(deleteButton);

      // Click overlay
      const modal = screen.getByTestId("delete-confirm-modal");
      fireEvent.click(modal);

      // Modal should be gone
      const modalAfter = screen.queryByTestId("delete-confirm-modal");
      expect(modalAfter).toBeNull();

      // onDeleteSession should not be called
      expect(onDeleteSession).not.toHaveBeenCalled();
    });

    it("does not close when modal content is clicked", () => {
      const onNewSession = vi.fn();
      const onDeleteSession = vi.fn();

      render(
        <SessionControls
          currentSessionId="session-1"
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
        />,
      );

      // Open dialog
      const deleteButton = screen.getByTestId("delete-session-button");
      fireEvent.click(deleteButton);

      // Click modal content (not overlay)
      const modalTitle = screen.getByText("Delete Session?");
      fireEvent.click(modalTitle);

      // Modal should still be visible
      const modal = screen.queryByTestId("delete-confirm-modal");
      expect(modal).toBeDefined();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      const onNewSession = vi.fn();
      const onDeleteSession = vi.fn();

      render(
        <SessionControls
          currentSessionId="session-1"
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
        />,
      );

      const newButton = screen.getByTestId("new-session-button");
      expect(newButton.getAttribute("aria-label")).toBe("Create new session");

      const deleteButton = screen.getByTestId("delete-session-button");
      expect(deleteButton.getAttribute("aria-label")).toBe(
        "Delete current session",
      );
    });

    it("modal has proper ARIA attributes", () => {
      const onNewSession = vi.fn();
      const onDeleteSession = vi.fn();

      render(
        <SessionControls
          currentSessionId="session-1"
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
        />,
      );

      // Open dialog
      const deleteButton = screen.getByTestId("delete-session-button");
      fireEvent.click(deleteButton);

      const modalContent = screen.getByRole("dialog");
      expect(modalContent.getAttribute("aria-modal")).toBe("true");
      expect(modalContent.getAttribute("aria-labelledby")).toBe(
        "delete-modal-title",
      );
    });
  });

  describe("Styling", () => {
    it("uses design system tokens for spacing", () => {
      const onNewSession = vi.fn();
      const onDeleteSession = vi.fn();

      render(
        <SessionControls
          currentSessionId="session-1"
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
        />,
      );

      const container = screen.getByTestId("session-controls");
      const style = window.getComputedStyle(container);

      // Check that gap is set (design system spacing.md = 16px)
      expect(style.gap).toBe("16px");
    });

    it("applies golden accent on New Session hover", () => {
      const onNewSession = vi.fn();
      const onDeleteSession = vi.fn();

      render(
        <SessionControls
          currentSessionId="session-1"
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
        />,
      );

      const newButton = screen.getByTestId("new-session-button");

      // Trigger hover
      fireEvent.mouseEnter(newButton);

      // Check that color changed to golden accent
      const style = window.getComputedStyle(newButton);
      expect(style.color).toBe("#D4A574"); // Golden accent
    });

    it("applies red accent for Delete Session button", () => {
      const onNewSession = vi.fn();
      const onDeleteSession = vi.fn();

      render(
        <SessionControls
          currentSessionId="session-1"
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
        />,
      );

      const deleteButton = screen.getByTestId("delete-session-button");
      const style = window.getComputedStyle(deleteButton);

      // Check that color is semantic.critical (#B89B94)
      expect(style.color).toBe("#B89B94");
    });
  });
});
