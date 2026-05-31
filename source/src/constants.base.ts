import type { Provider, ModelParams, UIConfig, Prompt } from './types'

export const APP_VERSION = '1.1.0(20260531)'

export const generateId = () => Date.now().toString() + Math.random().toString(36).slice(2)

// 供应商
const DEFAULT_PROVIDERS: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-5.4', 'gpt-5-mini', 'gpt-4o', 'gpt-4o-mini', 'o3-pro', 'o3-mini'],
    apiType: 'openai',
    consoleUrl: 'https://platform.openai.com',
    modelMetadata: {
      'gpt-5.4':       { supportsVision: true,  supportsThinking: true,  contextLength: 256000 },
      'gpt-5-mini':    { supportsVision: true,  supportsThinking: true,  contextLength: 256000 },
      'gpt-4o':        { supportsVision: true,  supportsThinking: false, contextLength: 128000 },
      'gpt-4o-mini':   { supportsVision: true,  supportsThinking: true,  contextLength: 128000 },
      'o3-pro':        { supportsVision: true,  supportsThinking: true,  contextLength: 200000 },
      'o3-mini':       { supportsVision: true,  supportsThinking: true,  contextLength: 200000 },
    },
  },
  // https://ai.google.dev/gemini-api/docs/openai?hl=zh-cn
  {
    id: 'gemini',
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['models/gemini-3-pro', 'models/gemini-3-flash', 'models/gemini-2.5-pro', 'models/gemini-2.5-flash'],
    apiType: 'openai',
    consoleUrl: 'https://aistudio.google.com/apikey',
    modelMetadata: {
      'models/gemini-3-pro':     { supportsVision: true, supportsThinking: true, useReasoningEffort: true, unsupportedParams: ['thinking'], contextLength: 1048576 },
      'models/gemini-3-flash':   { supportsVision: true, supportsThinking: true, useReasoningEffort: true, unsupportedParams: ['thinking'], contextLength: 1048576 },
      'models/gemini-2.5-pro':   { supportsVision: true, supportsThinking: true, useReasoningEffort: true, unsupportedParams: ['thinking'], contextLength: 1048576 },
      'models/gemini-2.5-flash':  { supportsVision: true, supportsThinking: true, useReasoningEffort: true, unsupportedParams: ['thinking'], contextLength: 1048576 },
    },
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    apiType: 'openai',
    consoleUrl: 'https://platform.deepseek.com',
    modelMetadata: {
      'deepseek-v4-flash': { supportsVision: false, supportsThinking: true, contextLength: 1048576 },
      'deepseek-v4-pro':   { supportsVision: false, supportsThinking: true, contextLength: 1048576 },
    },
  },
  {
    id: 'qwen',
    name: 'Qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-turbo','qwen-vl-max','qwen-vl-plus'],
    apiType: 'openai',
    consoleUrl: 'https://bailian.console.aliyun.com',
    modelMetadata: {
      'qwen-turbo':   { supportsVision: false, supportsThinking: false, contextLength: 131072 },
      'qwen-vl-max':  { supportsVision: true,  supportsThinking: false, contextLength: 32768 },
      'qwen-vl-plus': { supportsVision: true,  supportsThinking: false, contextLength: 8192 },
    },
  },
  {
    id: 'moonshot',
    name: 'kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'kimi-k2.5', 'kimi-k2.6'],
    apiType: 'openai',
    consoleUrl: 'https://platform.moonshot.cn',
    modelMetadata: {
      'moonshot-v1-8k': { supportsVision: false, supportsThinking: false, contextLength: 8192 },
      'kimi-k2.5':      { supportsVision: true,  supportsThinking: false, contextLength: 131072 },
      'kimi-k2.6':      { supportsVision: true,  supportsThinking: false, contextLength: 131072 },
    },
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: ['Qwen/Qwen3-VL-8B-Instruct', 'deepseek-ai/DeepSeek-OCR', 'PaddlePaddle/PaddleOCR-VL-1.5'],
    apiType: 'openai',
    consoleUrl: 'https://cloud.siliconflow.cn',
    modelMetadata: {
      'Qwen/Qwen3-VL-8B-Instruct':     { supportsVision: true, supportsThinking: false, contextLength: 64000 },
      'deepseek-ai/DeepSeek-OCR':      { supportsVision: true, supportsThinking: false, contextLength: 64000 },
      'PaddlePaddle/PaddleOCR-VL-1.5': { supportsVision: true, supportsThinking: false, contextLength: 64000 },
    },
  },
  {
    id: 'modelscope',
    name: '魔搭',
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    models: ['Qwen/Qwen3-VL-8B-Instruct', 'deepseek-ai/DeepSeek-V4-flash'],
    apiType: 'openai',
    consoleUrl: 'https://modelscope.cn/my/access/token',
  },
  {
    id: 'zhipu',
    name: '智谱',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4.7'],
    apiType: 'openai',
    consoleUrl: 'https://open.bigmodel.cn',
    modelMetadata: {
      'glm-4.7': { supportsVision: false, supportsThinking: true, contextLength: 128000 },
    },
  },
  {
    id: 'xai',
    name: 'xAI',
    baseUrl: 'https://api.x.ai/v1',
    models: ['grok-3', 'grok-3-fast', 'grok-3-mini', 'grok-2'],
    apiType: 'openai',
    consoleUrl: 'https://console.x.ai',
    modelMetadata: {
      'grok-3':      { supportsVision: true, supportsThinking: true,  contextLength: 131072 },
      'grok-3-fast': { supportsVision: true, supportsThinking: true,  contextLength: 131072 },
      'grok-3-mini': { supportsVision: true, supportsThinking: true,  contextLength: 131072 },
      'grok-2':      { supportsVision: true, supportsThinking: false, contextLength: 131072 },
    },
  },
  {
    id: 'mimo',
    name: 'MiMo',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    models: ['mimo-v2.5-pro', 'mimo-v2.5', 'mimo-v2-flash'],
    apiType: 'openai',
    consoleUrl: 'https://platform.xiaomimimo.com/console/api-keys',
    modelMetadata: {
      'mimo-v2.5': { supportsVision: true, supportsThinking: false, contextLength: 131072 },
    },
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['openai/gpt-4o', 'openai/gpt-oss-20b:free'],
    apiType: 'openai',
    consoleUrl: 'https://openrouter.ai',
    modelMetadata: {
      'openai/gpt-4o':           { supportsVision: true,  supportsThinking: false, contextLength: 128000 },
      'openai/gpt-oss-20b:free': { supportsVision: false, supportsThinking: true,  contextLength: 131072 },
    },
  },
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'qwen/qwen3-32b'],
    apiType: 'openai',
    consoleUrl: 'https://console.groq.com',
    modelMetadata: {
      'llama-3.3-70b-versatile': { supportsVision: false, supportsThinking: false, contextLength: 131072 },
      'openai/gpt-oss-20b':      { supportsVision: false, supportsThinking: false, contextLength: 131072 },
      'qwen/qwen3-32b':          { supportsVision: false, supportsThinking: false, contextLength: 131072 },
    },
  },
  {
    id: 'ollama',
    name: 'Ollama',
    baseUrl: 'http://localhost:11434/v1',
    models: ['deepseek-r1'],
    apiType: 'ollama',
    allowEmptyApiKey: true,
    apiUrlHint: 'hintOllamaUrl',
    disabled: true,
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    models: ['qwen3.5/qwen3.5-0.8b'],
    apiType: 'openai',
    allowEmptyApiKey: true,
    disabled: true,
  }
]

