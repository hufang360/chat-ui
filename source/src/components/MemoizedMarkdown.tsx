import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MemoizedMarkdownProps {
  content: string
  components: Record<string, any>
}

export const MemoizedMarkdown = memo(function MemoizedMarkdown({ content, components }: MemoizedMarkdownProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  )
})
