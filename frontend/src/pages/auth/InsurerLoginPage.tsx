import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LoginForm } from '@/components/auth/LoginForm'
import { ShieldCheck } from 'lucide-react'

export default function InsurerLoginPage() {
  const { isAuthenticated, user } = useAuthStore()

  if (isAuthenticated && user?.role === 'INSURER_USER') {
    return <Navigate to="/insurer/dashboard" replace />
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f6f9] p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-800 shadow-elevated">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Forsikringsportal</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sedgwick Denmark — Skadesagsopfølgning
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-card border border-[#e5e7eb] p-6">
          <div className="mb-6">
            <h2 className="font-display font-semibold text-gray-900">Log ind</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Adgang til opfølgning på reparationssager
            </p>
          </div>
          <LoginForm portalLabel="Forsikringsselskab" />
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Mangler du adgang?{' '}
          <a href="mailto:support@sedgwick.dk" className="text-primary-600 hover:underline">
            Kontakt Sedgwick
          </a>
        </p>
      </div>
    </div>
  )
}
