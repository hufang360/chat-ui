import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Moon, Sun, Monitor, Upload, Download, RotateCcw } from 'lucide-react'

export interface GeneralTabProps {
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void
  onExportData: () => void
}

export function GeneralTab({ onShowConfirm, onThemeChange, onImportData, onExportData }: GeneralTabProps) {
  const { conversations, providers, apiKeys, uiConfig, setUIConfig, setLanguage } = useStore()
  const { t } = useTranslation()

  const stats = useMemo(() => {
    const totalMessages = conversations.reduce((n, c) => n + c.messages.length, 0)
    const totalChars = conversations.reduce((n, c) => n + c.messages.reduce((m, msg) => m + msg.content.length, 0), 0)
    const configuredProviders = providers.filter(p => apiKeys[p.id]?.trim() || p.allowEmptyApiKey || p.apiType === 'ollama').length
    const totalModels = providers.reduce((n, p) => n + p.models.length, 0)
    const promptsCount = (uiConfig.prompts || []).length
    const foldersCount = useStore.getState().folders.length

    let storageSize = ''
    try {
      const raw = localStorage.getItem('chat-storage') || ''
      const bytes = new Blob([raw]).size
      if (bytes < 1024) storageSize = `${bytes} B`
      else if (bytes < 1024 * 1024) storageSize = `${(bytes / 1024).toFixed(1)} KB`
      else storageSize = `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    } catch { /* ignore */ }

    return { totalMessages, totalChars, configuredProviders, totalModels, promptsCount, foldersCount, storageSize }
  }, [conversations, providers, apiKeys, uiConfig])

  return (
    <div className="p-4 overflow-y-auto flex flex-col gap-3 flex-1 min-h-0">
        <div className="space-y-5">

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

          {/* cors */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">{t('corsProxyUrl')}</Label>
            <Input value={uiConfig.corsProxyUrl || ''}
              onChange={e => setUIConfig({ corsProxyUrl: e.target.value || undefined })}
              placeholder="https://cors.xx.com/?" className="h-7 text-2xs"
              autoComplete="off"
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

      {/* 数据管理 */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">{t('dataManagement')}</Label>
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-2xs text-muted-foreground">
          <span>{t('statConversations')}: <span className="text-foreground font-medium">{conversations.length}</span></span>
          <span>{t('statMessages')}: <span className="text-foreground font-medium">{stats.totalMessages}</span></span>
          <span>{t('statChars')}: <span className="text-foreground font-medium">{stats.totalChars > 10000 ? `${(stats.totalChars / 10000).toFixed(1)}万` : stats.totalChars}</span></span>
          <span>{t('statProviders')}: <span className="text-foreground font-medium">{stats.configuredProviders}/{providers.length}</span></span>
          <span>{t('statModels')}: <span className="text-foreground font-medium">{stats.totalModels}</span></span>
          <span>{t('statPrompts')}: <span className="text-foreground font-medium">{stats.promptsCount}</span></span>
          <span>{t('statFolders')}: <span className="text-foreground font-medium">{stats.foldersCount}</span></span>
          <span>{t('statStorage')}: <span className="text-foreground font-medium">{stats.storageSize}</span></span>
        </div>
        <div className="mt-auto grid grid-cols-3 gap-1 w-full min-w-0">
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
  )
}
