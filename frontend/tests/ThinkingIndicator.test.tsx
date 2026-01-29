/**
 * ThinkingIndicator Component Tests
 *
 * Test coverage:
 * - Rendering with default props
 * - Custom message display
 * - Size variants (small, medium, large)
 * - Animation presence
 * - Design system token usage
 * - Accessibility
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThinkingIndicator } from "../src/components/chat/ThinkingIndicator";

describe("ThinkingIndicator", () => {
  // =============================================================================
  // RENDERING TESTS
  // =============================================================================

  describe("Rendering", () => {
    it("should render with default props", () => {
      render(<ThinkingIndicator />);
      expect(screen.getByTestId("thinking-indicator")).toBeInTheDocument();
    });

    it("should render default message", () => {
      render(<ThinkingIndicator />);
      expect(screen.getByTestId("thinking-message")).toHaveTextContent(
        "Thinking...",
      );
    });

    it("should render custom message", () => {
      render(<ThinkingIndicator message="Processing your request..." />);
      expect(screen.getByTestId("thinking-message")).toHaveTextContent(
        "Processing your request...",
      );
    });

    it("should render three glow dots", () => {
      render(<ThinkingIndicator />);
      expect(screen.getByTestId("glow-dot-1")).toBeInTheDocument();
      expect(screen.getByTestId("glow-dot-2")).toBeInTheDocument();
      expect(screen.getByTestId("glow-dot-3")).toBeInTheDocument();
    });

    it("should not render message when empty string provided", () => {
      render(<ThinkingIndicator message="" />);
      expect(screen.queryByTestId("thinking-message")).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // SIZE VARIANT TESTS
  // =============================================================================

  describe("Size Variants", () => {
    it("should render small size variant", () => {
      render(<ThinkingIndicator size="small" />);
      const dot = screen.getByTestId("glow-dot-1");
      expect(dot).toHaveStyle({ width: "8px", height: "8px" });
    });

    it("should render medium size variant (default)", () => {
      render(<ThinkingIndicator size="medium" />);
      const dot = screen.getByTestId("glow-dot-1");
      expect(dot).toHaveStyle({ width: "12px", height: "12px" });
    });

    it("should render large size variant", () => {
      render(<ThinkingIndicator size="large" />);
      const dot = screen.getByTestId("glow-dot-1");
      expect(dot).toHaveStyle({ width: "16px", height: "16px" });
    });

    it("should apply correct font size for small variant", () => {
      render(<ThinkingIndicator size="small" message="Test" />);
      const message = screen.getByTestId("thinking-message");
      expect(message).toHaveStyle({ fontSize: "12px" });
    });

    it("should apply correct font size for medium variant", () => {
      render(<ThinkingIndicator size="medium" message="Test" />);
      const message = screen.getByTestId("thinking-message");
      expect(message).toHaveStyle({ fontSize: "14px" });
    });

    it("should apply correct font size for large variant", () => {
      render(<ThinkingIndicator size="large" message="Test" />);
      const message = screen.getByTestId("thinking-message");
      expect(message).toHaveStyle({ fontSize: "16px" });
    });
  });

  // =============================================================================
  // ANIMATION TESTS
  // =============================================================================

  describe("Animation", () => {
    it("should apply animation to all glow dots", () => {
      render(<ThinkingIndicator />);
      const dot1 = screen.getByTestId("glow-dot-1");
      const dot2 = screen.getByTestId("glow-dot-2");
      const dot3 = screen.getByTestId("glow-dot-3");

      expect(dot1).toHaveStyle({
        animation: "thinkingPulse 1.5s ease-in-out infinite",
      });
      expect(dot2).toHaveStyle({
        animation: "thinkingPulse 1.5s ease-in-out infinite",
      });
      expect(dot3).toHaveStyle({
        animation: "thinkingPulse 1.5s ease-in-out infinite",
      });
    });

    it("should apply staggered animation delays", () => {
      render(<ThinkingIndicator />);
      const dot1 = screen.getByTestId("glow-dot-1");
      const dot2 = screen.getByTestId("glow-dot-2");
      const dot3 = screen.getByTestId("glow-dot-3");

      expect(dot1).toHaveStyle({ animationDelay: "0s" });
      expect(dot2).toHaveStyle({ animationDelay: "0.2s" });
      expect(dot3).toHaveStyle({ animationDelay: "0.4s" });
    });

    it("should inject keyframe animation styles", () => {
      const { container } = render(<ThinkingIndicator />);
      const styleTag = container.querySelector("style");
      expect(styleTag).toBeInTheDocument();
      expect(styleTag?.textContent).toContain("@keyframes thinkingPulse");
      expect(styleTag?.textContent).toContain("opacity: 0.5");
      expect(styleTag?.textContent).toContain("opacity: 1");
    });
  });

  // =============================================================================
  // STYLING TESTS
  // =============================================================================

  describe("Styling", () => {
    it("should apply circular shape to glow dots", () => {
      render(<ThinkingIndicator />);
      const dot = screen.getByTestId("glow-dot-1");
      expect(dot).toHaveStyle({ borderRadius: "50%" });
    });

    it("should apply box shadow to glow dots", () => {
      render(<ThinkingIndicator />);
      const dot = screen.getByTestId("glow-dot-1");
      const styles = window.getComputedStyle(dot);
      expect(styles.boxShadow).toBeTruthy();
    });

    it("should apply italic style to message", () => {
      render(<ThinkingIndicator message="Test" />);
      const message = screen.getByTestId("thinking-message");
      expect(message).toHaveStyle({ fontStyle: "italic" });
    });

    it("should use flexbox layout", () => {
      render(<ThinkingIndicator />);
      const container = screen.getByTestId("thinking-indicator");
      expect(container).toHaveStyle({ display: "flex", alignItems: "center" });
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================

  describe("Accessibility", () => {
    it("should have testid for container", () => {
      render(<ThinkingIndicator />);
      expect(screen.getByTestId("thinking-indicator")).toBeInTheDocument();
    });

    it("should have testids for all glow dots", () => {
      render(<ThinkingIndicator />);
      expect(screen.getByTestId("glow-dot-1")).toBeInTheDocument();
      expect(screen.getByTestId("glow-dot-2")).toBeInTheDocument();
      expect(screen.getByTestId("glow-dot-3")).toBeInTheDocument();
    });

    it("should have testid for message when present", () => {
      render(<ThinkingIndicator message="Test" />);
      expect(screen.getByTestId("thinking-message")).toBeInTheDocument();
    });
  });

  // =============================================================================
  // INTEGRATION TESTS
  // =============================================================================

  describe("Integration", () => {
    it("should render correctly with all props", () => {
      render(
        <ThinkingIndicator size="large" message="Analyzing document..." />,
      );

      expect(screen.getByTestId("thinking-indicator")).toBeInTheDocument();
      expect(screen.getByTestId("thinking-message")).toHaveTextContent(
        "Analyzing document...",
      );
      expect(screen.getByTestId("glow-dot-1")).toHaveStyle({
        width: "16px",
        height: "16px",
      });
    });

    it("should maintain structure with minimal props", () => {
      render(<ThinkingIndicator message="" />);

      expect(screen.getByTestId("thinking-indicator")).toBeInTheDocument();
      expect(screen.getByTestId("glow-dot-1")).toBeInTheDocument();
      expect(screen.getByTestId("glow-dot-2")).toBeInTheDocument();
      expect(screen.getByTestId("glow-dot-3")).toBeInTheDocument();
      expect(screen.queryByTestId("thinking-message")).not.toBeInTheDocument();
    });
  });
});
