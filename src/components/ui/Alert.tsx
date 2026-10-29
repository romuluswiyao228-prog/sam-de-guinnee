import React from 'react'

export type AlertType = 'info' | 'success' | 'warning' | 'error'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: AlertType
  title?: string
  children: React.ReactNode
}

const typeStyles: Record<AlertType, { container: string; iconColor: string }> = {
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-900',
    iconColor: 'text-blue-600',
  },
  success: {
    container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    iconColor: 'text-emerald-600',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-900',
    iconColor: 'text-amber-600',
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-900',
    iconColor: 'text-red-600',
  },
}

export function Alert({
  type = 'info',
  title,
  children,
  className = '',
  ...rest
}: AlertProps) {
  const { container, iconColor } = typeStyles[type]

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${container} ${className}`}
      {...rest}
    >
      <div className={`shrink-0 mt-0.5 ${iconColor}`} aria-hidden="true">
        {type === 'success' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {type === 'error' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {type === 'warning' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
        {type === 'info' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
      <div className="flex-1">
        {title && <h4 className="font-bold text-sm mb-0.5">{title}</h4>}
        <div className="text-sm opacity-95">{children}</div>
      </div>
    </div>
  )
}

