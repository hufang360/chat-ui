import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from './store'
import { useChat } from './hooks/useChat'
import { TooltipProvider } from './components/ui/tooltip'
import { Toaster, toast } from 'sonner'
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
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
      version: '1.0.0',
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
          onThemeToggle={handleThemeToggle}
          themeIcon={getThemeIcon()}
          currentTheme={uiConfig.theme || 'system'}
        />

        {/* 设置对话框 */}
        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onShowPopoverConfirm={showPopoverConfirm}
          onShowConfirm={showConfirm}
          configImportInputRef={configImportInputRef}
          promptImportInputRef={promptImportInputRef}
          onExportData={handleExportData}
          onImportData={handleImportData}
          onThemeChange={setTheme}
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
