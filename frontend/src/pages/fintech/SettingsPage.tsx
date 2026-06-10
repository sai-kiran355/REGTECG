import React, { useState } from 'react'
import {
  User, Key, MapPin, Bell, Shield, Save, Eye, EyeOff,
  Building2, Mail, BadgeCheck, AlertOctagon
} from 'lucide-react'
import { FintechLayout } from './FintechLayout'
import { useAuthStore } from '../../store/authStore'
import { apiClient } from '../../api/client'
import { Alert } from '../../components/Alert'
import { Spinner } from '../../components/Spinner'

type SettingsTab = 'profile' | 'password' | 'geofence' | 'notifications'

const NOTIF_STORAGE_KEY = 'fintech-notifications-config'

function loadNotificationSettings() {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {
    geofenceBreach: true,
    payrollDisbursed: true,
    employeeOnboarded: true,
    candidateApplied: false,
    systemLogs: false
  }
}

export function FintechSettingsPage() {
  const { user } = useAuthStore()
  const [activeSubTab, setActiveSubTab] = useState<SettingsTab>('profile')

  // Password change state
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState<string | null>(null)

  // Notifications state
  const [notifications, setNotifications] = useState(loadNotificationSettings)
  const [notifSaved, setNotifSaved] = useState(false)

  // Geofence configuration state (mock preferences stored in localstorage)
  const [geoLat, setGeoLat] = useState('12.9716')
  const [geoLon, setGeoLon] = useState('77.5946')
  const [geoRadius, setGeoRadius] = useState('275')
  const [geoOverride, setGeoOverride] = useState(false)
  const [geoSaved, setGeoSaved] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
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
      const msg = err?.response?.data?.detail?.message ?? 'Failed to change password. Double check your current credentials.'
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

  const handleSaveGeofence = (e: React.FormEvent) => {
    e.preventDefault()
    setGeoSaved(true)
    setTimeout(() => setGeoSaved(false), 3000)
  }

  return (
    <FintechLayout title="Workspace Settings" subtitle="Configure organization profiles, security credentials, geofencing, and alerts.">
      <div className="space-y-6">
        
        {/* Glassmorphic Gradient Top Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-700 to-indigo-900 p-8 text-white shadow-xl">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="relative z-10">
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-violet-100">
              <Shield className="h-3.5 w-3.5" /> Security & Settings Active
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight">System Preferences</h1>
            <p className="mt-2 text-violet-100 text-sm max-w-xl leading-relaxed">
              Adjust regional workplace tracking configurations, synchronize notification parameters, and update developer key access controls.
            </p>
          </div>
        </div>

        {/* Page Inner Layout: Sidebar Tabs + Form Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Left Navigation Sub-tabs */}
          <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm space-y-1">
            {[
              { id: 'profile', label: 'Organization Profile', icon: User },
              { id: 'password', label: 'Security & Password', icon: Key },
              { id: 'geofence', label: 'GPS Geofencing', icon: MapPin },
              { id: 'notifications', label: 'System Notifications', icon: Bell },
            ].map(tab => {
              const Icon = tab.icon
              const active = activeSubTab === tab.id
              return (
                <button
                  key={tab.id}
                  id={`subtab-${tab.id}`}
                  onClick={() => setActiveSubTab(tab.id as SettingsTab)}
                  className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    active
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${active ? 'text-violet-600' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Right Content Panel */}
          <div className="lg:col-span-3">
            
            {/* SUBTAB 1: Profile Info */}
            {activeSubTab === 'profile' && (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden animate-fadeIn">
                <div className="border-b border-gray-100 px-6 py-5 flex items-center gap-3">
                  <User className="h-5 w-5 text-violet-600" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Organization Profile</h3>
                    <p className="text-xs text-gray-500">Overview of active workforce details and role permissions.</p>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  
                  {/* Account Summary Card */}
                  <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-lg font-bold text-white shadow-md">
                      {(user?.organization_name || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">{user?.organization_name ?? 'Your Company'}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <BadgeCheck className="h-4 w-4 text-violet-600" /> Verified Workforce Tenant
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="profile-org-name" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Company Identifier</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                        <input
                          id="profile-org-name"
                          className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 text-sm bg-gray-50/50 text-gray-500 focus:outline-none"
                          value={user?.organization_name ?? ''}
                          readOnly
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="profile-role" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">User Access Level</label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                        <input
                          id="profile-role"
                          className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 text-sm bg-gray-50/50 text-gray-500 capitalize focus:outline-none"
                          value={user?.role ?? 'admin'}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="profile-email" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Registered Administrator Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <input
                        id="profile-email"
                        type="email"
                        className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 text-sm bg-gray-50/50 text-gray-500 focus:outline-none"
                        value={user?.email ?? ''}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 2: Password Security */}
            {activeSubTab === 'password' && (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden animate-fadeIn">
                <div className="border-b border-gray-100 px-6 py-5 flex items-center gap-3">
                  <Key className="h-5 w-5 text-violet-600" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Change Password</h3>
                    <p className="text-xs text-gray-500">Update your access credential token requirements.</p>
                  </div>
                </div>

                <form onSubmit={handlePasswordChange} className="p-6 space-y-4 max-w-xl">
                  {pwError && <Alert variant="error" message={pwError} onClose={() => setPwError(null)} />}
                  {pwSuccess && <Alert variant="success" message={pwSuccess} onClose={() => setPwSuccess(null)} />}

                  <div>
                    <label htmlFor="current-pw-input" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Current Password</label>
                    <div className="relative">
                      <input
                        id="current-pw-input"
                        type={showCurrent ? 'text' : 'password'}
                        className="w-full rounded-xl border border-gray-200 pl-4 pr-10 py-3 text-sm focus:border-violet-600 focus:outline-none"
                        value={currentPw}
                        onChange={e => setCurrentPw(e.target.value)}
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrent ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="new-pw-input" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">New Password</label>
                    <div className="relative">
                      <input
                        id="new-pw-input"
                        type={showNew ? 'text' : 'password'}
                        className="w-full rounded-xl border border-gray-200 pl-4 pr-10 py-3 text-sm focus:border-violet-600 focus:outline-none"
                        value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                        placeholder="Min 8 characters"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                      >
                        {showNew ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirm-pw-input" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                    <input
                      id="confirm-pw-input"
                      type="password"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-violet-600 focus:outline-none"
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      placeholder="Repeat new password"
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="rounded-xl bg-violet-600 hover:bg-violet-700 px-6 py-2.5 text-xs font-bold text-white transition-colors flex items-center gap-1.5"
                    >
                      {pwLoading ? <Spinner className="h-4 w-4 text-white" /> : <><Save className="h-4.5 w-4.5" /> Change Password</>}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SUBTAB 3: Geofencing Coordinates */}
            {activeSubTab === 'geofence' && (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden animate-fadeIn">
                <div className="border-b border-gray-100 px-6 py-5 flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-violet-600" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">GPS Geofencing Headquarters</h3>
                    <p className="text-xs text-gray-500">Set coordinates for employee physical georesolution checks.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveGeofence} className="p-6 space-y-6">
                  {geoSaved && <Alert variant="success" message="Geofencing parameters saved successfully." />}

                  <div className="rounded-xl border border-blue-50 bg-blue-50/30 p-4 text-xs text-blue-800 flex items-start gap-2.5 max-w-2xl">
                    <AlertOctagon className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">HQ Geofence Location Active</p>
                      <p className="mt-0.5 leading-relaxed">
                        Currently, employee face-recognition clock-ins are validated against the Bangalore Headquarters location geofence. Clock-ins outside this limit trigger automatic Slack/Teams warnings and compliance audit flags.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
                    <div>
                      <label htmlFor="geo-latitude" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Latitude (N)</label>
                      <input
                        id="geo-latitude"
                        type="text"
                        required
                        value={geoLat}
                        onChange={e => setGeoLat(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-violet-600 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="geo-longitude" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Longitude (E)</label>
                      <input
                        id="geo-longitude"
                        type="text"
                        required
                        value={geoLon}
                        onChange={e => setGeoLon(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-violet-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="geo-radius" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Radius Limit (Meters)</label>
                      <input
                        id="geo-radius"
                        type="number"
                        required
                        value={geoRadius}
                        onChange={e => setGeoRadius(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-violet-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label htmlFor="geofence-override-toggle" className="flex items-center cursor-pointer select-none">
                      <div className="relative">
                        <input
                          id="geofence-override-toggle"
                          type="checkbox"
                          className="sr-only"
                          checked={geoOverride}
                          onChange={e => setGeoOverride(e.target.checked)}
                        />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${geoOverride ? 'bg-violet-600' : 'bg-gray-300'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${geoOverride ? 'transform translate-x-4' : ''}`}></div>
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-700">Override geofence verification globally (for remote operations)</span>
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="rounded-xl bg-violet-600 hover:bg-violet-700 px-6 py-2.5 text-xs font-bold text-white transition-colors flex items-center gap-1.5"
                    >
                      <Save className="h-4.5 w-4.5" /> Save Geofencing Settings
                    </button>
                  </div>

                </form>
              </div>
            )}

            {/* SUBTAB 4: System Notifications */}
            {activeSubTab === 'notifications' && (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden animate-fadeIn">
                <div className="border-b border-gray-100 px-6 py-5 flex items-center gap-3">
                  <Bell className="h-5 w-5 text-violet-600" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">System Notifications</h3>
                    <p className="text-xs text-gray-500">Configure real-time event email/alert notification dispatches.</p>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {notifSaved && <Alert variant="success" message="System notification configurations updated successfully." />}

                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-gray-50/10">
                    
                    {/* Switch 1: Geofence Breach */}
                    <div className="flex items-center justify-between p-4 bg-white">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Geofence Compliance Breach Alerts</p>
                        <p className="text-xs text-gray-500">Notify Slack and admin team immediately if check-in occurs outside radius limit.</p>
                      </div>
                      <label htmlFor="toggle-geofence-breach" className="relative inline-flex items-center cursor-pointer">
                        <input
                          id="toggle-geofence-breach"
                          type="checkbox"
                          className="sr-only"
                          checked={notifications.geofenceBreach}
                          onChange={() => setNotifications({ ...notifications, geofenceBreach: !notifications.geofenceBreach })}
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors ${notifications.geofenceBreach ? 'bg-violet-600' : 'bg-gray-200'}`}></div>
                        <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${notifications.geofenceBreach ? 'translate-x-5' : ''}`}></span>
                      </label>
                    </div>

                    {/* Switch 2: Payroll */}
                    <div className="flex items-center justify-between p-4 bg-white">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Monthly Payroll Finalized Updates</p>
                        <p className="text-xs text-gray-500">Send automated email notifications and payslips immediately upon disbursement runs.</p>
                      </div>
                      <label htmlFor="toggle-payroll-disbursed" className="relative inline-flex items-center cursor-pointer">
                        <input
                          id="toggle-payroll-disbursed"
                          type="checkbox"
                          className="sr-only"
                          checked={notifications.payrollDisbursed}
                          onChange={() => setNotifications({ ...notifications, payrollDisbursed: !notifications.payrollDisbursed })}
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors ${notifications.payrollDisbursed ? 'bg-violet-600' : 'bg-gray-200'}`}></div>
                        <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${notifications.payrollDisbursed ? 'translate-x-5' : ''}`}></span>
                      </label>
                    </div>

                    {/* Switch 3: Employee Onboarded */}
                    <div className="flex items-center justify-between p-4 bg-white">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Self-Onboarding File Audits</p>
                        <p className="text-xs text-gray-500">Notify recruitment team when candidates complete onboarding checklist uploads.</p>
                      </div>
                      <label htmlFor="toggle-employee-onboarded" className="relative inline-flex items-center cursor-pointer">
                        <input
                          id="toggle-employee-onboarded"
                          type="checkbox"
                          className="sr-only"
                          checked={notifications.employeeOnboarded}
                          onChange={() => setNotifications({ ...notifications, employeeOnboarded: !notifications.employeeOnboarded })}
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors ${notifications.employeeOnboarded ? 'bg-violet-600' : 'bg-gray-200'}`}></div>
                        <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${notifications.employeeOnboarded ? 'translate-x-5' : ''}`}></span>
                      </label>
                    </div>

                    {/* Switch 4: Candidate Applied */}
                    <div className="flex items-center justify-between p-4 bg-white">
                      <div>
                        <p className="text-sm font-bold text-gray-900">ATS Sourcing Pipeline Alerts</p>
                        <p className="text-xs text-gray-500">Send email digests whenever new applicant resumes pass resume screening tags.</p>
                      </div>
                      <label htmlFor="toggle-candidate-applied" className="relative inline-flex items-center cursor-pointer">
                        <input
                          id="toggle-candidate-applied"
                          type="checkbox"
                          className="sr-only"
                          checked={notifications.candidateApplied}
                          onChange={() => setNotifications({ ...notifications, candidateApplied: !notifications.candidateApplied })}
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors ${notifications.candidateApplied ? 'bg-violet-600' : 'bg-gray-200'}`}></div>
                        <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${notifications.candidateApplied ? 'translate-x-5' : ''}`}></span>
                      </label>
                    </div>

                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSaveNotifications}
                      className="rounded-xl bg-violet-600 hover:bg-violet-700 px-6 py-2.5 text-xs font-bold text-white transition-colors flex items-center gap-1.5"
                    >
                      <Save className="h-4.5 w-4.5" /> Save Alert Preferences
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </FintechLayout>
  )
}
