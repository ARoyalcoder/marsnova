import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger only in browser environment
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Returns true if the client has requested reduced motion via OS or browser settings
 */
export const isReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Creates the Homepage Hero entrance animation timeline
 * Sequences eyebrow -> title -> description -> CTAs -> preview card
 */
export const createHeroTimeline = (scopeElement: HTMLElement): gsap.core.Timeline => {
  const tl = gsap.timeline({
    defaults: {
      ease: 'power3.out',
    },
  });

  if (isReducedMotion()) {
    // Instantly reveal all elements without motion
    gsap.set(
      scopeElement.querySelectorAll(
        '.eyebrow-tag, .hero-title, .hero-desc, .hero-ctas, .hero-preview-card, .hero-glow-blob'
      ),
      { opacity: 1, y: 0, scale: 1 }
    );
    return tl;
  }

  const eyebrow = scopeElement.querySelector('.eyebrow-tag');
  const title = scopeElement.querySelector('.hero-title');
  const desc = scopeElement.querySelector('.hero-desc');
  const ctas = scopeElement.querySelector('.hero-ctas');
  const preview = scopeElement.querySelector('.hero-preview-card');
  const glow = scopeElement.querySelector('.hero-glow-blob');

  if (glow) {
    tl.fromTo(
      glow,
      { opacity: 0, scale: 0.8 },
      { opacity: 0.6, scale: 1, duration: 1.2, ease: 'sine.out' },
      0
    );
  }

  if (eyebrow) {
    tl.fromTo(
      eyebrow,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5 },
      0.1
    );
  }

  if (title) {
    tl.fromTo(
      title,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.65 },
      0.25
    );
  }

  if (desc) {
    tl.fromTo(
      desc,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.55 },
      0.4
    );
  }

  if (ctas) {
    tl.fromTo(
      ctas,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.5 },
      0.55
    );
  }

  if (preview) {
    tl.fromTo(
      preview,
      { opacity: 0, y: 28, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.75, ease: 'power2.out' },
      0.35
    );
  }

  return tl;
};

/**
 * Creates a ScrollTrigger reveal for an element or list of elements
 */
export const createScrollTriggerReveal = (
  element: HTMLElement | HTMLElement[],
  options: {
    y?: number;
    duration?: number;
    stagger?: number;
    start?: string;
  } = {}
): gsap.core.Tween | gsap.core.Timeline | null => {
  if (isReducedMotion() || typeof window === 'undefined') {
    gsap.set(element, { opacity: 1, y: 0 });
    return null;
  }

  const { y = 24, duration = 0.6, stagger = 0.1, start = 'top 85%' } = options;

  return gsap.fromTo(
    element,
    { opacity: 0, y },
    {
      opacity: 1,
      y: 0,
      duration,
      stagger,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: Array.isArray(element) ? element[0] : element,
        start,
        once: true,
      },
    }
  );
};

export { gsap, ScrollTrigger };
