import { useState, useEffect } from 'react'
import { Plus, AlertTriangle, TrendingUp, DollarSign, Activity } from 'lucide-react'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { Alert } from '../components/Alert'
import { StatCard } from '../components/StatCard'
import { amlApi, AMLAlert } from '../api/compliance'
import { useAuthStore } from '../store/authStore'

const statusColors: Record<string, 'yellow' | 'blue' | 'green' | 'gray'> = {
  open: 'yellow', in_review: 'blue', closed: 'green', false_positive: 'gray',
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-red-100 text-red-800' : score >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
  return <span className={`badge ${color}`}>{score}</span>
}

export function AMLPage() {
  const { hasPermission } = useAuthStore()
  const [alerts, setAlerts] = useState<AMLAlert[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newAlert, setNewAlert] = useState({
    entity_name: '', entity_type: 'entity', alert_type: 'structuring',
    amount: '', currency: 'USD', risk_score: 50, description: '',
  })

  // Real counts — not from page slice
  const [counts, setCounts] = useState({ open: 0, in_review: 0 })

  const fetchAlerts = () => {
    setLoading(true)
    amlApi.list({ status: filterStatus || undefined, page: 1, page_size: 20 })
      .then(data => { setAlerts(data.items); setTotal(data.total) })
      .catch(() => setError('Failed to load AML alerts.'))
      .finally(() => setLoading(false))
  }

  const fetchCounts = () => {
    Promise.all([
      amlApi.list({ status: 'open',      page: 1, page_size: 1 }).then(d => d.total),
      amlApi.list({ status: 'in_review', page: 1, page_size: 1 }).then(d => d.total),
    ]).then(([open, in_review]) => setCounts({ open, in_review })).catch(() => null)
  }

  useEffect(() => { fetchAlerts(); fetchCounts() }, [filterStatus])

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      await amlApi.create({ ...newAlert, amount: parseFloat(newAlert.amount) } as any)
      setShowCreate(false)
      fetchAlerts()
      fetchCounts()
    } catch (err: any) {
      setError(err?.response?.data?.detail?.message ?? 'Failed to create alert.')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await amlApi.update(id, { status } as any)
      fetchAlerts()
      fetchCounts()
    } catch {
      setError('Failed to update alert.')
    }
  }

  const handleDeleteAlert = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this AML alert?')) return
    try {
      await amlApi.delete(id)
      fetchAlerts()
      fetchCounts()
    } catch {
      setError('Failed to delete alert.')
    }
  }

  // Aggregate stats from current page for avg score and total amount
  const avgScore = alerts.length ? Math.round(alerts.reduce((s, a) => s + a.risk_score, 0) / alerts.length) : 0
  const totalAmount = alerts.reduce((s, a) => s + Number(a.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">AML Screening</h2>
          <p className="text-sm text-gray-500">Anti-Money Laundering transaction monitoring · {total} alerts</p>
        </div>
        {hasPermission('aml:write') && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> New Alert
          </button>
        )}
      </div>

      {error && <Alert variant="error" message={error} />}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Active Alerts"  value={counts.open}      icon={AlertTriangle} iconColor="text-red-600" />
        <StatCard title="In Review"      value={counts.in_review} icon={Activity}      iconColor="text-blue-600" />
        <StatCard title="Avg Risk Score" value={avgScore}         icon={TrendingUp}    iconColor="text-orange-600" />
        <StatCard title="Total Flagged"  value={`$${(totalAmount / 1000).toFixed(0)}K`} icon={DollarSign} iconColor="text-purple-600" />
      </div>

      {showCreate && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Create AML Alert</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Entity Name</label>
              <input className="input" value={newAlert.entity_name} onChange={e => setNewAlert(n => ({ ...n, entity_name: e.target.value }))} placeholder="Individual or company name" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Entity Type</label>
              <select className="input" value={newAlert.entity_type} onChange={e => setNewAlert(n => ({ ...n, entity_type: e.target.value }))}>
                <option value="individual">Individual</option>
                <option value="entity">Entity</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Alert Type</label>
              <select className="input" value={newAlert.alert_type} onChange={e => setNewAlert(n => ({ ...n, alert_type: e.target.value }))}>
                <option value="structuring">Structuring</option>
                <option value="layering">Layering</option>
                <option value="unusual_pattern">Unusual Pattern</option>
                <option value="high_risk_country">High Risk Country</option>
                <option value="cash_intensive">Cash Intensive</option>
                <option value="round_tripping">Round Tripping</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Amount (USD)</label>
              <input type="number" className="input" value={newAlert.amount} onChange={e => setNewAlert(n => ({ ...n, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Risk Score (0-100)</label>
              <input type="number" min={0} max={100} className="input" value={newAlert.risk_score} onChange={e => setNewAlert(n => ({ ...n, risk_score: parseInt(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea className="input" rows={2} value={newAlert.description} onChange={e => setNewAlert(n => ({ ...n, description: e.target.value }))} placeholder="Alert description..." />
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" onClick={handleCreate} disabled={creating || !newAlert.entity_name || !newAlert.amount}>
              {creating ? <Spinner size="sm" /> : 'Create Alert'}
            </button>
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card p-4">
        <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_review">In Review</option>
          <option value="closed">Closed</option>
          <option value="false_positive">False Positive</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Entity', 'Alert Type', 'Amount', 'Risk Score', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {alerts.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{a.entity_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{a.entity_type}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 capitalize">{a.alert_type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">${Number(a.amount).toLocaleString()}</td>
                  <td className="px-4 py-3"><ScoreBadge score={a.risk_score} /></td>
                  <td className="px-4 py-3"><Badge variant={statusColors[a.status]} className="capitalize">{a.status.replace('_', ' ')}</Badge></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {hasPermission('aml:write') ? (
                        <>
                          {a.status === 'open' && (
                            <button onClick={() => handleUpdateStatus(a.id, 'in_review')} className="text-xs font-medium text-blue-600 hover:text-blue-700">Review</button>
                          )}
                          {(a.status === 'open' || a.status === 'in_review') && (
                            <>
                              <button onClick={() => handleUpdateStatus(a.id, 'closed')} className="text-xs font-medium text-green-600 hover:text-green-700">Close</button>
                              <button onClick={() => handleUpdateStatus(a.id, 'false_positive')} className="text-xs font-medium text-gray-500 hover:text-gray-600">False Positive</button>
                            </>
                          )}
                          {(a.status === 'closed' || a.status === 'false_positive') && (
                            <button onClick={() => handleUpdateStatus(a.id, 'open')} className="text-xs font-medium text-amber-600 hover:text-amber-700">Reopen</button>
                          )}
                          <button onClick={() => handleDeleteAlert(a.id)} className="text-xs font-medium text-red-600 hover:text-red-700 ml-2">Delete</button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 capitalize">{a.status.replace('_', ' ')}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && alerts.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">No AML alerts found.</div>
        )}
      </div>
    </div>
  )
}
