import React, { useState, useId } from 'react'

export interface AccordionItem {
  id?: string
  title: string
  content: React.ReactNode
}

export interface AccordionProps {
  items: AccordionItem[]
  defaultOpenIndex?: number
  allowMultiple?: boolean
  className?: string
}

export function Accordion({
  items,
  defaultOpenIndex,
  allowMultiple = false,
  className = '',
}: AccordionProps) {
  const [openIndices, setOpenIndices] = useState<number[]>(
    defaultOpenIndex !== undefined ? [defaultOpenIndex] : [],
  )
  const baseId = useId()

  const toggle = (index: number) => {
    if (allowMultiple) {
      setOpenIndices((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
      )
    } else {
      setOpenIndices((prev) => (prev.includes(index) ? [] : [index]))
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item, idx) => {
        const isOpen = openIndices.includes(idx)
        const headerId = `${baseId}-header-${idx}`
        const panelId = `${baseId}-panel-${idx}`

        return (
          <div
            key={item.id ?? idx}
            className="border border-sam-border rounded-xl bg-white overflow-hidden transition-colors"
          >
            <h3>
              <button
                id={headerId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-sam-navy hover:text-sam-gold transition-colors focus-visible:ring-2 focus-visible:ring-sam-gold focus-visible:ring-inset"
              >
                <span className="text-base sm:text-lg pr-4">{item.title}</span>
                <span
                  className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-sam-bg text-sam-navy transition-transform duration-200 ${
                    isOpen ? 'rotate-180 bg-sam-gold text-sam-navy' : ''
                  }`}
                  aria-hidden="true"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </button>
            </h3>
            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className="px-4 pb-5 sm:px-5 sm:pb-6 text-sm sm:text-base text-sam-gray border-t border-slate-100 pt-3"
              >
                {item.content}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

