import type { ApiError } from '@/types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

// ── Token refresh ─────────────────────────────────────────────────────────────

let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) return false

      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) return false

      const data = await res.json()
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken)
        // Keep the Zustand store in sync
        const { useAuthStore } = await import('@/stores/authStore')
        useAuthStore.setState({ accessToken: data.accessToken, user: data.user ?? useAuthStore.getState().user })
        return true
      }
      return false
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

// ── API client ────────────────────────────────────────────────────────────────

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      let errorData: ApiError
      try {
        errorData = await res.json()
      } catch {
        errorData = { error: `HTTP ${res.status}: ${res.statusText}` }
      }
      throw new ApiClientError(errorData.error, res.status, errorData.code)
    }
    if (res.status === 204) return undefined as T
    return res.json()
  }

  /** Fetch wrapper that retries once after a token refresh on 401 */
  private async fetchWithRefresh(input: RequestInfo, init: RequestInit): Promise<Response> {
    const res = await fetch(input, init)

    if (res.status === 401) {
      const refreshed = await tryRefreshToken()
      if (refreshed) {
        // Retry with the new token
        const retryInit: RequestInit = {
          ...init,
          headers: {
            ...init.headers,
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
        return fetch(input, retryInit)
      }
      // Refresh failed → force logout
      const { useAuthStore } = await import('@/stores/authStore')
      useAuthStore.getState().logout()
    }

    return res
  }

  async get<T>(path: string): Promise<T> {
    const res = await this.fetchWithRefresh(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
    })
    return this.handleResponse<T>(res)
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await this.fetchWithRefresh(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(res)
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await this.fetchWithRefresh(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(res)
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const res = await this.fetchWithRefresh(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(res)
  }

  async delete<T>(path: string): Promise<T> {
    const res = await this.fetchWithRefresh(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
    })
    return this.handleResponse<T>(res)
  }

  async uploadFile(path: string, file: File, additionalFields?: Record<string, string>): Promise<unknown> {
    const formData = new FormData()
    formData.append('file', file)
    if (additionalFields) {
      Object.entries(additionalFields).forEach(([k, v]) => formData.append(k, v))
    }
    const res = await this.fetchWithRefresh(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    })
    return this.handleResponse(res)
  }
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

export const api = new ApiClient()
