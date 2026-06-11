import { useMemo, useState, useCallback, useEffect } from 'react'
import { useApi, useMutation } from '@/hooks/useApi'
import { getWeekRange, formatWeekDate } from '@/lib/isoWeek'
import { getEntrepriseTypeLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Entreprise } from '@/types'

interface CheckedEntry {
  entrepriseId: string
  isoYear: number
  isoWeek: number
}

interface WeekPlanResponse {
  checked: CheckedEntry[]
}

interface Props {
  projectId: string
  entreprises: Entreprise[]
  canEdit: boolean
}

function entryKey(e: CheckedEntry) {
  return `${e.entrepriseId}:${e.isoYear}:${e.isoWeek}`
}

const TYPE_ICON: Record<string, string> = {
  CARPENTER: '🪚', MASON: '🧱', PLUMBER: '🔧', GLAZIER: '🪟',
  ELECTRICIAN: '⚡', PAINTER: '🎨', ROOFER: '🏠', OTHER: '📋',
}

export function WeekPlannerGrid({ projectId, entreprises, canEdit }: Props) {
  const weeks = useMemo(() => getWeekRange(4, 12), [])

  const { data, loading } = useApi<WeekPlanResponse>(`/projects/${projectId}/week-plan`)
  const { mutate: toggle } = useMutation<unknown, { active: boolean }>('post')

  // Local set of checked keys for optimistic updates
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [toggling, setToggling] = useState<Set<string>>(new Set())

  // Sync from API once loaded
  useEffect(() => {
    if (data?.checked) {
      setChecked(new Set(data.checked.map(entryKey)))
    }
  }, [data])

  const handleToggle = useCallback(
    async (entrepriseId: string, isoYear: number, isoWeek: number) => {
      if (!canEdit) return
      const key = `${entrepriseId}:${isoYear}:${isoWeek}`

      // Optimistic toggle
      setChecked((prev) => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
      setToggling((prev) => new Set(prev).add(key))

      const result = await toggle(`/entreprises/${entrepriseId}/week-plan`, { isoYear, isoWeek })

      if (!result) {
        // Revert on error
        setChecked((prev) => {
          const next = new Set(prev)
          if (next.has(key)) next.delete(key)
          else next.add(key)
          return next
        })
      }

      setToggling((prev) => { const n = new Set(prev); n.delete(key); return n })
    },
    [canEdit, toggle],
  )

  if (loading) {
    return (
      <div className="rounded-lg border border-[#e5e7eb] bg-white shadow-card p-4 animate-pulse">
        <div className="h-4 w-48 bg-gray-200 rounded mb-4" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded mb-2" />)}
      </div>
    )
  }

  if (entreprises.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
        Ingen relevante entrepriser registreret
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-[#e5e7eb]">
        <h3 className="text-sm font-display font-semibold text-gray-900">Ugeplanlægning</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {canEdit
            ? 'Sæt hak i de uger du forventer at arbejde på den enkelte entreprise'
            : 'Viser håndværkerens forventede arbejdsuger per entreprise'}
        </p>
      </div>

      {/* Scrollable grid */}
      <div className="overflow-x-auto">
        <table className="w-max min-w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#e5e7eb]">
              {/* Fixed label column */}
              <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-display font-semibold text-gray-500 min-w-[140px] border-r border-[#e5e7eb]">
                Entreprise
              </th>
              {weeks.map((w) => (
                <th
                  key={`${w.year}-${w.week}`}
                  className={cn(
                    'px-2 py-1.5 text-center font-display whitespace-nowrap min-w-[52px]',
                    w.isCurrent
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : w.isPast
                        ? 'bg-gray-50 text-gray-400 font-normal'
                        : 'bg-white text-gray-600 font-medium',
                  )}
                >
                  <div>U{w.week}</div>
                  <div className={cn('text-[10px] font-normal', w.isCurrent ? 'text-primary-600' : 'text-gray-400')}>
                    {formatWeekDate(w.monday)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entreprises.map((e, rowIdx) => (
              <tr
                key={e.id}
                className={cn(
                  'border-b border-[#e5e7eb] last:border-0',
                  rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50',
                )}
              >
                {/* Entreprise label */}
                <td className="sticky left-0 z-10 px-3 py-2.5 border-r border-[#e5e7eb] font-display font-medium text-gray-900 bg-inherit whitespace-nowrap">
                  <span className="mr-1.5">{TYPE_ICON[e.type] ?? '📋'}</span>
                  {getEntrepriseTypeLabel(e.type)}
                </td>

                {/* Week cells */}
                {weeks.map((w) => {
                  const key = `${e.id}:${w.year}:${w.week}`
                  const isChecked = checked.has(key)
                  const isToggling = toggling.has(key)
                  const disabled = !canEdit || isToggling

                  return (
                    <td
                      key={key}
                      className={cn(
                        'px-1.5 py-2 text-center',
                        w.isCurrent ? 'bg-primary-50/60' : w.isPast ? 'bg-gray-50/80' : '',
                      )}
                    >
                      {canEdit ? (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={disabled}
                          onChange={() => handleToggle(e.id, w.year, w.week)}
                          className={cn(
                            'h-4 w-4 rounded border-gray-300 cursor-pointer',
                            'accent-primary-600',
                            w.isPast && 'opacity-50',
                            isToggling && 'opacity-40',
                          )}
                        />
                      ) : (
                        <span className={cn('inline-block h-4 w-4 text-center leading-none', isChecked ? 'text-primary-600' : 'text-gray-200')}>
                          {isChecked ? '✓' : '—'}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[#e5e7eb] bg-gray-50">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="h-3 w-3 rounded-sm bg-primary-100 border border-primary-300" />
          Aktuel uge
        </div>
        {canEdit && (
          <p className="text-xs text-gray-400 ml-auto">
            Ændringer gemmes automatisk
          </p>
        )}
      </div>
    </div>
  )
}
