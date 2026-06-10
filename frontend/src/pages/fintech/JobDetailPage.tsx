import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Upload, Brain, Star, Mail, Phone,
  BriefcaseBusiness, ChevronDown, FileText, Pencil, Check, Trash2, UserCheck,
} from 'lucide-react'
import { recruitmentApi, Job, Candidate, AIScreeningResult, PipelineStats } from '../../api/recruitment'
import { Spinner } from '../../components/Spinner'
import { Alert } from '../../components/Alert'
import { FintechLayout } from './FintechLayout'
import { useAuthStore } from '../../store/authStore'

const STAGES: { key: Candidate['stage']; label: string; color: string }[] = [
  { key: 'applied',   label: 'Applied',    color: 'bg-gray-100 text-gray-700' },
  { key: 'screening', label: 'Screening',  color: 'bg-blue-100 text-blue-700' },
  { key: 'interview', label: 'Interview',  color: 'bg-yellow-100 text-yellow-700' },
  { key: 'offer',     label: 'Offer',      color: 'bg-purple-100 text-purple-700' },
  { key: 'hired',     label: 'Hired',      color: 'bg-green-100 text-green-700' },
  { key: 'rejected',  label: 'Rejected',   color: 'bg-red-100 text-red-700' },
]

const RECOMMENDATION_CONFIG = {
  strong_yes: { label: 'Strong Yes', color: 'text-green-700 bg-green-100' },
  yes:        { label: 'Hire',       color: 'text-blue-700 bg-blue-100' },
  maybe:      { label: 'Maybe',      color: 'text-yellow-700 bg-yellow-100' },
  no:         { label: 'Pass',       color: 'text-red-700 bg-red-100' },
}

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()

  const [job, setJob] = useState<Job | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<string>('')
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [screeningResult, setScreeningResult] = useState<AIScreeningResult | null>(null)
  const [screening, setScreening] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const fetchAll = async () => {
    if (!jobId) return
    try {
      const [j, c, s] = await Promise.all([
        recruitmentApi.getJob(jobId),
        recruitmentApi.listCandidates(jobId, { page_size: 100 }),
        recruitmentApi.getPipelineStats(jobId),
      ])
      setJob(j)
      setCandidates(c.items)
      setStats(s)
    } catch {
      setError('Failed to load job details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(() => {
      if (jobId) {
        Promise.all([
          recruitmentApi.getJob(jobId),
          recruitmentApi.listCandidates(jobId, { page_size: 100 }),
          recruitmentApi.getPipelineStats(jobId),
        ]).then(([j, c, s]) => {
          setJob(j)
          setCandidates(c.items)
          setStats(s)
          // If the currently selected candidate's stage/details were updated in the background (e.g. by AI), refresh selectedCandidate state
          if (selectedCandidate) {
            const updated = c.items.find(item => item.id === selectedCandidate.id)
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedCandidate)) {
              setSelectedCandidate(updated)
            }
          }
        }).catch(err => {
          console.debug("Background fetch failed", err)
        })
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [jobId, selectedCandidate])

  const handleStageChange = async (candidate: Candidate, stage: string) => {
    try {
      const updated = await recruitmentApi.updateStage(candidate.id, stage)
      setCandidates(prev => prev.map(c => c.id === updated.id ? updated : c))
      if (selectedCandidate?.id === candidate.id) setSelectedCandidate(updated)
      const s = await recruitmentApi.getPipelineStats(jobId!)
      setStats(s)
    } catch {
      setError('Failed to update stage.')
    }
  }

  const handleScreen = async (candidate: Candidate) => {
    setScreening(true)
    setScreeningResult(null)
    try {
      const result = await recruitmentApi.screenCandidate(candidate.id)
      setScreeningResult(result)
      const updated = await recruitmentApi.getCandidate(candidate.id)
      setCandidates(prev => prev.map(c => c.id === updated.id ? updated : c))
      setSelectedCandidate(updated)
    } catch (err: any) {
      const code = err?.response?.data?.detail?.code
      if (code === 'NO_RESUME') {
        setError('Please upload a resume first before running AI screening.')
      } else {
        setError('AI screening failed. Check your Gemini API key in backend .env.')
      }
    } finally {
      setScreening(false)
    }
  }

  const handleDeleteCandidate = async (candidate: Candidate) => {
    if (!confirm('Are you sure you want to delete this applicant?')) return
    try {
      await recruitmentApi.deleteCandidate(candidate.id)
      setCandidates(prev => prev.filter(c => c.id !== candidate.id))
      setSelectedCandidate(null)
      setScreeningResult(null)
      const s = await recruitmentApi.getPipelineStats(jobId!)
      setStats(s)
    } catch {
      setError('Failed to delete candidate.')
    }
  }

  const handlePromote = async (candidate: Candidate) => {
    setPromoting(true)
    setError(null)
    try {
      await recruitmentApi.promoteCandidate(candidate.id)
      navigate('/fintech/employees')
    } catch (err: any) {
      const msg = err?.response?.data?.detail?.message ?? 'Failed to onboard candidate to employees.'
      setError(msg)
    } finally {
      setPromoting(false)
    }
  }

  const filtered = stageFilter ? candidates.filter(c => c.stage === stageFilter) : candidates

  if (loading) return (
    <FintechLayout title="Job">
      <div className="flex justify-center py-20"><Spinner /></div>
    </FintechLayout>
  )

  if (!job) return (
    <FintechLayout title="Not Found">
      <Alert variant="error" message="Job not found." />
    </FintechLayout>
  )

  return (
    <FintechLayout title={job.title} subtitle={`${job.department} · ${job.location}`}>
      <div className="space-y-6">
        {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/fintech/jobs')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Jobs
          </button>
          <div className="flex gap-3">
            <button onClick={() => navigate(`/fintech/jobs/${jobId}/edit`)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Pencil className="h-4 w-4" /> Edit Job
            </button>
            <button onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors">
              <Plus className="h-4 w-4" /> Add Candidate
            </button>
          </div>
        </div>

        {/* Pipeline stats */}
        {stats && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {STAGES.map(s => (
              <button
                key={s.key}
                onClick={() => setStageFilter(stageFilter === s.key ? '' : s.key)}
                className={`rounded-2xl border p-3 text-center transition-all ${
                  stageFilter === s.key ? 'border-violet-300 bg-violet-50' : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <p className="text-xl font-bold text-gray-900">{stats[s.key]}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </button>
            ))}
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Candidate list */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                {filtered.length} Candidate{filtered.length !== 1 ? 's' : ''}
                {stageFilter && <span className="ml-1 text-violet-600">· {stageFilter}</span>}
              </p>
              {stageFilter && (
                <button onClick={() => setStageFilter('')} className="text-xs text-gray-400 hover:text-gray-600">
                  Clear filter
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-12 rounded-2xl border border-gray-100 bg-white">
                <BriefcaseBusiness className="h-10 w-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-500">No candidates yet</p>
                <button onClick={() => setShowAddForm(true)}
                  className="mt-3 text-xs font-medium text-violet-600 hover:text-violet-700">
                  Add the first candidate →
                </button>
              </div>
            ) : (
              filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCandidate(c); setScreeningResult(null) }}
                  className={`w-full text-left rounded-2xl border p-4 transition-all ${
                    selectedCandidate?.id === c.id
                      ? 'border-violet-300 bg-violet-50 shadow-sm'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {c.full_name}
                        {c.ai_score !== null && c.ai_score < 80 && c.stage === 'rejected' && (
                          <span className="ml-2 inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Auto-filtered by AI" />
                        )}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{c.current_title ?? c.email}</p>
                      {c.current_company && (
                        <p className="text-xs text-gray-400 truncate">{c.current_company}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {c.ai_score !== null && (
                        <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                          c.ai_score >= 75 ? 'bg-green-100 text-green-700' :
                          c.ai_score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          <Star className="h-3 w-3" /> {c.ai_score}
                        </div>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGES.find(s => s.key === c.stage)?.color ?? ''}`}>
                        {c.stage}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Candidate detail panel */}
          <div className="lg:col-span-3">
            {selectedCandidate ? (
              <CandidateDetailPanel
                candidate={selectedCandidate}
                job={job}
                screeningResult={screeningResult}
                screening={screening}
                onScreen={() => handleScreen(selectedCandidate)}
                onStageChange={(stage) => handleStageChange(selectedCandidate, stage)}
                onDelete={() => handleDeleteCandidate(selectedCandidate)}
                onPromote={() => handlePromote(selectedCandidate)}
                promoting={promoting}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 rounded-2xl border border-gray-100 bg-white">
                <FileText className="h-10 w-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-500">Select a candidate to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Add candidate modal */}
        {showAddForm && (
          <AddCandidateModal
            jobId={jobId!}
            onClose={() => setShowAddForm(false)}
            onAdded={(c) => {
              setCandidates(prev => [c, ...prev])
              setShowAddForm(false)
              setSelectedCandidate(c)
              fetchAll()
            }}
          />
        )}
      </div>
    </FintechLayout>
  )
}


// ── Candidate Detail Panel ────────────────────────────────────────────────────

function CandidateDetailPanel({
  candidate, screeningResult, screening, onScreen, onStageChange, onDelete, onPromote, promoting,
}: {
  candidate: Candidate
  job: Job
  screeningResult: AIScreeningResult | null
  screening: boolean
  onScreen: () => void
  onStageChange: (stage: string) => void
  onDelete: () => void
  onPromote: () => void
  promoting: boolean
}) {
  const [movingStage, setMovingStage] = useState(false)

  const handleMove = async (stage: string) => {
    setMovingStage(true)
    await onStageChange(stage)
    setMovingStage(false)
  }

  const { accessToken } = useAuthStore()
  const resumeUrl = `${recruitmentApi.getResumeUrl(candidate.id)}${accessToken ? `?token=${accessToken}` : ''}`
  const currentStageConfig = STAGES.find(s => s.key === candidate.stage)

  const isAutoFiltered = candidate.stage === 'rejected' && candidate.ai_score !== null && candidate.ai_score < 80

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      {/* Candidate hired banner */}
      {candidate.stage === 'hired' && (
        <div className="bg-green-50 border-b border-green-100 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
            <p className="text-xs font-semibold text-green-800">
              This candidate has been hired! Ready to onboard them to the active employee directory.
            </p>
          </div>
          <button
            onClick={onPromote}
            disabled={promoting}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {promoting ? <Spinner size="sm" /> : <UserCheck className="h-3.5 w-3.5" />}
            Onboard to Employees
          </button>
        </div>
      )}

      {/* Auto-filtered warning banner */}
      {isAutoFiltered && (
        <div className="bg-red-50 border-b border-red-100 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
            <p className="text-xs font-semibold text-red-800">
              AI Auto-Filter: Match score ({candidate.ai_score}%) did not meet the 80% requirement.
            </p>
          </div>
          <button
            onClick={() => handleMove('screening')}
            disabled={movingStage}
            className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
          >
            Override Rejection
          </button>
        </div>
      )}
      {/* Header */}
      <div className="border-b border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{candidate.full_name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {candidate.current_title ?? 'Candidate'}{candidate.current_company ? ` · ${candidate.current_company}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {candidate.ai_score !== null && (
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${
                candidate.ai_score >= 75 ? 'bg-green-100 text-green-700' :
                candidate.ai_score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                <Star className="h-4 w-4" /> {candidate.ai_score}/100
              </div>
            )}
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${currentStageConfig?.color}`}>
              {candidate.stage}
            </span>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
          <a href={`mailto:${candidate.email}`} className="flex items-center gap-1.5 hover:text-violet-600">
            <Mail className="h-3.5 w-3.5" />{candidate.email}
          </a>
          {candidate.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />{candidate.phone}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <BriefcaseBusiness className="h-3.5 w-3.5" />{candidate.experience_years}y exp
          </span>
        </div>

        {/* Skills */}
        {candidate.skills && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {candidate.skills.split(',').map(s => s.trim()).filter(Boolean).map(skill => (
              <span key={skill} className="rounded-full bg-violet-50 border border-violet-100 px-2.5 py-0.5 text-xs text-violet-700">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-b border-gray-100 px-6 py-4 flex flex-wrap gap-3">
        {/* Move stage */}
        <div className="relative group">
          <button disabled={movingStage} className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            {movingStage ? <Spinner size="sm" /> : 'Move Stage'} <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <div className="absolute left-0 top-full mt-1 z-20 hidden group-hover:block bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px]">
            {STAGES.filter(s => s.key !== candidate.stage).map(s => (
              <button key={s.key} onClick={() => handleMove(s.key)}
                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors capitalize">
                → {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resume */}
        {candidate.has_resume && (
          <a href={resumeUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <FileText className="h-3.5 w-3.5" /> View Resume
          </a>
        )}

        {/* AI Screen */}
        <button onClick={onScreen} disabled={screening || !candidate.has_resume}
          title={!candidate.has_resume ? 'Upload resume first' : 'Run Gemini AI screening'}
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-50">
          {screening ? <Spinner size="sm" /> : <Brain className="h-3.5 w-3.5" />}
          {screening ? 'Screening...' : 'AI Screen'}
        </button>

        {/* Onboard to Employees */}
        {candidate.stage === 'hired' && (
          <button onClick={onPromote} disabled={promoting}
            className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50">
            {promoting ? <Spinner size="sm" /> : <UserCheck className="h-3.5 w-3.5" />}
            Onboard to Employees
          </button>
        )}

        {/* Delete Applicant */}
        <button onClick={onDelete}
          className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors ml-auto">
          <Trash2 className="h-3.5 w-3.5" /> Delete Applicant
        </button>
      </div>

      {/* AI Result */}
      {(screeningResult || candidate.ai_summary) && (
        <div className="border-b border-gray-100 p-6 bg-violet-50/40 space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-600" />
            <p className="text-sm font-semibold text-violet-900">Gemini AI Screening Result</p>
            {screeningResult && (
              <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                RECOMMENDATION_CONFIG[screeningResult.recommendation].color
              }`}>
                {RECOMMENDATION_CONFIG[screeningResult.recommendation].label}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {screeningResult?.summary ?? candidate.ai_summary}
          </p>
          {screeningResult && (
            <div className="grid grid-cols-2 gap-4">
              {screeningResult.strengths.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-1.5">✓ Strengths</p>
                  <ul className="space-y-1">
                    {screeningResult.strengths.map(s => (
                      <li key={s} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {screeningResult.gaps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-1.5">✗ Gaps</p>
                  <ul className="space-y-1">
                    {screeningResult.gaps.map(g => (
                      <li key={g} className="text-xs text-gray-600">· {g}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {candidate.notes && (
        <div className="p-6">
          <p className="text-xs font-semibold text-gray-500 mb-1">Notes</p>
          <p className="text-sm text-gray-700">{candidate.notes}</p>
        </div>
      )}
    </div>
  )
}


// ── Add Candidate Modal ───────────────────────────────────────────────────────

function AddCandidateModal({ jobId, onClose, onAdded }: {
  jobId: string
  onClose: () => void
  onAdded: (c: Candidate) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resume, setResume] = useState<File | null>(null)
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', current_company: '',
    current_title: '', experience_years: '0', skills: '', source: 'portal',
  })
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [f]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (resume) fd.append('resume', resume)
      const candidate = await recruitmentApi.addCandidate(jobId, fd)
      onAdded(candidate)
    } catch {
      setError('Failed to add candidate.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-y-auto max-h-[90vh]">
        <div className="border-b border-gray-100 px-6 py-5 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Add Candidate</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <Alert variant="error" message={error} />}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Full Name *</label>
              <input className="input" value={form.full_name} onChange={set('full_name')} required placeholder="Rahul Sharma" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Email *</label>
              <input type="email" className="input" value={form.email} onChange={set('email')} required placeholder="rahul@example.com" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Phone</label>
              <input className="input" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Current Company</label>
              <input className="input" value={form.current_company} onChange={set('current_company')} placeholder="Infosys" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Current Title</label>
              <input className="input" value={form.current_title} onChange={set('current_title')} placeholder="Senior Developer" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Experience (years)</label>
              <input type="number" className="input" value={form.experience_years} onChange={set('experience_years')} min="0" max="50" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Skills (comma separated)</label>
            <input className="input" value={form.skills} onChange={set('skills')} placeholder="React, TypeScript, Node.js" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Source</label>
            <select className="input" value={form.source} onChange={set('source')}>
              <option value="portal">Portal</option>
              <option value="linkedin">LinkedIn</option>
              <option value="referral">Referral</option>
              <option value="job_board">Job Board</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Resume (PDF or Word)</label>
            <div
              className="rounded-xl border-2 border-dashed border-gray-200 p-4 text-center cursor-pointer hover:border-violet-300 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {resume ? (
                <p className="text-sm text-violet-700 font-medium">{resume.name}</p>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-gray-300 mx-auto mb-1.5" />
                  <p className="text-xs text-gray-500">Click to upload resume (PDF/Word, max 10MB)</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx"
              onChange={e => setResume(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
              {saving ? <Spinner size="sm" /> : 'Add Candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
