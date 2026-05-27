import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from './store'
import { APP_VERSION } from './constants.base'
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

function App() {
  const {
    conversations,
    currentConversationId,
    selectedModel,
    globalSystemPrompt,
    modelParams: storeModelParams,
    uiConfig,
    createConversation,
    setUIConfig,
    switchConversation,
    setTheme,
    getTheme,
  } = useStore()

  const { isLoading, streamingContent, streamingThinking, sendMessage, stopGeneration, regenerate } = useChat()

  // 状态
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsInitialProviderId, setSettingsInitialProviderId] = useState<string | undefined>()
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)

  // 移动端（<768px）自动隐藏侧栏
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(!e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({
    open: false, title: '', message: '', onConfirm: () => {}
  })
  const [popoverConfirm, setPopoverConfirm] = useState<{ open: boolean; x: number; y: number; onConfirm: () => void }>({
    open: false, x: 0, y: 0, onConfirm: () => {}
  })

  const { t } = useTranslation()

  const configImportInputRef = useRef<HTMLInputElement>(null)
  const promptImportInputRef = useRef<HTMLInputElement>(null)

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
  const handleThemeToggle = () => {
    const theme = uiConfig.theme || 'system'
    if (theme === 'system') {
      setTheme('light')
    } else if (theme === 'light') {
      setTheme('dark')
    } else {
      setTheme('system')
    }
  }

  // 获取当前主题图标
  const getThemeIcon = () => {
    const theme = uiConfig.theme || 'system'
    const currentTheme = getTheme()
    if (theme === 'system') {
      return <Monitor className="size-3" />
    }
    return currentTheme === 'dark' ? <Moon className="size-3" /> : <Sun className="size-3" />
  }

  // 显示气泡确认框
  const showPopoverConfirm = (x: number, y: number, onConfirm: () => void) => {
    setPopoverConfirm({ open: true, x, y, onConfirm })
  }

  // 显示模态确认框
  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, message, onConfirm })
  }

  // 停止生成并切换对话
  const handleStopAndSwitch = (id: string) => {
    if (isLoading) stopGeneration()
    switchConversation(id)
  }

  // 停止生成并新建对话
  const handleStopAndCreate = () => {
    if (isLoading) stopGeneration()
    createConversation()
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
      <div className="h-screen flex bg-background text-sm">
        {/* 侧边栏 */}
        <Sidebar
          sidebarOpen={sidebarOpen}
          onPopoverConfirm={showPopoverConfirm}
          onStopAndSwitchConversation={handleStopAndSwitch}
          onStopAndCreateConversation={handleStopAndCreate}
          onOpenSettings={() => setSettingsOpen(true)}
          onCloseSidebar={() => setSidebarOpen(false)}
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
          themeIcon={getThemeIcon()}
          currentTheme={uiConfig.theme || 'system'}
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
