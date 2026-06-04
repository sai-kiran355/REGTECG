import { useState } from 'react'
import { BarChart3, Download, FileText, TrendingUp, Calendar } from 'lucide-react'
import { Badge } from '../components/Badge'
import { Alert } from '../components/Alert'

interface Report {
  id: string
  name: string
  type: string
  period: string
  status: 'ready' | 'generating' | 'scheduled'
  size?: string
  generated?: string
}

// Static report templates — in production these would come from the API
const REPORT_TEMPLATES: Report[] = [
  { id: 'rpt-aml-monthly',    name: 'Monthly AML Summary',      type: 'AML',        period: 'Current Month', status: 'ready',      size: '—',    generated: '—' },
  { id: 'rpt-kyc-quarterly',  name: 'KYC Completion Report',    type: 'KYC',        period: 'Current Quarter', status: 'ready',    size: '—',    generated: '—' },
  { id: 'rpt-sanctions-log',  name: 'Sanctions Screening Log',  type: 'Sanctions',  period: 'Current Month', status: 'ready',      size: '—',    generated: '—' },
  { id: 'rpt-compliance',     name: 'Regulatory Compliance',    type: 'Compliance', period: 'Current Quarter', status: 'ready',    size: '—',    generated: '—' },
  { id: 'rpt-risk',           name: 'Risk Assessment Summary',  type: 'Risk',       period: 'Current Month', status: 'scheduled',  size: '—',    generated: '—' },
]

const typeColors: Record<string, 'red' | 'blue' | 'purple' | 'green' | 'yellow'> = {
  AML: 'red', KYC: 'blue', Sanctions: 'purple', Compliance: 'green', Risk: 'yellow',
}
const statusColors: Record<string, 'green' | 'blue' | 'gray'> = {
  ready: 'green', generating: 'blue', scheduled: 'gray',
}

export function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleGenerate = async (reportId: string, reportName: string) => {
    setGenerating(reportId)
    setError(null)
    setSuccess(null)
    try {
      // In production this would call a real report generation endpoint
      await new Promise(resolve => setTimeout(resolve, 1500))
      setSuccess(`${reportName} is being generated. You'll be notified when it's ready.`)
    } catch {
      setError('Failed to generate report.')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500">Compliance and regulatory reports</p>
        </div>
        <button className="btn-primary" onClick={() => handleGenerate('custom', 'Custom Report')}>
          <FileText className="h-4 w-4" /> Generate Report
        </button>
      </div>

      {error && <Alert variant="error" message={error} />}
      {success && <Alert variant="success" message={success} />}

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="rounded-lg bg-green-50 p-3 text-green-600"><BarChart3 className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold text-gray-900">4</p><p className="text-sm text-gray-500">Ready to generate</p></div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-600"><TrendingUp className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold text-gray-900">0</p><p className="text-sm text-gray-500">Generating</p></div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="rounded-lg bg-yellow-50 p-3 text-yellow-600"><Calendar className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold text-gray-900">1</p><p className="text-sm text-gray-500">Scheduled</p></div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              {['Report', 'Type', 'Period', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {REPORT_TEMPLATES.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.id}</p>
                </td>
                <td className="px-4 py-3"><Badge variant={typeColors[r.type]}>{r.type}</Badge></td>
                <td className="px-4 py-3 text-xs text-gray-600">{r.period}</td>
                <td className="px-4 py-3"><Badge variant={statusColors[r.status]} className="capitalize">{r.status}</Badge></td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleGenerate(r.id, r.name)}
                    disabled={generating === r.id}
                    className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {generating === r.id ? 'Generating…' : 'Generate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
