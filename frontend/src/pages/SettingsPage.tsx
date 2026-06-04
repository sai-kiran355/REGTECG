import { useState, FormEvent } from 'react'
import { Save, Shield, Bell, Key, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { Alert } from '../components/Alert'
import { Spinner } from '../components/Spinner'
import { apiClient } from '../api/client'

const NOTIF_STORAGE_KEY = 'regtech-notifications'

function loadNotifications() {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { amlAlerts: true, kycUpdates: true, sanctionsHits: true, systemAlerts: false }
}

export function SettingsPage() {
  const { user, tenantSlug } = useAuthStore()

  // Password change state
  const [currentPw, setCurrentPw]   = useState('')
  const [newPw, setNewPw]           = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]       = useState(false)
  const [pwLoading, setPwLoading]   = useState(false)
  const [pwError, setPwError]       = useState<string | null>(null)
  const [pwSuccess, setPwSuccess]   = useState<string | null>(null)

  // Notification state
  const [notifications, setNotifications] = useState(loadNotifications)
  const [notifSaved, setNotifSaved] = useState(false)

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(null)

    if (newPw !== confirmPw) {
      setPwError('New passwords do not match.')
      return
    }
    if (newPw.length < 8) {
      setPwError('New password must be at least 8 characters.')
      return
    }

    setPwLoading(true)
    try {
      await apiClient.put('/api/v1/profile/password', {
        current_password: currentPw,
        new_password: newPw,
      })
      setPwSuccess('Password changed successfully.')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err: any) {
      const msg = err?.response?.data?.detail?.message ?? 'Failed to change password.'
      setPwError(msg)
    } finally {
      setPwLoading(false)
    }
  }

  const handleSaveNotifications = () => {
    try {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifications))
    } catch { /* ignore */ }
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Manage your account and preferences</p>
      </div>

      {notifSaved && <Alert variant="success" message="Notification preferences saved." />}

      {/* Account Info */}
      <div className="card">
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
          <Shield className="h-5 w-5 text-brand-600" />
          <h3 className="font-semibold text-gray-900">Account Information</h3>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Organisation</label>
              <input className="input" value={user?.organization_name ?? ''} readOnly />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Your Role</label>
              <input className="input capitalize" value={user?.role ?? ''} readOnly />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input className="input" value={user?.email ?? ''} readOnly />
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
          <Key className="h-5 w-5 text-brand-600" />
          <h3 className="font-semibold text-gray-900">Change Password</h3>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4 p-6">
          {pwError   && <Alert variant="error"   message={pwError} />}
          {pwSuccess && <Alert variant="success" message={pwSuccess} />}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                className="input pr-10"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
                required
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                className="input pr-10"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Min 8 characters"
                required
                minLength={8}
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

          <button type="submit" disabled={pwLoading} className="btn-primary">
            {pwLoading ? <Spinner size="sm" /> : <><Key className="h-4 w-4" /> Change Password</>}
          </button>
        </form>
      </div>

      {/* Notifications */}
      <div className="card">
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
          <Bell className="h-5 w-5 text-brand-600" />
          <h3 className="font-semibold text-gray-900">Notifications</h3>
        </div>
        <div className="divide-y divide-gray-50 px-6">
          {Object.entries(notifications).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-xs text-gray-500">Receive alerts for this category</p>
              </div>
              <button
                onClick={() => setNotifications((n: typeof notifications) => ({ ...n, [key]: !val }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${val ? 'bg-brand-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${val ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 px-6 py-4">
          <button onClick={handleSaveNotifications} className="btn-primary">
            <Save className="h-4 w-4" /> Save Preferences
          </button>
        </div>
      </div>

    </div>
  )
}
