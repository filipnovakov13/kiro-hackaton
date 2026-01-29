/**
 * Iubar Design System - Typography Tokens
 *
 * Based on visual-identity.md Section III
 * Generous typography scale optimized for reading and learning
 *
 * @see .kiro/documentation/project-docs/visual-identity.md Section III
 */

// =============================================================================
// FONT FAMILIES
// =============================================================================

/**
 * Font family definitions
 */
export const fontFamilies = {
  /** Headings & Navigation - Inter Variable (400-700) */
  heading: '"Inter Variable", "Inter", system-ui, -apple-system, sans-serif',
  /** Body & Document Text - iA Writer Quattro or Merriweather */
  body: '"iA Writer Quattro", "Merriweather", Georgia, serif',
  /** Code/Technical - JetBrains Mono */
  mono: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
} as const;

// =============================================================================
// FONT SCALES
// =============================================================================

/**
 * Typography scale with size, weight, line-height, and letter-spacing
 */
export const typography = {
  h1: {
    fontSize: 42,
    fontWeight: 600, // Semibold
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
    fontFamily: fontFamilies.heading,
  },
  h2: {
    fontSize: 32,
    fontWeight: 500, // Medium
    lineHeight: 1.25,
    letterSpacing: "-0.01em",
    fontFamily: fontFamilies.heading,
  },
  h3: {
    fontSize: 24,
    fontWeight: 500, // Medium
    lineHeight: 1.3,
    letterSpacing: "0em",
    fontFamily: fontFamilies.heading,
  },
  h4: {
    fontSize: 18,
    fontWeight: 500, // Medium
    lineHeight: 1.4,
    letterSpacing: "0em",
    fontFamily: fontFamilies.heading,
  },
  body: {
    fontSize: 18,
    fontWeight: 400, // Regular
    lineHeight: 1.7,
    letterSpacing: "0.02em",
    fontFamily: fontFamilies.body,
  },
  small: {
    fontSize: 14,
    fontWeight: 400, // Regular
    lineHeight: 1.6,
    letterSpacing: "0em",
    fontFamily: fontFamilies.body,
  },
  caption: {
    fontSize: 12,
    fontWeight: 400, // Regular
    lineHeight: 1.5,
    letterSpacing: "0.01em",
    fontFamily: fontFamilies.body,
  },
  code: {
    fontSize: 16,
    fontWeight: 400, // Regular
    lineHeight: 1.5,
    letterSpacing: "0em",
    fontFamily: fontFamilies.mono,
  },
  codeBlock: {
    fontSize: 14,
    fontWeight: 400, // Regular
    lineHeight: 1.6,
    letterSpacing: "0em",
    fontFamily: fontFamilies.mono,
  },
} as const;

// =============================================================================
// TAILWIND CLASS MAPPINGS
// =============================================================================

/**
 * Tailwind-compatible typography classes
 */
export const typographyClasses = {
  h1: "text-[42px] font-semibold leading-tight tracking-tight",
  h2: "text-[32px] font-medium leading-tight tracking-tight",
  h3: "text-2xl font-medium leading-snug",
  h4: "text-lg font-medium leading-normal",
  body: "text-lg font-normal leading-relaxed tracking-wide",
  small: "text-sm font-normal leading-normal",
  caption: "text-xs font-normal leading-snug tracking-wide",
  code: "text-base font-normal font-mono",
  codeBlock: "text-sm font-normal font-mono leading-normal",
} as const;

/**
 * Font family classes
 */
export const fontFamilyClasses = {
  heading: "font-sans",
  body: "font-serif",
  mono: "font-mono",
} as const;

// =============================================================================
// FONT WEIGHTS
// =============================================================================

/**
 * Font weight values
 */
export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * Tailwind font weight classes
 */
export const fontWeightClasses = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
} as const;

// =============================================================================
// LINE HEIGHTS
// =============================================================================

/**
 * Line height values
 */
export const lineHeights = {
  tight: 1.2,
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.7,
} as const;

// =============================================================================
// COMPOSITE STYLES
// =============================================================================

/**
 * CSS-in-JS style objects for common typography patterns
 */
export const typographyStyles = {
  h1: {
    fontFamily: typography.h1.fontFamily,
    fontSize: `${typography.h1.fontSize}px`,
    fontWeight: typography.h1.fontWeight,
    lineHeight: typography.h1.lineHeight,
    letterSpacing: typography.h1.letterSpacing,
  },
  h2: {
    fontFamily: typography.h2.fontFamily,
    fontSize: `${typography.h2.fontSize}px`,
    fontWeight: typography.h2.fontWeight,
    lineHeight: typography.h2.lineHeight,
    letterSpacing: typography.h2.letterSpacing,
  },
  h3: {
    fontFamily: typography.h3.fontFamily,
    fontSize: `${typography.h3.fontSize}px`,
    fontWeight: typography.h3.fontWeight,
    lineHeight: typography.h3.lineHeight,
    letterSpacing: typography.h3.letterSpacing,
  },
  body: {
    fontFamily: typography.body.fontFamily,
    fontSize: `${typography.body.fontSize}px`,
    fontWeight: typography.body.fontWeight,
    lineHeight: typography.body.lineHeight,
    letterSpacing: typography.body.letterSpacing,
  },
  code: {
    fontFamily: typography.code.fontFamily,
    fontSize: `${typography.code.fontSize}px`,
    fontWeight: typography.code.fontWeight,
    lineHeight: typography.code.lineHeight,
    letterSpacing: typography.code.letterSpacing,
  },
} as const;

// =============================================================================
// MARKDOWN-SPECIFIC STYLES
// =============================================================================

/**
 * Spacing for markdown elements (from visual-identity.md)
 */
export const markdownSpacing = {
  /** H1 margin-top */
  h1MarginTop: 48,
  /** H1 margin-bottom */
  h1MarginBottom: 24,
  /** H2 margin-top */
  h2MarginTop: 40,
  /** H2 margin-bottom */
  h2MarginBottom: 20,
  /** H3 margin-top */
  h3MarginTop: 32,
  /** H3 margin-bottom */
  h3MarginBottom: 16,
  /** Paragraph spacing */
  paragraphSpacing: 24,
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type TypographyKey = keyof typeof typography;
export type FontFamilyKey = keyof typeof fontFamilies;
export type FontWeightKey = keyof typeof fontWeights;
