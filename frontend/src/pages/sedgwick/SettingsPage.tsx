import { useState } from 'react'
import { useApi } from '@/hooks/useApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { User } from '@/types'

const TABS = ['Brugere', 'Notifikationer', 'Kompetencer', 'Entreprisetyper']
const ENTREPRISE_TYPES = [
  { type: 'CARPENTER', label: 'Tømrer' },
  { type: 'MASON',     label: 'Murer' },
  { type: 'PLUMBER',   label: 'VVS' },
  { type: 'GLAZIER',   label: 'Glarmester' },
  { type: 'ELECTRICIAN', label: 'Elektriker' },
  { type: 'PAINTER',   label: 'Maler' },
  { type: 'ROOFER',    label: 'Tækker/Tag' },
  { type: 'OTHER',     label: 'Andet' },
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

function UsersTab() {
  const { data: users, loading } = useApi<User[]>('/users')
  const [showInvite, setShowInvite] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-display font-semibold text-gray-900">Systembrugere</h2>
        <Button size="sm" onClick={() => setShowInvite((v) => !v)}>+ Inviter bruger</Button>
      </div>

      {showInvite && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Navn</Label><Input className="mt-1" placeholder="Fuldt navn" /></div>
              <div><Label>E-mail</Label><Input className="mt-1" type="email" placeholder="navn@firma.dk" /></div>
              <div>
                <Label>Rolle</Label>
                <select className="input-field mt-1">
                  <option value="SEDGWICK_ADMIN">Sedgwick intern</option>
                  <option value="INSURER_USER">Forsikringsselskab</option>
                  <option value="CONTRACTOR_USER">Håndværker</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm">Inviter</Button>
              <Button size="sm" variant="secondary" onClick={() => setShowInvite(false)}>Annuller</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2 animate-pulse">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}</div>
      ) : (
        <div className="rounded-lg border border-[#e5e7eb] bg-white shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-gray-50">
                {['Navn', 'E-mail', 'Rolle', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-b border-[#e5e7eb] hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-display font-medium text-gray-900">{u.fullName}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={u.role === 'SEDGWICK_ADMIN' ? 'default' : u.role === 'INSURER_USER' ? 'info' : 'success'}>
                      {u.role === 'SEDGWICK_ADMIN' ? 'Sedgwick' : u.role === 'INSURER_USER' ? 'Forsikring' : 'Håndværker'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={u.status === 'ACTIVE' ? 'success' : 'danger'}>
                      {u.status === 'ACTIVE' ? 'Aktiv' : u.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <button className="text-xs text-primary-600 hover:underline">Rediger</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function NotificationsTab() {
  const events = [
    'Ny sag oprettet', 'Tilbud modtaget', 'Statusopdatering', 'Slutrapport indsendt',
    'Godkendelse krævet', 'SLA-advarsel', 'Ny besked',
  ]
  return (
    <div>
      <h2 className="text-base font-display font-semibold text-gray-900 mb-4">Notifikationspræferencer</h2>
      <Card>
        <CardContent className="p-0">
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
        </CardContent>
      </Card>
      <Button className="mt-4" size="sm">Gem præferencer</Button>
    </div>
  )
}

function SkillsTab() {
  const { data: skills, loading } = useApi<{ id: string; name: string; category: string }[]>('/skills')
  const [newSkill, setNewSkill] = useState('')
  const [newCategory, setNewCategory] = useState('')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-display font-semibold text-gray-900">Kompetencetaksonomin</h2>
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

function EntrepriseTypesTab() {
  return (
    <div>
      <h2 className="text-base font-display font-semibold text-gray-900 mb-4">Entreprisetyper</h2>
      <p className="text-sm text-gray-500 mb-4">De 8 faste entreprisetyper. Labels kan redigeres.</p>
      <div className="rounded-lg border border-[#e5e7eb] bg-white shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-gray-50">
              <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">Type (fast)</th>
              <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">Label (redigerbar)</th>
            </tr>
          </thead>
          <tbody>
            {ENTREPRISE_TYPES.map((t) => (
              <tr key={t.type} className="border-b border-[#e5e7eb]">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{t.type}</td>
                <td className="px-4 py-2.5">
                  <Input defaultValue={t.label} className="max-w-xs" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button size="sm" className="mt-4">Gem labels</Button>
    </div>
  )
}
