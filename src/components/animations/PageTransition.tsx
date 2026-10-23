import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { pageTransitionVariants } from '../../animations/variants';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Route page entrance wrapper
 * Provides smooth, accessible opacity and slight vertical transition
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={`page-transition-container ${className}`.trim()}>{children}</div>;
  }

  return (
    <motion.div
      className={`page-transition-container ${className}`.trim()}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransitionVariants}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
};
