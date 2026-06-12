import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { Alert } from '../components/Alert'
import { casesApi, Case } from '../api/compliance'
import { useAuthStore } from '../store/authStore'

const statusColors: Record<string, 'yellow' | 'blue' | 'green' | 'gray'> = {
  open: 'yellow', in_review: 'blue', closed: 'green', pending: 'gray',
}
const riskColors: Record<string, 'red' | 'yellow' | 'green'> = {
  high: 'red', critical: 'red', medium: 'yellow', low: 'green',
}
const typeColors: Record<string, 'red' | 'blue' | 'purple'> = {
  aml: 'red', kyc: 'blue', sanctions: 'purple',
}

export function CasesPage() {
  const { hasPermission } = useAuthStore()
  const navigate = useNavigate()
  const [cases, setCases] = useState<Case[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newCase, setNewCase] = useState({ subject_name: '', subject_type: 'individual', case_type: 'aml', risk_level: 'medium', description: '' })

  const fetchCases = async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const data = await casesApi.list({
        status: filterStatus || undefined,
        case_type: filterType || undefined,
        page,
        page_size: 20,
      })
      setCases(data.items)
      setTotal(data.total)
    } catch {
      setError('Failed to load cases.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchCases(false)
    const interval = setInterval(() => fetchCases(true), 5000)
    return () => clearInterval(interval)
  }, [filterStatus, filterType, page])

  const handleCreate = async () => {
    setCreating(true)
    try {
      await casesApi.create(newCase)
      setShowCreate(false)
      setNewCase({ subject_name: '', subject_type: 'individual', case_type: 'aml', risk_level: 'medium', description: '' })
      fetchCases()
    } catch {
      setError('Failed to create case.')
    } finally {
      setCreating(false)
    }
  }

  const filtered = cases.filter(c =>
    c.subject_name.toLowerCase().includes(search.toLowerCase()) ||
    c.case_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Case Management</h2>
          <p className="text-sm text-gray-500">{total} total cases</p>
        </div>
        {hasPermission('cases:write') && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> New Case
          </button>
        )}
      </div>

      {error && <Alert variant="error" message={error} />}

      {/* Create form */}
      {showCreate && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Create New Case</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Subject Name</label>
              <input className="input" value={newCase.subject_name} onChange={e => setNewCase(n => ({ ...n, subject_name: e.target.value }))} placeholder="Individual or entity name" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Subject Type</label>
              <select className="input" value={newCase.subject_type} onChange={e => setNewCase(n => ({ ...n, subject_type: e.target.value }))}>
                <option value="individual">Individual</option>
                <option value="entity">Entity</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Case Type</label>
              <select className="input" value={newCase.case_type} onChange={e => setNewCase(n => ({ ...n, case_type: e.target.value }))}>
                <option value="aml">AML</option>
                <option value="kyc">KYC</option>
                <option value="sanctions">Sanctions</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Risk Level</label>
              <select className="input" value={newCase.risk_level} onChange={e => setNewCase(n => ({ ...n, risk_level: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea className="input" rows={2} value={newCase.description} onChange={e => setNewCase(n => ({ ...n, description: e.target.value }))} placeholder="Case description..." />
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" onClick={handleCreate} disabled={creating || !newCase.subject_name}>
              {creating ? <Spinner size="sm" /> : 'Create Case'}
            </button>
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="search" placeholder="Search cases…" className="input pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_review">In Review</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>
          <select className="input w-auto" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}>
            <option value="">All Types</option>
            <option value="aml">AML</option>
            <option value="kyc">KYC</option>
            <option value="sanctions">Sanctions</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Case ID', 'Subject', 'Type', 'Risk', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.case_number}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.subject_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{c.subject_type}</p>
                  </td>
                  <td className="px-4 py-3"><Badge variant={typeColors[c.case_type]} className="uppercase">{c.case_type}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={riskColors[c.risk_level]} className="capitalize">{c.risk_level}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={statusColors[c.status]} className="capitalize">{c.status.replace('_', ' ')}</Badge></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/cases/${c.id}`)} className="text-xs font-medium text-brand-600 hover:text-brand-700">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">No cases found. Create your first case.</div>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
          <div className="flex gap-2">
            <button className="btn-secondary text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <button className="btn-secondary text-xs" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
