import { useApi, useMutation } from '@/hooks/useApi'
import { Building2, Mail, Phone, Star, MapPin, Award, Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TwoFactorSection } from '@/components/auth/TwoFactorSection'
import { getEntrepriseTypeLabel } from '@/lib/utils'
import type { EntrepriseType } from '@/types'

const EVENT_TYPES = [
  { key: 'BID_SELECTED', label: 'Mit bud er valgt' },
  { key: 'STATUS_UPDATE_APPROVED', label: 'Statusopdatering godkendt' },
  { key: 'STATUS_UPDATE_REJECTED', label: 'Statusopdatering afvist' },
  { key: 'FINAL_REPORT_APPROVED', label: 'Slutrapport godkendt' },
  { key: 'FINAL_REPORT_REJECTED', label: 'Slutrapport afvist' },
  { key: 'NEW_INVITATION', label: 'Ny invitation' },
  { key: 'NEW_MESSAGE', label: 'Ny besked' },
]

interface ProfileData {
  contractor: any
  user: any
  notificationPrefs: Array<{ id: string; channel: string; eventType: string; enabled: boolean }>
}

export default function ProfilePage() {
  const { data, loading, refetch } = useApi<ProfileData>('/contractor/profile')
  const { mutate: updatePrefs } = useMutation('put')

  const togglePref = async (eventType: string, currentEnabled: boolean) => {
    const existing = data?.notificationPrefs ?? []
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

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-24 bg-gray-200 rounded-xl" />
        <div className="h-40 bg-gray-200 rounded-xl" />
        <div className="h-40 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (!data) return null

  const { contractor, user, notificationPrefs } = data

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-xl font-display font-bold text-gray-900">Min profil</h1>

      {/* User info */}
      <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-display font-bold text-lg">
            {user?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-display font-bold text-gray-900">{user?.fullName}</p>
            <p className="text-xs text-gray-500">{user?.role === 'CONTRACTOR_USER' ? 'Håndværker' : user?.role}</p>
          </div>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="h-4 w-4 text-gray-400" />
            {user?.email}
          </div>
          {user?.phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-4 w-4 text-gray-400" />
              {user.phone}
            </div>
          )}
        </div>
      </div>

      {/* Contractor company info */}
      {contractor && (
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary-600" />
            <h2 className="font-display font-semibold text-gray-900">{contractor.companyName}</h2>
          </div>

          <div className="space-y-1.5 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs w-20">CVR</span>
              <span className="font-mono">{contractor.cvrNumber}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              {contractor.contactPhone}
            </div>
          </div>

          {/* Ratings */}
          <div className="flex gap-4 pt-1 border-t border-gray-100">
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span className="font-semibold text-gray-900">{contractor.sedgwickRatingAvg.toFixed(1)}</span>
              <span className="text-gray-400 text-xs">Sedgwick</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span className="font-semibold text-gray-900">{contractor.clientRatingAvg.toFixed(1)}</span>
              <span className="text-gray-400 text-xs">Kunder</span>
            </div>
          </div>

          {/* Regions */}
          {contractor.regions?.length > 0 && (
            <div>
              <p className="text-xs font-display font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                Regioner
              </p>
              <div className="flex flex-wrap gap-1">
                {contractor.regions.map((r: any) => (
                  <Badge key={r.id} variant="gray">{r.regionName}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {contractor.skills?.length > 0 && (
            <div>
              <p className="text-xs font-display font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Kompetencer
              </p>
              <div className="flex flex-wrap gap-1">
                {contractor.skills.map((s: any) => (
                  <Badge key={s.id} variant="default">
                    {getEntrepriseTypeLabel(s.skill?.category as EntrepriseType) ?? s.skill?.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {contractor.certifications?.length > 0 && (
            <div>
              <p className="text-xs font-display font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Award className="h-3.5 w-3.5" />
                Certificeringer
              </p>
              <div className="space-y-1">
                {contractor.certifications.map((c: any) => (
                  <p key={c.id} className="text-xs text-gray-700">{c.name}{c.issuer ? ` (${c.issuer})` : ''}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notification preferences */}
      <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary-600" />
          <h2 className="font-display font-semibold text-gray-900">Notifikationer</h2>
        </div>
        <p className="text-xs text-gray-500">Vælg hvilke hændelser du vil notificeres om</p>
        <div className="space-y-2">
          {EVENT_TYPES.map((et) => {
            const pref = notificationPrefs?.find((p) => p.eventType === et.key && p.channel === 'IN_APP')
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

      {/* 2FA settings */}
      <TwoFactorSection />
    </div>
  )
}
