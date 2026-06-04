import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface ProtectedRouteProps {
  permission?: string
}

export function ProtectedRoute({ permission }: ProtectedRouteProps) {
  const { isAuthenticated, hasPermission } = useAuthStore()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (permission && !hasPermission(permission)) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
