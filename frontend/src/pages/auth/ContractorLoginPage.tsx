import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { LoginForm } from '@/components/auth/LoginForm'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { HardHat } from 'lucide-react'

export default function ContractorLoginPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuthStore()

  if (isAuthenticated && user?.role === 'CONTRACTOR_USER') {
    return <Navigate to="/contractor/dashboard" replace />
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f9]">
      {/* Top brand bar — mobile-first */}
      <div className="bg-primary-800 px-6 py-8 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <HardHat className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display font-bold text-lg">Sedgwick</p>
              <p className="text-xs text-white/70">{t('portal.contractor')}</p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
        <h1 className="mt-4 text-2xl font-display font-bold">{t('auth.contractorLogin')}</h1>
        <p className="text-sm text-white/70 mt-1">{t('loginPage.contractor.subtitle')}</p>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col items-center justify-start p-6">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl shadow-card border border-[#e5e7eb] p-6">
            <LoginForm portalLabel={t('auth.contractorLogin')} />
          </div>

          <div className="mt-6 rounded-lg bg-primary-50 border border-primary-100 p-4">
            <p className="text-xs font-display font-medium text-primary-800 mb-1">
              Ny på platformen?
            </p>
            <p className="text-xs text-primary-700">
              Din virksomhed registreres af Sedgwick. Kontakt os på{' '}
              <a href="mailto:partner@sedgwick.dk" className="underline">
                partner@sedgwick.dk
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
