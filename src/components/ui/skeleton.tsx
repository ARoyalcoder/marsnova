import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

function Skeleton({
  className,
  width,
  height,
  borderRadius,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn('skeleton-pulse rounded-md bg-[var(--surface-hover,#101B2B)]', className)}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--surface-hover, #101B2B)',
        ...style
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };
