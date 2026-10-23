import React from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { fadeInUp, staggerContainer } from '../../animations/variants';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  yOffset?: number;
  staggerChildren?: number;
  as?: 'section' | 'div' | 'article';
  id?: string;
  'aria-label'?: string;
}

/**
 * Accessible AnimatedSection wrapper using Motion for React
 * Automatically respects prefers-reduced-motion
 */
export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  className = '',
  delay = 0,
  yOffset = 14,
  staggerChildren = 0,
  as = 'section',
  id,
  'aria-label': ariaLabel,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const customVariant: Variants = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2, delay } },
      }
    : staggerChildren > 0
    ? staggerContainer(staggerChildren, delay)
    : {
        hidden: { opacity: 0, y: yOffset },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.45,
            delay,
            ease: [0.215, 0.61, 0.355, 1],
          },
        },
      };

  const Component = as === 'section' ? motion.section : as === 'article' ? motion.article : motion.div;

  return (
    <Component
      id={id}
      aria-label={ariaLabel}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-30px' }}
      variants={customVariant}
    >
      {children}
    </Component>
  );
};
