/**
 * 自定义 fetch 封装
 * 用于 orval 生成的 API 客户端
 */

// 开发环境使用相对路径，由 Vite 代理转发
// 生产环境通过 VITE_API_URL 环境变量配置
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

// Token 管理
const TOKEN_KEY = 'shiyi-auth-token'
const REFRESH_TOKEN_KEY = 'shiyi-refresh-token'

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

// API 错误类
export class ApiError extends Error {
  code: number
  data?: unknown

  constructor(message: string, code: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.data = data
  }
}

interface ApiResponse<T> {
  success: boolean
  code: number
  msg: string
  data: T
}

/**
 * Orval mutator 签名：customFetch<T>(url: string, options?: RequestInit): Promise<T>
 */
export async function customFetch<T>(url: string, options?: RequestInit): Promise<T> {
  // 构建完整 URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`

  // 设置请求头
  const headers = new Headers(options?.headers)
  if (!headers.has('Content-Type') && options?.body) {
    headers.set('Content-Type', 'application/json')
  }

  // 添加 Authorization header
  const token = getAccessToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // GET/HEAD 请求不能有 body（修复 orval 生成代码的问题）
  const method = options?.method?.toUpperCase()
  const fetchOptions: RequestInit = {
    ...options,
    headers,
  }
  if (method === 'GET' || method === 'HEAD') {
    delete fetchOptions.body
  }

  const response = await fetch(fullUrl, fetchOptions)

  const responseData: ApiResponse<T> = await response.json()

  if (!response.ok || !responseData.success) {
    throw new ApiError(
      responseData.msg || 'Request failed',
      responseData.code || response.status,
      responseData.data,
    )
  }

  return responseData.data
}

export default customFetch
