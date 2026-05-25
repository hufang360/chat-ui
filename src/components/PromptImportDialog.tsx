import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Upload, Download } from 'lucide-react'

export interface PromptImportDialogProps {
  open: boolean
  importUrl: string
  onOpenChange: (open: boolean) => void
  onUrlChange: (url: string) => void
  onFileImport: () => void
  onUrlImport: () => void
}

export function PromptImportDialog({ open, importUrl, onOpenChange, onUrlChange, onFileImport, onUrlImport }: PromptImportDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <div className="px-4 py-3 flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full justify-start h-7 text-xs"
            onClick={() => {
              onFileImport()
              onOpenChange(false)
            }}
          >
            <Upload data-icon="inline-start" className="size-3 mr-2" />
            {t('importFromFile')}
          </Button>

          <Separator />

          <div className="flex rounded-md border">
            <Input
              value={importUrl}
              onChange={e => onUrlChange(e.target.value)}
              className="h-7 text-2xs rounded-r-none border-0 border-r focus-visible:ring-0"
              placeholder={t('enterPromptJsonUrl')}
            />
            <Button
              variant="outline"
              className="h-7 text-2xs px-2 rounded-l-none border-l-0 bg-muted hover:bg-muted/80"
              onClick={() => {
                onUrlImport()
                onOpenChange(false)
              }}
            >
              <Download data-icon="inline-start" className="size-3" />
              {t('import')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
