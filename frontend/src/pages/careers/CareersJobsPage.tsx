import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  MapPin, Clock, BriefcaseBusiness, Search, ArrowRight,
  ChevronRight, Building2,
} from 'lucide-react'
import { careersApi, PublicJob } from '../../api/careers'
import { Spinner } from '../../components/Spinner'
import { CareersLayout } from './CareersLayout'

const EMP_LABELS: Record<string, string> = {
  full_time:  'Full Time',
  part_time:  'Part Time',
  contract:   'Contract',
  internship: 'Internship',
}

export function CareersJobsPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const companySlug = params.get('company') ?? ''

  const [company, setCompany] = useState('')
  const [jobs, setJobs] = useState<PublicJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')

  useEffect(() => {
    if (!companySlug) {
      setError('Invalid careers link. Please use the link provided by the company.')
      setLoading(false)
      return
    }
    careersApi.listJobs(companySlug)
      .then(data => {
        setCompany(data.company)
        setJobs(data.jobs)
      })
      .catch(() => setError('This careers page could not be found. Please check the link.'))
      .finally(() => setLoading(false))
  }, [companySlug])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <BriefcaseBusiness className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    </div>
  )

  const departments = [...new Set(jobs.map(j => j.department))]
  const filtered = jobs.filter(j => {
    const matchesSearch = j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.department.toLowerCase().includes(search.toLowerCase())
    const matchesDept = !deptFilter || j.department === deptFilter
    return matchesSearch && matchesDept
  })

  return (
    <CareersLayout companyName={company} companySlug={companySlug}>
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-violet-700 p-8 text-white mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{company}</h1>
            <p className="text-violet-200 text-sm">We're hiring — join our team</p>
          </div>
        </div>
        <p className="text-violet-100 text-sm">
          {jobs.length} open position{jobs.length !== 1 ? 's' : ''} · Apply directly — no account needed
        </p>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {departments.length > 1 && (
          <select
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d}>{d}</option>)}
          </select>
        )}
      </div>

      {/* Jobs */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 rounded-2xl border border-gray-100 bg-white">
          <BriefcaseBusiness className="h-10 w-10 text-gray-200 mb-3" />
          <p className="text-sm text-gray-500">No open positions at the moment</p>
          <p className="text-xs text-gray-400 mt-1">Check back soon — we're always growing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => (
            <Link
              key={job.id}
              to={`/careers/${job.id}?company=${companySlug}`}
              className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 hover:border-violet-200 hover:shadow-sm transition-all duration-200"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
                    {job.title}
                  </h3>
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Hiring
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <BriefcaseBusiness className="h-3.5 w-3.5" />{job.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />{job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />{EMP_LABELS[job.employment_type] ?? job.employment_type}
                  </span>
                  {job.experience_min > 0 && (
                    <span>{job.experience_min}{job.experience_max ? `–${job.experience_max}` : '+'} years exp</span>
                  )}
                  {(job.salary_min || job.salary_max) && (
                    <span className="text-violet-600 font-medium">
                      ₹{job.salary_min ? `${(job.salary_min / 100000).toFixed(1)}L` : '—'}
                      {job.salary_max ? ` – ₹${(job.salary_max / 100000).toFixed(1)}L` : '+'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <span className="hidden sm:flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white group-hover:bg-violet-700 transition-colors">
                  Apply Now <ArrowRight className="h-3.5 w-3.5" />
                </span>
                <ChevronRight className="h-5 w-5 text-gray-300 sm:hidden" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </CareersLayout>
  )
}
