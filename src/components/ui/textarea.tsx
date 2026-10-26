import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | boolean;
  helperText?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, required, ...props }, ref) => {
    const textareaId = id || props.name;
    const hasError = Boolean(error) || props['aria-invalid'] === true || props['aria-invalid'] === 'true';
    const errorMessage = typeof error === 'string' ? error : undefined;

    const textareaElement = (
      <textarea
        ref={ref}
        id={textareaId}
        required={required}
        aria-invalid={hasError}
        aria-describedby={
          errorMessage && textareaId
            ? `${textareaId}-error`
            : helperText && textareaId
            ? `${textareaId}-helper`
            : undefined
        }
        className={cn(
          'ui-textarea flex min-h-[80px] w-full rounded-md border border-[var(--border-color,#101B2B)] bg-[var(--surface-card,#080F1D)] px-3 py-2 text-sm text-[var(--text-main,#F5F7FF)] shadow-sm placeholder:text-[var(--text-dim,#64748B)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-accent,#38BDF8)] disabled:cursor-not-allowed disabled:opacity-50',
          hasError && 'ui-textarea-error border-red-500 focus-visible:ring-red-500',
          className
        )}
        {...props}
      />
    );

    if (label || helperText || errorMessage) {
      return (
        <div className="form-group" style={{ marginBottom: '16px' }}>
          {label && (
            <label htmlFor={textareaId} className="form-label">
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
          {textareaElement}
          {errorMessage ? (
            <div
              id={textareaId ? `${textareaId}-error` : undefined}
              className="form-error-text"
              role="alert"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '12px', marginTop: '4px' }}
            >
              <AlertCircle size={14} aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          ) : helperText ? (
            <p
              id={textareaId ? `${textareaId}-helper` : undefined}
              className="form-helper-text"
              style={{ color: 'var(--text-dim, #64748B)', fontSize: '12px', marginTop: '4px' }}
            >
              {helperText}
            </p>
          ) : null}
        </div>
      );
    }

    return textareaElement;
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
