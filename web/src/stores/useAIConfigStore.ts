/**
 * AI 配置 Store
 *
 * 管理 OpenAI 兼容 API 的配置，存储在 localStorage
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AIConfig {
  enabled: boolean
  apiKey: string
  baseUrl: string
  model: string
}

interface AIConfigState {
  config: AIConfig
  setConfig: (config: Partial<AIConfig>) => void
  resetConfig: () => void
  isConfigured: () => boolean
}

const DEFAULT_CONFIG: AIConfig = {
  enabled: false,
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
}

export const useAIConfigStore = create<AIConfigState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,

      setConfig: (partial) => {
        set((state) => ({
          config: { ...state.config, ...partial },
        }))
      },

      resetConfig: () => {
        set({ config: DEFAULT_CONFIG })
      },

      isConfigured: () => {
        const { config } = get()
        return config.enabled && !!config.apiKey && !!config.baseUrl && !!config.model
      },
    }),
    {
      name: 'shiyi-ai-config',
    },
  ),
)

// 常用模型列表
export const POPULAR_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI' },
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'OpenAI' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { value: 'deepseek-chat', label: 'DeepSeek Chat', provider: 'DeepSeek' },
  { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner', provider: 'DeepSeek' },
  { value: 'qwen-turbo', label: '通义千问 Turbo', provider: '阿里云' },
  { value: 'qwen-plus', label: '通义千问 Plus', provider: '阿里云' },
  { value: 'glm-4-flash', label: 'GLM-4 Flash', provider: '智谱' },
] as const
