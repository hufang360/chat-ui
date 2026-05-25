import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Conversation, Message, Provider, ModelParams, Prompt, UIConfig } from './types'
import { generateId, DEFAULT_PROVIDERS_WITH_FLAGS, DEFAULT_MODEL_PARAMS, DEFAULT_UI_CONFIG } from './constants'
import i18n from './i18n'

interface StoreState {
  conversations: Conversation[]
  currentConversationId: string | null
  providers: Provider[]
  apiKeys: Record<string, string>
  selectedModel: string
  globalSystemPrompt: string
  modelParams: ModelParams
  uiConfig: UIConfig

  // 会话管理
  createConversation: () => string
  deleteConversation: (id: string) => void
  switchConversation: (id: string) => void
  renameConversation: (id: string, title: string) => void
  reorderConversation: (fromId: string, toId: string) => void
  duplicateConversation: (id: string) => string
  setConversationSystemPrompt: (id: string, prompt: string) => void
  getCurrentConversation: () => Conversation | null

  // 消息管理
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  updateMessage: (id: string, content: string) => void
  deleteMessage: (id: string) => void

  // 供应商管理
  addProvider: (provider: Provider) => void
  updateProvider: (id: string, updates: Partial<Provider>) => void
  deleteProvider: (id: string) => void
  reorderProvider: (fromId: string, toId: string) => void

  // 配置
  setApiKey: (provider: string, key: string) => void
  setSelectedModel: (model: string) => void
  setGlobalSystemPrompt: (prompt: string) => void
  setModelParams: (params: Partial<ModelParams>) => void
  setUIConfig: (config: Partial<UIConfig>) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLanguage: (language: 'zh' | 'en') => void
  getTheme: () => 'light' | 'dark'

  // 提示词管理
  addPrompt: (prompt: Prompt) => void
  deletePrompt: (id: string) => void
  updatePrompt: (id: string, updates: Partial<Prompt>) => void
  reorderPrompts: (fromIndex: number, toIndex: number) => void

  // 导入导出
  exportConfig: () => string
  importConfig: (config: string) => void

  // 工具
  getProvider: () => Provider | null
  getApiKey: () => string
}

// 仅持久化数据字段，排除 action 方法
type PersistedState = Pick<StoreState,
  | 'conversations'
  | 'currentConversationId'
  | 'providers'
  | 'apiKeys'
  | 'selectedModel'
  | 'globalSystemPrompt'
  | 'modelParams'
  | 'uiConfig'
>

