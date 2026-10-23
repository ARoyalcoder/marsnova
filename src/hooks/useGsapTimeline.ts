import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '../animations/gsap';

interface UseGsapTimelineOptions {
  dependencies?: unknown[];
  revertOnUpdate?: boolean;
}

/**
 * Custom hook to safely build GSAP timelines scoped to a React component container
 * Automatically handles cleanup and React Strict Mode double-invocations
 */
export function useGsapTimeline<T extends HTMLElement = HTMLDivElement>(
  animationCallback: (context: { scope: T; gsap: typeof gsap }) => void,
  options: UseGsapTimelineOptions = {}
) {
  const containerRef = useRef<T>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      animationCallback({
        scope: containerRef.current,
        gsap,
      });
    },
    {
      scope: containerRef,
      dependencies: options.dependencies || [],
      revertOnUpdate: options.revertOnUpdate ?? true,
    }
  );

  return containerRef;
}
