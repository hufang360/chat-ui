import { useState, useRef, useCallback } from 'react'
import { useStore } from '../store'
import { streamChat } from '../api'
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

  const {
    currentConversationId,
    selectedModel,
    globalSystemPrompt,
    modelParams: storeModelParams,
    getCurrentConversation,
    getProvider,
    getApiKey,
    addMessage,
    deleteMessage,
  } = useStore()

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

  const sendMessage = useCallback(async (content: string, imageDataUrls: string[], thinkingEnabled?: boolean, thinkingLevel?: 'low' | 'medium' | 'high') => {
    const provider = getProvider()
    const apiKey = getApiKey()
    // Ollama / LM Studio 等本地服务不需要 API Key
    const isLocalProvider = provider?.apiType === 'ollama' || provider?.id === 'lmstudio'
    if ((!apiKey && !isLocalProvider) || !provider) return false

    addMessage({ role: 'user', content, images: imageDataUrls })
    setIsLoading(true)
    setStreamingContent('')
    setStreamingThinking('')
    streamingRef.current = ''
    streamingThinkingRef.current = ''
    streamingConversationIdRef.current = currentConversationId

    const conversation = getCurrentConversation()
    const systemPrompt = conversation?.systemPrompt ?? globalSystemPrompt
    const apiMessages = buildApiMessages(conversation?.messages || [])

    // 检查模型是否支持思考
    const modelMetadata = provider.modelMetadata?.[selectedModel]
    const modelSupportsThinking = modelMetadata?.supportsThinking || false

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
      useCorsProxy: provider.useCorsProxy,
      corsProxyUrl: undefined,
      abortSignal: abortControllerRef.current.signal,
      modelSupportsThinking,
      onChunk: content => {
        const newContent = streamingRef.current + content
        streamingRef.current = newContent
        setStreamingContent(newContent)
      },
      onThinkingChunk: thinkingContent => {
        const newThinking = streamingThinkingRef.current + thinkingContent
        streamingThinkingRef.current = newThinking
        setStreamingThinking(newThinking)
      },
      onError: error => {
        if (error.name === 'AbortError') {
          setStreamingContent('')
          setStreamingThinking('')
          streamingRef.current = ''
          streamingThinkingRef.current = ''
          setIsLoading(false)
          abortControllerRef.current = null
          streamingConversationIdRef.current = null
          return
        }
        if (streamingConversationIdRef.current === currentConversationId) {
          const errorContent = i18n.t('errorPrefix', { message: error.message })
          streamingRef.current = errorContent
          setStreamingContent(errorContent)
        } else {
          setStreamingContent('')
          streamingRef.current = ''
        }
        setIsLoading(false)
        abortControllerRef.current = null
        streamingConversationIdRef.current = null
      },
      onComplete: () => {
        if (streamingConversationIdRef.current === currentConversationId && streamingRef.current) {
          addMessage({
            role: 'assistant',
            content: streamingRef.current,
            thinking: streamingThinkingRef.current || undefined,
            model: selectedModel
          })
        }
        setStreamingContent('')
        setStreamingThinking('')
        streamingRef.current = ''
        streamingThinkingRef.current = ''
        setIsLoading(false)
        abortControllerRef.current = null
        streamingConversationIdRef.current = null
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
    setStreamingContent('')
    setStreamingThinking('')
    streamingRef.current = ''
    streamingThinkingRef.current = ''
    setIsLoading(false)
    streamingConversationIdRef.current = null
  }, [currentConversationId, selectedModel])

  const regenerate = useCallback(async (messageIndex: number, thinkingEnabled?: boolean, thinkingLevel?: 'low' | 'medium' | 'high') => {
    const provider = getProvider()
    const apiKey = getApiKey()
    // Ollama / LM Studio 等本地服务不需要 API Key
    const isLocalProvider = provider?.apiType === 'ollama' || provider?.id === 'lmstudio'
    if ((!apiKey && !isLocalProvider) || !provider) return false

    const conversation = getCurrentConversation()
    const messages = conversation?.messages || []
    // 删除从 messageIndex 开始的所有后续消息（包括失败的回复）
    const messagesToDelete = messages.slice(messageIndex)
    messagesToDelete.forEach(m => deleteMessage(m.id))

    // 用截断后的消息列表作为上下文重新请求
    const contextMessages = messages.slice(0, messageIndex)

    setIsLoading(true)
    setStreamingContent('')
    setStreamingThinking('')
    streamingRef.current = ''
    streamingThinkingRef.current = ''
    streamingConversationIdRef.current = currentConversationId

    const systemPrompt = conversation?.systemPrompt ?? globalSystemPrompt
    const apiMessages = buildApiMessages(contextMessages)

    // 检查模型是否支持思考
    const modelMetadata = provider.modelMetadata?.[selectedModel]
    const modelSupportsThinking = modelMetadata?.supportsThinking || false

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
      useCorsProxy: provider.useCorsProxy,
      corsProxyUrl: undefined,
      abortSignal: abortControllerRef.current.signal,
      modelSupportsThinking,
      onChunk: content => {
        const newContent = streamingRef.current + content
        streamingRef.current = newContent
        setStreamingContent(newContent)
      },
      onThinkingChunk: thinkingContent => {
        const newThinking = streamingThinkingRef.current + thinkingContent
        streamingThinkingRef.current = newThinking
        setStreamingThinking(newThinking)
      },
      onError: error => {
        if (error.name === 'AbortError') {
          setStreamingContent('')
          setStreamingThinking('')
          streamingRef.current = ''
          streamingThinkingRef.current = ''
          setIsLoading(false)
          abortControllerRef.current = null
          streamingConversationIdRef.current = null
          return
        }
        if (streamingConversationIdRef.current === currentConversationId) {
          const errorContent = i18n.t('errorPrefix', { message: error.message })
          streamingRef.current = errorContent
          setStreamingContent(errorContent)
        } else {
          setStreamingContent('')
          streamingRef.current = ''
        }
        setIsLoading(false)
        abortControllerRef.current = null
        streamingConversationIdRef.current = null
      },
      onComplete: () => {
        if (streamingConversationIdRef.current === currentConversationId && streamingRef.current) {
          addMessage({
            role: 'assistant',
            content: streamingRef.current,
            thinking: streamingThinkingRef.current || undefined,
            model: selectedModel
          })
        }
        setStreamingContent('')
        setStreamingThinking('')
        streamingRef.current = ''
        streamingThinkingRef.current = ''
        setIsLoading(false)
        abortControllerRef.current = null
        streamingConversationIdRef.current = null
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
