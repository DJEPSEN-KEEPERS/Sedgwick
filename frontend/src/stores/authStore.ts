import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, UserRole } from '@/types'
import { api } from '@/lib/api'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (email: string, password: string) => Promise<{ requiresTwoFactor: boolean; tempToken?: string }>
  verifyTwoFactor: (tempToken: string, code: string) => Promise<void>
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<void>
  fetchMe: () => Promise<void>
  clearError: () => void
  setTokens: (accessToken: string, refreshToken: string, user: AuthUser) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setTokens: (accessToken, refreshToken, user) => {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        set({ accessToken, refreshToken, user, isAuthenticated: true, error: null })
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await api.post<{
            requiresTwoFactor: boolean
            tempToken?: string
            accessToken?: string
            refreshToken?: string
            user?: AuthUser
            message?: string
          }>('/auth/login', { email, password })

          // Only call setTokens (isAuthenticated=true) when 2FA is NOT required
          // AND the user either has 2FA disabled or already has a secret configured.
          // When twoFactorEnabled=true but no secret yet, the caller (LoginForm) must
          // first guide the user through TOTP setup before authenticating.
          const needsTotpSetup = !res.requiresTwoFactor && res.user?.twoFactorEnabled
          if (!res.requiresTwoFactor && !needsTotpSetup && res.accessToken && res.refreshToken && res.user) {
            get().setTokens(res.accessToken, res.refreshToken, res.user)
          }
          set({ isLoading: false })
          return {
            requiresTwoFactor: res.requiresTwoFactor,
            tempToken: res.tempToken,
            // Return raw tokens so LoginForm can call setTokens after TOTP setup
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
            user: res.user,
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Login fejlede'
          set({ isLoading: false, error: message })
          throw err
        }
      },

      verifyTwoFactor: async (tempToken, code) => {
        set({ isLoading: true, error: null })
        try {
          const res = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>(
            '/auth/verify-2fa',
            { tempToken, code },
          )
          get().setTokens(res.accessToken, res.refreshToken, res.user)
          set({ isLoading: false })
        } catch (err) {
          const message = err instanceof Error ? err.message : '2FA-kode ugyldig'
          set({ isLoading: false, error: message })
          throw err
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
          // ignore — always clear local state
        }
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, error: null })
      },

      refreshAccessToken: async () => {
        const refreshToken = get().refreshToken
        if (!refreshToken) throw new Error('No refresh token')
        try {
          const res = await api.post<{ accessToken: string; user: AuthUser }>('/auth/refresh', {
            refreshToken,
          })
          localStorage.setItem('accessToken', res.accessToken)
          set({ accessToken: res.accessToken, user: res.user, isAuthenticated: true })
        } catch {
          get().logout()
        }
      },

      fetchMe: async () => {
        set({ isLoading: true })
        try {
          const user = await api.get<AuthUser>('/auth/me')
          set({ user, isAuthenticated: true, isLoading: false })
        } catch {
          set({ isLoading: false })
          get().logout()
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'sedgwick-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)

export function useCurrentUser(): AuthUser {
  const user = useAuthStore((s) => s.user)
  if (!user) throw new Error('useCurrentUser called outside authenticated context')
  return user
}

export function useRole(): UserRole | null {
  return useAuthStore((s) => s.user?.role ?? null)
}

export function useHasRole(...roles: UserRole[]): boolean {
  const role = useRole()
  return role !== null && roles.includes(role)
}
