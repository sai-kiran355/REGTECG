import { useEffect, useState } from 'react'
import { AlertTriangle, FileSearch, Shield, ClipboardList, Clock, Copy, CheckCircle2, ExternalLink } from 'lucide-react'
import { StatCard } from '../components/StatCard'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { useAuthStore } from '../store/authStore'
import { casesApi, Case } from '../api/compliance'
import { useNavigate } from 'react-router-dom'

const statusColors: Record<string, 'yellow' | 'blue' | 'green' | 'gray'> = {
  open: 'yellow', in_review: 'blue', closed: 'green', pending: 'gray',
}
const riskColors: Record<string, 'red' | 'yellow' | 'green'> = {
  high: 'red', critical: 'red', medium: 'yellow', low: 'green',
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [cases, setCases] = useState<Case[]>([])
  const [total, setTotal] = useState(0)
  const [openCount, setOpenCount] = useState(0)
  const [inReviewCount, setInReviewCount] = useState(0)
  const [highRiskCount, setHighRiskCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch recent cases for the table (5 rows)
    const recentFetch = casesApi.list({ page: 1, page_size: 5 })
      .then(data => { setCases(data.items); setTotal(data.total) })

    // Fetch accurate counts for stats by status/risk
    const openFetch = casesApi.list({ status: 'open', page: 1, page_size: 1 })
      .then(data => setOpenCount(data.total))
    const reviewFetch = casesApi.list({ status: 'in_review', page: 1, page_size: 1 })
      .then(data => setInReviewCount(data.total))
    // high + critical — fetch both and sum
    const highFetch = casesApi.list({ risk_level: 'high', page: 1, page_size: 1 })
      .then(data => data.total)
    const criticalFetch = casesApi.list({ risk_level: 'critical', page: 1, page_size: 1 })
      .then(data => data.total)

    Promise.all([recentFetch, openFetch, reviewFetch, highFetch, criticalFetch])
      .then(([, , , high, critical]) => setHighRiskCount(high + critical))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const orgName = user?.organization_name || 'Your Organisation'
  const displayName = user?.full_name || (user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User')

  // Derive tenant slug from tenant_id stored in auth — same logic as authStore
  const tenantId = user?.tenant_id ?? ''

  // Portal URLs for sharing with customers
  const baseUrl = window.location.origin
  const portalApplyUrl = `${baseUrl}/portal/apply?tenant=${tenantId}`
  const portalStatusUrl = `${baseUrl}/portal/status?tenant=${tenantId}`
  const applicantLoginUrl = `${baseUrl}/apply/login?tenant=${tenantId}`

  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    })
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {displayName}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {orgName} &nbsp;·&nbsp; {today}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-green-700">All Systems Operational</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Cases"    value={total}          icon={ClipboardList} iconColor="text-blue-600"   trend={{ value: 0, label: 'total' }} />
        <StatCard title="Open Cases"     value={openCount}      icon={AlertTriangle} iconColor="text-yellow-600" trend={{ value: 0, label: 'need attention' }} />
        <StatCard title="Under Review"   value={inReviewCount}  icon={Clock}         iconColor="text-blue-600"   trend={{ value: 0, label: 'in progress' }} />
        <StatCard title="High Risk"      value={highRiskCount}  icon={Shield}        iconColor="text-red-600"    trend={{ value: 0, label: 'flagged' }} />
      </div>

      {/* Recent Cases */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="font-semibold text-gray-900">Recent Cases</h3>
          <button onClick={() => navigate('/cases')} className="text-sm font-medium text-blue-600 hover:text-blue-700">
            View all →
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : cases.length === 0 ? (
          <div className="py-12 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No cases yet</p>
            <p className="text-xs text-gray-400 mt-1">Cases created from the KYC portal will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {cases.map(c => (
              <div
                key={c.id}
                onClick={() => navigate(`/cases/${c.id}`)}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{c.subject_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{c.case_type} · {c.case_number} · {new Date(c.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={riskColors[c.risk_level]} className="capitalize">{c.risk_level}</Badge>
                  <Badge variant={statusColors[c.status]} className="capitalize">{c.status.replace('_', ' ')}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Start KYC Verification', desc: 'Verify a new customer identity', icon: FileSearch, color: 'bg-blue-50 text-blue-600', action: () => navigate('/kyc') },
          { label: 'Screen for Sanctions', desc: 'Check against OFAC, EU, UN lists', icon: Shield, color: 'bg-red-50 text-red-600', action: () => navigate('/sanctions') },
          { label: 'Review AML Alerts', desc: 'Monitor suspicious transactions', icon: AlertTriangle, color: 'bg-orange-50 text-orange-600', action: () => navigate('/aml') },
        ].map(item => (
          <button
            key={item.label}
            onClick={item.action}
            className="card p-5 text-left hover:border-blue-200 hover:shadow-sm transition-all flex items-start gap-4"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Customer Portal Links — share these with your customers */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-1">
          <ExternalLink className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Customer Portal Links</h3>
        </div>
        <p className="text-sm text-gray-500 mb-5">Share these links with your customers so they can apply for KYC or check their application status.</p>
        <div className="space-y-3">
          {[
            { label: 'KYC Application Form', desc: 'Customer fills 3-step KYC form (no account needed)', url: portalApplyUrl, key: 'apply' },
            { label: 'Application Status Check', desc: 'Customer tracks their application by reference number', url: portalStatusUrl, key: 'status' },
            { label: 'Customer Account Portal', desc: 'Customer login/signup to manage all their applications', url: applicantLoginUrl, key: 'login' },
          ].map(link => (
            <div key={link.key} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{link.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{link.desc}</p>
                <p className="text-xs font-mono text-blue-600 mt-1 truncate">{link.url}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={link.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" /> Open
                </a>
                <button
                  onClick={() => copyToClipboard(link.url, link.key)}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {copiedKey === link.key
                    ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Copied</>
                    : <><Copy className="h-3.5 w-3.5" /> Copy</>
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
