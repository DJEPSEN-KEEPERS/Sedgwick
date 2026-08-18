import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApi, useMutation } from '@/hooks/useApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { TwoFactorSection } from '@/components/auth/TwoFactorSection'
import { cn } from '@/lib/utils'
import type { User, InsuranceCompany } from '@/types'


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
  const { t } = useTranslation()
  const [tab, setTab] = useState(0)

  const TABS = [
    t('settings.tabs.users'),
    t('settings.tabs.insurers'),
    t('settings.tabs.contractors'),
    'Notifikationer',
    'Kompetencer',
    'Entreprisetyper',
    'Sikkerhed',
  ]

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-6">{t('settings.title')}</h1>
      <div className="border-b border-[#e5e7eb] mb-6">
        <nav className="flex gap-0 flex-wrap">
          {TABS.map((label, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={cn('px-4 py-2.5 text-sm font-display font-medium border-b-2 transition-colors',
                tab === i ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700')}
            >{label}</button>
          ))}
        </nav>
      </div>
      {tab === 0 && <UsersTab />}
      {tab === 1 && <InsurersTab />}
      {tab === 2 && <ContractorsTab />}
      {tab === 3 && <NotificationsTab />}
      {tab === 4 && <SkillsTab />}
      {tab === 5 && <EntrepriseTypesTab />}
      {tab === 6 && <SecurityTab />}
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const active = status === 'ACTIVE' || status === 'active'
  return (
    <Badge variant={active ? 'success' : 'danger'}>
      {active ? t('common.active') : t('common.inactive')}
    </Badge>
  )
}

// ─── Users tab ────────────────────────────────────────────────────────────────

type UserRole = 'SEDGWICK_ADMIN' | 'INSURER_USER' | 'CONTRACTOR_USER'

interface InsurerOption { id: string; name: string }
interface ContractorOption { id: string; companyName: string }

interface UserWithLinks extends User {
  phone?: string
  insurerUser?:    { insuranceCompanyId: string; insuranceCompany: { name: string } } | null
  contractorUser?: { contractorId: string;       contractor:       { companyName: string } } | null
}

const ROLE_LABELS: Record<UserRole, string> = {
  SEDGWICK_ADMIN:   'Sedgwick intern',
  INSURER_USER:     'Forsikringsselskab',
  CONTRACTOR_USER:  'Håndværker',
}

function UsersTab() {
  const { t } = useTranslation()
  const { data: users, loading, refetch } = useApi<UserWithLinks[]>('/users')
  const { data: insurers }    = useApi<InsurerOption[]>('/insurers')
  const { data: contractors } = useApi<ContractorOption[]>('/contractors?pageSize=200')
  const { mutate: createUser,  loading: creating,  error: mutationError } = useMutation('post')
  const { mutate: updateUser,  loading: saving }                          = useMutation('patch')
  const { mutate: deleteUser,  loading: deleting }                        = useMutation('delete')
  const { mutate: deactivate,  loading: deactivating }                    = useMutation('patch')

  // Create form
  const [showForm, setShowForm]         = useState(false)
  const [fullName, setFullName]         = useState('')
  const [email, setEmail]               = useState('')
  const [role, setRole]                 = useState<UserRole>('SEDGWICK_ADMIN')
  const [password, setPassword]         = useState('')
  const [phone, setPhone]               = useState('')
  const [insurerId, setInsurerId]       = useState('')
  const [contractorId, setContractorId] = useState('')
  const [formError, setFormError]       = useState('')
  const [formSuccess, setFormSuccess]   = useState('')

  // Edit state
  const [editId, setEditId]                   = useState<string | null>(null)
  const [editName, setEditName]               = useState('')
  const [editEmail, setEditEmail]             = useState('')
  const [editPhone, setEditPhone]             = useState('')
  const [editStatus, setEditStatus]           = useState('')
  const [editPassword, setEditPassword]       = useState('')
  const [editInsurerId, setEditInsurerId]     = useState('')
  const [editContractorId, setEditContractorId] = useState('')
  const [editError, setEditError]             = useState('')

  // Delete confirmation state per row
  const [confirmDeleteId, setConfirmDeleteId]           = useState<string | null>(null)
  const [deleteError, setDeleteError]                   = useState<Record<string, string>>({})
  const [canDeactivateId, setCanDeactivateId]           = useState<string | null>(null)

  const resetCreate = () => {
    setFullName(''); setEmail(''); setRole('SEDGWICK_ADMIN')
    setPassword(''); setPhone(''); setInsurerId(''); setContractorId('')
    setFormError(''); setFormSuccess('')
  }

  const handleCreate = async () => {
    setFormError(''); setFormSuccess('')
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setFormError('Navn, e-mail og adgangskode er påkrævet'); return
    }
    if (role === 'INSURER_USER' && !insurerId)   { setFormError('Vælg et forsikringsselskab'); return }
    if (role === 'CONTRACTOR_USER' && !contractorId) { setFormError('Vælg en håndværker'); return }

    const result = await createUser('/users', {
      fullName: fullName.trim(), email: email.trim(), role, password,
      phone: phone.trim() || undefined,
      insuranceCompanyId: role === 'INSURER_USER'    ? insurerId    : undefined,
      contractorId:       role === 'CONTRACTOR_USER' ? contractorId : undefined,
    })
    if (result) {
      setFormSuccess(`Bruger oprettet: ${email.trim()}`)
      resetCreate(); setShowForm(false); refetch()
    } else {
      setFormError(mutationError ?? 'Oprettelse fejlede')
    }
  }

  const startEdit = (u: UserWithLinks) => {
    setEditId(u.id); setEditName(u.fullName); setEditEmail(u.email)
    setEditPhone(u.phone ?? ''); setEditStatus(u.status)
    setEditPassword(''); setEditError('')
    setEditInsurerId(u.insurerUser?.insuranceCompanyId ?? '')
    setEditContractorId(u.contractorUser?.contractorId ?? '')
    setConfirmDeleteId(null); setCanDeactivateId(null)
  }

  const handleSave = async (id: string, role: string) => {
    setEditError('')
    const result = await updateUser(`/users/${id}`, {
      fullName: editName.trim(),
      email:    editEmail.trim(),
      phone:    editPhone.trim() || undefined,
      status:   editStatus,
      ...(editPassword.trim() ? { password: editPassword.trim() } : {}),
      ...(role === 'INSURER_USER'    && editInsurerId    ? { insuranceCompanyId: editInsurerId }    : {}),
      ...(role === 'CONTRACTOR_USER' && editContractorId ? { contractorId: editContractorId }       : {}),
    })
    if (result) { setEditId(null); refetch() }
    else         setEditError(saving ? '' : 'Gem fejlede — prøv igen')
  }

  const handleDelete = async (id: string) => {
    setDeleteError((p) => ({ ...p, [id]: '' }))
    setCanDeactivateId(null)
    const result = await deleteUser(`/users/${id}`)
    if (result && (result as { deleted?: boolean }).deleted) {
      setConfirmDeleteId(null); refetch()
    } else {
      // 409 = has linked data; offer deactivation
      setCanDeactivateId(id)
      setDeleteError((p) => ({ ...p, [id]: 'Brugeren har tilknyttede data og kan ikke slettes permanent.' }))
    }
  }

  const handleDeactivate = async (id: string) => {
    const result = await deactivate(`/users/${id}`, { status: 'INACTIVE' })
    if (result) { setConfirmDeleteId(null); setCanDeactivateId(null); refetch() }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-display font-semibold text-gray-900">{t('settings.users')}</h2>
        <Button size="sm" onClick={() => { resetCreate(); setShowForm((v) => !v) }}>
          {showForm ? t('common.close') : `+ ${t('settings.newUser')}`}
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
                <Label>{t('common.name')} *</Label>
                <Input className="mt-1" placeholder={t('common.name')} value={fullName}
                  onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label>{t('common.email')} *</Label>
                <Input className="mt-1" type="email" placeholder="navn@firma.dk" value={email}
                  onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>{t('common.password')} *</Label>
                <Input className="mt-1" type="text" placeholder={t('common.password')} value={password}
                  onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <Label>{t('common.phone')}</Label>
                <Input className="mt-1" placeholder="+45 xx xx xx xx" value={phone}
                  onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label>{t('common.role')} *</Label>
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
                    {(insurers ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {role === 'CONTRACTOR_USER' && (
                <div>
                  <Label>Håndværkerfirma *</Label>
                  <select className="input-field mt-1 w-full" value={contractorId}
                    onChange={(e) => setContractorId(e.target.value)}>
                    <option value="">— Vælg firma —</option>
                    {(contractors ?? []).map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                </div>
              )}
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={creating}>
                {creating ? t('common.loading') : t('settings.newUser')}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setShowForm(false); resetCreate() }}>
                {t('common.cancel')}
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb] bg-gray-50">
                  {[t('settings.table.name'), t('settings.table.email'), t('settings.table.role'), t('settings.table.association'), t('settings.table.status'), t('common.date'), ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(users ?? []).length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">{t('common.noResults')}</td></tr>
                ) : (
                  (users ?? []).map((u) =>
                    editId === u.id ? (
                      // ── Edit row ──────────────────────────────────────────
                      <tr key={u.id} className="border-b border-[#e5e7eb] bg-primary-50">
                        <td className="px-2 py-1.5">
                          <Input className="h-8 text-sm min-w-[130px]" value={editName}
                            onChange={(e) => setEditName(e.target.value)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-8 text-sm min-w-[150px]" type="email" value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)} />
                        </td>
                        <td className="px-2 py-1.5 text-xs text-gray-400">
                          <Badge variant={u.role === 'SEDGWICK_ADMIN' ? 'default' : u.role === 'INSURER_USER' ? 'info' : 'success'}>
                            {ROLE_LABELS[u.role as UserRole] ?? u.role}
                          </Badge>
                        </td>
                        <td className="px-2 py-1.5 min-w-[160px]">
                          {u.role === 'INSURER_USER' ? (
                            <select className="input-field h-8 text-sm w-full" value={editInsurerId}
                              onChange={(e) => setEditInsurerId(e.target.value)}>
                              <option value="">— Vælg selskab —</option>
                              {(insurers ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          ) : u.role === 'CONTRACTOR_USER' ? (
                            <select className="input-field h-8 text-sm w-full" value={editContractorId}
                              onChange={(e) => setEditContractorId(e.target.value)}>
                              <option value="">— Vælg firma —</option>
                              {(contractors ?? []).map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                            </select>
                          ) : (
                            <span className="text-xs text-gray-400 italic">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <select className="input-field h-8 text-sm" value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}>
                            <option value="ACTIVE">{t('common.active')}</option>
                            <option value="INACTIVE">{t('common.inactive')}</option>
                            <option value="SUSPENDED">Suspenderet</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex flex-col gap-1">
                            <Input className="h-7 text-xs w-28" placeholder="+45..." value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)} />
                            <Input className="h-7 text-xs w-28" type="text" placeholder={t('settings.table.password')}
                              value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex gap-1.5 items-center whitespace-nowrap">
                            <Button size="sm" onClick={() => handleSave(u.id, u.role)} disabled={saving}>
                              {saving ? '...' : t('common.save')}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setEditId(null)}>✕</Button>
                            {editError && <span className="text-xs text-red-600">{editError}</span>}
                          </div>
                        </td>
                      </tr>
                    ) : confirmDeleteId === u.id ? (
                      // ── Delete confirmation row ───────────────────────────
                      <tr key={u.id} className="border-b border-[#e5e7eb] bg-red-50">
                        <td colSpan={6} className="px-4 py-2.5">
                          <div className="flex items-center gap-3 flex-wrap">
                            {canDeactivateId === u.id ? (
                              <>
                                <span className="text-xs text-red-700">{deleteError[u.id]}</span>
                                <Button size="sm" variant="secondary"
                                  onClick={() => handleDeactivate(u.id)} disabled={deactivating}>
                                  {deactivating ? '...' : t('settings.deactivateInstead')}
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => { setConfirmDeleteId(null); setCanDeactivateId(null) }}>
                                  {t('common.cancel')}
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="text-xs font-medium text-red-700">
                                  {t('common.delete')} <strong>{u.fullName}</strong>?
                                </span>
                                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                                  onClick={() => handleDelete(u.id)} disabled={deleting}>
                                  {deleting ? '...' : t('settings.confirmDelete')}
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => setConfirmDeleteId(null)}>
                                  {t('common.cancel')}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                        <td />
                      </tr>
                    ) : (
                      // ── Normal row ────────────────────────────────────────
                      <tr key={u.id} className="border-b border-[#e5e7eb] hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-display font-medium text-gray-900 whitespace-nowrap">{u.fullName}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{u.email}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant={u.role === 'SEDGWICK_ADMIN' ? 'default' : u.role === 'INSURER_USER' ? 'info' : 'success'}>
                            {ROLE_LABELS[u.role as UserRole] ?? u.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {u.insurerUser?.insuranceCompany.name
                            ?? u.contractorUser?.contractor.companyName
                            ?? '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={u.status} />
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('da-DK') : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1.5 justify-end">
                            <Button size="sm" variant="secondary"
                              onClick={() => { startEdit(u); setConfirmDeleteId(null) }}>
                              {t('common.edit')}
                            </Button>
                            <Button size="sm" variant="secondary"
                              title="Nulstil 2FA — brugeren sætter ny authenticator-app op ved næste login"
                              onClick={async () => {
                                if (confirm(`Nulstil 2FA for ${u.fullName}?`)) {
                                  await fetch(`/api/auth/2fa/reset/${u.id}`, {
                                    method: 'POST',
                                    headers: { 'X-Auth-Token': localStorage.getItem('accessToken') ?? '' },
                                  })
                                }
                              }}>
                              2FA ↺
                            </Button>
                            <Button size="sm" variant="secondary"
                              className="text-red-600 hover:text-red-700 hover:border-red-300"
                              onClick={() => { setConfirmDeleteId(u.id); setEditId(null); setCanDeactivateId(null); setDeleteError({}) }}>
                              {t('common.delete')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Insurers tab ─────────────────────────────────────────────────────────────

function InsurersTab() {
  const { data: insurers, loading, refetch } = useApi<InsuranceCompany[]>('/insurers')
  const { mutate: createInsurer, loading: creating, error: createError } = useMutation<unknown, InsuranceCompany>('post')
  const { mutate: updateInsurer, loading: saving }                       = useMutation<unknown, InsuranceCompany>('patch')

  // Create form
  const [showForm, setShowForm]       = useState(false)
  const [newName, setNewName]         = useState('')
  const [newRef, setNewRef]           = useState('')
  const [formError, setFormError]     = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Inline edit state
  const [editId, setEditId]         = useState<string | null>(null)
  const [editName, setEditName]     = useState('')
  const [editRef, setEditRef]       = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editError, setEditError]   = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const resetCreate = () => { setNewName(''); setNewRef(''); setFormError(''); setFormSuccess('') }

  const handleCreate = async () => {
    setFormError('')
    if (!newName.trim()) { setFormError('Navn er påkrævet'); return }
    const result = await createInsurer('/insurers', {
      name: newName.trim(),
      externalReference: newRef.trim() || undefined,
    })
    if (result) {
      setFormSuccess(`Forsikringsselskab oprettet: ${newName.trim()}`)
      resetCreate()
      setShowForm(false)
      refetch()
    } else {
      setFormError(createError ?? 'Oprettelse fejlede')
    }
  }

  const startEdit = (ins: InsuranceCompany) => {
    setEditId(ins.id)
    setEditName(ins.name)
    setEditRef(ins.externalReference ?? '')
    setEditStatus(ins.status)
    setEditError('')
  }

  const handleSave = async (id: string) => {
    setEditError('')
    setEditSaving(true)
    const result = await updateInsurer(`/insurers/${id}`, {
      name: editName.trim(),
      externalReference: editRef.trim() || undefined,
      status: editStatus,
    })
    setEditSaving(false)
    if (result) {
      setEditId(null)
      refetch()
    } else {
      setEditError('Gem fejlede — prøv igen')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-display font-semibold text-gray-900">Forsikringsselskaber</h2>
        <Button size="sm" onClick={() => { resetCreate(); setShowForm((v) => !v) }}>
          {showForm ? 'Luk' : '+ Opret selskab'}
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
                <Label>Selskabsnavn *</Label>
                <Input className="mt-1" placeholder="fx Tryg Forsikring" value={newName}
                  onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div>
                <Label>Ekstern reference</Label>
                <Input className="mt-1" placeholder="fx TRYG eller ekstern API-ID" value={newRef}
                  onChange={(e) => setNewRef(e.target.value)} />
              </div>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={creating}>
                {creating ? 'Opretter...' : 'Opret selskab'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setShowForm(false); resetCreate() }}>
                Annuller
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}
        </div>
      ) : (
        <div className="rounded-lg border border-[#e5e7eb] bg-white shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-gray-50">
                {['Selskabsnavn', 'Ekstern reference', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(insurers ?? []).length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">Ingen forsikringsselskaber endnu</td></tr>
              ) : (
                (insurers ?? []).map((ins) =>
                  editId === ins.id ? (
                    <tr key={ins.id} className="border-b border-[#e5e7eb] bg-primary-50">
                      <td className="px-3 py-2">
                        <Input className="h-8 text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
                      </td>
                      <td className="px-3 py-2">
                        <Input className="h-8 text-sm" value={editRef} onChange={(e) => setEditRef(e.target.value)} />
                      </td>
                      <td className="px-3 py-2">
                        <select className="input-field h-8 text-sm" value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}>
                          <option value="active">Aktiv</option>
                          <option value="inactive">Inaktiv</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1.5 items-center">
                          <Button size="sm" onClick={() => handleSave(ins.id)} disabled={editSaving || saving}>
                            {(editSaving || saving) ? 'Gemmer...' : 'Gem'}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditId(null)}>Annuller</Button>
                          {editError && <span className="text-xs text-red-600 ml-1">{editError}</span>}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={ins.id} className="border-b border-[#e5e7eb] hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-display font-medium text-gray-900">{ins.name}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{ins.externalReference ?? '—'}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={ins.status} /></td>
                      <td className="px-4 py-2.5">
                        <Button size="sm" variant="secondary" onClick={() => startEdit(ins)}>Rediger</Button>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Contractors tab ──────────────────────────────────────────────────────────

interface ContractorListItem {
  id: string
  companyName: string
  cvrNumber: string
  contactName: string
  contactEmail: string
  contactPhone: string
  maxParallelProjects: number
  status: string
  createdAt: string
}

function ContractorsTab() {
  const { data: contractors, loading, refetch } = useApi<ContractorListItem[]>('/contractors?pageSize=200')
  const { mutate: createContractor, loading: creating, error: createError } =
    useMutation<unknown, { data: ContractorListItem }>('post')
  const { mutate: updateContractor, loading: saving } =
    useMutation<unknown, { data: ContractorListItem }>('patch')

  // Create form
  const [showForm, setShowForm]         = useState(false)
  const [newName, setNewName]           = useState('')
  const [newCvr, setNewCvr]             = useState('')
  const [newContact, setNewContact]     = useState('')
  const [newEmail, setNewEmail]         = useState('')
  const [newPhone, setNewPhone]         = useState('')
  const [newMax, setNewMax]             = useState('5')
  const [formError, setFormError]       = useState('')
  const [formSuccess, setFormSuccess]   = useState('')

  // Inline edit state
  const [editId, setEditId]           = useState<string | null>(null)
  const [editName, setEditName]       = useState('')
  const [editContact, setEditContact] = useState('')
  const [editEmail, setEditEmail]     = useState('')
  const [editPhone, setEditPhone]     = useState('')
  const [editMax, setEditMax]         = useState('5')
  const [editStatus, setEditStatus]               = useState('')
  const [editSedgwickRating, setEditSedgwickRating] = useState('0')
  const [editClientRating, setEditClientRating]     = useState('0')
  const [editError, setEditError]                   = useState('')
  const [editSaving, setEditSaving]                 = useState(false)

  const resetCreate = () => {
    setNewName(''); setNewCvr(''); setNewContact(''); setNewEmail('')
    setNewPhone(''); setNewMax('5'); setFormError(''); setFormSuccess('')
  }

  const handleCreate = async () => {
    setFormError('')
    if (!newName.trim() || !newCvr.trim() || !newContact.trim() || !newEmail.trim()) {
      setFormError('Firmanavn, CVR, kontaktnavn og e-mail er påkrævet')
      return
    }
    const result = await createContractor('/contractors', {
      companyName: newName.trim(),
      cvrNumber: newCvr.trim(),
      contactName: newContact.trim(),
      contactEmail: newEmail.trim(),
      contactPhone: newPhone.trim(),
      maxParallelProjects: parseInt(newMax) || 5,
    })
    if (result) {
      setFormSuccess(`Håndværker oprettet: ${newName.trim()}`)
      resetCreate()
      setShowForm(false)
      refetch()
    } else {
      setFormError(createError ?? 'Oprettelse fejlede')
    }
  }

  const startEdit = (c: ContractorListItem) => {
    setEditId(c.id)
    setEditName(c.companyName)
    setEditContact(c.contactName)
    setEditEmail(c.contactEmail)
    setEditPhone(c.contactPhone)
    setEditMax(String(c.maxParallelProjects))
    setEditStatus(c.status)
    setEditSedgwickRating(String((c as any).sedgwickRatingAvg ?? 0))
    setEditClientRating(String((c as any).clientRatingAvg ?? 0))
    setEditError('')
  }

  const handleSave = async (id: string) => {
    setEditError('')
    setEditSaving(true)
    const result = await updateContractor(`/contractors/${id}`, {
      companyName: editName.trim(),
      contactName: editContact.trim(),
      contactEmail: editEmail.trim(),
      contactPhone: editPhone.trim(),
      maxParallelProjects: parseInt(editMax) || 5,
      status: editStatus,
      sedgwickRatingAvg: parseFloat(editSedgwickRating) || 0,
      clientRatingAvg: parseFloat(editClientRating) || 0,
    })
    setEditSaving(false)
    if (result) {
      setEditId(null)
      refetch()
    } else {
      setEditError('Gem fejlede — prøv igen')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-display font-semibold text-gray-900">Håndværkere</h2>
        <Button size="sm" onClick={() => { resetCreate(); setShowForm((v) => !v) }}>
          {showForm ? 'Luk' : '+ Opret håndværker'}
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
                <Label>Firmanavn *</Label>
                <Input className="mt-1" placeholder="fx Hansen Tømrer & Byg A/S" value={newName}
                  onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div>
                <Label>CVR-nummer *</Label>
                <Input className="mt-1" placeholder="8 cifre" value={newCvr}
                  onChange={(e) => setNewCvr(e.target.value)} />
              </div>
              <div>
                <Label>Kontaktperson *</Label>
                <Input className="mt-1" placeholder="Fuldt navn" value={newContact}
                  onChange={(e) => setNewContact(e.target.value)} />
              </div>
              <div>
                <Label>Kontakt e-mail *</Label>
                <Input className="mt-1" type="email" placeholder="kontakt@firma.dk" value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input className="mt-1" placeholder="+45 xx xx xx xx" value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)} />
              </div>
              <div>
                <Label>Max. parallelle sager</Label>
                <Input className="mt-1" type="number" min="1" max="50" value={newMax}
                  onChange={(e) => setNewMax(e.target.value)} />
              </div>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={creating}>
                {creating ? 'Opretter...' : 'Opret håndværker'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setShowForm(false); resetCreate() }}>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb] bg-gray-50">
                  {['Firma', 'CVR', 'Kontakt', 'E-mail', 'Max sager', 'Status', 'Sedgwick-rating', 'Klientrating', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(contractors ?? []).length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">Ingen håndværkere endnu</td></tr>
                ) : (
                  (contractors ?? []).map((c) =>
                    editId === c.id ? (
                      <tr key={c.id} className="border-b border-[#e5e7eb] bg-primary-50">
                        <td className="px-2 py-1.5">
                          <Input className="h-8 text-sm min-w-[140px]" value={editName}
                            onChange={(e) => setEditName(e.target.value)} />
                        </td>
                        <td className="px-3 py-1.5 text-xs text-gray-400 font-mono whitespace-nowrap">{c.cvrNumber}</td>
                        <td className="px-2 py-1.5">
                          <Input className="h-8 text-sm min-w-[120px]" value={editContact}
                            onChange={(e) => setEditContact(e.target.value)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-8 text-sm min-w-[140px]" value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-8 text-sm w-16" type="number" min="1" max="50"
                            value={editMax} onChange={(e) => setEditMax(e.target.value)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <select className="input-field h-8 text-sm" value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}>
                            <option value="active">Aktiv</option>
                            <option value="inactive">Inaktiv</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-8 text-sm w-20" type="number" min="0" max="5" step="0.1"
                            value={editSedgwickRating} onChange={(e) => setEditSedgwickRating(e.target.value)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-8 text-sm w-20" type="number" min="0" max="5" step="0.1"
                            value={editClientRating} onChange={(e) => setEditClientRating(e.target.value)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex gap-1.5 items-center whitespace-nowrap">
                            <Button size="sm" onClick={() => handleSave(c.id)} disabled={editSaving || saving}>
                              {(editSaving || saving) ? '...' : 'Gem'}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setEditId(null)}>✕</Button>
                            {editError && <span className="text-xs text-red-600">{editError}</span>}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={c.id} className="border-b border-[#e5e7eb] hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-display font-medium text-gray-900 whitespace-nowrap">{c.companyName}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{c.cvrNumber}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{c.contactName}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{c.contactEmail}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600 text-center">{c.maxParallelProjects}</td>
                        <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                        <td className="px-4 py-2.5 text-xs text-gray-700 text-center">
                          {(c as any).sedgwickRatingAvg != null ? `★ ${Number((c as any).sedgwickRatingAvg).toFixed(1)}` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-700 text-center">
                          {(c as any).clientRatingAvg != null ? `★ ${Number((c as any).clientRatingAvg).toFixed(1)}` : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <Button size="sm" variant="secondary" onClick={() => startEdit(c)}>Rediger</Button>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
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
        <Input placeholder="Kompetencenavn" className="max-w-xs" value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)} />
        <Input placeholder="Kategori" className="max-w-xs" value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)} />
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

// ─── Security tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-base font-display font-semibold text-gray-900">Sikkerhed — Min konto</h2>
      <p className="text-sm text-gray-500">
        Administrer to-faktor godkendelse for din egen konto.
        Individuelle brugeres 2FA nulstilles via Brugere-fanen.
      </p>
      <TwoFactorSection />
    </div>
  )
}
