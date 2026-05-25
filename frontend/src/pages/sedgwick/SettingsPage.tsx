import { useState } from 'react'
import { useApi, useMutation } from '@/hooks/useApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { User } from '@/types'

const TABS = ['Brugere', 'Notifikationer', 'Kompetencer', 'Entreprisetyper']
const ENTREPRISE_TYPES = [
  { type: 'CARPENTER',   label: 'Tømrer' },
  { type: 'MASON',       label: 'Murer' },
  { type: 'PLUMBER',     label: 'VVS' },
  { type: 'GLAZIER',     label: 'Glarmester' },
  { type: 'ELECTRICIAN', label: 'Elektriker' },
  { type: 'PAINTER',     label: 'Maler' },
  { type: 'ROOFER',      label: 'Tækker/Tag' },
  { type: 'OTHER',       label: 'Andet' },
]

export default function SettingsPage() {
  const [tab, setTab] = useState(0)
  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-6">Indstillinger</h1>
      <div className="border-b border-[#e5e7eb] mb-6">
        <nav className="flex gap-0">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={cn('px-4 py-2.5 text-sm font-display font-medium border-b-2 transition-colors',
                tab === i ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700')}
            >{t}</button>
          ))}
        </nav>
      </div>
      {tab === 0 && <UsersTab />}
      {tab === 1 && <NotificationsTab />}
      {tab === 2 && <SkillsTab />}
      {tab === 3 && <EntrepriseTypesTab />}
    </div>
  )
}

// ─── Users tab ────────────────────────────────────────────────────────────────

type UserRole = 'SEDGWICK_ADMIN' | 'INSURER_USER' | 'CONTRACTOR_USER'

interface InsurerOption { id: string; name: string }
interface ContractorOption { id: string; companyName: string }

const ROLE_LABELS: Record<UserRole, string> = {
  SEDGWICK_ADMIN:   'Sedgwick intern',
  INSURER_USER:     'Forsikringsselskab',
  CONTRACTOR_USER:  'Håndværker',
}

