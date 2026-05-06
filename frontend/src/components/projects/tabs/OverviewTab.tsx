import { MapPin, Phone, Mail, Building2, FileText, Calendar, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Project } from '@/types'

export function OverviewTab({ project }: { project: Project }) {
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
