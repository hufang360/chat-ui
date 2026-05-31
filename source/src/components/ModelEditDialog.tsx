import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from '../store'
import type { ModelMetadata } from '../types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Copy, Eye, Lightbulb } from 'lucide-react'

export interface ModelEditDialogProps {
  open: boolean
  model: string
  metadata: ModelMetadata
  providerId: string
  onClose: () => void
}

export function ModelEditDialog({ open, model, metadata, providerId, onClose }: ModelEditDialogProps) {
  const { providers, updateProvider } = useStore()
  const { t } = useTranslation()

  const [editName, setEditName] = useState(model)
  const [supportsVision, setSupportsVision] = useState(false)
  const [supportsThinking, setSupportsThinking] = useState(false)
  const [contextLength, setContextLength] = useState('')

  const loadMeta = useCallback(() => {
    const provider = providers.find(p => p.id === providerId)
    const meta = provider?.modelMetadata?.[model] || metadata
    setSupportsVision(meta.supportsVision)
    setSupportsThinking(meta.supportsThinking)
    setContextLength(meta.contextLength ? String(meta.contextLength) : '')
  }, [providers, providerId, model, metadata])

  useEffect(() => {
    if (open) {
      setEditName(model)
      loadMeta()
    }
  }, [open, model, loadMeta])

  const handleSave = () => {
    const provider = providers.find(p => p.id === providerId)
    if (!provider) return
    const trimmed = editName.trim()
    if (!trimmed) return

    const newMeta: ModelMetadata = {
      supportsVision,
      supportsThinking,
      contextLength: contextLength && Number(contextLength) > 0 ? Number(contextLength) : undefined,
    }

    const models = trimmed === model
      ? provider.models
      : provider.models.map(m => m === model ? trimmed : m)

    const currentMetadata = { ...provider.modelMetadata }
    if (trimmed !== model) delete currentMetadata[model]
    currentMetadata[trimmed] = newMeta

    updateProvider(providerId, { models, modelMetadata: currentMetadata })
    onClose()
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-xs p-0 gap-0">
        <DialogHeader className="px-3 py-1.5">
          <DialogTitle className="text-sm">{t('edit')}</DialogTitle>
        </DialogHeader>

        <div className="px-3 pb-2 flex flex-col gap-2">
          <InputGroup>
            <InputGroupInput
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="text-xs font-mono h-7"
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                onClick={() => { navigator.clipboard.writeText(editName); toast.success(t('modelCopied')) }}
                aria-label={t('copy')}
              >
                <Copy className="size-3" aria-hidden="true" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>

          <div className="flex flex-col gap-1">
            <Label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={supportsVision}
                onCheckedChange={(checked) => setSupportsVision(!!checked)}
              />
              <Eye className="size-3 text-muted-foreground" />
              <span className="text-xs">{t('visionSupport')}</span>
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={supportsThinking}
                onCheckedChange={(checked) => setSupportsThinking(!!checked)}
              />
              <Lightbulb className="size-3 text-muted-foreground" />
              <span className="text-xs">{t('thinkingSupport')}</span>
            </Label>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">{t('context')}</Label>
            <InputGroup>
              <InputGroupInput
                type="number"
                value={contextLength}
                onChange={e => setContextLength(e.target.value)}
                placeholder="128000"
                className="text-xs font-mono h-7"
              />
            </InputGroup>
          </div>
        </div>

        <DialogFooter className="px-3 py-2 border-t">
          <Button variant="outline" size="sm" className="h-6 text-xs" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button size="sm" className="h-6 text-xs" onClick={handleSave}>
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
