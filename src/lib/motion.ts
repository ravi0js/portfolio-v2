/**
 * Motion presets for React parts (motion/react). Values mirror the CSS tokens in
 * src/styles/tokens.css so JS and CSS animations feel the same.
 * Astro components use the CSS side instead: [data-reveal] / [data-hero] attributes.
 */
export const duration = { fast: 0.15, base: 0.25, slow: 0.5, reveal: 0.7 } as const;
export const easeOutSoft = [0.2, 0.7, 0.2, 1] as const;

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: duration.base, ease: easeOutSoft },
} as const;

export const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: duration.reveal, ease: easeOutSoft },
} as const;
