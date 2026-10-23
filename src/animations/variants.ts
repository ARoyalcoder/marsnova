import type { Variants } from 'motion/react';

/**
 * Standard easing curves for MarsNova animations
 * Consistent with luxury creative studio aesthetic: smooth deceleration
 */
export const EASINGS = {
  easeOutCubic: [0.215, 0.61, 0.355, 1],
  easeOutQuart: [0.165, 0.84, 0.44, 1],
  easeInOutQuart: [0.77, 0, 0.175, 1],
} as const;

/**
 * Simple fade in variant
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.35,
      ease: EASINGS.easeOutCubic,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

/**
 * Standard subtle fade-in-up for page sections and list items
 */
export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: EASINGS.easeOutCubic,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

/**
 * Parent container variant to stagger child item entrances
 */
export const staggerContainer = (staggerChildren = 0.08, delayChildren = 0): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

/**
 * Card hover and tap interactions for motion.div cards
 * Restrained movement: slight lift (-3px) and subtle border glow without layout shift
 */
export const cardInteractiveVariants: Variants = {
  rest: {
    y: 0,
    transition: { duration: 0.2, ease: EASINGS.easeOutCubic },
  },
  hover: {
    y: -3,
    transition: { duration: 0.25, ease: EASINGS.easeOutCubic },
  },
  tap: {
    y: 0,
    scale: 0.99,
    transition: { duration: 0.1, ease: 'easeOut' },
  },
};

/**
 * Button tap feedback
 */
export const buttonTapMotion = {
  tap: { scale: 0.98 },
  transition: { duration: 0.1, ease: 'easeOut' },
};

/**
 * Modal & Dialog animations
 */
export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

export const modalContentVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: EASINGS.easeOutCubic,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 8,
    transition: {
      duration: 0.18,
      ease: 'easeIn',
    },
  },
};

/**
 * Mobile drawer navigation slide-down animation
 */
export const mobileDrawerVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.26,
      ease: EASINGS.easeOutCubic,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.18,
      ease: 'easeIn',
    },
  },
};

/**
 * Tab content transition
 */
export const tabContentVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: EASINGS.easeOutCubic },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

/**
 * Page route transition
 */
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: EASINGS.easeOutCubic,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};
