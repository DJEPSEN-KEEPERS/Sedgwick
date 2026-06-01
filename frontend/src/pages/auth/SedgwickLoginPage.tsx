import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { LoginForm } from '@/components/auth/LoginForm'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export default function SedgwickLoginPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuthStore()

  if (isAuthenticated && user?.role === 'SEDGWICK_ADMIN') {
    return <Navigate to="/sedgwick/dashboard" replace />
  }

  const stats = [
    { label: t('loginPage.sedgwick.stats.activeProjects'), value: '~100' },
    { label: t('loginPage.sedgwick.stats.contractors'), value: '50+' },
    { label: t('loginPage.sedgwick.stats.insurers'), value: '12' },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary-900 p-12 text-white">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <span className="text-lg font-display font-bold">S</span>
            </div>
            <span className="text-xl font-display font-bold tracking-tight">Sedgwick</span>
          </div>
          <h1 className="text-4xl font-display font-bold leading-tight">
            Case Management<br />System
          </h1>
          <p className="mt-4 text-lg text-white/70 font-body">
            {t('loginPage.sedgwick.subtitle')}
          </p>
        </div>

        <div className="space-y-4">
          {stats.map(({ label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-display font-bold">
                {value}
              </div>
              <span className="text-sm text-white/70">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 bg-[#f4f6f9]">
        <div className="w-full max-w-sm">
          {/* Mobile logo + language switcher */}
          <div className="flex items-center justify-between mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-800">
                <span className="text-sm font-display font-bold text-white">S</span>
              </div>
              <span className="font-display font-bold text-primary-900">Sedgwick</span>
            </div>
            <LanguageSwitcher />
          </div>

          {/* Desktop language switcher */}
          <div className="hidden lg:flex justify-end mb-4">
            <LanguageSwitcher />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-display font-bold text-gray-900">{t('auth.employeeLogin')}</h2>
            <p className="mt-1 text-sm text-gray-500">{t('auth.sedgwickPortal')}</p>
          </div>

          <div className="bg-white rounded-xl shadow-card border border-[#e5e7eb] p-6">
            <LoginForm portalLabel={t('auth.employeeLogin')} />
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            {t('auth.loginHelp')}
          </p>
        </div>
      </div>
    </div>
  )
}
