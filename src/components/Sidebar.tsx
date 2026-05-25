import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Plus,
  Trash2,
  GripVertical,
  MessageSquare,
  Copy,
  Bird,
} from 'lucide-react'

// 弹出层垂直偏移，对应 spacing-2 (0.5rem = 8px)
const POPOVER_OFFSET = 8

export interface SidebarProps {
  sidebarOpen: boolean
  onPopoverConfirm?: (x: number, y: number, onConfirm: () => void) => void
  onStopAndSwitchConversation: (id: string) => void
  onStopAndCreateConversation: () => void
}

export function Sidebar({
  sidebarOpen,
  onPopoverConfirm,
  onStopAndSwitchConversation,
  onStopAndCreateConversation,
}: SidebarProps) {
  const {
    conversations,
    currentConversationId,
    deleteConversation,
    reorderConversation,
    duplicateConversation,
  } = useStore()

  const [draggedConversationId, setDraggedConversationId] = useState<string | null>(null)
  const [dragOverConversationId, setDragOverConversationId] = useState<string | null>(null)
  // 拖拽时克隆行元素作为自定义拖拽预览，拖拽结束后清理
  const dragGhostRef = useRef<HTMLElement | null>(null)

  const { t } = useTranslation()

  return (
    <div
      className={`${sidebarOpen ? 'w-56' : 'w-0'} border-r flex flex-col transition-all duration-200 overflow-hidden`}
    >
        <div className="h-8 p-2 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-0.5">
          <Bird className="size-3" />
          {sidebarOpen && <span className="font-medium text-xs">Chat UI</span>}
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger render={<Button size="icon" variant="ghost" className="size-6" onClick={onStopAndCreateConversation} />}>
              <Plus data-icon className="size-3" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-2xs px-2 py-1">
              {t('newConversation')}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1 flex flex-col gap-0.5">
        {conversations.map(conv => (
          <div
            key={conv.id}
            className={`group relative flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer hover:bg-accent ${
              conv.id === currentConversationId ? 'bg-accent' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverConversationId(conv.id)
            }}
            onDragEnd={() => {
              if (draggedConversationId && dragOverConversationId && draggedConversationId !== dragOverConversationId) {
                reorderConversation(draggedConversationId, dragOverConversationId)
              }
              setDraggedConversationId(null)
              setDragOverConversationId(null)
              if (dragGhostRef.current) {
                document.body.removeChild(dragGhostRef.current)
                dragGhostRef.current = null
              }
            }}
            onClick={() => onStopAndSwitchConversation(conv.id)}
          >
            {sidebarOpen ? (
              <>
                <span
                  className="shrink-0 relative w-3 h-3 cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation()
                    setDraggedConversationId(conv.id)
                    // 克隆当前行作为拖拽预览图，定位到屏幕外
                    const row = (e.currentTarget as HTMLElement).closest('.group') as HTMLElement
                    if (row) {
                      const ghost = row.cloneNode(true) as HTMLElement
                      ghost.style.position = 'absolute'
                      ghost.style.top = '-9999px'
                      ghost.style.width = row.offsetWidth + 'px'
                      ghost.style.opacity = '0.85'
                      ghost.style.pointerEvents = 'none'
                      ghost.classList.add('bg-accent')
                      document.body.appendChild(ghost)
                      e.dataTransfer.setDragImage(ghost, 0, 0)
                      dragGhostRef.current = ghost
                    }
                  }}
                >
                  <MessageSquare className="absolute inset-0 size-3 text-muted-foreground group-hover:opacity-0 transition-opacity" />
                  <GripVertical className="absolute inset-0 size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
                <span className="flex-1 truncate text-xs">{conv.title}</span>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 bg-background rounded">
                  <Tooltip>
                    <TooltipTrigger render={<Button
                        size="icon"
                        variant="ghost"
                        className="size-5"
                        onClick={e => {
                          e.stopPropagation()
                          duplicateConversation(conv.id)
                        }}
                    />}>
                      <Copy data-icon className="size-3" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-2xs px-2 py-1">{t('copy')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger render={<Button
                        size="icon"
                        variant="ghost"
                        className="size-5"
                        onClick={e => {
                          e.stopPropagation()
                          onPopoverConfirm?.(e.clientX, e.clientY + POPOVER_OFFSET, () => deleteConversation(conv.id))
                        }}
                    />}>
                      <Trash2 data-icon className="size-3" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-2xs px-2 py-1">{t('delete')}</TooltipContent>
                  </Tooltip>
                </div>
              </>
            ) : (
              <div className="w-full flex justify-center">
                <MessageSquare className={`size-3 ${conv.id === currentConversationId ? 'text-foreground' : 'text-muted-foreground'}`} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
