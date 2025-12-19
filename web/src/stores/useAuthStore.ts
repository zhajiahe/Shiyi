/**
 * 认证状态管理
 */

import { create } from 'zustand'
import {
  loginApiV1AuthLoginPost,
  registerApiV1AuthRegisterPost,
  getCurrentUserInfoApiV1AuthMeGet,
  refreshTokenApiV1AuthRefreshPost,
} from '@/api/generated/auth/auth'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/api/fetcher'
import type { UserResponse, Token } from '@/api/generated/models'

interface AuthState {
  user: UserResponse | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, nickname: string, password: string) => Promise<void>
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

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const tokens = (await loginApiV1AuthLoginPost({ username, password })) as unknown as Token
      setTokens(tokens.access_token, tokens.refresh_token)
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

  register: async (username: string, email: string, nickname: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      await registerApiV1AuthRegisterPost({ username, email, nickname, password })
      // 注册成功后自动登录
      await get().login(username, password)
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
      const user = (await getCurrentUserInfoApiV1AuthMeGet()) as unknown as UserResponse
      set({ user, isAuthenticated: true })
    } catch {
      // Token 无效，清除认证状态
      clearTokens()
      set({ user: null, isAuthenticated: false })
    }
  },

  refreshToken: async () => {
    try {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        throw new Error('No refresh token')
      }

      const tokens = (await refreshTokenApiV1AuthRefreshPost({
        refresh_token: refreshToken,
      })) as unknown as Token
      setTokens(tokens.access_token, tokens.refresh_token)
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
