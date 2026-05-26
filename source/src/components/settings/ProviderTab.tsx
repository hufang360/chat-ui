import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from '../../store'
import type { ModelMetadata, Provider } from '../../types'
import { MODEL_CAPABILITIES } from '../../constants'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { POPOVER_OFFSET, formatTimeAgo } from '../../utils/settingsUtils'
import {
  Plus, Trash2, Upload, Download, Eye, EyeOff, Brain, Lightbulb,
  Edit2, Check, CloudDownload, GripVertical, X, Search, ChevronLeft, ChevronRight, History,
  ExternalLink,
} from 'lucide-react'

export interface ProviderTabProps {
  onShowPopoverConfirm: (x: number, y: number, onConfirm: () => void) => void
  configImportInputRef: React.RefObject<HTMLInputElement | null>
  onEditModel: (model: string, providerId: string) => void
}

export function ProviderTab({ onShowPopoverConfirm, configImportInputRef, onEditModel }: ProviderTabProps) {
  const {
    providers,
    apiKeys,
    uiConfig,
    setApiKey,
    addProvider,
    updateProvider,
    deleteProvider,
    reorderProvider,
    exportConfig,
    importConfig,
  } = useStore()

  const { t } = useTranslation()

  const [selectedProviderId, setSelectedProviderId] = useState<string>('openai')
  const [fetchedModels, setFetchedModels] = useState<string[]>([])
  const [selectedFetchedModel, setSelectedFetchedModel] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [draggedProviderId, setDraggedProviderId] = useState<string | null>(null)
  const [dragOverProviderId, setDragOverProviderId] = useState<string | null>(null)
  const [draggedModelIndex, setDraggedModelIndex] = useState<number | null>(null)
  const [dragOverModelIndex, setDragOverModelIndex] = useState<number | null>(null)
  const [newProviderId, setNewProviderId] = useState<string | null>(null)
  const [mobileDetail, setMobileDetail] = useState(false)
  const [historyPopoverOpen, setHistoryPopoverOpen] = useState(false)
  const dragGhostRef = useRef<HTMLElement | null>(null)
  const [editingProviderName, setEditingProviderName] = useState(false)
  const providerNameInputRef = useRef<HTMLInputElement>(null)
  const apiKeyInputRef = useRef<HTMLInputElement>(null)

  // API 额度
  const [apiBalances, setApiBalances] = useState<Record<string, { balance: string; currency: string; loading: boolean; timestamp?: number; history?: { balance: string; currency: string; timestamp: number }[] }>>(() => {
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

  const selectedProvider = providers.find(p => p.id === selectedProviderId)

  // 初始化选中的供应商
  useEffect(() => {
    if (providers.length > 0 && !providers.find(p => p.id === selectedProviderId)) {
      setSelectedProviderId(providers[0].id)
    }
  }, [providers])

  // 切换供应商时重置
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
        toSave[key] = { balance: val.balance, currency: val.currency, timestamp: val.timestamp, history: val.history }
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

  // 切换供应商时自动刷新余额
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
      if (!silent) toast(t('pleaseConfigureApiKey'))
      return
    }

    setApiBalances(prev => ({ ...prev, [providerId]: { ...prev[providerId], balance: t('querying'), currency: '', loading: true } }))

    try {
      let balance = ''
      let currency = ''

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
        const entry = { balance: displayBalance, currency, timestamp: Date.now() }
        setApiBalances(prev => {
          const prevHistory = prev[providerId]?.history || []
          const history = [entry, ...prevHistory].slice(0, 10)
          return { ...prev, [providerId]: { ...entry, loading: false, history } }
        })
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

  const handleSelectProvider = (id: string) => {
    setSelectedProviderId(id)
    setMobileDetail(true)
  }

  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
      {/* 供应商列表 */}
      <div className={`${mobileDetail ? 'hidden md:flex' : 'flex'} w-full md:w-44 border-b md:border-b-0 md:border-r p-3 flex-col overflow-hidden min-h-0 md:shrink-0`}>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-medium text-muted-foreground">{t('provider')}</Label>
          <Tooltip>
            <TooltipTrigger render={<Button size="icon" variant="ghost" className="size-5" onClick={handleAddProvider} />}>
              <Plus data-icon className="size-3" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-2xs px-2 py-1">{t('addProvider')}</TooltipContent>
          </Tooltip>
        </div>
        {/* 供应商列表 */}
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
              <span className="absolute left-0.5 top-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover:opacity-100 z-10 hidden md:block"
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
                onClick={() => handleSelectProvider(p.id)}
              >
                <span className="truncate">{p.name}</span>
                <ChevronRight className="size-3 ml-auto opacity-50 md:hidden" />
              </Button>
            </div>
          ))}
        </div>
        {/* 导入/导出配置 */}
        <div className="shrink-0 pt-2 border-t flex gap-1">
          <Button size="sm" variant="outline" className="flex-1 h-6 text-2xs" onClick={() => configImportInputRef.current?.click()}>
            <Upload data-icon="inline-start" className="size-2.5 mr-0.5" />{t('import')}
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-6 text-2xs" onClick={handleExportConfig}>
            <Download data-icon="inline-start" className="size-2.5 mr-0.5" />{t('export')}
          </Button>
        </div>
      </div>

      {/* 供应商详情区 */}
      <div className={`${!mobileDetail ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-hidden`}>
        {/* 移动端返回按钮 */}
        {selectedProvider && (
          <div className="md:hidden h-8 border-b flex items-center px-2 shrink-0">
            <Button size="icon" variant="ghost" className="size-6" onClick={() => setMobileDetail(false)}>
              <ChevronLeft data-icon className="size-3" />
            </Button>
            <span className="text-xs font-medium ml-1">{selectedProvider.name}</span>
          </div>
        )}
        {selectedProvider && (
          <div className="h-full flex flex-col">
            <div className="border-b p-3 flex flex-col gap-2 bg-muted/30">
              {/* 供应商头部 */}
              <div className="flex items-center justify-between">
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
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-medium cursor-pointer" onClick={() => setEditingProviderName(true)}>{selectedProvider.name}</h3>
                    {selectedProvider.consoleUrl && (
                      <ExternalLink className="size-3 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => window.open(selectedProvider.consoleUrl, '_blank')}
                      />
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1">
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
                  <div className="w-px h-4 bg-border" />
                  <Switch
                    checked={!selectedProvider.disabled}
                    onCheckedChange={checked => updateProvider(selectedProvider.id, { disabled: !checked })}
                    className="scale-75"
                  />
                </div>
              </div>

              {/* API 密钥 */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">{t('apiKey')}</Label>
                    <label className="ml-auto flex items-center gap-1 text-2xs cursor-pointer">
                      <Checkbox
                        checked={selectedProvider.allowEmptyApiKey || false}
                        onCheckedChange={checked => updateProvider(selectedProvider.id, { allowEmptyApiKey: !!checked })}
                        className="size-3"
                      />{t('allowEmptyApiKey')}
                    </label>
                  </div>
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
                  {selectedProvider.apiKeyHint && (
                    <p className="text-2xs text-muted-foreground">{t(selectedProvider.apiKeyHint)}</p>
                  )}
                </div>

                {/* API 地址 */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center">
                      <Label className="text-xs text-muted-foreground">{t('apiURL')}</Label>
                      <label className="ml-auto flex items-center gap-1 text-2xs cursor-pointer shrink-0">
                        <Checkbox id="cors-proxy" checked={selectedProvider.useCorsProxy || false}
                          onCheckedChange={checked => {
                            if (checked && !uiConfig.corsProxyUrl) { alert(t('configureCorsProxyFirst')); return }
                            updateProvider(selectedProvider.id, { useCorsProxy: checked })
                          }}
                          className="size-3"
                          />{t('useCorsProxy')}
                      </label>
                    </div>

                    <Input value={selectedProvider.baseUrl}
                      onChange={e => updateProvider(selectedProvider.id, { baseUrl: e.target.value })}
                      placeholder="https://api.xx.com/v1" className="h-7 text-2xs"
                    />
                    {selectedProvider.apiUrlHint && (
                      <p className="text-2xs text-muted-foreground">{t(selectedProvider.apiUrlHint)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* API 额度 */}
              {(selectedProvider.id === 'deepseek' || selectedProvider.id === 'openrouter' || selectedProvider.id === 'siliconflow' || selectedProvider.id === 'moonshot' ||
                selectedProvider.baseUrl.includes('deepseek') || selectedProvider.baseUrl.includes('openrouter') || selectedProvider.baseUrl.includes('siliconflow') || selectedProvider.baseUrl.includes('moonshot')) && (
                <div className="flex flex-col gap-1 flex-1 pt-1.5">
                  <div className="flex items-center">
                    <Label className="text-xs text-muted-foreground">{t('apiQuota')}</Label>
                    <div className="ml-auto flex items-center gap-2">
                      <div className="relative">
                        <Tooltip>
                          <TooltipTrigger render={
                            <Button size="icon" variant="ghost" className="size-5"
                              onClick={() => setHistoryPopoverOpen(!historyPopoverOpen)}
                            >
                              <History className="size-3" />
                            </Button>
                          } />
                          <TooltipContent side="top" className="text-2xs px-2 py-1">{t('queryHistory')}</TooltipContent>
                        </Tooltip>
                        {historyPopoverOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setHistoryPopoverOpen(false)} />
                            <div className="absolute right-0 top-full mt-1 z-50 w-56 p-2 text-2xs bg-popover border rounded-md shadow-lg">
                              <div className="font-medium mb-1">{t('queryHistory')}</div>
                              <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                                {apiBalances[selectedProvider.id]?.history?.map((h, i) => (
                                  <div key={i} className="flex items-center justify-between gap-2">
                                    <span>{h.balance}</span>
                                    <span className="text-muted-foreground text-3xs">{formatTimeAgo(h.timestamp, t)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="w-px h-4 bg-border" />
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
                      ><Search className="size-3" />{apiBalances[selectedProvider.id]?.loading ? t('querying') : t('query')}</Button>
                    </div>
                  </div>
                  {apiBalances[selectedProvider.id] && !apiBalances[selectedProvider.id]?.loading && (() => {
                    const b = apiBalances[selectedProvider.id]
                    const isErr = b.balance === t('queryFailed') || b.balance === t('notSupported')
                    const isUsed = b.balance.includes(t('used'))
                    return (
                      <div className="text-2xs">
                        {isErr ? (
                          <span className="text-muted-foreground">{b.balance}</span>
                        ) : isUsed ? (
                          <div className="flex items-center gap-4">
                            <span className="font-medium">{b.balance}</span>
                            {b.timestamp && <span className="text-muted-foreground/70 text-3xs">{formatTimeAgo(b.timestamp, t)}</span>}
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">{t('accountBalance')}</span>
                            <span className="font-medium">{b.balance}</span>
                            {b.timestamp && <span className="text-muted-foreground/70 text-3xs">{formatTimeAgo(b.timestamp, t)}</span>}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* 添加模型 */}
              <div className="gap-1 space-y-0">
                <Label className="text-xs text-muted-foreground">{t('addModel')}</Label>
                <div className="flex items-center">
                  <div className="relative flex-1">
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
                        if (!apiKey && !selectedProvider.allowEmptyApiKey) { alert(t('pleaseSetApiKey')); return }
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

                            setFetchedModels(models)
                            if (Object.keys(modelMetadata).length > 0) {
                              updateProvider(selectedProvider.id, { modelMetadata: { ...(selectedProvider.modelMetadata || {}), ...modelMetadata } })
                            }
                            if (models.length === 0) { alert(t('noModelsFound')) } else { setModelSearch(' ') }
                          } else {
                              const errText = await response.text().catch(() => '')
                              alert(`${t('fetchModelsFailed')}${errText ? '\n' + errText : ''}`)
                            }
                        } catch (e) { alert(`${t('fetchModelListFailed')}\n${e instanceof Error ? e.message : e}`) }
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
                  <div key={i} role="listitem"
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
                    <div className="min-w-0 flex items-center gap-1 flex-1">
                      <span className="truncate font-mono cursor-pointer">{model}</span>
                      {selectedProvider.modelMetadata?.[model]?.supportsVision && <Eye className="size-2.5 text-muted-foreground shrink-0" />}
                      {selectedProvider.modelMetadata?.[model]?.supportsThinking && <Brain className="size-2.5 text-muted-foreground shrink-0" />}
                    </div>
                    <div className="shrink-0 flex items-center gap-0.5">
                      <Tooltip>
                        <TooltipTrigger render={<Button size="icon" variant="ghost" className="size-5" onClick={() => onEditModel(model, selectedProvider.id)} />}>
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
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input for config import */}
      <input ref={configImportInputRef as React.Ref<HTMLInputElement>} type="file" accept=".json" className="hidden" onChange={handleImportConfigFile} />
    </div>
  )
}
