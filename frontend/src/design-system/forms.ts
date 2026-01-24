/**
 * Iubar Design System - Form Input Styles
 *
 * Based on visual-identity.md Component 4 (Upload Area)
 * Consistent styling for inputs, buttons, and form elements
 *
 * @see .kiro/documentation/project-docs/visual-identity.md Section VII
 */

import { backgrounds, accents, text } from "./colors";
import { spacing, borderRadius, padding } from "./layout";
import { transitions } from "./animations";

// =============================================================================
// INPUT STYLES
// =============================================================================

/**
 * Text input styling
 */
export const input = {
  /** Background color */
  background: backgrounds.panel,
  /** Border color (default) */
  border: backgrounds.hover,
  /** Border color (focus) */
  borderFocus: accents.highlight,
  /** Text color */
  textColor: text.primary,
  /** Padding */
  padding: padding.input,
  /** Border radius */
  borderRadius: borderRadius.md,
  /** Font size */
  fontSize: 16,
  /** Transition */
  transition: transitions.fast,
} as const;

/**
 * Tailwind classes for text input
 */
export const inputClasses = {
  base: `
    bg-[${backgrounds.panel}]
    border border-[${backgrounds.hover}]
    text-[${text.primary}]
    px-4 py-3
    rounded-md
    transition-all duration-150 ease-out
    focus:border-[${accents.highlight}]
    focus:outline-none
    focus:ring-2 focus:ring-[${accents.highlight}]/20
    placeholder:text-[${text.secondary}]
    disabled:opacity-50 disabled:cursor-not-allowed
  `
    .trim()
    .replace(/\s+/g, " "),
  error: `border-[#B89B94] focus:border-[#B89B94] focus:ring-[#B89B94]/20`,
} as const;

// =============================================================================
// BUTTON STYLES
// =============================================================================

/**
 * Primary button (CTA) styling
 */
export const buttonPrimary = {
  /** Background color */
  background: accents.highlight,
  /** Background color (hover) */
  backgroundHover: accents.muted,
  /** Background color (active) */
  backgroundActive: accents.deep,
  /** Text color */
  textColor: backgrounds.canvas,
  /** Padding */
  padding: padding.button,
  /** Border radius */
  borderRadius: borderRadius.md,
  /** Transition */
  transition: transitions.fast,
} as const;

/**
 * Secondary button styling
 */
export const buttonSecondary = {
  /** Background color */
  background: backgrounds.hover,
  /** Background color (hover) */
  backgroundHover: backgrounds.active,
  /** Text color */
  textColor: text.primary,
  /** Padding */
  padding: padding.button,
  /** Border radius */
  borderRadius: borderRadius.md,
  /** Transition */
  transition: transitions.fast,
} as const;

/**
 * Tailwind classes for buttons
 */
export const buttonClasses = {
  primary: `
    bg-[${accents.highlight}]
    text-[${backgrounds.canvas}]
    px-6 py-3
    rounded-md
    font-medium
    transition-all duration-150 ease-out
    hover:bg-[${accents.muted}]
    active:bg-[${accents.deep}]
    focus:outline-none
    focus:ring-2 focus:ring-[${accents.highlight}]
    disabled:opacity-50 disabled:cursor-not-allowed
  `
    .trim()
    .replace(/\s+/g, " "),
  secondary: `
    bg-[${backgrounds.hover}]
    text-[${text.primary}]
    px-6 py-3
    rounded-md
    font-medium
    transition-all duration-150 ease-out
    hover:bg-[${backgrounds.active}]
    focus:outline-none
    focus:ring-2 focus:ring-[${accents.highlight}]
    disabled:opacity-50 disabled:cursor-not-allowed
  `
    .trim()
    .replace(/\s+/g, " "),
  ghost: `
    bg-transparent
    text-[${text.primary}]
    px-6 py-3
    rounded-md
    font-medium
    transition-all duration-150 ease-out
    hover:bg-[${backgrounds.hover}]
    focus:outline-none
    focus:ring-2 focus:ring-[${accents.highlight}]
    disabled:opacity-50 disabled:cursor-not-allowed
  `
    .trim()
    .replace(/\s+/g, " "),
} as const;

// =============================================================================
// TEXTAREA STYLES
// =============================================================================

/**
 * Textarea styling (for message input)
 */
