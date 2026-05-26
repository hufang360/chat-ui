import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from '../store'
import type { ModelMetadata } from '../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [editName, setEditName] = useState(model)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  useEffect(() => {
    if (open) { setEditName(model); setTimeout(() => inputRef.current?.focus(), 0) }
  }, [open, model])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  const currentMeta = useCallback((): ModelMetadata => {
    const provider = providers.find(p => p.id === providerId)
    return provider?.modelMetadata?.[model] || metadata
  }, [providers, providerId, model, metadata])

  const save = useCallback((newName: string, newMetadata: ModelMetadata) => {
    const provider = providers.find(p => p.id === providerId)
    if (!provider) return
    const trimmed = newName.trim()
    if (!trimmed) return

    const models = trimmed === model
      ? provider.models
      : provider.models.map(m => m === model ? trimmed : m)

    const currentMetadata = { ...provider.modelMetadata }
    if (trimmed !== model) delete currentMetadata[model]
    currentMetadata[trimmed] = newMetadata

    updateProvider(providerId, { models, modelMetadata: currentMetadata })
  }, [providers, providerId, model, updateProvider])

  const handleNameBlur = () => {
    if (editName.trim() && editName.trim() !== model) {
      save(editName, currentMeta())
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div ref={panelRef} className="relative bg-background rounded-lg shadow-lg border w-full mx-4 max-w-md">
        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">{t('modelName')}</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={handleNameBlur}
                className="h-7 text-xs font-mono"
                onKeyDown={e => { if (e.key === 'Enter') { handleNameBlur(); onClose() } }}
              />
              <Tooltip>
                <TooltipTrigger render={<Button
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      navigator.clipboard.writeText(editName)
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
                checked={currentMeta().supportsVision}
                onCheckedChange={(checked) => save(model, { ...currentMeta(), supportsVision: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="size-3 text-muted-foreground" />
                <span className="text-xs">{t('thinkingSupport')}</span>
              </div>
              <Switch
                checked={currentMeta().supportsThinking}
                onCheckedChange={(checked) => save(model, { ...currentMeta(), supportsThinking: checked })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
