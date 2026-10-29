import React from 'react'
import { Container } from './Container'

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  id?: string
  surtitle?: string
  title?: string
  description?: string
  centered?: boolean
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  background?: 'white' | 'gray' | 'navy' | 'transparent'
}

const bgStyles: Record<string, string> = {
  white: 'bg-white text-sam-text',
  gray: 'bg-sam-bg text-sam-text',
  navy: 'bg-sam-navy text-white',
  transparent: 'bg-transparent text-sam-text',
}

export function Section({
  id,
  surtitle,
  title,
  description,
  centered = false,
  containerSize = 'lg',
  background = 'transparent',
  className = '',
  children,
  ...rest
}: SectionProps) {
  const isNavy = background === 'navy'

  return (
    <section
      id={id}
      className={`py-16 sm:py-24 ${bgStyles[background]} ${className}`}
      {...rest}
    >
      <Container size={containerSize}>
        {(surtitle || title || description) && (
          <div className={`mb-12 sm:mb-16 ${centered ? 'text-center' : 'text-left'}`}>
            {surtitle && (
              <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-sam-red mb-2">
                {surtitle}
              </p>
            )}
            {title && (
              <h2
                className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold font-['Poppins'] tracking-tight ${
                  isNavy ? 'text-white' : 'text-sam-navy'
                }`}
              >
                {title}
              </h2>
            )}
            {/* Liseré tricolore guinéen sous le titre */}
            <div
              className={`w-20 h-1 sam-tricolor-gradient rounded-full mt-4 mb-4 ${
                centered ? 'mx-auto' : ''
              }`}
              aria-hidden="true"
            />
            {description && (
              <p
                className={`text-base sm:text-lg max-w-3xl ${
                  isNavy ? 'text-slate-300' : 'text-sam-gray'
                } ${centered ? 'mx-auto' : ''}`}
              >
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </Container>
    </section>
  )
}

