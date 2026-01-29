/**
 * Iubar Design System - Animation & Motion Tokens
 *
 * Based on visual-identity.md Section VI
 * Tactical timing: slow for AI/thinking, fast for user input
 *
 * @see .kiro/documentation/project-docs/visual-identity.md Section VI
 */

// =============================================================================
// DURATION SCALE
// =============================================================================

/**
 * Animation durations in milliseconds
 */
export const durations = {
  /** Fast - User input actions (100-150ms) */
  fast: 150,
  /** Base - Reveal/disclosure (200-400ms) */
  base: 300,
  /** Slow - AI/thinking actions (300-600ms) */
  slow: 600,
  /** Focus indicator entry (200ms) */
  focusEntry: 200,
  /** Focus indicator exit (150ms) */
  focusExit: 150,
  /** Thinking indicator cycle (2500ms) */
  thinkingCycle: 2500,
  /** Modal reveal (300ms) */
  modalReveal: 300,
} as const;

// =============================================================================
// EASING FUNCTIONS
// =============================================================================

/**
 * Cubic bezier easing functions
 */
export const easings = {
  /** Ease out quart - for focus indicators, graceful reveals */
  easeOutQuart: "cubic-bezier(0.4, 0, 0.2, 1)",
  /** Ease out expo - for hover states */
  easeOutExpo: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  /** Ease in-out sine - for AI thinking pulse */
  easeInOutSine: "cubic-bezier(0.45, 0.05, 0.55, 0.95)",
  /** Ease out back - for modal with subtle bounce */
  easeOutBack: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  /** Linear - for fades, RSVP mode */
  linear: "linear",
} as const;

// =============================================================================
// FOCUS INDICATOR ANIMATIONS
// =============================================================================

/**
 * Focus indicator (letter-level glow) animation
 */
export const focusIndicator = {
  /** Entry animation duration */
  entryDuration: durations.focusEntry,
  /** Exit animation duration */
  exitDuration: durations.focusExit,
  /** Entry easing */
  entryEasing: easings.easeOutQuart,
  /** Exit easing */
  exitEasing: easings.easeOutQuart,
  /** Glow color */
  glowColor: "rgba(212, 165, 116, 0.5)",
  /** Blur radius */
  blurRadius: 2,
  /** Spread */
  spread: 1,
  /** Pulse cycle (optional, for active state) */
  pulseDuration: 2000,
  /** Pulse easing */
  pulseEasing: easings.easeInOutSine,
} as const;

/**
 * CSS keyframes for focus indicator
 */
export const focusIndicatorKeyframes = `
@keyframes letterGlow {
  from {
    opacity: 0;
    box-shadow: 0 0 0px rgba(212, 165, 116, 0);
  }
  to {
    opacity: 1;
    box-shadow: 0 0 2px rgba(212, 165, 116, 0.5),
                0 0 4px rgba(212, 165, 116, 0.25);
  }
}

@keyframes letterGlowPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}
`;

// =============================================================================
// THINKING INDICATOR ANIMATIONS
// =============================================================================

/**
 * Thinking indicator (pulsing glow) animation
 */
export const thinkingIndicator = {
  /** Cycle duration (2.5s) */
  cycleDuration: durations.thinkingCycle,
  /** Easing */
  easing: easings.easeInOutSine,
  /** Background pulse colors */
  colorFrom: "#1B2844",
  colorMid: "#253550",
  colorTo: "#1B2844",
  /** Opacity range for glow */
  opacityMin: 0.5,
  opacityMax: 1.0,
} as const;

/**
 * CSS keyframes for thinking indicator
 */
export const thinkingIndicatorKeyframes = `
@keyframes aiThinking {
  0%, 100% {
    background-color: #1B2844;
  }
  50% {
    background-color: #253550;
  }
}

@keyframes glowPulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1.0;
  }
}
`;

// =============================================================================
// HOVER STATE ANIMATIONS
// =============================================================================

/**
 * Hover state animation
 */
export const hoverState = {
  /** Duration */
  duration: durations.fast,
  /** Easing */
  easing: easings.easeOutExpo,
  /** Shadow on hover */
  shadow: "0 2px 8px rgba(212, 165, 116, 0.1)",
} as const;

// =============================================================================
// MODAL/OVERLAY ANIMATIONS
// =============================================================================

/**
 * Modal reveal animation
 */
export const modalReveal = {
  /** Duration */
  duration: durations.modalReveal,
  /** Background darken */
  backdropFrom: "rgba(0, 0, 0, 0)",
  backdropTo: "rgba(0, 0, 0, 0.4)",
  /** Modal scale */
  scaleFrom: 0.95,
  scaleTo: 1.0,
  /** Easing */
  easing: easings.easeOutBack,
} as const;

/**
 * CSS keyframes for modal
 */
export const modalKeyframes = `
@keyframes modalBackdrop {
  from {
    background-color: rgba(0, 0, 0, 0);
  }
  to {
    background-color: rgba(0, 0, 0, 0.4);
  }
}

@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1.0);
  }
}
`;

// =============================================================================
// STREAMING MESSAGE ANIMATIONS
// =============================================================================

/**
 * Streaming message token appearance
 */
export const streamingMessage = {
  /** Stagger between words */
  stagger: 50,
  /** Fade-in per word */
  fadeInDuration: 150,
  /** Easing */
  easing: easings.easeOutQuart,
} as const;

// =============================================================================
// TRANSITION UTILITIES
// =============================================================================

/**
 * Common transition strings
 */
export const transitions = {
  /** Fast transition for user input */
  fast: `all ${durations.fast}ms ${easings.easeOutQuart}`,
  /** Base transition for reveals */
  base: `all ${durations.base}ms ${easings.easeOutQuart}`,
  /** Slow transition for AI actions */
  slow: `all ${durations.slow}ms ${easings.easeInOutSine}`,
  /** Color transition only */
  colors: `color ${durations.fast}ms ${easings.easeOutQuart}, background-color ${durations.fast}ms ${easings.easeOutQuart}`,
  /** Opacity transition */
  opacity: `opacity ${durations.base}ms ${easings.linear}`,
  /** Transform transition */
  transform: `transform ${durations.base}ms ${easings.easeOutQuart}`,
} as const;

/**
 * Tailwind transition classes
 */
export const transitionClasses = {
  fast: "transition-all duration-150 ease-out",
  base: "transition-all duration-300 ease-out",
  slow: "transition-all duration-600 ease-in-out",
  colors: "transition-colors duration-150 ease-out",
  opacity: "transition-opacity duration-300",
  transform: "transition-transform duration-300 ease-out",
} as const;

// =============================================================================
// ACCESSIBILITY
// =============================================================================

/**
 * Respect prefers-reduced-motion
 */
export const reducedMotionQuery = "@media (prefers-reduced-motion: reduce)";

/**
 * CSS for reduced motion
 */
export const reducedMotionCSS = `
${reducedMotionQuery} {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type DurationKey = keyof typeof durations;
export type EasingKey = keyof typeof easings;
export type TransitionKey = keyof typeof transitions;
