/**
 * Iubar Design System - Markdown Styles
 *
 * Based on visual-identity.md Component 3 (Document Viewer)
 * Optimized for reading long-form content
 *
 * @see .kiro/documentation/project-docs/visual-identity.md Section VII
 */

import { backgrounds, text, accents } from "./colors";
import { typography, markdownSpacing, fontFamilies } from "./typography";
import { borderRadius, spacing } from "./layout";

// =============================================================================
// DOCUMENT CONTAINER
// =============================================================================

/**
 * Document viewer container styling
 */
export const documentContainer = {
  /** Max width for optimal reading */
  maxWidth: 800,
  /** Margin (centered) */
  margin: "0 auto",
  /** Padding (top/bottom) */
  padding: `${spacing["3xl"]}px 0`,
  /** Font family */
  fontFamily: fontFamilies.body,
  /** Font size */
  fontSize: typography.body.fontSize,
  /** Line height */
  lineHeight: typography.body.lineHeight,
  /** Letter spacing */
  letterSpacing: typography.body.letterSpacing,
  /** Text color */
  color: text.primary,
} as const;

// =============================================================================
// HEADING STYLES
// =============================================================================

/**
 * H1 styling
 */
export const h1 = {
  fontSize: typography.h1.fontSize,
  fontWeight: typography.h1.fontWeight,
  lineHeight: typography.h1.lineHeight,
  letterSpacing: typography.h1.letterSpacing,
  color: text.primary,
  marginTop: markdownSpacing.h1MarginTop,
  marginBottom: markdownSpacing.h1MarginBottom,
  fontFamily: fontFamilies.heading,
} as const;

/**
 * H2 styling
 */
export const h2 = {
  fontSize: typography.h2.fontSize,
  fontWeight: typography.h2.fontWeight,
  lineHeight: typography.h2.lineHeight,
  letterSpacing: typography.h2.letterSpacing,
  color: text.primary,
  marginTop: markdownSpacing.h2MarginTop,
  marginBottom: markdownSpacing.h2MarginBottom,
  fontFamily: fontFamilies.heading,
} as const;

/**
 * H3 styling
 */
export const h3 = {
  fontSize: typography.h3.fontSize,
  fontWeight: typography.h3.fontWeight,
  lineHeight: typography.h3.lineHeight,
  letterSpacing: typography.h3.letterSpacing,
  color: text.secondary,
  marginTop: markdownSpacing.h3MarginTop,
  marginBottom: markdownSpacing.h3MarginBottom,
  fontFamily: fontFamilies.heading,
} as const;

// =============================================================================
// BODY TEXT STYLES
// =============================================================================

/**
 * Paragraph styling
 */
export const paragraph = {
  color: `${text.primary}e6`, // 90% opacity
  lineHeight: typography.body.lineHeight,
  letterSpacing: typography.body.letterSpacing,
  marginBottom: markdownSpacing.paragraphSpacing,
} as const;

/**
 * Strong/bold text
 */
export const strong = {
  fontWeight: 600,
  color: text.primary,
} as const;

/**
 * Emphasis/italic text
 */
export const emphasis = {
  fontStyle: "italic",
} as const;

// =============================================================================
// CODE STYLES
// =============================================================================

/**
 * Inline code styling
 */
export const inlineCode = {
  background: backgrounds.hover,
  color: text.primary,
  padding: "2px 6px",
  borderRadius: borderRadius.default,
  fontFamily: fontFamilies.mono,
  fontSize: typography.code.fontSize,
} as const;

/**
 * Code block styling
 */
export const codeBlock = {
  background: backgrounds.panel,
  color: text.primary,
  padding: spacing.md,
  borderLeft: `4px solid ${accents.highlight}`,
  borderRadius: borderRadius.default,
  fontFamily: fontFamilies.mono,
  fontSize: typography.codeBlock.fontSize,
  lineHeight: typography.codeBlock.lineHeight,
  overflowX: "auto" as const,
  marginBottom: markdownSpacing.paragraphSpacing,
} as const;

