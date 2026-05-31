import { useState, useRef, useCallback } from 'react'
import { useStore } from '../store'
import { streamChat } from '../api'
import { toast } from 'sonner'
import i18n from '../i18n'

export interface ImageFile {
  name: string
  data: string
  type: 'image'
  mimeType?: string
}

export function useChat() {
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingThinking, setStreamingThinking] = useState('')
  // ref 同步追踪流式内容，避免回调闭包中读取过期的 state
  const streamingRef = useRef('')
  const streamingThinkingRef = useRef('')
  const abortControllerRef = useRef<AbortController | null>(null)
  // 记录当前流式响应对应的对话，防止切对话后旧回调写入新对话
  const streamingConversationIdRef = useRef<string | null>(null)
  // rAF 节流：批量更新 streaming 状态，避免每个 SSE chunk 都触发重渲染
  const rafIdRef = useRef<number | null>(null)

  const currentConversationId = useStore(s => s.currentConversationId)
  const selectedModel = useStore(s => s.selectedModel)
  const globalSystemPrompt = useStore(s => s.globalSystemPrompt)
  const storeModelParams = useStore(s => s.modelParams)
  const uiConfig = useStore(s => s.uiConfig)
  const getCurrentConversation = useStore(s => s.getCurrentConversation)
  const getProvider = useStore(s => s.getProvider)
  const getApiKey = useStore(s => s.getApiKey)
  const addMessage = useStore(s => s.addMessage)
  const deleteMessage = useStore(s => s.deleteMessage)

  // 构建系统提示词，按需注入元数据
  const buildSystemPrompt = (basePrompt: string) => {
    if (uiConfig.injectMetadata === false) return basePrompt
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const time = now.toTimeString().split(' ')[0]
    const metadata = `Current model: ${selectedModel}\nCurrent date: ${date}\nCurrent time: ${time}`
    return metadata + '\n\n' + basePrompt
  }

  // 构建符合 OpenAI Vision API 格式的消息列表，system 消息单独通过 systemPrompt 传入
  const buildApiMessages = (messages: Array<{ role: string; content: string; images?: string[]; files?: Array<{ type: string; data: string; name: string }> }>) => {
    const apiMessages: { role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }[] = []
    for (const m of messages) {
      if (m.role === 'system') continue
      if ((m.images && m.images.length > 0) || (m.files && m.files.length > 0)) {
        const imageFiles = m.files?.filter(f => f.type === 'image') || []
        apiMessages.push({
          role: m.role,
          content: [
            { type: 'text', text: m.content },
            ...(m.images || []).map(img => ({ type: 'image_url', image_url: { url: img } }) as const),
            ...imageFiles.map(f => ({ type: 'image_url', image_url: { url: f.data } }) as const),
          ],
        })
      } else {
        apiMessages.push({ role: m.role, content: m.content })
      }
    }
    return apiMessages
  }

  // 将 ref 中的最新内容同步到 state（在 rAF 回调中执行）
  const flushStreamingState = () => {
    rafIdRef.current = null
    setStreamingContent(streamingRef.current)
    setStreamingThinking(streamingThinkingRef.current)
  }

  const resetStreamingState = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    setStreamingContent('')
    setStreamingThinking('')
    streamingRef.current = ''
    streamingThinkingRef.current = ''
    setIsLoading(false)
    abortControllerRef.current = null
    streamingConversationIdRef.current = null
  }

  const sendMessage = useCallback(async (content: string, imageDataUrls: string[], thinkingEnabled?: boolean, thinkingLevel?: 'low' | 'medium' | 'high') => {
    const provider = getProvider()
    const apiKey = getApiKey()
    // Ollama / LM Studio 等本地服务不需要 API Key
    const isLocalProvider = provider?.apiType === 'ollama' || provider?.id === 'lmstudio'
    if ((!apiKey && !isLocalProvider && !provider?.allowEmptyApiKey) || !provider) return false

    const modelMetadata = provider.modelMetadata?.[selectedModel]
    const supportsVision = modelMetadata?.supportsVision || false
    const modelSupportsThinking = modelMetadata?.supportsThinking || false

    // 视觉检查：新图片或历史消息含图片，但模型不支持 → 拦截（在 addMessage 之前）
    const preCheck = getCurrentConversation()
    const hasExistingImages = preCheck?.messages?.some(m =>
      (m.images && m.images.length > 0) || m.files?.some(f => f.type === 'image')
    )
    if ((imageDataUrls.length > 0 || hasExistingImages) && !supportsVision) {
      toast.error(i18n.t('modelNotSupportImage'))
      return false
    }

    addMessage({ role: 'user', content, images: imageDataUrls })
    setIsLoading(true)
    setStreamingContent('')
    setStreamingThinking('')
    streamingRef.current = ''
    streamingThinkingRef.current = ''
    streamingConversationIdRef.current = currentConversationId

    const conversation = getCurrentConversation()
    const systemPrompt = buildSystemPrompt(conversation?.systemPrompt ?? globalSystemPrompt)
    const apiMessages = buildApiMessages(conversation?.messages || [])

    const finalModelParams = {
      ...storeModelParams,
      thinkingEnabled,
      thinkingLevel,
    }

    abortControllerRef.current = new AbortController()

    await streamChat({
      baseUrl: provider.baseUrl,
      apiKey,
      model: selectedModel,
      messages: apiMessages,
      systemPrompt,
      modelParams: finalModelParams,
      modelMetadata,
      useCorsProxy: provider.useCorsProxy,
      corsProxyUrl: undefined,
      abortSignal: abortControllerRef.current.signal,
      modelSupportsThinking,
      onChunk: content => {
        streamingRef.current += content
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(flushStreamingState)
        }
      },
      onThinkingChunk: thinkingContent => {
        streamingThinkingRef.current += thinkingContent
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(flushStreamingState)
        }
      },
      onError: error => {
        if (error.name === 'AbortError') {
          resetStreamingState()
          return
        }
        if (streamingConversationIdRef.current === currentConversationId) {
          addMessage({
            role: 'assistant',
            content: error.message,
            model: selectedModel,
            isError: true,
          })
        }
        resetStreamingState()
      },
      onComplete: () => {
        // 确保最终内容被刷新到 state
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current)
          rafIdRef.current = null
        }
        setStreamingContent(streamingRef.current)
        setStreamingThinking(streamingThinkingRef.current)
        if (streamingConversationIdRef.current === currentConversationId && streamingRef.current) {
          addMessage({
            role: 'assistant',
            content: streamingRef.current,
            thinking: streamingThinkingRef.current || undefined,
            model: selectedModel
          })
        }
        resetStreamingState()
      },
    })

    return true
  }, [currentConversationId, selectedModel, globalSystemPrompt, storeModelParams])

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (streamingRef.current && streamingConversationIdRef.current === currentConversationId) {
      addMessage({
        role: 'assistant',
        content: streamingRef.current,
        thinking: streamingThinkingRef.current || undefined,
        model: selectedModel
      })
    } else if (streamingConversationIdRef.current === currentConversationId) {
      addMessage({ role: 'assistant', content: i18n.t('cancelled'), model: selectedModel })
    }
    resetStreamingState()
  }, [currentConversationId, selectedModel])

  const regenerate = useCallback(async (messageIndex: number, thinkingEnabled?: boolean, thinkingLevel?: 'low' | 'medium' | 'high') => {
    const provider = getProvider()
    const apiKey = getApiKey()
    // Ollama / LM Studio 等本地服务不需要 API Key
    const isLocalProvider = provider?.apiType === 'ollama' || provider?.id === 'lmstudio'
    if ((!apiKey && !isLocalProvider && !provider?.allowEmptyApiKey) || !provider) return false

    const conversation = getCurrentConversation()
    const messages = conversation?.messages || []
    const contextMessages = messages.slice(0, messageIndex)

    const modelMetadata = provider.modelMetadata?.[selectedModel]
    const supportsVision = modelMetadata?.supportsVision || false
    const modelSupportsThinking = modelMetadata?.supportsThinking || false

    // 对话包含图片但模型不支持视觉时，提前拦截（检查全部消息，包括待删除的）
    const hasImages = messages.some(m =>
      (m.images && m.images.length > 0) || m.files?.some(f => f.type === 'image')
    )
    if (hasImages && !supportsVision) {
      toast.error(i18n.t('modelNotSupportImage'))
      return false
    }

    // 删除从 messageIndex 开始的所有后续消息（包括失败的回复）
    const messagesToDelete = messages.slice(messageIndex)
    messagesToDelete.forEach(m => deleteMessage(m.id))

    setIsLoading(true)
    setStreamingContent('')
    setStreamingThinking('')
    streamingRef.current = ''
    streamingThinkingRef.current = ''
    streamingConversationIdRef.current = currentConversationId

    const systemPrompt = buildSystemPrompt(conversation?.systemPrompt ?? globalSystemPrompt)
    const apiMessages = buildApiMessages(contextMessages)

    const finalModelParams = {
      ...storeModelParams,
      thinkingEnabled,
      thinkingLevel,
    }

    abortControllerRef.current = new AbortController()

    await streamChat({
      baseUrl: provider.baseUrl,
      apiKey,
      model: selectedModel,
      messages: apiMessages,
      systemPrompt,
      modelParams: finalModelParams,
      modelMetadata,
      useCorsProxy: provider.useCorsProxy,
      corsProxyUrl: undefined,
      abortSignal: abortControllerRef.current.signal,
      modelSupportsThinking,
      onChunk: content => {
        streamingRef.current += content
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(flushStreamingState)
        }
      },
      onThinkingChunk: thinkingContent => {
        streamingThinkingRef.current += thinkingContent
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(flushStreamingState)
        }
      },
      onError: error => {
        if (error.name === 'AbortError') {
          resetStreamingState()
          return
        }
        if (streamingConversationIdRef.current === currentConversationId) {
          addMessage({
            role: 'assistant',
            content: error.message,
            model: selectedModel,
            isError: true,
          })
        }
        resetStreamingState()
      },
      onComplete: () => {
        // 确保最终内容被刷新到 state
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current)
          rafIdRef.current = null
        }
        setStreamingContent(streamingRef.current)
        setStreamingThinking(streamingThinkingRef.current)
        if (streamingConversationIdRef.current === currentConversationId && streamingRef.current) {
          addMessage({
            role: 'assistant',
            content: streamingRef.current,
            thinking: streamingThinkingRef.current || undefined,
            model: selectedModel
          })
        }
        resetStreamingState()
      },
    })

    return true
  }, [currentConversationId, selectedModel, globalSystemPrompt, storeModelParams])

  return {
    isLoading,
    streamingContent,
    streamingThinking,
    sendMessage,
    stopGeneration,
    regenerate,
  }
}
