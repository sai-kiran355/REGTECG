import { useState, FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, Key, Mail, User, Eye, EyeOff, Save } from 'lucide-react'
import axios from 'axios'
import { useApplicantStore } from '../../store/applicantStore'
import { Spinner } from '../../components/Spinner'
import { Alert } from '../../components/Alert'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export function ApplicantSettingsPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { accessToken, isAuthenticated, fullName, email, tenantSlug: storedSlug, setApplicant, applicantId, refreshToken } = useApplicantStore()
  const tenantSlug = params.get('tenant') || storedSlug || ''

  // redirect if not logged in
  if (!isAuthenticated) {
    navigate(`/apply/login${tenantSlug ? `?tenant=${tenantSlug}` : ''}`)
    return null
  }

  const authHeader = { Authorization: `Bearer ${accessToken}`, 'X-Tenant-ID': tenantSlug }

  // ── Name update ────────────────────────────────────────────────────────────
  const [newName, setNewName] = useState(fullName ?? '')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleUpdateName = async (e: FormEvent) => {
    e.preventDefault()
    setNameLoading(true)
    setNameMsg(null)
    try {
      const r = await axios.put(`${BASE_URL}/api/v1/applicant/me`, { full_name: newName }, { headers: authHeader })
      setApplicant({
        accessToken: accessToken!,
        refreshToken: refreshToken!,
        applicantId: applicantId!,
        fullName: r.data.full_name,
        email: email!,
        tenantSlug,
      })
      setNameMsg({ type: 'success', text: 'Name updated successfully.' })
    } catch (err: any) {
      setNameMsg({ type: 'error', text: err?.response?.data?.detail?.message ?? 'Failed to update name.' })
    } finally {
      setNameLoading(false)
    }
  }

  // ── Password change ────────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (newPw !== confirmPw) { setPwMsg({ type: 'error', text: 'New passwords do not match.' }); return }
    if (newPw.length < 8) { setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' }); return }
    setPwLoading(true)
    setPwMsg(null)
    try {
      await axios.put(`${BASE_URL}/api/v1/applicant/me/password`, { current_password: currentPw, new_password: newPw }, { headers: authHeader })
      setPwMsg({ type: 'success', text: 'Password changed successfully.' })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err?.response?.data?.detail?.message ?? 'Failed to change password.' })
    } finally {
      setPwLoading(false)
    }
  }

  // ── Email change ───────────────────────────────────────────────────────────
  const [emailPw, setEmailPw] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChangeEmail = async (e: FormEvent) => {
    e.preventDefault()
    setEmailLoading(true)
    setEmailMsg(null)
    try {
      await axios.put(`${BASE_URL}/api/v1/applicant/me/email`, { current_password: emailPw, new_email: newEmail }, { headers: authHeader })
      setApplicant({
        accessToken: accessToken!,
        refreshToken: refreshToken!,
        applicantId: applicantId!,
        fullName: fullName!,
        email: newEmail,
        tenantSlug,
      })
      setEmailMsg({ type: 'success', text: 'Email updated successfully.' })
      setEmailPw(''); setNewEmail('')
    } catch (err: any) {
      setEmailMsg({ type: 'error', text: err?.response?.data?.detail?.message ?? 'Failed to update email.' })
    } finally {
      setEmailLoading(false)
    }
  }

  const bankName = tenantSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(`/apply/home${tenantSlug ? `?tenant=${tenantSlug}` : ''}`)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{bankName}</p>
            <p className="text-xs text-gray-500">Account Settings</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Account Settings</h2>
          <p className="text-sm text-gray-500">Manage your name, email and password</p>
        </div>

        {/* Current account info */}
        <div className="card p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
            {(fullName ?? 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{fullName}</p>
            <p className="text-sm text-gray-500">{email}</p>
          </div>
        </div>

        {/* Update name */}
        <div className="card">
          <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
            <User className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Update Name</h3>
          </div>
          <form onSubmit={handleUpdateName} className="p-6 space-y-4">
            {nameMsg && <Alert variant={nameMsg.type === 'success' ? 'success' : 'error'} message={nameMsg.text} />}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
              <input className="input" value={newName} onChange={e => setNewName(e.target.value)} required minLength={2} />
            </div>
            <button type="submit" disabled={nameLoading} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {nameLoading ? <Spinner size="sm" /> : <><Save className="h-4 w-4" /> Save Name</>}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className="card">
          <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
            <Key className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Change Password</h3>
          </div>
          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            {pwMsg && <Alert variant={pwMsg.type === 'success' ? 'success' : 'error'} message={pwMsg.text} />}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Current Password</label>
              <div className="relative">
                <input type={showCurrent ? 'text' : 'password'} className="input pr-10" value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)} required placeholder="Your current password" />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">New Password</label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} className="input pr-10" value={newPw}
                  onChange={e => setNewPw(e.target.value)} required minLength={8} placeholder="Min 8 characters" />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Confirm New Password</label>
              <input type="password" className="input" value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)} required placeholder="Repeat new password" />
            </div>
            <button type="submit" disabled={pwLoading} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {pwLoading ? <Spinner size="sm" /> : <><Key className="h-4 w-4" /> Change Password</>}
            </button>
          </form>
        </div>

        {/* Change email */}
        <div className="card">
          <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
            <Mail className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Change Email</h3>
          </div>
          <form onSubmit={handleChangeEmail} className="p-6 space-y-4">
            {emailMsg && <Alert variant={emailMsg.type === 'success' ? 'success' : 'error'} message={emailMsg.text} />}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Current Email</label>
              <input className="input bg-gray-50" value={email ?? ''} readOnly />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">New Email</label>
              <input type="email" className="input" value={newEmail}
                onChange={e => setNewEmail(e.target.value)} required placeholder="new@example.com" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Current Password (to confirm)</label>
              <input type="password" className="input" value={emailPw}
                onChange={e => setEmailPw(e.target.value)} required placeholder="Enter your password" />
            </div>
            <button type="submit" disabled={emailLoading} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {emailLoading ? <Spinner size="sm" /> : <><Mail className="h-4 w-4" /> Update Email</>}
            </button>
          </form>
        </div>

        {/* Forgot password info */}
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-900 mb-1">Forgot your password?</p>
          <p className="text-sm text-amber-700">
            Contact your bank's support team or visit the branch with a valid ID. They can reset your account access.
          </p>
        </div>
      </main>
    </div>
  )
}
