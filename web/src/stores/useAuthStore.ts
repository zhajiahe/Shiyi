/**
 * 认证状态管理
 */

import { create } from 'zustand'
import { api, clearTokens, getAccessToken, setTokens } from '@/api/client'
import type { AuthTokens, LoginRequest, RegisterRequest, User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
  fetchCurrentUser: () => Promise<void>
  refreshToken: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: !!getAccessToken(),
  isLoading: false,
  error: null,

  login: async (data: LoginRequest) => {
    set({ isLoading: true, error: null })
    try {
      const tokens = await api.post<AuthTokens>('/auth/login', data, { skipAuth: true })
      setTokens(tokens.accessToken, tokens.refreshToken)
      set({ isAuthenticated: true })

      // 获取用户信息
      await get().fetchCurrentUser()
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败'
      set({ error: message, isAuthenticated: false })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  register: async (data: RegisterRequest) => {
    set({ isLoading: true, error: null })
    try {
      await api.post<User>('/auth/register', data, { skipAuth: true })
      // 注册成功后自动登录
      await get().login({ username: data.username, password: data.password })
    } catch (err) {
      const message = err instanceof Error ? err.message : '注册失败'
      set({ error: message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    clearTokens()
    set({ user: null, isAuthenticated: false, error: null })
  },

  fetchCurrentUser: async () => {
    try {
      const user = await api.get<User>('/auth/me')
      set({ user, isAuthenticated: true })
    } catch {
      // Token 无效，清除认证状态
      clearTokens()
      set({ user: null, isAuthenticated: false })
    }
  },

  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('shiyi-refresh-token')
      if (!refreshToken) {
        throw new Error('No refresh token')
      }

      const tokens = await api.post<AuthTokens>(
        '/auth/refresh',
        { refresh_token: refreshToken },
        { skipAuth: true },
      )
      setTokens(tokens.accessToken, tokens.refreshToken)
    } catch {
      // 刷新失败，需要重新登录
      get().logout()
    }
  },

  clearError: () => set({ error: null }),
}))

// 初始化：如果有 token，尝试获取用户信息
const token = getAccessToken()
if (token) {
  useAuthStore.getState().fetchCurrentUser()
}