function UsersTab() {
  const { data: users, loading, refetch } = useApi<User[]>('/users')
  const { data: insurers }    = useApi<InsurerOption[]>('/insurers')
  const { data: contractors } = useApi<ContractorOption[]>('/contractors?pageSize=200')
  const { mutate: createUser, loading: creating } = useMutation('post')

  const [showForm, setShowForm]           = useState(false)
  const [fullName, setFullName]           = useState('')
  const [email, setEmail]                 = useState('')
  const [role, setRole]                   = useState<UserRole>('SEDGWICK_ADMIN')
  const [password, setPassword]           = useState('')
  const [phone, setPhone]                 = useState('')
  const [insurerId, setInsurerId]         = useState('')
  const [contractorId, setContractorId]   = useState('')
  const [formError, setFormError]         = useState('')
  const [formSuccess, setFormSuccess]     = useState('')

  const resetForm = () => {
    setFullName(''); setEmail(''); setRole('SEDGWICK_ADMIN')
    setPassword(''); setPhone(''); setInsurerId(''); setContractorId('')
    setFormError(''); setFormSuccess('')
  }

  const handleSubmit = async () => {
    setFormError('')
    setFormSuccess('')
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setFormError('Navn, e-mail og adgangskode er påkrævet')
      return
    }
    if (role === 'INSURER_USER' && !insurerId) {
      setFormError('Vælg et forsikringsselskab')
      return
    }
    if (role === 'CONTRACTOR_USER' && !contractorId) {
      setFormError('Vælg en håndværker')
      return
    }

    const result = await createUser('/users', {
      fullName: fullName.trim(),
      email: email.trim(),
      role,
      password,
      phone: phone.trim() || undefined,
      insuranceCompanyId: role === 'INSURER_USER' ? insurerId : undefined,
      contractorId: role === 'CONTRACTOR_USER' ? contractorId : undefined,
    })

    if (result) {
      setFormSuccess(`Bruger oprettet: ${email.trim()}`)
      resetForm()
      setShowForm(false)
      refetch()
    } else {
      setFormError('Oprettelse fejlede — tjek at e-mail ikke allerede er i brug')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-display font-semibold text-gray-900">Systembrugere</h2>
        <Button size="sm" onClick={() => { resetForm(); setShowForm((v) => !v) }}>
          {showForm ? 'Luk' : '+ Opret bruger'}
        </Button>
      </div>

      {formSuccess && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {formSuccess}
        </div>
      )}

      {showForm && (
        <Card className="mb-4">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Fuldt navn *</Label>
                <Input className="mt-1" placeholder="Fuldt navn" value={fullName}
                  onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label>E-mail *</Label>
                <Input className="mt-1" type="email" placeholder="navn@firma.dk" value={email}
                  onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Adgangskode *</Label>
                <Input className="mt-1" type="text" placeholder="Midlertidig adgangskode" value={password}
                  onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input className="mt-1" placeholder="+45 xx xx xx xx" value={phone}
                  onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label>Rolle *</Label>
                <select className="input-field mt-1 w-full" value={role}
                  onChange={(e) => { setRole(e.target.value as UserRole); setInsurerId(''); setContractorId('') }}>
                  {Object.entries(ROLE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              {role === 'INSURER_USER' && (
                <div>
                  <Label>Forsikringsselskab *</Label>
                  <select className="input-field mt-1 w-full" value={insurerId}
                    onChange={(e) => setInsurerId(e.target.value)}>
                    <option value="">— Vælg selskab —</option>
                    {(insurers ?? []).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {role === 'CONTRACTOR_USER' && (
                <div>
                  <Label>Håndværkerfirma *</Label>
                  <select className="input-field mt-1 w-full" value={contractorId}
                    onChange={(e) => setContractorId(e.target.value)}>
                    <option value="">— Vælg firma —</option>
                    {(contractors ?? []).map((c) => (
                      <option key={c.id} value={c.id}>{c.companyName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={creating}>
                {creating ? 'Opretter...' : 'Opret bruger'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setShowForm(false); resetForm() }}>
                Annuller
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}
        </div>
      ) : (
        <div className="rounded-lg border border-[#e5e7eb] bg-white shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-gray-50">
                {['Navn', 'E-mail', 'Rolle', 'Status', 'Oprettet'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users ?? []).length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Ingen brugere</td></tr>
              ) : (
                (users ?? []).map((u) => (
                  <tr key={u.id} className="border-b border-[#e5e7eb] hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-display font-medium text-gray-900">{u.fullName}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={u.role === 'SEDGWICK_ADMIN' ? 'default' : u.role === 'INSURER_USER' ? 'info' : 'success'}>
                        {ROLE_LABELS[u.role as UserRole] ?? u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={u.status === 'ACTIVE' ? 'success' : 'danger'}>
                        {u.status === 'ACTIVE' ? 'Aktiv' : u.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('da-DK') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Notifications tab ────────────────────────────────────────────────────────

function NotificationsTab() {
  const events = [
    'Ny sag oprettet', 'Tilbud modtaget', 'Statusopdatering', 'Slutrapport indsendt',
    'Godkendelse krævet', 'SLA-advarsel', 'Ny besked',
  ]
  return (
    <div>
      <h2 className="text-base font-display font-semibold text-gray-900 mb-4">Notifikationspræferencer</h2>
      <div className="rounded-lg border border-[#e5e7eb] bg-white shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-gray-50">
              <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">Hændelse</th>
              <th className="px-4 py-2.5 text-center text-xs font-display font-medium text-gray-500">E-mail</th>
              <th className="px-4 py-2.5 text-center text-xs font-display font-medium text-gray-500">In-app</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e} className="border-b border-[#e5e7eb]">
                <td className="px-4 py-3 text-sm text-gray-900">{e}</td>
                <td className="px-4 py-3 text-center"><input type="checkbox" defaultChecked className="rounded" /></td>
                <td className="px-4 py-3 text-center"><input type="checkbox" defaultChecked className="rounded" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button className="mt-4" size="sm">Gem præferencer</Button>
    </div>
  )
}

// ─── Skills tab ───────────────────────────────────────────────────────────────

function SkillsTab() {
  const { data: skills, loading } = useApi<{ id: string; name: string; category: string }[]>('/skills')
  const [newSkill, setNewSkill] = useState('')
  const [newCategory, setNewCategory] = useState('')
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-display font-semibold text-gray-900">Kompetencetaksonomi</h2>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Input placeholder="Kompetencenavn" className="max-w-xs" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} />
        <Input placeholder="Kategori" className="max-w-xs" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
        <Button size="sm">Tilføj</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {loading ? (
          <span className="text-sm text-gray-400">Indlæser...</span>
        ) : (
          (skills ?? []).map((s) => (
            <div key={s.id} className="flex items-center gap-1 rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-xs font-display">
              <span className="text-gray-700">{s.name}</span>
              <span className="text-gray-400">/ {s.category}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Entreprise types tab ─────────────────────────────────────────────────────

function EntrepriseTypesTab() {
  return (
    <div>
      <h2 className="text-base font-display font-semibold text-gray-900 mb-4">Entreprisetyper</h2>
      <p className="text-sm text-gray-500 mb-4">De 8 faste entreprisetyper.</p>
      <div className="rounded-lg border border-[#e5e7eb] bg-white shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-gray-50">
              <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">Type</th>
              <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">Label</th>
            </tr>
          </thead>
          <tbody>
            {ENTREPRISE_TYPES.map((t) => (
              <tr key={t.type} className="border-b border-[#e5e7eb]">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{t.type}</td>
                <td className="px-4 py-2.5"><Input defaultValue={t.label} className="max-w-xs" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button size="sm" className="mt-4">Gem labels</Button>
    </div>
  )
}
