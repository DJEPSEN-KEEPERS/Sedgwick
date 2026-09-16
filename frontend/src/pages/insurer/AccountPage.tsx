import { Bell } from 'lucide-react'
import { TwoFactorSection } from '@/components/auth/TwoFactorSection'
import { useCurrentUser } from '@/stores/authStore'
import { useApi, useMutation } from '@/hooks/useApi'

const EVENT_TYPES = [
  { key: 'NEW_PROJECT',             label: 'Ny sag oprettet' },
  { key: 'BID_RECEIVED',            label: 'Tilbud modtaget' },
  { key: 'STATUS_UPDATE',           label: 'Statusopdatering' },
  { key: 'FINAL_REPORT_SUBMITTED',  label: 'Slutrapport indsendt' },
  { key: 'APPROVAL_REQUIRED',       label: 'Godkendelse krævet' },
  { key: 'NEW_MESSAGE',             label: 'Ny besked' },
]

interface NotificationPref {
  id: string
  channel: string
  eventType: string
  enabled: boolean
}

function NotificationsSection() {
  const { data: prefs, refetch } = useApi<NotificationPref[]>('/notifications/preferences')
  const { mutate: updatePrefs } = useMutation('put')

  const togglePref = async (eventType: string, currentEnabled: boolean) => {
    const existing = prefs ?? []
    const updated = EVENT_TYPES.map((et) => {
      const pref = existing.find((p) => p.eventType === et.key && p.channel === 'IN_APP')
      return {
        channel: 'IN_APP',
        eventType: et.key,
        enabled: et.key === eventType ? !currentEnabled : (pref?.enabled ?? true),
      }
    })
    await updatePrefs('/notifications/preferences', updated)
    refetch()
  }

  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white p-4 space-y-3 shadow-card">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary-600" />
        <h2 className="font-display font-semibold text-gray-900">Notifikationer</h2>
      </div>
      <p className="text-xs text-gray-500">Vælg hvilke hændelser du vil notificeres om</p>
      <div className="space-y-2">
        {EVENT_TYPES.map((et) => {
          const pref = prefs?.find((p) => p.eventType === et.key && p.channel === 'IN_APP')
          const enabled = pref?.enabled ?? true
          return (
            <div key={et.key} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-gray-700">{et.label}</span>
              <button
                onClick={() => togglePref(et.key, enabled)}
                className={`relative h-6 w-10 rounded-full transition-colors ${
                  enabled ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    enabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function InsurerAccountPage() {
  const user = useCurrentUser()

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Min konto</h1>
        <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
      </div>

      <NotificationsSection />

      <TwoFactorSection />
    </div>
  )
}
