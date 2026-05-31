import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from './store'
import { APP_VERSION, generateId } from './constants.base'
import { useChat } from './hooks/useChat'
import { TooltipProvider } from './components/ui/tooltip'
import { toast } from 'sonner'
import { Toaster } from './components/ui/sonner'
import { Sidebar } from './components/Sidebar'
import { ChatArea } from './components/ChatArea'
import { SettingsDialog } from './components/SettingsDialog'
import { ConfirmDialog } from './components/ConfirmDialog'
import { PopoverConfirm } from './components/PopoverConfirm'
import { Moon, Sun, Monitor } from 'lucide-react'
import type { Conversation } from './types'

function App() {
  const conversations = useStore(s => s.conversations)
  const currentConversationId = useStore(s => s.currentConversationId)
  const selectedModel = useStore(s => s.selectedModel)
  const globalSystemPrompt = useStore(s => s.globalSystemPrompt)
  const storeModelParams = useStore(s => s.modelParams)
  const uiConfig = useStore(s => s.uiConfig)
  const createConversation = useStore(s => s.createConversation)
  const setUIConfig = useStore(s => s.setUIConfig)
  const switchConversation = useStore(s => s.switchConversation)
  const setTheme = useStore(s => s.setTheme)
  const getTheme = useStore(s => s.getTheme)

  const { isLoading, streamingContent, streamingThinking, sendMessage, stopGeneration, regenerate } = useChat()

  // 状态
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsInitialProviderId, setSettingsInitialProviderId] = useState<string | undefined>()
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)
  const [editingTitle, setEditingTitle] = useState(false)

  // 移动端（<768px）自动隐藏侧栏
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(!e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void; thirdLabel?: string; onThirdAction?: () => void }>({
    open: false, title: '', message: '', onConfirm: () => {}
  })
  const [popoverConfirm, setPopoverConfirm] = useState<{ open: boolean; x: number; y: number; onConfirm: () => void }>({
    open: false, x: 0, y: 0, onConfirm: () => {}
  })

  const { t } = useTranslation()

  const configImportInputRef = useRef<HTMLInputElement>(null)
  const promptImportInputRef = useRef<HTMLInputElement>(null)
  const mdInputRef = useRef<HTMLInputElement>(null)
  const jsonlInputRef = useRef<HTMLInputElement>(null)

  // 启动时创建默认对话
  useEffect(() => {
    if (!currentConversationId) createConversation()
  }, [])

  // URL hash 参数解析：#text=xxx&prompt=xxx&providers=xxx&autosend
  const [pendingText, setPendingText] = useState<string | null>(null)
  const [autoSend, setAutoSend] = useState(false)
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return

    const params = new URLSearchParams(hash)
    const text = params.get('text')
    const promptId = params.get('prompt')
    const providersParam = params.get('providers')
    const autoSendParam = params.has('autosend')
    if (!text && !promptId && !providersParam) return

    // 清除 hash
    window.history.replaceState(null, '', window.location.pathname + window.location.search)

    // 处理 providers 参数：导入供应商（支持单个对象或数组）
    let importedProviderIds: string[] = []
    if (providersParam) {
      try {
        const raw = JSON.parse(atob(providersParam))
        const items = Array.isArray(raw) ? raw : [raw]
        const { providers, addProvider, updateProvider, setApiKey } = useStore.getState()
        for (const item of items) {
          const lc: Record<string, string> = {}
          for (const [k, v] of Object.entries(item)) lc[k.toLowerCase()] = v as string
          const name = lc.name || ''
          const apiUrl = lc.apiurl || ''
          const apiKey = lc.apikey || ''
          const existing = providers.find(p => p.name === name)
          if (existing) {
            updateProvider(existing.id, { baseUrl: apiUrl })
            if (apiKey) setApiKey(existing.id, apiKey)
            importedProviderIds.push(existing.id)
          } else if (apiUrl) {
            const id = 'custom-' + Date.now()
            addProvider({ id, name, baseUrl: apiUrl, models: [] })
            if (apiKey) setApiKey(id, apiKey)
            importedProviderIds.push(id)
          }
        }
      } catch { /* 忽略无效 providers */ }
    }

    // 导入供应商后打开设置界面定位到最后一个供应商
    if (importedProviderIds.length) {
      setSettingsInitialProviderId(importedProviderIds[importedProviderIds.length - 1])
      setSettingsOpen(true)
    }

    // 新建对话
    const { createConversation, setConversationSystemPrompt } = useStore.getState()
    const convId = createConversation()
    if (!convId) return

    if (text) {
      setPendingText(decodeURIComponent(text))
      if (autoSendParam) setAutoSend(true)
    }

    if (promptId) {
      const prompts = useStore.getState().uiConfig.prompts || []
      const prompt = prompts.find(p => p.id === promptId)
      if (prompt) {
        setConversationSystemPrompt(convId, prompt.content)
      }
    }
  }, [])

  // 主题同步到 DOM
  useEffect(() => {
    const updateTheme = () => {
      const theme = getTheme()
      const root = document.documentElement
      if (theme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    updateTheme()

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (uiConfig.theme === 'system') {
        updateTheme()
      }
    }
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [uiConfig.theme, getTheme])

  // 三态循环切换：system → light → dark → system
  const handleThemeToggle = useCallback(() => {
    const theme = uiConfig.theme || 'system'
    if (theme === 'system') {
      setTheme('light')
    } else if (theme === 'light') {
      setTheme('dark')
    } else {
      setTheme('system')
    }
  }, [uiConfig.theme, setTheme])

  // 获取当前主题图标
  const themeIcon = useMemo(() => {
    const theme = uiConfig.theme || 'system'
    const currentTheme = getTheme()
    if (theme === 'system') {
      return <Monitor className="size-3" />
    }
    return currentTheme === 'dark' ? <Moon className="size-3" /> : <Sun className="size-3" />
  }, [uiConfig.theme, getTheme])

  // 显示气泡确认框
  const showPopoverConfirm = useCallback((x: number, y: number, onConfirm: () => void) => {
    setPopoverConfirm({ open: true, x, y, onConfirm })
  }, [])

  // 显示模态确认框
  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, thirdLabel?: string, onThirdAction?: () => void) => {
    setConfirmDialog({ open: true, title, message, onConfirm, thirdLabel, onThirdAction })
  }, [])

  // 停止生成并切换对话
  const handleStopAndSwitch = useCallback((id: string) => {
    if (isLoading) stopGeneration()
    switchConversation(id)
  }, [isLoading, stopGeneration, switchConversation])

  // 停止生成并新建对话
  const handleStopAndCreate = useCallback(() => {
    if (isLoading) stopGeneration()
    createConversation()
  }, [isLoading, stopGeneration, createConversation])

  // 清理空对话
  const handleCleanEmptyChats = useCallback(() => {
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
  }, [conversations, t])

  // 导入 Markdown 文件
  const handleImportMarkdown = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const existing = useStore.getState().conversations
    const existingIds = new Set(existing.map(c => c.id))
    const imported: Conversation[] = []
    for (const file of Array.from(files)) {
      try {
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (ev) => resolve(ev.target?.result as string)
          reader.onerror = () => reject(new Error('File read error'))
          reader.readAsText(file)
        })
        const conv = parseMarkdownToConversation(content)
        if (existingIds.has(conv.id)) conv.id = generateId()
        existingIds.add(conv.id)
        imported.push(conv)
      } catch {
        toast.error(t('chatImportFailed'))
      }
    }
    if (imported.length > 0) {
      useStore.setState({
        conversations: [...imported, ...existing],
        currentConversationId: imported[imported.length - 1].id,
      })
      toast.success(t('chatImported', { count: imported.length }))
    }
    e.target.value = ''
  }

  // 解析 Markdown（含 Front Matter）为对话
  const parseMarkdownToConversation = (content: string): Conversation => {
    let id = generateId()
    let title = ''
    let createdAt = Date.now()
    let updatedAt = Date.now()
    let systemPrompt: string | undefined
    let body = content

    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
    if (fmMatch) {
      const fm = fmMatch[1]
      body = fmMatch[2]
      const get = (key: string) => fm.match(new RegExp(`^${key}:\\s*"?(.*?)"?$`, 'm'))?.[1]
      const idVal = get('id')
      if (idVal) id = idVal
      const titleVal = get('title')
      if (titleVal) title = titleVal
      const created = get('createdAt')
      if (created) { const t = new Date(created).getTime(); if (!isNaN(t)) createdAt = t }
      const updated = get('updatedAt')
      if (updated) { const t = new Date(updated).getTime(); if (!isNaN(t)) updatedAt = t }
      const sp = get('systemPrompt')
      if (sp) systemPrompt = sp
    }

    if (!title) {
      const titleMatch = body.match(/^#\s+(.+)$/m)
      if (titleMatch) title = titleMatch[1]
    }

    const messages: Conversation['messages'] = []
    const parts = body.split(/(^##\s+(?:\S+\s+)?(?:User|Assistant)\s*$)/m)
    for (let i = 1; i < parts.length; i += 2) {
      const headerLine = parts[i]
      const content = parts[i + 1] || ''
      const roleMatch = headerLine.match(/(User|Assistant)/)
      if (!roleMatch) continue
      const role = roleMatch[1].toLowerCase() as 'user' | 'assistant'
      let raw = content.trim()
      raw = raw.replace(/\n*---\s*$/, '').trim()
      let thinking: string | undefined
      const thinkMatch = raw.match(/^<div[^>]*>\s*<details[^>]*>\s*<summary>[\s\S]*?<\/summary>\s*([\s\S]*?)\s*<\/details>\s*<\/div>/m)
      if (thinkMatch) {
        const thinkContent = thinkMatch[1].replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').trim()
        if (thinkContent) thinking = thinkContent
        raw = raw.replace(thinkMatch[0], '').trim()
      }
      if (raw) {
        messages.push({ id: generateId(), role, content: raw, timestamp: Date.now(), ...(thinking ? { thinking } : {}) })
      }
    }

    return { id, title, messages, createdAt, updatedAt, ...(systemPrompt ? { systemPrompt } : {}) }
  }

  // 导入 JSONL 文件
  const handleImportJsonl = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const imported: Conversation[] = []
    for (const file of Array.from(files)) {
      try {
        imported.push(await parseJsonlFile(file))
      } catch {
        toast.error(t('jsonlImportFailed'))
      }
    }
    if (imported.length > 0) {
      const existing = useStore.getState().conversations
      useStore.setState({
        conversations: [...imported, ...existing],
        currentConversationId: imported[0].id,
      })
      toast.success(t('jsonlImported', { count: imported.length }))
    }
    e.target.value = ''
  }

  // 解析单个 JSONL 文件为 Conversation
  const parseJsonlFile = (file: File): Promise<Conversation> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const content = ev.target?.result as string
          const lines = content.split('\n').filter(line => line.trim())
          const messages: Conversation['messages'] = []
          let sessionId = ''
          let aiTitle = ''

          for (const line of lines) {
            try {
              const entry = JSON.parse(line)
              if (entry.type === 'summary') {
                if (entry.sessionId) sessionId = entry.sessionId
                if (entry.aiTitle) aiTitle = entry.aiTitle
                continue
              }
              if (entry.type === 'user' || entry.type === 'assistant') {
                let text = ''
                let thinking: string | undefined
                if (typeof entry.content === 'string') {
                  text = entry.content
                } else if (Array.isArray(entry.content)) {
                  const textItem = entry.content.find((c: any) => c.type === 'text')
                  const thinkItem = entry.content.find((c: any) => c.type === 'thinking')
                  if (textItem) text = textItem.text
                  if (thinkItem) thinking = thinkItem.thinking
                }
                if (text.startsWith('<ide_selection>')) continue
                if (text || thinking) {
                  messages.push({
                    id: generateId(),
                    role: entry.type,
                    content: text,
                    timestamp: entry.timestamp || Date.now(),
                    ...(thinking ? { thinking } : {}),
                    ...(entry.model ? { model: entry.model } : {}),
                  })
                }
              }
            } catch { /* 跳过无效行 */ }
          }

          if (messages.length === 0) {
            reject(new Error(t('jsonlNoMessages')))
            return
          }

          const title = aiTitle || file.name.replace(/\.jsonl$/i, '') || t('untitled')
          resolve({
            id: sessionId || generateId(),
            title,
            messages,
            createdAt: messages[0]?.timestamp || Date.now(),
            updatedAt: messages[messages.length - 1]?.timestamp || Date.now(),
          })
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('File read error'))
      reader.readAsText(file)
    })
  }

  // 导出所有配置为 JSON 文件
  const handleExportData = () => {
    const data = {
      version: APP_VERSION,
      exportTime: new Date().toISOString(),
      conversations,
      providers: useStore.getState().providers,
      apiKeys: useStore.getState().apiKeys,
      selectedModel,
      globalSystemPrompt,
      modelParams: storeModelParams,
      uiConfig,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-all-config-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 导入 JSON 配置文件并刷新页面
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string
        const data = JSON.parse(content)
        if (!data.version || !Array.isArray(data.conversations)) throw new Error(t('invalidDataFormat'))
        localStorage.setItem('chat-storage', JSON.stringify({
          state: {
            conversations: data.conversations || [],
            currentConversationId: data.currentConversationId || null,
            providers: data.providers || [],
            apiKeys: data.apiKeys || {},
            selectedModel: data.selectedModel || '',
            globalSystemPrompt: data.globalSystemPrompt || '',
            modelParams: data.modelParams || {},
            uiConfig: data.uiConfig || {},
          }
        }))
        window.location.reload()
      } catch (error) {
        toast.error(t('dataImportFailed', { error: error instanceof Error ? error.message : '' }))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <TooltipProvider>
      <div className="h-dvh flex bg-background text-sm overflow-hidden">
        {/* Skip Link - 仅在获得焦点时可见 */}
        <a
          href="#chat-input"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-1 focus:left-1 focus:px-3 focus:py-1.5 focus:text-xs focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {t('skipToInput')}
        </a>
        {/* 隐藏的文件输入 */}
        <input ref={mdInputRef} type="file" accept=".md" multiple className="hidden" onChange={handleImportMarkdown} />
        <input ref={jsonlInputRef} type="file" accept=".jsonl" multiple className="hidden" onChange={handleImportJsonl} />

        {/* 侧边栏 */}
        <Sidebar
          sidebarOpen={sidebarOpen}
          onPopoverConfirm={showPopoverConfirm}
          onStopAndSwitchConversation={handleStopAndSwitch}
          onStopAndCreateConversation={handleStopAndCreate}
          onOpenSettings={() => setSettingsOpen(true)}
          onCloseSidebar={() => setSidebarOpen(false)}
          onShowConfirm={showConfirm}
          onImportMarkdown={() => mdInputRef.current?.click()}
          onImportJsonl={() => jsonlInputRef.current?.click()}
          onCleanEmptyChats={handleCleanEmptyChats}
        />

        {/* 聊天区域 */}
        <ChatArea
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onShowPopoverConfirm={showPopoverConfirm}
          onToggleChatWidth={() => setUIConfig({ chatWidth: uiConfig.chatWidth === 'compact' ? 'full' : 'compact' })}
          chatWidth={uiConfig.chatWidth}
          fontSize={uiConfig.fontSize}
          autoCollapseCode={uiConfig.autoCollapseCode || false}
          autoHideThinking={uiConfig.autoHideThinking !== false}
          onShowSettings={() => setSettingsOpen(true)}
          isLoading={isLoading}
          streamingContent={streamingContent}
          streamingThinking={streamingThinking}
          sendMessage={sendMessage}
          stopGeneration={stopGeneration}
          regenerate={regenerate}
          pendingText={pendingText}
          autoSend={autoSend}
          onPendingTextConsumed={() => setPendingText(null)}
          onAutoSendConsumed={() => setAutoSend(false)}
          onThemeToggle={handleThemeToggle}
          themeIcon={themeIcon}
          currentTheme={uiConfig.theme || 'system'}
          editingTitle={editingTitle}
          onEditingTitleDone={() => setEditingTitle(false)}
        />

        {/* 设置对话框 */}
        <SettingsDialog
          open={settingsOpen}
          onClose={() => { setSettingsOpen(false); setSettingsInitialProviderId(undefined) }}
          onShowPopoverConfirm={showPopoverConfirm}
          onShowConfirm={showConfirm}
          configImportInputRef={configImportInputRef}
          promptImportInputRef={promptImportInputRef}
          onExportData={handleExportData}
          onImportData={handleImportData}
          onThemeChange={setTheme}
          initialProviderId={settingsInitialProviderId}
        />

        {/* Toast 通知 */}
        <Toaster />

        {/* 模态确认框 */}
        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          message={confirmDialog.message}
          thirdLabel={confirmDialog.thirdLabel}
          onThirdAction={confirmDialog.onThirdAction}
          onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
          onConfirm={() => {
            confirmDialog.onConfirm()
            setConfirmDialog(prev => ({ ...prev, open: false }))
          }}
        />

        {/* 气泡确认框 */}
        <PopoverConfirm
          open={popoverConfirm.open}
          x={popoverConfirm.x}
          y={popoverConfirm.y}
          onClose={() => setPopoverConfirm(prev => ({ ...prev, open: false }))}
          onConfirm={() => {
            popoverConfirm.onConfirm()
            setPopoverConfirm(prev => ({ ...prev, open: false }))
          }}
        />
      </div>
    </TooltipProvider>
  )
}

export default App
