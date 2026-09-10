import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft, Star, Phone, Mail, MapPin } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Contractor } from '@/types'

interface ContractorDetail extends Contractor {
  sedgwickReviews: Review[]
  clientReviews: Review[]
  projectHistory: ProjectHistory[]
}

interface Review {
  id: string
  projectId: string
  score: number
  comment?: string
  createdAt: string
}

interface ProjectHistory {
  projectId: string
  claimId: string
  role: 'invited' | 'selected'
  bidStatus?: string
  outcome?: string
  date: string
}

const TABS = ['Profil', 'Performance', 'Sager', 'Anmeldelser']

export default function ContractorDetailPage() {
  const { contractorId } = useParams<{ contractorId: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const { data: contractor, loading } = useApi<ContractorDetail>(`/contractors/${contractorId}`)

  if (loading) return <Skeleton />
  if (!contractor) return <div className="text-center py-16 text-gray-500">Håndværker ikke fundet</div>

  // Guard: ensure arrays are never undefined (protects against unexpected API shapes)
  const safeContractor: ContractorDetail = {
    ...contractor,
    regions:          contractor.regions          ?? [],
    skills:           contractor.skills           ?? [],
    certifications:   contractor.certifications   ?? [],
    sedgwickReviews:  contractor.sedgwickReviews  ?? [],
    clientReviews:    contractor.clientReviews    ?? [],
    projectHistory:   contractor.projectHistory   ?? [],
  }

  return (
    <div>
      <button onClick={() => navigate('/sedgwick/contractors')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Håndværkere
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] shadow-card p-4 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-display font-bold text-gray-900">{safeContractor.companyName}</h1>
            <p className="text-sm text-gray-500 font-mono">CVR: {safeContractor.cvrNumber}</p>
            <div className="flex items-center gap-1 mt-1">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} className={cn('h-4 w-4', s <= Math.round(safeContractor.sedgwickRatingAvg ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300')} />
              ))}
              <span className="ml-1 text-sm text-gray-600">{(safeContractor.sedgwickRatingAvg ?? 0).toFixed(1)}</span>
            </div>
          </div>
          <Badge variant={safeContractor.status === 'active' ? 'success' : 'gray'}>
            {safeContractor.status === 'active' ? 'Aktiv' : safeContractor.status}
          </Badge>
        </div>
      </div>

      {/* Tab nav */}
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

      {tab === 0 && <ProfileTab contractor={safeContractor} />}
      {tab === 1 && <PerformanceTab contractor={safeContractor} />}
      {tab === 2 && <ProjectsTab history={safeContractor.projectHistory} onNavigate={(id) => navigate(`/sedgwick/projects/${id}`)} />}
      {tab === 3 && <ReviewsTab sedgwick={safeContractor.sedgwickReviews} client={safeContractor.clientReviews} />}
    </div>
  )
}

