import { useState } from 'react'
import { useApi } from '@/hooks/useApi'
import { formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface AuditEntry {
  id: string
  userId?: string
  userName?: string
  userRole?: string
  entityType: string
  entityId: string
  action: string
  oldValueJson?: string
  newValueJson?: string
  createdAt: string
}

const ACTION_COLORS: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'gray'> = {
  CREATE: 'success',
  UPDATE: 'info',
  APPROVE: 'success',
  REJECT: 'danger',
  SELECT: 'success',
  INVITE: 'info',
  CANCEL: 'warning',
  LOGIN_SUCCESS: 'gray',
}

export function AuditTab({ projectId }: { projectId: string }) {
  const { data: logs, loading } = useApi<AuditEntry[]>(`/projects/${projectId}/audit`)
  const [actionFilter, setActionFilter] = useState('')

  const filtered = logs?.filter((l) =>
    !actionFilter || l.action.toLowerCase().includes(actionFilter.toLowerCase()),
  ) ?? []

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Filtrer handlinger..."
          className="input-field max-w-xs"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        />
        <span className="text-sm text-gray-500">{filtered.length} hændelser</span>
      </div>

      {loading ? (
        <Skeleton />
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
          Ingen audit-hændelser fundet
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
          <div className="space-y-4 pl-12">
            {filtered.map((entry) => {
              let oldVal: Record<string, unknown> | null = null
              let newVal: Record<string, unknown> | null = null
              try { if (entry.oldValueJson) oldVal = JSON.parse(entry.oldValueJson) } catch {}
              try { if (entry.newValueJson) newVal = JSON.parse(entry.newValueJson) } catch {}
              const actionKey = entry.action.split('_')[0]
              const badgeVariant = ACTION_COLORS[actionKey] ?? 'gray'

              return (
                <div key={entry.id} className="relative">
                  <div className="absolute -left-9 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-gray-300" />
                  <div className="bg-white rounded-lg border border-[#e5e7eb] shadow-card p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={badgeVariant} className="text-xs">{entry.action}</Badge>
                        <span className="text-xs text-gray-500">{entry.entityType}</span>
                        {entry.userName && (
                          <span className="text-xs font-display font-medium text-gray-700">
                            {entry.userName}
                            {entry.userRole && <span className="text-gray-400 font-normal"> ({entry.userRole})</span>}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{formatDateTime(entry.createdAt)}</span>
                    </div>
                    {(oldVal || newVal) && (
                      <div className="mt-2 text-xs font-mono bg-gray-50 rounded p-2 space-y-1">
                        {oldVal && Object.entries(oldVal).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="text-gray-500">{k}:</span>
                            <span className="text-red-600 line-through">{String(v)}</span>
                            {newVal?.[k] !== undefined && <span className="text-green-600">→ {String(newVal[k])}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Skeleton() {
  return <div className="space-y-3 animate-pulse pl-12">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-lg" />)}</div>
}
