import React, { HTMLAttributes } from 'react';
import { Container } from './ui';

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  size?: 'default' | 'narrow' | 'wide';
}

export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subtitle,
  eyebrow,
  size = 'default',
  children,
  className = '',
  style,
  ...props
}) => {
  return (
    <div className={`page-wrapper ${className}`.trim()} style={{ padding: '60px 0 80px', ...style }} {...props}>
      <Container size={size}>
        {(title || eyebrow) && (
          <div className="section-header">
            {eyebrow && (
              <div className="eyebrow-tag" style={{ marginBottom: '10px' }}>
                <span>{eyebrow}</span>
              </div>
            )}
            {title && (
              <h1 className="section-title">
                {title.includes(' ') ? (
                  <>
                    {title.substring(0, title.lastIndexOf(' '))} <span className="gradient-text">{title.substring(title.lastIndexOf(' ') + 1)}</span>
                  </>
                ) : (
                  <span className="gradient-text">{title}</span>
                )}
              </h1>
            )}
            {subtitle && <p className="section-subtitle">{subtitle}</p>}
          </div>
        )}
        {children}
      </Container>
    </div>
  );
};
