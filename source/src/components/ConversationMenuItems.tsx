import { useTranslation } from 'react-i18next'
import { Copy, Edit2, Sparkles, FileText, Plus, Eraser } from 'lucide-react'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { Conversation } from '../types'

interface ConversationMenuItemsProps {
  conv: Conversation
  onDuplicate: () => void
  onRename: () => void
  onGenerateTopicName?: () => void
  onExportMarkdown: () => void
  onDelete?: (e: React.MouseEvent) => void
  generateDisabled?: boolean
  onNewConversation?: () => void
  onClearMessages?: (e: React.MouseEvent) => void
  clearDisabled?: boolean
}

export function ConversationMenuItems({
  conv,
  onDuplicate,
  onRename,
  onGenerateTopicName,
  onExportMarkdown,
  onDelete: _onDelete,
  generateDisabled,
  onNewConversation,
  onClearMessages,
  clearDisabled,
}: ConversationMenuItemsProps) {
  const { t } = useTranslation()
  return (
    <>
      {onNewConversation && (
        <DropdownMenuItem onClick={onNewConversation}>
          <Plus className="size-3 mr-2" />{t('newChat')}
        </DropdownMenuItem>
      )}
      
      <DropdownMenuItem onClick={onDuplicate}>
        <Copy className="size-3 mr-2" />{t('duplicateConversation')}
      </DropdownMenuItem>

      {onClearMessages && conv.messages.length > 0 && (
        <>
          <DropdownMenuItem onClick={onClearMessages} disabled={clearDisabled}>
            <Eraser className="size-3 mr-2" />{t('clearMessages')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}


      <DropdownMenuItem onClick={onRename}>
        <Edit2 className="size-3 mr-2" />{t('renameConversation')}
      </DropdownMenuItem>
      {conv.messages.length > 0 && onGenerateTopicName && (
        <DropdownMenuItem onClick={onGenerateTopicName} disabled={generateDisabled}>
          <Sparkles className="size-3 mr-2" />{t('generateTopicName')}
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={onExportMarkdown}>
        <FileText className="size-3 mr-2" />{t('exportConversation')}
      </DropdownMenuItem>
    </>
  )
}