// 提示词
const DEFAULT_PROMPTS: Prompt[] = [
  { id: 'zh', name: '中文回复', content: 'respond in chinese.' },
  { id: 'translator', name: '翻译助手', content: '你是一个好用的翻译助手。请将我的中文翻译成英文，将所有非中文的翻译成中文。我发给你所有的话都是需要翻译的内容，你只需要回答翻译结果。翻译结果请符合中文的语言习惯。' },
  { id: 'concise', name: '简洁回答', content: '请用简洁明了的语言回答，避免冗长，直击要点。' },
  { id: 'detailed', name: '详细解释', content: '请详细解释概念，包括背景、原理、示例和注意事项，确保深入理解。' },
  { id: 'examples', name: '举例说明', content: '请用具体的例子来说明，例子要贴近实际应用场景，便于理解。' },
  { id: 'diagnosis', name: '问题诊断', content: '请分析问题产生的可能原因，提供诊断步骤和解决方案，包括预防措施。' },
]

export { DEFAULT_PROMPTS }


export const MODEL_CAPABILITIES: Record<string, {
  supportsVision: boolean
  supportsThinking: boolean
  contextLength: number
  unsupportedParams?: string[]
  useReasoningEffort?: boolean
}> = Object.fromEntries(
  DEFAULT_PROVIDERS.flatMap(p =>
    Object.entries(p.modelMetadata ?? {})
      .filter(([, m]) => m.contextLength != null)
      .map(([id, m]) => [id, {
        supportsVision: m.supportsVision,
        supportsThinking: m.supportsThinking,
        contextLength: m.contextLength!,
        ...(m.unsupportedParams ? { unsupportedParams: m.unsupportedParams } : {}),
        ...(m.useReasoningEffort ? { useReasoningEffort: m.useReasoningEffort } : {}),
      }])
  )
)

