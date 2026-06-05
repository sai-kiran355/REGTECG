import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, ArrowLeft } from 'lucide-react'
import { recruitmentApi, Job } from '../../api/recruitment'
import { Spinner } from '../../components/Spinner'
import { Alert } from '../../components/Alert'
import { FintechLayout } from './FintechLayout'

const DEPARTMENTS = [
  'Engineering', 'Product', 'Design', 'Data Science', 'Marketing',
  'Sales', 'Finance', 'HR', 'Operations', 'Legal', 'Customer Success', 'Other',
]

export function JobFormPage() {
  const navigate = useNavigate()
  const { jobId } = useParams<{ jobId?: string }>()
  const isEdit = Boolean(jobId)

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '', department: '', location: 'Remote',
    employment_type: 'full_time', experience_min: 0, experience_max: '',
    salary_min: '', salary_max: '', description: '', requirements: '', status: 'open',
  })

  useEffect(() => {
    if (!jobId) return
    recruitmentApi.getJob(jobId)
      .then(job => setForm({
        title: job.title, department: job.department, location: job.location,
        employment_type: job.employment_type,
        experience_min: job.experience_min,
        experience_max: job.experience_max?.toString() ?? '',
        salary_min: job.salary_min?.toString() ?? '',
        salary_max: job.salary_max?.toString() ?? '',
        description: job.description, requirements: job.requirements,
        status: job.status,
      }))
      .catch(() => setError('Failed to load job.'))
      .finally(() => setLoading(false))
  }, [jobId])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: form.title.trim(),
        department: form.department,
        location: form.location.trim(),
        employment_type: form.employment_type,
        experience_min: Number(form.experience_min),
        experience_max: form.experience_max ? Number(form.experience_max) : null,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        description: form.description.trim(),
        requirements: form.requirements.trim(),
        status: form.status,
      }
      if (isEdit && jobId) {
        await recruitmentApi.updateJob(jobId, payload)
      } else {
        await recruitmentApi.createJob(payload)
      }
      navigate('/fintech/jobs')
    } catch {
      setError('Failed to save job. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <FintechLayout title="Job">
      <div className="flex justify-center py-20"><Spinner /></div>
    </FintechLayout>
  )

  return (
    <FintechLayout
      title={isEdit ? 'Edit Job' : 'Post a New Job'}
      subtitle={isEdit ? 'Update job details' : 'Create a new job posting'}
    >
      <div className="max-w-3xl space-y-6">
        <button onClick={() => navigate('/fintech/jobs')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Jobs
        </button>

        {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Job Details</h2>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Job Title *</label>
              <input className="input" placeholder="e.g. Senior React Developer" value={form.title} onChange={set('title')} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Department *</label>
                <select className="input" value={form.department} onChange={set('department')} required>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Location *</label>
                <input className="input" placeholder="Mumbai / Remote" value={form.location} onChange={set('location')} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Employment Type</label>
                <select className="input" value={form.employment_type} onChange={set('employment_type')}>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select className="input" value={form.status} onChange={set('status')}>
                  <option value="open">Open</option>
                  <option value="draft">Draft</option>
                  <option value="paused">Paused</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Experience & Salary */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Experience & Compensation</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Min Experience (years)</label>
                <input type="number" className="input" min="0" max="40" value={form.experience_min} onChange={set('experience_min')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Max Experience (years)</label>
                <input type="number" className="input" min="0" max="40" placeholder="Optional" value={form.experience_max} onChange={set('experience_max')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Min Salary (₹ per year)</label>
                <input type="number" className="input" min="0" placeholder="e.g. 800000" value={form.salary_min} onChange={set('salary_min')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Max Salary (₹ per year)</label>
                <input type="number" className="input" min="0" placeholder="e.g. 1500000" value={form.salary_max} onChange={set('salary_max')} />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Job Description & Requirements</h2>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Job Description *</label>
              <textarea
                className="input min-h-[140px] resize-y"
                placeholder="Describe the role, responsibilities, team culture..."
                value={form.description}
                onChange={set('description')}
                required
                minLength={10}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Requirements & Skills *</label>
              <textarea
                className="input min-h-[120px] resize-y"
                placeholder="List required skills, qualifications, must-haves..."
                value={form.requirements}
                onChange={set('requirements')}
                required
                minLength={10}
              />
              <p className="mt-1 text-xs text-gray-400">Gemini AI will use this to screen and score candidate resumes.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/fintech/jobs')}
              className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-50">
              {saving ? <Spinner size="sm" /> : <><Save className="h-4 w-4" /> {isEdit ? 'Save Changes' : 'Post Job'}</>}
            </button>
          </div>
        </form>
      </div>
    </FintechLayout>
  )
}
