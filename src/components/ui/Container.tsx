import React, { HTMLAttributes } from 'react';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'default' | 'narrow' | 'wide';
}

export const Container: React.FC<ContainerProps> = ({
  children,
  size = 'default',
  className = '',
  ...props
}) => {
  const sizeClass = size === 'narrow' ? 'container-narrow' : size === 'wide' ? 'container-wide' : 'container';
  return (
    <div className={`${sizeClass} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};
