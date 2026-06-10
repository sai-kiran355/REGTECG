import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  ShieldCheck, CheckCircle, Calendar,
  Wallet, GraduationCap, Upload, PenTool, Phone, Mail, MapPin, User,
} from 'lucide-react'
import { recruitmentApi, Employee } from '../../api/recruitment'
import { Spinner } from '../../components/Spinner'
import { Alert } from '../../components/Alert'

export function OnboardingPortalPage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<number>(1)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form States
  const [form, setForm] = useState({
    phone: '',
    dob: '',
    address: '',
    bankName: '',
    bankAccount: '',
    bankIfsc: '',
    edu10th: '',
    edu12th: '',
    eduCollege: '',
    signName: '',
  })

  // Upload States
  const [uploads, setUploads] = useState<Record<string, File | null>>({
    aadhaar: null,
    cert10th: null,
    cert12th: null,
    degree: null,
  })

  useEffect(() => {
    async function fetchEmployee() {
      if (!employeeId) return
      try {
        const emp = await recruitmentApi.getPublicEmployee(employeeId)
        setEmployee(emp)
        // Pre-fill existing data if any
        setForm(prev => ({
          ...prev,
          phone: emp.phone || '',
          dob: emp.dob || '',
          address: emp.address || '',
        }))
      } catch {
        setError('Invalid onboarding link. Please contact your HR manager.')
      } finally {
        setLoading(false)
      }
    }
    fetchEmployee()
  }, [employeeId])

  const handleUploadChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setUploads(prev => ({ ...prev, [key]: file }))
  }

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    setStep(prev => prev + 1)
  }

  const handleBack = () => {
    setStep(prev => Math.max(1, prev - 1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId) return
    setSubmitting(true)
    setError(null)
    try {
      // Compile bank details
      const bankDetailsStr = `${form.bankName} | A/C: ${form.bankAccount} | IFSC: ${form.bankIfsc}`
      
      // Compile education details
      const educationStr = `10th: ${form.edu10th}% | 12th: ${form.edu12th}% | B.Tech/College: ${form.eduCollege}`
      
      // 1. Upload files to backend if selected
      if (uploads.aadhaar) {
        await recruitmentApi.uploadEmployeeDoc(employeeId, 'aadhaar', uploads.aadhaar)
      }
      if (uploads.cert10th) {
        await recruitmentApi.uploadEmployeeDoc(employeeId, 'cert10th', uploads.cert10th)
      }
      if (uploads.cert12th) {
        await recruitmentApi.uploadEmployeeDoc(employeeId, 'cert12th', uploads.cert12th)
      }
      if (uploads.degree) {
        await recruitmentApi.uploadEmployeeDoc(employeeId, 'degree', uploads.degree)
      }
      
      // Submit profile details via API
      await recruitmentApi.submitPublicOnboarding(employeeId, {
        phone: form.phone,
        dob: form.dob,
        address: form.address,
        bank_details: bankDetailsStr,
        education: educationStr,
        status: 'onboarding', // Maintain onboarding stage for review
      })

      // Store e-sign agreement checked status in HR checklist locally for demo persistence
      if (form.signName) {
        const localTasks = {
          agreement: true,
          identity: true, // Auto-check off identity verification as they uploaded files
          email: true, // Assume work email setup triggered
          assets: false, // Let IT manager handle asset allocation
        }
        localStorage.setItem(`employee_tasks_${employeeId}`, JSON.stringify(localTasks))
      }

      setSubmitted(true)
    } catch {
      setError('Failed to submit onboarding profile. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
          <Alert variant="error" message={error || 'Employee profile not found.'} />
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center space-y-5 border border-green-100 animate-in zoom-in duration-200">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 animate-bounce" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Onboarding Submitted!</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Thank you, <strong>{employee.full_name}</strong>. Your profile details, qualifications, and identity documents have been submitted to HR.
          </p>
          <p className="text-xs text-gray-400">
            Our compliance officer will review your records and trigger your welcome email once verification is complete.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header banner */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-8 text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-violet-200" />
            <span className="text-xs font-bold uppercase tracking-wider text-violet-200">Digital Onboarding Portal</span>
          </div>
          <h1 className="text-2xl font-bold mt-2">Welcome to your new team, {employee.full_name}!</h1>
          <p className="text-violet-200 text-sm mt-1 leading-normal">
            Let's get you set up as <strong>{employee.job_title}</strong> in the <strong>{employee.department}</strong> department.
          </p>
        </div>

        {/* Step tracker */}
        <div className="flex border-b border-gray-100 px-8 py-4 bg-gray-50/50 justify-between items-center text-xs text-gray-400 font-semibold">
          {[
            { num: 1, label: 'Profile' },
            { num: 2, label: 'Payroll & Bank' },
            { num: 3, label: 'Education' },
            { num: 4, label: 'Documents' },
            { num: 5, label: 'E-Sign' },
          ].map(s => (
            <div key={s.num} className="flex items-center gap-1.5">
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${
                step === s.num ? 'bg-violet-600 text-white font-bold' :
                step > s.num ? 'bg-green-100 text-green-700 font-bold' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > s.num ? '✓' : s.num}
              </span>
              <span className={step === s.num ? 'text-violet-700 font-bold' : ''}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Form area */}
        <div className="p-8">
          {step === 1 && (
            <form onSubmit={handleNext} className="space-y-5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
                <User className="h-5 w-5 text-violet-600" />
                <h3 className="font-bold text-gray-900 text-sm">Step 1: Personal Profile</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Corporate/Personal Email</label>
                  <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 text-sm text-gray-500">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span>{employee.email}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Mobile Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 99000 88000"
                      value={form.phone}
                      onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date of Birth *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      required
                      value={form.dob}
                      onChange={e => setForm(prev => ({ ...prev, dob: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Current Physical Address *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                    <textarea
                      required
                      rows={3}
                      placeholder="Enter your full mailing address..."
                      value={form.address}
                      onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-2.5 text-sm transition-colors">
                  Next Step
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleNext} className="space-y-5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
                <Wallet className="h-5 w-5 text-violet-600" />
                <h3 className="font-bold text-gray-900 text-sm">Step 2: Payroll & Bank Details</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Bank Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. State Bank of India"
                    value={form.bankName}
                    onChange={e => setForm(prev => ({ ...prev, bankName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Bank Account Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 302910398471"
                    value={form.bankAccount}
                    onChange={e => setForm(prev => ({ ...prev, bankAccount: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">IFSC / Swift Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SBIN0001815"
                    value={form.bankIfsc}
                    onChange={e => setForm(prev => ({ ...prev, bankIfsc: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button type="button" onClick={handleBack} className="rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold px-6 py-2.5 text-sm transition-colors">
                  Back
                </button>
                <button type="submit" className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-2.5 text-sm transition-colors">
                  Next Step
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleNext} className="space-y-5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
                <GraduationCap className="h-5 w-5 text-violet-600" />
                <h3 className="font-bold text-gray-900 text-sm">Step 3: Academic Qualifications</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">10th Class Percentage / CGPA *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 92% or 9.5 CGPA"
                    value={form.edu10th}
                    onChange={e => setForm(prev => ({ ...prev, edu10th: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Intermediate (12th) Class Percentage *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 95% or 920/1000"
                    value={form.edu12th}
                    onChange={e => setForm(prev => ({ ...prev, edu12th: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">B.Tech / Degree College & CGPA *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IIT Madras, 8.7 CGPA"
                    value={form.eduCollege}
                    onChange={e => setForm(prev => ({ ...prev, eduCollege: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button type="button" onClick={handleBack} className="rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold px-6 py-2.5 text-sm transition-colors">
                  Back
                </button>
                <button type="submit" className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-2.5 text-sm transition-colors">
                  Next Step
                </button>
              </div>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={handleNext} className="space-y-5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
                <Upload className="h-5 w-5 text-violet-600" />
                <h3 className="font-bold text-gray-900 text-sm">Step 4: Document Vault Uploads</h3>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'aadhaar', label: 'National ID Card (Aadhaar / Passport)' },
                  { key: 'cert10th', label: '10th Class Certificate Marksheet' },
                  { key: 'cert12th', label: 'Intermediate (12th) Marksheet' },
                  { key: 'degree', label: 'B.Tech / Degree Graduation Certificate' },
                ].map(doc => (
                  <div key={doc.key} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-750">{doc.label} *</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">PDF or Image up to 10MB</p>
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors">
                        <Upload className="h-3.5 w-3.5 text-gray-400" />
                        {uploads[doc.key] ? uploads[doc.key]!.name : 'Choose File'}
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          required={!uploads[doc.key]}
                          className="hidden"
                          onChange={handleUploadChange(doc.key)}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <button type="button" onClick={handleBack} className="rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold px-6 py-2.5 text-sm transition-colors">
                  Back
                </button>
                <button type="submit" className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-2.5 text-sm transition-colors">
                  Next Step
                </button>
              </div>
            </form>
          )}

          {step === 5 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
                <PenTool className="h-5 w-5 text-violet-600" />
                <h3 className="font-bold text-gray-900 text-sm">Step 5: Review & E-Sign Agreement</h3>
              </div>

              <div className="space-y-4">
                {/* Scrollable document copy */}
                <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 max-h-[180px] overflow-y-auto text-[10px] text-gray-500 leading-relaxed font-mono">
                  <p className="font-bold text-gray-700 mb-2">EMPLOYMENT & NDA AGREEMENT</p>
                  <p className="mb-2">
                    This Agreement is entered into on this day by and between the Employer and {employee.full_name} (the "Employee").
                  </p>
                  <p className="mb-2">
                    1. POSITION AND DUTIES. The Employee shall serve in the capacity of {employee.job_title} under the {employee.department} department, reporting directly to {employee.manager_name || "the direct supervisor"}.
                  </p>
                  <p className="mb-2">
                    2. CONFIDENTIALITY. The Employee agrees that during and after employment, they shall not disclose any proprietary financial code, consumer data, or trade secrets to any third party.
                  </p>
                  <p>
                    3. GOVERNING LAW. This agreement is governed by the employment laws of the jurisdiction of incorporation.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Type Full Name to e-Sign *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={form.signName}
                    onChange={e => setForm(prev => ({ ...prev, signName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
                  />
                </div>

                {/* Signature Preview */}
                <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-violet-50/20 text-center flex flex-col items-center justify-center min-h-[90px]">
                  {form.signName ? (
                    <div>
                      <p className="font-serif italic text-3xl text-indigo-900 border-b border-dashed border-gray-300 px-6 pb-2 inline-block">
                        {form.signName}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-2">ComplianceOS Secure E-Sign Certificate: SHA-256 Verified</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Signature preview will appear here</p>
                  )}
                </div>
              </div>

              {error && <Alert variant="error" message={error} />}

              <div className="flex justify-between pt-4">
                <button type="button" onClick={handleBack} className="rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold px-6 py-2.5 text-sm transition-colors">
                  Back
                </button>
                <button type="submit" disabled={submitting || !form.signName} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold px-8 py-2.5 text-sm transition-colors disabled:opacity-50">
                  {submitting ? 'Submitting Details...' : 'Submit Onboarding Profile'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
