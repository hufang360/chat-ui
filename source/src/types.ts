export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: string[]
  files?: FileAttachment[]
  timestamp: number
  thinking?: string
  model?: string
  isError?: boolean
}

export interface FileAttachment {
  name: string
  data: string
  type: 'image' | 'document'
  mimeType?: string
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  systemPrompt?: string
  createdAt: number
  updatedAt: number
  folderId?: string
}

export interface Folder {
  id: string
  name: string
  createdAt: number
}

export interface ModelMetadata {
  supportsVision: boolean
  supportsThinking: boolean
  contextLength?: number
  unsupportedParams?: string[]
  useReasoningEffort?: boolean
}

export interface Provider {
  id: string
  name: string
  baseUrl: string
  models: string[]
  modelMetadata?: Record<string, ModelMetadata>
  type?: 'chat'
  apiType?: 'openai' | 'ollama'
  deletable?: boolean
  disabled?: boolean
  useCorsProxy?: boolean
  allowEmptyApiKey?: boolean
  consoleUrl?: string
  apiKeyHint?: string
  apiUrlHint?: string
}

export interface ModelParams {
  temperature: number
  top_p: number
  max_tokens: number
  presence_penalty: number
  frequency_penalty: number
  thinkingEnabled?: boolean
  thinkingLevel?: 'low' | 'medium' | 'high'
}

export interface Prompt {
  id: string
  name: string
  content: string
}

export interface UIConfig {
  fontSize: 'xs' | 'base' | 'xl'
  chatWidth: 'compact' | 'full'
  autoCollapseCode: boolean
  autoHideThinking: boolean
  topicNameCount: 3 | 6 | 9
  topicNameStyle: 'normal' | 'emoji' | 'prompt'
  autoGenerateTopicName?: boolean
  injectMetadata?: boolean
  corsProxyUrl?: string
  prompts?: Prompt[]
  theme?: 'light' | 'dark' | 'system'
  language?: 'zh' | 'en'
}
