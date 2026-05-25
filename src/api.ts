import type { ModelParams } from './types'

export interface StreamOptions {
  baseUrl: string
  apiKey: string
  model: string
  messages: { role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }[]
  systemPrompt?: string
  modelParams?: Partial<ModelParams>
  useCorsProxy?: boolean
  corsProxyUrl?: string
  abortSignal?: AbortSignal
  onChunk: (content: string) => void
  onThinkingChunk?: (content: string) => void
  onError: (error: Error) => void
  onComplete: () => void
  modelSupportsThinking?: boolean
}

// 构建 API URL，支持 CORS 代理
function buildApiUrl(baseUrl: string, useCorsProxy?: boolean, corsProxyUrl?: string): string {
  if (useCorsProxy && corsProxyUrl) {
    // 代理URL后直接跟完整的基础URL（包含协议）
    return `${corsProxyUrl}/${baseUrl}`
  }
  return baseUrl
}

export async function streamChat(options: StreamOptions) {
  const { baseUrl, apiKey, model, messages, systemPrompt, modelParams, useCorsProxy, corsProxyUrl, abortSignal, onChunk, onError, onComplete } = options

  const allMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages

  try {
    const body: Record<string, any> = {
      model,
      messages: allMessages,
      stream: true,
    }

    // 添加模型参数
    if (modelParams) {
      if (modelParams.temperature !== undefined) body.temperature = modelParams.temperature
      if (modelParams.top_p !== undefined) body.top_p = modelParams.top_p
      if (modelParams.max_tokens !== undefined) body.max_tokens = modelParams.max_tokens
      if (modelParams.presence_penalty !== undefined) body.presence_penalty = modelParams.presence_penalty
      if (modelParams.frequency_penalty !== undefined) body.frequency_penalty = modelParams.frequency_penalty
      // 思考模式
      if (options.modelSupportsThinking) {
        if (modelParams.thinkingEnabled) {
          body.thinking = {
            type: 'enabled'
          }
          // 中高等级添加 reasoning_effort 参数
          if (modelParams.thinkingLevel === 'medium' || modelParams.thinkingLevel === 'high') {
            body.reasoning_effort = modelParams.thinkingLevel
          }
        } else {
          body.thinking = {
            type: 'disabled'
          }
        }
      } else if (modelParams.thinkingEnabled) {
        body.thinking = {
          type: 'enabled'
        }
        // 中高等级添加 reasoning_effort 参数
        if (modelParams.thinkingLevel === 'medium' || modelParams.thinkingLevel === 'high') {
          body.reasoning_effort = modelParams.thinkingLevel
        }
      }
    }

    const apiBaseUrl = buildApiUrl(baseUrl, useCorsProxy, corsProxyUrl)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }
    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: abortSignal,
    })

    if (!response.ok) {
      throw new Error(`API 错误: ${response.status} ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('Failed to get response stream')

    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        const dataLine = line.trim()
        if (!dataLine || dataLine === 'data: [DONE]') continue

        if (dataLine.startsWith('data: ')) {
          try {
            const data = JSON.parse(dataLine.slice(6))
            const delta = data.choices?.[0]?.delta

            // 处理思考内容 (DeepSeek 格式)
            const reasoningContent = delta?.reasoning_content || delta?.reasoning
            if (reasoningContent) {
              options.onThinkingChunk?.(reasoningContent)
            }

            // 处理普通内容
            const content = delta?.content
            if (content) {
              onChunk(content)
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }

    onComplete()
  } catch (error) {
    onError(error as Error)
  }
}

