import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

// Track whether we're already trying a refresh to avoid infinite loops
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

function processQueue(token: string) {
  refreshQueue.forEach(cb => cb(token))
  refreshQueue = []
}

function createApiClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
  })

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    try {
      const raw = localStorage.getItem('regtech-auth')
      if (raw) {
        const state = JSON.parse(raw)
        if (state?.state?.accessToken) {
          config.headers['Authorization'] = `Bearer ${state.state.accessToken}`
        }
        // Send tenant_id (UUID) as X-Tenant-ID header
        if (state?.state?.user?.tenant_id) {
          config.headers['X-Tenant-ID'] = state.state.user.tenant_id
        }
      }
    } catch { /* ignore */ }
    return config
  })

  instance.interceptors.response.use(
    (r) => r,
    async (error) => {
      const originalRequest = error.config

      // Only attempt refresh for 401s that haven't been retried yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        // Get current refresh token
        let refreshToken: string | null = null
        try {
          const raw = localStorage.getItem('regtech-auth')
          if (raw) {
            const state = JSON.parse(raw)
            refreshToken = state?.state?.refreshToken ?? null
          }
        } catch { /* ignore */ }

        if (refreshToken) {
          if (isRefreshing) {
            // Wait for the in-flight refresh to complete
            return new Promise(resolve => {
              refreshQueue.push((token: string) => {
                originalRequest.headers['Authorization'] = `Bearer ${token}`
                resolve(instance(originalRequest))
              })
            })
          }

          originalRequest._retry = true
          isRefreshing = true

          try {
            const res = await axios.post<{ access_token: string; refresh_token: string; token_type: string }>(
              `${BASE_URL}/api/v1/auth/refresh`,
              { refresh_token: refreshToken },
            )
            const { access_token, refresh_token: newRefresh } = res.data

            // Update persisted store
            try {
              const raw = localStorage.getItem('regtech-auth')
              if (raw) {
                const stored = JSON.parse(raw)
                stored.state.accessToken = access_token
                stored.state.refreshToken = newRefresh
                localStorage.setItem('regtech-auth', JSON.stringify(stored))
              }
            } catch { /* ignore */ }

            processQueue(access_token)
            originalRequest.headers['Authorization'] = `Bearer ${access_token}`
            return instance(originalRequest)
          } catch {
            // Refresh failed — clear auth and redirect
            localStorage.removeItem('regtech-auth')
            window.location.href = '/login'
            return Promise.reject(error)
          } finally {
            isRefreshing = false
          }
        }

        // No refresh token available — log out
        localStorage.removeItem('regtech-auth')
        window.location.href = '/login'
      }

      return Promise.reject(error)
    },
  )

  return instance
}

export const apiClient = createApiClient()

// ── Typed helpers ──────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface HealthResponse {
  status: 'ok' | 'degraded'
  version: string
  db: 'ok' | 'degraded'
  redis: 'ok' | 'degraded'
}

export async function loginApi(
  email: string,
  password: string,
): Promise<TokenResponse> {
  const res = await axios.post<TokenResponse>(
    `${BASE_URL}/api/v1/auth/login`,
    { email, password },
  )
  return res.data
}

export async function refreshApi(refreshToken: string): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>('/api/v1/auth/refresh', {
    refresh_token: refreshToken,
  })
  return res.data
}

export async function logoutApi(): Promise<void> {
  await apiClient.post('/api/v1/auth/logout')
}

export async function healthApi(): Promise<HealthResponse> {
  const res = await axios.get<HealthResponse>(`${BASE_URL}/api/v1/health`)
  return res.data
}
