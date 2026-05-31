import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from '../store'
import type { Message, Conversation } from '../types'
import type { ImageFile } from '../hooks/useChat'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu'
import { ConversationMenuItems } from './ConversationMenuItems'
import { getTopicNamePrompt } from '../constants.base'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { chatCompletion } from '../api'
import { CodeBlock } from './CodeBlock'
import { MessageItem } from './MessageItem'
import { MemoizedMarkdown } from './MemoizedMarkdown'
import {
  Send,
  Square,
  Image as ImageIcon,
  Edit2,
  Check,
  X,
  Lightbulb,
  Copy,
  FoldHorizontal,
  UnfoldHorizontal,
  Search,
  Trash2,
  Eye,
  LightbulbOff,
  SwatchBook,
  Cpu,
  Bot,
  Globe,
  Settings,
  Sidebar,
  Ellipsis,
} from 'lucide-react'

// ── 输入工具栏子组件 ──

function ModelSelect({
  open, onOpenChange, modelGroups, selectedModel, isLoading, onSelect, t,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  modelGroups: { provider: string; providerName: string; models: { id: string; capability?: { supportsVision?: boolean; supportsThinking?: boolean } }[] }[]
  selectedModel: string
  isLoading: boolean
  onSelect: (id: string) => void
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const [search, setSearch] = useState('')
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={(props) => (
        <Button {...props} size="sm" variant="outline" className="h-7" disabled={isLoading} title={t('selectModel')}>
          {selectedModel || t('selectModel')}
        </Button>
      )} />
      <PopoverContent side="top" align="start" className="w-80 p-0 z-50" sideOffset={8}>
        <div className="p-1.5 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchModel')} className="pl-7 h-6 text-xs" aria-label={t('searchModel')} autoFocus
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  const first = document.querySelector('[data-model-item]') as HTMLElement | null
                  first?.focus()
                }
              }}
            />
          </div>
        </div>
        <div className="overflow-y-auto max-h-[400px]">
          {modelGroups.length === 0 ? (
            <div className="px-3 py-4 text-center text-2xs text-muted-foreground">{t('noAvailableModels')}</div>
          ) : (
            <div>
              {modelGroups.map(group => {
                const filtered = group.models.filter(m => m.id.toLowerCase().includes(search.toLowerCase()))
                if (filtered.length === 0) return null
                return (
                  <div key={group.provider}>
                    <div className="px-2.5 py-1 text-2xs text-muted-foreground font-medium bg-muted/50">{group.providerName}</div>
                    {filtered.map(model => (
                      <div key={model.id} data-model-item tabIndex={0}
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs hover:bg-accent cursor-pointer focus:bg-accent focus-visible:ring-1 focus-visible:ring-ring ${selectedModel === model.id ? 'bg-accent' : ''}`}
                        onClick={() => onSelect(model.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { onSelect(model.id) }
                          else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            e.preventDefault()
                            const items = [...document.querySelectorAll('[data-model-item]')] as HTMLElement[]
                            const idx = items.indexOf(e.currentTarget)
                            const next = e.key === 'ArrowDown' ? items[idx + 1] : items[idx - 1]
                            next?.focus()
                          }
                        }}
                      >
                        <span className="flex-1 truncate">{model.id}</span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {model.capability?.supportsVision && <Eye className="size-2.5 text-capability-vision" />}
                          {model.capability?.supportsThinking && <Lightbulb className="size-2.5 text-capability-thinking" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function PromptsMenu({
  open, onOpenChange, prompts, disabled, onSelect, t,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  prompts: { id: string; name: string; content: string }[]
  disabled: boolean
  onSelect: (content: string) => void
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [search, setSearch] = useState('')
  const filtered = prompts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  return (
    <>
      <Tooltip>
        <TooltipTrigger render={(props) => (
          <Button {...props} ref={btnRef} size="icon" variant="outline" className="size-7 shrink-0" disabled={disabled}
            onClick={() => onOpenChange(!open)} aria-label={t('prompts')}
          >
            <SwatchBook className="size-3" />
          </Button>
        )} />
        <TooltipContent side="top" className="text-2xs px-2 py-1">{t('prompts')}</TooltipContent>
      </Tooltip>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverContent anchor={btnRef} side="top" align="start" className="w-52 p-0 z-50" sideOffset={8}>
          <div className="p-1.5 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchPrompt')} className="pl-7 h-6 text-xs" aria-label={t('searchPrompt')} autoFocus />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[200px]">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-2xs text-muted-foreground">{t('noMatchingPrompts')}</div>
            ) : (
              filtered.map(prompt => (
                <div key={prompt.id} className="px-2.5 py-1.5 text-xs hover:bg-accent cursor-pointer"
                  onClick={() => { onSelect(prompt.content); onOpenChange(false); setSearch(''); toast.success(t('promptSet', { name: prompt.name })) }}
                ><span className="truncate">{prompt.name}</span></div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  )
}

function ThinkingMenu({
  open, onOpenChange, enabled, level, supportsThinking, isLoading, onToggle, t,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  enabled: boolean
  level: 'low' | 'medium' | 'high'
  supportsThinking: boolean
  isLoading: boolean
  onToggle: (enabled: boolean, level?: 'low' | 'medium' | 'high') => void
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const levels = [
    { key: 'off' as const, enabled: false, level: undefined as undefined },
    { key: 'low' as const, enabled: true, level: 'low' as const },
    { key: 'medium' as const, enabled: true, level: 'medium' as const },
    { key: 'high' as const, enabled: true, level: 'high' as const },
  ]
  const isActive = (l: typeof levels[number]) => !l.enabled ? !enabled : (enabled && level === l.level)
  return (
    <>
      <Tooltip>
        <TooltipTrigger render={(props) => (
          <Button {...props} ref={btnRef} size="icon" variant="outline" className="size-7 shrink-0"
            disabled={isLoading || !supportsThinking}
            onClick={() => onOpenChange(!open)} aria-label={t('thinkingProcess')}
          >
            {!enabled ? (
              <LightbulbOff className="size-3" />
            ) : level === 'low' ? (
              <Lightbulb className="size-3 text-systemPrompt" />
            ) : (
              <Lightbulb className="size-3 text-systemPrompt fill-systemPrompt" />
            )}
          </Button>
        )} />
        <TooltipContent side="top" className="text-2xs px-2 py-1">{t('thinkingProcess')}</TooltipContent>
      </Tooltip>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverContent anchor={btnRef} side="top" align="center" className="w-24 p-1 z-50" sideOffset={8}>
          <div className="flex flex-col gap-0.5" role="menu">
            {levels.map(l => (
              <button key={l.key} role="menuitem"
                onClick={() => { onToggle(l.enabled, l.level); onOpenChange(false) }}
                className={`w-full px-2 py-1.5 text-xs text-left rounded hover:bg-accent transition-colors ${isActive(l) ? 'bg-accent' : ''}`}
              >{t(l.key)}</button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </>
  )
}

export interface ChatAreaProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onShowPopoverConfirm: (x: number, y: number, onConfirm: () => void) => void
  onToggleChatWidth: () => void
  chatWidth: 'compact' | 'full'
  fontSize: 'xs' | 'base' | 'xl'
  autoCollapseCode: boolean
  autoHideThinking: boolean
  onShowSettings: () => void
  isLoading: boolean
  streamingContent: string
  streamingThinking: string
  sendMessage: (content: string, imageDataUrls: string[], thinkingEnabled?: boolean, thinkingLevel?: 'low' | 'medium' | 'high') => Promise<boolean>
  stopGeneration: () => void
  regenerate: (messageIndex: number, thinkingEnabled?: boolean, thinkingLevel?: 'low' | 'medium' | 'high') => Promise<boolean>
  onThemeToggle?: () => void
  themeIcon?: React.ReactNode
  currentTheme?: 'light' | 'dark' | 'system'
  pendingText?: string | null
  autoSend?: boolean
  onPendingTextConsumed?: () => void
  onAutoSendConsumed?: () => void
  editingTitle?: boolean
  onEditingTitleDone?: () => void
}

export function ChatArea({
  sidebarOpen,
  onToggleSidebar,
  onShowPopoverConfirm,
  onToggleChatWidth,
  chatWidth,
  fontSize,
  autoCollapseCode,
  autoHideThinking,
  onShowSettings,
  isLoading,
  streamingContent,
  streamingThinking,
  sendMessage,
  stopGeneration,
  regenerate,
  onThemeToggle,
  themeIcon,
  currentTheme,
  pendingText,
  autoSend,
  onPendingTextConsumed,
  onAutoSendConsumed,
  editingTitle,
  onEditingTitleDone,
}: ChatAreaProps) {
  const currentConversationId = useStore(s => s.currentConversationId)
  const providers = useStore(s => s.providers)
  const apiKeys = useStore(s => s.apiKeys)
  const selectedModel = useStore(s => s.selectedModel)
  const globalSystemPrompt = useStore(s => s.globalSystemPrompt)
  const uiConfig = useStore(s => s.uiConfig)
  const getCurrentConversation = useStore(s => s.getCurrentConversation)
  const getProvider = useStore(s => s.getProvider)
  const getApiKey = useStore(s => s.getApiKey)
  const updateMessage = useStore(s => s.updateMessage)
  const deleteMessage = useStore(s => s.deleteMessage)
  const setSelectedModel = useStore(s => s.setSelectedModel)
  const setGlobalSystemPrompt = useStore(s => s.setGlobalSystemPrompt)
  const setConversationSystemPrompt = useStore(s => s.setConversationSystemPrompt)
  const setLanguage = useStore(s => s.setLanguage)
  const clearMessages = useStore(s => s.clearMessages)
  const createConversation = useStore(s => s.createConversation)
  const duplicateConversation = useStore(s => s.duplicateConversation)

  const [images, setImages] = useState<ImageFile[]>([])
  const [hasInput, setHasInput] = useState(false)
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  // IME 输入法组合状态（用 ref 避免触发重渲染，保证输入流畅）
  const isComposingRef = useRef(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [titleEditValue, setTitleEditValue] = useState('')
  const [editingSystemPrompt, setEditingSystemPrompt] = useState(false)
  const [systemPromptEdit, setSystemPromptEdit] = useState('')
  const [promptMenuOpen, setPromptMenuOpen] = useState(false)

  // 大量消息优化：只渲染最近 N 条，顶部提供"加载更多"
  const MESSAGE_BATCH_SIZE = 50
  const [visibleCount, setVisibleCount] = useState(MESSAGE_BATCH_SIZE)

  // 消费 URL hash 传入的预填充文本
  useEffect(() => {
    if (pendingText) {
      if (inputRef.current) inputRef.current.value = pendingText
      onPendingTextConsumed?.()
      if (autoSend) {
        onAutoSendConsumed?.()
        setTimeout(() => sendMessage(pendingText, []), 100)
      } else {
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }
  }, [pendingText])

  // 原生 input 事件监听，用于同步 hasInput 状态（不干扰 IME 合成）
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const handler = () => setHasInput(el.value.trim().length > 0)
    el.addEventListener('input', handler)
    handler()
    return () => el.removeEventListener('input', handler)
  }, [])
  const [thinkingEnabled, setThinkingEnabled] = useState(false)
  const [thinkingLevel, setThinkingLevel] = useState<'low' | 'medium' | 'high'>('medium')
  const [thinkingMenuOpen, setThinkingMenuOpen] = useState(false)
  const [streamingThinkingExpanded, setStreamingThinkingExpanded] = useState(!autoHideThinking)
  const [expandedThinkingIds, setExpandedThinkingIds] = useState<Set<string>>(new Set())
  const [expandedErrorIds, setExpandedErrorIds] = useState<Set<string>>(new Set())
  const [modelSelectOpen, setModelSelectOpen] = useState(false)

  const { t } = useTranslation()

  const getThemeLabel = () => {
    if (currentTheme === 'system') return t('themeAuto')
    if (currentTheme === 'light') return t('themeLight')
    return t('themeDark')
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const topBarRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  const currentConversation = getCurrentConversation()
  const provider = getProvider()

  // 从侧边栏双击触发标题编辑
  useEffect(() => {
    if (editingTitle && currentConversation) {
      setTitleEditValue(currentConversation.title)
      setEditingId('title')
      onEditingTitleDone?.()
    }
  }, [editingTitle])

  const fontSizeClass = {
    xs: 'text-2xs',
    base: 'text-xs',
    xl: 'text-base',
  }[fontSize]

  // 按供应商分组可用模型，仅展示已配置 API Key 或本地供应商的模型
  const modelGroups = useMemo(() => {
    return providers
      .filter(p => {
        if (p.disabled) return false
        // 本地供应商（ollama、lmstudio）或允许空 API Key 的供应商不需要 API Key
        const isLocalProvider = p.apiType === 'ollama' || p.id === 'lmstudio'
        const apiKey = apiKeys[p.id]
        const hasApiKey = apiKey && apiKey.trim() !== ''
        const hasBaseUrl = p.baseUrl && p.baseUrl.trim() !== ''
        return (hasApiKey || isLocalProvider || p.allowEmptyApiKey) && hasBaseUrl
      })
      .map(p => ({
        provider: p.id,
        providerName: p.name,
        models: p.models.map(modelId => ({
          id: modelId,
          capability: p.modelMetadata?.[modelId] ? {
            supportsVision: p.modelMetadata[modelId].supportsVision,
            supportsThinking: p.modelMetadata[modelId].supportsThinking,
          } : undefined,
        })),
      }))
      .filter(g => g.models.length > 0)
  }, [providers, apiKeys])

  const selectedModelProvider = providers.find(p => p.models.includes(selectedModel))
  const selectedModelMetadata = selectedModelProvider?.modelMetadata?.[selectedModel]
  const selectedModelSupportsVision = selectedModelMetadata?.supportsVision || false
  const selectedModelSupportsThinking = selectedModelMetadata?.supportsThinking || false

  // 滚动到底部（用 scrollTo 替代 scrollIntoView，避免容器 padding 导致多余空白）
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const container = scrollContainerRef.current
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior })
    }
  }, [])

  // 监听滚动位置，判断用户是否在底部（距底部 50px 内）
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => container.removeEventListener('scroll', handleScroll)
  }, [currentConversationId])

  // 消息列表更新或流式内容变化时，仅在用户已在底部时自动滚动
  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom('smooth')
    }
  }, [currentConversation?.messages, streamingContent, scrollToBottom])

  // 切换对话时，重置可见消息数并强制滚动到底部
  useEffect(() => {
    setVisibleCount(MESSAGE_BATCH_SIZE)
    isAtBottomRef.current = true
    requestAnimationFrame(() => {
      scrollToBottom()
    })
  }, [currentConversationId, scrollToBottom])

  useEffect(() => {
    inputRef.current?.focus()
  }, [currentConversationId])

  // 自动生成对话名：AI 首次回复完成后，若标题仍为默认值则自动生成
  const prevLoadingRef = useRef(isLoading)
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading && uiConfig.autoGenerateTopicName) {
      const conv = getCurrentConversation()
      if (conv && conv.messages.length >= 2) {
        const lastMsg = conv.messages[conv.messages.length - 1]
        if (lastMsg.isError) { prevLoadingRef.current = isLoading; return }
        const defaultTitle = t('newConversation')
        if (conv.title === defaultTitle || !conv.title) {
          handleGenerateTopicName()
        }
      }
    }
    prevLoadingRef.current = isLoading
  }, [isLoading])

  const handleSend = async () => {
    if (isLoading) {
      stopGeneration()
      return
    }
    const currentInput = inputRef.current?.value ?? ''
    if (!currentInput.trim() && images.length === 0) return

    const apiKey = getApiKey()
    const isLocalProvider = provider?.apiType === 'ollama' || provider?.id === 'lmstudio'
    if ((!apiKey && !isLocalProvider && !provider?.allowEmptyApiKey) || !provider) {
      onShowSettings()
      return
    }

    if (images.length > 0 && !selectedModelSupportsVision) {
      toast.error(t('modelNotSupportImage'))
      return
    }

    const finalContent = currentInput
    const imageUrls = images.map(img => img.data)
    if (inputRef.current) inputRef.current.value = ''
    setHasInput(false)
    setImages([])

    // 发送消息后强制滚动到底部
    isAtBottomRef.current = true
    await sendMessage(finalContent, imageUrls, thinkingEnabled, thinkingLevel)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0 && !selectedModelSupportsVision) {
      toast.error(t('modelNotSupportImage'))
      e.target.value = ''
      return
    }
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        if (ev.target?.result) {
          setImages(prev => [...prev, { name: file.name, data: ev.target!.result as string, type: 'image', mimeType: file.type }])
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault()
        if (!selectedModelSupportsVision) {
          toast.error(t('modelNotSupportImage'))
          return
        }
        const file = item.getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = ev => {
            if (ev.target?.result) {
              setImages(prev => [...prev, { name: `pasted-${Date.now()}.png`, data: ev.target!.result as string, type: 'image', mimeType: file.type }])
            }
          }
          reader.readAsDataURL(file)
        }
        break
      }
    }
  }

  const handleStartEdit = useCallback((message: Message) => {
    setEditingId(message.id)
    setEditContent(message.content)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (editingId) {
      updateMessage(editingId, editContent)
      setEditingId(null)
      setEditContent('')
    }
  }, [editingId, editContent, updateMessage])

  const handleRegenerate = useCallback(async (message: Message) => {
    const provider = getProvider()
    const apiKey = getApiKey()
    const isLocalProvider = provider?.apiType === 'ollama' || provider?.id === 'lmstudio'
    if ((!apiKey && !isLocalProvider && !provider?.allowEmptyApiKey) || !provider) {
      onShowSettings()
      return
    }
    if (isLoading) return

    const messages = currentConversation?.messages || []
    const messageIndex = messages.findIndex(m => m.id === message.id)
    if (messageIndex === -1) return

    let targetIndex = messageIndex
    if (message.role === 'user') {
      const nextAssistant = messages.slice(messageIndex + 1).find(m => m.role === 'assistant')
      if (nextAssistant) {
        targetIndex = messages.findIndex(m => m.id === nextAssistant.id)
      } else {
        targetIndex = messageIndex + 1
      }
    }

    await regenerate(targetIndex, thinkingEnabled, thinkingLevel)
  }, [getProvider, getApiKey, onShowSettings, isLoading, currentConversation, regenerate, thinkingEnabled, thinkingLevel])

  const handleSaveAndRegenerate = useCallback(() => {
    if (!editingId) return
    updateMessage(editingId, editContent)
    setEditingId(null)
    setEditContent('')
    const messages = currentConversation?.messages || []
    const msgIndex = messages.findIndex(m => m.id === editingId)
    if (msgIndex === -1) return
    const editedMessage = { ...messages[msgIndex], content: editContent }
    handleRegenerate(editedMessage)
  }, [editingId, editContent, updateMessage, currentConversation, handleRegenerate])

  const handleStartEditSystemPrompt = () => {
    setSystemPromptEdit(currentConversation?.systemPrompt ?? globalSystemPrompt)
    setEditingSystemPrompt(true)
  }

  const handleSaveSystemPrompt = () => {
    if (currentConversationId) {
      setConversationSystemPrompt(currentConversationId, systemPromptEdit)
    } else {
      setGlobalSystemPrompt(systemPromptEdit)
    }
    setEditingSystemPrompt(false)
  }

  const handleCopyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success(t('copySuccess'))
    } catch {
      toast.error(t('copyFailed'))
    }
  }, [t])

  const formatTimestamp = (ts: number) => {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(new Date(ts))
  }

  // 导出对话为 Markdown
  const handleExportMarkdown = (conv: Conversation) => {
    const frontMatter = [
      '---',
      `id: "${conv.id}"`,
      `title: "${conv.title.replace(/"/g, '\\"')}"`,
      `createdAt: "${formatTimestamp(conv.createdAt)}"`,
      `updatedAt: "${formatTimestamp(conv.updatedAt)}"`,
      ...(conv.systemPrompt ? [`systemPrompt: "${conv.systemPrompt.replace(/"/g, '\\"')}"`] : []),
      '---',
    ]
    const body: string[] = [`# ${conv.title}`, '']
    for (const msg of conv.messages) {
      const emoji = msg.role === 'user' ? '🧑‍💻' : '🤖'
      body.push(`## ${emoji} ${msg.role === 'user' ? 'User' : 'Assistant'}`, '')
      if (msg.thinking) {
        body.push('<div style="border: 2px solid #dddddd; border-radius: 10px;">', '  <details style="padding: 5px;">', '    <summary>已深度思考</summary>', `    ${msg.thinking.replace(/\n/g, '<br>')}`, '  </details>', '</div>', '')
      }
      body.push(msg.content, '', '---', '')
    }
    downloadText(`${conv.title}.md`, [...frontMatter, '', ...body].join('\n'))
  }

  const downloadText = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleGenerateTopicName = async () => {
    const conv = currentConversation
    if (!conv || conv.messages.length === 0) {
      toast.error(t('noMessagesToGenerate'))
      return
    }
    toast.loading(t('generatingTopicName'), { id: 'generate-topic' })
    const provider = getProvider()
    const apiKey = getApiKey()
    if (!provider) {
      toast.dismiss('generate-topic')
      toast.error(t('pleaseConfigureApiKey'))
      return
    }
    const count = uiConfig.topicNameCount || 6
    const recentMessages = conv.messages.slice(-count).map(m => ({
      role: m.role,
      content: m.content.slice(0, 200),
    }))
    const isZh = uiConfig.language === 'zh'
    const style = uiConfig.topicNameStyle || 'normal'
    const convPrompt = conv.systemPrompt ?? globalSystemPrompt
    const sysPrompt = getTopicNamePrompt(isZh, style, convPrompt)
    try {
      const title = await chatCompletion({
        baseUrl: provider.baseUrl,
        apiKey,
        model: selectedModel,
        messages: recentMessages,
        systemPrompt: sysPrompt,
        useCorsProxy: provider.useCorsProxy,
        corsProxyUrl: uiConfig.corsProxyUrl,
      })
      if (title) {
        const cleaned = title.replace(/^["']|["']$/g, '')
        useStore.getState().renameConversation(conv.id, cleaned)
        setTitleEditValue(cleaned)
        toast.success(t('topicNameGenerated'), { id: 'generate-topic' })
      }
    } catch (error) {
      toast.error(t('topicNameFailed', { error: error instanceof Error ? error.message : '' }), { id: 'generate-topic' })
    }
  }

  // 字号枚举到 rem 的映射，用于代码块和图表的固定字号
  const codeFontSize = fontSize === 'xs' ? '0.625rem' : fontSize === 'base' ? '0.75rem' : '1rem'

  // Markdown 渲染组件映射：处理链接、代码块、行内代码、引用块
  const markdownComponents = useMemo(() => ({
    a({ children, href, ...props }: any) {
      const isExternal = href && !href.startsWith('/') && !href.startsWith('#')
      const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (href?.startsWith('#')) {
          e.preventDefault()
          const target = document.getElementById(href.slice(1))
          const container = scrollContainerRef.current
          if (target && container) {
            const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
            container.scrollTo({ top, behavior: 'smooth' })
          }
        }
      }
      return (
        <a href={href} onClick={handleClick} {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity" {...props}>
          {children}
        </a>
      )
    },
    pre({ children }: any) {
      return <div className="code-block">{children}</div>
    },
    code({ node, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : ''
      const codeContent = String(children).replace(/\n$/, '')

      // 有 language-xxx 类名 → 围栏代码块，交给 CodeBlock
      if (match) {
        return (
          <CodeBlock
            language={language}
            fontSize={codeFontSize}
            autoCollapse={autoCollapseCode}
          >
            {codeContent}
          </CodeBlock>
        )
      }
      // 行内 code（className 为空，位于 p 内）
      return (
        <code className="bg-muted-foreground/10 px-1.5 py-0.5 rounded font-mono text-[0.9em]" {...props}>
          {children}
        </code>
      )
    },
    blockquote({ children }: any) {
      return (
        <blockquote className="border-l-2 border-muted-foreground/30 pl-3 py-1 my-2 text-muted-foreground italic">
          {children}
        </blockquote>
      )
    },
    table({ children }: any) {
      return (
        <div className="isolate overflow-hidden rounded-lg border border-muted-foreground/30 mb-2">
          <table className="w-full">{children}</table>
        </div>
      )
    },
  }), [codeFontSize, autoCollapseCode])

  const displayPrompt = currentConversation?.systemPrompt ?? globalSystemPrompt

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit() }
    else if (e.key === 'Escape') { setEditingId(null); setEditContent('') }
  }, [handleSaveEdit])

  const handleToggleThinking = useCallback((id: string) => {
    setExpandedThinkingIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }, [])

  const handleToggleError = useCallback((id: string) => {
    setExpandedErrorIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }, [])

  const handleCancelEdit = useCallback(() => { setEditingId(null); setEditContent('') }, [])

  const handleDeleteMessage = useCallback((e: React.MouseEvent, id: string) => {
    onShowPopoverConfirm(e.clientX, e.clientY + 8, () => deleteMessage(id))
  }, [onShowPopoverConfirm, deleteMessage])

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* 顶部栏 */}
      <div ref={topBarRef} className="h-8 border-b flex items-center p-2 shrink-0">
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger render={(props) => (
              <Button {...props} size="icon" variant="ghost" className="size-6" onClick={onToggleSidebar} aria-label={sidebarOpen ? t('collapseSidebar') : t('expandSidebar')}>
                <Sidebar className="size-3" />
              </Button>
            )} />
            <TooltipContent side="bottom" className="text-2xs px-2 py-1">
              {sidebarOpen ? t('collapseSidebar') : t('expandSidebar')}
            </TooltipContent>
          </Tooltip>
          <div className="w-px h-4 bg-border" />
        </div>
        <div className="flex items-center gap-1">
          {editingId === 'title' ? (
            <>
              <Input
                value={titleEditValue}
                onChange={e => setTitleEditValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && currentConversationId) {
                    if (titleEditValue.trim()) {
                      useStore.getState().renameConversation(currentConversationId, titleEditValue.trim())
                    }
                    setEditingId(null)
                  } else if (e.key === 'Escape') {
                    setEditingId(null)
                  }
                }}
                onBlur={() => {
                  if (currentConversationId && titleEditValue.trim()) {
                    useStore.getState().renameConversation(currentConversationId, titleEditValue.trim())
                  }
                  setEditingId(null)
                }}
                className="h-6 text-xs w-48"
                autoFocus
                onClick={e => e.stopPropagation()}
              />
            </>
          ) : (
            <>
              <span
                className="text-xs font-medium truncate max-w-[200px] cursor-pointer hover:bg-accent px-2 py-1 rounded"
                tabIndex={0}
                role="button"
                aria-label={currentConversation?.title || t('newConversation')}
                onClick={() => {
                  setTitleEditValue(currentConversation?.title || '')
                  setEditingId('title')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setTitleEditValue(currentConversation?.title || '')
                    setEditingId('title')
                  }
                }}
              >{currentConversation?.title || t('newConversation')}</span>
              {currentConversation && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={(props) => (
                    <Button {...props} size="icon" variant="ghost" className="size-6 shrink-0">
                      <Ellipsis className="size-3" />
                    </Button>
                  )} />
                  <DropdownMenuContent align="start" sideOffset={4}>
                    <ConversationMenuItems
                      conv={currentConversation}
                      onDuplicate={() => duplicateConversation(currentConversation.id)}
                      onRename={() => {
                        setTitleEditValue(currentConversation.title)
                        requestAnimationFrame(() => setEditingId('title'))
                      }}
                      onGenerateTopicName={() => handleGenerateTopicName()}
                      onExportMarkdown={() => handleExportMarkdown(currentConversation)}
                      generateDisabled={isLoading}
                      onNewConversation={() => { if (isLoading) stopGeneration(); createConversation() }}
                      onClearMessages={(e) => onShowPopoverConfirm(e.clientX, e.clientY - 50, () => {
                        if (currentConversationId) clearMessages(currentConversationId)
                      })}
                      clearDisabled={isLoading || !currentConversation?.messages.length}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger render={(props) => (
              <Button {...props} size="icon" variant="ghost" className="size-6 hidden md:inline-flex" onClick={onToggleChatWidth} aria-label={chatWidth === 'compact' ? t('switchToFullWidth') : t('switchToCompact')}>
                {chatWidth === 'compact' ? <UnfoldHorizontal className="size-3" /> : <FoldHorizontal className="size-3" />}
              </Button>
            )} />
            <TooltipContent side="bottom" className="text-2xs px-2 py-1">
              {chatWidth === 'compact' ? t('switchToFullWidth') : t('switchToCompact')}
            </TooltipContent>
          </Tooltip>
          {onThemeToggle && (
            <Tooltip>
              <TooltipTrigger render={(props) => (
                <Button {...props} size="icon" variant="ghost" className="size-6 hidden md:inline-flex" onClick={onThemeToggle} aria-label={t('themeLabel', { theme: getThemeLabel() })}>
                  {themeIcon}
                </Button>
              )} />
              <TooltipContent side="bottom" className="text-2xs px-2 py-1">
                {t('themeLabel', { theme: getThemeLabel() })}
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger render={(props) => (
              <Button {...props} size="icon" variant="ghost" className="size-6 hidden md:inline-flex" onClick={() => setLanguage(uiConfig.language === 'en' ? 'zh' : 'en')} aria-label={uiConfig.language === 'en' ? '中文' : 'English'}>
                <Globe className="size-3" />
              </Button>
            )} />
            <TooltipContent side="bottom" className="text-2xs px-2 py-1">
              {uiConfig.language === 'en' ? '中文' : 'English'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={(props) => (
              <Button {...props} size="icon" variant="ghost" className="size-6" onClick={onShowSettings} aria-label={t('settings')}>
                <Settings className="size-3" />
              </Button>
            )} />
            <TooltipContent side="bottom" className="text-2xs px-2 py-1">
              {t('settings')}
            </TooltipContent>
          </Tooltip>
          {/* 哨兵：Tab 到此处后跳回输入框 */}
          <span tabIndex={0} aria-hidden="true"
            onFocus={() => inputRef.current?.focus()}
          />
        </div>
      </div>

      {/* 聊天区域 */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto overscroll-none p-2">
        <div className={`${chatWidth === 'compact' ? 'max-w-3xl' : 'max-w-full'} mx-auto flex flex-col gap-2 w-full ${!currentConversation?.messages.length ? 'min-h-full' : ''}`}>
          {!currentConversation?.messages.length && <div className="flex-1" />}

          {currentConversation && (
            <>
              {/* 系统提示词 */}
              {displayPrompt && (
                <div className="flex gap-2 group mb-2">
                  <div className="w-6 h-6 rounded-full bg-systemPrompt text-primary-foreground flex items-center justify-center shrink-0">
                    <Cpu className="size-3" />
                  </div>
                  <div className="flex flex-col gap-2 flex-1 max-w-[calc(100%-4rem)]">
                    {editingSystemPrompt ? (
                      <div className="rounded-md px-3 py-2 bg-systemPrompt-bg">
                        <div className="flex flex-col gap-2">
                          <Textarea value={systemPromptEdit} onChange={e => setSystemPromptEdit(e.target.value)} className="min-h-[80px] w-full text-xs" autoFocus />
                          <div className="flex gap-1">
                            <Button size="sm" className="h-6 text-2xs" onClick={handleSaveSystemPrompt}><Check data-icon="inline-start" className="size-2.5 mr-0.5" />{t('save')}</Button>
                            <Button size="sm" variant="outline" className="h-6 text-2xs" onClick={() => setEditingSystemPrompt(false)}><X data-icon="inline-start" className="size-2.5 mr-0.5" />{t('cancel')}</Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-md px-3 py-2 bg-systemPrompt-bg">
                          <span className="font-medium text-systemPrompt-foreground text-xs">{t('systemPrompt')}</span>
                          <p className="mt-1 text-muted-foreground text-xs">{displayPrompt}</p>
                        </div>
                        <div className="flex items-center justify-start gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="size-5" onClick={() => handleCopyMessage(displayPrompt)}><Copy data-icon className="size-2.5" /></Button>
                          <Button size="icon" variant="ghost" className="size-5" onClick={handleStartEditSystemPrompt}><Edit2 data-icon className="size-2.5" /></Button>
                          <Button size="icon" variant="ghost" className="size-5"
                            onClick={(e: React.MouseEvent) => onShowPopoverConfirm(e.clientX, e.clientY + 8, () => {
                              setConversationSystemPrompt(currentConversationId!, '')
                            })}
                          ><Trash2 data-icon className="size-2.5" /></Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* 消息列表 */}
              {(() => {
                const allMessages = currentConversation.messages
                const hasMore = allMessages.length > visibleCount
                const visibleMessages = allMessages.slice(-visibleCount)
                return (
                  <>
                    {hasMore && (
                      <div className="flex justify-center py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-2xs h-6"
                          onClick={() => {
                            const container = scrollContainerRef.current
                            const prevScrollHeight = container?.scrollHeight || 0
                            setVisibleCount(prev => Math.min(prev + MESSAGE_BATCH_SIZE, allMessages.length))
                            // 保持当前滚动位置（加载后 scrollTop 不跳变）
                            requestAnimationFrame(() => {
                              if (container) {
                                const newScrollHeight = container.scrollHeight
                                container.scrollTop += newScrollHeight - prevScrollHeight
                              }
                            })
                          }}
                        >
                          {t('loadMore')} ({allMessages.length - visibleCount})
                        </Button>
                      </div>
                    )}
                    {visibleMessages.map(message => (
                      <MessageItem
                        key={message.id}
                        message={message}
                        isEditing={editingId === message.id}
                        editContent={editContent}
                        fontSizeClass={fontSizeClass}
                        isThinkingExpanded={expandedThinkingIds.has(message.id)}
                        isErrorExpanded={expandedErrorIds.has(message.id)}
                        isLoading={isLoading}
                        markdownComponents={markdownComponents}
                        providers={providers}
                        onStartEdit={handleStartEdit}
                        onSaveEdit={handleSaveEdit}
                        onSaveAndRegenerate={handleSaveAndRegenerate}
                        onCancelEdit={handleCancelEdit}
                        onEditContentChange={setEditContent}
                        onEditKeyDown={handleEditKeyDown}
                        onCopy={handleCopyMessage}
                        onRegenerate={handleRegenerate}
                        onDelete={handleDeleteMessage}
                        onToggleThinking={handleToggleThinking}
                        onToggleError={handleToggleError}
                        t={t}
                      />
                    ))}
                  </>
                )
              })()}
            </>
          )}

          {/* 流式输出 */}
          {isLoading && (
            <div className="flex gap-1.5 justify-start">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Bot className="size-3" />
              </div>
              <div className={`max-w-[80%] rounded-md px-2 py-1.5 bg-muted ${fontSizeClass} break-words`}>
                {streamingThinking && (
                  <div className="mb-2 pb-2 border-b border-muted-foreground/20">
                    <button
                      onClick={() => setStreamingThinkingExpanded(!streamingThinkingExpanded)}
                      className="flex items-center gap-1 text-2xs text-muted-foreground mb-1 hover:text-foreground transition-colors"
                      aria-expanded={streamingThinkingExpanded}
                    >
                      <Lightbulb className="size-2.5" />
                      <span>{streamingContent ? t('deepThought') : t('deepThinking')}</span>
                      <span className="ml-auto">{streamingThinkingExpanded ? '▼' : '▶'}</span>
                    </button>
                    {streamingThinkingExpanded && (
                      <div className="relative pl-2">
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-thinking rounded-full"></div>
                        <div className={`markdown-body ${fontSizeClass} text-xs`}><MemoizedMarkdown content={streamingThinking} components={markdownComponents} /></div>
                      </div>
                    )}
                  </div>
                )}
                {streamingContent ? (
                  <>
                    <div className={`markdown-body ${fontSizeClass}`}><MemoizedMarkdown content={streamingContent} components={markdownComponents} /></div>
                    <span className="inline-block w-1 h-2.5 bg-primary animate-pulse motion-reduce:animate-none ml-0.5" />
                  </>
                ) : !streamingThinking && (
                  <span className="text-muted-foreground text-xs">{t('requesting')}</span>
                )}
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      <div className="border-t bg-card p-2">
        <div className="max-w-full mx-auto relative">
          {images.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {images.map((img, i) => (
                <div key={i} className="relative group flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-2xs">
                  <ImageIcon className="size-3 shrink-0" />
                  <span className="truncate max-w-[100px]">{img.name}</span>
                  <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 hover:text-destructive transition-colors" aria-label={t('delete')}>×</button>
                </div>
              ))}
            </div>
          )}

          <Textarea
            ref={inputRef}
            id="chat-input"
            defaultValue=""
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onCompositionStart={() => { isComposingRef.current = true }}
            onCompositionEnd={() => { isComposingRef.current = false }}
            onDragOver={(e) => {
              e.preventDefault()
              if (!selectedModelSupportsVision) { e.dataTransfer.dropEffect = 'none' }
              else { e.dataTransfer.dropEffect = 'copy'; setIsDraggingImage(true) }
            }}
            onDragLeave={() => setIsDraggingImage(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDraggingImage(false)
              if (!selectedModelSupportsVision) { toast.error(t('modelNotSupportImage')); return }
              const files = e.dataTransfer.files
              if (files && files.length > 0) {
                Array.from(files).forEach(file => {
                  if (file.type.startsWith('image/')) {
                    const reader = new FileReader()
                    reader.onload = ev => {
                      if (ev.target?.result) {
                        setImages(prev => [...prev, { name: file.name, data: ev.target!.result as string, type: 'image', mimeType: file.type }])
                      }
                    }
                    reader.readAsDataURL(file)
                  }
                })
              }
            }}
            placeholder={t('inputPlaceholder')}
            className={`min-h-[60px] max-h-[200px] resize-none text-xs mb-2 ${isDraggingImage ? 'border-primary border-2 bg-primary/5' : ''}`}
          />

          <div className="flex items-center justify-between gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />

            <div className="flex items-center gap-2">
              <ModelSelect
                open={modelSelectOpen}
                onOpenChange={setModelSelectOpen}
                modelGroups={modelGroups}
                selectedModel={selectedModel}
                isLoading={isLoading}
                onSelect={(id) => { setSelectedModel(id); setModelSelectOpen(false) }}
                t={t}
              />

              <div className="flex items-center gap-1">
                <PromptsMenu
                  open={promptMenuOpen}
                  onOpenChange={setPromptMenuOpen}
                  prompts={uiConfig.prompts || []}
                  disabled={isLoading}
                  onSelect={(content) => {
                    if (currentConversationId) setConversationSystemPrompt(currentConversationId, content)
                    else setGlobalSystemPrompt(content)
                  }}
                  t={t}
                />
                <ThinkingMenu
                  open={thinkingMenuOpen}
                  onOpenChange={setThinkingMenuOpen}
                  enabled={thinkingEnabled}
                  level={thinkingLevel}
                  supportsThinking={selectedModelSupportsThinking}
                  isLoading={isLoading}
                  onToggle={(enabled, level) => { setThinkingEnabled(enabled); if (level) setThinkingLevel(level) }}
                  t={t}
                />
                <Tooltip>
                  <TooltipTrigger render={(props) => (
                    <Button {...props} size="icon" variant="outline" className="size-7 shrink-0"
                      disabled={isLoading || !selectedModelSupportsVision}
                      onClick={() => fileInputRef.current?.click()}
                      aria-label={t('uploadImage')}
                    >
                      <ImageIcon className="size-3" />
                    </Button>
                  )} />
                  <TooltipContent side="top" className="text-2xs px-2 py-1">
                    {!selectedModelSupportsVision ? t('modelNotSupportVision') : t('uploadImage')}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" onClick={handleSend}
                disabled={!isLoading && (!hasInput && images.length === 0)}
                className="h-7"
                aria-label={isLoading ? t('stop') : t('send')}
              >{isLoading ? <Square data-icon className="size-3 fill-current" /> : <Send data-icon className="size-3" />}</Button>
              {/* 哨兵：浏览器跳过 disabled 按钮后聚焦此处，自动跳转到顶部栏 */}
              <span tabIndex={0} aria-hidden="true"
                onFocus={() => {
                  const first = topBarRef.current?.querySelector('button, [tabindex="0"]') as HTMLElement | null
                  first?.focus()
                }}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
