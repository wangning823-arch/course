'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface PopoverProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface PopoverTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface PopoverContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
}

const PopoverContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>({
  open: false,
  onOpenChange: () => {},
})

export function Popover({ children, open, onOpenChange }: PopoverProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isOpen = open !== undefined ? open : internalOpen
  const handleOpenChange = onOpenChange || setInternalOpen

  return (
    <PopoverContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      <div className="relative inline-block">
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

export function PopoverTrigger({ children, asChild }: PopoverTriggerProps) {
  const { open, onOpenChange } = React.useContext(PopoverContext)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: () => onOpenChange(!open),
    })
  }

  return (
    <button onClick={() => onOpenChange(!open)}>
      {children}
    </button>
  )
}

export function PopoverContent({ children, className, align = 'center' }: PopoverContentProps) {
  const { open, onOpenChange } = React.useContext(PopoverContext)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, onOpenChange])

  if (!open) return null

  const alignClass = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  }[align]

  return (
    <div
      ref={ref}
      className={cn(
        'absolute top-full mt-2 z-50 bg-white border border-gray-200 rounded-lg shadow-lg',
        alignClass,
        className
      )}
    >
      {children}
    </div>
  )
}
