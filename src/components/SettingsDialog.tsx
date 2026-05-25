import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from '../store'
import type { ModelParams, Provider, ModelMetadata } from '../types'
import { MODEL_CAPABILITIES, DEFAULT_MODEL_PARAMS } from '../constants'
import { formatNumber } from '../utils/modelUtils'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ModelEditDialog } from './ModelEditDialog'
import { PromptImportDialog } from './PromptImportDialog'
import {
  X,
  Plus,
  Trash2,
  Upload,
  Download,
  Eye,
  EyeOff,
  Brain,
  Lightbulb,
  Edit2,
  Check,
  Cpu,
  Sliders,
  CloudDownload,
  RotateCcw,
  GripVertical,
  SwatchBook,
  Moon,
  Sun,
  Monitor,
  Settings,
} from 'lucide-react'

const generateId = () => Math.random().toString(36).substring(2, 9)

// 弹出层垂直偏移，对应 spacing-2 (0.5rem = 8px)
const POPOVER_OFFSET = 8

export interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  onShowPopoverConfirm: (x: number, y: number, onConfirm: () => void) => void
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void
  configImportInputRef: React.RefObject<HTMLInputElement | null>
  promptImportInputRef: React.RefObject<HTMLInputElement | null>
  onExportData: () => void
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void
}

