import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger, isReducedMotion } from '../animations/gsap';

interface ScrollRevealOptions {
  selector?: string;
  y?: number;
  duration?: number;
  stagger?: number;
  start?: string;
  once?: boolean;
}

/**
 * Custom hook to reveal elements when scrolled into viewport using GSAP ScrollTrigger
 * Safely cleans up on component unmount and respects prefers-reduced-motion
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
) {
  const containerRef = useRef<T>(null);
  const {
    selector,
    y = 20,
    duration = 0.55,
    stagger = 0.08,
    start = 'top 85%',
    once = true,
  } = options;

  useGSAP(
    () => {
      if (!containerRef.current) return;
      if (isReducedMotion()) return;

      const targets = selector
        ? containerRef.current.querySelectorAll(selector)
        : containerRef.current;

      if (!targets || (targets instanceof NodeList && targets.length === 0)) return;

      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          stagger: targets instanceof NodeList ? stagger : 0,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start,
            once,
          },
        }
      );
    },
    {
      scope: containerRef,
      dependencies: [selector, y, duration, stagger, start, once],
      revertOnUpdate: true,
    }
  );

  return containerRef;
}
