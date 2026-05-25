import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect } from 'react'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-background/80" onClick={() => onOpenChange(false)} />
      <div className="relative z-50">{children}</div>
    </div>
  )
}

interface DialogContentProps {
  className?: string
  children: React.ReactNode
  onClose?: () => void
}

export function DialogContent({ className, children, onClose }: DialogContentProps) {
  return (
    <div
      className={cn(
        'relative bg-background rounded-lg shadow-lg border w-full mx-4 p-6 max-w-[95vw]',
        className
      )}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="size-4" />
          <span className="sr-only">关闭</span>
        </button>
      )}
      {children}
    </div>
  )
}

interface DialogHeaderProps {
  className?: string
  children: React.ReactNode
}

export function DialogHeader({ className, children }: DialogHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1.5 text-center sm:text-left mb-4', className)}>
      {children}
    </div>
  )
}

interface DialogTitleProps {
  className?: string
  children: React.ReactNode
}

export function DialogTitle({ className, children }: DialogTitleProps) {
  return (
    <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)}>
      {children}
    </h2>
  )
}

interface DialogFooterProps {
  className?: string
  children: React.ReactNode
}

export function DialogFooter({ className, children }: DialogFooterProps) {
  return (
    <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2 mt-4', className)}>
      {children}
    </div>
  )
}
