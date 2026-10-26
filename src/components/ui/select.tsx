import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// shadcn Radix UI Select Suite
// ============================================================================
const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'ui-select-trigger flex h-10 w-full items-center justify-between rounded-md border border-[var(--border-color,#101B2B)] bg-[var(--surface-card,#080F1D)] px-3 py-2 text-sm text-[var(--text-main,#F5F7FF)] shadow-sm placeholder:text-[var(--text-dim,#64748B)] focus:outline-none focus:ring-2 focus:ring-[var(--cyan-accent,#38BDF8)] disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="ui-select-chevron h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn('ui-select-scroll-btn flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn('ui-select-scroll-btn flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

export interface SelectContentProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> {
  alignItemWithTrigger?: boolean;
}

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(({ className, children, position = 'popper', alignItemWithTrigger, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'ui-select-content relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-[var(--border-color,#101B2B)] bg-[var(--surface-card,#080F1D)] text-[var(--text-main,#F5F7FF)] shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'ui-select-viewport p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('ui-select-label py-1.5 pl-8 pr-2 text-sm font-semibold text-[var(--text-muted,#94A3B8)]', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'ui-select-item relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-[var(--surface-hover,#101B2B)] focus:text-[var(--cyan-accent,#38BDF8)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="ui-select-item-indicator absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-[var(--cyan-accent,#38BDF8)]" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('ui-select-separator -mx-1 my-1 h-px bg-[var(--border-color,#101B2B)]', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

// ============================================================================
// Accessible NativeSelect (supports <optgroup>, <option>, and HTMLSelectElement ref)
// ============================================================================
export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | boolean;
  helperText?: string;
  options?: Array<{ label: string; value: string }>;
}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ id, label, error, helperText, required, options, children, className = '', ...props }, ref) => {
    const selectId = id || props.name || 'select';
    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : undefined;

    return (
      <div className="form-group" style={{ marginBottom: '16px' }}>
        {label && (
          <label htmlFor={selectId} className="form-label">
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
        <select
          ref={ref}
          id={selectId}
          required={required}
          aria-invalid={hasError}
          aria-describedby={
            errorMessage
              ? `${selectId}-error`
              : helperText
              ? `${selectId}-helper`
              : undefined
          }
          className={cn(
            'flex h-10 w-full rounded-md border border-[var(--border-color,#101B2B)] bg-[var(--surface-card,#080F1D)] px-3 py-2 text-sm text-[var(--text-main,#F5F7FF)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-accent,#38BDF8)] disabled:cursor-not-allowed disabled:opacity-50',
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
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {errorMessage ? (
          <div
            id={`${selectId}-error`}
            className="form-error-text"
            role="alert"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '12px', marginTop: '4px' }}
          >
            <AlertCircle size={14} aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        ) : helperText ? (
          <p
            id={`${selectId}-helper`}
            className="form-helper-text"
            style={{ color: 'var(--text-dim, #64748B)', fontSize: '12px', marginTop: '4px' }}
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
NativeSelect.displayName = 'NativeSelect';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
  NativeSelect,
  NativeSelect as SelectField
};
