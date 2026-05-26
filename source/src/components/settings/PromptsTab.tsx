import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from '../../store'
import { generateId } from '../../constants'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PromptImportDialog } from '../PromptImportDialog'
import { POPOVER_OFFSET } from '../../utils/settingsUtils'
import { Plus, Download, Upload, Lightbulb, GripVertical, X, ChevronLeft, ChevronRight } from 'lucide-react'

export interface PromptsTabProps {
  onShowPopoverConfirm: (x: number, y: number, onConfirm: () => void) => void
  promptImportInputRef: React.RefObject<HTMLInputElement | null>
}

export function PromptsTab({ onShowPopoverConfirm, promptImportInputRef }: PromptsTabProps) {
  const { uiConfig, addPrompt, deletePrompt, updatePrompt, reorderPrompts } = useStore()
  const { t } = useTranslation()

  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number | null>(null)
  const [draggedPromptIndex, setDraggedPromptIndex] = useState<number | null>(null)
  const [dragOverPromptIndex, setDragOverPromptIndex] = useState<number | null>(null)
  const [promptImportUrl, setPromptImportUrl] = useState('https://github.com/PlexPt/awesome-chatgpt-prompts-zh/blob/main/prompts-zh.json')
  const [promptImportDialogOpen, setPromptImportDialogOpen] = useState(false)
  const promptContentInputRef = useRef<HTMLTextAreaElement>(null)
  const dragGhostRef = useRef<HTMLElement | null>(null)
  const [mobileDetail, setMobileDetail] = useState(false)

  const prompts = uiConfig.prompts || []

  /** 解析 awesome-chatgpt-prompts 格式的 JSON（act/prompt 字段） */
  const importPromptsFromText = (content: string) => {
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed)) throw new Error(t('promptFileFormatError'))
    let importedCount = 0
    parsed.forEach((item: any) => {
      const name = typeof item.act === 'string' ? item.act.trim() : ''
      const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : ''
      if (!name || !prompt) return
      addPrompt({ id: generateId(), name, content: prompt })
      importedCount += 1
    })
    return importedCount
  }

  /** 从文件导入提示词 */
  const handleImportPromptsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const importedCount = importPromptsFromText(ev.target?.result as string)
        toast(importedCount > 0 ? t('promptsImported', { count: importedCount }) : t('noPromptsToImport'))
      } catch (error) {
        toast(t('promptImportFailed', { error: error instanceof Error ? error.message : 'Unknown error' }))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  /** 从 URL 导入提示词 */
  const handleImportPromptsFromUrl = async () => {
    if (!promptImportUrl.trim()) {
      toast(t('enterPromptUrl'))
      return
    }
    try {
      const url = promptImportUrl.trim()
        .replace('https://github.com/PlexPt/awesome-chatgpt-prompts-zh/blob/main/', 'https://raw.githubusercontent.com/PlexPt/awesome-chatgpt-prompts-zh/main/')
      const response = await fetch(url)
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      const importedCount = importPromptsFromText(await response.text())
      toast(importedCount > 0 ? t('promptsImported', { count: importedCount }) : t('noPromptsToImport'))
    } catch (error) {
      toast(t('urlImportFailed', { error: error instanceof Error ? error.message : 'Unknown error' }))
    }
  }

  /** 导出提示词为 JSON 文件 */
  const handleExportPrompts = () => {
    const exportData = prompts.map(p => ({ act: p.name, prompt: p.content }))
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-prompts-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
      {/* 提示词列表 */}
      <div className={`${mobileDetail ? 'hidden md:flex' : 'flex'} w-full md:w-44 border-b md:border-b-0 md:border-r p-3 flex-col overflow-hidden min-h-0 md:shrink-0`}>
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground">{t('promptList')}</Label>
          <Tooltip>
            <TooltipTrigger render={<Button size="icon" variant="ghost" className="size-5"
                onClick={() => {
                  const prompt = { id: generateId(), name: t('newPrompt'), content: '' }
                  addPrompt(prompt)
                  const newIndex = prompts.length
                  setSelectedPromptIndex(newIndex)
                  setMobileDetail(true)
                  requestAnimationFrame(() => promptContentInputRef.current?.focus())
                }}
            />}>
              <Plus data-icon className="size-3" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-2xs px-2 py-1">{t('addPrompt')}</TooltipContent>
          </Tooltip>
        </div>
        {/* 提示词列表 */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-1 mt-1">
          {prompts.map((prompt, index) => (
            <div key={prompt.id} className="group relative flex"
              onDragOver={(e) => { e.preventDefault(); setDragOverPromptIndex(index) }}
              onDragEnd={() => {
                if (draggedPromptIndex !== null && dragOverPromptIndex !== null && draggedPromptIndex !== dragOverPromptIndex) {
                  reorderPrompts(draggedPromptIndex, dragOverPromptIndex)
                }
                setDraggedPromptIndex(null); setDragOverPromptIndex(null)
                if (dragGhostRef.current) { document.body.removeChild(dragGhostRef.current); dragGhostRef.current = null }
              }}
            >
              <span className="absolute left-0.5 top-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover:opacity-100 z-10 hidden md:block"
                draggable
                onDragStart={(e) => {
                  e.stopPropagation(); setDraggedPromptIndex(index)
                  const row = (e.currentTarget as HTMLElement).closest('.group') as HTMLElement
                  if (row) {
                    const ghost = row.cloneNode(true) as HTMLElement
                    ghost.style.position = 'absolute'
                    ghost.style.top = '-9999px'
                    ghost.style.width = row.offsetWidth + 'px'
                    ghost.style.opacity = '0.85'
                    ghost.style.pointerEvents = 'none'
                    document.body.appendChild(ghost)
                    e.dataTransfer.setDragImage(ghost, 0, 0)
                    dragGhostRef.current = ghost
                  }
                }}
              >
                <GripVertical className="size-3 text-muted-foreground" />
              </span>
              <div className="flex-1 relative">
                <Button variant={selectedPromptIndex === index ? 'outline' : 'ghost'} size="sm"
                  className="w-full justify-start text-xs h-7 pr-6 truncate"
                  onClick={e => { e.stopPropagation(); setSelectedPromptIndex(index); setMobileDetail(true) }}
                ><span className="truncate">{prompt.name}</span>
                  <ChevronRight className="size-3 ml-auto opacity-50 md:hidden" />
                </Button>
              <Tooltip>
                <TooltipTrigger render={<button
                    onClick={(e) => {
                      e.stopPropagation()
                      onShowPopoverConfirm(e.clientX, e.clientY + POPOVER_OFFSET, () => {
                        deletePrompt(prompt.id)
                        if (selectedPromptIndex === index) setSelectedPromptIndex(null)
                      })
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-destructive p-1"
                />}>
                  <X className="size-3" />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-2xs px-2 py-1">{t('deletePrompt')}</TooltipContent>
              </Tooltip>
              </div>
            </div>
          ))}
          {prompts.length === 0 && (
            <p className="text-2xs text-muted-foreground text-center py-2">{t('noPrompts')}</p>
          )}
        </div>
        {/* 导入/导出提示词 */}
        <div className="shrink-0 flex flex-col gap-2 pt-2 border-t">
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="flex-1 h-6 text-2xs" onClick={() => setPromptImportDialogOpen(true)}>
              <Upload data-icon="inline-start" className="size-2.5 mr-0.5" />{t('import')}
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-6 text-2xs" onClick={handleExportPrompts}>
              <Download data-icon="inline-start" className="size-2.5 mr-0.5" />{t('export')}
            </Button>
          </div>
        </div>
      </div>

      {/* 提示词编辑区 */}
      <div className={`${!mobileDetail ? 'hidden md:flex' : 'flex'} flex-1 p-4 overflow-y-auto flex-col`}>
        {/* 移动端返回按钮 */}
        {selectedPromptIndex !== null && prompts[selectedPromptIndex] && (
          <div className="md:hidden mb-3">
            <Button size="icon" variant="ghost" className="size-6" onClick={() => setMobileDetail(false)}>
              <ChevronLeft data-icon className="size-3" />
            </Button>
          </div>
        )}
        {selectedPromptIndex !== null && prompts[selectedPromptIndex] ? (
          <div className="flex flex-col gap-4">
            <div>
              <Input value={prompts[selectedPromptIndex]?.name || ''}
                onChange={e => updatePrompt(prompts[selectedPromptIndex].id, { name: e.target.value })}
                className="h-8 text-xs" placeholder={t('promptName')}
              />
            </div>
            <div>
              <Textarea ref={promptContentInputRef}
                value={prompts[selectedPromptIndex]?.content || ''}
                onChange={e => updatePrompt(prompts[selectedPromptIndex].id, { content: e.target.value })}
                placeholder={t('enterPromptContent')} rows={20} className="text-xs"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Lightbulb className="size-8 mb-2 opacity-50" />
            <p className="text-xs">{t('selectPromptToEdit')}</p>
          </div>
        )}
      </div>

      {/* 提示词导入弹窗 */}
      <PromptImportDialog
        open={promptImportDialogOpen}
        importUrl={promptImportUrl}
        onOpenChange={setPromptImportDialogOpen}
        onUrlChange={setPromptImportUrl}
        onFileImport={() => promptImportInputRef.current?.click()}
        onUrlImport={handleImportPromptsFromUrl}
      />

      {/* Hidden file input */}
      <input ref={promptImportInputRef as React.Ref<HTMLInputElement>} type="file" accept=".json" className="hidden" onChange={handleImportPromptsFile} />
    </div>
  )
}
