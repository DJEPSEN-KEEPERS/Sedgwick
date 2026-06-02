import { TwoFactorSection } from '@/components/auth/TwoFactorSection'
import { useCurrentUser } from '@/stores/authStore'

export default function InsurerAccountPage() {
  const user = useCurrentUser()

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Min konto</h1>
        <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
      </div>

      <TwoFactorSection />
    </div>
  )
}
