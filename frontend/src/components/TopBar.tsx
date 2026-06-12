import { useAuthStore } from '../store/authStore'
import { NotificationBell } from './ui/notification-bell'

interface TopBarProps {
  title: string
}

export function TopBar({ title }: TopBarProps) {
  const { user } = useAuthStore()

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-4">
        {user?.organization_name && (
          <span className="hidden sm:block text-sm text-gray-500">
            {user.organization_name}
          </span>
        )}
        <NotificationBell />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            {(() => {
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
            })()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">
              {user?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
