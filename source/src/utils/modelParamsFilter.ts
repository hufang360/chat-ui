import type { ModelParams, ModelMetadata } from '../types'

/**
 * 基于模型名称的参数限制规则
 * 匹配模型名称前缀，自动过滤不支持的参数
 */
const MODEL_PARAM_RULES: Array<{
  pattern: RegExp
  unsupportedParams: string[]
}> = [
  // Grok 系列不支持 presence_penalty 和 frequency_penalty
  { pattern: /^grok-/i, unsupportedParams: ['presence_penalty', 'frequency_penalty'] },
  // Gemini 不支持 frequency_penalty
  { pattern: /gemini-/i, unsupportedParams: ['frequency_penalty'] },
]

/**
 * 获取模型不支持的参数列表
 * 合并 metadata 中的配置和基于名称的规则
 */
function getUnsupportedParams(modelId: string, metadata?: ModelMetadata): Set<string> {
  const unsupported = new Set<string>()

  // 从 metadata 中获取
  if (metadata?.unsupportedParams) {
    metadata.unsupportedParams.forEach(p => unsupported.add(p))
  }

  // 从名称规则中获取
  for (const rule of MODEL_PARAM_RULES) {
    if (rule.pattern.test(modelId)) {
      rule.unsupportedParams.forEach(p => unsupported.add(p))
    }
  }

  return unsupported
}

/**
 * 过滤模型不支持的参数
 * 某些模型（如 grok-3-fast）不支持 presence_penalty、frequency_penalty 等参数
 * 需要在请求前过滤掉这些参数，避免 API 报错
 */
export function filterModelParams(
  params: ModelParams,
  metadata?: ModelMetadata,
  modelId?: string
): Partial<ModelParams> {
  const unsupported = getUnsupportedParams(modelId || '', metadata)

  if (unsupported.size === 0) {
    return params
  }

  const filtered: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(params)) {
    if (!unsupported.has(key)) {
      filtered[key] = value
    }
  }

  return filtered as Partial<ModelParams>
}

/**
 * 构建 API 请求体中的模型参数
 * 过滤不支持的参数，并根据参数值决定是否添加到请求体
 */
export function buildModelParamsBody(
  params: ModelParams,
  metadata?: ModelMetadata,
  modelId?: string
): Record<string, unknown> {
  const filtered = filterModelParams(params, metadata, modelId)
  const body: Record<string, unknown> = {}

  // temperature: 始终添加（允许 0）
  if (filtered.temperature !== undefined) {
    body.temperature = filtered.temperature
  }

  // top_p: 始终添加（允许 0）
  if (filtered.top_p !== undefined) {
    body.top_p = filtered.top_p
  }

  // max_tokens: 0 表示自动，不发送给 API
  if (filtered.max_tokens) {
    body.max_tokens = filtered.max_tokens
  }

  // presence_penalty: 仅在有值且被支持时添加
  if (filtered.presence_penalty !== undefined) {
    body.presence_penalty = filtered.presence_penalty
  }

  // frequency_penalty: 仅在有值且被支持时添加
  if (filtered.frequency_penalty !== undefined) {
    body.frequency_penalty = filtered.frequency_penalty
  }

  return body
}
