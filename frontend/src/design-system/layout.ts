/**
 * Iubar Design System - Layout & Spacing Tokens
 *
 * Based on 8px base unit system from visual-identity.md
 * Provides consistent spacing, grid, and layout primitives
 *
 * @see .kiro/documentation/project-docs/visual-identity.md Section IV
 */

// =============================================================================
// SPACING SCALE (8px base unit)
// =============================================================================

/**
 * Spacing scale in pixels
 */
export const spacing = {
  /** 4px - Micro-spacing within components */
  xs: 4,
  /** 8px - Component padding, icon spacing */
  sm: 8,
  /** 16px - Section padding, between elements */
  md: 16,
  /** 24px - Larger sections, spacing between major zones */
  lg: 24,
  /** 32px - Page margins, panel padding */
  xl: 32,
  /** 48px - Page-level margins, major layout breaks */
  "2xl": 48,
  /** 64px - Desktop margins, hero spacing */
  "3xl": 64,
} as const;

/**
 * Tailwind-compatible spacing classes
 */
export const spacingClasses = {
  xs: "4",
  sm: "8",
  md: "16",
  lg: "24",
  xl: "32",
  "2xl": "48",
  "3xl": "64",
} as const;

// =============================================================================
// LAYOUT DIMENSIONS
// =============================================================================

/**
 * Split-pane layout dimensions (from visual-identity.md)
 */
export const splitPane = {
  /** Default document pane width (70%) */
  documentDefault: 70,
  /** Default chat pane width (30%) */
  chatDefault: 30,
  /** Minimum document pane width (40%) */
  documentMin: 40,
  /** Minimum chat pane width (20%) */
  chatMin: 20,
} as const;

/**
 * Document viewer dimensions
 */
export const documentViewer = {
  /** Max width for optimal reading (800px) */
  maxWidth: 800,
  /** Left/right margin (64px) */
  horizontalMargin: spacing["3xl"],
  /** Top/bottom padding (64px) */
  verticalPadding: spacing["3xl"],
} as const;

/**
 * Chat interface dimensions
 */
export const chatInterface = {
  /** Padding on all sides (24px) */
  padding: spacing.lg,
} as const;

// =============================================================================
// GRID SYSTEM
// =============================================================================

/**
 * Grid gap values
 */
export const gridGap = {
  /** Small gap (8px) */
  sm: spacing.sm,
  /** Medium gap (16px) */
  md: spacing.md,
  /** Large gap (24px) */
  lg: spacing.lg,
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

/**
 * Border radius values
 */
export const borderRadius = {
  /** Small radius (2px) - for focus indicators */
  sm: 2,
  /** Default radius (3px) - for inline code */
  default: 3,
  /** Medium radius (6px) - for buttons */
  md: 6,
  /** Large radius (8px) - for cards, messages */
  lg: 8,
} as const;

/**
 * Tailwind-compatible border radius classes
 */
export const borderRadiusClasses = {
  sm: "rounded-sm",
  default: "rounded",
  md: "rounded-md",
  lg: "rounded-lg",
} as const;

// =============================================================================
// Z-INDEX LAYERS
// =============================================================================

/**
 * Z-index layering system
 */
export const zIndex = {
  /** Base content layer */
  base: 0,
  /** Dropdowns, tooltips */
  dropdown: 10,
  /** Sticky headers */
  sticky: 20,
  /** Modals, overlays */
  modal: 30,
  /** Toasts, notifications */
  toast: 40,
  /** Focus caret (should be above content) */
  focusCaret: 5,
} as const;

// =============================================================================
// COMPOSITE LAYOUT UTILITIES
// =============================================================================

/**
 * Common padding combinations
 */
export const padding = {
  /** Card/message padding (16px 20px) */
  card: `${spacing.md}px ${spacing.lg}px`,
  /** Panel padding (24px all sides) */
  panel: `${spacing.lg}px`,
  /** Input padding (12px 16px) */
  input: `12px ${spacing.md}px`,
  /** Button padding (12px 24px) */
  button: `12px ${spacing.lg}px`,
} as const;

/**
 * Tailwind padding classes
 */
export const paddingClasses = {
  card: "px-5 py-4", // 20px horizontal, 16px vertical
  panel: "p-6", // 24px all sides
  input: "px-4 py-3", // 16px horizontal, 12px vertical
  button: "px-6 py-3", // 24px horizontal, 12px vertical
} as const;

// =============================================================================
// RESPONSIVE BREAKPOINTS
// =============================================================================

/**
 * Responsive breakpoints (for future use)
 * MVP is desktop-only, but planning ahead
 */
export const breakpoints = {
  /** Mobile (not supported in MVP) */
  mobile: 640,
  /** Tablet (not supported in MVP) */
  tablet: 768,
  /** Desktop (primary target) */
  desktop: 1024,
  /** Large desktop */
  desktopLg: 1280,
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;
export type ZIndexKey = keyof typeof zIndex;
