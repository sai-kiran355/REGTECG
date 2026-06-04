import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, FileText, AlertTriangle, Clock, CheckCircle, Trash2, MessageCircle } from 'lucide-react'
import { casesApi, Case } from '../api/compliance'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { Alert } from '../components/Alert'
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

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasPermission } = useAuthStore()
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    casesApi.get(id)
      .then(setCaseData)
      .catch(() => setError('Failed to load case details.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleStatusChange = async (newStatus: string) => {
    if (!caseData) return
    setUpdating(true)
    try {
      const updated = await casesApi.update(caseData.id, { status: newStatus } as any)
      setCaseData(updated)
    } catch {
      setError('Failed to update case status.')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!caseData) return
    setDeleting(true)
    try {
      await casesApi.deletePermanently(caseData.id)
      navigate('/cases')
    } catch {
      setError('Failed to delete case.')
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Spinner /></div>

  if (error || !caseData) return (
    <div className="space-y-4">
      <button onClick={() => navigate('/cases')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Cases
      </button>
      <Alert variant="error" message={error ?? 'Case not found.'} />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="card p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">Delete Case?</h3>
              <p className="text-sm text-gray-500 mt-1">
                This will permanently delete <strong>{caseData.case_number}</strong> and all associated data. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1" disabled={deleting}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleting ? <Spinner size="sm" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/cases')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{caseData.case_number}</h2>
              <Badge variant={typeColors[caseData.case_type]} className="uppercase">{caseData.case_type}</Badge>
              <Badge variant={statusColors[caseData.status]} className="capitalize">{caseData.status.replace('_', ' ')}</Badge>
              <Badge variant={riskColors[caseData.risk_level]} className="capitalize">{caseData.risk_level} risk</Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500">Created {new Date(caseData.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('cases:write') && caseData.status !== 'closed' && (
            <>
              {caseData.status === 'open' && (
                <button
                  onClick={async () => {
                    // Move case to in_review and navigate to KYC for this case
                    setUpdating(true)
                    try {
                      await casesApi.update(caseData.id, { status: 'in_review' } as any)
                      navigate(`/kyc?case=${caseData.id}`)
                    } catch {
                      setError('Failed to start review.')
                    } finally {
                      setUpdating(false)
                    }
                  }}
                  disabled={updating}
                  className="btn-secondary text-sm"
                >
                  {updating ? <Spinner size="sm" /> : 'Start Review'}
                </button>
              )}
              {caseData.status === 'in_review' && (
                <button onClick={() => handleStatusChange('closed')} disabled={updating} className="btn-primary text-sm">
                  {updating ? <Spinner size="sm" /> : 'Close Case'}
                </button>
              )}
            </>
          )}
          {/* Chat button */}
          <button
            onClick={() => navigate(`/cases/${caseData.id}/chat`)}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Chat
          </button>
          {/* Delete button — admin only, subtle */}
          {hasPermission('admin:users') && (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
              title="Delete case permanently">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <User className="h-5 w-5 text-blue-700" />
              </div>
              <h3 className="font-semibold text-gray-900">Subject Information</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-gray-500">Name</span><span className="text-sm font-medium text-gray-900">{caseData.subject_name}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Type</span><span className="text-sm font-medium text-gray-900 capitalize">{caseData.subject_type}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Case Type</span><span className="text-sm font-medium text-gray-900 uppercase">{caseData.case_type}</span></div>
            </div>
          </div>

          {caseData.description && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <FileText className="h-5 w-5 text-gray-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Case Description</h3>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{caseData.description}</p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Status Timeline</h3>
            <div className="space-y-3">
              {[
                { status: 'open', label: 'Case Opened', icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
                { status: 'in_review', label: 'Under Review', icon: AlertTriangle, color: 'text-blue-600 bg-blue-100' },
                { status: 'closed', label: 'Case Closed', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
              ].map(({ status, label, icon: Icon, color }) => {
                const statuses = ['open', 'in_review', 'closed']
                const currentIdx = statuses.indexOf(caseData.status)
                const thisIdx = statuses.indexOf(status)
                const isDone = thisIdx <= currentIdx
                return (
                  <div key={status} className={`flex items-center gap-3 ${isDone ? 'opacity-100' : 'opacity-30'}`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isDone ? color : 'bg-gray-100 text-gray-400'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`text-sm ${isDone ? 'font-medium text-gray-900' : 'text-gray-400'}`}>{label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Case ID</span><span className="font-mono text-xs text-gray-600">{caseData.id.slice(0, 8)}…</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Risk Level</span><Badge variant={riskColors[caseData.risk_level]} className="capitalize">{caseData.risk_level}</Badge></div>
              <div className="flex justify-between"><span className="text-gray-500">Created</span><span className="text-gray-700">{new Date(caseData.created_at).toLocaleDateString('en-IN')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Last Updated</span><span className="text-gray-700">{new Date(caseData.updated_at).toLocaleDateString('en-IN')}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
