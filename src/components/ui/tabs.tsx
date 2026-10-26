import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // `ui-tabs-list` carries the real styling (see "shadcn-style primitives" in index.css)
      'ui-tabs-list inline-flex h-10 items-center justify-center rounded-lg bg-[var(--surface-card,#080F1D)] p-1 text-[var(--text-dim,#64748B)] border border-[var(--border-color,#101B2B)]',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'ui-tabs-trigger inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-accent,#38BDF8)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
      'data-[state=active]:bg-[var(--purple-primary,#7919F5)] data-[state=active]:text-white data-[state=active]:shadow-sm',
      'hover:text-[var(--text-main,#F5F7FF)]',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'ui-tabs-content mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-accent,#38BDF8)]',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
