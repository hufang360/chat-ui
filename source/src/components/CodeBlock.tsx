import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, Copy, ChevronDown, ChevronRight, WrapText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// 按需注册常用语言
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx'
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx'
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css'
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup'
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown'
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml'
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java'
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c'
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp'
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go'
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust'
import diff from 'react-syntax-highlighter/dist/esm/languages/prism/diff'

SyntaxHighlighter.registerLanguage('javascript', javascript)
SyntaxHighlighter.registerLanguage('js', javascript)
SyntaxHighlighter.registerLanguage('typescript', typescript)
SyntaxHighlighter.registerLanguage('ts', typescript)
SyntaxHighlighter.registerLanguage('jsx', jsx)
SyntaxHighlighter.registerLanguage('tsx', tsx)
SyntaxHighlighter.registerLanguage('python', python)
SyntaxHighlighter.registerLanguage('py', python)
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('bash', bash)
SyntaxHighlighter.registerLanguage('shell', bash)
SyntaxHighlighter.registerLanguage('sh', bash)
SyntaxHighlighter.registerLanguage('css', css)
SyntaxHighlighter.registerLanguage('html', markup)
SyntaxHighlighter.registerLanguage('xml', markup)
SyntaxHighlighter.registerLanguage('markdown', markdown)
SyntaxHighlighter.registerLanguage('md', markdown)
SyntaxHighlighter.registerLanguage('yaml', yaml)
SyntaxHighlighter.registerLanguage('yml', yaml)
SyntaxHighlighter.registerLanguage('sql', sql)
SyntaxHighlighter.registerLanguage('java', java)
SyntaxHighlighter.registerLanguage('c', c)
SyntaxHighlighter.registerLanguage('cpp', cpp)
SyntaxHighlighter.registerLanguage('go', go)
SyntaxHighlighter.registerLanguage('rust', rust)
SyntaxHighlighter.registerLanguage('diff', diff)

// 移除行背景的自定义 oneLight 样式
const customOneLight = {
  ...oneLight,
  'code-line': {
    background: 'transparent',
  },
}

interface CodeBlockProps {
  language: string
  children: string
  autoCollapse?: boolean
  fontSize?: string
}

export function CodeBlock({ language, children, autoCollapse = false, fontSize = '0.75rem' }: CodeBlockProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(autoCollapse)
  const [wrap, setWrap] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group rounded-md overflow-hidden bg-codeBackground border">
      <div className="flex items-center justify-between px-2 py-1 bg-toolbar-bg border-b">
        <span className="text-2xs text-muted-foreground font-mono">{language}</span>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger render={(props) => (
              <Button {...props} size="icon" variant="ghost" className="size-5 text-toolbar-text hover:text-foreground hover:bg-toolbar-hover" onClick={() => setWrap(!wrap)}>
                <WrapText className="size-3" />
              </Button>
            )} />
            <TooltipContent side="top" className="text-2xs px-2 py-1">{wrap ? t('unwrap') : t('autoWrap')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={(props) => (
              <Button {...props} size="icon" variant="ghost" className="size-5 text-toolbar-text hover:text-foreground hover:bg-toolbar-hover" onClick={handleCopy}>
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              </Button>
            )} />
            <TooltipContent side="top" className="text-2xs px-2 py-1">{t('copy')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={(props) => (
              <Button {...props} size="icon" variant="ghost" className="size-5 text-toolbar-text hover:text-foreground hover:bg-toolbar-hover" onClick={() => setCollapsed(!collapsed)}>
                {collapsed ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
              </Button>
            )} />
            <TooltipContent side="top" className="text-2xs px-2 py-1">{collapsed ? t('expand') : t('collapse')}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      {!collapsed && (
        <div className={wrap ? 'whitespace-pre-wrap break-words' : ''}>
          <SyntaxHighlighter
            style={customOneLight}
            language={language}
            PreTag="div"
            customStyle={{
              margin: 0,
              borderRadius: 0,
              fontSize,
              background: 'transparent',
              padding: '0.5rem',
            }}
            codeTagProps={{
              style: { background: 'transparent' }
            }}
            wrapLongLines={wrap}
          >
            {children}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  )
}
