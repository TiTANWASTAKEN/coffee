import type { Transition, Variants } from "framer-motion";

/** Motion tokens — keep timings consistent across the site. */
export const ease = [0.22, 1, 0.36, 1] as const;
export const easeCurtain = [0.76, 0, 0.24, 1] as const;

export const duration = {
  fast: 0.45,
  base: 0.8,
  slow: 1.1,
} as const;

export const transition: Transition = { duration: duration.base, ease };

export const viewportOnce = { once: true, margin: "0px 0px -12% 0px" } as const;

export const variants = {
  fadeUp: {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: duration.slow, ease } },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1, transition: { duration: duration.slow, ease } },
  },
  clip: {
    hidden: { clipPath: "inset(0 0 100% 0)" },
    visible: { clipPath: "inset(0 0 0% 0)", transition: { duration: duration.slow, ease: easeCurtain } },
  },
  slideLeft: {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0, transition },
  },
} satisfies Record<string, Variants>;

export type RevealVariant = keyof typeof variants;

export const stagger = (staggerChildren = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren, delayChildren } },
});
