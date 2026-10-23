import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | boolean;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, id, required, ...props }, ref) => {
    const inputId = id || props.name;
    const hasError = Boolean(error) || props['aria-invalid'] === true || props['aria-invalid'] === 'true';
    const errorMessage = typeof error === 'string' ? error : undefined;

    const inputElement = (
      <input
        ref={ref}
        id={inputId}
        type={type}
        required={required}
        aria-invalid={hasError}
        aria-describedby={
          errorMessage && inputId
            ? `${inputId}-error`
            : helperText && inputId
            ? `${inputId}-helper`
            : undefined
        }
        className={cn(
          'flex h-10 w-full rounded-md border border-[var(--border-color,#101B2B)] bg-[var(--surface-card,#080F1D)] px-3 py-2 text-sm text-[var(--text-main,#F5F7FF)] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--text-dim,#64748B)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-accent,#38BDF8)] disabled:cursor-not-allowed disabled:opacity-50',
          hasError && 'border-red-500 focus-visible:ring-red-500',
          className
        )}
        style={{
          backgroundColor: 'var(--surface-card, #080F1D)',
          borderColor: hasError ? '#ef4444' : 'var(--border-color, #101B2B)',
          color: 'var(--text-main, #F5F7FF)',
          ...props.style
        }}
        {...props}
      />
    );

    if (label || helperText || errorMessage) {
      return (
        <div className="form-group" style={{ marginBottom: '16px' }}>
          {label && (
            <label htmlFor={inputId} className="form-label">
              <span>
                {label}
                {required && (
                  <span style={{ color: '#ef4444', marginLeft: '4px' }} aria-hidden="true">
                    *
                  </span>
                )}
              </span>
            </label>
          )}
          {inputElement}
          {errorMessage ? (
            <div
              id={inputId ? `${inputId}-error` : undefined}
              className="form-error-text"
              role="alert"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '12px', marginTop: '4px' }}
            >
              <AlertCircle size={14} aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          ) : helperText ? (
            <p
              id={inputId ? `${inputId}-helper` : undefined}
              className="form-helper-text"
              style={{ color: 'var(--text-dim, #64748B)', fontSize: '12px', marginTop: '4px' }}
            >
              {helperText}
            </p>
          ) : null}
        </div>
      );
    }

    return inputElement;
  }
);
Input.displayName = 'Input';

export { Input };