// 预设供应商 ID 列表
export const PRESET_PROVIDER_IDS = DEFAULT_PROVIDERS.map(p => p.id)

export const DEFAULT_PROVIDERS_WITH_FLAGS: Provider[] = DEFAULT_PROVIDERS.map(p => ({
  ...p,
  deletable: !PRESET_PROVIDER_IDS.includes(p.id)
}))

export const DEFAULT_MODEL_PARAMS: ModelParams = {
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 4096,
  presence_penalty: 0,
  frequency_penalty: 0,
}


// 话题名生成提示词
export function getTopicNamePrompt(isZh: boolean, style: string, convPrompt?: string): string {
  if (style === 'prompt' && convPrompt) {
    return isZh
      ? `系统提示词：\n${convPrompt}\n\n请完成两步：\n1. 用2-4个字概括系统提示词的核心角色（如"翻译助手""代码审查""文案写作"）\n2. 根据对话内容生成简短的主题词（不超过6个字）\n\n输出格式：角色-主题\n只输出结果，不要其他内容。使用中文。`
      : `System prompt:\n${convPrompt}\n\nDo two steps:\n1. Summarize the system prompt's core role in 2-4 words (e.g. "Translator", "Code Review", "Copywriter")\n2. Generate a short topic from the conversation (max 6 words)\n\nOutput format: Role-Topic\nOutput ONLY the result. Use English.`
  }
  if (style === 'emoji') {
    return isZh
      ? '根据对话内容生成简短的对话标题（不超过10个字），在标题开头加入一个合适的 emoji。只输出标题，不要输出其他内容。使用中文。'
      : 'Generate a short conversation title (max 10 characters) based on the conversation content, include a suitable emoji at the beginning. Output ONLY the title, nothing else. Use English.'
  }
  return isZh
    ? '根据对话内容生成简短的对话标题（不超过10个字）。使用中文。标题语言与用户的首要语言一致，不要使用标点符号和其他特殊符号。'
    : 'Generate a short conversation title (max 10 characters) based on the conversation content. Output ONLY the title, nothing else. Use English.'
}

export const DEFAULT_UI_CONFIG: UIConfig = {
  fontSize: 'base',
  chatWidth: 'compact',
  autoCollapseCode: false,
  autoHideThinking: true,
  topicNameCount: 6,
  topicNameStyle: 'normal',
  prompts: DEFAULT_PROMPTS,
  theme: 'system',
  language: 'zh',
}
