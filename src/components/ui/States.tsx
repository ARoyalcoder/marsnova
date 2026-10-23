import React, { HTMLAttributes } from 'react';
import { AlertCircle, FolderOpen, RefreshCw } from 'lucide-react';
import { Button } from './button';

// 1. Loading Spinner
export interface LoadingSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label = 'Loading...',
  className = '',
  style,
  ...props
}) => {
  const sizeClass = size === 'sm' ? 'loading-spinner-sm' : size === 'lg' ? 'loading-spinner-lg' : '';
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', ...style }}
      className={className}
      {...props}
    >
      <span className={`loading-spinner ${sizeClass}`.trim()} aria-hidden="true" />
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
        {label}
      </span>
    </div>
  );
};

// 2. Skeleton Component
export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = 'var(--radius-sm)',
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={`skeleton-pulse ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius,
        display: 'block',
        ...style
      }}
      aria-hidden="true"
      {...props}
    />
  );
};

// 3. Progress Bar
export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  label?: string;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  showPercentage = true,
  className = '',
  style,
  ...props
}) => {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={className} style={style} {...props}>
      {(label || showPercentage) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
          {label && <span>{label}</span>}
          {showPercentage && <span>{clamped}%</span>}
        </div>
      )}
      <div
        className="progress-bar-container"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div className="progress-bar-fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
};

// 4. Error State Box
export interface ErrorStateProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
  style,
  ...props
}) => {
  return (
    <div className={`alert-error ${className}`.trim()} role="alert" style={style} {...props}>
      <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
      <div style={{ flex: 1 }}>
        <h4 style={{ fontWeight: 700, color: '#fca5a5', marginBottom: '4px' }}>{title}</h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5 }}>{message}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCw size={13} />}
            style={{ marginTop: '12px', borderColor: '#fca5a5', color: '#fca5a5' }}
          >
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
};

// 5. Empty State Card
export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
  style,
  ...props
}) => {
  return (
    <div className={`empty-state-card ${className}`.trim()} style={style} {...props}>
      <div className="empty-state-icon" aria-hidden="true">
        {icon || <FolderOpen size={24} />}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {action && (
        <Button variant="primary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};