// 取首条用户消息前30字符作为会话标题
const getConversationTitle = (messages: Message[]): string => {
  const firstUserMessage = messages.find(m => m.role === 'user')
  if (!firstUserMessage) return i18n.t('newConversation')
  const content = firstUserMessage.content.slice(0, 30)
  return content + (firstUserMessage.content.length > 30 ? '...' : '')
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      providers: DEFAULT_PROVIDERS_WITH_FLAGS,
      apiKeys: {},
      selectedModel: 'deepseek-v4-flash',
      globalSystemPrompt: 'respond in chinese.',
      modelParams: DEFAULT_MODEL_PARAMS,
      uiConfig: DEFAULT_UI_CONFIG,

      // 新会话插入列表头部
      createConversation: () => {
        const id = generateId()
        const state = get()
        const current = state.conversations.find(c => c.id === state.currentConversationId)
        const systemPrompt = current?.systemPrompt || (current?.systemPrompt === undefined ? state.globalSystemPrompt : undefined)
        const newConversation: Conversation = {
          id,
          title: i18n.t('newConversation'),
          messages: [],
          systemPrompt,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: id,
        }))
        return id
      },

      deleteConversation: (id) => set((state) => {
        const filtered = state.conversations.filter(c => c.id !== id)
        // 删除当前会话时自动切换到第一个剩余会话
        const currentId = state.currentConversationId === id
          ? (filtered[0]?.id || null)
          : state.currentConversationId
        return { conversations: filtered, currentConversationId: currentId }
      }),

      switchConversation: (id) => set({ currentConversationId: id }),

      renameConversation: (id, title) => set((state) => ({
        conversations: state.conversations.map(c =>
          c.id === id ? { ...c, title } : c
        ),
      })),

      reorderConversation: (fromId, toId) => set((state) => {
        const conversations = [...state.conversations]
        const fromIndex = conversations.findIndex(c => c.id === fromId)
        const toIndex = conversations.findIndex(c => c.id === toId)

        if (fromIndex === -1 || toIndex === -1) return state

        const [removed] = conversations.splice(fromIndex, 1)
        conversations.splice(toIndex, 0, removed)

        return { conversations }
      }),

      // 深拷贝：为消息和话题重新生成 ID
      duplicateConversation: (id) => {
        const idToUse = id
        let newId = ''
        set((state) => {
          const index = state.conversations.findIndex(c => c.id === idToUse)
          if (index === -1) return state
          const original = state.conversations[index]
          newId = generateId()
          const duplicate: Conversation = {
            ...original,
            id: newId,
            title: `${original.title}${i18n.t('copySuffix')}`,
            messages: original.messages.map(m => ({ ...m, id: generateId() })),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          const conversations = [...state.conversations]
          conversations.splice(index, 0, duplicate)
          return { conversations, currentConversationId: newId }
        })
        return newId
      },

      setConversationSystemPrompt: (id, prompt) => set((state) => ({
        conversations: state.conversations.map(c =>
          c.id === id ? { ...c, systemPrompt: prompt } : c
        ),
      })),

      getCurrentConversation: () => {
        const state = get()
        return state.conversations.find(c => c.id === state.currentConversationId) || null
      },

      // 无当前会话时自动创建一个
      addMessage: (message) => {
        const state = get()
        const currentId = state.currentConversationId || (() => {
          const id = generateId()
          set({
            conversations: [{ id, title: i18n.t('newConversation'), messages: [], createdAt: Date.now(), updatedAt: Date.now() }, ...state.conversations],
            currentConversationId: id,
          })
          return id
        })()

        set((s) => {
          const newMessage: Message = {
            ...message,
            id: generateId(),
            timestamp: Date.now(),
          }
          return {
            conversations: s.conversations.map(c => {
              if (c.id !== currentId) return c
              const updatedMessages = [...c.messages, newMessage]
              return {
                ...c,
                messages: updatedMessages,
                // 首条消息时自动生成标题
                title: c.messages.length === 0 ? getConversationTitle(updatedMessages) : c.title,
                updatedAt: Date.now(),
              }
            }),
          }
        })
      },

      updateMessage: (id, content) => set((state) => ({
        conversations: state.conversations.map(c => ({
          ...c,
          messages: c.messages.map(m =>
            m.id === id ? { ...m, content } : m
          ),
          updatedAt: Date.now(),
        })),
      })),

      deleteMessage: (id) => set((state) => ({
        conversations: state.conversations.map(c => ({
          ...c,
          messages: c.messages.filter(m => m.id !== id),
          updatedAt: Date.now(),
        })),
      })),

      addProvider: (provider) => set((state) => ({
        providers: [...state.providers, provider]
      })),

      updateProvider: (id, updates) => set((state) => ({
        providers: state.providers.map(p =>
          p.id === id ? { ...p, ...updates } : p
        ),
      })),

      deleteProvider: (id) => set((state) => ({
        providers: state.providers.filter(p => p.id !== id)
      })),

      reorderProvider: (fromId, toId) => set((state) => {
        const providers = [...state.providers]
        const fromIndex = providers.findIndex(p => p.id === fromId)
        const toIndex = providers.findIndex(p => p.id === toId)

        if (fromIndex === -1 || toIndex === -1) return state

        const [removed] = providers.splice(fromIndex, 1)
        providers.splice(toIndex, 0, removed)

        return { providers }
      }),

      setApiKey: (provider, key) => set((state) => ({
        apiKeys: { ...state.apiKeys, [provider]: key }
      })),

      setSelectedModel: (model) => set({ selectedModel: model }),

      setGlobalSystemPrompt: (prompt) => set({ globalSystemPrompt: prompt }),

      setModelParams: (params) => set((state) => ({
        modelParams: { ...state.modelParams, ...params }
      })),

      setUIConfig: (config) => set((state) => ({
        uiConfig: { ...state.uiConfig, ...config }
      })),

      setTheme: (theme) => set((state) => ({
        uiConfig: { ...state.uiConfig, theme }
      })),

      setLanguage: (language) => {
        i18n.changeLanguage(language)
        set((state) => ({
          uiConfig: { ...state.uiConfig, language }
        }))
      },

      getTheme: () => {
        const state = get()
        const theme = state.uiConfig.theme || 'system'
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        }
        return theme
      },

      addPrompt: (prompt: Prompt) => set((state) => ({
        uiConfig: {
          ...state.uiConfig,
          prompts: [...(state.uiConfig.prompts || []), prompt]
        }
      })),

      deletePrompt: (id: string) => set((state) => ({
        uiConfig: {
          ...state.uiConfig,
          prompts: (state.uiConfig.prompts || []).filter(p => p.id !== id)
        }
      })),

      updatePrompt: (id: string, updates: Partial<Prompt>) => set((state) => ({
        uiConfig: {
          ...state.uiConfig,
          prompts: (state.uiConfig.prompts || []).map(p => p.id === id ? { ...p, ...updates } : p)
        }
      })),

      reorderPrompts: (fromIndex: number, toIndex: number) => set((state) => {
        const prompts = state.uiConfig.prompts || []
        const newPrompts = [...prompts]
        const [removed] = newPrompts.splice(fromIndex, 1)
        newPrompts.splice(toIndex, 0, removed)
        return {
          uiConfig: { ...state.uiConfig, prompts: newPrompts }
        }
      }),

      // 通过当前选中模型反查所属供应商
      getProvider: () => {
        const state = get()
        return state.providers.find(p => p.models.includes(state.selectedModel)) || null
      },

      // 获取当前模型所属供应商的 API Key
      getApiKey: () => {
        const state = get()
        const provider = state.providers.find(p => p.models.includes(state.selectedModel))
        return provider ? (state.apiKeys[provider.id] || '') : ''
      },

      exportConfig: () => {
        const state = get()
        const config = {
          providers: state.providers,
          apiKeys: state.apiKeys,
        }
        return JSON.stringify(config, null, 2)
      },

      importConfig: (configString) => {
        try {
          const config = JSON.parse(configString)
          if (config.providers) set({ providers: config.providers })
          if (config.apiKeys) set({ apiKeys: config.apiKeys })
          return true
        } catch {
          return false
        }
      },

    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedState => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
        providers: state.providers,
        apiKeys: state.apiKeys,
        selectedModel: state.selectedModel,
        globalSystemPrompt: state.globalSystemPrompt,
        modelParams: state.modelParams,
        uiConfig: state.uiConfig,
      }),
    }
  )
)
