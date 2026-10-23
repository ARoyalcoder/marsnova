import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();
    const variantClass = `btn-${variant}`;
    const sizeClass = `btn-${size}`;
    const widthClass = fullWidth ? 'btn-full' : '';
    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        whileTap={!isDisabled && !shouldReduceMotion ? { scale: 0.98 } : undefined}
        whileHover={!isDisabled && !shouldReduceMotion ? { y: -1 } : undefined}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={`btn ${variantClass} ${sizeClass} ${widthClass} ${className}`.trim()}
        {...(props as any)}
      >
        {isLoading ? (
          <span className="loading-spinner loading-spinner-sm" aria-hidden="true" />
        ) : (
          leftIcon && <span className="btn-icon" aria-hidden="true">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="btn-icon" aria-hidden="true">{rightIcon}</span>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
