import React from 'react'
import { Link } from 'react-router-dom'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  to?: string
  href?: string
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-sam-gold text-sam-navy font-semibold hover:bg-sam-gold-hover shadow-sm hover:shadow active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-sam-gold focus-visible:ring-offset-2',
  secondary:
    'bg-sam-navy text-white font-semibold hover:bg-sam-navy-light shadow-sm hover:shadow active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-sam-navy focus-visible:ring-offset-2',
  outline:
    'border-2 border-sam-navy text-sam-navy font-semibold hover:bg-sam-navy hover:text-white active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-sam-navy focus-visible:ring-offset-2',
  ghost:
    'text-sam-navy hover:bg-sam-navy/10 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-sam-navy',
  danger:
    'bg-sam-red text-white font-semibold hover:bg-red-700 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-sam-red focus-visible:ring-offset-2',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5',
  md: 'text-sm px-4 py-2.5 rounded-xl gap-2',
  lg: 'text-base px-6 py-3.5 rounded-xl gap-2.5 font-bold',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      to,
      href,
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) => {
    const baseClasses = `
      inline-flex items-center justify-center font-['Inter'] transition-all duration-200
      cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `.trim()

    const content = (
      <>
        {loading && (
          <span
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
            aria-hidden="true"
          />
        )}
        {!loading && leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
        <span>{children}</span>
        {!loading && rightIcon && <span className="shrink-0" aria-hidden="true">{rightIcon}</span>}
      </>
    )

    if (to) {
      return (
        <Link to={to} className={baseClasses} aria-disabled={disabled || loading}>
          {content}
        </Link>
      )
    }

    if (href) {
      return (
        <a href={href} className={baseClasses} aria-disabled={disabled || loading}>
          {content}
        </a>
      )
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={baseClasses}
        {...rest}
      >
        {content}
      </button>
    )
  },
)

Button.displayName = 'Button'

