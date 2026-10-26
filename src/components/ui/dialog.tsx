import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

// Callers size dialogs with Tailwind-style classes (`max-w-3xl max-h-[85vh]`). Tailwind is not installed, so
// those classes do nothing; honour the ones in use instead of capping every dialog at one fixed width. The
// `ui-dialog-*` classes (index.css, "shadcn-style primitives") carry the rest of the styling, which keeps
// `style` free for callers to override without losing the positioning.
const MAX_WIDTHS: Record<string, string> = {
  'max-w-md': '448px',
  'max-w-lg': '512px',
  'max-w-xl': '576px',
  'max-w-2xl': '672px',
  'max-w-3xl': '768px',
  'max-w-4xl': '896px',
  'max-w-5xl': '1024px'
};

const sizeFromClassName = (className?: string): { maxWidth?: string; maxHeight?: string } => {
  const size: { maxWidth?: string; maxHeight?: string } = {};
  for (const token of (className || '').split(/\s+/)) {
    if (MAX_WIDTHS[token]) size.maxWidth = MAX_WIDTHS[token];
    const height = token.match(/^max-h-\[(\d+)vh\]$/);
    if (height) size.maxHeight = `${height[1]}vh`;
  }
  return size;
};

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'ui-dialog-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, style, ...props }, ref) => {
  const size = sizeFromClassName(className);
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'ui-dialog-content fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-[var(--border-color,#101B2B)] bg-[var(--surface-card,#080F1D)] p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-xl',
          className
        )}
        style={{
          maxWidth: `min(94vw, ${size.maxWidth ?? '560px'})`,
          maxHeight: size.maxHeight ?? '88vh',
          ...style
        }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="ui-dialog-close absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--cyan-accent,#38BDF8)] disabled:pointer-events-none text-[var(--text-dim,#64748B)] hover:text-white cursor-pointer">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'ui-dialog-header flex flex-col space-y-1.5 text-center sm:text-left',
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'ui-dialog-footer flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'ui-dialog-title text-lg font-semibold leading-none tracking-tight text-[var(--text-main,#F5F7FF)]',
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('ui-dialog-description text-sm text-[var(--text-muted,#94A3B8)]', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
};
