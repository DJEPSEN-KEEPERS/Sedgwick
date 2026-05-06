import { CheckCircle2, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime, getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Bid } from '@/types'

interface BidCardProps {
  bid: Bid
  onSelect?: (bidId: string) => void
  canSelect?: boolean
}

export function BidCard({ bid, onSelect, canSelect }: BidCardProps) {
  return (
    <Card className={cn(bid.isSelected && 'ring-2 ring-success')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {bid.contractor && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-display font-semibold">
                {getInitials(bid.contractor.companyName)}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-display font-semibold text-gray-900 truncate">
                {bid.contractor?.companyName ?? 'Ukendt'}
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {formatDateTime(bid.submittedAt)}
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-lg font-display font-bold text-gray-900">
              {formatCurrency(bid.bidAmount, bid.currency)}
            </p>
            {bid.isSelected && (
              <div className="flex items-center gap-1 text-xs text-success justify-end">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Valgt
              </div>
            )}
          </div>
        </div>

        {bid.comments && (
          <p className="mt-3 text-sm text-gray-600 border-t border-gray-100 pt-3">{bid.comments}</p>
        )}

        {bid.attachments.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">{bid.attachments.length} bilag</p>
        )}

        {canSelect && !bid.isSelected && onSelect && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Button size="sm" onClick={() => onSelect(bid.id)} className="w-full">
              Vælg dette tilbud
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
