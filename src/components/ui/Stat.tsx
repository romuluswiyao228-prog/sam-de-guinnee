import React from 'react'

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  label: string
  subtext?: string
  accent?: 'gold' | 'red' | 'green' | 'navy'
}

const accentColors: Record<string, string> = {
  gold: 'text-sam-gold',
  red: 'text-sam-red',
  green: 'text-sam-green',
  navy: 'text-sam-navy',
}

export function Stat({
  value,
  label,
  subtext,
  accent = 'gold',
  className = '',
  ...rest
}: StatProps) {
  return (
    <div
      className={`flex flex-col items-center text-center p-6 bg-white rounded-2xl border border-sam-border shadow-xs hover:shadow-md transition-shadow ${className}`}
      {...rest}
    >
      <span
        className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold font-['Poppins'] tracking-tight ${accentColors[accent]}`}
      >
        {value}
      </span>
      <span className="text-base sm:text-lg font-bold font-['Poppins'] text-sam-navy mt-2">
        {label}
      </span>
      {subtext && <span className="text-xs sm:text-sm text-sam-gray mt-1">{subtext}</span>}
    </div>
  )
}

