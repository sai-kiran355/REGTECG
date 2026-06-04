import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, FileText, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { kycApi, KYCRecord } from '../api/compliance'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { Alert } from '../components/Alert'
import { useAuthStore } from '../store/authStore'

const statusColors: Record<string, 'green' | 'gray' | 'blue' | 'red'> = {
  verified: 'green', pending: 'gray', in_review: 'blue', rejected: 'red',
}
const riskColors: Record<string, 'green' | 'yellow' | 'red'> = {
  low: 'green', medium: 'yellow', high: 'red',
}

export function KYCDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasPermission } = useAuthStore()
  const [record, setRecord] = useState<KYCRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    kycApi.get(id)
      .then(setRecord)
      .catch(() => setError('Failed to load KYC record.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleReview = async (status: string) => {
    if (!record) return
    setReviewing(true)
    try {
      const updated = await kycApi.review(record.id, { status, notes: 'Reviewed by compliance officer' })
      setRecord(updated)
    } catch {
      setError('Failed to submit review.')
    } finally {
      setReviewing(false)
    }
  }

  const handleDelete = async () => {
    if (!record) return
    setDeleting(true)
    try {
      await kycApi.deletePermanently(record.id)
      navigate('/kyc')
    } catch {
      setError('Failed to delete KYC record.')
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Spinner /></div>

  if (error || !record) return (
    <div className="space-y-4">
      <button onClick={() => navigate('/kyc')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4" /> Back</button>
      <Alert variant="error" message={error ?? 'Record not found.'} />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="card p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">Delete KYC Record?</h3>
              <p className="text-sm text-gray-500 mt-1">
                This will permanently delete the KYC record for <strong>{record.full_name}</strong> including all uploaded documents. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1" disabled={deleting}>Cancel</button>
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
          <button onClick={() => navigate('/kyc')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4" /> Back</button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{record.full_name}</h2>
              <Badge variant={statusColors[record.status]} className="capitalize">{record.status.replace('_', ' ')}</Badge>
              <Badge variant={riskColors[record.risk_level]} className="capitalize">{record.risk_level} risk</Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500">Submitted {new Date(record.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('kyc:write') && record.status === 'pending' && (
            <>
              <button onClick={() => handleReview('verified')} disabled={reviewing} className="btn-primary text-sm">
                {reviewing ? <Spinner size="sm" /> : <><CheckCircle className="h-4 w-4" /> Approve</>}
              </button>
              <button onClick={() => handleReview('rejected')} disabled={reviewing} className="btn-danger text-sm">
                {reviewing ? <Spinner size="sm" /> : <><XCircle className="h-4 w-4" /> Reject</>}
              </button>
            </>
          )}
          {hasPermission('admin:users') && (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
              title="Delete KYC record permanently">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100"><User className="h-5 w-5 text-blue-700" /></div>
            <h3 className="font-semibold text-gray-900">Personal Information</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Full Name</span><span className="font-medium">{record.full_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Date of Birth</span><span className="font-medium">{record.date_of_birth}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Nationality</span><span className="font-medium">{record.nationality}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge variant={statusColors[record.status]} className="capitalize">{record.status.replace('_', ' ')}</Badge></div>
            <div className="flex justify-between"><span className="text-gray-500">Risk Level</span><Badge variant={riskColors[record.risk_level]} className="capitalize">{record.risk_level}</Badge></div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100"><FileText className="h-5 w-5 text-orange-600" /></div>
            <h3 className="font-semibold text-gray-900">Document Details</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Document Type</span><span className="font-medium capitalize">{record.document_type.replace('_', ' ')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Document Number</span><span className="font-mono font-medium">{record.document_number.replace(/\d(?=\d{4})/g, 'X')}</span></div>
          </div>
          {record.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Stored Documents</p>
              <pre className="text-xs text-gray-600 bg-gray-50 rounded p-2 overflow-auto">{record.notes}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
