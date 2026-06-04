import { useState } from 'react'
import { BarChart3, Download, FileText, Calendar, CheckCircle } from 'lucide-react'
import { Badge } from '../components/Badge'
import { Alert } from '../components/Alert'
import { Spinner } from '../components/Spinner'
import { casesApi, kycApi, amlApi, sanctionsApi } from '../api/compliance'

interface Report {
  id: string
  name: string
  type: 'KYC' | 'AML' | 'Sanctions' | 'Cases'
  description: string
}

const REPORTS: Report[] = [
  { id: 'kyc-summary',      name: 'KYC Verification Summary',   type: 'KYC',       description: 'All KYC records with status, risk level and dates' },
  { id: 'cases-summary',    name: 'Case Management Report',      type: 'Cases',     description: 'All compliance cases with type, status and risk' },
  { id: 'aml-alerts',       name: 'AML Alerts Report',           type: 'AML',       description: 'All AML alerts with risk scores and amounts' },
  { id: 'sanctions-hits',   name: 'Sanctions Screening Report',  type: 'Sanctions', description: 'All sanctions screenings with match results' },
]

const typeColors: Record<string, 'blue' | 'red' | 'purple' | 'green'> = {
  KYC: 'blue', Cases: 'green', AML: 'red', Sanctions: 'purple',
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleGenerate = async (report: Report) => {
    setGenerating(report.id)
    setError(null)
    setSuccess(null)

    try {
      let rows: string[][] = []

      if (report.id === 'kyc-summary') {
        // Fetch all KYC records (up to 500)
        const data = await kycApi.list({ page: 1, page_size: 500 })
        rows = [
          ['Full Name', 'Date of Birth', 'Nationality', 'Document Type', 'Document Number', 'Status', 'Risk Level', 'Submitted At'],
          ...data.items.map(r => [
            r.full_name, r.date_of_birth, r.nationality,
            r.document_type, r.document_number,
            r.status, r.risk_level,
            new Date(r.created_at).toLocaleDateString('en-IN'),
          ])
        ]
      } else if (report.id === 'cases-summary') {
        const data = await casesApi.list({ page: 1, page_size: 500 })
        rows = [
          ['Case Number', 'Subject Name', 'Subject Type', 'Case Type', 'Status', 'Risk Level', 'Created At', 'Updated At'],
          ...data.items.map(c => [
            c.case_number, c.subject_name, c.subject_type,
            c.case_type, c.status, c.risk_level,
            new Date(c.created_at).toLocaleDateString('en-IN'),
            new Date(c.updated_at).toLocaleDateString('en-IN'),
          ])
        ]
      } else if (report.id === 'aml-alerts') {
        const data = await amlApi.list({ page: 1, page_size: 500 })
        rows = [
          ['Entity Name', 'Entity Type', 'Alert Type', 'Amount', 'Currency', 'Risk Score', 'Status', 'Date'],
          ...data.items.map(a => [
            a.entity_name, a.entity_type, a.alert_type,
            String(a.amount), a.currency,
            String(a.risk_score), a.status,
            new Date(a.created_at).toLocaleDateString('en-IN'),
          ])
        ]
      } else if (report.id === 'sanctions-hits') {
        const data = await sanctionsApi.list({ page: 1, page_size: 500 })
        rows = [
          ['Entity Name', 'Entity Type', 'Sanctions List', 'Match Type', 'Match Score', 'Status', 'Screened At'],
          ...data.items.map(s => [
            s.entity_name, s.entity_type, s.sanctions_list,
            s.match_type, String(s.match_score),
            s.status,
            new Date(s.created_at).toLocaleDateString('en-IN'),
          ])
        ]
      }

      if (rows.length <= 1) {
        setSuccess(`${report.name} generated — no data found yet. Add some records first.`)
        return
      }

      const date = new Date().toISOString().split('T')[0]
      downloadCSV(`${report.id}-${date}.csv`, rows)
      setSuccess(`${report.name} downloaded — ${rows.length - 1} records exported.`)
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401) {
        setError('Session expired. Please log out and log in again.')
      } else if (status === 403) {
        setError('You do not have permission to generate reports.')
      } else {
        setError(`Failed to generate ${report.name}. Please try again.`)
      }
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500">Download compliance reports as CSV files</p>
        </div>
      </div>

      {error && <Alert variant="error" message={error} />}
      {success && <Alert variant="success" message={success} />}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-600"><BarChart3 className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold text-gray-900">{REPORTS.length}</p><p className="text-sm text-gray-500">Available reports</p></div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="rounded-lg bg-green-50 p-3 text-green-600"><CheckCircle className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold text-gray-900">CSV</p><p className="text-sm text-gray-500">Download format</p></div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="rounded-lg bg-yellow-50 p-3 text-yellow-600"><Calendar className="h-5 w-5" /></div>
          <div><p className="text-sm font-bold text-gray-900">{new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p><p className="text-sm text-gray-500">Today's date</p></div>
        </div>
      </div>

      {/* Reports table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              {['Report', 'Type', 'Description', 'Action'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {REPORTS.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                      <FileText className="h-4 w-4 text-gray-500" />
                    </div>
                    <p className="font-medium text-gray-900">{r.name}</p>
                  </div>
                </td>
                <td className="px-4 py-4"><Badge variant={typeColors[r.type]}>{r.type}</Badge></td>
                <td className="px-4 py-4 text-xs text-gray-500 max-w-xs">{r.description}</td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => handleGenerate(r)}
                    disabled={generating === r.id}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {generating === r.id ? (
                      <><Spinner size="sm" /> Generating…</>
                    ) : (
                      <><Download className="h-3.5 w-3.5" /> Download CSV</>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Reports are generated from live data and downloaded directly to your device.
      </p>
    </div>
  )
}
