import { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, FileText, CheckCircle, Clock, AlertTriangle, LogOut, Plus, ArrowRight, MessageCircle, Settings, AlertCircle, XCircle } from 'lucide-react'
import axios from 'axios'
import { useApplicantStore } from '../../store/applicantStore'
import { Spinner } from '../../components/Spinner'
import { Badge } from '../../components/Badge'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

interface Application {
  reference_number: string
  case_id?: string
  subject_name: string
  case_type: string
  status: string
  status_label: string
  kyc_status?: string
  kyc_status_label?: string
  risk_level: string
  submitted_at: string
  updated_at: string
}

const statusColors: Record<string, 'yellow' | 'blue' | 'green' | 'gray'> = {
  open: 'yellow', in_review: 'blue', closed: 'green', pending: 'gray',
}

const statusIcons: Record<string, typeof Clock> = {
  open: Clock,
  in_review: AlertTriangle,
  closed: CheckCircle,
  pending: Clock,
}

export function ApplicantHomePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { fullName, email, accessToken, isAuthenticated, logout, tenantSlug: storedSlug } = useApplicantStore()

  // Prefer URL param, fall back to what was stored at login
  const tenantSlug = params.get('tenant') || storedSlug || ''

  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/apply/login${tenantSlug ? `?tenant=${tenantSlug}` : ''}`)
      return
    }
    axios.get(`${BASE_URL}/api/v1/applicant/applications`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'X-Tenant-ID': tenantSlug },
    })
      .then(r => setApps(r.data.applications || []))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  const handleLogout = () => {
    logout()
    navigate(`/apply/login${tenantSlug ? `?tenant=${tenantSlug}` : ''}`)
  }

  const bankName = tenantSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{bankName}</p>
              <p className="text-xs text-gray-500">Customer Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{fullName}</p>
              <p className="text-xs text-gray-500">{email}</p>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
            <Link to={`/apply/settings${tenantSlug ? `?tenant=${tenantSlug}` : ''}`}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Welcome */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <p className="text-blue-100 text-sm mb-1">Welcome back,</p>
          <h2 className="text-2xl font-bold">{fullName}</h2>
          <p className="text-blue-100 text-sm mt-1">Track your applications and start new ones below</p>
        </div>

        {/* Rejection banners */}
        {apps.filter(a => a.kyc_status === 'rejected').map(app => (
          <div key={`reject-${app.reference_number}`}
            className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Application Rejected — {app.subject_name}</p>
              <p className="text-sm text-red-700 mt-0.5">
                Your KYC application ({app.reference_number}) was not approved. You may apply again after 3 months from the submission date.
              </p>
              {app.case_id && (
                <Link to={`/apply/chat?case=${app.case_id}&tenant=${tenantSlug}`}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-red-700 underline hover:text-red-800">
                  <MessageCircle className="h-3.5 w-3.5" /> View officer message
                </Link>
              )}
            </div>
          </div>
        ))}

        {/* Action Required banners for in_review applications */}
        {apps.filter(a => a.status === 'in_review').map(app => (
          <div key={`banner-${app.reference_number}`}
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">Action Required — {app.subject_name}</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Your compliance officer has requested additional documents. Please check the chat and re-upload the requested file.
              </p>
              <div className="flex gap-2 mt-3">
                {app.case_id && (
                  <Link
                    to={`/apply/chat?case=${app.case_id}&tenant=${tenantSlug}`}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> View Message
                  </Link>
                )}
                {app.case_id && (
                  <Link
                    to={`/apply/reupload?case=${app.case_id}&tenant=${tenantSlug}`}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    Re-upload Document
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to={`/portal/apply?tenant=${tenantSlug}`}
            className="card p-5 flex items-center gap-4 hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">New Application</p>
              <p className="text-sm text-gray-500">Start KYC verification</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
          </Link>

          <Link
            to={`/portal/status?tenant=${tenantSlug}`}
            className="card p-5 flex items-center gap-4 hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Track by Reference</p>
              <p className="text-sm text-gray-500">Check application status</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
          </Link>
        </div>

        {/* Applications */}
        <div className="card">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="font-semibold text-gray-900">My Applications</h3>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : apps.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No applications yet</p>
              <p className="text-xs text-gray-400 mt-1">Start your first KYC application above</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {apps.map(app => {
                const Icon = statusIcons[app.status] ?? Clock
                return (
                  <div key={app.reference_number} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${app.status === 'closed' ? 'bg-green-50 text-green-600' : app.status === 'in_review' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{app.subject_name}</p>
                        <p className="text-xs text-gray-500">
                          {app.reference_number} · {new Date(app.submitted_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end gap-1">
                        {app.kyc_status === 'rejected' ? (
                          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">Rejected</span>
                        ) : app.kyc_status === 'verified' ? (
                          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Approved ✓</span>
                        ) : (
                          <Badge variant={statusColors[app.status]} className="text-xs">{app.status_label}</Badge>
                        )}
                        <span className="text-xs text-gray-400 capitalize">{app.case_type} verification</span>
                      </div>
                      {app.case_id && (
                        <Link
                          to={`/apply/chat?case=${app.case_id}&tenant=${tenantSlug}`}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                          title="Chat with officer"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Help */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-sm font-semibold text-blue-900 mb-1">Need help?</p>
          <p className="text-sm text-blue-700">For any queries regarding your application, please contact your branch or write to us.</p>
        </div>
      </main>
    </div>
  )
}
