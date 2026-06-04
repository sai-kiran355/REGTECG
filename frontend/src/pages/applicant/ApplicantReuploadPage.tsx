import { useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, Upload, CheckCircle, AlertCircle, FileImage } from 'lucide-react'
import axios from 'axios'
import { useApplicantStore } from '../../store/applicantStore'
import { Spinner } from '../../components/Spinner'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

const DOC_LABELS: Record<string, string> = {
  aadhaar_front: 'Aadhaar Front',
  aadhaar_back: 'Aadhaar Back',
  pan_card: 'PAN Card',
  selfie: 'Selfie / Photo',
}

const DOC_TIPS: Record<string, string> = {
  aadhaar_front: 'Upload the front side of your Aadhaar card. Make sure all 12 digits and your name are clearly visible.',
  aadhaar_back: 'Upload the back side of your Aadhaar card. Make sure the address and barcode are clearly visible.',
  pan_card: 'Upload your PAN card. Make sure your name, date of birth, and PAN number are clearly readable.',
  selfie: 'Take a clear selfie in good lighting. Your face should be clearly visible, looking straight at the camera.',
}

export function ApplicantReuploadPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { accessToken, isAuthenticated, tenantSlug: storedSlug } = useApplicantStore()

  const caseId = params.get('case') ?? ''
  const docType = params.get('doc') ?? ''
  const tenantSlug = params.get('tenant') || storedSlug || ''

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!isAuthenticated) {
    navigate(`/apply/login${tenantSlug ? `?tenant=${tenantSlug}` : ''}`)
    return null
  }

  if (!caseId || !docType || !DOC_LABELS[docType]) {
    navigate(`/apply/home${tenantSlug ? `?tenant=${tenantSlug}` : ''}`)
    return null
  }

  const label = DOC_LABELS[docType]
  const tip = DOC_TIPS[docType]
  const bankName = tenantSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
      setError('File is too large. Maximum size is 5 MB.')
      return
    }
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(f.type)) {
      setError('Only JPEG, PNG, or PDF files are accepted.')
      return
    }
    setFile(f)
    setError(null)
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setPreview(e.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }

  const handleUpload = async () => {
    if (!file || !accessToken) return
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      await axios.post(
        `${BASE_URL}/api/v1/portal/reupload/${caseId}/${docType}`,
        form,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Tenant-ID': tenantSlug,
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      setSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.detail?.message ?? 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-9 w-9 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Document Uploaded</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your {label} has been re-uploaded successfully. The compliance team will review it shortly.
          </p>
          <button
            onClick={() => navigate(`/apply/home${tenantSlug ? `?tenant=${tenantSlug}` : ''}`)}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Back to My Applications
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(`/apply/home${tenantSlug ? `?tenant=${tenantSlug}` : ''}`)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{bankName}</p>
            <p className="text-xs text-gray-500">Re-upload Document</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        {/* Action required banner */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-4">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Action Required</p>
            <p className="text-sm text-amber-700 mt-0.5">
              The compliance team could not verify your <strong>{label}</strong>. Please upload a new, clearer copy below.
            </p>
          </div>
        </div>

        {/* Upload card */}
        <div className="card p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Upload: {label}</h2>
            <p className="text-sm text-gray-500 mt-1">{tip}</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            {preview ? (
              <div className="flex flex-col items-center gap-3">
                <img src={preview} alt="Preview" className="max-h-48 rounded-lg object-contain" />
                <p className="text-sm text-gray-500">{file?.name}</p>
                <p className="text-xs text-blue-600 font-medium">Click to change</p>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center gap-3">
                <FileImage className="h-12 w-12 text-blue-400" />
                <p className="text-sm font-medium text-gray-700">{file.name}</p>
                <p className="text-xs text-blue-600 font-medium">Click to change</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-10 w-10 text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Click to upload</p>
                  <p className="text-xs text-gray-400 mt-1">JPEG, PNG or PDF · Max 5 MB</p>
                </div>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? <><Spinner size="sm" /> Uploading…</> : <><Upload className="h-4 w-4" /> Submit Document</>}
          </button>
        </div>

        <p className="text-xs text-center text-gray-400">
          Your documents are encrypted and stored securely. Only your bank's compliance team can view them.
        </p>
      </main>
    </div>
  )
}
