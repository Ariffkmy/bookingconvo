import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { PageLoader } from '../ui/Spinner'
import { type UserRole } from '../../types'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  redirectTo?: string
}

export function ProtectedRoute({ allowedRoles = [], redirectTo = '/portal/login' }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth()

  if (loading) return <PageLoader label="Loading..." />

  if (!user) return <Navigate to={redirectTo} replace />

  if (allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />
    if (role === 'photographer') return <Navigate to="/portal/dashboard" replace />
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}
