import { memo, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Edit2, Check, X, RefreshCw, Copy, Trash2,
  User, Bot, AlertCircle, Image as ImageIcon, Download as DownloadIcon,
  Lightbulb,
} from 'lucide-react'
import { MemoizedMarkdown } from './MemoizedMarkdown'
import type { Message, Provider } from '../types'

interface MessageItemProps {
  message: Message
  isEditing: boolean
  editContent: string
  fontSizeClass: string
  isThinkingExpanded: boolean
  isErrorExpanded: boolean
  isLoading: boolean
  markdownComponents: Record<string, any>
  providers: Provider[]
  onStartEdit: (message: Message) => void
  onSaveEdit: () => void
  onSaveAndRegenerate: () => void
  onCancelEdit: () => void
  onEditContentChange: (content: string) => void
  onEditKeyDown: (e: React.KeyboardEvent) => void
  onCopy: (content: string) => void
  onRegenerate: (message: Message) => void
  onDelete: (e: React.MouseEvent, messageId: string) => void
  onToggleThinking: (messageId: string) => void
  onToggleError: (messageId: string) => void
  t: (key: string) => string
}

const LONG_MESSAGE_THRESHOLD = 3000
const LONG_LINE_THRESHOLD = 80
const PREVIEW_LENGTH = 800
const PREVIEW_LINES = 30

