import type { ModelParams, ModelMetadata } from './types'
import { buildModelParamsBody } from './utils/modelParamsFilter'
import i18n from './i18n'

export interface StreamOptions {
  baseUrl: string
  apiKey: string
  model: string
  messages: { role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }[]
  systemPrompt?: string
  modelParams?: Partial<ModelParams>
  modelMetadata?: ModelMetadata
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
    return `${corsProxyUrl}/${baseUrl}`
  }
  return baseUrl
}

function getHttpErrorSummary(status: number): string {
  if (status === 400) return i18n.t('error400')
  if (status === 401) return i18n.t('error401')
  if (status === 403) return i18n.t('error403')
  if (status === 404) return i18n.t('error404')
  if (status === 429) return i18n.t('error429')
  if (status >= 500) return i18n.t('errorServer')
  return i18n.t('errorHttpFailed', { code: status })
}

function formatError(summary: string, ...details: string[]): string {
  return summary + '\n\n' + details.filter(Boolean).join('\n')
}

export async function streamChat(options: StreamOptions) {
  const { baseUrl, apiKey, model, messages, systemPrompt, modelParams, modelMetadata, useCorsProxy, corsProxyUrl, abortSignal, onChunk, onError, onComplete } = options

  const allMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages

  try {
    const body: Record<string, any> = {
      model,
      messages: allMessages,
      stream: true,
    }

    // 添加模型参数（过滤不支持的参数）
    if (modelParams) {
      const paramsBody = buildModelParamsBody(modelParams as ModelParams, modelMetadata, model)
      Object.assign(body, paramsBody)

      // 思考模式
      const thinkingUnsupported = modelMetadata?.unsupportedParams?.includes('thinking')
      if (modelMetadata?.useReasoningEffort || thinkingUnsupported) {
        // Gemini 等模型：使用 reasoning_effort 参数
        if (modelParams.thinkingEnabled && modelParams.thinkingLevel) {
          body.reasoning_effort = modelParams.thinkingLevel
        } else {
          body.reasoning_effort = 'none'
        }
      } else if (options.modelSupportsThinking) {
        if (modelParams.thinkingEnabled) {
          body.thinking = {
            type: 'enabled'
          }
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
      let detail = ''
      try {
        const errorBody = await response.text()
        const errorJson = JSON.parse(errorBody)
        detail = errorJson.error?.message || errorJson.message || errorBody.slice(0, 500)
      } catch {
        // 无法解析错误体
      }

      const lines: string[] = [`${response.status} ${response.statusText}`]
      if (detail) lines.push(detail)
      lines.push(`${i18n.t('errorRequestUrl')}: ${apiBaseUrl}/chat/completions`)
      throw new Error(formatError(getHttpErrorSummary(response.status), ...lines))
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('Failed to get response stream')

    const decoder = new TextDecoder()
    let currentEventType = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        const trimmed = line.trim()

        if (trimmed.startsWith('event: ')) {
          currentEventType = trimmed.slice(7)
          continue
        }

        if (!trimmed || trimmed === 'data: [DONE]') continue

        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6))

            if (currentEventType === 'error' || data.error) {
              const errorMsg = data.error?.message || data.message || JSON.stringify(data.error || data)
              throw new Error(errorMsg)
            }

            const delta = data.choices?.[0]?.delta

            const reasoningContent = delta?.reasoning_content || delta?.reasoning
            if (reasoningContent) {
              options.onThinkingChunk?.(reasoningContent)
            }

            const content = delta?.content
            if (content) {
              onChunk(content)
            }
          } catch (e) {
            if (!(e instanceof SyntaxError)) throw e
          }
          currentEventType = ''
        }
      }
    }

    onComplete()
  } catch (error) {
    const err = error as Error
    if (err.name === 'AbortError') {
      onError(err)
      return
    }
    if (err.name === 'TypeError' && /fetch/i.test(err.message)) {
      const url = buildApiUrl(baseUrl, useCorsProxy, corsProxyUrl)
      const t = i18n.t.bind(i18n)
      const summary = !navigator.onLine
        ? t('errorOffline')
        : /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(url)
          ? t('errorLocalHint')
          : t('errorNetworkHint')
      onError(new Error(formatError(summary,
        `${err.name}: ${err.message}`,
        `${t('errorRequestUrl')}: ${url}/chat/completions`,
      )))
    } else {
      onError(err)
    }
  }
}

export interface ChatCompletionOptions {
  baseUrl: string
  apiKey: string
  model: string
  messages: { role: string; content: string }[]
  systemPrompt?: string
  useCorsProxy?: boolean
  corsProxyUrl?: string
  abortSignal?: AbortSignal
}

export async function chatCompletion(options: ChatCompletionOptions): Promise<string> {
  const { baseUrl, apiKey, model, messages, systemPrompt, useCorsProxy, corsProxyUrl, abortSignal } = options

  const allMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages

  const body: Record<string, unknown> = {
    model,
    messages: allMessages,
    stream: false,
  }

  const apiBaseUrl = buildApiUrl(baseUrl, useCorsProxy, corsProxyUrl)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  const response = await fetch(`${apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: abortSignal,
  })

  if (!response.ok) {
    let detail = ''
    try {
      const errorBody = await response.text()
      const errorJson = JSON.parse(errorBody)
      detail = errorJson.error?.message || errorJson.message || errorBody.slice(0, 500)
    } catch { /* ignore */ }
    const lines: string[] = [`${response.status} ${response.statusText}`]
    if (detail) lines.push(detail)
    throw new Error(formatError(getHttpErrorSummary(response.status), ...lines))
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}
