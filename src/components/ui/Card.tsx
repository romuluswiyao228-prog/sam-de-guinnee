import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outline' | 'highlight'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const variantStyles: Record<string, string> = {
  default: 'bg-white border border-sam-border shadow-xs',
  elevated: 'bg-white border border-sam-border shadow-md hover:shadow-lg transition-shadow',
  outline: 'bg-transparent border-2 border-sam-border',
  highlight: 'bg-white border-2 border-sam-gold shadow-md relative overflow-hidden',
}

const paddingStyles: Record<string, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8 sm:p-10',
}

export function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-2xl transition-all duration-200 ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

