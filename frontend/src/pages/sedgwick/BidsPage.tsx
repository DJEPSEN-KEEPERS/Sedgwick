import { useNavigate } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDateTime, formatRelativeTime } from '@/lib/utils'

interface BidActivity {
  awaitingResponse: InvitationItem[]
  bidsReceived: BidItem[]
  recentDecisions: DecisionItem[]
}

interface InvitationItem {
  id: string
  projectId: string
  claimId: string
  contractorName: string
  invitedAt: string
}

interface BidItem {
  id: string
  projectId: string
  claimId: string
  contractorName: string
  bidAmount: number
  currency: string
  submittedAt: string
}

interface DecisionItem {
  id: string
  projectId: string
  claimId: string
  contractorName: string
  bidAmount: number
  currency: string
  selectedAt: string
}

export default function BidsPage() {
  const navigate = useNavigate()
  const { data, loading } = useApi<BidActivity>('/bids/overview')

  const go = (projectId: string) => navigate(`/sedgwick/projects/${projectId}?tab=bidding`)

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-6">Tilbudsoversigt</h1>

      {loading ? (
        <Skeleton />
      ) : (
        <div className="space-y-8">
          <Section title={`Afventer svar (${data?.awaitingResponse.length ?? 0})`} accent="warning">
            {!data?.awaitingResponse.length ? (
              <Empty />
            ) : (
              <div className="divide-y divide-[#e5e7eb]">
                {data.awaitingResponse.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => go(item.projectId)}>
                    <div>
                      <span className="font-mono text-xs text-primary-700 mr-2">#{item.claimId}</span>
                      <span className="text-sm font-display font-medium text-gray-900">{item.contractorName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{formatRelativeTime(item.invitedAt)}</span>
                      <Badge variant="warning">Afventer</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Modtagne tilbud (${data?.bidsReceived.length ?? 0})`} accent="info">
            {!data?.bidsReceived.length ? (
              <Empty />
            ) : (
              <div className="divide-y divide-[#e5e7eb]">
                {data.bidsReceived.map((bid) => (
                  <div key={bid.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => go(bid.projectId)}>
                    <div>
                      <span className="font-mono text-xs text-primary-700 mr-2">#{bid.claimId}</span>
                      <span className="text-sm font-display font-medium text-gray-900">{bid.contractorName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-display font-semibold text-gray-900">{formatCurrency(bid.bidAmount, bid.currency)}</span>
                      <span className="text-xs text-gray-400">{formatDateTime(bid.submittedAt)}</span>
                      <Badge variant="info">Nyt tilbud</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Trufne beslutninger (${data?.recentDecisions.length ?? 0})`} accent="success">
            {!data?.recentDecisions.length ? (
              <Empty />
            ) : (
              <div className="divide-y divide-[#e5e7eb]">
                {data.recentDecisions.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => go(d.projectId)}>
                    <div>
                      <span className="font-mono text-xs text-primary-700 mr-2">#{d.claimId}</span>
                      <span className="text-sm font-display font-medium text-gray-900">{d.contractorName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-display font-semibold text-success">{formatCurrency(d.bidAmount, d.currency)}</span>
                      <span className="text-xs text-gray-400">{formatDateTime(d.selectedAt)}</span>
                      <Badge variant="success">Valgt</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent: string }) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pt-2">{children}</CardContent>
    </Card>
  )
}

function Empty() {
  return <div className="px-4 py-6 text-center text-sm text-gray-400">Ingen elementer</div>
}

function Skeleton() {
  return <div className="space-y-6 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-lg" />)}</div>
}
