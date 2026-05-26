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
import { RotateCcw } from 'lucide-react'

export interface ModelParamsTabHandle {
  getLocalParams: () => ModelParams
}

export const ModelParamsTab = forwardRef<ModelParamsTabHandle>(
  function ModelParamsTab(_, ref) {
    const { modelParams: storeModelParams, selectedModel } = useStore()
    const { t } = useTranslation()

    const [localModelParams, setLocalModelParams] = useState<ModelParams>(storeModelParams)
    const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

    const modelCapability = MODEL_CAPABILITIES[selectedModel]
    const currentModelContextLimit = modelCapability?.contextLength

    useEffect(() => { setLocalModelParams(storeModelParams) }, [storeModelParams])

    useImperativeHandle(ref, () => ({
      getLocalParams: () => localModelParams
    }))

    return (
      <div className="p-3 md:p-6 overflow-y-auto flex flex-col gap-6 flex-1 min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">{t('modelParams')}</h3>
            <Button size="sm" variant="ghost" className="h-7 text-2xs gap-1" onClick={() => setResetConfirmOpen(true)}>
              <RotateCcw data-icon="inline-start" className="size-3" />{t('reset')}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  className="h-8 text-xs w-20 md:w-28"
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

        {/* 重置确认弹窗 */}
        {resetConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" onClick={() => setResetConfirmOpen(false)}>
            <div className="bg-background border rounded-lg shadow-lg p-4 w-80 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
              <p className="text-sm">{t('confirmResetModelParams')}</p>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setResetConfirmOpen(false)}>{t('cancel')}</Button>
                <Button size="sm" onClick={() => { setLocalModelParams(DEFAULT_MODEL_PARAMS); setResetConfirmOpen(false) }}>{t('confirm')}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
)
