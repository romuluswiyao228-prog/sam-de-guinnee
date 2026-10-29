import React from 'react'

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'default' | 'narrow' | 'wide'

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  size?: ContainerSize
}

export const Container: React.FC<ContainerProps> = ({
  children,
  className = '',
  size = 'lg',
  ...props
}) => {
  const sizeClasses: Record<ContainerSize, string> = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-7xl',
    xl: 'max-w-screen-2xl',
    full: 'max-w-full',
    default: 'max-w-7xl',
    narrow: 'max-w-4xl',
    wide: 'max-w-screen-2xl',
  }

  return (
    <div
      className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${sizeClasses[size] || 'max-w-7xl'} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default Container
