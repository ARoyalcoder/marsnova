import React, { forwardRef, HTMLAttributes } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'glow';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', className = '', ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion();
    const variantClass = variant === 'hover' ? 'ui-card-hover' : variant === 'glow' ? 'ui-card-glow' : '';
    const isInteractive = variant === 'hover';

    return (
      <motion.div
        ref={ref}
        whileHover={isInteractive && !shouldReduceMotion ? { y: -3 } : undefined}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`ui-card ${variantClass} ${className}`.trim()}
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`ui-card-header ${className}`.trim()} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<HTMLAttributes<HTMLHeadingElement>> = ({ children, className = '', ...props }) => (
  <h3 className={`ui-card-title ${className}`.trim()} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<HTMLAttributes<HTMLParagraphElement>> = ({ children, className = '', ...props }) => (
  <p className={`ui-card-desc ${className}`.trim()} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`ui-card-content ${className}`.trim()} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`ui-card-footer ${className}`.trim()} style={{ marginTop: '16px' }} {...props}>
    {children}
  </div>
);
