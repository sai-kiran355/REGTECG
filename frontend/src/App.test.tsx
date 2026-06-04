import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock react-router-dom to avoid BrowserRouter issues in tests
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/dashboard' }),
    NavLink: ({ children, className }: any) => <a className={typeof className === 'function' ? className({ isActive: false }) : className}>{children}</a>,
    Navigate: () => null,
    Outlet: () => <div data-testid="outlet" />,
    Routes: ({ children }: any) => <>{children}</>,
    Route: () => null,
  }
})

// Mock zustand store
vi.mock('./store/authStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    user: null,
    tenantSlug: null,
    hasPermission: () => false,
    logout: vi.fn(),
  }),
}))

import App from './App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    // App renders — no crash
    expect(document.body).toBeTruthy()
  })
})