// =============================================================================
// LINK STYLES
// =============================================================================

/**
 * Link styling
 */
export const link = {
  color: accents.highlight,
  textDecoration: "none",
  transition: "all 150ms ease-out",
  /** Hover state */
  hover: {
    textDecoration: "underline",
  },
} as const;

// =============================================================================
// LIST STYLES
// =============================================================================

/**
 * Unordered list styling
 */
export const ul = {
  marginBottom: markdownSpacing.paragraphSpacing,
  paddingLeft: spacing.lg,
  listStyleType: "disc" as const,
} as const;

/**
 * Ordered list styling
 */
export const ol = {
  marginBottom: markdownSpacing.paragraphSpacing,
  paddingLeft: spacing.lg,
  listStyleType: "decimal" as const,
} as const;

/**
 * List item styling
 */
export const li = {
  marginBottom: spacing.sm,
  color: `${text.primary}e6`, // 90% opacity
  lineHeight: typography.body.lineHeight,
} as const;

// =============================================================================
// BLOCKQUOTE STYLES
// =============================================================================

/**
 * Blockquote styling
 */
export const blockquote = {
  borderLeft: `4px solid ${accents.muted}`,
  paddingLeft: spacing.lg,
  marginLeft: 0,
  marginBottom: markdownSpacing.paragraphSpacing,
  color: text.secondary,
  fontStyle: "italic",
} as const;

// =============================================================================
// TABLE STYLES
// =============================================================================

/**
 * Table styling
 */
export const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
  marginBottom: markdownSpacing.paragraphSpacing,
} as const;

/**
 * Table header styling
 */
export const th = {
  background: backgrounds.hover,
  color: text.primary,
  padding: `${spacing.sm}px ${spacing.md}px`,
  textAlign: "left" as const,
  fontWeight: 600,
  borderBottom: `2px solid ${backgrounds.active}`,
} as const;

/**
 * Table cell styling
 */
export const td = {
  padding: `${spacing.sm}px ${spacing.md}px`,
  borderBottom: `1px solid ${backgrounds.hover}`,
  color: `${text.primary}e6`, // 90% opacity
} as const;

// =============================================================================
// HORIZONTAL RULE
// =============================================================================

/**
 * Horizontal rule styling
 */
export const hr = {
  border: "none",
  borderTop: `1px solid ${backgrounds.hover}`,
  marginTop: spacing.xl,
  marginBottom: spacing.xl,
} as const;

// =============================================================================
// TAILWIND CLASS MAPPINGS
// =============================================================================

/**
 * Tailwind classes for markdown elements
 */
export const markdownClasses = {
  container:
    "max-w-[800px] mx-auto py-16 font-serif text-lg leading-relaxed tracking-wide text-[#E8E1D5]",
  h1: "text-[42px] font-semibold leading-tight tracking-tight text-[#E8E1D5] mt-12 mb-6 font-sans",
  h2: "text-[32px] font-medium leading-tight tracking-tight text-[#E8E1D5] mt-10 mb-5 font-sans",
  h3: "text-2xl font-medium leading-snug text-[#B8AFA0] mt-8 mb-4 font-sans",
  p: "text-[#E8E1D5]/90 leading-relaxed tracking-wide mb-6",
  strong: "font-semibold text-[#E8E1D5]",
  em: "italic",
  code: "bg-[#253550] text-[#E8E1D5] px-1.5 py-0.5 rounded font-mono text-base",
  pre: "bg-[#1B2844] text-[#E8E1D5] p-4 border-l-4 border-[#D4A574] rounded font-mono text-sm leading-normal overflow-x-auto mb-6",
  a: "text-[#D4A574] no-underline transition-all duration-150 hover:underline",
  ul: "mb-6 pl-6 list-disc",
  ol: "mb-6 pl-6 list-decimal",
  li: "mb-2 text-[#E8E1D5]/90 leading-relaxed",
  blockquote:
    "border-l-4 border-[#B8945F] pl-6 ml-0 mb-6 text-[#B8AFA0] italic",
  table: "w-full border-collapse mb-6",
  th: "bg-[#253550] text-[#E8E1D5] px-4 py-2 text-left font-semibold border-b-2 border-[#314662]",
  td: "px-4 py-2 border-b border-[#253550] text-[#E8E1D5]/90",
  hr: "border-none border-t border-[#253550] my-8",
} as const;

