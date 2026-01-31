/**
 * Iubar Design System - Color Tokens
 *
 * Based on the "Night-to-Day" visual identity:
 * - Deep blue backgrounds (night) with warm golden accents (dawn/knowledge)
 * - All colors pass WCAG 2.1 AA contrast requirements
 *
 * @see .kiro/documentation/project-docs/visual-identity.md
 */

// =============================================================================
// CORE PALETTE
// =============================================================================

/**
 * Background colors - Night-to-day progression
 */
export const backgrounds = {
  /** Canvas background - deep rich night blue (#131D33) */
  canvas: "#131D33",
  /** Primary surfaces - night blue (#1B2844) */
  panel: "#1B2844",
  /** Hover states, depth - pre-dawn blue (#253550) */
  hover: "#253550",
  /** Focus, selected states - dawn blue (#314662) */
  active: "#314662",
} as const;

/**
 * Text colors - Warm light metaphor
 */
export const text = {
  /** Primary body text - warm cream (#E8E1D5) */
  primary: "#E8E1D5",
  /** Secondary text, labels - warm taupe (#B8AFA0) */
  secondary: "#B8AFA0",
  /** Disabled, muted text - dark taupe (#6B6660) */
  disabled: "#6B6660",
} as const;

/**
 * Accent colors - Golden amber (knowledge/illumination)
 */
export const accents = {
  /** Focus indicator, highlights - golden amber (#D4A574) */
  highlight: "#D4A574",
  /** Hover states, secondary emphasis - muted gold (#B8945F) */
  muted: "#B8945F",
  /** Deep accents, rarely used (#9D7A47) */
  deep: "#9D7A47",
} as const;

/**
 * Semantic colors - Pastel, warm-toned
 */
export const semantic = {
  /** Success, progress - soft warm green (#A8C59F) */
  success: "#A8C59F",
  /** Warnings, attention - warm amber (#C9A876) */
  caution: "#C9A876",
  /** Errors - warm mauve, gentle not harsh (#B89B94) */
  critical: "#B89B94",
  /** Info, primary actions - soft blue (#6B9BD1) */
  info: "#6B9BD1",
  /** Error (alias for critical) */
  error: "#B89B94",
} as const;

// =============================================================================
// TAILWIND CLASS MAPPINGS
// =============================================================================

/**
 * Tailwind-compatible class strings for backgrounds
 */
export const bgClasses = {
  canvas: "bg-[#131D33]",
  panel: "bg-[#1B2844]",
  hover: "bg-[#253550]",
  active: "bg-[#314662]",
} as const;

/**
 * Tailwind-compatible class strings for text colors
 */
export const textClasses = {
  primary: "text-[#E8E1D5]",
  secondary: "text-[#B8AFA0]",
  disabled: "text-[#6B6660]",
} as const;

/**
 * Tailwind-compatible class strings for borders
 */
export const borderClasses = {
  default: "border-[#314662]",
  hover: "border-[#D4A574]",
  active: "border-[#D4A574]",
  disabled: "border-[#253550]",
} as const;

/**
 * Tailwind-compatible class strings for accents
 */
export const accentClasses = {
  highlight: "text-[#D4A574]",
  muted: "text-[#B8945F]",
  ring: "ring-[#D4A574]",
  border: "border-[#D4A574]",
} as const;

/**
 * Tailwind-compatible class strings for semantic states
 */
export const semanticClasses = {
  success: "text-[#A8C59F]",
  successBg: "bg-[#A8C59F]",
  caution: "text-[#C9A876]",
  cautionBg: "bg-[#C9A876]",
  critical: "text-[#B89B94]",
  criticalBg: "bg-[#B89B94]",
} as const;

// =============================================================================
// COMPOSITE STYLES
// =============================================================================

/**
 * Common focus ring style for interactive elements
 */
export const focusRing = "focus:ring-2 focus:ring-[#D4A574] focus:outline-none";

/**
 * Standard transition for color changes (150ms per UX spec)
 */
export const colorTransition = "transition-colors duration-150 ease-out";

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type BackgroundKey = keyof typeof backgrounds;
export type TextKey = keyof typeof text;
export type AccentKey = keyof typeof accents;
export type SemanticKey = keyof typeof semantic;
