import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import type { ModelMetadata } from '../types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ModelEditDialog } from './ModelEditDialog'
import { GeneralTab } from './settings/GeneralTab'
import { ProviderTab } from './settings/ProviderTab'
import { ModelParamsTab, type ModelParamsTabHandle } from './settings/ModelParamsTab'
import { PromptsTab } from './settings/PromptsTab'
import { X, Settings, Cpu, Sliders, SwatchBook, ChevronLeft } from 'lucide-react'

const TABS = [
  { key: 'general', icon: Settings, labelKey: 'generalSettings' },
  { key: 'api', icon: Cpu, labelKey: 'modelService' },
  { key: 'model', icon: Sliders, labelKey: 'modelParams' },
  { key: 'prompts', icon: SwatchBook, labelKey: 'prompts' },
] as const

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
  const { setModelParams } = useStore()
  const { t } = useTranslation()

  const [settingsTab, setSettingsTab] = useState('api')
  const [mobileHome, setMobileHome] = useState(true)

  // 模型编辑
  const [editModelOpen, setEditModelOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<{ model: string; metadata: ModelMetadata; providerId: string } | null>(null)

  const modelParamsRef = useRef<ModelParamsTabHandle>(null)

  const handleEditModel = (model: string, providerId: string) => {
    const { providers } = useStore.getState()
    const provider = providers.find(p => p.id === providerId)
    if (!provider) return
    const metadata = provider.modelMetadata?.[model] || { supportsVision: false, supportsThinking: false }
    setEditingModel({ model, metadata, providerId })
    setEditModelOpen(true)
  }

  const handleClose = () => {
    const params = modelParamsRef.current?.getLocalParams()
    if (params) setModelParams(params)
    setMobileHome(true)
    onClose()
  }

  const handleMobileNavigate = (tab: string) => {
    setSettingsTab(tab)
    setMobileHome(false)
  }

  if (!open) return null

  return (
    <>
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="w-full h-full max-w-full max-h-full mx-0 rounded-none md:mx-4 md:max-w-[95vw] md:max-h-[95vh] md:rounded-lg md:w-[48rem] md:h-[45rem] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* 顶部标题栏 */}
            <div className="h-8 border-b flex items-center justify-between px-2 shrink-0">
              <div className="flex items-center gap-1">
                {!mobileHome && (
                  <Button size="icon" variant="ghost" className="size-6 md:hidden" onClick={() => setMobileHome(true)}>
                    <ChevronLeft data-icon className="size-3" />
                  </Button>
                )}
                <span className="text-xs font-medium">{t('settings')}</span>
              </div>
              <Tooltip>
                <TooltipTrigger render={<Button size="icon" variant="ghost" className="size-6" onClick={handleClose} />}>
                  <X data-icon className="size-3" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-2xs px-2 py-1">{t('close')}</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* 移动端：分类首页 */}
              {mobileHome && (
                <div className="flex flex-col md:hidden flex-1 p-3 gap-1">
                  {TABS.map(tab => (
                    <Button key={tab.key} variant="ghost" className="w-full justify-start text-xs h-10 gap-2"
                      onClick={() => handleMobileNavigate(tab.key)}
                    >
                      <tab.icon data-icon="inline-start" className="size-4 shrink-0" />
                      <span>{t(tab.labelKey)}</span>
                      <ChevronLeft className="size-3 ml-auto rotate-180 opacity-50" />
                    </Button>
                  ))}
                </div>
              )}

              {/* PC端：左侧导航 */}
              <div className="hidden md:flex md:flex-col md:w-36 border-r p-2 gap-1 shrink-0">
                {TABS.map(tab => (
                  <Button key={tab.key} variant={settingsTab === tab.key ? 'outline' : 'ghost'} size="sm"
                    className="w-full justify-start text-xs h-7 gap-1.5"
                    onClick={() => setSettingsTab(tab.key)}
                  >
                    <tab.icon data-icon="inline-start" className="size-3 shrink-0" />
                    <span className="truncate">{t(tab.labelKey)}</span>
                  </Button>
                ))}
              </div>

              {/* 内容区：PC始终显示，移动端仅非首页显示 */}
              <div className={`flex-1 flex flex-col overflow-hidden ${mobileHome ? 'hidden md:flex' : 'flex'}`}>
                {settingsTab === 'general' && (
                  <GeneralTab
                    onShowConfirm={onShowConfirm}
                    onThemeChange={onThemeChange}
                    onImportData={onImportData}
                    onExportData={onExportData}
                  />
                )}

                {settingsTab === 'api' && (
                  <ProviderTab
                    onShowPopoverConfirm={onShowPopoverConfirm}
                    configImportInputRef={configImportInputRef}
                    onEditModel={handleEditModel}
                  />
                )}

                {settingsTab === 'model' && (
                  <ModelParamsTab ref={modelParamsRef} />
                )}

                {settingsTab === 'prompts' && (
                  <PromptsTab
                    onShowPopoverConfirm={onShowPopoverConfirm}
                    promptImportInputRef={promptImportInputRef}
                  />
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
    </>
  )
}
