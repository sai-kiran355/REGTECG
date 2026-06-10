import { useState, useEffect } from 'react'
import {
  Clock, Camera, MapPin, Calendar, User, ShieldCheck, Plus, X, Sparkles, Building, Trash2
} from 'lucide-react'
import { recruitmentApi, Employee } from '../../api/recruitment'
import { attendanceApi, AttendanceLog, LeaveRequest, ShiftSchedule } from '../../api/attendance'
import { Spinner } from '../../components/Spinner'
import { Alert } from '../../components/Alert'
import { FintechLayout } from './FintechLayout'

export function AttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [shifts, setShifts] = useState<ShiftSchedule[]>([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'punch' | 'shifts' | 'leaves'>('punch')

  // Selected employee for punch/leaves
  const [selectedEmpId, setSelectedEmpId] = useState<string>('')
  
  // Biometric check-in state
  const [scanning, setScanning] = useState(false)
  const [scanStep, setScanStep] = useState<'idle' | 'camera' | 'measuring' | 'success'>('idle')
  const [locationMode, setLocationMode] = useState<'hq' | 'remote'>('hq')
  const [clockedInLog, setClockedInLog] = useState<AttendanceLog | null>(null)

  // Shift assignment state
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [shiftForm, setShiftForm] = useState({
    employee_id: '',
    shift_name: 'Morning Shift',
    start_time: '09:00',
    end_time: '18:00',
    day_of_week: 'Weekly',
  })

  // Leave request form state
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type: 'sick' as 'sick' | 'casual' | 'earned',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
  })

  const loadData = async () => {
    try {
      const [empRes, logsRes, leavesRes, shiftsRes] = await Promise.all([
        recruitmentApi.listEmployees({ page_size: 100 }),
        attendanceApi.listAttendanceLogs({ page_size: 50 }),
        attendanceApi.listLeaveRequests(),
        attendanceApi.listShiftSchedules(),
      ])
      setEmployees(empRes.items)
      setLogs(logsRes.items)
      setLeaves(leavesRes.items)
      setShifts(shiftsRes.items)

      if (empRes.items.length > 0) {
        setSelectedEmpId(empRes.items[0].id)
        setShiftForm(prev => ({ ...prev, employee_id: empRes.items[0].id }))
        setLeaveForm(prev => ({ ...prev, employee_id: empRes.items[0].id }))
      }
    } catch (err) {
      setError('Failed to load attendance directory records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Sync punch state when selected employee changes
  useEffect(() => {
    if (selectedEmpId) {
      const activeLog = logs.find(l => l.employee_id === selectedEmpId && l.clock_out === null)
      setClockedInLog(activeLog || null)
      setScanStep('idle')
      setScanning(false)
    }
  }, [selectedEmpId, logs])

  const handleStartBiometric = () => {
    setScanning(true)
    setScanStep('camera')
    
    // Simulate camera activation
    setTimeout(() => {
      setScanStep('measuring')
      // Simulate biometric mapping
      setTimeout(() => {
        setScanStep('success')
        setScanning(false)
      }, 2000)
    }, 1500)
  }

  const handleClockIn = async () => {
    if (!selectedEmpId) return
    setError(null)
    setSuccess(null)
    
    // HQ coords vs Remote coords
    const latitude = locationMode === 'hq' ? 12.9716 : 12.9123
    const longitude = locationMode === 'hq' ? 77.5946 : 77.6321

    try {
      const log = await attendanceApi.clockIn({
        employee_id: selectedEmpId,
        latitude,
        longitude,
        method: 'face_recognition',
      })
      
      // Update logs list
      setLogs(prev => [log, ...prev.filter(l => l.id !== log.id)])
      setClockedInLog(log)
      
      const empName = employees.find(e => e.id === selectedEmpId)?.full_name ?? 'Employee'
      setSuccess(`Clock-in successful! Biometrics confirmed for ${empName}.`)
      
      // Reset scanning
      setScanStep('idle')
    } catch (err: any) {
      setError('Failed to submit clock-in transaction.')
    }
  }

  const handleClockOut = async () => {
    if (!selectedEmpId) return
    setError(null)
    setSuccess(null)

    const latitude = locationMode === 'hq' ? 12.9716 : 12.9123
    const longitude = locationMode === 'hq' ? 77.5946 : 77.6321

    try {
      const log = await attendanceApi.clockOut({
        employee_id: selectedEmpId,
        latitude,
        longitude,
      })
      
      setLogs(prev => prev.map(l => l.id === log.id ? log : l))
      setClockedInLog(null)
      
      const empName = employees.find(e => e.id === selectedEmpId)?.full_name ?? 'Employee'
      setSuccess(`Clock-out successful for ${empName}. Shift logged successfully.`)
      
      setScanStep('idle')
    } catch (err) {
      setError('Failed to submit clock-out transaction.')
    }
  }

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    try {
      const sched = await attendanceApi.assignShift(shiftForm)
      setShifts(prev => {
        const filtered = prev.filter(s => !(s.employee_id === sched.employee_id && s.day_of_week === sched.day_of_week))
        return [sched, ...filtered]
      })
      setShowShiftModal(false)
      const empName = employees.find(e => e.id === shiftForm.employee_id)?.full_name ?? 'Employee'
      setSuccess(`Shift schedule assigned for ${empName} successfully.`)
    } catch {
      setError('Failed to assign shift schedule.')
    }
  }

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    try {
      const req = await attendanceApi.createLeaveRequest(leaveForm)
      setLeaves(prev => [req, ...prev])
      const empName = employees.find(e => e.id === leaveForm.employee_id)?.full_name ?? 'Employee'
      setSuccess(`Leave request submitted for ${empName}.`)
      
      // Reset form
      setLeaveForm(prev => ({
        ...prev,
        reason: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
      }))
    } catch {
      setError('Failed to submit leave request.')
    }
  }

  const handleApproveLeave = async (requestId: string, status: 'approved' | 'rejected') => {
    setError(null)
    setSuccess(null)
    try {
      const req = await attendanceApi.updateLeaveStatus(requestId, status)
      setLeaves(prev => prev.map(l => l.id === requestId ? req : l))
      setSuccess(`Leave request has been marked as ${status}.`)
    } catch {
      setError(`Failed to update leave request status.`)
    }
  }

  const handleDeleteLog = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this attendance log entry?')) return
    setError(null)
    setSuccess(null)
    try {
      await attendanceApi.deleteAttendanceLog(id)
      setLogs(prev => prev.filter(l => l.id !== id))
      setSuccess('Attendance log entry deleted successfully.')
      if (clockedInLog && clockedInLog.id === id) {
        setClockedInLog(null)
      }
    } catch {
      setError('Failed to delete attendance log entry.')
    }
  }

  const handleDeleteShift = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this shift schedule?')) return
    setError(null)
    setSuccess(null)
    try {
      await attendanceApi.deleteShift(id)
      setShifts(prev => prev.filter(s => s.id !== id))
      setSuccess('Shift schedule deleted successfully.')
    } catch {
      setError('Failed to delete shift schedule.')
    }
  }

  const handleDeleteLeave = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this leave request?')) return
    setError(null)
    setSuccess(null)
    try {
      await attendanceApi.deleteLeaveRequest(id)
      setLeaves(prev => prev.filter(l => l.id !== id))
      setSuccess('Leave request deleted successfully.')
    } catch {
      setError('Failed to delete leave request.')
    }
  }

  // Get active shift details for selected employee
  const getActiveShiftStr = (empId: string) => {
    const s = shifts.find(x => x.employee_id === empId)
    return s ? `${s.shift_name} (${s.start_time} - ${s.end_time})` : 'Not Scheduled'
  }

  // Determine Leave stats
  const pendingLeavesCount = leaves.filter(l => l.status === 'pending').length
  const latePunchesCount = logs.filter(l => l.status === 'late').length
  const presentCount = logs.filter(l => l.clock_in && l.status === 'present').length

  if (loading) {
    return (
      <FintechLayout title="Workforce & Attendance" subtitle="Monitor face biometric logins, geo-fenced logs, shifts, and leaves">
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </FintechLayout>
    )
  }

  return (
    <FintechLayout title="Workforce & Attendance" subtitle="Monitor face biometric logins, geo-fenced logs, shifts, and leaves">
      <div className="space-y-6">
        
        {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}
        {success && <Alert variant="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Clocked Present (Today)', value: presentCount, color: 'text-green-700 bg-green-50' },
            { label: 'Late Punch-ins', value: latePunchesCount, color: 'text-yellow-700 bg-yellow-50' },
            { label: 'Pending Leave Requests', value: pendingLeavesCount, color: 'text-blue-700 bg-blue-50' },
            { label: 'Total Scheduled Shifts', value: shifts.length, color: 'text-purple-700 bg-purple-50' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-3xl font-bold mt-2 ${s.color.split(' ')[0]}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-gray-100 bg-white rounded-2xl p-1.5 shadow-xs">
          {[
            { id: 'punch', label: 'Biometric Clock-In & GPS' },
            { id: 'shifts', label: 'Shift Scheduler' },
            { id: 'leaves', label: 'Leave Board' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="space-y-6">
          
          {/* Tab 1: Punch In/Out */}
          {activeTab === 'punch' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Controls Column */}
              <div className="lg:col-span-1 space-y-6">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-950 text-sm flex items-center gap-1.5">
                    <User className="h-4 w-4 text-violet-500" />
                    <span>Select Employee Profile</span>
                  </h3>
                  <div>
                    <select
                      value={selectedEmpId}
                      onChange={e => setSelectedEmpId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none bg-white"
                    >
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.full_name} ({e.job_title})
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedEmpId && (
                    <div className="bg-gray-50 rounded-xl p-4 text-xs space-y-2.5">
                      <div className="flex justify-between">
                        <span className="text-gray-450">Active Shift:</span>
                        <span className="font-semibold text-gray-800">{getActiveShiftStr(selectedEmpId)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-450">Today's Status:</span>
                        <span className={`font-semibold ${clockedInLog ? 'text-green-600' : 'text-gray-500'}`}>
                          {clockedInLog ? 'Clocked In' : 'Not Punched'}
                        </span>
                      </div>
                      {clockedInLog && (
                        <div className="border-t border-gray-200/50 pt-2 flex justify-between">
                          <span className="text-gray-450">Clock-in Time:</span>
                          <span className="font-mono font-bold text-violet-600">
                            {new Date(clockedInLog.clock_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* GPS Settings Card */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-950 text-sm flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-violet-500" />
                    <span>GPS Punch Location Selector</span>
                  </h3>
                  <p className="text-xs text-gray-400 leading-normal">
                    Toggle check-in coordinates to test the geo-fencing validator.
                  </p>
                  
                  <div className="flex flex-col gap-2">
                    {[
                      { id: 'hq', label: 'Bangalore HQ (Within Geofence)', desc: '12.9716, 77.5946 · (Success)' },
                      { id: 'remote', label: 'Remote Site (Outside Geofence)', desc: '12.9123, 77.6321 · (Flags Alert)' },
                    ].map(loc => (
                      <label
                        key={loc.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          locationMode === loc.id
                            ? 'border-violet-200 bg-violet-50/20'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="locationMode"
                          checked={locationMode === loc.id}
                          onChange={() => setLocationMode(loc.id as any)}
                          className="mt-1 h-4 w-4 text-violet-600 focus:ring-violet-500"
                        />
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{loc.label}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{loc.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scan Center Column */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col items-center">
                  
                  {/* Camera Viewport */}
                  <div className="relative w-full max-w-md aspect-video bg-gray-900 rounded-2xl overflow-hidden border-4 border-gray-950 shadow-inner flex flex-col items-center justify-center">
                    
                    {/* Pulsing grid overlay */}
                    {scanning && (
                      <div className="absolute inset-0 bg-violet-600/10 grid grid-cols-6 grid-rows-6 opacity-30 pointer-events-none border border-violet-500">
                        {Array.from({ length: 36 }).map((_, i) => (
                          <div key={i} className="border-[0.5px] border-violet-500/20" />
                        ))}
                      </div>
                    )}

                    {/* Animated facial grid overlay */}
                    {scanStep === 'measuring' && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <svg className="w-56 h-56 text-violet-400/80 animate-pulse" viewBox="0 0 100 100">
                          {/* Face contour lines */}
                          <path d="M 30,30 Q 50,20 70,30 Q 80,55 70,80 Q 50,95 30,80 Q 20,55 30,30 Z" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
                          {/* Eye coordinates */}
                          <circle cx="40" cy="45" r="3" fill="none" stroke="currentColor" strokeWidth="0.8" />
                          <circle cx="60" cy="45" r="3" fill="none" stroke="currentColor" strokeWidth="0.8" />
                          {/* Nose grid */}
                          <line x1="50" y1="40" x2="50" y2="65" stroke="currentColor" strokeWidth="0.8" />
                          <line x1="45" y1="65" x2="55" y2="65" stroke="currentColor" strokeWidth="0.8" />
                          {/* Biometric node circles */}
                          <circle cx="30" cy="30" r="1.5" fill="currentColor" />
                          <circle cx="70" cy="30" r="1.5" fill="currentColor" />
                          <circle cx="50" cy="22" r="1.5" fill="currentColor" />
                          <circle cx="30" cy="55" r="1.5" fill="currentColor" />
                          <circle cx="70" cy="55" r="1.5" fill="currentColor" />
                          <circle cx="50" cy="88" r="1.5" fill="currentColor" />
                        </svg>
                      </div>
                    )}

                    {/* Status Screen Overlay */}
                    <div className="absolute top-4 left-4 rounded-lg bg-black/60 backdrop-blur-md px-3 py-1.5 text-[10px] font-bold font-mono text-green-400 flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
                      <span>CAM LIVE: CONFIDENCE METRIC 99.4%</span>
                    </div>

                    {scanStep === 'idle' && (
                      <div className="text-center space-y-3">
                        <div className="mx-auto h-14 w-14 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center">
                          <Camera className="h-7 w-7" />
                        </div>
                        <p className="text-xs text-gray-400 font-medium">Biometric Camera Standby</p>
                      </div>
                    )}

                    {scanStep === 'camera' && (
                      <div className="text-center space-y-2 animate-pulse">
                        <Spinner size="md" />
                        <p className="text-xs text-violet-400 font-semibold font-mono">INITIALIZING CAMERA FRAME...</p>
                      </div>
                    )}

                    {scanStep === 'measuring' && (
                      <div className="text-center space-y-1 z-10 bg-black/40 p-3 rounded-xl backdrop-blur-xs">
                        <p className="text-xs font-bold text-violet-400 font-mono tracking-wide animate-pulse">MATCHING BIOMETRIC KEYPOINTS...</p>
                        <p className="text-[10px] text-gray-300 font-mono">Analyzing face topography mapping</p>
                      </div>
                    )}

                    {scanStep === 'success' && (
                      <div className="text-center space-y-3 p-4 bg-black/50 rounded-2xl backdrop-blur-md animate-in zoom-in duration-200">
                        <div className="mx-auto h-12 w-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                          <ShieldCheck className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-green-400">Topography Match Confirmed!</p>
                          <p className="text-xs text-gray-300 mt-0.5">
                            Biometric record match for <span className="font-semibold text-white">{employees.find(e => e.id === selectedEmpId)?.full_name}</span>
                          </p>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Punch Button Triggers */}
                  <div className="w-full max-w-md mt-6 flex gap-4">
                    {scanStep !== 'success' ? (
                      <button
                        onClick={handleStartBiometric}
                        disabled={scanning || !selectedEmpId}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 font-semibold text-sm text-white py-3 transition-colors disabled:opacity-50"
                      >
                        {scanning ? <Spinner size="sm" /> : <Sparkles className="h-4 w-4" />}
                        {scanning ? 'Confirming Topography...' : 'Scan Face & Match Biometrics'}
                      </button>
                    ) : (
                      <>
                        {!clockedInLog ? (
                          <button
                            onClick={handleClockIn}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-700 font-semibold text-sm text-white py-3 transition-colors"
                          >
                            <Clock className="h-4 w-4" /> Clock In Attendance
                          </button>
                        ) : (
                          <button
                            onClick={handleClockOut}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 font-semibold text-sm text-white py-3 transition-colors"
                          >
                            <Clock className="h-4 w-4" /> Clock Out Shift
                          </button>
                        )}
                        <button
                          onClick={() => setScanStep('idle')}
                          className="px-4 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-500"
                        >
                          Reset
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Attendance Logs List */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-950 text-sm">Today's Attendance Registry Log</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 font-medium">
                          <th className="pb-3">Employee Name</th>
                          <th className="pb-3">Clock In</th>
                          <th className="pb-3">Clock Out</th>
                          <th className="pb-3 text-center">GPS Geofence</th>
                          <th className="pb-3 text-center">Status</th>
                          <th className="pb-3 text-right pr-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 font-medium text-gray-650">
                        {logs.slice(0, 10).map(l => (
                          <tr key={l.id} className="hover:bg-gray-50/50">
                            <td className="py-3.5">{l.employee_name}</td>
                            <td className="py-3.5 font-mono">
                              {new Date(l.clock_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3.5 font-mono">
                              {l.clock_out
                                ? new Date(l.clock_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                : '—'}
                            </td>
                            <td className="py-3.5 text-center">
                              <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                l.geo_status === 'within_fence'
                                  ? 'bg-green-50 text-green-700 border border-green-100'
                                  : 'bg-red-50 text-red-700 border border-red-100'
                              }`}>
                                {l.geo_status === 'within_fence' ? 'HQ Approved' : 'Outside Fence'}
                              </span>
                            </td>
                            <td className="py-3.5 text-center">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                l.status === 'present'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {l.status === 'present' ? 'Present' : 'Late Check-in'}
                              </span>
                            </td>
                            <td className="py-3.5 text-right pr-2">
                              <button
                                onClick={() => handleDeleteLog(l.id)}
                                className="p-1 text-gray-400 hover:text-red-650 transition-colors"
                                title="Delete Log Entry"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {logs.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-gray-400">
                              No attendance log entries recorded today.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Shift Scheduling */}
          {activeTab === 'shifts' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Weekly Shift Roster Scheduling</h3>
                  <p className="text-xs text-gray-400 mt-1">Assign work schedules and shift times to employee profiles.</p>
                </div>
                <button
                  onClick={() => setShowShiftModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors"
                >
                  <Plus className="h-4 w-4" /> Schedule Shift
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-medium">
                      <th className="pb-3 pl-2">Employee Name</th>
                      <th className="pb-3 text-center">Shift Pattern</th>
                      <th className="pb-3 text-center">Start Time</th>
                      <th className="pb-3 text-center">End Time</th>
                      <th className="pb-3 text-center">Day/Pattern</th>
                      <th className="pb-3 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-650 font-medium">
                    {shifts.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50/50">
                        <td className="py-3.5 pl-2 font-semibold text-gray-800">{s.employee_name}</td>
                        <td className="py-3.5 text-center">
                          <span className="inline-flex rounded-lg bg-violet-50 text-violet-700 px-2.5 py-1 font-bold text-[10px]">
                            {s.shift_name}
                          </span>
                        </td>
                        <td className="py-3.5 text-center font-mono">{s.start_time}</td>
                        <td className="py-3.5 text-center font-mono">{s.end_time}</td>
                        <td className="py-3.5 text-center text-gray-450">{s.day_of_week ?? 'Weekly'}</td>
                        <td className="py-3.5 text-right pr-2">
                          <button
                            onClick={() => handleDeleteShift(s.id)}
                            className="p-1 text-gray-400 hover:text-red-650 transition-colors"
                            title="Delete Roster Assignment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {shifts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          No shifts scheduled. Click "Schedule Shift" to register employee rosters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Leave Management */}
          {activeTab === 'leaves' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Applying for Leave form */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-violet-500" />
                    <span>Apply for Leave</span>
                  </h3>
                  <form onSubmit={handleCreateLeave} className="space-y-3 text-xs font-semibold text-gray-650">
                    <div>
                      <label className="block text-[10px] uppercase text-gray-400 mb-1">Select Employee</label>
                      <select
                        value={leaveForm.employee_id}
                        onChange={e => setLeaveForm(prev => ({ ...prev, employee_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none bg-white font-medium"
                      >
                        {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase text-gray-400 mb-1">Leave Type</label>
                        <select
                          value={leaveForm.leave_type}
                          onChange={e => setLeaveForm(prev => ({ ...prev, leave_type: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none bg-white font-medium"
                        >
                          <option value="sick">Sick Leave</option>
                          <option value="casual">Casual Leave</option>
                          <option value="earned">Earned Leave</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-gray-400 mb-1">Balance Available</label>
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-bold">
                          {leaveForm.leave_type === 'sick' ? '12 Days' : leaveForm.leave_type === 'casual' ? '8 Days' : '24 Days'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase text-gray-400 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={leaveForm.start_date}
                          onChange={e => setLeaveForm(prev => ({ ...prev, start_date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-gray-400 mb-1">End Date</label>
                        <input
                          type="date"
                          value={leaveForm.end_date}
                          onChange={e => setLeaveForm(prev => ({ ...prev, end_date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-gray-400 mb-1">Reason</label>
                      <textarea
                        rows={2}
                        value={leaveForm.reason}
                        onChange={e => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="State your reason for leave..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl transition-colors mt-2"
                    >
                      Submit Leave Request
                    </button>
                  </form>
                </div>

                {/* Balances Card */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                    <Building className="h-4 w-4 text-violet-500" />
                    <span>Selected Employee Balances</span>
                  </h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Sick Leaves Used', value: 3, limit: 15, color: 'bg-red-500' },
                      { name: 'Casual Leaves Used', value: 4, limit: 12, color: 'bg-yellow-500' },
                      { name: 'Earned Leaves Used', value: 6, limit: 30, color: 'bg-green-500' },
                    ].map(bar => {
                      const pct = (bar.value / bar.limit) * 100
                      return (
                        <div key={bar.name} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-gray-700">
                            <span>{bar.name}</span>
                            <span>{bar.value} / {bar.limit} Days</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div className={`h-full ${bar.color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Leaves List */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-900 text-sm">Leave Applications Review Panel</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 font-medium">
                          <th className="pb-3">Employee</th>
                          <th className="pb-3">Type</th>
                          <th className="pb-3">Duration</th>
                          <th className="pb-3">Reason</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-gray-650 font-medium">
                        {leaves.map(l => (
                          <tr key={l.id} className="hover:bg-gray-50/50">
                            <td className="py-3.5 font-bold text-gray-800">{l.employee_name}</td>
                            <td className="py-3.5 capitalize">{l.leave_type}</td>
                            <td className="py-3.5 text-gray-450">
                              {new Date(l.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(l.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </td>
                            <td className="py-3.5 max-w-[150px] truncate" title={l.reason ?? ''}>{l.reason ?? '—'}</td>
                            <td className="py-3.5">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                                l.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                                l.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-100' :
                                'bg-yellow-50 text-yellow-700 border border-yellow-100'
                              }`}>
                                {l.status}
                              </span>
                            </td>
                            <td className="py-3.5 text-right space-x-1.5">
                              {l.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApproveLeave(l.id, 'approved')}
                                    className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-[10px] font-bold border border-green-100 rounded-lg transition-colors"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleApproveLeave(l.id, 'rejected')}
                                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-100 rounded-lg transition-colors"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {l.status !== 'pending' && <span className="text-gray-400 text-[10px]">Decision logged</span>}
                              <button
                                onClick={() => handleDeleteLeave(l.id)}
                                className="p-1 text-gray-450 hover:text-red-655 transition-colors ml-1.5"
                                title="Delete Leave Request"
                              >
                                <Trash2 className="h-3.5 w-3.5 inline-block align-middle" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {leaves.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-gray-400">
                              No leave requests submitted.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal: Shift Scheduling */}
        {showShiftModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setShowShiftModal(false)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="text-base font-bold text-gray-900 mb-2">Schedule Shift Roster</h3>
              <p className="text-xs text-gray-400 mb-4">Select employee and register their active shift configuration.</p>

              <form onSubmit={handleCreateShift} className="space-y-4 text-xs font-semibold text-gray-650">
                <div>
                  <label className="block text-gray-600 mb-1">Employee Profile *</label>
                  <select
                    value={shiftForm.employee_id}
                    onChange={e => setShiftForm(prev => ({ ...prev, employee_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none bg-white font-medium"
                  >
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-600 mb-1">Shift Name *</label>
                  <select
                    value={shiftForm.shift_name}
                    onChange={e => {
                      const name = e.target.value
                      const start = name === 'Morning Shift' ? '09:00' : name === 'Night Shift' ? '22:00' : '10:00'
                      const end = name === 'Morning Shift' ? '18:00' : name === 'Night Shift' ? '07:00' : '17:00'
                      setShiftForm(prev => ({ ...prev, shift_name: name, start_time: start, end_time: end }))
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="Morning Shift">Morning Shift (09:00 - 18:00)</option>
                    <option value="Night Shift">Night Shift (22:00 - 07:00)</option>
                    <option value="General Shift">General Shift (10:00 - 17:00)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-600 mb-1">Start Time</label>
                    <input
                      type="text"
                      required
                      value={shiftForm.start_time}
                      onChange={e => setShiftForm(prev => ({ ...prev, start_time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none font-mono font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">End Time</label>
                    <input
                      type="text"
                      required
                      value={shiftForm.end_time}
                      onChange={e => setShiftForm(prev => ({ ...prev, end_time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none font-mono font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-600 mb-1">Schedule Recurrence</label>
                  <input
                    type="text"
                    value={shiftForm.day_of_week || 'Weekly'}
                    onChange={e => setShiftForm(prev => ({ ...prev, day_of_week: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none font-medium"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowShiftModal(false)}
                    className="border border-gray-200 hover:bg-gray-50 text-gray-500 px-4 py-2 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-xl"
                  >
                    Assign Roster
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </FintechLayout>
  )
}
