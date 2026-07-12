import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
}) => {
  let variantClasses = '';
  if (variant === 'text') {
    variantClasses = 'h-3 w-full rounded-md';
  } else if (variant === 'circular') {
    variantClasses = 'rounded-full';
  } else {
    variantClasses = 'rounded-lg';
  }

  const style: React.CSSProperties = {
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
  };

  return (
    <div
      className={`skeleton-shimmer ${variantClasses} ${className}`}
      style={style}
      role="progressbar"
      aria-valuetext="Loading content..."
      aria-busy="true"
    />
  );
};
export default Skeleton;
