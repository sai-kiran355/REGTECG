import { useState, useEffect, FormEvent } from 'react'
import { X, User, Building2, Landmark, Key, Save, Eye, EyeOff } from 'lucide-react'
import { apiClient } from '../api/client'
import { Spinner } from './Spinner'
import { Alert } from './Alert'
import { Badge } from './Badge'
import { useAuthStore } from '../store/authStore'


interface ProfileData {
  id: string
  full_name: string
  email: string
  role: string
  organization_name: string
  organization_type: string
  permissions: string[]
}

interface ProfilePanelProps {
  open: boolean
  onClose: () => void
}

const roleColors: Record<string, 'blue' | 'green' | 'yellow' | 'purple'> = {
  admin: 'blue', analyst: 'green', auditor: 'yellow', viewer: 'purple',
}

export function ProfilePanel({ open, onClose }: ProfilePanelProps) {
  const [profile, setProfile]     = useState<ProfileData | null>(null)
  const [loading, setLoading]     = useState(false)
  const [tab, setTab]             = useState<'profile' | 'password'>('profile')

  // Profile edit
  const [fullName, setFullName]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [saveMsg, setSaveMsg]     = useState<string | null>(null)
  const [saveErr, setSaveErr]     = useState<string | null>(null)

  // Password change
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [pwSaving, setPwSaving]   = useState(false)
  const [pwMsg, setPwMsg]         = useState<string | null>(null)
  const [pwErr, setPwErr]         = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    apiClient.get('/api/v1/profile')
      .then(r => {
        setProfile(r.data)
        setFullName(r.data.full_name || '')
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [open])

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)
    setSaveErr(null)
    try {
      const r = await apiClient.put('/api/v1/profile', { full_name: fullName })
      setProfile(r.data)
      // Update global auth store state in real-time
      const store = useAuthStore.getState()
      if (store.user) {
        store.setUser({
          ...store.user,
          full_name: r.data.full_name,
        })
      }
      setSaveMsg('Profile updated successfully.')
    } catch (err: any) {
      setSaveErr(err?.response?.data?.detail?.message ?? 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwMsg(null)
    setPwErr(null)
    if (newPw !== confirmPw) { setPwErr('Passwords do not match.'); return }
    if (newPw.length < 8) { setPwErr('Password must be at least 8 characters.'); return }
    setPwSaving(true)
    try {
      await apiClient.put('/api/v1/profile/password', {
        current_password: currentPw,
        new_password: newPw,
      })
      setPwMsg('Password changed successfully.')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err: any) {
      setPwErr(err?.response?.data?.detail?.message ?? 'Failed to change password.')
    } finally {
      setPwSaving(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">My Profile</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center"><Spinner /></div>
        ) : profile ? (
          <div className="flex flex-1 flex-col overflow-y-auto">
            {/* User card */}
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                  {(profile.full_name || profile.email)[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{profile.full_name || 'No name set'}</p>
                  <p className="text-sm text-gray-500">{profile.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={roleColors[profile.role] ?? 'gray'} className="capitalize">{profile.role}</Badge>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      {profile.organization_type === 'bank' ? <Landmark className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                      {profile.organization_name}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setTab('profile')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'profile' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <User className="mx-auto mb-0.5 h-4 w-4" />
                Edit Profile
              </button>
              <button
                onClick={() => setTab('password')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'password' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Key className="mx-auto mb-0.5 h-4 w-4" />
                Password
              </button>
            </div>

            <div className="flex-1 px-6 py-5">
              {tab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {saveErr && <Alert variant="error" message={saveErr} />}
                  {saveMsg && <Alert variant="success" message={saveMsg} />}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                      className="input"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Your full name"
                      required
                      minLength={2}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Email Address</label>
                    <input className="input bg-gray-50" value={profile.email} readOnly />
                    <p className="mt-1 text-xs text-gray-400">Contact support to change your email.</p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Organization</label>
                    <input className="input bg-gray-50" value={profile.organization_name} readOnly />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
                    <input className="input bg-gray-50 capitalize" value={profile.role} readOnly />
                  </div>

                  <button type="submit" disabled={saving} className="btn-primary w-full">
                    {saving ? <Spinner size="sm" /> : <><Save className="h-4 w-4" /> Save Changes</>}
                  </button>
                </form>
              )}

              {tab === 'password' && (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {pwErr && <Alert variant="error" message={pwErr} />}
                  {pwMsg && <Alert variant="success" message={pwMsg} />}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Current Password</label>
                    <input
                      type="password"
                      className="input"
                      value={currentPw}
                      onChange={e => setCurrentPw(e.target.value)}
                      placeholder="Enter current password"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">New Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        className="input pr-10"
                        value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                        placeholder="Min 8 characters"
                        required
                        minLength={8}
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Confirm New Password</label>
                    <input
                      type="password"
                      className="input"
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      placeholder="Repeat new password"
                      required
                    />
                  </div>

                  <button type="submit" disabled={pwSaving} className="btn-primary w-full">
                    {pwSaving ? <Spinner size="sm" /> : <><Key className="h-4 w-4" /> Change Password</>}
                  </button>
                </form>
              )}
            </div>

            {/* Permissions */}
            <div className="border-t border-gray-100 px-6 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Your Permissions</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.permissions.map(p => (
                  <span key={p} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{p}</span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-500">Failed to load profile.</div>
        )}
      </div>
    </>
  )
}
