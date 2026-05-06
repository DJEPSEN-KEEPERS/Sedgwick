import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { ReactNode } from 'react'

interface AuthGuardProps {
  children: ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, accessToken } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/login/sedgwick" state={{ from: location }} replace />
  }

  return <>{children}</>
}
