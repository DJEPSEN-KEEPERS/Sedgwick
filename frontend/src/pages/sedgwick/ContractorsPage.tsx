import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Star } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Contractor } from '@/types'

export default function ContractorsPage() {
  const navigate = useNavigate()
  const { data: contractors, loading } = useApi<Contractor[]>('/contractors?pageSize=200')
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [sortBy, setSortBy] = useState<'companyName' | 'sedgwickRatingAvg' | 'currentWorkload'>('companyName')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filtered = useMemo(() => {
    if (!contractors) return []
    let list = [...contractors]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) => c.companyName.toLowerCase().includes(q) || c.cvrNumber.includes(q) || c.contactName.toLowerCase().includes(q),
      )
    }
    if (regionFilter) {
      list = list.filter((c) => c.regions.some((r) => r.toLowerCase().includes(regionFilter.toLowerCase())))
    }
    list.sort((a, b) => {
      const av = sortBy === 'companyName' ? a[sortBy] : a[sortBy]
      const bv = sortBy === 'companyName' ? b[sortBy] : b[sortBy]
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
    return list
  }, [contractors, search, regionFilter, sortBy, sortDir])

  const setSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(field); setSortDir('asc') }
  }

  const SortMark = ({ field }: { field: typeof sortBy }) =>
    sortBy === field ? <span className="ml-0.5 text-primary-600">{sortDir === 'asc' ? '↑' : '↓'}</span> : null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Håndværkere</h1>
        <span className="text-sm text-gray-500">{filtered.length} virksomheder</span>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Søg navn, CVR..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Input placeholder="Region..." className="w-36" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}</div>
      ) : (
        <div className="rounded-lg border border-[#e5e7eb] bg-white shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb] bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500 cursor-pointer hover:text-gray-700" onClick={() => setSort('companyName')}>
                    Virksomhed <SortMark field="companyName" />
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">CVR</th>
                  <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">Regioner</th>
                  <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">Kompetencer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500 cursor-pointer hover:text-gray-700" onClick={() => setSort('currentWorkload')}>
                    Arbejdsbyrde <SortMark field="currentWorkload" />
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500 cursor-pointer hover:text-gray-700" onClick={() => setSort('sedgwickRatingAvg')}>
                    Bedømmelse <SortMark field="sedgwickRatingAvg" />
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Ingen håndværkere matcher din søgning</td></tr>
                ) : (
                  filtered.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-[#e5e7eb] hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/sedgwick/contractors/${c.id}`)}
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-display font-semibold text-gray-900">{c.companyName}</p>
                        <p className="text-xs text-gray-500">{c.contactName}</p>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{c.cvrNumber}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {c.regions.slice(0, 2).map((r, i) => <Badge key={i} variant="gray" className="text-xs">{r}</Badge>)}
                          {c.regions.length > 2 && <Badge variant="gray" className="text-xs">+{c.regions.length - 2}</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {c.skills.slice(0, 3).map((s) => <Badge key={s.id} variant="default" className="text-xs">{s.name}</Badge>)}
                          {c.skills.length > 3 && <Badge variant="gray" className="text-xs">+{c.skills.length - 3}</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Progress value={(c.currentWorkload / c.maxParallelProjects) * 100} className="h-1.5 w-16" />
                          <span className="text-xs text-gray-500">{c.currentWorkload}/{c.maxParallelProjects}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <StarRating value={c.sedgwickRatingAvg} />
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={c.status === 'active' ? 'success' : 'gray'}>
                          {c.status === 'active' ? 'Aktiv' : c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={cn('h-3.5 w-3.5', s <= Math.round(value) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300')} />
      ))}
      <span className="ml-1 text-xs text-gray-600">{value.toFixed(1)}</span>
    </div>
  )
}