// =============================================================================
// CSS-IN-JS STYLES
// =============================================================================

/**
 * Complete CSS-in-JS object for markdown rendering
 */
export const markdownStyles = {
  ".markdown-container": {
    maxWidth: `${documentContainer.maxWidth}px`,
    margin: documentContainer.margin,
    padding: documentContainer.padding,
    fontFamily: documentContainer.fontFamily,
    fontSize: `${documentContainer.fontSize}px`,
    lineHeight: documentContainer.lineHeight,
    letterSpacing: documentContainer.letterSpacing,
    color: documentContainer.color,
  },
  ".markdown-container h1": {
    fontSize: `${h1.fontSize}px`,
    fontWeight: h1.fontWeight,
    lineHeight: h1.lineHeight,
    letterSpacing: h1.letterSpacing,
    color: h1.color,
    marginTop: `${h1.marginTop}px`,
    marginBottom: `${h1.marginBottom}px`,
    fontFamily: h1.fontFamily,
  },
  ".markdown-container h2": {
    fontSize: `${h2.fontSize}px`,
    fontWeight: h2.fontWeight,
    lineHeight: h2.lineHeight,
    letterSpacing: h2.letterSpacing,
    color: h2.color,
    marginTop: `${h2.marginTop}px`,
    marginBottom: `${h2.marginBottom}px`,
    fontFamily: h2.fontFamily,
  },
  ".markdown-container h3": {
    fontSize: `${h3.fontSize}px`,
    fontWeight: h3.fontWeight,
    lineHeight: h3.lineHeight,
    letterSpacing: h3.letterSpacing,
    color: h3.color,
    marginTop: `${h3.marginTop}px`,
    marginBottom: `${h3.marginBottom}px`,
    fontFamily: h3.fontFamily,
  },
  ".markdown-container p": {
    color: paragraph.color,
    lineHeight: paragraph.lineHeight,
    letterSpacing: paragraph.letterSpacing,
    marginBottom: `${paragraph.marginBottom}px`,
  },
  ".markdown-container code": {
    backgroundColor: inlineCode.background,
    color: inlineCode.color,
    padding: inlineCode.padding,
    borderRadius: `${inlineCode.borderRadius}px`,
    fontFamily: inlineCode.fontFamily,
    fontSize: `${inlineCode.fontSize}px`,
  },
  ".markdown-container pre": {
    backgroundColor: codeBlock.background,
    color: codeBlock.color,
    padding: `${codeBlock.padding}px`,
    borderLeft: codeBlock.borderLeft,
    borderRadius: `${codeBlock.borderRadius}px`,
    fontFamily: codeBlock.fontFamily,
    fontSize: `${codeBlock.fontSize}px`,
    lineHeight: codeBlock.lineHeight,
    overflowX: codeBlock.overflowX,
    marginBottom: `${codeBlock.marginBottom}px`,
  },
  ".markdown-container a": {
    color: link.color,
    textDecoration: link.textDecoration,
    transition: link.transition,
  },
  ".markdown-container a:hover": {
    textDecoration: link.hover.textDecoration,
  },
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type MarkdownElement =
  | "h1"
  | "h2"
  | "h3"
  | "p"
  | "code"
  | "pre"
  | "a"
  | "ul"
  | "ol"
  | "li"
  | "blockquote"
  | "table"
  | "th"
  | "td"
  | "hr";
