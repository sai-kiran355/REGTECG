import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  sub: string
  tenant_id: string
  role: 'admin' | 'analyst' | 'auditor' | 'viewer'
  permissions: string[]
  full_name?: string
  email?: string
  organization_name?: string
  organization_type?: string
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  tenantSlug: string | null
  isAuthenticated: boolean
  setTokens: (access: string, refresh: string) => void
  setUser: (user: AuthUser) => void
  setTenantSlug: (slug: string) => void
  logout: () => void
  hasPermission: (permission: string) => boolean
}

function parseJwt(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      sub: payload.sub,
      tenant_id: payload.tenant_id,
      role: payload.role,
      permissions: payload.permissions ?? [],
    }
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      tenantSlug: null,
      isAuthenticated: false,

      setTokens: (access, refresh) => {
        const user = parseJwt(access)
        set({ accessToken: access, refreshToken: refresh, user, isAuthenticated: true })
        // Auto-set tenantSlug from JWT — no manual input needed
        if (user?.tenant_id) {
          // Store tenant_id as the slug reference (resolved from JWT)
          set({ tenantSlug: user.tenant_id })
        }
      },

      setUser: (user) => set({ user }),

      setTenantSlug: (slug) => set({ tenantSlug: slug }),

      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }),

      hasPermission: (permission) => {
        const { user } = get()
        if (!user) return false
        return user.permissions.includes(permission) || user.role === 'admin'
      },
    }),
    {
      name: 'regtech-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        tenantSlug: state.tenantSlug,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