export function SettingsDialog({
  open,
  onClose,
  onShowPopoverConfirm,
  onShowConfirm,
  configImportInputRef,
  promptImportInputRef,
  onExportData,
  onImportData,
  onThemeChange,
}: SettingsDialogProps) {
  const {
    providers,
    apiKeys,
    selectedModel,
    globalSystemPrompt,
    modelParams: storeModelParams,
    uiConfig,
    setApiKey,
    setGlobalSystemPrompt,
    setUIConfig,
    setModelParams,
    addProvider,
    updateProvider,
    deleteProvider,
    reorderProvider,
    addPrompt,
    deletePrompt,
    updatePrompt,
    reorderPrompts,
    exportConfig,
    importConfig,
    setLanguage,
  } = useStore()

  const { t } = useTranslation()

  const [settingsTab, setSettingsTab] = useState('api')
  const [selectedProviderId, setSelectedProviderId] = useState<string>('openai')
  const [fetchedModels, setFetchedModels] = useState<string[]>([])
  const [selectedFetchedModel, setSelectedFetchedModel] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [draggedProviderId, setDraggedProviderId] = useState<string | null>(null)
  const [dragOverProviderId, setDragOverProviderId] = useState<string | null>(null)
  const [draggedModelIndex, setDraggedModelIndex] = useState<number | null>(null)
  const [dragOverModelIndex, setDragOverModelIndex] = useState<number | null>(null)
  // 新建供应商的临时 ID，用于触发自动进入名称编辑状态
  const [newProviderId, setNewProviderId] = useState<string | null>(null)
  const dragGhostRef = useRef<HTMLElement | null>(null)
  const [editingProviderName, setEditingProviderName] = useState(false) // 是否正在编辑供应商名称
  const providerNameInputRef = useRef<HTMLInputElement>(null) // 名称输入框引用，用于聚焦和选中文本
  const [localModelParams, setLocalModelParams] = useState<ModelParams>(storeModelParams)

  // 提示词状态
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number | null>(null)
  const [draggedPromptIndex, setDraggedPromptIndex] = useState<number | null>(null)
  const [dragOverPromptIndex, setDragOverPromptIndex] = useState<number | null>(null)
  const [promptImportUrl, setPromptImportUrl] = useState('https://github.com/PlexPt/awesome-chatgpt-prompts-zh/blob/main/prompts-zh.json')
  const [promptImportDialogOpen, setPromptImportDialogOpen] = useState(false)

  // 模型编辑
  const [editModelOpen, setEditModelOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<{ model: string; metadata: ModelMetadata; providerId: string } | null>(null)

  // 模型参数重置确认
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

  /** 弹出模型参数重置确认 */
  const handleResetModelParams = () => {
    setResetConfirmOpen(true)
  }

  /** 确认重置模型参数为默认值 */
  const confirmResetModelParams = () => {
    setLocalModelParams(DEFAULT_MODEL_PARAMS)
    setResetConfirmOpen(false)
  }

  // API 额度
  const [apiBalances, setApiBalances] = useState<Record<string, { balance: string; currency: string; loading: boolean; timestamp?: number }>>(() => {
    try {
      const saved = localStorage.getItem('chat-api-balances')
      return saved ? JSON.parse(saved) : {}
    } catch { return {} }
  })
  const [autoQueryBalance, setAutoQueryBalance] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('chat-auto-query-balance')
      return saved ? JSON.parse(saved) : {}
    } catch { return {} }
  })

  const apiKeyInputRef = useRef<HTMLInputElement>(null) // API Key 输入框引用
  const promptContentInputRef = useRef<HTMLTextAreaElement>(null) // 提示词内容输入框引用

  const selectedProvider = providers.find(p => p.id === selectedProviderId) // 当前选中的供应商

  // 计算当前模型的上下文限制
  const modelCapability = MODEL_CAPABILITIES[selectedModel]
  const currentModelContextLimit = modelCapability?.contextLength

  // 同步模型参数
  useEffect(() => { setLocalModelParams(storeModelParams) }, [storeModelParams])

  // 关闭设置时保存模型参数
  const handleClose = () => {
    setModelParams(localModelParams)
    onClose()
  }

  // 初始化选中的供应商
  useEffect(() => {
    if (providers.length > 0 && !providers.find(p => p.id === selectedProviderId)) {
      setSelectedProviderId(providers[0].id)
    }
  }, [providers])

  // --- Effects ---
  // 切换供应商时重置模型列表和编辑状态
  useEffect(() => {
    setFetchedModels([])
    setSelectedFetchedModel('')
    setModelSearch('')
    setEditingProviderName(false)
  }, [selectedProviderId])

  // 新建供应商时自动进入名称编辑状态
  useEffect(() => {
    if (newProviderId && selectedProviderId === newProviderId) {
      setEditingProviderName(true)
      setNewProviderId(null)
    }
  }, [newProviderId, selectedProviderId])

  // 编辑状态下自动聚焦
  useEffect(() => {
    if (editingProviderName) {
      setTimeout(() => providerNameInputRef.current?.select(), 0)
    }
  }, [editingProviderName])

  // 持久化 apiBalances
  useEffect(() => {
    const toSave: Record<string, any> = {}
    for (const [key, val] of Object.entries(apiBalances)) {
      if (val.timestamp) {
        toSave[key] = { balance: val.balance, currency: val.currency, timestamp: val.timestamp }
      }
    }
    localStorage.setItem('chat-api-balances', JSON.stringify(toSave))
  }, [apiBalances])

  // 持久化 autoQueryBalance
  useEffect(() => {
    localStorage.setItem('chat-auto-query-balance', JSON.stringify(autoQueryBalance))
  }, [autoQueryBalance])

  // 新增供应商后聚焦 API Key
  useEffect(() => {
    if (newProviderId && selectedProviderId === newProviderId) {
      setTimeout(() => apiKeyInputRef.current?.focus(), 100)
      setNewProviderId(null)
    }
  }, [selectedProviderId, newProviderId])

  // 切换供应商时自动刷新余额（仅当开启自动查询且距上次查询超过 5 分钟）
  useEffect(() => {
    if (!selectedProvider || !autoQueryBalance[selectedProvider.id]) return
    const balance = apiBalances[selectedProvider.id]
    if (!balance?.timestamp) {
      handleCheckApiBalance(selectedProvider.id, true)
    } else {
      const now = Date.now()
      if (now - balance.timestamp > 5 * 60 * 1000) {
        handleCheckApiBalance(selectedProvider.id, true)
      }
    }
  }, [selectedProviderId])

  // --- Handlers ---

  /** 新建供应商 */
  const handleAddProvider = () => {
    const providerId = `provider-${Date.now()}`
    const provider: Provider = {
      id: providerId,
      name: t('newProvider'),
      baseUrl: '',
      models: [],
      type: 'chat',
      deletable: true,
    }
    addProvider(provider)
    setNewProviderId(providerId)
    setSelectedProviderId(providerId)
  }

  /** 打开模型编辑弹窗 */
  const handleEditModel = (model: string, providerId: string) => {
    const provider = providers.find(p => p.id === providerId)
    if (!provider) return
    const metadata = provider.modelMetadata?.[model] || { supportsVision: false, supportsThinking: false }
    setEditingModel({ model, metadata, providerId })
    setEditModelOpen(true)
  }

  /** 模型列表拖拽排序 */
  const reorderModels = (fromIndex: number, toIndex: number) => {
    if (!selectedProvider || fromIndex === toIndex) return
    const models = [...selectedProvider.models]
    const [removed] = models.splice(fromIndex, 1)
    models.splice(toIndex, 0, removed)
    updateProvider(selectedProvider.id, { models })
  }

  /** 查询 API 余额 */
  const handleCheckApiBalance = async (providerId: string, silent = false) => {
    const provider = providers.find(p => p.id === providerId)
    const apiKey = apiKeys[providerId]
    if (!provider || !apiKey) {
      // 仅支持已知供应商的余额查询
      if (!silent) toast(t('pleaseConfigureApiKey'))
      return
    }

    setApiBalances(prev => ({ ...prev, [providerId]: { balance: t('querying'), currency: '', loading: true } }))

    try {
      let balance = ''
      let currency = ''

      // 各供应商余额 API 格式不同，按 id 或 baseUrl 匹配
      if (provider.id === 'deepseek' || provider.baseUrl.includes('deepseek')) {
        const response = await fetch('https://api.deepseek.com/user/balance', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        })
        if (response.ok) {
          const data = await response.json()
          balance = (data.balance_infos?.[0]?.total_balance || data.balance || '0').toString()
          currency = '¥'
        }
      } else if (provider.id === 'openrouter' || provider.baseUrl.includes('openrouter')) {
        const response = await fetch('https://openrouter.ai/api/v1/credits', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        })
        if (response.ok) {
          const data = await response.json()
          const totalCredits = parseFloat(data.data?.total_credits || '0')
          const totalUsage = parseFloat(data.data?.total_usage || '0')
          balance = `已使用：$${totalUsage.toFixed(2)} 剩余：$${(totalCredits - totalUsage).toFixed(2)}`
          currency = '$'
        }
      } else if (provider.id === 'siliconflow' || provider.baseUrl.includes('siliconflow')) {
        const response = await fetch('https://api.siliconflow.cn/v1/user/info', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        })
        if (response.ok) {
          const data = await response.json()
          balance = (data.data?.chargeBalance || '0').toString()
          currency = '¥'
        }
      } else if (provider.id === 'moonshot' || provider.baseUrl.includes('moonshot')) {
        let url = 'https://api.moonshot.cn/v1/users/me/balance'
        const headers: Record<string, string> = { 'Authorization': `Bearer ${apiKey}` }
        if (provider.useCorsProxy && uiConfig.corsProxyUrl) {
          url = `${uiConfig.corsProxyUrl}${url}`
        }
        try {
          const response = await fetch(url, { headers })
          if (response.ok) {
            const data = await response.json()
            if (data.status === true && data.data) {
              balance = (data.data.available_balance || '0').toString()
              currency = '¥'
            }
          }
        } catch { /* ignore */ }
      }

      if (balance) {
        const displayBalance = currency === '$' && balance.includes(t('used')) ? balance : `${currency}${balance}`
        setApiBalances(prev => ({ ...prev, [providerId]: { balance: displayBalance, currency, loading: false, timestamp: Date.now() } }))
      } else {
        setApiBalances(prev => ({ ...prev, [providerId]: { balance: t('notSupported'), currency: '', loading: false } }))
      }
    } catch {
      setApiBalances(prev => ({ ...prev, [providerId]: { balance: t('queryFailed'), currency: '', loading: false } }))
    }
  }

  /** 导出供应商配置为 JSON 文件 */
  const handleExportConfig = () => {
    const config = exportConfig()
    const blob = new Blob([config], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-providers-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /** 导入供应商配置文件 */
  const handleImportConfigFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string
        JSON.parse(content)
        importConfig(content)
        toast(t('configImportSuccess'))
      } catch (error) {
        toast(t('configImportFailed', { error: error instanceof Error ? error.message : 'Unknown error' }))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

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
      // GitHub blob URL 转 raw URL，以获取文件原始内容
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
    const prompts = (uiConfig.prompts || []).map(p => ({ act: p.name, prompt: p.content }))
    const blob = new Blob([JSON.stringify(prompts, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-prompts-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /** 格式化相对时间（x分钟前） */
  const formatTimeAgo = (timestamp: number) => {
    const diffMs = Date.now() - timestamp
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return t('justNow')
    if (diffMins < 60) return t('minutesAgo', { count: diffMins })
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return t('hoursAgo', { count: diffHours })
    return t('daysAgo', { count: Math.floor(diffHours / 24) })
  }

  if (!open) return null

  return (
    <>
      {/* 设置弹窗 */}
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="w-[48rem] h-[45rem] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* 顶部标题栏 */}
            <div className="h-8 border-b flex items-center justify-between px-2 shrink-0">
              <span className="text-xs font-medium">{t('settings')}</span>
              <Tooltip>
                <TooltipTrigger render={<Button size="icon" variant="ghost" className="size-6" onClick={handleClose} />}>
                  <X data-icon className="size-3" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-2xs px-2 py-1">{t('close')}</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* 左侧导航 */}
              <div className="w-36 border-r p-2 flex flex-col gap-1">
                <Button variant={settingsTab === 'general' ? 'outline' : 'ghost'} size="sm" className="w-full justify-start text-xs h-7 gap-1.5" onClick={() => setSettingsTab('general')}>
                  <Settings data-icon="inline-start" className="size-3 shrink-0" /><span className="truncate">{t('generalSettings')}</span>
                </Button>
                <Button variant={settingsTab === 'api' ? 'outline' : 'ghost'} size="sm" className="w-full justify-start text-xs h-7 gap-1.5" onClick={() => setSettingsTab('api')}>
                  <Cpu data-icon="inline-start" className="size-3 shrink-0" /><span className="truncate">{t('modelService')}</span>
                </Button>
                <Button variant={settingsTab === 'model' ? 'outline' : 'ghost'} size="sm" className="w-full justify-start text-xs h-7 gap-1.5" onClick={() => setSettingsTab('model')}>
                  <Sliders data-icon="inline-start" className="size-3 shrink-0" /><span className="truncate">{t('modelParams')}</span>
                </Button>
                <Button variant={settingsTab === 'prompts' ? 'outline' : 'ghost'} size="sm" className="w-full justify-start text-xs h-7 gap-1.5" onClick={() => setSettingsTab('prompts')}>
                  <SwatchBook data-icon="inline-start" className="size-3 shrink-0" /><span className="truncate">{t('prompts')}</span>
                </Button>

              </div>

              {/* 右侧内容区 */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* --- 通用设置 Tab --- */}
                {settingsTab === 'general' && (
                  <div className="p-4 overflow-y-auto flex flex-col gap-3">
                    {/* UI 设置 */}
                    <div>
                    {/* 默认系统提示词 */}
                      <div className="space-y-5">
                        <div className='gap-1.5'>
                          <Label className="text-xs text-muted-foreground">{t('defaultPrompt')}</Label>
                          <Textarea value={globalSystemPrompt} onChange={e => setGlobalSystemPrompt(e.target.value)}
                            placeholder={t('defaultPromptPlaceholder')} rows={3} className="text-xs resize-none"
                          />
                        </div>
                        {/* 字号 */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">{t('fontSize')}</Label>
                          <div role="tablist" className="grid grid-cols-3 h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground">
                            {(['xs', 'base', 'xl'] as const).map(size => (
                              <button key={size} role="tab"
                                aria-selected={uiConfig.fontSize === size}
                                className={cn(
                                  "inline-flex items-center justify-center rounded-md py-1 text-xs font-medium transition-all",
                                  uiConfig.fontSize === size && "bg-background text-foreground shadow-sm"
                                )}
                                onClick={() => setUIConfig({ fontSize: size })}
                              >{t('fontSize' + size.toUpperCase())}</button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1 text-2xs cursor-pointer">
                            <Checkbox checked={uiConfig.autoCollapseCode || false}
                              onCheckedChange={checked => setUIConfig({ autoCollapseCode: !!checked })}
                            />{t('autoCollapseCode')}
                          </label>
                          <label className="flex items-center gap-1 text-2xs cursor-pointer">
                            <Checkbox checked={uiConfig.autoHideThinking || false}
                              onCheckedChange={checked => setUIConfig({ autoHideThinking: !!checked })}
                            />{t('autoHideThinking')}
                          </label>
                        </div>
                        {/* cors */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">{t('corsProxyUrl')}</Label>
                          <Input value={uiConfig.corsProxyUrl || ''}
                            onChange={e => setUIConfig({ corsProxyUrl: e.target.value || undefined })}
                            placeholder="https://cors.xx.com/?" className="h-7 text-2xs"
                          />
                          <p className="text-3xs text-muted-foreground">{t('corsProxyDescription')}</p>
                        </div>


                        {/* 主题 */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">{t('theme')}</Label>
                          <div role="tablist" className="grid grid-cols-3 h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground">
                            {([
                              { value: 'light', label: t('themeLight'), icon: <Sun className="size-3" /> },
                              { value: 'dark', label: t('themeDark'), icon: <Moon className="size-3" /> },
                              { value: 'system', label: t('followSystem'), icon: <Monitor className="size-3" /> },
                            ] as const).map(theme => (
                              <button key={theme.value} role="tab"
                                aria-selected={(uiConfig.theme || 'system') === theme.value}
                                className={cn(
                                  "inline-flex items-center justify-center gap-1 rounded-md py-1 text-xs font-medium transition-all",
                                  (uiConfig.theme || 'system') === theme.value && "bg-background text-foreground shadow-sm"
                                )}
                                onClick={() => onThemeChange?.(theme.value as 'light' | 'dark' | 'system')}
                              >{theme.icon}{theme.label}</button>
                            ))}
                          </div>
                        </div>
                        {/* 语言 */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">{t('language')}</Label>
                          <div role="tablist" className="grid grid-cols-2 h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground">
                            {([
                              { value: 'zh', label: t('chinese') },
                              { value: 'en', label: t('english') },
                            ] as const).map(lang => (
                              <button key={lang.value} role="tab"
                                aria-selected={(uiConfig.language || 'zh') === lang.value}
                                className={cn(
                                  "inline-flex items-center justify-center rounded-md py-1 text-xs font-medium transition-all",
                                  (uiConfig.language || 'zh') === lang.value && "bg-background text-foreground shadow-sm"
                                )}
                                onClick={() => setLanguage(lang.value as 'zh' | 'en')}
                              >{lang.label}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* 数据管理 */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs text-muted-foreground">{t('dataManagement')}</Label>
                      <div className="mt-auto flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => document.getElementById('import-data-input')?.click()} className="w-full h-7 text-xs">
                          <Upload data-icon="inline-start" className="size-3 mr-1" />{t('importData')}
                        </Button>
                      <input id="import-data-input" type="file" accept=".json" className="hidden" onChange={onImportData} />
                      <Button variant="outline" size="sm"
                        onClick={() => onShowConfirm(t('factoryResetTitle'), t('factoryResetContent'), () => { localStorage.clear(); window.location.reload() })}
                        className="w-full h-7 text-xs"
                      ><RotateCcw data-icon="inline-start" className="size-3 mr-1" />{t('factoryReset')}</Button>
                        <Button variant="outline" size="sm" onClick={onExportData} className="w-full h-7 text-xs">
                          <Download data-icon="inline-start" className="size-3 mr-1" />{t('exportData')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* --- API 供应商 Tab --- */}
                {settingsTab === 'api' && (
                  <div className="flex flex-1 overflow-hidden">
                    {/* 供应商列表侧栏 */}
                    <div className="w-44 border-r p-3 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-medium text-muted-foreground">{t('provider')}</Label>
                        <Tooltip>
                          <TooltipTrigger render={<Button size="icon" variant="ghost" className="size-5" onClick={handleAddProvider} />}>
                            <Plus data-icon className="size-3" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-2xs px-2 py-1">{t('addProvider')}</TooltipContent>
                        </Tooltip>
                      </div>
                      {/* 供应商列表（支持拖拽排序） */}
                      <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-1">
                        {providers.map((p) => (
                          <div key={p.id} className="group relative"
                            onDragOver={(e) => { e.preventDefault(); setDragOverProviderId(p.id) }}
                            onDragEnd={() => {
                              if (draggedProviderId && dragOverProviderId && draggedProviderId !== dragOverProviderId) {
                                reorderProvider(draggedProviderId, dragOverProviderId)
                              }
                              setDraggedProviderId(null); setDragOverProviderId(null)
                              if (dragGhostRef.current) { document.body.removeChild(dragGhostRef.current); dragGhostRef.current = null }
                            }}
                          >
                            {/* 拖拽排序手柄 */}
                            <span
                              className="absolute left-0.5 top-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover:opacity-100 z-10"
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation(); setDraggedProviderId(p.id)
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
                            <Button variant={selectedProviderId === p.id ? 'outline' : 'ghost'} size="sm"
                              className="justify-start text-xs h-7 truncate w-full"
                              onClick={() => setSelectedProviderId(p.id)}
                            >
                              <span className="truncate">{p.name}</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                      {/* 导入/导出配置 */}
                      <div className="mt-auto pt-2 border-t flex gap-1">
                        <Button size="sm" variant="outline" className="flex-1 h-6 text-2xs" onClick={() => configImportInputRef.current?.click()}>
                          <Upload data-icon="inline-start" className="size-2.5 mr-0.5" />{t('import')}
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 h-6 text-2xs" onClick={handleExportConfig}>
                          <Download data-icon="inline-start" className="size-2.5 mr-0.5" />{t('export')}
                        </Button>
                      </div>
                    </div>

                    {/* 供应商详情区 */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {selectedProvider && (
                        <div className="h-full flex flex-col">
                          {/* 供应商头部：名称编辑 + 操作按钮 */}
                          <div className="border-b p-3 flex flex-col gap-2 bg-muted/30">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                {editingProviderName ? (
                                  <Input
                                    ref={providerNameInputRef}
                                    className="h-6 text-xs font-medium px-1 py-0 w-40"
                                    value={selectedProvider.name}
                                    onChange={e => updateProvider(selectedProvider.id, { name: e.target.value })}
                                    onBlur={() => setEditingProviderName(false)}
                                    onKeyDown={e => { if (e.key === 'Enter') setEditingProviderName(false) }}
                                    autoComplete="off"
                                  />
                                ) : (
                                  <h3 className="text-xs font-medium cursor-pointer" onClick={() => setEditingProviderName(true)}>{selectedProvider.name}</h3>
                                )}
                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                  <Checkbox
                                    checked={selectedProvider.apiType === 'ollama'}
                                    onCheckedChange={checked => {
                                      updateProvider(selectedProvider.id, { apiType: checked ? 'ollama' : 'openai' })
                                    }}
                                  />
                                  <span className="text-2xs text-muted-foreground">{t('localModel')}</span>
                                </label>
                                <Switch
                                  checked={!selectedProvider.disabled}
                                  onCheckedChange={checked => updateProvider(selectedProvider.id, { disabled: !checked })}
                                  className="scale-75"
                                />
                              </div>
                              <Tooltip>
                                <TooltipTrigger render={<Button size="icon" variant="ghost" className="size-6 hover:text-destructive"
                                    onClick={e => {
                                      onShowPopoverConfirm(e.clientX, e.clientY + POPOVER_OFFSET, () => {
                                        const currentIndex = providers.findIndex(p => p.id === selectedProvider.id)
                                        const targetIndex = currentIndex > 0 ? currentIndex - 1 : Math.min(currentIndex + 1, providers.length - 1)
                                        const targetProvider = providers[targetIndex]
                                        deleteProvider(selectedProvider.id)
                                        setSelectedProviderId(targetProvider?.id || '')
                                      })
                                    }}
                              />}>
                                <Trash2 data-icon className="size-3" />
                              </TooltipTrigger>
                                <TooltipContent side="top" className="text-2xs px-2 py-1">{t('deleteProvider')}</TooltipContent>
                              </Tooltip>
                            </div>

                            <div className="grid grid-rows-2 gap-2">

                              {/* API Key */}
                              <div className="flex flex-col gap-1">
                                <Label className="text-xs text-muted-foreground">API Key</Label>
                                <div className="relative">
                                  <Input ref={apiKeyInputRef}
                                    type={showApiKey ? 'text' : 'password'}
                                    value={apiKeys[selectedProvider.id] || ''}
                                    onChange={e => setApiKey(selectedProvider.id, e.target.value)}
                                    placeholder="sk-..." className="h-7 text-2xs pr-7"
                                  />
                                  <button type="button" onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                                  >{showApiKey ? <EyeOff className="size-3" /> : <Eye className="size-3" />}</button>
                                </div>
                              </div>

                              {/* Base URL */}
                              <div className="flex flex-col gap-1">
                                <Label className="text-xs text-muted-foreground">Base URL</Label>
                                <Input value={selectedProvider.baseUrl}
                                  onChange={e => updateProvider(selectedProvider.id, { baseUrl: e.target.value })}
                                  placeholder="https://api.xx.com/v1" className="h-7 text-2xs"
                                />
                                {/* CORS 代理 */}
                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                  <Checkbox id="cors-proxy" checked={selectedProvider.useCorsProxy || false}
                                    onCheckedChange={checked => {
                                      if (checked && !uiConfig.corsProxyUrl) { alert(t('configureCorsProxyFirst')); return }
                                      updateProvider(selectedProvider.id, { useCorsProxy: checked })
                                    }}
                                  />
                                  <span className="text-2xs text-muted-foreground">{t('useCorsProxy')}</span>
                                </label>
                              </div>
                            </div>

                            {/* API 额度 */}
                            {(selectedProvider.id === 'deepseek' || selectedProvider.id === 'openrouter' || selectedProvider.id === 'siliconflow' || selectedProvider.id === 'moonshot' ||
                              selectedProvider.baseUrl.includes('deepseek') || selectedProvider.baseUrl.includes('openrouter') || selectedProvider.baseUrl.includes('siliconflow') || selectedProvider.baseUrl.includes('moonshot')) && (
                              <div className="flex flex-col gap-1.5 pt-1.5 border-t">
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-muted-foreground">{t('apiQuota')}</Label>
                                  <label className="flex items-center gap-1 text-2xs cursor-pointer">
                                    <Checkbox
                                      id="autoQuery"
                                      checked={autoQueryBalance[selectedProvider.id] || false}
                                      onCheckedChange={checked => setAutoQueryBalance(prev => ({ ...prev, [selectedProvider.id]: !!checked }))}
                                      className="size-3"
                                    />{t('autoQuery')}
                                  </label>
                                  <Button size="sm" variant="outline" className="h-5 text-3xs px-1.5"
                                    onClick={() => handleCheckApiBalance(selectedProvider.id)}
                                    disabled={apiBalances[selectedProvider.id]?.loading}
                                  >{apiBalances[selectedProvider.id]?.loading ? t('querying') : t('query')}</Button>
                                </div>
                                {apiBalances[selectedProvider.id] && !apiBalances[selectedProvider.id]?.loading && (
                                  <div className="text-2xs">
                                    {apiBalances[selectedProvider.id].balance === t('queryFailed') || apiBalances[selectedProvider.id].balance === t('notSupported') ? (
                                      <span className="text-muted-foreground">{apiBalances[selectedProvider.id].balance}</span>
                                    ) : apiBalances[selectedProvider.id].balance.includes(t('used')) ? (
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{apiBalances[selectedProvider.id].balance}</span>
                                        {apiBalances[selectedProvider.id].timestamp && (
                                          <span className="text-muted-foreground/70 text-3xs">{formatTimeAgo(apiBalances[selectedProvider.id].timestamp!)}</span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">{t('accountBalance')}</span>
                                        <span className="font-medium">{apiBalances[selectedProvider.id].balance}</span>
                                        {apiBalances[selectedProvider.id].timestamp && (
                                          <span className="text-muted-foreground/70 text-3xs">{formatTimeAgo(apiBalances[selectedProvider.id].timestamp!)}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 添加模型 */}
                            <div className="gap-1 space-y-0">
                              <Label className="text-xs text-muted-foreground">{t('addModel')}</Label>
                              <div className="flex items-center">
                                <div className="relative flex-1">
                                  {/* 模型选择下拉触发器 */}
                                  <div
                                    className={`h-7 px-2 border rounded-l-md flex items-center justify-between text-2xs cursor-pointer ${
                                      fetchedModels.length === 0 ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-background hover:bg-accent'
                                    }`}
                                    onClick={() => {
                                      if (fetchedModels.length > 0 && !selectedFetchedModel) setModelSearch(' ')
                                      else if (selectedFetchedModel) setModelSearch(selectedFetchedModel)
                                    }}
                                  >
                                    <span className="truncate">{selectedFetchedModel || (fetchedModels.length > 0 ? t('clickToSelectModel') : t('pleaseFetchModelsFirst'))}</span>
                                    {fetchedModels.length > 0 && <span className="ml-1 opacity-50">▼</span>}
                                  </div>
                                  {/* 模型选择下拉列表 */}
                                  {(modelSearch || (fetchedModels.length > 0 && selectedFetchedModel)) && fetchedModels.length > 0 && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => { setModelSearch(''); setSelectedFetchedModel('') }} />
                                      <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-md shadow-lg">
                                        <div className="p-1 border-b">
                                          <Input value={modelSearch === ' ' ? '' : modelSearch}
                                            onChange={e => setModelSearch(e.target.value)} placeholder={t('searchModel')} className="h-6 text-2xs" autoFocus
                                          />
                                        </div>
                                        <div className="max-h-[200px] overflow-y-auto">
                                          {fetchedModels
                                            .filter(m => !modelSearch || modelSearch === ' ' || m.toLowerCase().includes(modelSearch.toLowerCase()))
                                            .map(model => {
                                              const matchedKey = Object.keys(MODEL_CAPABILITIES).find(
                                                key => key === model || model.includes(key) || key.includes(model.split('/')[model.split('/').length - 1])
                                              )
                                              const capabilities = matchedKey ? MODEL_CAPABILITIES[matchedKey] : null
                                              return (
                                                <div key={model}
                                                  className={`px-2 py-1.5 text-xs hover:bg-accent cursor-pointer flex items-center justify-between ${selectedProvider.models.includes(model) ? 'text-muted-foreground' : ''}`}
                                                  onClick={() => {
                                                    if (!selectedProvider.models.includes(model)) {
                                                      updateProvider(selectedProvider.id, { models: [...selectedProvider.models, model] })
                                                      if (capabilities) {
                                                        const currentMetadata = selectedProvider.modelMetadata || {}
                                                        updateProvider(selectedProvider.id, {
                                                          modelMetadata: { ...currentMetadata, [model]: { supportsVision: capabilities.supportsVision, supportsThinking: capabilities.supportsThinking } }
                                                        })
                                                      }
                                                    }
                                                    setModelSearch(''); setSelectedFetchedModel('')
                                                  }}
                                                >
                                                  <span className="truncate flex items-center gap-1">
                                                    {model}
                                                    {capabilities && (
                                                      <>
                                                        {capabilities.supportsVision && <Eye className="size-2.5 text-muted-foreground shrink-0" />}
                                                        {capabilities.supportsThinking && <Lightbulb className="size-2.5 text-muted-foreground shrink-0" />}
                                                      </>
                                                    )}
                                                  </span>
                                                  {selectedProvider.models.includes(model) && <Check className="size-3 shrink-0" />}
                                                </div>
                                              )
                                            })}
                                          {modelSearch && modelSearch !== ' ' && !fetchedModels.some(m => m.toLowerCase() === modelSearch.toLowerCase()) && (
                                            <div className="px-2 py-1.5 text-xs hover:bg-accent cursor-pointer flex items-center justify-between text-primary border-t"
                                              onClick={() => {
                                                if (modelSearch.trim() && !selectedProvider.models.includes(modelSearch.trim())) {
                                                  updateProvider(selectedProvider.id, { models: [...selectedProvider.models, modelSearch.trim()] })
                                                }
                                                setModelSearch(''); setSelectedFetchedModel('')
                                              }}
                                            >
                                              <span className="truncate flex items-center gap-1"><Plus className="size-2.5" />{modelSearch}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                                {/* 拉取远程模型列表按钮 */}
                                <Button variant="outline" className="h-7 text-2xs px-2 shrink-0 rounded-l-none border-l-0 whitespace-nowrap"
                                  onClick={async () => {
                                    if (fetchedModels.length > 0 && !modelSearch && !selectedFetchedModel) {
                                      setModelSearch(' ')
                                    } else {
                                      const apiKey = apiKeys[selectedProvider.id]
                                      const isLocalProvider = selectedProvider.apiType === 'ollama'
                                      if (!apiKey && !isLocalProvider) { alert(t('pleaseSetApiKey')); return }
                                      try {
                                        let apiUrl = selectedProvider.baseUrl
                                        if (selectedProvider.useCorsProxy && uiConfig.corsProxyUrl) {
                                          apiUrl = `${uiConfig.corsProxyUrl}/${selectedProvider.baseUrl}`
                                        }
                                        const headers: Record<string, string> = {}
                                        if (apiKey) {
                                          headers['Authorization'] = `Bearer ${apiKey}`
                                        }
                                        const response = await fetch(`${apiUrl}/models`, { headers })
                                        if (response.ok) {
                                          const data = await response.json()
                                          let models: string[] = []
                                          const modelMetadata: Record<string, ModelMetadata> = {}

                                          // OpenAI 兼容格式: { data: [{ id: "model-name" }] }
                                          if (data.data && Array.isArray(data.data)) {
                                            models = data.data.map((m: { id: string }) => m.id)
                                            models.forEach((modelId: string) => {
                                              const matchedKey = Object.keys(MODEL_CAPABILITIES).find(
                                                key => key === modelId || modelId.includes(key) || key.includes(modelId.split('/')[modelId.split('/').length - 1])
                                              )
                                              if (matchedKey) {
                                                modelMetadata[modelId] = { supportsVision: MODEL_CAPABILITIES[matchedKey].supportsVision, supportsThinking: MODEL_CAPABILITIES[matchedKey].supportsThinking }
                                              }
                                            })
                                          }

                                          // LM Studio 专有格式: { models: [{ key, type, capabilities }] }
                                          else if (data.models && Array.isArray(data.models)) {
                                            models = data.models
                                              .filter((m: { type: string }) => m.type === 'llm')
                                              .map((m: { key: string }) => m.key)
                                            data.models.forEach((m: { key: string; type: string; capabilities?: { vision?: boolean } }) => {
                                              if (m.type === 'llm') {
                                                modelMetadata[m.key] = {
                                                  supportsVision: m.capabilities?.vision || false,
                                                  supportsThinking: false
                                                }
                                              }
                                            })
                                          }

                                          setFetchedModels(models)
                                          if (Object.keys(modelMetadata).length > 0) {
                                            updateProvider(selectedProvider.id, { modelMetadata: { ...(selectedProvider.modelMetadata || {}), ...modelMetadata } })
                                          }
                                          if (models.length === 0) { alert(t('noModelsFound')) } else { setModelSearch(' ') }
                                        } else { alert(t('fetchModelsFailed')) }
                                      } catch { alert(t('fetchModelListFailed')) }
                                    }
                                  }}
                                ><CloudDownload className="size-3" />{t('fetch')}</Button>
                              </div>
                            </div>
                          </div>

                          {/* 模型列表 */}
                          <div className="flex-1 p-3 overflow-y-auto">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-medium">{t('modelList')}</h4>
                              {/* 清空模型列表按钮 */}
                              {selectedProvider.models.length > 0 && (
                                <Tooltip>
                                  <TooltipTrigger render={<Button size="icon" variant="ghost" className="size-5"
                                      onClick={e => onShowPopoverConfirm(e.clientX, e.clientY + POPOVER_OFFSET, () => updateProvider(selectedProvider.id, { models: [] }))}
                                  />}>
                                    <Trash2 data-icon className="size-3" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-2xs px-2 py-1">{t('clearModelList')}</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {/* 模型列表（支持拖拽排序） */}
                            <div className="flex flex-col gap-0.5">
                              {selectedProvider.models.map((model, i) => (
                                <button key={i}
                                  className="group relative flex items-center gap-2 pl-2 pr-2 hover:pl-4 py-1 rounded hover:bg-accent text-xs transition-all w-full text-left"
                                  draggable
                                  onDragOver={(e) => { e.preventDefault(); setDragOverModelIndex(i) }}
                                  onDragEnd={() => {
                                    if (draggedModelIndex !== null && dragOverModelIndex !== null) reorderModels(draggedModelIndex, dragOverModelIndex)
                                    setDraggedModelIndex(null); setDragOverModelIndex(null)
                                    if (dragGhostRef.current) { document.body.removeChild(dragGhostRef.current); dragGhostRef.current = null }
                                  }}
                                  onDragStart={(e) => {
                                    setDraggedModelIndex(i)
                                    const ghost = e.currentTarget.cloneNode(true) as HTMLElement
                                    ghost.style.position = 'absolute'
                                    ghost.style.top = '-9999px'
                                    ghost.style.width = e.currentTarget.offsetWidth + 'px'
                                    ghost.style.opacity = '0.85'
                                    ghost.style.pointerEvents = 'none'
                                    document.body.appendChild(ghost)
                                    e.dataTransfer.setDragImage(ghost, 0, 0)
                                    dragGhostRef.current = ghost
                                  }}
                                >
                                  <span className="absolute left-0.5 top-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover:opacity-100 z-10">
                                    <GripVertical className="size-3 text-muted-foreground" />
                                  </span>
                                  {/* 模型名称 + 能力图标 */}
                                  <div className="min-w-0 flex items-center gap-1 flex-1">
                                    <span className="truncate font-mono cursor-default">{model}</span>
                                    {selectedProvider.modelMetadata?.[model]?.supportsVision && <Eye className="size-2.5 text-muted-foreground shrink-0" />}
                                    {selectedProvider.modelMetadata?.[model]?.supportsThinking && <Brain className="size-2.5 text-muted-foreground shrink-0" />}
                                  </div>
                                  {/* 模型操作按钮：编辑 + 移除 */}
                                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 bg-background rounded">
                                    <Tooltip>
                                      <TooltipTrigger render={<Button size="icon" variant="ghost" className="size-5" onClick={() => handleEditModel(model, selectedProvider.id)} />}>
                                        <Edit2 data-icon className="size-3" />
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-2xs px-2 py-1">{t('editModel')}</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger render={<Button size="icon" variant="ghost" className="size-5 hover:text-destructive"
                                          onClick={e => onShowPopoverConfirm(e.clientX, e.clientY + POPOVER_OFFSET, () => updateProvider(selectedProvider.id, { models: selectedProvider.models.filter((_, j) => j !== i) }))}
                                      />}>
                                        <X data-icon className="size-3" />
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-2xs px-2 py-1">{t('removeModel')}</TooltipContent>
                                    </Tooltip>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- 模型参数 Tab --- */}
                {settingsTab === 'model' && (
                  <div className="p-6 overflow-y-auto flex flex-col gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium">{t('modelParams')}</h3>
                        <Button size="sm" variant="ghost" className="h-7 text-2xs gap-1" onClick={handleResetModelParams}>
                          <RotateCcw data-icon="inline-start" className="size-3" />{t('reset')}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col gap-3">
                          <div className="flex justify-between">
                            <Label className="text-xs font-medium">Temperature</Label>
                            <span className="text-xs text-muted-foreground">{localModelParams.temperature}</span>
                          </div>
                          <Slider min={0} max={2} step={0.1} value={[localModelParams.temperature]}
                            onValueChange={(value) => setLocalModelParams(prev => ({ ...prev, temperature: typeof value === 'number' ? value : value[0] }))}
                          />
                        </div>
                        <div className="flex flex-col gap-3">
                          <div className="flex justify-between">
                            <Label className="text-xs font-medium">Top P</Label>
                            <span className="text-xs text-muted-foreground">{localModelParams.top_p}</span>
                          </div>
                          <Slider min={0} max={1} step={0.05} value={[localModelParams.top_p]}
                            onValueChange={(value) => setLocalModelParams(prev => ({ ...prev, top_p: typeof value === 'number' ? value : value[0] }))}
                          />
                        </div>
                        <div className="flex flex-col gap-3">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-medium">Max Tokens</Label>
                            {currentModelContextLimit && (
                              <span className="text-2xs text-muted-foreground">
  {t('context')}: {formatNumber(currentModelContextLimit)}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Input type="number" min="1" max="1000000" value={localModelParams.max_tokens}
                              onChange={e => setLocalModelParams(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 2000 }))}
                              className="flex-1 h-8 text-xs"
                            />
                            <Select
                              value={localModelParams.max_tokens.toString()}
                              onChange={e => setLocalModelParams(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
                              className="h-8 text-xs w-28"
                            >
                              <option value="4096">4K</option>
                              <option value="8192">8K</option>
                              <option value="20480">20K</option>
                              <option value="200000">200K</option>
                              <option value="1000000">1M</option>
                            </Select>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3">
                          <div className="flex justify-between">
                            <Label className="text-xs font-medium">Presence Penalty</Label>
                            <span className="text-xs text-muted-foreground">{localModelParams.presence_penalty}</span>
                          </div>
                          <Slider min={-2} max={2} step={0.1} value={[localModelParams.presence_penalty]}
                            onValueChange={(value) => setLocalModelParams(prev => ({ ...prev, presence_penalty: typeof value === 'number' ? value : value[0] }))}
                          />
                        </div>
                        <div className="flex flex-col gap-3">
                          <div className="flex justify-between">
                            <Label className="text-xs font-medium">Frequency Penalty</Label>
                            <span className="text-xs text-muted-foreground">{localModelParams.frequency_penalty}</span>
                          </div>
                          <Slider min={-2} max={2} step={0.1} value={[localModelParams.frequency_penalty]}
                            onValueChange={(value) => setLocalModelParams(prev => ({ ...prev, frequency_penalty: typeof value === 'number' ? value : value[0] }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* --- 提示词 Tab --- */}
                {settingsTab === 'prompts' && (
                  <div className="flex flex-1 overflow-hidden">
                    <div className="w-44 border-r p-3 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-muted-foreground">{t('promptList')}</Label>
                        <Tooltip>
                          <TooltipTrigger render={<Button size="icon" variant="ghost" className="size-5"
                              onClick={() => {
                                const prompt = { id: generateId(), name: t('newPrompt'), content: '' }
                                addPrompt(prompt)
                                const newIndex = (uiConfig.prompts || []).length
                                setSelectedPromptIndex(newIndex)
                                requestAnimationFrame(() => promptContentInputRef.current?.focus())
                              }}
                          />}>
                            <Plus data-icon className="size-3" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-2xs px-2 py-1">{t('addPrompt')}</TooltipContent>
                        </Tooltip>
                      </div>
                      {/* 提示词列表（支持拖拽排序） */}
                      <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-1 mt-1">
                        {(uiConfig.prompts || []).map((prompt, index) => (
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
                            <span
                              className="absolute left-0.5 top-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover:opacity-100 z-10"
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
                                onClick={e => { e.stopPropagation(); setSelectedPromptIndex(index) }}
                              ><span className="truncate">{prompt.name}</span></Button>
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
                        {(uiConfig.prompts || []).length === 0 && (
                          <p className="text-2xs text-muted-foreground text-center py-2">{t('noPrompts')}</p>
                        )}
                      </div>
                      {/* 导入/导出提示词 */}
                      <div className="mt-auto flex flex-col gap-2 pt-2 border-t">
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
                    <div className="flex-1 p-4 overflow-y-auto">
                      {selectedPromptIndex !== null && (uiConfig.prompts || [])[selectedPromptIndex] ? (
                        <div className="flex flex-col gap-4">
                          <div>
                            <Input value={(uiConfig.prompts || [])[selectedPromptIndex]?.name || ''}
                              onChange={e => updatePrompt((uiConfig.prompts || [])[selectedPromptIndex].id, { name: e.target.value })}
                              className="h-8 text-xs" placeholder={t('promptName')}
                            />
                          </div>
                          <div>
                            <Textarea ref={promptContentInputRef}
                              value={(uiConfig.prompts || [])[selectedPromptIndex]?.content || ''}
                              onChange={e => updatePrompt((uiConfig.prompts || [])[selectedPromptIndex].id, { content: e.target.value })}
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
                  </div>
                )}

              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 模型属性编辑弹窗 */}
      <ModelEditDialog
        open={editModelOpen}
        model={editingModel?.model || ''}
        metadata={editingModel?.metadata || { supportsVision: false, supportsThinking: false }}
        providerId={editingModel?.providerId || ''}
        onClose={() => { setEditModelOpen(false); setEditingModel(null) }}
      />

      {/* 提示词导入弹窗 */}
      <PromptImportDialog
        open={promptImportDialogOpen}
        importUrl={promptImportUrl}
        onOpenChange={setPromptImportDialogOpen}
        onUrlChange={setPromptImportUrl}
        onFileImport={() => promptImportInputRef.current?.click()}
        onUrlImport={handleImportPromptsFromUrl}
      />

      {/* 模型参数重置确认弹窗 */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" onClick={() => setResetConfirmOpen(false)}>
          <div className="bg-background border rounded-lg shadow-lg p-4 w-80 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <p className="text-sm">{t('confirmResetModelParams')}</p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setResetConfirmOpen(false)}>{t('cancel')}</Button>
              <Button size="sm" onClick={confirmResetModelParams}>{t('confirm')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={configImportInputRef as React.Ref<HTMLInputElement>} type="file" accept=".json" className="hidden" onChange={handleImportConfigFile} />
      <input ref={promptImportInputRef as React.Ref<HTMLInputElement>} type="file" accept=".json" className="hidden" onChange={handleImportPromptsFile} />
    </>
  )
}
