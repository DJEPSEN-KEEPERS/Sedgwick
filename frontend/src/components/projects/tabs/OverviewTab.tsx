import { useState } from 'react'
import { MapPin, Phone, Mail, UserCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useApi, useMutation } from '@/hooks/useApi'
import type { Project } from '@/types'

interface SedgwickUser { id: string; fullName: string; email: string; role: string }

export function OverviewTab({ project, onProjectUpdate }: { project: Project; onProjectUpdate?: (updated: Project) => void }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left */}
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Sagsinformation</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <Row label="Forsikringsselskab" value={project.insuranceCompany?.name} />
            <Row label="Police-nr." value={project.insurancePolicyNumber} mono />
            <Row label="Forsikrings sags-ID" value={project.insurerCaseId} mono />
            <Row label="Skadetype" value={project.damageType} />
            <Row label="Bygningstype" value={project.buildingType} />
            {project.slaCategory && <Row label="SLA-kategori" value={project.slaCategory} />}
            {project.maxApprovedPrice !== undefined && (
              <Row label="Maks godkendt pris" value={formatCurrency(project.maxApprovedPrice)} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Skadesomfang</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm text-gray-700 leading-relaxed">{project.damageDescription}</p>
            {project.estimatedScope && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-display font-medium text-gray-500 mb-1">Estimeret omfang</p>
                <p className="text-sm text-gray-700">{project.estimatedScope}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {project.requiredSkills && project.requiredSkills.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Krævede kompetencer</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-wrap gap-2">
                {project.requiredSkills.map((s) => (
                  <Badge key={s.id} variant="default">{s.name}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right */}
      <div className="space-y-4">
        {/* Ansvarlig Sedgwick-medarbejder */}
        <ResponsibleUserCard project={project} onProjectUpdate={onProjectUpdate} />

        <Card>
          <CardHeader><CardTitle className="text-sm">Datoer</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <Row label="Oprettet" value={formatDate(project.createdAt)} />
            {project.requestedStartDate && <Row label="Ønsket start" value={formatDate(project.requestedStartDate)} />}
            {project.requestedDeadline && (
              <div className="flex items-start justify-between text-sm">
                <span className="text-gray-500 text-xs font-display">Frist</span>
                <DeadlineValue deadline={project.requestedDeadline} />
              </div>
            )}
            {project.finalCompletionDate && (
              <Row label="Afsluttet" value={formatDate(project.finalCompletionDate)} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Kontakt</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                <span className="text-xs font-display font-semibold text-gray-600">
                  {project.contactName.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-display font-medium text-gray-900">{project.contactName}</p>
              </div>
            </div>
            <a href={`tel:${project.contactPhone}`} className="flex items-center gap-2 text-sm text-primary-700 hover:underline">
              <Phone className="h-3.5 w-3.5" />
              {project.contactPhone}
            </a>
            <a href={`mailto:${project.contactEmail}`} className="flex items-center gap-2 text-sm text-primary-700 hover:underline">
              <Mail className="h-3.5 w-3.5" />
              {project.contactEmail}
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Adresse</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-gray-900">{project.address}</p>
                <p className="text-sm text-gray-600">{project.postalCode} {project.city}</p>
                <p className="text-sm text-gray-500">{project.region}</p>
                {project.gpsLat && project.gpsLng && (
                  <a
                    href={`https://maps.google.com/?q=${project.gpsLat},${project.gpsLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:underline mt-1 block"
                  >
                    Åbn i Google Maps
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Responsible user card ────────────────────────────────────────────────────

function ResponsibleUserCard({
  project,
  onProjectUpdate,
}: {
  project: Project
  onProjectUpdate?: (updated: Project) => void
}) {
  const [editing, setEditing] = useState(false)
  const [selectedId, setSelectedId] = useState(project.responsibleUserId ?? '')
  const [error, setError] = useState('')

  const { data: allUsers } = useApi<SedgwickUser[]>('/users')
  const { mutate: updateProject, loading: saving } = useMutation<unknown, Project>('patch')

  // Only Sedgwick admins appear in the dropdown
  const sedgwickUsers = (allUsers ?? []).filter((u) => u.role === 'SEDGWICK_ADMIN')

  const handleSave = async () => {
    setError('')
    const result = await updateProject(`/projects/${project.id}`, {
      responsibleUserId: selectedId || null,
    })
    if (result) {
      onProjectUpdate?.(result)
      setEditing(false)
    } else {
      setError('Kunne ikke gemme — prøv igen')
    }
  }

  const current = project.responsibleUser

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <UserCheck className="h-4 w-4 text-primary-600" />
            Ansvarlig medarbejder
          </CardTitle>
          {!editing && onProjectUpdate && (
            <Button size="sm" variant="secondary" onClick={() => { setSelectedId(project.responsibleUserId ?? ''); setEditing(true) }}>
              {current ? 'Skift' : 'Tildel'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {editing ? (
          <div className="space-y-3">
            <select
              className="input-field w-full text-sm"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">— Ingen ansvarlig —</option>
              {sedgwickUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Gemmer...' : 'Gem'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Annuller</Button>
            </div>
          </div>
        ) : current ? (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100">
              <span className="text-sm font-display font-semibold text-primary-700">
                {current.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-display font-medium text-gray-900">{current.fullName}</p>
              <p className="text-xs text-gray-500">{current.email}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Ikke tildelt</p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-xs font-display text-gray-500 shrink-0">{label}</span>
      <span className={`text-xs text-gray-900 text-right ${mono ? 'font-mono' : 'font-body'}`}>{value ?? '—'}</span>
    </div>
  )
}

function DeadlineValue({ deadline }: { deadline: string }) {
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  const color = daysLeft < 0 ? 'text-danger' : daysLeft <= 7 ? 'text-warning' : 'text-gray-900'
  return (
    <span className={`text-xs font-medium ${color}`}>
      {formatDate(deadline)}
      {daysLeft < 0 ? ' (Overskredet)' : daysLeft <= 7 ? ` (${daysLeft}d tilbage)` : ''}
    </span>
  )
}
