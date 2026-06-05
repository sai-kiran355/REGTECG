import { useState, useEffect, useRef, FormEvent } from 'react'
import { useSearchParams, useParams, Link } from 'react-router-dom'
import {
  Upload, Send, CheckCircle, MapPin, Clock,
  BriefcaseBusiness, ArrowLeft, Brain,
} from 'lucide-react'
import { careersApi, PublicJob } from '../../api/careers'
import { Spinner } from '../../components/Spinner'
import { CareersLayout } from './CareersLayout'

const EMP_LABELS: Record<string, string> = {
  full_time: 'Full Time', part_time: 'Part Time',
  contract: 'Contract', internship: 'Internship',
}

export function CareersApplyPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [params] = useSearchParams()
  const companySlug = params.get('company') ?? ''

  const [company, setCompany] = useState('')
  const [job, setJob] = useState<PublicJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<{ reference: string; message: string } | null>(null)
  const [error, setError] = useState('')
  const [resume, setResume] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '',
    current_company: '', current_title: '',
    experience_years: '0', skills: '', cover_letter: '',
  })

  useEffect(() => {
    if (!companySlug || !jobId) return
    careersApi.getJob(companySlug, jobId)
      .then(data => { setCompany(data.company); setJob(data.job) })
      .catch(() => setError('This job could not be found.'))
      .finally(() => setLoading(false))
  }, [companySlug, jobId])

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [f]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!jobId || !companySlug) return
    setSubmitting(true)
    setError('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (resume) fd.append('resume', resume)
      const result = await careersApi.apply(companySlug, jobId, fd)
      setSubmitted({ reference: result.application_id, message: result.message })
      window.scrollTo(0, 0)
    } catch (err: any) {
      const msg = err?.response?.data?.detail?.message ?? 'Submission failed. Please try again.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>

  if (error && !job) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <p className="text-sm text-gray-500">{error}</p>
        <Link to={`/careers?company=${companySlug}`} className="mt-3 text-sm font-medium text-violet-600 block">← Back to all jobs</Link>
      </div>
    </div>
  )

  if (submitted) return (
    <CareersLayout companyName={company} companySlug={companySlug}>
      <div className="max-w-lg mx-auto text-center py-16 space-y-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mx-auto">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Application Submitted!</h1>
          <p className="mt-2 text-gray-500 text-sm leading-relaxed">{submitted.message}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-left space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-600" />
            <p className="text-sm font-semibold text-violet-900">AI Screening in Progress</p>
          </div>
          <p className="text-xs text-gray-500">
            Our AI is reviewing your resume against the job requirements. The hiring team will contact you soon.
          </p>
          <div className="border-t border-gray-50 pt-3">
            <p className="text-xs text-gray-400">Your Application ID</p>
            <p className="text-sm font-mono font-bold text-gray-900 mt-0.5">{submitted.reference}</p>
            <p className="text-xs text-gray-400 mt-1">Save this to track your application status</p>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <Link to={`/careers?company=${companySlug}`}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            View All Jobs
          </Link>
          <Link to={`/careers/status?company=${companySlug}`}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">
            Track Status
          </Link>
        </div>
      </div>
    </CareersLayout>
  )

  return (
    <CareersLayout companyName={company} companySlug={companySlug}>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to={`/careers?company=${companySlug}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="h-4 w-4" /> All open positions
        </Link>

        {/* Job summary */}
        {job && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
            <h1 className="text-xl font-bold text-gray-900 mb-2">{job.title}</h1>
            <div className="flex flex-wrap gap-3 text-xs text-gray-600">
              <span className="flex items-center gap-1"><BriefcaseBusiness className="h-3.5 w-3.5" />{job.department}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{EMP_LABELS[job.employment_type]}</span>
              {job.experience_min > 0 && <span>{job.experience_min}{job.experience_max ? `–${job.experience_max}` : '+'} years experience</span>}
              {(job.salary_min || job.salary_max) && (
                <span className="text-violet-700 font-medium">
                  ₹{job.salary_min ? `${(job.salary_min / 100000).toFixed(1)}L` : '—'}
                  {job.salary_max ? ` – ₹${(job.salary_max / 100000).toFixed(1)}L` : '+'} p.a.
                </span>
              )}
            </div>
          </div>
        )}

        {/* AI badge */}
        <div className="flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <Brain className="h-5 w-5 text-blue-600 shrink-0" />
          <p className="text-xs text-blue-800">
            <span className="font-semibold">AI-Powered Screening</span> — Your resume will be automatically analysed by Gemini AI against this job's requirements within seconds of applying.
          </p>
        </div>

        {/* Application form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Personal */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Full Name *</label>
                <input className="input" placeholder="Rahul Sharma" value={form.full_name} onChange={set('full_name')} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email Address *</label>
                <input type="email" className="input" placeholder="rahul@example.com" value={form.email} onChange={set('email')} required autoComplete="email" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
                <input className="input" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} />
              </div>
            </div>
          </div>

          {/* Experience */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Professional Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Current Company</label>
                <input className="input" placeholder="e.g. Infosys" value={form.current_company} onChange={set('current_company')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Current Job Title</label>
                <input className="input" placeholder="e.g. Senior Developer" value={form.current_title} onChange={set('current_title')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Years of Experience</label>
                <input type="number" className="input" min="0" max="50" value={form.experience_years} onChange={set('experience_years')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Key Skills</label>
                <input className="input" placeholder="React, Python, Node.js" value={form.skills} onChange={set('skills')} />
              </div>
            </div>
          </div>

          {/* Resume upload */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Resume / CV</h2>
              <span className="text-xs text-violet-600 font-medium">Enables AI screening</span>
            </div>
            <div
              className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                resume ? 'border-violet-300 bg-violet-50' : 'border-gray-200 hover:border-violet-300'
              }`}
              onClick={() => fileRef.current?.click()}
            >
              {resume ? (
                <div>
                  <CheckCircle className="h-8 w-8 text-violet-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-violet-700">{resume.name}</p>
                  <p className="text-xs text-violet-500 mt-1">{(resume.size / 1024).toFixed(0)} KB · Click to change</p>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600">Upload Resume</p>
                  <p className="text-xs text-gray-400 mt-1">PDF or Word document · Max 10 MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx"
              onChange={e => setResume(e.target.files?.[0] ?? null)} />
          </div>

          {/* Cover letter */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Cover Letter <span className="text-xs font-normal text-gray-400">(optional)</span></h2>
            <textarea
              className="input min-h-[100px] resize-y"
              placeholder="Tell us why you're interested in this role and what makes you a great fit..."
              value={form.cover_letter}
              onChange={set('cover_letter')}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-base font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-50">
            {submitting ? <><Spinner size="sm" /> Submitting...</> : <><Send className="h-5 w-5" /> Submit Application</>}
          </button>

          <p className="text-center text-xs text-gray-400">
            By applying, you consent to {company} reviewing your application. Your data is handled securely.
          </p>
        </form>
      </div>
    </CareersLayout>
  )
}
