import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "./button"

function Dialog({ open, onOpenChange, children, ...props }: DialogPrimitive.Root.Props) {
  return (
    <DialogPrimitive.Root
      data-slot="dialog"
      open={open}
      onOpenChange={onOpenChange}
      {...props}
    >
      {children}
    </DialogPrimitive.Root>
  )
}

function DialogContent({
  className,
  children,
  onClose,
  ...props
}: DialogPrimitive.Popup.Props & { onClose?: () => void }) {
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal">
      <DialogPrimitive.Backdrop
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-background/80"
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg shadow-lg border p-6 max-w-[95vw] max-h-[95vh] outline-none",
          className
        )}
        {...props}
      >
        {children}
        {onClose && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={<Button variant="ghost" size="icon" className="absolute right-4 top-4 size-6" />}
            onClick={onClose}
          >
            <X className="size-3" />
            <span className="sr-only">关闭</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-1.5 text-center sm:text-left mb-4", className)} {...props} />
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-footer" className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2 mt-4", className)} {...props} />
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter }
