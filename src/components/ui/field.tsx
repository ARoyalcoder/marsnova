import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const FieldGroup = React.forwardRef<HTMLDivElement, FieldGroupProps>(
  ({ className, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-4 w-full field-group', className)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          width: '100%',
          ...style
        }}
        {...props}
      />
    );
  }
);
FieldGroup.displayName = 'FieldGroup';

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  'data-invalid'?: boolean;
  orientation?: 'vertical' | 'horizontal';
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, orientation = 'vertical', 'data-invalid': dataInvalid, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-invalid={dataInvalid}
        className={cn(
          'w-full field-item',
          orientation === 'horizontal'
            ? 'flex flex-row items-center gap-3'
            : 'flex flex-col gap-1.5',
          dataInvalid && 'data-[invalid=true]:text-red-400',
          className
        )}
        style={{
          display: 'flex',
          flexDirection: orientation === 'horizontal' ? 'row' : 'column',
          gap: orientation === 'horizontal' ? '0.75rem' : '0.375rem',
          width: '100%',
          ...style
        }}
        {...props}
      />
    );
  }
);
Field.displayName = 'Field';

export interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const FieldLabel = React.forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ className, style, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-sm font-medium text-[var(--text-main,#F5F7FF)] leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className
        )}
        style={{
          display: 'inline-block',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-main, #F5F7FF)',
          marginBottom: '0.25rem',
          ...style
        }}
        {...props}
      />
    );
  }
);
FieldLabel.displayName = 'FieldLabel';

export interface FieldDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FieldDescription = React.forwardRef<HTMLParagraphElement, FieldDescriptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-xs text-[var(--text-dim,#94A3B8)] leading-relaxed', className)}
        {...props}
      />
    );
  }
);
FieldDescription.displayName = 'FieldDescription';

export interface FieldErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  errors?: Array<{ message?: string } | string | undefined | null>;
}

export const FieldError = React.forwardRef<HTMLDivElement, FieldErrorProps>(
  ({ className, errors, children, ...props }, ref) => {
    const errorList = errors?.filter(Boolean) || [];

    if (errorList.length === 0 && !children) {
      return null;
    }

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        className={cn('text-xs font-medium text-red-400 mt-1 flex flex-col gap-0.5', className)}
        {...props}
      >
        {children}
        {errorList.map((err, idx) => {
          const msg = typeof err === 'string' ? err : err?.message;
          return msg ? <span key={idx}>{msg}</span> : null;
        })}
      </div>
    );
  }
);
FieldError.displayName = 'FieldError';
