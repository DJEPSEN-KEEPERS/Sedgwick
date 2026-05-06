import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { ReactNode } from 'react'
import type { UserRole } from '@/types'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: UserRole[]
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user)

  if (!user) return <Navigate to="/login/sedgwick" replace />

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
