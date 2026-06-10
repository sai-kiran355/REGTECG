import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, BriefcaseBusiness, MapPin, Clock, Users,
  ChevronRight, Pencil, Trash2, ToggleLeft, ToggleRight, Share2, Copy,
} from 'lucide-react'
import { recruitmentApi, Job } from '../../api/recruitment'
import { Spinner } from '../../components/Spinner'
import { Alert } from '../../components/Alert'
import { FintechLayout } from './FintechLayout'
import { useAuthStore } from '../../store/authStore'

const STATUS_COLORS: Record<string, string> = {
  open:   'bg-green-100 text-green-700',
  draft:  'bg-gray-100 text-gray-600',
  paused: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-red-100 text-red-700',
}

const EMP_LABELS: Record<string, string> = {
  full_time:  'Full Time',
  part_time:  'Part Time',
  contract:   'Contract',
  internship: 'Internship',
}

export function JobsPage() {
  const navigate = useNavigate()
  const { user, tenantSlug: storedSlug } = useAuthStore()

  // Use the real tenant slug from the profile (stored after login)
  // Fall back to deriving from org name if not yet stored
  const companySlug = user?.tenant_slug
    || storedSlug
    || (user?.organization_name
      ? user.organization_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : '')

  const [copied, setCopied] = useState(false)
  const portalUrl = `${window.location.origin}/careers?company=${companySlug}`

  const handleCopyPortal = () => {
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const data = await recruitmentApi.listJobs({ status: statusFilter || undefined, page_size: 50 })
      setJobs(data.items)
      setTotal(data.total)
    } catch {
      setError('Failed to load jobs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(() => {
      recruitmentApi.listJobs({ status: statusFilter || undefined, page_size: 50 })
        .then(data => {
          setJobs(data.items)
          setTotal(data.total)
        })
        .catch(err => {
          console.debug("Background jobs fetch failed", err)
        })
    }, 10000)

    return () => clearInterval(interval)
  }, [statusFilter])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this job and all its candidates?')) return
    setDeleting(id)
    try {
      await recruitmentApi.deleteJob(id)
      setJobs(prev => prev.filter(j => j.id !== id))
    } catch {
      setError('Failed to delete job.')
    } finally {
      setDeleting(null)
    }
  }

  const handleToggleStatus = async (job: Job) => {
    const newStatus = job.status === 'open' ? 'paused' : 'open'
    try {
      const updated = await recruitmentApi.updateJob(job.id, { status: newStatus })
      setJobs(prev => prev.map(j => j.id === updated.id ? updated : j))
    } catch {
      setError('Failed to update job status.')
    }
  }

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.department.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <FintechLayout title="Jobs" subtitle="Manage your open positions and hiring pipeline">
      <div className="space-y-6">

        {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

        {/* Public portal link */}
        {companySlug && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <Share2 className="h-5 w-5 text-violet-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-violet-900">Public Job Portal</p>
                <p className="text-xs text-violet-600 truncate">{portalUrl}</p>
              </div>
            </div>
            <button
              onClick={handleCopyPortal}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        )}

        {/* Header actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="draft">Draft</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <button
            onClick={() => navigate('/fintech/jobs/new')}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" /> Post a Job
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Jobs', value: total },
            { label: 'Open', value: jobs.filter(j => j.status === 'open').length },
            { label: 'Total Candidates', value: jobs.reduce((s, j) => s + j.candidate_count, 0) },
            { label: 'Closed', value: jobs.filter(j => j.status === 'closed').length },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Jobs list */}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-gray-100 bg-white">
            <BriefcaseBusiness className="h-12 w-12 text-gray-200 mb-4" />
            <p className="text-sm font-medium text-gray-500">No jobs found</p>
            <p className="text-xs text-gray-400 mt-1">Post your first job to start hiring</p>
            <button
              onClick={() => navigate('/fintech/jobs/new')}
              className="mt-5 flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              <Plus className="h-4 w-4" /> Post a Job
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(job => (
              <div key={job.id} className="group rounded-2xl border border-gray-100 bg-white p-5 hover:border-violet-200 hover:shadow-sm transition-all duration-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3
                        className="font-semibold text-gray-900 hover:text-violet-700 cursor-pointer transition-colors truncate"
                        onClick={() => navigate(`/fintech/jobs/${job.id}`)}
                      >
                        {job.title}
                      </h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[job.status]}`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <BriefcaseBusiness className="h-3.5 w-3.5" />{job.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />{job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />{EMP_LABELS[job.employment_type]}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {job.candidate_count} candidate{job.candidate_count !== 1 ? 's' : ''}
                      </span>
                      {(job.salary_min || job.salary_max) && (
                        <span className="text-violet-600 font-medium">
                          ₹{job.salary_min ? `${(job.salary_min / 100000).toFixed(1)}L` : '—'}
                          {job.salary_max ? ` – ₹${(job.salary_max / 100000).toFixed(1)}L` : '+'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleStatus(job)}
                      title={job.status === 'open' ? 'Pause hiring' : 'Resume hiring'}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                      {job.status === 'open'
                        ? <ToggleRight className="h-4 w-4 text-green-500" />
                        : <ToggleLeft className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => navigate(`/fintech/jobs/${job.id}/edit`)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      disabled={deleting === job.id}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      {deleting === job.id ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => navigate(`/fintech/jobs/${job.id}`)}
                      className="flex items-center gap-1.5 rounded-xl bg-violet-50 border border-violet-200 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 transition-colors"
                    >
                      View Pipeline <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FintechLayout>
  )
}
