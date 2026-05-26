import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from '../store'
import type { Message } from '../types'
import type { ImageFile } from '../hooks/useChat'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CodeBlock } from './CodeBlock'
import {
  Send,
  Square,
  Image as ImageIcon,
  Edit2,
  Check,
  X,
  Lightbulb,
  RefreshCw,
  Download as DownloadIcon,
  Copy,
  FoldHorizontal,
  UnfoldHorizontal,
  Brain,
  Search,
  Trash2,
  Eye,
  LightbulbOff,
  SwatchBook,
  Cpu,
  User,
  Bot,
  AlertCircle,
  PanelLeftOpen,
  PanelLeftClose,
  Globe,
  Settings,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
}: ChatAreaProps) {
  const {
    currentConversationId,
    providers,
    apiKeys,
    selectedModel,
    globalSystemPrompt,
    uiConfig,
    getCurrentConversation,
    getProvider,
    getApiKey,
    updateMessage,
    deleteMessage,
    setSelectedModel,
    setGlobalSystemPrompt,
    setConversationSystemPrompt,
    setLanguage,
  } = useStore()

  const [input, setInput] = useState('')
  const [images, setImages] = useState<ImageFile[]>([])
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  // IME 输入法组合状态，防止中文输入时 Enter 提交
  const [isComposing, setIsComposing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [titleEditValue, setTitleEditValue] = useState('')
  const [editingSystemPrompt, setEditingSystemPrompt] = useState(false)
  const [systemPromptEdit, setSystemPromptEdit] = useState('')
  const [promptMenuOpen, setPromptMenuOpen] = useState(false)
  const [promptSearch, setPromptSearch] = useState('')
  const [thinkingEnabled, setThinkingEnabled] = useState(false)
  const [thinkingLevel, setThinkingLevel] = useState<'low' | 'medium' | 'high'>('medium')
  const [thinkingMenuOpen, setThinkingMenuOpen] = useState(false)
  const [streamingThinkingExpanded, setStreamingThinkingExpanded] = useState(!autoHideThinking)
  const [expandedThinkingIds, setExpandedThinkingIds] = useState<Set<string>>(new Set())
  const [expandedErrorIds, setExpandedErrorIds] = useState<Set<string>>(new Set())
  const [modelSearch, setModelSearch] = useState('')
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

  const currentConversation = getCurrentConversation()
  const provider = getProvider()

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

  // 消息列表更新或流式内容变化时自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentConversation?.messages, streamingContent])

  useEffect(() => {
    inputRef.current?.focus()
  }, [currentConversationId])

  const handleSend = async () => {
    if (isLoading) {
      stopGeneration()
      return
    }
    if (!input.trim() && images.length === 0) return

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

    const finalContent = input
    const imageUrls = images.map(img => img.data)
    setInput('')
    setImages([])

    await sendMessage(finalContent, imageUrls, thinkingEnabled, thinkingLevel)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
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

  const handleStartEdit = (message: Message) => {
    setEditingId(message.id)
    setEditContent(message.content)
  }

  const handleSaveEdit = () => {
    if (editingId) {
      updateMessage(editingId, editContent)
      setEditingId(null)
      setEditContent('')
    }
  }

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

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success(t('copySuccess'))
    } catch {
      toast.error(t('copyFailed'))
    }
  }

  const handleRegenerate = async (message: Message) => {
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

    // 从 user 消息重新生成时，需要定位到其后的 assistant 消息并从那里截断
    let targetIndex = messageIndex
    if (message.role === 'user') {
      const nextAssistant = messages.slice(messageIndex + 1).find(m => m.role === 'assistant')
      if (nextAssistant) {
        targetIndex = messages.findIndex(m => m.id === nextAssistant.id)
      }
    }

    await regenerate(targetIndex, thinkingEnabled, thinkingLevel)
  }

  // 字号枚举到 rem 的映射，用于代码块和图表的固定字号
  const codeFontSize = fontSize === 'xs' ? '0.625rem' : fontSize === 'base' ? '0.75rem' : '1rem'

  // Markdown 渲染组件映射：处理链接、代码块、行内代码
  const markdownComponents = useMemo(() => ({
    a({ children, href, ...props }: any) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity" {...props}>
          {children}
        </a>
      )
    },
    pre({ children }: any) {
      return <>{children}</>
    },
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : ''
      const codeContent = String(children).replace(/\n$/, '')

      if (!inline && match) {
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
      return (
        <code className="bg-muted px-1 py-0.5 rounded font-mono text-[0.9em]" {...props}>
          {children}
        </code>
      )
    },
  }), [codeFontSize, autoCollapseCode])

  const formatContent = (content: string) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  )

  const displayPrompt = currentConversation?.systemPrompt ?? globalSystemPrompt

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* 顶部栏 */}
      <div className="h-8 border-b flex items-center p-2 shrink-0">
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger render={<Button size="icon" variant="ghost" className="size-6" onClick={onToggleSidebar} />}>
              {sidebarOpen ? <PanelLeftClose data-icon className="size-3" /> : <PanelLeftOpen data-icon className="size-3" />}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-2xs px-2 py-1">
              {sidebarOpen ? t('collapseSidebar') : t('expandSidebar')}
            </TooltipContent>
          </Tooltip>
          <div className="w-px h-4 bg-border" />
        </div>
        <div className="flex items-center gap-1">
          {editingId === 'title' ? (
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
          ) : (
            <>
              <span
                className="text-xs font-medium truncate max-w-[200px] cursor-pointer hover:bg-accent px-2 py-1 rounded"
                onClick={() => {
                  setTitleEditValue(currentConversation?.title || '')
                  setEditingId('title')
                }}
              >{currentConversation?.title || t('newConversation')}</span>
            </>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger render={<Button size="icon" variant="ghost" className="size-6 hidden md:inline-flex" onClick={onToggleChatWidth} />}>
              {chatWidth === 'compact' ? <UnfoldHorizontal data-icon className="size-3" /> : <FoldHorizontal data-icon className="size-3" />}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-2xs px-2 py-1">
              {chatWidth === 'compact' ? t('switchToFullWidth') : t('switchToCompact')}
            </TooltipContent>
          </Tooltip>
          {onThemeToggle && (
            <Tooltip>
              <TooltipTrigger render={<Button size="icon" variant="ghost" className="size-6 hidden md:inline-flex" onClick={onThemeToggle} />}>
                {themeIcon}
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-2xs px-2 py-1">
                {t('themeLabel', { theme: getThemeLabel() })}
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger render={<Button size="icon" variant="ghost" className="size-6 hidden md:inline-flex" onClick={() => setLanguage(uiConfig.language === 'en' ? 'zh' : 'en')} />}>
              <Globe data-icon className="size-3" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-2xs px-2 py-1">
              {uiConfig.language === 'en' ? '中文' : 'English'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<Button size="icon" variant="ghost" className="size-6" onClick={onShowSettings} />}>
              <Settings data-icon className="size-3" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-2xs px-2 py-1">
              {t('settings')}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 聊天区域 */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col">
        <div className={`${chatWidth === 'compact' ? 'max-w-3xl' : 'max-w-full'} mx-auto flex flex-col gap-2 w-full flex-1`}>
          {!currentConversation?.messages.length && <div className="flex-1" />}
          {!currentConversation?.messages.length && (
            <div className="text-center text-muted-foreground pb-4">
              <p className="text-xs mb-1">{t('startConversation')}</p>
              {modelGroups.length === 0 ? (
                <p className="text-2xs">{t('configureApiKeyFirst')}</p>
              ) : (
                <p className="text-2xs">{t('currentModel')}: {selectedModel || t('pleaseSelectModel')}</p>
              )}
            </div>
          )}

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
                            onClick={e => onShowPopoverConfirm(e.clientX, e.clientY + 8, () => {
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
              {currentConversation.messages.map(message => (
                <div key={message.id} className={`mb-2 flex gap-2 group ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <Bot className="size-3" />
                    </div>
                  )}
                  {editingId === message.id ? (
                    <div className="rounded-md px-3 py-2 flex-1 max-w-[calc(100%-4rem)] bg-muted text-foreground">
                      <div className="flex flex-col gap-1.5 w-full">
                        <Textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                          className={`w-full ${fontSizeClass} min-h-[160px]`}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit() }
                            else if (e.key === 'Escape') { setEditingId(null); setEditContent('') }
                          }}
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <Button size="sm" className="h-5 text-2xs" onClick={handleSaveEdit}><Check data-icon="inline-start" className="size-2.5 mr-0.5" />{t('save')}</Button>
                          <Button size="sm" variant="outline" className="h-5 text-2xs" onClick={() => { setEditingId(null); setEditContent('') }}><X data-icon="inline-start" className="size-2.5 mr-0.5" />{t('cancel')}</Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-w-[calc(100%-4rem)]">
                      <div className={`rounded-md px-3 py-2 ${fontSizeClass} break-words ${message.isError ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-muted text-foreground'}`}>
                        {message.isError ? (
                          <>
                            <div className="flex items-center gap-1 text-2xs font-medium mb-1">
                              <AlertCircle className="size-3" />
                              <span>{t('errorMessage')}</span>
                            </div>
                            {message.content.includes('\n\n') ? (
                              <>
                                <div className={`whitespace-pre-wrap ${expandedErrorIds.has(message.id) ? '' : 'line-clamp-1'}`}>{message.content}</div>
                                <button
                                  onClick={() => setExpandedErrorIds(prev => {
                                    const next = new Set(prev)
                                    next.has(message.id) ? next.delete(message.id) : next.add(message.id)
                                    return next
                                  })}
                                  className="text-2xs text-destructive/70 hover:text-destructive mt-1 transition-colors"
                                >
                                  {expandedErrorIds.has(message.id) ? t('collapseError') : t('expandError')}
                                </button>
                              </>
                            ) : (
                              <div className="whitespace-pre-wrap">{message.content}</div>
                            )}
                          </>
                        ) : (
                          <>
                            {message.images && message.images.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1">
                                {message.images.map((img, i) => <img key={i} src={img} alt="" className="max-w-[80px] max-h-[80px] rounded" />)}
                              </div>
                            )}
                            {message.files && message.files.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {message.files.map((file, i) => (
                                  <div key={i} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs border">
                                    <ImageIcon className="size-3 shrink-0" />
                                    <span className="max-w-[150px] truncate">{file.name}</span>
                                    <button onClick={() => { const a = document.createElement('a'); a.href = file.data; a.download = file.name; a.click() }} className="hover:text-primary transition-colors"><DownloadIcon className="size-2.5" /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {message.thinking && (
                              <div className="mb-2 pb-2 border-b border-muted-foreground/20">
                                <button
                                  onClick={() => {
                                    setExpandedThinkingIds(prev => {
                                      const next = new Set(prev)
                                      if (next.has(message.id)) {
                                        next.delete(message.id)
                                      } else {
                                        next.add(message.id)
                                      }
                                      return next
                                    })
                                  }}
                                  className="flex items-center gap-1 text-2xs text-muted-foreground mb-1 hover:text-foreground transition-colors"
                                >
                                  <Brain className="size-2.5" />
                                  <span>{t('thinkingProcess')}</span>
                                  <span className="ml-auto">{expandedThinkingIds.has(message.id) ? '▼' : '▶'}</span>
                                </button>
                                {expandedThinkingIds.has(message.id) && (
                                  <div className="relative pl-2">
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-thinking rounded-full"></div>
                                    <div className={`markdown-body ${fontSizeClass} text-xs`}>{formatContent(message.thinking)}</div>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className={`markdown-body ${fontSizeClass}`}>{formatContent(message.content)}</div>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-left gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-0.5">
                          {!message.isError && <Button size="icon" variant="ghost" className="size-5" onClick={() => handleCopyMessage(message.content)}><Copy data-icon className="size-2.5" /></Button>}
                          {!message.isError && <Button size="icon" variant="ghost" className="size-5" onClick={() => handleStartEdit(message)}><Edit2 data-icon className="size-2.5" /></Button>}
                          {(message.role === 'assistant' || message.role === 'user') && (
                            <Button size="icon" variant="ghost" className="size-5" onClick={() => handleRegenerate(message)} disabled={isLoading}><RefreshCw data-icon className="size-2.5" /></Button>
                          )}
                          <Button size="icon" variant="ghost" className="size-5"
                            onClick={e => onShowPopoverConfirm(e.clientX, e.clientY + 8, () => deleteMessage(message.id))}
                            ><Trash2 data-icon className="size-2.5" /></Button>
                          {message.model && (() => {
                            const modelProvider = providers.find(p => p.models.includes(message.model!))
                            const providerName = modelProvider?.name || ''
                            return <span className="text-3xs text-muted-foreground ml-1">{providerName ? `${providerName} | ${message.model}` : message.model}</span>
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                  {message.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <User className="size-3" />
                    </div>
                  )}
                </div>
              ))}
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
                    >
                      <Brain className="size-2.5" />
                      <span>思考过程</span>
                      <span className="ml-auto">{streamingThinkingExpanded ? '▼' : '▶'}</span>
                    </button>
                    {streamingThinkingExpanded && (
                      <div className="relative pl-2">
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-thinking rounded-full"></div>
                        <div className={`markdown-body ${fontSizeClass} text-xs`}>{formatContent(streamingThinking)}</div>
                      </div>
                    )}
                  </div>
                )}
                {streamingContent ? (
                  <>
                    <div className={`markdown-body ${fontSizeClass}`}>{formatContent(streamingContent)}</div>
                    <span className="inline-block w-1 h-2.5 bg-primary animate-pulse ml-0.5" />
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
                  <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 hover:text-destructive transition-colors">×</button>
                </div>
              ))}
            </div>
          )}

          <Textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
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
            disabled={isLoading}
          />

          <div className="flex items-center justify-between gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />

            <div className="flex items-center gap-2">
              {/* 模型选择 */}
              <Popover open={modelSelectOpen} onOpenChange={setModelSelectOpen}>
                <PopoverTrigger render={<Button variant="outline" size="sm" className="h-7 text-xs" disabled={isLoading} />}>
                  {selectedModel || t('selectModel')}
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-80 p-0 z-50" sideOffset={8}>
                  <div className="p-1.5 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                      <Input value={modelSearch} onChange={e => setModelSearch(e.target.value)} placeholder={t('searchModel')} className="pl-7 h-6 text-xs" autoFocus
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
                          const filteredModels = group.models.filter(model =>
                            model.id.toLowerCase().includes(modelSearch.toLowerCase())
                          )
                          if (filteredModels.length === 0) return null
                          return (
                            <div key={group.provider}>
                              <div className="px-2.5 py-1 text-2xs text-muted-foreground font-medium bg-muted/50">{group.providerName}</div>
                              {filteredModels.map(model => (
                                <div
                                  key={model.id}
                                  data-model-item
                                  tabIndex={0}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs hover:bg-accent cursor-pointer focus:bg-accent outline-none ${selectedModel === model.id ? 'bg-accent' : ''}`}
                                  onClick={() => {
                                    setSelectedModel(model.id)
                                    setModelSelectOpen(false)
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      setSelectedModel(model.id)
                                      setModelSelectOpen(false)
                                    } else if (e.key === 'ArrowDown') {
                                      e.preventDefault()
                                      const items = [...document.querySelectorAll('[data-model-item]')] as HTMLElement[]
                                      const idx = items.indexOf(e.currentTarget)
                                      if (idx < items.length - 1) items[idx + 1].focus()
                                    } else if (e.key === 'ArrowUp') {
                                      e.preventDefault()
                                      const items = [...document.querySelectorAll('[data-model-item]')] as HTMLElement[]
                                      const idx = items.indexOf(e.currentTarget)
                                      if (idx > 0) {
                                        items[idx - 1].focus()
                                      }
                                    }
                                  }}
                                >
                                  <span className="flex-1 truncate">{model.id}</span>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    {model.capability?.supportsVision && <Eye className="size-2.5 text-capability-vision" />}
                                    {model.capability?.supportsThinking && <Brain className="size-2.5 text-capability-thinking" />}
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

              <div className="flex items-center gap-1">
                {/* 提示词 */}
                <Popover open={promptMenuOpen} onOpenChange={setPromptMenuOpen}>
                  <PopoverTrigger render={<Button size="icon" variant="outline" className="size-7 shrink-0" disabled={isLoading} />}>
                    <SwatchBook data-icon className="size-3" />
                  </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-52 p-0 z-50" sideOffset={8}>
                  <div className="p-1.5 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                      <Input value={promptSearch} onChange={e => setPromptSearch(e.target.value)} placeholder={t('searchPrompt')} className="pl-7 h-6 text-xs" autoFocus />
                    </div>
                  </div>
                  <ScrollArea className="max-h-[200px]">
                    {(uiConfig.prompts || []).filter(p => p.name.toLowerCase().includes(promptSearch.toLowerCase())).length === 0 ? (
                      <div className="px-3 py-4 text-center text-2xs text-muted-foreground">{t('noMatchingPrompts')}</div>
                    ) : (
                      <div>
                        {(uiConfig.prompts || []).filter(p => p.name.toLowerCase().includes(promptSearch.toLowerCase())).map((prompt) => (
                          <div key={prompt.id} className="px-2.5 py-1.5 text-xs hover:bg-accent cursor-pointer"
                            onClick={() => {
                              // 设置系统提示词
                              if (currentConversationId) {
                                setConversationSystemPrompt(currentConversationId, prompt.content)
                              } else {
                                setGlobalSystemPrompt(prompt.content)
                              }
                              setPromptMenuOpen(false)
                              setPromptSearch('')
                              toast(t('promptSet', { name: prompt.name }))
                            }}
                          ><span className="truncate">{prompt.name}</span></div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* 思维链 */}
              <Popover open={thinkingMenuOpen} onOpenChange={setThinkingMenuOpen}>
                <PopoverTrigger render={<Button size="icon" variant="outline" className="size-7 shrink-0"
                    disabled={isLoading || !selectedModelSupportsThinking}
                />}>
                    {!thinkingEnabled ? (
                      <LightbulbOff data-icon className="size-3" />
                    ) : thinkingLevel === 'low' ? (
                      <Lightbulb data-icon className="size-3 text-systemPrompt" />
                    ) : (
                      <Lightbulb data-icon className="size-3 text-systemPrompt fill-systemPrompt" />
                    )}
                </PopoverTrigger>
                <PopoverContent side="top" align="center" className="w-24 p-1 z-50" sideOffset={8}>
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => { setThinkingEnabled(false); setThinkingMenuOpen(false) }}
                      className={`w-full px-2 py-1.5 text-xs text-left rounded hover:bg-accent transition-colors ${!thinkingEnabled ? 'bg-accent' : ''}`}
                    >
                      {t('off')}
                    </button>
                    <button
                      onClick={() => { setThinkingEnabled(true); setThinkingLevel('low'); setThinkingMenuOpen(false) }}
                      className={`w-full px-2 py-1.5 text-xs text-left rounded hover:bg-accent transition-colors ${thinkingEnabled && thinkingLevel === 'low' ? 'bg-accent' : ''}`}
                    >
                      {t('low')}
                    </button>
                    <button
                      onClick={() => { setThinkingEnabled(true); setThinkingLevel('medium'); setThinkingMenuOpen(false) }}
                      className={`w-full px-2 py-1.5 text-xs text-left rounded hover:bg-accent transition-colors ${thinkingEnabled && thinkingLevel === 'medium' ? 'bg-accent' : ''}`}
                    >
                      {t('medium')}
                    </button>
                    <button
                      onClick={() => { setThinkingEnabled(true); setThinkingLevel('high'); setThinkingMenuOpen(false) }}
                      className={`w-full px-2 py-1.5 text-xs text-left rounded hover:bg-accent transition-colors ${thinkingEnabled && thinkingLevel === 'high' ? 'bg-accent' : ''}`}
                    >
                      {t('high')}
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              
              {/* 图片 */}
              <Tooltip>
                <TooltipTrigger render={<Button size="icon" variant="outline" className="size-7 shrink-0"
                    disabled={isLoading || !selectedModelSupportsVision}
                    onClick={() => fileInputRef.current?.click()}
                />}>
                  <ImageIcon data-icon className="size-3" />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-2xs px-2 py-1">
                  {!selectedModelSupportsVision ? t('modelNotSupportVision') : t('uploadImage')}
                </TooltipContent>
              </Tooltip>
            </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" onClick={handleSend}
                disabled={!isLoading && (!input.trim() && images.length === 0)}
                className="h-7"
              >{isLoading ? <Square data-icon className="size-3 fill-current" /> : <Send data-icon className="size-3" />}</Button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