export const MessageItem = memo(function MessageItem({
  message,
  isEditing,
  editContent,
  fontSizeClass,
  isThinkingExpanded,
  isErrorExpanded,
  isLoading,
  markdownComponents,
  providers,
  onStartEdit,
  onSaveEdit,
  onSaveAndRegenerate,
  onCancelEdit,
  onEditContentChange,
  onEditKeyDown,
  onCopy,
  onRegenerate,
  onDelete,
  onToggleThinking,
  onToggleError,
  t,
}: MessageItemProps) {
  const [expanded, setExpanded] = useState(false)
  const lineCount = useMemo(() => message.content.split('\n').length, [message.content])
  const isLong = !message.isError && (message.content.length > LONG_MESSAGE_THRESHOLD || lineCount > LONG_LINE_THRESHOLD)
  const previewContent = useMemo(() => {
    if (!isLong) return message.content
    // 按行数截断
    const lines = message.content.split('\n')
    if (lineCount > LONG_LINE_THRESHOLD) {
      return lines.slice(0, PREVIEW_LINES).join('\n')
    }
    // 按字符数截断到最后一个完整段落
    const truncated = message.content.slice(0, PREVIEW_LENGTH)
    const lastNewline = truncated.lastIndexOf('\n')
    return lastNewline > 200 ? truncated.slice(0, lastNewline) : truncated
  }, [message.content, isLong, lineCount])

  return (
    <div className={`mb-2 flex gap-2 group ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.role === 'assistant' && (
        <div className="w-6 h-6 rounded-full bg-muted-foreground text-background flex items-center justify-center shrink-0">
          <Bot className="size-3" aria-hidden="true" />
        </div>
      )}
      {isEditing ? (
        <div className="rounded-md px-3 py-2 flex-1 max-w-[calc(100%-4rem)] bg-muted text-foreground">
          <div className="flex flex-col gap-1.5 w-full">
            <Textarea value={editContent} onChange={e => onEditContentChange(e.target.value)}
              className={`w-full ${fontSizeClass} min-h-[160px]`}
              onKeyDown={onEditKeyDown}
              autoFocus
            />
            <div className="flex gap-1">
              <Button size="sm" className="h-5 text-2xs" onClick={onSaveEdit}><Check data-icon="inline-start" className="size-2.5 mr-0.5" />{t('save')}</Button>
              {message.role === 'user' && (
                <Button size="sm" variant="outline" className="h-5 text-2xs" onClick={onSaveAndRegenerate}><RefreshCw data-icon="inline-start" className="size-2.5 mr-0.5" />{t('saveAndRegenerate')}</Button>
              )}
              <Button size="sm" variant="outline" className="h-5 text-2xs" onClick={onCancelEdit}><X data-icon="inline-start" className="size-2.5 mr-0.5" />{t('cancel')}</Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-w-[calc(100%-4rem)]">
          <div className={`rounded-lg px-3.5 py-2 ${fontSizeClass} break-words ${message.isError ? 'bg-destructive/10 text-destructive border border-destructive/20' : message.role === 'user' ? 'bg-green-100 text-green-950 dark:bg-green-900 dark:text-green-200' : 'bg-muted text-foreground'}`}>
            {message.isError ? (
              <>
                <div className="flex items-center gap-1 text-2xs font-medium mb-1">
                  <AlertCircle className="size-3" aria-hidden="true" />
                  <span>{t('errorMessage')}</span>
                </div>
                {message.content.includes('\n\n') ? (
                  <>
                    <div className={`whitespace-pre-wrap ${isErrorExpanded ? '' : 'line-clamp-1'}`}>{message.content}</div>
                    <button
                      onClick={() => onToggleError(message.id)}
                      className="text-2xs text-destructive/70 hover:text-destructive mt-1 transition-colors"
                      aria-expanded={isErrorExpanded}
                    >
                      {isErrorExpanded ? t('collapseError') : t('expandError')}
                    </button>
                  </>
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
              </>
            ) : (
              <>
                {message.images && message.images.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {message.images.map((img, i) => <img key={i} src={img} alt={`uploaded-image-${i + 1}`} className="max-w-[80px] max-h-[80px] rounded" />)}
                  </div>
                )}
                {message.files && message.files.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {message.files.map((file, i) => (
                      <div key={i} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs border">
                        <ImageIcon className="size-3 shrink-0" />
                        <span className="max-w-[150px] truncate">{file.name}</span>
                        <button onClick={() => { const a = document.createElement('a'); a.href = file.data; a.download = file.name; a.click() }} className="hover:text-primary transition-colors" aria-label={`${file.name} 下载`}><DownloadIcon className="size-2.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {message.thinking && (
                  <div className="mb-2 pb-2 border-b border-muted-foreground/20">
                    <button
                      onClick={() => onToggleThinking(message.id)}
                      className="flex items-center gap-1 text-2xs text-muted-foreground mb-1 hover:text-foreground transition-colors"
                      aria-expanded={isThinkingExpanded}
                    >
                      <Lightbulb className="size-2.5" />
                      <span>{t('deepThought')}</span>
                      <span className="ml-auto">{isThinkingExpanded ? '▼' : '▶'}</span>
                    </button>
                    {isThinkingExpanded && (
                      <div className="relative pl-2">
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-thinking rounded-full"></div>
                        <div className={`markdown-body ${fontSizeClass} text-xs`}><MemoizedMarkdown content={message.thinking} components={markdownComponents} /></div>
                      </div>
                    )}
                  </div>
                )}
                <div className={`markdown-body ${fontSizeClass}`}>
                  <MemoizedMarkdown content={isLong && !expanded ? previewContent : message.content} components={markdownComponents} />
                </div>
                {isLong && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-2xs text-muted-foreground hover:text-foreground mt-1 transition-colors"
                    aria-expanded={expanded}
                  >
                    {expanded ? t('collapseContent') : t('expandContent')}
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center justify-left gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-0.5">
              {!message.isError && <Button size="icon" variant="ghost" className="size-5" onClick={() => onCopy(message.content)} aria-label={t('copy')}><Copy data-icon className="size-2.5" /></Button>}
              {!message.isError && <Button size="icon" variant="ghost" className="size-5" onClick={() => onStartEdit(message)} aria-label={t('edit')}><Edit2 data-icon className="size-2.5" /></Button>}
              {(message.role === 'assistant' || message.role === 'user') && (
                <Button size="icon" variant="ghost" className="size-5" onClick={() => onRegenerate(message)} disabled={isLoading} aria-label={t('regenerate')}><RefreshCw data-icon className="size-2.5" /></Button>
              )}
              <Button size="icon" variant="ghost" className="size-5"
                onClick={(e: React.MouseEvent) => onDelete(e, message.id)}
                aria-label={t('delete')}
                ><Trash2 data-icon className="size-2.5" /></Button>
              {message.model && (() => {
                const modelProvider = providers.find(p => p.models.includes(message.model!))
                const providerName = modelProvider?.name || ''
                return <span className="text-3xs text-muted-foreground ml-1">{providerName ? `${providerName} | ${message.model}` : message.model}</span>
              })()}
            </div>
          </div>
        </div>
      )}
      {message.role === 'user' && (
        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <User className="size-3" aria-hidden="true" />
        </div>
      )}
    </div>
  )
})
