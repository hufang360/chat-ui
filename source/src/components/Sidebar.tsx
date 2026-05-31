import { useState, useRef, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import type { Conversation } from '../types'
import { APP_VERSION } from '../constants.base'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Trash2,
  MessageSquare,
  Bird,
  Settings,
  PanelLeftClose,
  Ellipsis,
  Folder,
  FolderOpen,
  Copy,
  Edit2,
  Upload,
  FileUp,
  Eraser,
} from 'lucide-react'


export interface SidebarProps {
  sidebarOpen: boolean
  onPopoverConfirm?: (x: number, y: number, onConfirm: () => void) => void
  onShowConfirm?: (title: string, message: string, onConfirm: () => void, thirdLabel?: string, onThirdAction?: () => void) => void
  onStopAndSwitchConversation: (id: string) => void
  onStopAndCreateConversation: () => void
  onOpenSettings: () => void
  onCloseSidebar: () => void
  onImportMarkdown?: () => void
  onImportJsonl?: () => void
  onCleanEmptyChats?: () => void
}

export function Sidebar({
  sidebarOpen,
  onPopoverConfirm: _onPopoverConfirm,
  onShowConfirm,
  onStopAndSwitchConversation,
  onStopAndCreateConversation,
  onOpenSettings,
  onCloseSidebar,
  onImportMarkdown,
  onImportJsonl,
  onCleanEmptyChats,
}: SidebarProps) {
  const {
    conversations,
    currentConversationId,
    folders,
    reorderConversation,
    createFolder,
    deleteFolder,
    renameFolder,
    moveConversationToFolder,
    reorderFolder,
    deleteConversation,
    renameConversation,
    duplicateConversation,
  } = useStore()

  const [draggedConversationId, setDraggedConversationId] = useState<string | null>(null)
  const [dragOverConversationId, setDragOverConversationId] = useState<string | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<'top' | 'bottom'>('bottom')
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null)
  const dragGhostRef = useRef<HTMLElement | null>(null)
  const folderExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null)
  const [editingConversationTitle, setEditingConversationTitle] = useState('')
  const settingsBtnRef = useRef<HTMLButtonElement>(null)
  const newConvBtnRef = useRef<HTMLButtonElement>(null)

  const { t } = useTranslation()

  // 切换对话时，自动展开其所在文件夹
  useEffect(() => {
    const conv = conversations.find(c => c.id === currentConversationId)
    if (conv?.folderId) {
      setExpandedFolders(prev => { const next = new Set(prev); next.add(conv.folderId!); return next })
    }
  }, [currentConversationId])

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // 分组：folder 对话 + 未分组对话
  const folderConvs = useMemo(() => {
    const map = new Map<string, Conversation[]>()
    for (const c of conversations) {
      const key = c.folderId || ''
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    }
    return map
  }, [conversations])

  // 新建文件夹：进入编辑模式
  const handleCreateFolder = () => {
    const id = createFolder('')
    setEditingFolderId(id)
    setEditingFolderName('')
  }

  // 保存对话标题
  const handleSaveConversationTitle = () => {
    if (editingConversationId) {
      if (editingConversationTitle.trim()) {
        renameConversation(editingConversationId, editingConversationTitle.trim())
      }
      setEditingConversationId(null)
    }
  }

  // 保存文件夹名
  const handleSaveFolderName = () => {
    if (editingFolderId) {
      if (editingFolderName.trim()) {
        renameFolder(editingFolderId, editingFolderName.trim())
      } else {
        deleteFolder(editingFolderId)
      }
      setEditingFolderId(null)
    }
  }

  // 调试用：导出对话原始 JSON 数据
  // 用法：在控制台输入 exportChatDebug() 导出当前对话，或 exportChatDebug('all') 导出全部
  useEffect(() => {
    (window as any).exportChatDebug = (target?: string) => {
      const state = useStore.getState()
      const convs = target === 'all'
        ? state.conversations
        : state.currentConversationId
          ? state.conversations.filter(c => c.id === state.currentConversationId)
          : []
      if (convs.length === 0) { console.warn('没有可导出的对话'); return }
      const json = JSON.stringify(convs, null, 2)
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = target === 'all' ? 'chat-debug-all.json' : `chat-debug-${convs[0].title}.json`
      a.click()
      URL.revokeObjectURL(url)
      console.log(`已导出 ${convs.length} 个对话的原始 JSON 数据`)
    }
    return () => { delete (window as any).exportChatDebug }
  }, [])

  // 对话行的通用渲染
  const renderConversationItem = (conv: Conversation, inFolder = false) => {
    const isDragOver = dragOverConversationId === conv.id
    const isEditing = editingConversationId === conv.id
    const dropLineClass = isDragOver
      ? dragOverPosition === 'top'
        ? 'before:absolute before:inset-x-1 before:-top-0.5 before:h-0 before:border-t-2 before:border-dashed before:border-primary before:z-10'
        : 'before:absolute before:inset-x-1 before:-bottom-0.5 before:h-0 before:border-t-2 before:border-dashed before:border-primary before:z-10'
      : ''
    return (
    <div
      key={conv.id}
      role="button"
      tabIndex={0}
      aria-label={conv.title}
      className={`group/item relative flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer hover:bg-accent ${
        conv.id === currentConversationId ? 'bg-accent' : ''
      } ${inFolder ? 'ml-4' : ''} ${dropLineClass}`}
      draggable
      onDragStart={(e) => {
        setDraggedConversationId(conv.id)
        setDraggedFolderId(null)
        const row = (e.currentTarget as HTMLElement)
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
      }}
      onDragOver={(e) => {
        e.preventDefault()
        const rect = e.currentTarget.getBoundingClientRect()
        const midY = rect.top + rect.height / 2
        setDragOverConversationId(conv.id)
        setDragOverPosition(e.clientY < midY ? 'top' : 'bottom')
        setDragOverFolderId(null)
      }}
      onDragLeave={() => {
        if (dragOverConversationId === conv.id) setDragOverConversationId(null)
      }}
      onClick={() => {
        if (isEditing) return
        onStopAndSwitchConversation(conv.id)
        if (window.innerWidth < 768) onCloseSidebar()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (!isEditing) {
            onStopAndSwitchConversation(conv.id)
            if (window.innerWidth < 768) onCloseSidebar()
          }
        }
      }}
      onDoubleClick={() => {
        setEditingConversationId(conv.id)
        setEditingConversationTitle(conv.title)
      }}
    >
      {sidebarOpen ? (
        <>
          <MessageSquare className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          {isEditing ? (
            <Input
              value={editingConversationTitle}
              onChange={e => setEditingConversationTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveConversationTitle()
                else if (e.key === 'Escape') setEditingConversationId(null)
              }}
              onBlur={handleSaveConversationTitle}
              className="h-5 text-xs flex-1 px-1"
              autoFocus
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span
              className="flex-1 truncate text-xs"
              onDoubleClick={(e) => {
                e.stopPropagation()
                setEditingConversationId(conv.id)
                setEditingConversationTitle(conv.title)
              }}
            >{conv.title}</span>
          )}
          {!isEditing && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 invisible group-hover/item:visible bg-background rounded">
              <DropdownMenu>
                <DropdownMenuTrigger render={(props) => (
                  <Button {...props} size="icon" variant="ghost" className="size-5"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    aria-label={t('newConversation')}
                  >
                    <Ellipsis className="size-3" />
                  </Button>
                )} />
                <DropdownMenuContent align="end" sideOffset={4} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={onStopAndCreateConversation}>
                    <Plus className="size-3 mr-2" />{t('newConversation')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCreateFolder}>
                    <Folder className="size-3 mr-2" />{t('newFolder')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => duplicateConversation(conv.id)}>
                    <Copy className="size-3 mr-2" />{t('duplicateConversation')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setEditingConversationId(conv.id)
                    setEditingConversationTitle(conv.title)
                  }}>
                    <Edit2 className="size-3 mr-2" />{t('renameConversation')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    onShowConfirm?.(
                      t('delete'),
                      t('deleteConversationConfirm', { name: conv.title }),
                      () => deleteConversation(conv.id),
                    )
                  }}>
                    <Trash2 className="size-3 mr-2 text-destructive" />{t('delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </>
      ) : (
        <div className="w-full flex justify-center">
          <MessageSquare className={`size-3 ${conv.id === currentConversationId ? 'text-foreground' : 'text-muted-foreground'}`} aria-hidden="true" />
        </div>
      )}
    </div>
    )
  }

  return (
    <div
      className={`${sidebarOpen ? 'w-full md:w-56' : 'w-0'} border-r flex flex-col transition-[width] duration-200 overflow-hidden shrink-0 md:shrink h-full`}
    >
        <div className="h-8 p-2 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-0.5">
          <Bird className="size-3" aria-hidden="true" />
          {sidebarOpen && <span className="font-medium text-xs">Chat UI</span>}
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger render={(props) => (
              <Button {...props} ref={newConvBtnRef} size="icon" variant="ghost" className="size-6" onClick={onStopAndCreateConversation} aria-label={t('newConversation')}>
                <Plus className="size-3" />
              </Button>
            )} />
            <TooltipContent side="bottom" className="text-2xs px-2 py-1">
              {t('newConversation')}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={(props) => (
              <Button {...props} size="icon" variant="ghost" className="size-6 md:hidden" onClick={onCloseSidebar} aria-label={t('collapseSidebar')}>
                <PanelLeftClose className="size-3" />
              </Button>
            )} />
            <TooltipContent side="bottom" className="text-2xs px-2 py-1">
              {t('collapseSidebar')}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto p-1 flex flex-col gap-0.5"
        role="listbox"
        aria-label={t('conversationList')}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
            const items = [...(e.currentTarget.querySelectorAll('[role="button"]') as NodeListOf<HTMLElement>)]
            if (items.length === 0) return
            const current = document.activeElement as HTMLElement
            const idx = items.indexOf(current)
            if (idx === -1) return
            e.preventDefault()
            let next: HTMLElement | null = null
            if (e.key === 'ArrowDown') next = items[Math.min(idx + 1, items.length - 1)]
            else if (e.key === 'ArrowUp') next = items[Math.max(idx - 1, 0)]
            else if (e.key === 'Home') next = items[0]
            else if (e.key === 'End') next = items[items.length - 1]
            if (next) next.focus()
          }
          // Tab 从列表跳到设置按钮
          if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault()
            settingsBtnRef.current?.focus()
          }
        }}
        onDragEnd={() => {
          // 全局 dragEnd 清理
          if (draggedConversationId && dragOverConversationId && draggedConversationId !== dragOverConversationId) {
            const targetConv = conversations.find(c => c.id === dragOverConversationId)
            reorderConversation(draggedConversationId, dragOverConversationId)
            if (targetConv?.folderId) {
              moveConversationToFolder(draggedConversationId, targetConv.folderId)
            }
          }
          if (draggedConversationId && dragOverFolderId) {
            moveConversationToFolder(draggedConversationId, dragOverFolderId)
          }
          if (draggedFolderId && dragOverFolderId && draggedFolderId !== dragOverFolderId) {
            reorderFolder(draggedFolderId, dragOverFolderId)
          }
          if (folderExpandTimerRef.current) { clearTimeout(folderExpandTimerRef.current); folderExpandTimerRef.current = null }
          setDraggedConversationId(null)
          setDragOverConversationId(null)
          setDragOverPosition('bottom')
          setDragOverFolderId(null)
          setDraggedFolderId(null)
          if (dragGhostRef.current) {
            document.body.removeChild(dragGhostRef.current)
            dragGhostRef.current = null
          }
        }}
      >
        {/* 文件夹 */}
        {folders.map(folder => {
          const convs = folderConvs.get(folder.id) || []
          const isExpanded = expandedFolders.has(folder.id)
          const isEditing = editingFolderId === folder.id
          const isDragOver = dragOverFolderId === folder.id
          const folderDropClass = isDragOver
            ? 'bg-accent before:absolute before:inset-x-1 before:-top-0.5 before:h-0 before:border-t-2 before:border-dashed before:border-primary before:z-10'
            : ''
          return (
            <div key={folder.id} className="group">
              {/* 文件夹行 */}
              <div
                className={`group/folder relative flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer hover:bg-accent ${folderDropClass}`}
                role="button"
                tabIndex={0}
                aria-label={folder.name || t('newFolder')}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation()
                  setDraggedFolderId(folder.id)
                  setDraggedConversationId(null)
                  const row = (e.currentTarget as HTMLElement)
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
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (draggedConversationId) {
                    setDragOverFolderId(folder.id)
                    if (!isExpanded && !folderExpandTimerRef.current) {
                      folderExpandTimerRef.current = setTimeout(() => {
                        setExpandedFolders(prev => { const next = new Set(prev); next.add(folder.id); return next })
                        folderExpandTimerRef.current = null
                      }, 600)
                    }
                  }
                }}
                onDragLeave={() => {
                  if (dragOverFolderId === folder.id) setDragOverFolderId(null)
                  if (folderExpandTimerRef.current) { clearTimeout(folderExpandTimerRef.current); folderExpandTimerRef.current = null }
                }}
                onClick={() => toggleFolder(folder.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFolder(folder.id) } }}
              >
                {sidebarOpen ? (
                  <>
                    {isExpanded
                      ? <FolderOpen className="size-3 shrink-0 text-primary" />
                      : <Folder className="size-3 shrink-0 text-muted-foreground" />
                    }
                    {isEditing ? (
                      <Input
                        value={editingFolderName}
                        onChange={e => setEditingFolderName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveFolderName()
                          else if (e.key === 'Escape') { deleteFolder(folder.id); setEditingFolderId(null) }
                        }}
                        onBlur={handleSaveFolderName}
                        className="h-5 text-xs flex-1 px-1"
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <span className="flex-1 truncate text-xs font-medium"
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            setEditingFolderId(folder.id)
                            setEditingFolderName(folder.name)
                          }}
                        >{folder.name || t('newFolder')}</span>
                        <span className="text-3xs text-muted-foreground">{convs.length}</span>
                      </>
                    )}
                    {!isEditing && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 invisible group-hover/folder:visible bg-background rounded">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={(props) => (
                            <Button {...props} size="icon" variant="ghost" className="size-5"
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              aria-label={t('newConversation')}
                            >
                              <Ellipsis className="size-3" />
                            </Button>
                          )} />
                          <DropdownMenuContent align="end" sideOffset={4} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => {
                              const convId = useStore.getState().createConversation()
                              moveConversationToFolder(convId, folder.id)
                            }}>
                              <Plus className="size-3 mr-2" />{t('newConversation')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleCreateFolder}>
                              <Folder className="size-3 mr-2" />{t('newFolder')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setEditingFolderId(folder.id); setEditingFolderName(folder.name) }}>
                              <Edit2 className="size-3 mr-2" />{t('renameFolder')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              if (convs.length > 0) {
                                const convIds = new Set(convs.map(c => c.id))
                                onShowConfirm?.(
                                  t('deleteFolder'),
                                  t('deleteFolderConfirm', { name: folder.name || t('newFolder'), count: convs.length }),
                                  () => {
                                    useStore.setState({ conversations: useStore.getState().conversations.filter(c => !convIds.has(c.id)) })
                                    deleteFolder(folder.id)
                                  },
                                  t('deleteFolderOnly'),
                                  () => deleteFolder(folder.id),
                                )
                              } else {
                                deleteFolder(folder.id)
                              }
                            }}>
                              <Trash2 className="size-3 mr-2 text-destructive" />{t('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full flex justify-center">
                    {isExpanded
                      ? <FolderOpen className="size-3 text-primary" />
                      : <Folder className="size-3 text-muted-foreground" />
                    }
                  </div>
                )}
              </div>
              {/* 文件夹内对话 */}
              {sidebarOpen && isExpanded && convs.map(conv => renderConversationItem(conv, true))}
            </div>
          )
        })}

        {/* 未分组对话 */}
        {(folderConvs.get('') || []).map(conv => renderConversationItem(conv))}
      </div>

      {/* 底部按钮 */}
      <div className="shrink-0 border-t p-1.5">
        <div className="flex items-center">
          <Button ref={settingsBtnRef} variant="ghost" size="sm" className="flex-1 justify-start text-xs h-7 gap-1.5"
            onClick={onOpenSettings}
          >
            <Settings data-icon="inline-start" className="size-3 shrink-0" />
            <span className="truncate">{t('settings')}
              <span className="px-1 text-[10px] text-muted-foreground/50 select-none pb-0.5">v{APP_VERSION}</span>
            </span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={(props) => (
              <Button {...props} size="icon" variant="ghost" className="size-7 shrink-0" aria-label={t('settings')}
                onKeyDown={(e) => {
                  if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault()
                    newConvBtnRef.current?.focus()
                  }
                }}
              >
                <Ellipsis className="size-3" />
              </Button>
            )} />
            <DropdownMenuContent align="end" sideOffset={4}>
              {onImportMarkdown && (
                <DropdownMenuItem onClick={onImportMarkdown}>
                  <Upload className="size-3 mr-2" />{t('importMarkdown')}
                </DropdownMenuItem>
              )}
              {onImportJsonl && (
                <DropdownMenuItem onClick={onImportJsonl}>
                  <FileUp className="size-3 mr-2" />{t('importJsonl')}
                </DropdownMenuItem>
              )}
              {onCleanEmptyChats && (
                <>
                  {(onImportMarkdown || onImportJsonl) && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={onCleanEmptyChats}>
                    <Eraser className="size-3 mr-2" />{t('cleanEmptyChats')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

    </div>
  )
}
