import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { Label } from '@/components/ui/label'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { MessageSquareText, ExternalLink, Hash, Cpu, SwatchBook, Text, Send } from 'lucide-react'

interface Example {
  icon: typeof MessageSquareText
  title: string
  desc: string
  url: string
}

export function HashTab() {
  const { uiConfig } = useStore()
  const { t } = useTranslation()
  const [examples, setExamples] = useState<Example[]>([])
  const [editUrls, setEditUrls] = useState<string[]>([])

  useEffect(() => {
    const base = window.location.origin + window.location.pathname
    const prompts = uiConfig.prompts || []
    const list: Example[] = [
      {
        icon: MessageSquareText,
        title: t('hashExampleText'),
        desc: t('hashExampleTextDesc'),
        url: base + '#text=' + t('hashExampleTextContent'),
      },
    ]
    if (prompts.length > 0) {
      list.push(
        {
          icon: SwatchBook,
          title: t('hashExamplePrompt'),
          desc: t('hashExamplePromptDesc'),
          url: base + '#prompt=' + prompts[0].id,
        },
        {
          icon: Text,
          title: t('hashExampleTranslate'),
          desc: t('hashExampleTranslateDesc'),
          url: base + '#text=' + t('hashExampleTranslateContent') + '&prompt=' + prompts[1].id + '&autosend',
        },
      )
    }
    list.push({
      icon: Send,
      title: t('hashExampleAutoSend'),
      desc: t('hashExampleAutoSendDesc'),
      url: base + '#text=' + t('hashExampleAutoSendContent') + '&autosend',
    })
    list.push({
      icon: Cpu,
      title: t('hashExampleConfig'),
      desc: t('hashExampleConfigDesc'),
      url: base + '#providers=' + btoa(JSON.stringify([{ name: 'MyAPI', apiUrl: 'https://api.example.com/v1', apiKey: 'sk-xxx' }])),
    })
    setExamples(list)
    setEditUrls(list.map(e => e.url))
  }, [uiConfig.prompts, t])

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <Hash className="size-4 text-muted-foreground" />
        <Label className="text-sm font-medium">{t('hashExamples')}</Label>
      </div>

      {/* 描述 */}
      <div className="space-y-2 text-2xs text-muted-foreground border rounded-md p-3 mb-2">
        <p>{t('hashParamsDescription')}</p>
        <div className="space-y-1">
          <p><code className="bg-muted px-1 rounded">#text</code> — {t('hashParamText')}</p>
          <p><code className="bg-muted px-1 rounded">#prompt</code> — {t('hashParamPrompt')}</p>
          <p><code className="bg-muted px-1 rounded">#autosend</code> — {t('hashParamAutoSend')}</p>
          <p><code className="bg-muted px-1 rounded">#providers</code> — {t('hashParamConfig')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {examples.map((item, i) => (
          <div key={i} className="border rounded-md p-3 transition-colors hover:bg-accent/50">
            <div className="flex items-center gap-2 mb-2">
              <item.icon className="size-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs font-medium">{item.title}</p>
            </div>
            <p className="text-2xs text-muted-foreground mb-2">{item.desc}</p>
            <InputGroup>
              <InputGroupInput
                value={editUrls[i] || ''}
                onChange={e => setEditUrls(prev => { const next = [...prev]; next[i] = e.target.value; return next })}
                className="h-7 text-2xs font-mono"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  variant="secondary"
                  onClick={() => window.open(editUrls[i] || item.url, '_blank')}
                  aria-label={t('openLink')}
                >
                  <ExternalLink className="size-3 text-muted-foreground" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>
        ))}
      </div>
    </div>
  )
}
