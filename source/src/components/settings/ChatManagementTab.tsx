import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from '../../store'
import type { Conversation } from '../../types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Upload, Download, RotateCcw, Eraser, Info } from 'lucide-react'
import { Textarea } from '../ui/textarea'

export interface ChatManagementTabProps {
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void
  onClose?: () => void
}

export function ChatManagementTab({ onShowConfirm, onClose }: ChatManagementTabProps) {
  const { t } = useTranslation()
  const conversations = useStore(s => s.conversations)
  const globalSystemPrompt = useStore(s => s.globalSystemPrompt)
  const setGlobalSystemPrompt = useStore(s => s.setGlobalSystemPrompt)
  const uiConfig = useStore(s => s.uiConfig)
  const setUIConfig = useStore(s => s.setUIConfig)
  const chatJsonInputRef = useRef<HTMLInputElement>(null)
  const chatJsonReplaceInputRef = useRef<HTMLInputElement>(null)

  // 导出所有对话为 JSON
  const handleExport = () => {
    const data = {
      version: '1.0',
      type: 'chat_sessions',
      exportTime: new Date().toISOString(),
      conversations,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-sessions-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 导入对话 JSON（合并到现有对话中）
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string
        const data = JSON.parse(content)
        if (!Array.isArray(data.conversations)) throw new Error(t('invalidDataFormat'))
        const imported: Conversation[] = data.conversations
        const existing = useStore.getState().conversations
        // 合并：保留现有对话，追加导入的对话（跳过重复 ID）
        const existingIds = new Set(existing.map(c => c.id))
        const newConvs = imported.filter(c => !existingIds.has(c.id))
        useStore.setState({
          conversations: [...newConvs, ...existing],
        })
        toast.success(t('chatImported', { count: newConvs.length }))
      } catch (error) {
        toast.error(t('chatImportFailed', { error: error instanceof Error ? error.message : '' }))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // 导入对话 JSON（先清空再导入）
  const handleImportJsonReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onShowConfirm(t('importReplaceTitle'), t('importReplaceContent'), () => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const content = ev.target?.result as string
          const data = JSON.parse(content)
          if (!Array.isArray(data.conversations)) throw new Error(t('invalidDataFormat'))
          useStore.setState({
            conversations: data.conversations,
            currentConversationId: data.conversations[0]?.id || null,
          })
          toast.success(t('chatImported', { count: data.conversations.length }))
        } catch (error) {
          toast.error(t('chatImportFailed', { error: error instanceof Error ? error.message : '' }))
        }
      }
      reader.readAsText(file)
    })
    e.target.value = ''
  }

  // 清理空对话
  const handleCleanEmptyChats = () => {
    const emptyIds = conversations.filter(c => c.messages.length === 0).map(c => c.id)
    if (emptyIds.length === 0) { toast.info(t('noEmptyChats')); return }
    const currentId = useStore.getState().currentConversationId
    const remaining = conversations.filter(c => c.messages.length > 0)
    useStore.setState({
      conversations: remaining,
      currentConversationId: remaining.length > 0
        ? (emptyIds.includes(currentId!) ? remaining[0].id : currentId)
        : null,
    })
    toast.success(t('emptyChatsCleaned', { count: emptyIds.length }))
    onClose?.()
  }

  // 清空所有对话
  const handleReset = () => {
    onShowConfirm(t('resetChatsTitle'), t('resetChatsContent'), () => {
      useStore.setState({ conversations: [], currentConversationId: null })
    })
  }

  return (
    <div className="p-4 overflow-y-auto flex flex-col gap-4 flex-1 min-h-0">
      {/* 默认系统提示词 */}
      <div className='gap-1.5'>
        <Label className="text-xs text-muted-foreground">{t('defaultPrompt')}</Label>
        <Textarea value={globalSystemPrompt} onChange={e => setGlobalSystemPrompt(e.target.value)}
          placeholder={t('defaultPromptPlaceholder')} rows={3} className="text-xs resize-none"
        />
      </div>

      {/* 注入默认元数据 */}
      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <Checkbox checked={uiConfig.injectMetadata !== false}
            onCheckedChange={checked => setUIConfig({ injectMetadata: !!checked })}
          />{t('injectMetadata')}
        </label>
        <p className="text-2xs text-muted-foreground">{t('injectMetadataDesc')}</p>
      </div>

      {/* 对话气泡 */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <Label className="text-xs text-muted-foreground">{t('chatBubble')}</Label>
          <Popover>
            <PopoverTrigger render={(props) => (
              <Button {...props} size="icon" variant="ghost" className="size-4" aria-label={t('chatBubbleRules')}><Info className="size-3" /></Button>
            )} />
            <PopoverContent side="right" align="start" className="w-72 text-xs leading-relaxed p-3">
              <div className="flex flex-col gap-2">
                <p className="font-medium">{t('chatBubbleRules')}</p>
                <ul className="list-disc pl-4 text-muted-foreground flex flex-col gap-1">
                  <li>{t('chatBubbleRule1')}</li>
                  <li>{t('chatBubbleRule2')}</li>
                  <li>{t('chatBubbleRule3')}</li>
                  <li>{t('chatBubbleRule4')}</li>
                  <li>{t('chatBubbleRule5')}</li>
                </ul>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs cursor-pointer">
            <Checkbox checked={uiConfig.autoCollapseCode || false}
              onCheckedChange={checked => setUIConfig({ autoCollapseCode: !!checked })}
            />{t('autoCollapseCode')}
          </label>
          <label className="flex items-center gap-1 text-xs cursor-pointer">
            <Checkbox checked={uiConfig.autoHideThinking || false}
              onCheckedChange={checked => setUIConfig({ autoHideThinking: !!checked })}
            />{t('autoHideThinking')}
          </label>
        </div>
      </div>



      {/* 生成对话名称 */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">{t('generateTopicName')}</Label>
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1 cursor-pointer">
            <Checkbox checked={uiConfig.autoGenerateTopicName || false}
              onCheckedChange={checked => setUIConfig({ autoGenerateTopicName: !!checked })}
            />{t('autoGenerateTopicName')}
          </label>
          <select
            className="h-7 text-xs bg-background border rounded px-1.5"
            value={uiConfig.topicNameCount}
            onChange={e => setUIConfig({ topicNameCount: Number(e.target.value) as 3 | 6 | 9 })}
          >
            <option value={3}>{t('topicNameCount3')}</option>
            <option value={6}>{t('topicNameCount6')}</option>
            <option value={9}>{t('topicNameCount9')}</option>
          </select>
          <select
            className="h-7 text-xs bg-background border rounded px-1.5"
            value={uiConfig.topicNameStyle}
            onChange={e => setUIConfig({ topicNameStyle: e.target.value as 'normal' | 'emoji' | 'prompt' })}
          >
            <option value="normal">{t('topicNameStyleNormal')}</option>
            <option value="emoji">{t('topicNameStyleEmoji')}</option>
            <option value="prompt">{t('topicNameStylePrompt')}</option>
          </select>
        </div>
        <p className="text-2xs text-muted-foreground">{t('autoGenerateTopicNameDesc')}</p>
      </div>

      {/* 数据管理 */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">{t('chatManagement')}</Label>
        <p className="text-xs text-muted-foreground">
          {t('chatStatsDetail', { count: conversations.length, messages: conversations.reduce((n, c) => n + c.messages.length, 0) })}
        </p>


        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger render={(props) => (
              <Button {...props} variant="outline" size="sm" onClick={() => chatJsonReplaceInputRef.current?.click()} className="h-7 text-xs">
                <Upload data-icon="inline-start" className="size-3 mr-1" />{t('importReplace')}
              </Button>
            )} />
            <TooltipContent side="bottom" className="text-2xs px-2 py-1">{t('importReplaceDesc')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={(props) => (
              <Button {...props} variant="outline" size="sm" onClick={handleReset} className="h-7 text-xs">
                <RotateCcw data-icon="inline-start" className="size-3 mr-1" />{t('resetChats')}
              </Button>
            )} />
            <TooltipContent side="bottom" className="text-2xs px-2 py-1">{t('resetChatsDesc')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={(props) => (
              <Button {...props} variant="outline" size="sm" onClick={handleExport} className="h-7 text-xs">
                <Download data-icon="inline-start" className="size-3 mr-1" />{t('exportChats')}
              </Button>
            )} />
            <TooltipContent side="bottom" className="text-2xs px-2 py-1">{t('exportChatsDesc')}</TooltipContent>
          </Tooltip>
          <input ref={chatJsonInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJson} />
          <input ref={chatJsonReplaceInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJsonReplace} />
          <div className="w-px h-4 bg-border" />
          <Tooltip>
            <TooltipTrigger render={(props) => (
              <Button {...props} variant="outline" size="sm" onClick={handleCleanEmptyChats} className="h-7 text-xs w-fit">
                <Eraser data-icon="inline-start" className="size-3 mr-1" />{t('cleanEmptyChats')}
              </Button>
            )} />
            <TooltipContent side="bottom" className="text-2xs px-2 py-1">{t('cleanEmptyChatsDesc')}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
