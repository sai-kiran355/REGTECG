import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Layers, BriefcaseBusiness, Users, CalendarDays, Wallet,
  BarChart3, Settings, LogOut, Bell, Globe,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

interface Props {
  title: string
  subtitle?: string
  children: React.ReactNode
}

const NAV: { path: string; icon: any; label: string; soon?: boolean }[] = [
  { path: '/fintech/dashboard',   icon: Layers,           label: 'Dashboard' },
  { path: '/fintech/jobs',        icon: BriefcaseBusiness, label: 'Recruitment & ATS' },
  { path: '/fintech/employees',   icon: Users,            label: 'Employees' },
  { path: '/fintech/attendance',  icon: CalendarDays,     label: 'Attendance' },
  { path: '/fintech/payroll',     icon: Wallet,           label: 'Payroll' },
  { path: '/fintech/analytics',   icon: BarChart3,        label: 'Analytics' },
  { path: '/fintech/integrations',icon: Globe,            label: 'Integrations' },
]

export function FintechLayout({ title, subtitle, children }: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none">Fintech OS</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Workforce Platform</p>
          </div>
        </div>

        {/* Org name */}
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 truncate">{user?.organization_name ?? 'Your Company'}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV.map(item => {
            const Icon = item.icon
            const active = location.pathname === item.path ||
              (item.path !== '/fintech/dashboard' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                to={item.soon ? '#' : item.path}
                onClick={e => item.soon && e.preventDefault()}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-violet-50 text-violet-700 font-semibold'
                    : item.soon
                    ? 'text-gray-400 cursor-default'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-violet-600' : ''}`} />
                <span className="flex-1">{item.label}</span>
                {item.soon && (
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">Soon</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-gray-100 p-3 space-y-0.5">
          <Link to="/fintech/settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-100 transition-colors">
            <Settings className="h-4 w-4" /> Settings
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                {(user?.full_name || 'U')[0].toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900 leading-tight">{user?.full_name ?? 'Admin'}</p>
                <p className="text-xs text-gray-500">{user?.role ?? 'admin'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
