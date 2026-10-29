import React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'gold' | 'navy' | 'green' | 'red' | 'gray'
  size?: 'sm' | 'md'
}

const variantStyles: Record<string, string> = {
  gold: 'bg-sam-gold/20 text-[#8B6400] border border-sam-gold/50 font-semibold',
  navy: 'bg-sam-navy text-white font-medium',
  green: 'bg-sam-green/15 text-[#006E35] border border-sam-green/30 font-semibold',
  red: 'bg-sam-red/15 text-sam-red border border-sam-red/30 font-semibold',
  gray: 'bg-slate-100 text-sam-gray border border-slate-200 font-medium',
}

const sizeStyles: Record<string, string> = {
  sm: 'text-xs px-2 py-0.5 rounded-full',
  md: 'text-xs sm:text-sm px-3 py-1 rounded-full',
}

export function Badge({
  variant = 'gold',
  size = 'md',
  className = '',
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 uppercase tracking-wider ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  )
}

