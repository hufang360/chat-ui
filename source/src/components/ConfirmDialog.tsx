import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useTranslation } from 'react-i18next'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  thirdLabel?: string
  onThirdAction?: () => void
}

export function ConfirmDialog({ open, title, message, onOpenChange, onConfirm, thirdLabel, onThirdAction }: ConfirmDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs p-0 gap-0">
        <DialogHeader className="px-3 pt-3 pb-0">
          <DialogTitle className="text-xs">{title}</DialogTitle>
        </DialogHeader>
        <div className="px-3 py-2 text-2xs text-muted-foreground">
          {message}
        </div>
        <DialogFooter className="px-3 py-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-2xs"
            onClick={() => onOpenChange(false)}
          >
            {t('cancel')}
          </Button>
          {thirdLabel && onThirdAction && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-2xs"
              onClick={() => {
                onThirdAction()
                onOpenChange(false)
              }}
            >
              {thirdLabel}
            </Button>
          )}
          <Button
            size="sm"
            className="h-6 text-2xs"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
