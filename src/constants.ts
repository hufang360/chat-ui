import type { Provider, ModelParams, UIConfig, Prompt } from './types'

// model, vision, thinking, contextLength
export const MODEL_CAPABILITIES: Record<string, {
  supportsVision: boolean
  supportsThinking: boolean
  contextLength: number
}> = {
  // OpenAI
  'gpt-4o':              { supportsVision: true,  supportsThinking: false, contextLength: 128000 },
  'gpt-4o-mini':         { supportsVision: true,  supportsThinking: false, contextLength: 128000 },
  'gpt-4-turbo':         { supportsVision: true,  supportsThinking: false, contextLength: 128000 },
  'gpt-3.5-turbo':       { supportsVision: false, supportsThinking: false, contextLength: 16385 },

  // DeepSeek
  'deepseek-v4-flash':   { supportsVision: false, supportsThinking: true,  contextLength: 64000 },
  'deepseek-v4-pro':     { supportsVision: false, supportsThinking: true,  contextLength: 64000 },

  // 通义千问
  'qwen-turbo':          { supportsVision: false, supportsThinking: false, contextLength: 131072 },
  'qwen-vl-max':         { supportsVision: true,  supportsThinking: false, contextLength: 32768 },
  'qwen-vl-plus':        { supportsVision: true,  supportsThinking: false, contextLength: 8192 },

  // Moonshot
  'moonshot-v1-8k':      { supportsVision: false, supportsThinking: false, contextLength: 8192 },
  'kimi-k2.6':           { supportsVision: true,  supportsThinking: false, contextLength: 131072 },

  // 百川
  'Baichuan2-Turbo':     { supportsVision: false, supportsThinking: false, contextLength: 8192 },
  'Baichuan2-53B':       { supportsVision: false, supportsThinking: false, contextLength: 8192 },

  // 硅基流动
  'Qwen/Qwen3-VL-8B-Instruct':        { supportsVision: true,  supportsThinking: false, contextLength: 64000 },
  'deepseek-ai/DeepSeek-OCR':         { supportsVision: true,  supportsThinking: false, contextLength: 64000 },
  'PaddlePaddle/PaddleOCR-VL-1.5':    { supportsVision: true,  supportsThinking: false, contextLength: 64000 },

  // 智谱
  'glm-4.7':        { supportsVision: false,  supportsThinking: true, contextLength: 128000 },

  // mimo
  'mimo-v2.5':          { supportsVision: true,  supportsThinking: false, contextLength: 131072 },

  // OpenRouter
  'openai/gpt-4o':           { supportsVision: true,  supportsThinking: false, contextLength: 128000 },
  'openai/gpt-oss-20b:free': { supportsVision: false,  supportsThinking: true,  contextLength: 131072 },

  // Groq
  'llama-3.3-70b-versatile': { supportsVision: false, supportsThinking: false, contextLength: 131072 },
  'openai/gpt-oss-20b':      { supportsVision: false, supportsThinking: false, contextLength: 131072 },
  'qwen/qwen3-32b':           { supportsVision: false, supportsThinking: false, contextLength: 131072 },
}

export const generateId = () => Date.now().toString() + Math.random().toString(36).slice(2)

const DEFAULT_PROVIDERS: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    apiType: 'openai',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    apiType: 'openai',
  },
  {
    id: 'qwen',
    name: '阿里云百炼',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-turbo'],
    apiType: 'openai',
  },
  {
    id: 'moonshot',
    name: 'Moonshot',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'kimi-k2.6'],
    apiType: 'openai',
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: ['Qwen/Qwen3-VL-8B-Instruct', 'deepseek-ai/DeepSeek-OCR', 'PaddlePaddle/PaddleOCR-VL-1.5'],
    apiType: 'openai',
  },
  {
    id: 'modelscope',
    name: '魔搭',
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    models: ['Qwen/Qwen3-VL-8B-Instruct', 'deepseek-ai/DeepSeek-V4-flash'],
    apiType: 'openai',
  },
  {
    id: 'zhipu',
    name: '智谱',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4.7'],
    apiType: 'openai',
  },
  {
    id: 'mimo',
    name: 'Mimo',
    baseUrl: 'https://api.mimo.ml/v1',
    models: ['mimo-v2.5-pro', 'mimo-v2.5', 'mimo-v2-flash'],
    apiType: 'openai',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['openai/gpt-4o', 'openai/gpt-oss-20b:free'],
    apiType: 'openai',
  },
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    apiType: 'openai',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    baseUrl: 'http://localhost:11434/v1',
    models: ['deepseek-r1'],
    apiType: 'ollama',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    models: ['qwen3.5/qwen3.5-0.8b'],
    apiType: 'openai',
  }
]

// 预设供应商 ID 列表
const PRESET_PROVIDER_IDS = [
  'openai', 'deepseek', 'qwen', 'moonshot', 'baichuan',
  'siliconflow', 'modelscope', 'zhipu', 'mimo', 'openrouter', 'groq', 'ollama', 'lmstudio'
]

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

const DEFAULT_PROMPTS: Prompt[] = [
  { id: generateId(), name: '中文回复', content: 'respond in chinese.' },
  { id: generateId(), name: '翻译助手', content: '你是一个好用的翻译助手。请将我的中文翻译成英文，将所有非中文的翻译成中文。我发给你所有的话都是需要翻译的内容，你只需要回答翻译结果。翻译结果请符合中文的语言习惯。' },
  { id: generateId(), name: '简洁回答', content: '请用简洁明了的语言回答，避免冗长，直击要点。' },
  { id: generateId(), name: '详细解释', content: '请详细解释概念，包括背景、原理、示例和注意事项，确保深入理解。' },
  { id: generateId(), name: '举例说明', content: '请用具体的例子来说明，例子要贴近实际应用场景，便于理解。' },
  { id: generateId(), name: '问题诊断', content: '请分析问题产生的可能原因，提供诊断步骤和解决方案，包括预防措施。' },
]

export const DEFAULT_UI_CONFIG: UIConfig = {
  fontSize: 'base',
  chatWidth: 'compact',
  autoCollapseCode: false,
  autoHideThinking: true,
  prompts: DEFAULT_PROMPTS,
  theme: 'system',
  language: 'zh',
}
