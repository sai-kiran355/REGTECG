import { useState, useEffect } from 'react'
import { ClipboardList } from 'lucide-react'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { auditApi, AuditLog } from '../api/compliance'

const resultColors: Record<string, 'green' | 'red' | 'yellow'> = {
  success: 'green', failure: 'red', denied: 'yellow',
}

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    auditApi.list({ page, page_size: 20 })
      .then(data => { setLogs(data.items); setTotal(data.total) })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Audit Log</h2>
        <p className="text-sm text-gray-500">Immutable record of all system actions · {total} entries</p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Timestamp', 'User', 'Action', 'Resource', 'IP Address', 'Result'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">{log.user_email}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-mono text-xs text-gray-700">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.resource_type}/{log.resource_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.ip_address ?? '—'}</td>
                  <td className="px-4 py-3"><Badge variant={resultColors[log.result]} className="capitalize">{log.result}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && logs.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">No audit logs yet.</div>
        )}
      </div>

      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} · {total} total entries</p>
          <div className="flex gap-2">
            <button className="btn-secondary text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <button className="btn-secondary text-xs" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
