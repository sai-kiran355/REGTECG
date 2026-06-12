import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  Shield,
  Users,
  FileSearch,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronUp,
  Activity,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { logoutApi } from '../api/client'
import { ProfilePanel } from './ProfilePanel'

const navItems = [
  { to: '/dashboard',   label: 'Dashboard',      icon: LayoutDashboard, permission: null },
  { to: '/cases',       label: 'Cases',           icon: ClipboardList,   permission: 'cases:read' },
  { to: '/kyc',         label: 'KYC',             icon: FileSearch,      permission: 'kyc:read' },
  { to: '/aml',         label: 'AML Screening',   icon: AlertTriangle,   permission: 'aml:read' },
  { to: '/sanctions',   label: 'Sanctions',        icon: Shield,          permission: 'sanctions:read' },
  { to: '/reports',     label: 'Reports',          icon: BarChart3,       permission: 'reports:read' },
  { to: '/audit',       label: 'Audit Log',        icon: ClipboardList,   permission: 'audit:read' },
  { to: '/monitoring',  label: 'Monitoring',       icon: Activity,        permission: 'admin:users' },
  { to: '/users',       label: 'Team',             icon: Users,           permission: 'admin:users' },
  { to: '/settings',    label: 'Settings',         icon: Settings,        permission: null },
]

export function Sidebar() {
  const { user, logout, hasPermission } = useAuthStore()
  const [profileOpen, setProfileOpen] = useState(false)

  const handleLogout = async () => {
    try { await logoutApi() } catch { /* ignore */ }
    logout()
    window.location.href = '/login'
  }

  const visible = navItems.filter(
    item => item.permission === null || hasPermission(item.permission),
  )

  // Get initials from user full name or email
  const getInitials = () => {
    if (user?.full_name) {
      const parts = user.full_name.trim().split(/\s+/)
      if (parts.length > 0) {
        return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
      }
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }
  const initials = getInitials()


  return (
    <>
      <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6">
          <ShieldCheck className="h-7 w-7 text-blue-600" />
          <div>
            <p className="text-sm font-bold text-gray-900">ComplianceOS</p>
            <p className="text-xs text-gray-500 truncate max-w-[140px]">
              {user?.organization_name || 'Compliance Platform'}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {visible.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User footer — click to open profile */}
        <div className="border-t border-gray-200 p-3">
          <button
            onClick={() => setProfileOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-gray-100 transition-colors group"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {user?.full_name || user?.email || 'My Profile'}
              </p>
              <p className="truncate text-xs text-gray-500 capitalize">{user?.role ?? ''}</p>
            </div>
            <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          </button>

          <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
