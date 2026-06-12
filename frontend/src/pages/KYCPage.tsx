import { useState, useEffect } from 'react'
import { Plus, Search, CheckCircle, Clock, XCircle, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { Alert } from '../components/Alert'
import { StatCard } from '../components/StatCard'
import { kycApi, KYCRecord } from '../api/compliance'
import { useAuthStore } from '../store/authStore'

const statusColors: Record<string, 'green' | 'gray' | 'blue' | 'red'> = {
  verified: 'green', pending: 'gray', in_review: 'blue', rejected: 'red',
}
const riskColors: Record<string, 'green' | 'yellow' | 'red'> = {
  low: 'green', medium: 'yellow', high: 'red',
}

export function KYCPage() {
  const { hasPermission } = useAuthStore()
  const navigate = useNavigate()
  const [records, setRecords] = useState<KYCRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newRecord, setNewRecord] = useState({
    full_name: '', date_of_birth: '', nationality: 'US',
    document_type: 'passport', document_number: '', risk_level: 'low', notes: '',
  })
  const [counts, setCounts] = useState({ verified: 0, in_review: 0, pending: 0, rejected: 0 })

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{ id: string; status: string; name: string } | null>(null)

  const fetchRecords = (silent = false) => {
    if (!silent) setLoading(true)
    kycApi.list({ status: filterStatus || undefined, page: 1, page_size: 20 })
      .then(data => { setRecords(data.items); setTotal(data.total) })
      .catch(() => setError('Failed to load KYC records.'))
      .finally(() => { if (!silent) setLoading(false) })
  }

  const fetchCounts = () => {
    Promise.all([
      kycApi.list({ status: 'verified',  page: 1, page_size: 1 }).then(d => d.total),
      kycApi.list({ status: 'in_review', page: 1, page_size: 1 }).then(d => d.total),
      kycApi.list({ status: 'pending',   page: 1, page_size: 1 }).then(d => d.total),
      kycApi.list({ status: 'rejected',  page: 1, page_size: 1 }).then(d => d.total),
    ]).then(([verified, in_review, pending, rejected]) =>
      setCounts({ verified, in_review, pending, rejected })
    ).catch(() => null)
  }

  useEffect(() => {
    fetchRecords(false)
    fetchCounts()
    const interval = setInterval(() => {
      fetchRecords(true)
      fetchCounts()
    }, 5000)
    return () => clearInterval(interval)
  }, [filterStatus])

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      await kycApi.create(newRecord as any)
      setShowCreate(false)
      fetchRecords()
    } catch (err: any) {
      setError(err?.response?.data?.detail?.message ?? 'Failed to create KYC record.')
    } finally {
      setCreating(false)
    }
  }

  const handleReview = async (id: string, status: string) => {
    try {
      await kycApi.review(id, { status })
      fetchRecords()
      fetchCounts()
    } catch {
      setError('Failed to submit review.')
    }
  }

  const filtered = records.filter(r => r.full_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="card p-6 max-w-sm w-full mx-4 space-y-4 shadow-xl">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full mx-auto ${confirmAction.status === 'verified' ? 'bg-green-100' : 'bg-red-100'}`}>
              {confirmAction.status === 'verified'
                ? <CheckCircle className="h-6 w-6 text-green-600" />
                : <XCircle className="h-6 w-6 text-red-600" />
              }
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">
                {confirmAction.status === 'verified' ? 'Approve KYC?' : 'Reject KYC?'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {confirmAction.status === 'verified'
                  ? `Approve KYC for ${confirmAction.name}? This will verify their identity and automatically close the case.`
                  : `Reject KYC for ${confirmAction.name}? This will close the case as rejected.`
                }
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleReview(confirmAction.id, confirmAction.status)
                  setConfirmAction(null)
                }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
                  confirmAction.status === 'verified'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmAction.status === 'verified' ? 'Yes, Approve' : 'Yes, Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">KYC Verification</h2>
          <p className="text-sm text-gray-500">Know Your Customer identity verification · {total} records</p>
        </div>
        {hasPermission('kyc:write') && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> New KYC
          </button>
        )}
      </div>

      {error && <Alert variant="error" message={error} />}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Verified"  value={counts.verified}  icon={CheckCircle} iconColor="text-green-600" />
        <StatCard title="In Review" value={counts.in_review} icon={Clock}       iconColor="text-blue-600" />
        <StatCard title="Pending"   value={counts.pending}   icon={FileText}    iconColor="text-yellow-600" />
        <StatCard title="Rejected"  value={counts.rejected}  icon={XCircle}     iconColor="text-red-600" />
      </div>

      {showCreate && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">New KYC Record</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
              <input className="input" value={newRecord.full_name} onChange={e => setNewRecord(n => ({ ...n, full_name: e.target.value }))} placeholder="Legal full name" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date of Birth</label>
              <input type="date" className="input" value={newRecord.date_of_birth} onChange={e => setNewRecord(n => ({ ...n, date_of_birth: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nationality (ISO)</label>
              <input className="input" maxLength={2} value={newRecord.nationality} onChange={e => setNewRecord(n => ({ ...n, nationality: e.target.value.toUpperCase() }))} placeholder="US" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Document Type</label>
              <select className="input" value={newRecord.document_type} onChange={e => setNewRecord(n => ({ ...n, document_type: e.target.value }))}>
                <option value="passport">Passport</option>
                <option value="national_id">National ID</option>
                <option value="drivers_license">Driver's License</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Document Number</label>
              <input className="input" value={newRecord.document_number} onChange={e => setNewRecord(n => ({ ...n, document_number: e.target.value }))} placeholder="Document ID number" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Risk Level</label>
              <select className="input" value={newRecord.risk_level} onChange={e => setNewRecord(n => ({ ...n, risk_level: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" onClick={handleCreate} disabled={creating || !newRecord.full_name || !newRecord.date_of_birth}>
              {creating ? <Spinner size="sm" /> : 'Create Record'}
            </button>
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="search" placeholder="Search by name…" className="input pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_review">In Review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
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
                {['Full Name', 'DOB', 'Nationality', 'Document', 'Risk', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.full_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.date_of_birth}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">{r.nationality}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{r.document_type.replace('_', ' ')}</td>
                  <td className="px-4 py-3"><Badge variant={riskColors[r.risk_level]} className="capitalize">{r.risk_level}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={statusColors[r.status]} className="capitalize">{r.status.replace('_', ' ')}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/kyc/${r.id}`)} className="text-xs font-medium text-brand-600 hover:text-brand-700">View</button>
                      {hasPermission('kyc:write') && r.status === 'pending' && (
                        <>
                          <button
                            onClick={() => setConfirmAction({ id: r.id, status: 'verified', name: r.full_name })}
                            className="text-xs font-medium text-green-600 hover:text-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setConfirmAction({ id: r.id, status: 'rejected', name: r.full_name })}
                            className="text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">No KYC records found.</div>
        )}
      </div>
    </div>
  )
}
