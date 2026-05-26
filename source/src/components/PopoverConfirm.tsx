import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'

export interface PopoverConfirmProps {
  open: boolean
  x: number
  y: number
  onClose: () => void
  onConfirm: () => void
}

export function PopoverConfirm({ open, x, y, onClose, onConfirm }: PopoverConfirmProps) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <>
      <div
        className="fixed inset-0 z-[60]"
        onClick={onClose}
      />
      <div
        className="fixed z-[70] bg-popover border rounded-md shadow-lg p-2"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          transform: 'translateX(-50%)'
        }}
      >
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs px-3"
            onClick={onClose}
          >
            {t('cancel')}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-6 text-xs px-3"
            onClick={() => {
              onConfirm()
              onClose()
            }}
            autoFocus
          >
            {t('confirm')}
          </Button>
        </div>
      </div>
    </>
  )
}
