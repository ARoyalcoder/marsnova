import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const FieldGroup = React.forwardRef<HTMLDivElement, FieldGroupProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-4 w-full', className)}
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
  ({ className, orientation = 'vertical', 'data-invalid': dataInvalid, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-invalid={dataInvalid}
        className={cn(
          'w-full',
          orientation === 'horizontal'
            ? 'flex flex-row items-center gap-3'
            : 'flex flex-col gap-1.5',
          dataInvalid && 'data-[invalid=true]:text-red-400',
          className
        )}
        {...props}
      />
    );
  }
);
Field.displayName = 'Field';

export interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const FieldLabel = React.forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-sm font-medium text-[var(--text-main,#F5F7FF)] leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className
        )}
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