export const textarea = {
  /** Background color */
  background: backgrounds.panel,
  /** Border color (default) */
  border: backgrounds.hover,
  /** Border color (focus) */
  borderFocus: accents.highlight,
  /** Text color */
  textColor: text.primary,
  /** Padding */
  padding: padding.input,
  /** Border radius */
  borderRadius: borderRadius.md,
  /** Font size */
  fontSize: 16,
  /** Line height */
  lineHeight: 1.5,
  /** Min height */
  minHeight: 80,
  /** Max height */
  maxHeight: 200,
  /** Transition */
  transition: transitions.fast,
} as const;

/**
 * Tailwind classes for textarea
 */
export const textareaClasses = {
  base: `
    bg-[${backgrounds.panel}]
    border border-[${backgrounds.hover}]
    text-[${text.primary}]
    px-4 py-3
    rounded-md
    transition-all duration-150 ease-out
    focus:border-[${accents.highlight}]
    focus:outline-none
    focus:ring-2 focus:ring-[${accents.highlight}]/20
    placeholder:text-[${text.secondary}]
    disabled:opacity-50 disabled:cursor-not-allowed
    resize-y
    min-h-[80px]
    max-h-[200px]
  `
    .trim()
    .replace(/\s+/g, " "),
} as const;

// =============================================================================
// CHECKBOX & RADIO STYLES
// =============================================================================

/**
 * Checkbox styling
 */
export const checkbox = {
  /** Size */
  size: 20,
  /** Border color */
  border: backgrounds.hover,
  /** Border color (checked) */
  borderChecked: accents.highlight,
  /** Background color (checked) */
  backgroundChecked: accents.highlight,
  /** Checkmark color */
  checkmarkColor: backgrounds.canvas,
  /** Border radius */
  borderRadius: borderRadius.sm,
} as const;

// =============================================================================
// FORM FIELD WRAPPER
// =============================================================================

/**
 * Form field wrapper styling
 */
export const formField = {
  /** Spacing between label and input */
  labelSpacing: spacing.sm,
  /** Spacing between fields */
  fieldSpacing: spacing.md,
} as const;

/**
 * Label styling
 */
export const label = {
  /** Text color */
  textColor: text.secondary,
  /** Font size */
  fontSize: 14,
  /** Font weight */
  fontWeight: 500,
  /** Margin bottom */
  marginBottom: spacing.sm,
} as const;

/**
 * Tailwind classes for labels
 */
export const labelClasses = {
  base: `
    text-[${text.secondary}]
    text-sm
    font-medium
    mb-2
    block
  `
    .trim()
    .replace(/\s+/g, " "),
} as const;

// =============================================================================
// ERROR & HELPER TEXT
// =============================================================================

/**
 * Error message styling
 */
export const errorMessage = {
  /** Text color */
  textColor: "#B89B94", // semantic.critical
  /** Font size */
  fontSize: 12,
  /** Margin top */
  marginTop: spacing.xs,
} as const;

/**
 * Helper text styling
 */
export const helperText = {
  /** Text color */
  textColor: text.secondary,
  /** Font size */
  fontSize: 12,
  /** Margin top */
  marginTop: spacing.xs,
} as const;

/**
 * Tailwind classes for messages
 */
export const messageClasses = {
  error: `text-[#B89B94] text-xs mt-1`,
  helper: `text-[${text.secondary}] text-xs mt-1`,
} as const;

// =============================================================================
// DROP ZONE STYLES (for file upload)
// =============================================================================

/**
 * Drop zone styling
 */
export const dropZone = {
  /** Border style */
  border: `2px dashed ${backgrounds.active}`,
  /** Border style (hover) */
  borderHover: `2px dashed ${accents.highlight}`,
  /** Background */
  background: backgrounds.canvas,
  /** Background (hover) */
  backgroundHover: backgrounds.panel,
  /** Padding */
  padding: spacing["2xl"],
  /** Border radius */
  borderRadius: borderRadius.lg,
  /** Transition */
  transition: transitions.base,
} as const;

/**
 * Tailwind classes for drop zone
 */
export const dropZoneClasses = {
  base: `
    border-2 border-dashed border-[${backgrounds.active}]
    bg-[${backgrounds.canvas}]
    p-12
    rounded-lg
    transition-all duration-200 ease-out
    hover:border-[${accents.highlight}]
    hover:bg-[${backgrounds.panel}]
    cursor-pointer
  `
    .trim()
    .replace(/\s+/g, " "),
  active: `border-[${accents.highlight}] bg-[${backgrounds.panel}]`,
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ButtonVariant = "primary" | "secondary" | "ghost";
