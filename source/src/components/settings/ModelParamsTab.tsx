import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import type { ModelParams } from '../../types'
import { MODEL_CAPABILITIES, DEFAULT_MODEL_PARAMS } from '../../constants'
import { formatNumber } from '../../utils/modelUtils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Select } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RotateCcw, Info } from 'lucide-react'

const MAX_TOKENS_PRESETS = new Set(['0', '4096', '8192', '20480', '200000', '1000000'])

export interface ModelParamsTabHandle {
  getLocalParams: () => ModelParams
}

export const ModelParamsTab = forwardRef<ModelParamsTabHandle>(
  function ModelParamsTab(_, ref) {
    const { modelParams: storeModelParams, selectedModel } = useStore()
    const { t } = useTranslation()

    const [localModelParams, setLocalModelParams] = useState<ModelParams>(storeModelParams)
    const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
    const [customMaxTokens, setCustomMaxTokens] = useState(() => !MAX_TOKENS_PRESETS.has(storeModelParams.max_tokens.toString()))

    const modelCapability = MODEL_CAPABILITIES[selectedModel]
    const currentModelContextLimit = modelCapability?.contextLength

    useEffect(() => {
      setLocalModelParams(storeModelParams)
      setCustomMaxTokens(!MAX_TOKENS_PRESETS.has(storeModelParams.max_tokens.toString()))
    }, [storeModelParams])

    useImperativeHandle(ref, () => ({
      getLocalParams: () => localModelParams
    }))

    return (
      <div className="p-3 md:p-6 overflow-y-auto flex flex-col gap-6 flex-1 min-h-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{t('modelParams')}</h3>
            <Button size="sm" variant="ghost" className="h-7 text-2xs gap-1" onClick={() => setResetConfirmOpen(true)}>
              <RotateCcw data-icon="inline-start" className="size-3" />{t('reset')}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <div className="flex items-center gap-1">
                  <Label className="text-xs font-medium">Temperature</Label>
                  <Popover>
                    <PopoverTrigger render={(props) => (
                      <Button {...props} size="icon" variant="ghost" className="size-5" aria-label={t('temperatureDesc')}>
                        <Info className="size-3 text-muted-foreground" />
                      </Button>
                    )} />
                    <PopoverContent side="top" align="start" className="w-64 text-2xs leading-relaxed p-3">
                      {t('temperatureDesc')}
                    </PopoverContent>
                  </Popover>
                </div>
                <span className="text-xs text-muted-foreground">{localModelParams.temperature}</span>
              </div>
              <Slider min={0} max={2} step={0.1} value={[localModelParams.temperature]}
                onValueChange={(value) => setLocalModelParams(prev => ({ ...prev, temperature: typeof value === 'number' ? value : value[0] }))}
              />
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <div className="flex items-center gap-1">
                  <Label className="text-xs font-medium">Top P</Label>
                  <Popover>
                    <PopoverTrigger render={(props) => (
                      <Button {...props} size="icon" variant="ghost" className="size-5" aria-label={t('topPDesc')}>
                        <Info className="size-3 text-muted-foreground" />
                      </Button>
                    )} />
                    <PopoverContent side="top" align="start" className="w-64 text-2xs leading-relaxed p-3">
                      {t('topPDesc')}
                    </PopoverContent>
                  </Popover>
                </div>
                <span className="text-xs text-muted-foreground">{localModelParams.top_p}</span>
              </div>
              <Slider min={0} max={1} step={0.05} value={[localModelParams.top_p]}
                onValueChange={(value) => setLocalModelParams(prev => ({ ...prev, top_p: typeof value === 'number' ? value : value[0] }))}
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
              <div className="flex justify-between items-center">
                <Label className="text-xs font-medium">Max Tokens</Label>
              </div>
              <div className="flex gap-2">
                <Select
                  value={customMaxTokens ? 'custom' : localModelParams.max_tokens.toString()}
                  onChange={e => {
                    const val = e.target.value
                    if (val === 'custom') {
                      setCustomMaxTokens(true)
                      setLocalModelParams(prev => ({ ...prev, max_tokens: MAX_TOKENS_PRESETS.has(prev.max_tokens.toString()) ? 4096 : prev.max_tokens }))
                    } else {
                      setCustomMaxTokens(false)
                      setLocalModelParams(prev => ({ ...prev, max_tokens: parseInt(val) }))
                    }
                  }}
                  className="h-8 text-xs flex-1"
                >
                  <option value="0">{t('auto')}</option>
                  <option value="4096">4K</option>
                  <option value="8192">8K</option>
                  <option value="20480">20K</option>
                  <option value="200000">200K</option>
                  <option value="1000000">1M</option>
                  <option value="custom">{t('custom')}</option>
                </Select>
                {customMaxTokens && (
                  <Input type="number" min="1" max="1000000" value={localModelParams.max_tokens}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalModelParams(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 1 }))}
                    className="h-8 text-xs w-28"
                    placeholder={t('customMaxTokensPlaceholder')}
                  />
                )}
              </div>
              {localModelParams.max_tokens === 0 && (
                <p className="text-2xs text-muted-foreground">
                  {currentModelContextLimit
                    ? t('autoMaxTokensDesc', { model: selectedModel, context: formatNumber(currentModelContextLimit) })
                    : t('autoMaxTokensNoLimit')}
                </p>
              )}
            </div>
          </div>

        {/* 重置确认弹窗 */}
        {resetConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" onClick={() => setResetConfirmOpen(false)}
            onKeyDown={(e) => { if (e.key === 'Escape') setResetConfirmOpen(false) }}
          >
            <div className="bg-background border rounded-lg shadow-lg p-4 w-80 flex flex-col gap-4" role="dialog" aria-modal="true" aria-label={t('confirmResetModelParams')} onClick={e => e.stopPropagation()}>
              <p className="text-sm">{t('confirmResetModelParams')}</p>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setResetConfirmOpen(false)}>{t('cancel')}</Button>
                <Button size="sm" onClick={() => { setLocalModelParams(DEFAULT_MODEL_PARAMS); setCustomMaxTokens(!MAX_TOKENS_PRESETS.has(DEFAULT_MODEL_PARAMS.max_tokens.toString())); setResetConfirmOpen(false) }}>{t('confirm')}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
)
