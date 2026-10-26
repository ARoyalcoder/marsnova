import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  'data-invalid'?: boolean;
}

export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, 'data-invalid': dataInvalid, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-invalid={dataInvalid}
        className={cn(
          'relative flex flex-col w-full rounded-md border border-[var(--border-color,#101B2B)] bg-[var(--surface-card,#080F1D)] transition-colors focus-within:ring-2 focus-within:ring-[var(--cyan-accent,#38BDF8)] focus-within:border-[var(--cyan-accent,#38BDF8)] overflow-hidden shadow-sm',
          dataInvalid && 'border-red-500 focus-within:ring-red-500 focus-within:border-red-500',
          className
        )}
        style={{
          backgroundColor: 'var(--bg-card, #080F1D)',
          borderColor: 'var(--border-highlight, #1E2D4A)',
          ...props.style
        }}
        {...props}
      />
    );
  }
);
InputGroup.displayName = 'InputGroup';

export interface InputGroupTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const InputGroupTextarea = React.forwardRef<
  HTMLTextAreaElement,
  InputGroupTextareaProps
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full bg-transparent px-3 py-2 text-sm text-[var(--text-main,#F5F7FF)] placeholder:text-[var(--text-dim,#64748B)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 border-0 shadow-none resize-none',
        className
      )}
      {...props}
    />
  );
});
InputGroupTextarea.displayName = 'InputGroupTextarea';

export interface InputGroupInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const InputGroupInput = React.forwardRef<
  HTMLInputElement,
  InputGroupInputProps
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full bg-transparent px-3 py-2 text-sm text-[var(--text-main,#F5F7FF)] placeholder:text-[var(--text-dim,#64748B)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 border-0 shadow-none',
        className
      )}
      {...props}
    />
  );
});
InputGroupInput.displayName = 'InputGroupInput';

export interface InputGroupAddonProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'block-start' | 'block-end' | 'inline-start' | 'inline-end';
}

export const InputGroupAddon = React.forwardRef<
  HTMLDivElement,
  InputGroupAddonProps
>(({ className, align = 'block-end', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center text-xs text-[var(--text-dim,#94A3B8)]',
        align === 'block-end' && 'justify-end px-3 py-1.5 border-t border-[var(--border-color,#101B2B)]/40 bg-[var(--bg-deep,#030912)]/40',
        align === 'block-start' && 'justify-start px-3 py-1.5 border-b border-[var(--border-color,#101B2B)]/40',
        align === 'inline-start' && 'px-2 py-1',
        align === 'inline-end' && 'px-2 py-1',
        className
      )}
      {...props}
    />
  );
});
InputGroupAddon.displayName = 'InputGroupAddon';

export interface InputGroupTextProps
  extends React.HTMLAttributes<HTMLSpanElement> {}

export const InputGroupText = React.forwardRef<
  HTMLSpanElement,
  InputGroupTextProps
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn('text-xs text-[var(--text-dim,#94A3B8)] select-none', className)}
      {...props}
    />
  );
});
InputGroupText.displayName = 'InputGroupText';
