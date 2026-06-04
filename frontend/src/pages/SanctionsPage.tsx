import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, Search } from 'lucide-react'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { Alert } from '../components/Alert'
import { StatCard } from '../components/StatCard'
import { sanctionsApi, SanctionsScreening } from '../api/compliance'
import { useAuthStore } from '../store/authStore'

const statusColors: Record<string, 'red' | 'yellow' | 'green'> = {
  hit: 'red', review: 'yellow', clear: 'green',
}

export function SanctionsPage() {
  const { hasPermission } = useAuthStore()
  const [screenings, setScreenings] = useState<SanctionsScreening[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showScreen, setShowScreen] = useState(false)
  const [screening, setScreening] = useState(false)
  const [newScreen, setNewScreen] = useState({ entity_name: '', entity_type: 'entity', sanctions_list: 'OFAC_SDN' })

  // Real counts — not from page slice
  const [counts, setCounts] = useState({ hits: 0, review: 0, clear: 0 })

  const fetchScreenings = () => {
    setLoading(true)
    sanctionsApi.list({ status: filterStatus || undefined, page: 1, page_size: 20 })
      .then(data => { setScreenings(data.items); setTotal(data.total) })
      .catch(() => setError('Failed to load screenings.'))
      .finally(() => setLoading(false))
  }

  const fetchCounts = () => {
    Promise.all([
      sanctionsApi.list({ status: 'hit',    page: 1, page_size: 1 }).then(d => d.total),
      sanctionsApi.list({ status: 'review', page: 1, page_size: 1 }).then(d => d.total),
      sanctionsApi.list({ status: 'clear',  page: 1, page_size: 1 }).then(d => d.total),
    ]).then(([hits, review, clear]) => setCounts({ hits, review, clear })).catch(() => null)
  }

  useEffect(() => { fetchScreenings(); fetchCounts() }, [filterStatus])

  const handleScreen = async () => {
    setScreening(true)
    setError(null)
    try {
      await sanctionsApi.screen(newScreen)
      setShowScreen(false)
      fetchScreenings()
      fetchCounts()
    } catch (err: any) {
      setError(err?.response?.data?.detail?.message ?? 'Screening failed.')
    } finally {
      setScreening(false)
    }
  }

  const filtered = screenings.filter(s => s.entity_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Sanctions Screening</h2>
          <p className="text-sm text-gray-500">OFAC · EU · UN · HMT sanctions list screening · {total} records</p>
        </div>
        {hasPermission('sanctions:read') && (
          <button className="btn-primary" onClick={() => setShowScreen(true)}>
            <Search className="h-4 w-4" /> Screen Entity
          </button>
        )}
      </div>

      {error && <Alert variant="error" message={error} />}

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Confirmed Hits" value={counts.hits}   icon={AlertTriangle} iconColor="text-red-600" />
        <StatCard title="Under Review"   value={counts.review} icon={Shield}        iconColor="text-yellow-600" />
        <StatCard title="Clear"          value={counts.clear}  icon={CheckCircle}   iconColor="text-green-600" />
      </div>

      {showScreen && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Screen Entity</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Entity Name</label>
              <input className="input" value={newScreen.entity_name} onChange={e => setNewScreen(n => ({ ...n, entity_name: e.target.value }))} placeholder="Name to screen" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Entity Type</label>
              <select className="input" value={newScreen.entity_type} onChange={e => setNewScreen(n => ({ ...n, entity_type: e.target.value }))}>
                <option value="individual">Individual</option>
                <option value="entity">Entity</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Sanctions List</label>
              <select className="input" value={newScreen.sanctions_list} onChange={e => setNewScreen(n => ({ ...n, sanctions_list: e.target.value }))}>
                <option value="OFAC_SDN">OFAC SDN</option>
                <option value="EU_SANCTIONS">EU Sanctions</option>
                <option value="UN_SANCTIONS">UN Sanctions</option>
                <option value="HMT">HMT</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" onClick={handleScreen} disabled={screening || !newScreen.entity_name}>
              {screening ? <Spinner size="sm" /> : 'Run Screening'}
            </button>
            <button className="btn-secondary" onClick={() => setShowScreen(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="search" placeholder="Search entity…" className="input pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Results</option>
            <option value="hit">Hit</option>
            <option value="review">Review</option>
            <option value="clear">Clear</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Entity', 'Type', 'List', 'Match', 'Score', 'Result', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.entity_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{s.entity_type}</td>
                  <td className="px-4 py-3"><span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{s.sanctions_list}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-600 capitalize">{s.match_type.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-gray-200">
                        <div className={`h-1.5 rounded-full ${s.match_score >= 80 ? 'bg-red-500' : s.match_score >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${s.match_score}%` }} />
                      </div>
                      <span className="text-xs text-gray-600">{s.match_score}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant={statusColors[s.status]} className="capitalize">{s.status}</Badge></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">No screenings yet. Screen an entity to get started.</div>
        )}
      </div>
    </div>
  )
}
