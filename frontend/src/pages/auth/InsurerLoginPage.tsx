import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { LoginForm } from '@/components/auth/LoginForm'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { ShieldCheck } from 'lucide-react'

export default function InsurerLoginPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuthStore()

  if (isAuthenticated && user?.role === 'INSURER_USER') {
    return <Navigate to="/insurer/dashboard" replace />
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f6f9] p-6">
      <div className="w-full max-w-md">
        {/* Language switcher top-right */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-800 shadow-elevated">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">{t('portal.insurer')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sedgwick Denmark — {t('loginPage.insurer.subtitle')}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-card border border-[#e5e7eb] p-6">
          <div className="mb-6">
            <h2 className="font-display font-semibold text-gray-900">{t('auth.login')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('auth.insurerPortal')}
            </p>
          </div>
          <LoginForm portalLabel={t('auth.insurerLogin')} />
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
