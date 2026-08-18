import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, LayoutGrid, List, X, Plus } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MilestoneBadge, PriorityBadge } from '@/components/ui/StatusBadges'
import { ProjectProgressBar } from '@/components/ui/ProjectProgressBar'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Project, ProjectMilestone } from '@/types'

// ─── Create project modal ─────────────────────────────────────────────────────

interface InsuranceCompany { id: string; name: string }

const DAMAGE_TYPES = ['Vandskade', 'Brandskade', 'Stormskade', 'Indbrudsskade', 'Rørskade', 'Frostskade', 'Naturskade', 'Anden skade']
const BUILDING_TYPES = ['Enfamiliehus', 'Rækkehus', 'Etageejendom', 'Erhvervsejendom', 'Sommerhus', 'Andet']
const REGIONS = ['Hovedstaden', 'Sjælland', 'Syddanmark', 'Midtjylland', 'Nordjylland', 'Bornholm']

function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: insurers } = useApi<InsuranceCompany[]>('/insurers')
  const { mutate: createProject, loading, error } = useMutation('post')

  const [form, setForm] = useState({
    insuranceCompanyId: '', claimId: '',
    insurerCaseId: '', insurancePolicyNumber: '',
    damageType: 'Vandskade', damageDescription: '',
    buildingType: 'Enfamiliehus',
    address: '', postalCode: '', city: '', region: 'Hovedstaden',
    contactName: '', contactPhone: '', contactEmail: '',
    priorityLevel: 'NORMAL', requestedDeadline: '',
    maxApprovedPrice: '',
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Record<string, unknown> = {
      insuranceCompanyId: form.insuranceCompanyId,
      damageType: form.damageType, damageDescription: form.damageDescription,
      buildingType: form.buildingType,
      address: form.address, postalCode: form.postalCode, city: form.city, region: form.region,
      contactName: form.contactName, contactPhone: form.contactPhone, contactEmail: form.contactEmail,
      priorityLevel: form.priorityLevel,
    }
    if (form.claimId.trim())              payload.claimId = form.claimId.trim()
    if (form.insurerCaseId.trim())        payload.insurerCaseId = form.insurerCaseId.trim()
    if (form.insurancePolicyNumber.trim()) payload.insurancePolicyNumber = form.insurancePolicyNumber.trim()
    if (form.requestedDeadline)           payload.requestedDeadline = form.requestedDeadline
    if (form.maxApprovedPrice)            payload.maxApprovedPrice = parseFloat(form.maxApprovedPrice)

    const result = await createProject('/projects', payload)
    if (result) { onCreated(); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e5e7eb] px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-lg font-display font-bold text-gray-900">Opret ny sag</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Forsikring */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-display font-semibold text-gray-500 uppercase tracking-wide">Forsikring</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Forsikringsselskab *</Label>
                <select className="input-field mt-1 w-full" value={form.insuranceCompanyId}
                  onChange={set('insuranceCompanyId')} required>
                  <option value="">— Vælg selskab —</option>
                  {(insurers ?? []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Sag-ID <span className="text-gray-400 font-normal">(auto hvis tomt)</span></Label>
                <Input className="mt-1" placeholder="SED-2026-XXXXXX" value={form.claimId} onChange={set('claimId')} />
              </div>
              <div>
                <Label>Forsikringsselskabets sagsnr.</Label>
                <Input className="mt-1" placeholder="Eksternt sagsnummer" value={form.insurerCaseId} onChange={set('insurerCaseId')} />
              </div>
              <div>
                <Label>Policenummer</Label>
                <Input className="mt-1" placeholder="Policenummer" value={form.insurancePolicyNumber} onChange={set('insurancePolicyNumber')} />
              </div>
            </div>
          </fieldset>

          {/* Skade */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-display font-semibold text-gray-500 uppercase tracking-wide">Skade</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Skadetype *</Label>
                <select className="input-field mt-1 w-full" value={form.damageType} onChange={set('damageType')} required>
                  {DAMAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label>Bygningstype *</Label>
                <select className="input-field mt-1 w-full" value={form.buildingType} onChange={set('buildingType')} required>
                  {BUILDING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>Beskrivelse *</Label>
                <textarea className="input-field mt-1 w-full min-h-[72px] resize-y"
                  placeholder="Beskriv skaden..." value={form.damageDescription}
                  onChange={set('damageDescription')} required />
              </div>
            </div>
          </fieldset>

          {/* Lokation */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-display font-semibold text-gray-500 uppercase tracking-wide">Adresse</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <Label>Adresse *</Label>
                <Input className="mt-1" placeholder="Vejnavn og husnummer" value={form.address} onChange={set('address')} required />
              </div>
              <div>
                <Label>Postnr. *</Label>
                <Input className="mt-1" placeholder="2000" value={form.postalCode} onChange={set('postalCode')} required />
              </div>
              <div>
                <Label>By *</Label>
                <Input className="mt-1" placeholder="By" value={form.city} onChange={set('city')} required />
              </div>
              <div>
                <Label>Region *</Label>
                <select className="input-field mt-1 w-full" value={form.region} onChange={set('region')} required>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Kontakt */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-display font-semibold text-gray-500 uppercase tracking-wide">Kontaktperson</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Navn *</Label>
                <Input className="mt-1" placeholder="Fuldt navn" value={form.contactName} onChange={set('contactName')} required />
              </div>
              <div>
                <Label>Telefon *</Label>
                <Input className="mt-1" type="tel" placeholder="+45 12 34 56 78" value={form.contactPhone} onChange={set('contactPhone')} required />
              </div>
              <div>
                <Label>E-mail *</Label>
                <Input className="mt-1" type="email" placeholder="kontakt@mail.dk" value={form.contactEmail} onChange={set('contactEmail')} required />
              </div>
            </div>
          </fieldset>

          {/* Prioritet + deadline */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-display font-semibold text-gray-500 uppercase tracking-wide">Prioritet & tidsplan</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Prioritet</Label>
                <select className="input-field mt-1 w-full" value={form.priorityLevel} onChange={set('priorityLevel')}>
                  <option value="NORMAL">Normal</option>
                  <option value="FASTTRACK">Fasttrack</option>
                </select>
              </div>
              <div>
                <Label>Frist (SLA-deadline)</Label>
                <Input className="mt-1" type="date" value={form.requestedDeadline} onChange={set('requestedDeadline')} />
              </div>
              <div>
                <Label>Maks. godkendt beløb (kr.)</Label>
                <Input className="mt-1" type="number" placeholder="0" value={form.maxApprovedPrice} onChange={set('maxApprovedPrice')} />
              </div>
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2 border border-red-100">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Annuller</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Opretter...' : 'Opret sag'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

const MILESTONES: { value: ProjectMilestone; label: string }[] = [
  { value: 'CASE_RECEIVED', label: 'Sag modtaget' },
  { value: 'BIDDING_IN_PROGRESS', label: 'Tilbud indhentes' },
  { value: 'CONTRACTOR_SELECTED', label: 'Håndværker valgt' },
  { value: 'WORK_SCHEDULED', label: 'Arbejde planlagt' },
  { value: 'WORK_STARTED', label: 'Arbejde startet' },
  { value: 'WORK_COMPLETED', label: 'Arbejde afsluttet' },
  { value: 'FINAL_REPORT_SUBMITTED', label: 'Slutrapport indsendt' },
  { value: 'CASE_INVOICED', label: 'Sag faktureret' },
  { value: 'CASE_CLOSED', label: 'Sag lukket' },
]

const PRIORITIES: { value: PriorityLevel; label: string }[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'FASTTRACK', label: 'Fasttrack' },
]

interface Filters {
  search: string
  status: string
  milestones: ProjectMilestone[]
  priority: string
  region: string
  sla: 'all' | 'at_risk' | 'breached'
  insurer: string
  damageType: string
  responsibleUser: string
  contractor: string
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<keyof Project>('updatedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showCreate, setShowCreate] = useState(false)

  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: (searchParams.get('status') as string) ?? '',
    milestones: [],
    priority: '',
    region: '',
    sla: (searchParams.get('sla') as Filters['sla']) ?? 'all',
    insurer: '',
    damageType: '',
    responsibleUser: '',
    contractor: '',
  })

  const { data: projects, loading, refetch } = useApi<Project[]>('/projects?pageSize=200')

  // Derive unique option lists from loaded data
  const options = useMemo(() => {
    if (!projects) return { insurers: [], damageTypes: [], regions: [], priorities: [], statuses: [], responsibleUsers: [], contractors: [] }
    const uniq = <T,>(arr: (T | undefined | null)[]): T[] => [...new Set(arr.filter((v): v is T => v != null))].sort((a, b) => String(a).localeCompare(String(b)))
    return {
      insurers: uniq(projects.map((p) => p.insuranceCompany?.name)),
      damageTypes: uniq(projects.map((p) => p.damageType)),
      regions: uniq(projects.map((p) => p.region)),
      priorities: uniq(projects.map((p) => p.priorityLevel)),
      statuses: uniq(projects.map((p) => p.status)),
      responsibleUsers: uniq(projects.map((p) => p.responsibleUser?.fullName)),
      contractors: uniq(projects.map((p) => p.selectedContractor?.companyName)),
    }
  }, [projects])

  const filtered = useMemo(() => {
    if (!projects) return []
    let list = [...projects] as Project[]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(
        (p) =>
          p.claimId.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.insuranceCompany?.name.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q),
      )
    }
    if (filters.insurer)          list = list.filter((p) => p.insuranceCompany?.name === filters.insurer)
    if (filters.damageType)       list = list.filter((p) => p.damageType === filters.damageType)
    if (filters.region)           list = list.filter((p) => p.region === filters.region)
    if (filters.priority)         list = list.filter((p) => p.priorityLevel === filters.priority)
    if (filters.status)           list = list.filter((p) => p.status === filters.status)
    if (filters.responsibleUser)  list = list.filter((p) => p.responsibleUser?.fullName === filters.responsibleUser)
    if (filters.contractor)       list = list.filter((p) => p.selectedContractor?.companyName === filters.contractor)
    if (filters.milestones.length) list = list.filter((p) => filters.milestones.includes(p.currentMilestone))

    if (filters.sla !== 'all') {
      const now = Date.now()
      list = list.filter((p) => {
        if (!p.requestedDeadline) return false
        const daysLeft = Math.ceil((new Date(p.requestedDeadline).getTime() - now) / 86400000)
        if (filters.sla === 'breached') return daysLeft < 0
        if (filters.sla === 'at_risk') return daysLeft >= 0 && daysLeft <= 7
        return false
      })
    }

    list.sort((a, b) => {
      const av = a[sortField] as string ?? ''
      const bv = b[sortField] as string ?? ''
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

    return list
  }, [projects, filters, sortField, sortDir])

  const activeFilterCount = [filters.insurer, filters.damageType, filters.region, filters.priority, filters.status, filters.responsibleUser, filters.contractor, filters.sla !== 'all' ? '1' : ''].filter(Boolean).length
  const hasFilters = activeFilterCount > 0

  const setSort = (field: keyof Project) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }: { field: keyof Project }) =>
    sortField === field ? (
      <span className="ml-0.5 text-primary-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
    ) : null

  return (
    <div>
      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { refetch(); setShowCreate(false) }}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Sager</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{filtered.length} sager</span>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Opret sag
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Søg sag-ID, adresse, forsikring..."
            className="pl-8"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>

        <Button
          variant={showFilters ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          Filtre
          {hasFilters && <span className="ml-1 rounded-full bg-white text-primary-700 px-1.5 text-xs font-display font-semibold">{activeFilterCount}</span>}
        </Button>

        <div className="flex rounded-md border border-gray-300 overflow-hidden">
          <button
            className={cn('px-3 py-1.5', view === 'table' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-500 hover:bg-gray-50')}
            onClick={() => setView('table')}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            className={cn('px-3 py-1.5 border-l border-gray-300', view === 'cards' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-500 hover:bg-gray-50')}
            onClick={() => setView('cards')}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-4 mb-4 shadow-card">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <FilterSelect label="Forsikring" value={filters.insurer} onChange={(v) => setFilters((f) => ({ ...f, insurer: v }))}>
              {options.insurers.map((v) => <option key={v} value={v}>{v}</option>)}
            </FilterSelect>
            <FilterSelect label="Skadetype" value={filters.damageType} onChange={(v) => setFilters((f) => ({ ...f, damageType: v }))}>
              {options.damageTypes.map((v) => <option key={v} value={v}>{v}</option>)}
            </FilterSelect>
            <FilterSelect label="Region" value={filters.region} onChange={(v) => setFilters((f) => ({ ...f, region: v }))}>
              {options.regions.map((v) => <option key={v} value={v}>{v}</option>)}
            </FilterSelect>
            <FilterSelect label="Prioritet" value={filters.priority} onChange={(v) => setFilters((f) => ({ ...f, priority: v }))}>
              {options.priorities.map((v) => <option key={v} value={v}>{v === 'NORMAL' ? 'Normal' : 'Fasttrack'}</option>)}
            </FilterSelect>
            <FilterSelect label="Status" value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
              {options.statuses.map((v) => (
                <option key={v} value={v}>
                  {v === 'ACTIVE' ? 'Aktiv' : v === 'COMPLETED' ? 'Afsluttet' : v === 'ARCHIVED' ? 'Arkiveret' : v === 'CANCELLED' ? 'Annulleret' : v}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Ansvarlig" value={filters.responsibleUser} onChange={(v) => setFilters((f) => ({ ...f, responsibleUser: v }))}>
              {options.responsibleUsers.map((v) => <option key={v} value={v}>{v}</option>)}
            </FilterSelect>
            <FilterSelect label="Håndværker" value={filters.contractor} onChange={(v) => setFilters((f) => ({ ...f, contractor: v }))}>
              {options.contractors.map((v) => <option key={v} value={v}>{v}</option>)}
            </FilterSelect>
            <FilterSelect label="SLA" value={filters.sla} onChange={(v) => setFilters((f) => ({ ...f, sla: v as Filters['sla'] }))}>
              <option value="at_risk">I risiko (&lt;7 dage)</option>
              <option value="breached">Overskredet</option>
            </FilterSelect>
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ search: filters.search, status: '', milestones: [], priority: '', region: '', sla: 'all', insurer: '', damageType: '', responsibleUser: '', contractor: '' })}
                className="text-gray-500"
              >
                <X className="h-4 w-4 mr-1" />
                Ryd filtre
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-200 animate-pulse rounded" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="font-display font-medium text-gray-500">Ingen sager matcher dine filtre</p>
          <p className="text-sm text-gray-400 mt-1">Klik "Opret sag" for at tilføje en sag manuelt</p>
        </div>
      ) : view === 'table' ? (
        <ProjectsTable projects={filtered} onRowClick={(id) => navigate(`/sedgwick/projects/${id}`)} sortField={sortField} setSort={setSort} SortIcon={SortIcon} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => <ProjectCardFull key={p.id} project={p} onClick={() => navigate(`/sedgwick/projects/${p.id}`)} />)}
        </div>
      )}
    </div>
  )
}

function ProjectsTable({
  projects,
  onRowClick,
  sortField,
  setSort,
  SortIcon,
}: {
  projects: Project[]
  onRowClick: (id: string) => void
  sortField: keyof Project
  setSort: (f: keyof Project) => void
  SortIcon: React.FC<{ field: keyof Project }>
}) {
  const cols: { key: keyof Project; label: string; sortable?: boolean }[] = [
    { key: 'claimId', label: 'Sag ID', sortable: true },
    { key: 'insuranceCompanyId', label: 'Forsikring' },
    { key: 'damageType', label: 'Skadetype', sortable: true },
    { key: 'region', label: 'Region', sortable: true },
    { key: 'priorityLevel', label: 'Prioritet' },
    { key: 'currentMilestone', label: 'Status' },
    { key: 'responsibleUserId', label: 'Ansvarlig' },
    { key: 'selectedContractorId', label: 'Håndværker' },
    { key: 'requestedDeadline', label: 'SLA' },
    { key: 'updatedAt', label: 'Opdateret', sortable: true },
  ]

  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white overflow-hidden shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-gray-50">
              {cols.map((c) => (
                <th
                  key={String(c.key)}
                  className={cn(
                    'px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500',
                    c.sortable && 'cursor-pointer hover:text-gray-700',
                  )}
                  onClick={() => c.sortable && setSort(c.key)}
                >
                  {c.label}
                  {c.sortable && <SortIcon field={c.key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr
                key={p.id}
                className="border-b border-[#e5e7eb] hover:bg-gray-50 cursor-pointer"
                onClick={() => onRowClick(p.id)}
              >
                <td className="px-4 py-2.5 font-mono text-xs font-medium text-primary-700">{p.claimId}</td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{p.insuranceCompany?.name ?? '—'}</td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{p.damageType}</td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{p.region}</td>
                <td className="px-4 py-2.5"><PriorityBadge level={p.priorityLevel} /></td>
                <td className="px-4 py-2.5"><MilestoneBadge milestone={p.currentMilestone} /></td>
                <td className="px-4 py-2.5 text-xs text-gray-600">
                  {p.responsibleUser ? (
                    <span className="flex items-center gap-1">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[10px] font-display font-semibold text-primary-700 shrink-0">
                        {p.responsibleUser.fullName.charAt(0).toUpperCase()}
                      </span>
                      {p.responsibleUser.fullName}
                    </span>
                  ) : <span className="text-gray-400 italic">Ikke tildelt</span>}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{p.selectedContractor?.companyName ?? '—'}</td>
                <td className="px-4 py-2.5"><SlaCell deadline={p.requestedDeadline} /></td>
                <td className="px-4 py-2.5 text-xs text-gray-400">{formatRelativeTime(p.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, children }: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input-field text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Alle</option>
        {children}
      </select>
    </div>
  )
}

function SlaCell({ deadline }: { deadline?: string }) {
  if (!deadline) return <span className="text-xs text-gray-400">—</span>
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  if (daysLeft < 0) return <Badge variant="danger">Brud</Badge>
  if (daysLeft <= 7) return <Badge variant="warning">{daysLeft}d</Badge>
  return <Badge variant="success">OK</Badge>
}

function ProjectCardFull({ project, onClick }: { project: Project; onClick: () => void }) {
  return (
    <Card className="hover:shadow-elevated transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-xs font-mono text-gray-400">#{project.claimId}</p>
            <h3 className="font-display font-semibold text-gray-900">{project.damageType}</h3>
          </div>
          <PriorityBadge level={project.priorityLevel} />
        </div>
        <p className="text-xs text-gray-500 mb-2">{project.address}, {project.city}</p>
        <div className="flex items-center justify-between mb-2">
          <MilestoneBadge milestone={project.currentMilestone} />
          {project.selectedContractor && (
            <span className="text-xs text-gray-500">{project.selectedContractor.companyName}</span>
          )}
        </div>
        <ProjectProgressBar currentMilestone={project.currentMilestone} compact />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-400">{formatRelativeTime(project.updatedAt)}</p>
          {project.responsibleUser ? (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary-100 text-[9px] font-display font-semibold text-primary-700">
                {project.responsibleUser.fullName.charAt(0).toUpperCase()}
              </span>
              {project.responsibleUser.fullName.split(' ')[0]}
            </span>
          ) : (
            <span className="text-xs text-gray-300 italic">Ikke tildelt</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
