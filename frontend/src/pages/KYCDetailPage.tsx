import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, FileText, CheckCircle, XCircle, Trash2, Eye, RefreshCw, MessageCircle } from 'lucide-react'
import { kycApi, KYCRecord } from '../api/compliance'
import { apiClient } from '../api/client'
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

const DOC_LABELS: Record<string, string> = {
  aadhaar_front: 'Aadhaar Front',
  aadhaar_back: 'Aadhaar Back',
  pan_card: 'PAN Card',
  selfie: 'Selfie',
}

function DocumentViewer({ kycId, docType, label }: { kycId: string; docType: string; label: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Fetch the document as a blob using the authenticated API client
    apiClient.get(`/api/v1/portal/documents/${kycId}/${docType}`, { responseType: 'blob' })
      .then(r => {
        const objectUrl = URL.createObjectURL(r.data)
        setUrl(objectUrl)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [kycId, docType])

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</p>
      <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 h-40 flex items-center justify-center">
        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="text-xs text-gray-400">Not uploaded</p>
        ) : url ? (
          <a href={url} target="_blank" rel="noreferrer" title="Click to view full size">
            <img src={url} alt={label} className="h-40 w-full object-cover hover:opacity-90 transition-opacity cursor-pointer" />
          </a>
        ) : null}
      </div>
      {url && (
        <a href={url} target="_blank" rel="noreferrer"
          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
          <Eye className="h-3.5 w-3.5" /> View full size
        </a>
      )}
    </div>
  )
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
  const [requestingReupload, setRequestingReupload] = useState(false)
  const [reuploadSuccess, setReuploadSuccess] = useState<string | null>(null)

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

  const handleRequestReupload = async (docLabel: string) => {
    if (!record?.case_id) return
    setRequestingReupload(true)
    try {
      // Set case status to in_review
      await kycApi.review(record.id, { status: 'in_review', notes: `Re-upload requested for: ${docLabel}` })
      // Send chat message to applicant automatically
      await apiClient.post(`/api/v1/chat/${record.case_id}/messages`, {
        message: `⚠️ Action Required: Your ${docLabel} could not be verified. Please re-upload a clear, readable copy of your ${docLabel}. Make sure the image is well-lit and all details are visible.`
      })
      const updated = await kycApi.get(record.id)
      setRecord(updated)
      setReuploadSuccess(`Re-upload requested for ${docLabel}. Applicant has been notified via chat.`)
    } catch {
      setError('Failed to request re-upload.')
    } finally {
      setRequestingReupload(false)
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
              <button onClick={() => handleReview('rejected')} disabled={reviewing}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                {reviewing ? <Spinner size="sm" /> : <><XCircle className="h-4 w-4" /> Reject</>}
              </button>
            </>
          )}
          {hasPermission('kyc:write') && (record.status === 'pending' || record.status === 'in_review') && (
            <div className="relative group">
              <button disabled={requestingReupload}
                className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50">
                {requestingReupload ? <Spinner size="sm" /> : <><RefreshCw className="h-3.5 w-3.5" /> Request Re-upload</>}
              </button>
              {/* Dropdown for which doc */}
              <div className="absolute right-0 top-full mt-1 z-10 hidden group-hover:block bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[180px]">
                {Object.entries(DOC_LABELS).map(([key, label]) => (
                  <button key={key} onClick={() => handleRequestReupload(label)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors">
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {record.case_id && (
            <button onClick={() => navigate(`/cases/${record.case_id}/chat`)}
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors">
              <MessageCircle className="h-3.5 w-3.5" /> Chat
            </button>
          )}
          {hasPermission('admin:users') && (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {error && <Alert variant="error" message={error} />}
      {reuploadSuccess && <Alert variant="success" message={reuploadSuccess} />}

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
            {record.application_purpose && (
              <div className="flex justify-between">
                <span className="text-gray-500">Purpose of Application</span>
                <span className="font-medium capitalize">{record.application_purpose.replace(/_/g, ' ')}</span>
              </div>
            )}
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
        </div>
      </div>

      {/* Uploaded Documents — viewable by staff */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <Eye className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Uploaded Documents</h3>
            <p className="text-xs text-gray-500">
              Click any image to view full size · Use "Request Re-upload" above to notify the applicant to re-submit a document
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {Object.entries(DOC_LABELS).map(([key, label]) => (
            <DocumentViewer key={key} kycId={record.id} docType={key} label={label} />
          ))}
        </div>
      </div>
    </div>
  )
}
