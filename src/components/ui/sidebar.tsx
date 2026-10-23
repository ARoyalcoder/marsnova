import * as React from 'react';
import { PanelLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

export function SidebarProvider({
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  children
}: {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean) => {
      if (onOpenChange) {
        onOpenChange(value);
      } else {
        _setOpen(value);
      }
    },
    [onOpenChange]
  );

  const toggleSidebar = React.useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { side?: 'left' | 'right' }
>(({ className, side = 'left', children, ...props }, ref) => {
  const { open, setOpen } = useSidebar();

  return (
    <>
      {/* Mobile Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        ref={ref}
        className={cn(
          'fixed inset-y-0 z-50 flex w-72 flex-col border-[var(--border-color,#101B2B)] bg-[var(--surface-card,#080F1D)] p-4 text-[var(--text-main,#F5F7FF)] transition-transform duration-300 ease-in-out md:static md:translate-x-0',
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
          open ? 'translate-x-0' : side === 'left' ? '-translate-x-full md:translate-x-0' : 'translate-x-full md:translate-x-0',
          className
        )}
        style={{
          backgroundColor: '#080F1D',
          borderColor: '#101B2B',
          color: '#F5F7FF',
          ...props.style
        }}
        {...props}
      >
        <div className="flex md:hidden justify-end mb-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 text-[var(--text-dim,#64748B)] hover:text-white rounded"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </aside>
    </>
  );
});
Sidebar.displayName = 'Sidebar';

const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex items-center justify-center p-2 rounded-md text-[var(--text-muted,#94A3B8)] hover:text-white hover:bg-[var(--surface-hover,#101B2B)] cursor-pointer',
        className
      )}
      onClick={(e) => {
        toggleSidebar();
        onClick?.(e);
      }}
      aria-label="Toggle sidebar"
      {...props}
    >
      <PanelLeft className="h-5 w-5" />
    </button>
  );
});
SidebarTrigger.displayName = 'SidebarTrigger';

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col gap-2 pb-4 border-b border-[var(--border-color,#101B2B)]', className)}
    {...props}
  />
));
SidebarHeader.displayName = 'SidebarHeader';

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex-1 overflow-y-auto py-4 space-y-1', className)}
    {...props}
  />
));
SidebarContent.displayName = 'SidebarContent';

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('pt-4 border-t border-[var(--border-color,#101B2B)] flex flex-col gap-2', className)}
    {...props}
  />
));
SidebarFooter.displayName = 'SidebarFooter';

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn('flex w-full min-w-0 flex-col gap-1 p-0 m-0 list-none', className)}
    {...props}
  />
));
SidebarMenu.displayName = 'SidebarMenu';

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn('relative list-none m-0 p-0', className)}
    {...props}
  />
));
SidebarMenuItem.displayName = 'SidebarMenuItem';

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { isActive?: boolean }
>(({ className, isActive, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
      isActive
        ? 'bg-[var(--purple-primary,#7919F5)] text-white font-semibold'
        : 'text-[var(--text-muted,#94A3B8)] hover:bg-[var(--surface-hover,#101B2B)] hover:text-white',
      className
    )}
    {...props}
  />
));
SidebarMenuButton.displayName = 'SidebarMenuButton';

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarContext
};