function ProfileTab({ contractor }: { contractor: ContractorDetail }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="text-sm">Kontaktoplysninger</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <p className="font-display font-medium text-gray-900">{contractor.contactName}</p>
          <a href={`tel:${contractor.contactPhone}`} className="flex items-center gap-2 text-sm text-primary-700 hover:underline">
            <Phone className="h-3.5 w-3.5" /> {contractor.contactPhone}
          </a>
          <a href={`mailto:${contractor.contactEmail}`} className="flex items-center gap-2 text-sm text-primary-700 hover:underline">
            <Mail className="h-3.5 w-3.5" /> {contractor.contactEmail}
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Kapacitet</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Aktuelle sager</span>
            <span className="font-display font-semibold text-gray-900">{contractor.currentWorkload} / {contractor.maxParallelProjects}</span>
          </div>
          <Progress value={(contractor.currentWorkload / contractor.maxParallelProjects) * 100} className="h-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Regioner</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-wrap gap-2">
            {contractor.regions.map((r, i) => <Badge key={i} variant="info">{r}</Badge>)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Kompetencer</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-wrap gap-2">
            {contractor.skills.map((s) => <Badge key={s.id} variant="default">{s.name}</Badge>)}
          </div>
        </CardContent>
      </Card>

      {contractor.certifications.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Certificeringer</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="divide-y divide-[#e5e7eb]">
              {contractor.certifications.map((cert) => (
                <div key={cert.id} className="flex items-center justify-between py-2 first:pt-0">
                  <div>
                    <p className="text-sm font-display font-medium text-gray-900">{cert.name}</p>
                    {cert.issuer && <p className="text-xs text-gray-500">{cert.issuer}</p>}
                  </div>
                  {cert.validUntil && (
                    <Badge variant={new Date(cert.validUntil) > new Date() ? 'success' : 'danger'}>
                      {formatDate(cert.validUntil)}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {contractor.description && (
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Beskrivelse</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm text-gray-700 leading-relaxed">{contractor.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PerformanceTab({ contractor }: { contractor: ContractorDetail }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {[
        { label: 'Sedgwick-rating', value: `${contractor.sedgwickRatingAvg.toFixed(1)} / 5` },
        { label: 'Klientrating', value: `${contractor.clientRatingAvg.toFixed(1)} / 5` },
        { label: 'Aktuelle sager', value: contractor.currentWorkload },
        { label: 'Maks kapacitet', value: contractor.maxParallelProjects },
      ].map(({ label, value }) => (
        <Card key={label}>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-display mb-1">{label}</p>
            <p className="text-2xl font-display font-bold text-gray-900">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ProjectsTab({ history, onNavigate }: { history: ProjectHistory[]; onNavigate: (id: string) => void }) {
  return history.length === 0 ? (
    <div className="text-center py-8 text-gray-400 text-sm">Ingen saghistorik</div>
  ) : (
    <div className="rounded-lg border border-[#e5e7eb] bg-white shadow-card overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-[#e5e7eb] bg-gray-50">
          {['Sag ID', 'Rolle', 'Tilbudsstatus', 'Udfald', 'Dato'].map((h) => (
            <th key={h} className="px-4 py-2 text-left text-xs font-display font-medium text-gray-500">{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.projectId} className="border-b border-[#e5e7eb] hover:bg-gray-50 cursor-pointer" onClick={() => onNavigate(h.projectId)}>
              <td className="px-4 py-2.5 font-mono text-xs text-primary-700">{h.claimId}</td>
              <td className="px-4 py-2.5"><Badge variant={h.role === 'selected' ? 'success' : 'gray'}>{h.role === 'selected' ? 'Valgt' : 'Inviteret'}</Badge></td>
              <td className="px-4 py-2.5 text-xs text-gray-600">{h.bidStatus ?? '—'}</td>
              <td className="px-4 py-2.5 text-xs text-gray-600">{h.outcome ?? '—'}</td>
              <td className="px-4 py-2.5 text-xs text-gray-400">{formatDate(h.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReviewsTab({ sedgwick, client }: { sedgwick: Review[]; client: Review[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ReviewList title="Sedgwick-anmeldelser" reviews={sedgwick} />
      <ReviewList title="Klientanmeldelser" reviews={client} />
    </div>
  )
}

function ReviewList({ title, reviews }: { title: string; reviews: Review[] }) {
  return (
    <div>
      <h3 className="text-sm font-display font-semibold text-gray-900 mb-3">{title}</h3>
      {reviews.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">Ingen anmeldelser</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={cn('h-3.5 w-3.5', s <= r.score ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300')} />
                  ))}
                  <span className="ml-1 text-xs text-gray-500">{formatDate(r.createdAt)}</span>
                </div>
                {r.comment && <p className="text-sm text-gray-700">{r.comment}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Skeleton() {
  return <div className="space-y-6 animate-pulse"><div className="h-8 w-32 bg-gray-200 rounded" /><div className="h-28 bg-gray-200 rounded-lg" /><div className="h-64 bg-gray-200 rounded-lg" /></div>
}
