import React from 'react'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}

export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  className = '',
  style,
  ...rest
}: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  }[variant]

  const inlineStyles: React.CSSProperties = {
    width,
    height,
    ...style,
  }

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-slate-200 ${variantClasses} ${className}`}
      style={inlineStyles}
      {...rest}
    />
  )
}

