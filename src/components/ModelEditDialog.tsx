import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from '../store'
import type { ModelMetadata } from '../types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Copy, Eye, Brain } from 'lucide-react'

export interface ModelEditDialogProps {
  open: boolean
  model: string
  metadata: ModelMetadata
  providerId: string
  onClose: () => void
}

export function ModelEditDialog({ open, model, metadata, providerId, onClose }: ModelEditDialogProps) {
  const { providers, updateProvider } = useStore()
  const [editingMetadata, setEditingMetadata] = useState<ModelMetadata>(metadata)
  const { t } = useTranslation()

  const handleSave = () => {
    const provider = providers.find(p => p.id === providerId)
    if (!provider) return
    const currentMetadata = provider.modelMetadata || {}
    updateProvider(providerId, {
      modelMetadata: { ...currentMetadata, [model]: editingMetadata }
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md p-0">
        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">{t('modelName')}</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-1.5 bg-muted rounded-md text-xs font-mono">
                {model}
              </div>
              <Tooltip>
                <TooltipTrigger render={<Button
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(model)
                      toast(t('modelCopied'))
                    }}
                />}>
                  <Copy data-icon className="size-3" />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-2xs px-2 py-1">{t('copyModelName')}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs">{t('featureSupport')}</Label>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="size-3 text-muted-foreground" />
                <span className="text-xs">{t('visionSupport')}</span>
              </div>
              <Switch
                checked={editingMetadata.supportsVision}
                onCheckedChange={(checked) => setEditingMetadata(prev => ({ ...prev, supportsVision: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="size-3 text-muted-foreground" />
                <span className="text-xs">{t('thinkingSupport')}</span>
              </div>
              <Switch
                checked={editingMetadata.supportsThinking}
                onCheckedChange={(checked) => setEditingMetadata(prev => ({ ...prev, supportsThinking: checked }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-4 py-3 border-t">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onClose}>{t('cancel')}</Button>
          <Button size="sm" className="h-7 text-xs" onClick={handleSave}>{t('save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
