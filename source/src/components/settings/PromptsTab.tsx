import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from '../../store'
import { DEFAULT_PROMPTS } from '../../constants'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { POPOVER_OFFSET } from '../../utils/settingsUtils'
import { Plus, Download, Upload, Lightbulb, GripVertical, ChevronLeft, ChevronRight, Trash2, RotateCcw, Info, Hash } from 'lucide-react'

export interface PromptsTabProps {
  onShowPopoverConfirm: (x: number, y: number, onConfirm: () => void) => void
  promptImportInputRef: React.RefObject<HTMLInputElement | null>
}

export function PromptsTab({ onShowPopoverConfirm, promptImportInputRef }: PromptsTabProps) {
  const { uiConfig, addPrompt, deletePrompt, updatePrompt, reorderPrompts, setUIConfig } = useStore()
  const { t } = useTranslation()

  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number | null>(null)
  const [draggedPromptIndex, setDraggedPromptIndex] = useState<number | null>(null)
  const [dragOverPromptIndex, setDragOverPromptIndex] = useState<number | null>(null)
  const promptContentInputRef = useRef<HTMLTextAreaElement>(null)
  const promptNameInputRef = useRef<HTMLInputElement>(null)
  const dragGhostRef = useRef<HTMLElement | null>(null)
  const [mobileDetail, setMobileDetail] = useState(false)
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null)
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)
  const [promptIdError, setPromptIdError] = useState(false)

  // 切换编辑名称时自动聚焦
  useEffect(() => {
    if (editingNameIndex !== null) promptNameInputRef.current?.focus()
  }, [editingNameIndex])

  const prompts = uiConfig.prompts || []

  const generateShortId = () => Math.random().toString(36).slice(2, 8)

  /** 解析 awesome-chatgpt-prompts 格式的 JSON（act/prompt 字段） */
  const importPromptsFromText = (content: string) => {
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed)) throw new Error(t('promptFileFormatError'))
    let importedCount = 0
    parsed.forEach((item: any) => {
      const name = typeof item.act === 'string' ? item.act.trim() : ''
      const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : ''
      if (!name || !prompt) return
      addPrompt({ id: generateShortId() + '-' + importedCount, name, content: prompt })
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
        toast.success(importedCount > 0 ? t('promptsImported', { count: importedCount }) : t('noPromptsToImport'))
      } catch (error) {
        toast.error(t('promptImportFailed', { error: error instanceof Error ? error.message : 'Unknown error' }))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
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
            <TooltipTrigger render={(props) => (
              <Button {...props} size="icon" variant="ghost" className="size-5"
                onClick={() => {
                  const prompt = { id: generateShortId(), name: t('newPrompt'), content: '' }
                  addPrompt(prompt)
                  const newIndex = prompts.length
                  setSelectedPromptIndex(newIndex)
                  setMobileDetail(true)
                  requestAnimationFrame(() => promptContentInputRef.current?.focus())
                }}
              >
                <Plus className="size-3" />
              </Button>
            )} />
            <TooltipContent side="top" className="text-2xs px-2 py-1">{t('addPrompt')}</TooltipContent>
          </Tooltip>
        </div>
        {/* 提示词列表 */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-1 mt-1">
          {prompts.map((prompt, index) => (
            <div key={index} className="group relative flex"
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
              <div className="flex-1 relative flex items-center">
                <Button variant={selectedPromptIndex === index ? 'outline' : 'ghost'} size="sm"
                  className="flex-1 justify-start text-xs h-7 pr-1 truncate"
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedPromptIndex(index); setMobileDetail(true) }}
                >
                  <span className="truncate">{prompt.name}</span>
                  <ChevronRight className="size-3 ml-auto shrink-0 opacity-50 md:hidden" />
                </Button>
              </div>
            </div>
          ))}
          {prompts.length === 0 && (
            <p className="text-2xs text-muted-foreground text-center py-2">{t('noPrompts')}</p>
          )}
        </div>
        {/* 导入/导出 */}
        <div className="shrink-0 flex flex-col gap-1 pt-2 border-t">
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="flex-1 h-6 text-2xs"
              onClick={() => promptImportInputRef.current?.click()}
            >
              <Upload data-icon="inline-start" className="size-2.5 mr-0.5" />{t('import')}
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-6 text-2xs" onClick={handleExportPrompts}>
              <Download data-icon="inline-start" className="size-2.5 mr-0.5" />{t('export')}
            </Button>
          </div>
          <Button size="sm" variant="outline" className="w-full h-6 text-2xs" onClick={(e: React.MouseEvent) => {
            onShowPopoverConfirm(e.clientX, e.clientY + POPOVER_OFFSET, () => {
              setUIConfig({ prompts: DEFAULT_PROMPTS })
              setSelectedPromptIndex(null)
            })
          }}>
            <RotateCcw data-icon="inline-start" className="size-2.5 mr-0.5" />{t('reset')}
          </Button>
        </div>
      </div>

      {/* 提示词编辑区 */}
      <div className={`${!mobileDetail ? 'hidden md:flex' : 'flex'} flex-1 p-4 overflow-hidden flex-col`}>
        {/* 移动端返回按钮 */}
        {selectedPromptIndex !== null && prompts[selectedPromptIndex] && (
          <div className="md:hidden mb-3">
            <Button size="icon" variant="ghost" className="size-6" onClick={() => setMobileDetail(false)}>
              <ChevronLeft data-icon className="size-3" />
            </Button>
          </div>
        )}
        {selectedPromptIndex !== null && prompts[selectedPromptIndex] ? (
          <div className="flex flex-col gap-3 min-h-0 flex-1">
            {/* 提示词头部：名称 + 删除 */}
            <div className="flex items-center justify-between shrink-0">
              {editingNameIndex === selectedPromptIndex ? (
                <Input
                  ref={promptNameInputRef}
                  className="h-6 text-xs font-medium px-1 py-0 w-40"
                  value={prompts[selectedPromptIndex].name}
                  onChange={e => updatePrompt(prompts[selectedPromptIndex].id, { name: e.target.value })}
                  onBlur={() => setEditingNameIndex(null)}
                  onKeyDown={e => { if (e.key === 'Enter') setEditingNameIndex(null) }}
                  autoComplete="off"
                />
              ) : (
                <h3 className="text-xs font-medium cursor-pointer" onClick={() => setEditingNameIndex(selectedPromptIndex)}>
                  {prompts[selectedPromptIndex].name}
                </h3>
              )}
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger render={(props) => (
                    <Button {...props} size="icon" variant="ghost" className="size-6 hover:text-destructive"
                      onClick={(e: React.MouseEvent) => {
                        onShowPopoverConfirm(e.clientX, e.clientY + POPOVER_OFFSET, () => {
                          const targetIndex = selectedPromptIndex > 0 ? selectedPromptIndex - 1 : prompts.length > 1 ? 1 : -1
                          deletePrompt(prompts[selectedPromptIndex].id)
                          setSelectedPromptIndex(targetIndex >= 0 ? targetIndex : null)
                          if (targetIndex < 0) setMobileDetail(false)
                        })
                      }}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )} />
                  <TooltipContent side="top" className="text-2xs px-2 py-1">{t('deletePrompt')}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* 提示词id */}
            <div className="shrink-0">
              <div className="flex items-center mb-1">
                <Label className="text-xs text-muted-foreground">{t('promptId')}</Label>
                <Tooltip>
                  <TooltipTrigger render={(props) => (
                    <Button {...props} size="icon" variant="ghost" className="size-5">
                      <Info className="size-3 text-muted-foreground/50" />
                    </Button>
                  )} />
                  <TooltipContent side="top" className="text-2xs px-2 py-1 max-w-48">{t('promptIdPlaceholder')}</TooltipContent>
                </Tooltip>
                {prompts[selectedPromptIndex]?.id && (
                  <Tooltip>
                    <TooltipTrigger render={(props) => (
                      <Button {...props} size="icon" variant="ghost" className="size-5"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.origin + window.location.pathname + '#prompt=' + prompts[selectedPromptIndex].id)
                          toast.success(t('hashParamsCopied'))
                        }}
                      >
                        <Hash className="size-3 text-muted-foreground/50" />
                      </Button>
                    )} />
                    <TooltipContent side="top" className="text-2xs px-2 py-1">{t('copyHashUrl')}</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <Input value={editingPromptId ?? prompts[selectedPromptIndex]?.id ?? ''}
                onChange={e => {
                  const value = e.target.value
                  if (!/^[a-zA-Z0-9-]*$/.test(value)) return
                  const promptId = prompts[selectedPromptIndex].id
                  setEditingPromptId(value)
                  setPromptIdError(value !== '' && value !== promptId && prompts.some(p => p.id === value))
                }}
                onFocus={() => setEditingPromptId(prompts[selectedPromptIndex]?.id ?? '')}
                onBlur={e => {
                  const value = e.target.value
                  const currentPrompts = useStore.getState().uiConfig.prompts || []
                  const prompt = currentPrompts.find(p => p.id === editingPromptId || p.id === prompts[selectedPromptIndex]?.id)
                  if (!prompt) { setEditingPromptId(null); setPromptIdError(false); return }
                  if (!value) { setEditingPromptId(null); setPromptIdError(false); return }
                  if (currentPrompts.some(p => p.id === value && p.id !== prompt.id)) {
                    const newId = value + '-' + Math.random().toString(36).slice(2, 8)
                    updatePrompt(prompt.id, { id: newId })
                    toast.info(t('promptIdAutoFixed', { id: newId }))
                  } else {
                    updatePrompt(prompt.id, { id: value })
                  }
                  setEditingPromptId(null)
                  setPromptIdError(false)
                }}
                className={`h-6 text-2xs ${promptIdError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                placeholder={t('promptIdPlaceholder')}
              />
            </div>

            {/* 提示词 */}
            <div className="flex flex-col min-h-0 flex-1">
              <div className="flex items-center justify-between shrink-0 mb-1">
                <Label className="text-xs text-muted-foreground">{t('promptContent')}</Label>
                <span className="text-2xs text-muted-foreground/50">{prompts[selectedPromptIndex]?.content?.length || 0}</span>
              </div>
              <Textarea ref={promptContentInputRef}
                value={prompts[selectedPromptIndex]?.content || ''}
                onChange={e => updatePrompt(prompts[selectedPromptIndex].id, { content: e.target.value })}
                placeholder={t('enterPromptContent')} className="text-xs flex-1 min-h-0 resize-none"
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

      {/* Hidden file input */}
      <input ref={promptImportInputRef as React.Ref<HTMLInputElement>} type="file" accept=".json" className="hidden" onChange={handleImportPromptsFile} />
    </div>
  )
}
