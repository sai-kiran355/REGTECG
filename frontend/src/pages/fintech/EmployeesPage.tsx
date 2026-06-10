import { useState, useEffect } from 'react'
import {
  Users, Search, UserPlus, Mail, Phone,
  Calendar, ShieldCheck, ShieldAlert, ShieldQuestion,
  Building, UserCheck, Trash2, X, RefreshCw, FileText, Download, Upload,
  Copy, Check, ExternalLink, Award, Eye,
} from 'lucide-react'
import { recruitmentApi, Employee, EmployeeStats } from '../../api/recruitment'
import { Spinner } from '../../components/Spinner'
import { Alert } from '../../components/Alert'
import { FintechLayout } from './FintechLayout'

const DEPARTMENTS = [
  'Engineering',
  'Product Management',
  'Design',
  'Marketing',
  'Sales',
  'Human Resources',
  'Finance',
  'Legal',
  'Operations',
]

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:      { label: 'Active',      color: 'bg-green-50 text-green-700 border-green-100' },
  onboarding:  { label: 'Onboarding',  color: 'bg-blue-50 text-blue-700 border-blue-100' },
  suspended:   { label: 'Suspended',   color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
  terminated:  { label: 'Terminated',  color: 'bg-red-50 text-red-700 border-red-100' },
}

const KYC_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  verified: { label: 'KYC Verified', color: 'bg-green-100 text-green-800', icon: ShieldCheck },
  pending:  { label: 'KYC Pending',  color: 'bg-yellow-100 text-yellow-800', icon: ShieldQuestion },
  flagged:  { label: 'Sanctions Flagged', color: 'bg-red-100 text-red-800', icon: ShieldAlert },
}

const parseBankDetails = (str: string | null) => {
  if (!str) return null
  const parts = str.split(' | ')
  if (parts.length < 3) return { raw: str, name: '', account: '', ifsc: '' }
  return {
    raw: null,
    name: parts[0],
    account: parts[1]?.replace('A/C: ', '') || '',
    ifsc: parts[2]?.replace('IFSC: ', '') || '',
  }
}

const parseEducation = (str: string | null) => {
  if (!str) return null
  const parts = str.split(' | ')
  if (parts.length < 3) return { raw: str, edu10: '', edu12: '', college: '' }
  return {
    raw: null,
    edu10: parts[0]?.replace('10th: ', '') || '',
    edu12: parts[1]?.replace('12th: ', '') || '',
    college: parts[2]?.replace('B.Tech/College: ', '') || '',
  }
}

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [stats, setStats] = useState<EmployeeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  // Modals / forms
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    department: 'Engineering',
    job_title: '',
    status: 'active' as Employee['status'],
    manager_name: '',
    hire_date: new Date().toISOString().split('T')[0],
  })

  // Scan state tracking
  const [scanningId, setScanningId] = useState<string | null>(null)

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [drawerTab, setDrawerTab] = useState<'profile' | 'tasks' | 'documents'>('profile')
  const [showESignModal, setShowESignModal] = useState(false)
  const [signName, setSignName] = useState('')

  // Tasks checklist state
  const [tasks, setTasks] = useState<Record<string, boolean>>({
    agreement: false,
    identity: false,
    email: false,
    assets: false,
  })

  const [copiedLink, setCopiedLink] = useState(false)
  const [hrChecks, setHrChecks] = useState({
    aadhaar: false,
    academic: false,
    bank: false,
  })

  // Load tasks when selectedEmployee changes
  useEffect(() => {
    if (selectedEmployee) {
      setHrChecks({ aadhaar: false, academic: false, bank: false })
      const saved = localStorage.getItem(`employee_tasks_${selectedEmployee.id}`)
      if (saved) {
        try {
          setTasks(JSON.parse(saved))
        } catch {
          setTasks({ agreement: false, identity: false, email: false, assets: false })
        }
      } else {
        setTasks({ agreement: false, identity: false, email: false, assets: false })
      }
    }
  }, [selectedEmployee])

  const handleToggleTask = (taskKey: string) => {
    if (!selectedEmployee) return
    const updated = { ...tasks, [taskKey]: !tasks[taskKey] }
    setTasks(updated)
    localStorage.setItem(`employee_tasks_${selectedEmployee.id}`, JSON.stringify(updated))
  }

  const allTasksDone = tasks.agreement && tasks.identity && tasks.email && tasks.assets

  const fetchData = async () => {
    setLoading(true)
    try {
      const [empData, statsData] = await Promise.all([
        recruitmentApi.listEmployees({
          search: search || undefined,
          department: deptFilter || undefined,
          status: statusFilter || undefined,
          page_size: 100,
        }),
        recruitmentApi.getEmployeeStats(),
      ])
      setEmployees(empData.items)
      setStats(statsData)
    } catch {
      setError('Failed to load employee records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [search, deptFilter, statusFilter])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const newEmp = await recruitmentApi.createEmployee(form)
      setEmployees(prev => [newEmp, ...prev])
      setShowAddModal(false)
      // Reset form
      setForm({
        full_name: '',
        email: '',
        phone: '',
        department: 'Engineering',
        job_title: '',
        status: 'active',
        manager_name: '',
        hire_date: new Date().toISOString().split('T')[0],
      })
      const statsData = await recruitmentApi.getEmployeeStats()
      setStats(statsData)
    } catch (err: any) {
      const msg = err?.response?.data?.detail?.message ?? 'Failed to add employee.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: Employee['status']) => {
    try {
      const updated = await recruitmentApi.updateEmployee(id, { status })
      setEmployees(prev => prev.map(e => e.id === id ? updated : e))
      if (selectedEmployee?.id === id) {
        setSelectedEmployee(updated)
      }
      const statsData = await recruitmentApi.getEmployeeStats()
      setStats(statsData)
    } catch {
      setError('Failed to update employee status.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee? This will permanently remove their records.')) return
    try {
      await recruitmentApi.deleteEmployee(id)
      setEmployees(prev => prev.filter(e => e.id !== id))
      if (selectedEmployee?.id === id) {
        setSelectedEmployee(null)
      }
      const statsData = await recruitmentApi.getEmployeeStats()
      setStats(statsData)
    } catch {
      setError('Failed to delete employee records.')
    }
  }

  const handleRunKYC = async (employee: Employee) => {
    setScanningId(employee.id)
    try {
      // Step 1: Set KYC to pending (simulating triggers)
      await recruitmentApi.updateEmployee(employee.id, { kyc_status: 'pending' })
      setEmployees(prev => prev.map(e => e.id === employee.id ? { ...e, kyc_status: 'pending' } : e))
      if (selectedEmployee?.id === employee.id) {
        setSelectedEmployee(prev => prev ? { ...prev, kyc_status: 'pending' } : null)
      }
      
      // Step 2: Trigger a 1.5s visual scanning timeout in browser
      setTimeout(async () => {
        // Simulating a background screening against PEP, AML, and Sanctions databases
        // 85% clean pass rate, 15% sanctions warning match
        const result = Math.random() > 0.15 ? 'verified' : 'flagged'
        const updated = await recruitmentApi.updateEmployee(employee.id, { kyc_status: result })
        setEmployees(prev => prev.map(e => e.id === employee.id ? updated : e))
        if (selectedEmployee?.id === employee.id) {
          setSelectedEmployee(updated)
        }
        
        const statsData = await recruitmentApi.getEmployeeStats()
        setStats(statsData)
        setScanningId(null)
      }, 1500)
    } catch {
      setError('Failed to trigger background KYC screening.')
      setScanningId(null)
    }
  }

  // Helper for generating deterministic initials avatar background colors
  const getAvatarBg = (name: string) => {
    const colors = [
      'bg-red-100 text-red-700',
      'bg-blue-100 text-blue-700',
      'bg-green-100 text-green-700',
      'bg-yellow-100 text-yellow-700',
      'bg-indigo-100 text-indigo-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
    ]
    const index = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length
    return colors[index]
  }

  return (
    <FintechLayout title="Employee Directory" subtitle="Manage your workforce, departments, and compliance KYC screenings">
      <div className="space-y-6">
        
        {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Employees', value: stats.total, color: 'text-gray-900 border-gray-100' },
              { label: 'Active Staff', value: stats.active, color: 'text-green-700 border-green-50' },
              { label: 'Onboarding', value: stats.onboarding, color: 'text-blue-700 border-blue-50' },
              { label: 'Sanctions Flagged', value: stats.flagged, color: 'text-red-700 border-red-50', warn: stats.flagged > 0 },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${s.warn ? 'border-red-200 bg-red-50/20' : 'border-gray-100'}`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1.5 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, job title, email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
            </div>
            
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-violet-400 focus:outline-none bg-white"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-violet-400 focus:outline-none bg-white"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="onboarding">Onboarding</option>
              <option value="suspended">Suspended</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors shrink-0"
          >
            <UserPlus className="h-4 w-4" /> Add Employee
          </button>
        </div>

        {/* Directory Grid/List */}
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-gray-100 bg-white">
            <Users className="h-12 w-12 text-gray-200 mb-4" />
            <p className="text-sm font-medium text-gray-500">No employees found</p>
            <p className="text-xs text-gray-400 mt-1">Refine your search filters or add a new employee records</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map(employee => {
              const status = STATUS_CONFIG[employee.status] || { label: employee.status, color: 'bg-gray-100 text-gray-700' }
              const kyc = KYC_CONFIG[employee.kyc_status] || { label: employee.kyc_status, color: 'bg-gray-100 text-gray-700', icon: ShieldQuestion }
              const KycIcon = kyc.icon

              return (
                <div
                  key={employee.id}
                  onClick={() => { setSelectedEmployee(employee); setDrawerTab('profile') }}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:border-violet-200 hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer select-none"
                >
                  <div>
                    {/* Header: Avatar, Name, Title */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 uppercase ${getAvatarBg(employee.full_name)}`}>
                          {employee.full_name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900 leading-tight truncate">{employee.full_name}</h4>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{employee.job_title}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    {/* Department Badge */}
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-500">
                      <Building className="h-3.5 w-3.5 text-gray-400" />
                      <span>{employee.department}</span>
                    </div>

                    {/* Contact Details */}
                    <div className="mt-2.5 space-y-1.5 text-xs text-gray-500 border-t border-gray-50 pt-2.5">
                      <a href={`mailto:${employee.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 hover:text-violet-600 transition-colors">
                        <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{employee.email}</span>
                      </a>
                      {employee.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span>{employee.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span>Hired: {new Date(employee.hire_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      {employee.manager_name && (
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">Reports to: <span className="font-medium text-gray-700">{employee.manager_name}</span></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Action Bar: Compliance KYC and suspended / delete status */}
                  <div className="mt-5 pt-3.5 border-t border-gray-50 flex items-center justify-between gap-2">
                    
                    {/* Compliance/KYC screening pill */}
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${kyc.color}`}>
                        <KycIcon className="h-3.5 w-3.5 shrink-0" />
                        <span>{kyc.label}</span>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleRunKYC(employee) }}
                        disabled={scanningId === employee.id}
                        title="Run KYC & Sanctions screening scan"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-violet-50 hover:text-violet-600 transition-colors border border-gray-100 disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${scanningId === employee.id ? 'animate-spin text-violet-600' : ''}`} />
                      </button>
                    </div>

                    {/* Manage actions */}
                    <div className="flex items-center gap-1.5">
                      {employee.status !== 'suspended' ? (
                        <button
                          onClick={e => { e.stopPropagation(); handleUpdateStatus(employee.id, 'suspended') }}
                          className="px-2 py-1 text-[10px] font-semibold text-yellow-600 border border-yellow-100 rounded-lg hover:bg-yellow-50 transition-colors"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); handleUpdateStatus(employee.id, 'active') }}
                          className="px-2 py-1 text-[10px] font-semibold text-green-600 border border-green-100 rounded-lg hover:bg-green-50 transition-colors"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(employee.id) }}
                        className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-100 rounded-lg"
                        title="Terminate and Delete record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              )
            })}
          </div>
        )}



        {/* Add Employee Dialog Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="text-lg font-bold text-gray-900 mb-2">Add New Employee</h3>
              <p className="text-xs text-gray-400 mb-5">Create a new employee profile to enter them into the lifecycle database.</p>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Priyesh Patel"
                      value={form.full_name}
                      onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. priyesh@company.com"
                      value={form.email}
                      onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 99639 90000"
                      value={form.phone}
                      onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Department *</label>
                    <select
                      value={form.department}
                      onChange={e => setForm(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none bg-white"
                    >
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Job Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Software Architect"
                      value={form.job_title}
                      onChange={e => setForm(prev => ({ ...prev, job_title: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Reports To (Manager)</label>
                    <input
                      type="text"
                      placeholder="Manager's Full Name"
                      value={form.manager_name}
                      onChange={e => setForm(prev => ({ ...prev, manager_name: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Hiring Date *</label>
                    <input
                      type="date"
                      required
                      value={form.hire_date}
                      onChange={e => setForm(prev => ({ ...prev, hire_date: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Status *</label>
                    <select
                      value={form.status}
                      onChange={e => setForm(prev => ({ ...prev, status: e.target.value as Employee['status'] }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="onboarding">Onboarding</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? <Spinner size="sm" /> : null}
                    {submitting ? 'Adding...' : 'Add Employee'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Drawer Backdrop Overlay */}
        {selectedEmployee && (
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setSelectedEmployee(null)}
          />
        )}

        {/* Employee Detail Slide-out Drawer */}
        {selectedEmployee && (
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-bold text-lg uppercase shrink-0 ${getAvatarBg(selectedEmployee.full_name)}`}>
                  {selectedEmployee.full_name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{selectedEmployee.full_name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{selectedEmployee.job_title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      STATUS_CONFIG[selectedEmployee.status]?.color ?? 'bg-gray-50 text-gray-500'
                    }`}>
                      {STATUS_CONFIG[selectedEmployee.status]?.label ?? selectedEmployee.status}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 ${
                      KYC_CONFIG[selectedEmployee.kyc_status]?.color ?? 'bg-gray-50 text-gray-500'
                    }`}>
                      {selectedEmployee.kyc_status === 'verified' ? <ShieldCheck className="h-3 w-3" /> :
                       selectedEmployee.kyc_status === 'flagged' ? <ShieldAlert className="h-3 w-3" /> :
                       <ShieldQuestion className="h-3 w-3" />}
                      {KYC_CONFIG[selectedEmployee.kyc_status]?.label ?? selectedEmployee.kyc_status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs Header */}
            <div className="flex border-b border-gray-100 px-6 shrink-0">
              {[
                { id: 'profile', label: 'Overview' },
                { id: 'tasks', label: `Onboarding Tasks (${Object.values(tasks).filter(Boolean).length}/4)` },
                { id: 'documents', label: 'Documents Locker' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDrawerTab(tab.id as any)}
                  className={`py-3.5 text-sm font-semibold border-b-2 px-3 transition-colors ${
                    drawerTab === tab.id
                      ? 'border-violet-600 text-violet-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {drawerTab === 'profile' && (
                <div className="space-y-6">
                  {(selectedEmployee.status === 'onboarding' || selectedEmployee.status === 'active') && (
                    <div className="bg-gradient-to-br from-violet-50 to-indigo-50/50 rounded-2xl p-5 border border-violet-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-violet-750 uppercase tracking-wider flex items-center gap-1">
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Digital Onboarding Link</span>
                        </h4>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          selectedEmployee.status === 'onboarding'
                            ? 'bg-violet-100 text-violet-850'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {selectedEmployee.status === 'onboarding' ? 'Pending Self-Submission' : 'Onboarding Complete'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-normal">
                        Candidate needs to complete their profile, bank details, upload credentials and e-sign the contract. Copy and email this link to the employee:
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/onboard/${selectedEmployee.id}`}
                          className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono text-gray-600 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/onboard/${selectedEmployee.id}`)
                            setCopiedLink(true)
                            setTimeout(() => setCopiedLink(false), 2000)
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold transition-colors shrink-0"
                        >
                          {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Org & Role details */}
                  <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Employment Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs">Department</p>
                        <p className="font-semibold text-gray-800 mt-0.5">{selectedEmployee.department}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Hire Date</p>
                        <p className="font-semibold text-gray-800 mt-0.5">
                          {new Date(selectedEmployee.hire_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Reports To (Manager)</p>
                        <p className="font-semibold text-gray-800 mt-0.5">{selectedEmployee.manager_name ?? 'Not Assigned'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Employee ID</p>
                        <p className="font-mono text-xs text-gray-600 mt-1 truncate" title={selectedEmployee.id}>
                          {selectedEmployee.id.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                        <div>
                          <p className="text-gray-400 text-[10px] leading-none">Email Address</p>
                          <a href={`mailto:${selectedEmployee.email}`} className="font-semibold text-violet-600 hover:underline mt-0.5 block">
                            {selectedEmployee.email}
                          </a>
                        </div>
                      </div>
                      {selectedEmployee.phone && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                          <div>
                            <p className="text-gray-400 text-[10px] leading-none">Mobile Phone</p>
                            <p className="font-semibold text-gray-800 mt-0.5">{selectedEmployee.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Compliance & Screening */}
                  <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Compliance Status</h4>
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        selectedEmployee.kyc_status === 'verified' ? 'bg-green-50 text-green-600' :
                        selectedEmployee.kyc_status === 'flagged' ? 'bg-red-50 text-red-600' :
                        'bg-yellow-50 text-yellow-600'
                      }`}>
                        {selectedEmployee.kyc_status === 'verified' ? <ShieldCheck className="h-6 w-6" /> :
                         selectedEmployee.kyc_status === 'flagged' ? <ShieldAlert className="h-6 w-6" /> :
                         <ShieldQuestion className="h-6 w-6" />}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-800">
                          {selectedEmployee.kyc_status === 'verified' ? 'Sanctions Clear & Verified' :
                           selectedEmployee.kyc_status === 'flagged' ? 'Sanctions Red Flag Match' :
                           'Screening Scan Pending'}
                        </p>
                        <p className="text-xs text-gray-500 leading-normal">
                          {selectedEmployee.kyc_status === 'verified' ? 'Checked against global PEP, AML, and regulatory sanctions watchlists. No matching entries found.' :
                           selectedEmployee.kyc_status === 'flagged' ? 'WARNING: A potential match has been flagged in active sanctions list databases. Immediate HR review recommended.' :
                           'This onboarding profile has not yet completed the compliance background check. Run a database scan to verify.'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRunKYC(selectedEmployee)}
                      disabled={scanningId === selectedEmployee.id}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 py-2.5 transition-colors disabled:opacity-50 mt-2"
                    >
                      <RefreshCw className={`h-4 w-4 text-gray-500 ${scanningId === selectedEmployee.id ? 'animate-spin text-violet-600' : ''}`} />
                      {scanningId === selectedEmployee.id ? 'Scanning Watchlists...' : 'Run Sanctions Watchlist Scan'}
                    </button>
                  </div>

                  {/* Submitted details from Employee Self-Service */}
                  {(selectedEmployee.dob || selectedEmployee.address || selectedEmployee.bank_details || selectedEmployee.education) && (
                    <div className="space-y-4 pt-2">
                      <h4 className="text-xs font-bold text-gray-450 uppercase tracking-wider">Employee Self-Submitted Data</h4>
                      
                      {/* Personal Information */}
                      {(selectedEmployee.dob || selectedEmployee.address) && (
                        <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 space-y-3">
                          <h5 className="text-xs font-semibold text-gray-700">Personal & Mailing Address</h5>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            {selectedEmployee.dob && (
                              <div>
                                <p className="text-gray-400 text-xs">Date of Birth</p>
                                <p className="font-semibold text-gray-800 mt-0.5">
                                  {new Date(selectedEmployee.dob).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>
                            )}
                            {selectedEmployee.address && (
                              <div className="col-span-2">
                                <p className="text-gray-400 text-xs">Current Mailing Address</p>
                                <p className="font-semibold text-gray-800 mt-0.5 whitespace-pre-wrap">{selectedEmployee.address}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bank & Payroll Details */}
                      {selectedEmployee.bank_details && (() => {
                        const bank = parseBankDetails(selectedEmployee.bank_details)
                        return bank ? (
                          <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 space-y-3">
                            <h5 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                              <Building className="h-4 w-4 text-violet-500" />
                              <span>Bank Account (For Payroll Disbursements)</span>
                            </h5>
                            {bank.raw ? (
                              <p className="text-sm font-semibold text-gray-800">{bank.raw}</p>
                            ) : (
                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                <div>
                                  <p className="text-gray-400 text-xs">Bank Name</p>
                                  <p className="font-semibold text-gray-850 mt-0.5">{bank.name}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 text-xs">Account Number</p>
                                  <p className="font-mono font-semibold text-gray-850 mt-0.5">{bank.account}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 text-xs">IFSC Code</p>
                                  <p className="font-mono font-semibold text-gray-850 mt-0.5 uppercase">{bank.ifsc}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null
                      })()}

                      {/* Academic Qualifications */}
                      {selectedEmployee.education && (() => {
                        const edu = parseEducation(selectedEmployee.education)
                        return edu ? (
                          <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 space-y-3">
                            <h5 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                              <Award className="h-4 w-4 text-violet-500" />
                              <span>Academic Certificates & Scores</span>
                            </h5>
                            {edu.raw ? (
                              <p className="text-sm font-semibold text-gray-800">{edu.raw}</p>
                            ) : (
                              <div className="grid grid-cols-3 gap-3 text-xs text-gray-600">
                                <div>
                                  <p className="text-gray-450">10th Score</p>
                                  <p className="font-semibold text-gray-800 mt-0.5">{edu.edu10}</p>
                                </div>
                                <div>
                                  <p className="text-gray-450">12th Score</p>
                                  <p className="font-semibold text-gray-800 mt-0.5">{edu.edu12}</p>
                                </div>
                                <div className="col-span-3 sm:col-span-1">
                                  <p className="text-gray-455">Degree & College</p>
                                  <p className="font-semibold text-gray-800 mt-0.5 truncate" title={edu.college}>{edu.college}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null
                      })()}
                    </div>
                  )}

                  {/* HR Admin Verification & Approval Panel */}
                  {selectedEmployee.status === 'onboarding' && (
                    <div className="bg-gradient-to-br from-violet-50/40 to-indigo-50/20 rounded-2xl p-5 border border-violet-100 space-y-4 mt-2">
                      <h5 className="text-xs font-bold text-violet-850 uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-violet-650" />
                        <span>HR Verification Checklist</span>
                      </h5>
                      
                      <div className="space-y-2.5">
                        {[
                          { key: 'aadhaar', label: 'Verify National ID Proof (Aadhaar)' },
                          { key: 'academic', label: 'Verify Academic Certificates (10th/Inter/Degree)' },
                          { key: 'bank', label: 'Verify Bank Details for Salary Payroll' },
                        ].map(check => (
                          <label key={check.key} className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hrChecks[check.key as keyof typeof hrChecks]}
                              onChange={() => setHrChecks(prev => ({ ...prev, [check.key]: !prev[check.key as keyof typeof hrChecks] }))}
                              className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                            />
                            <span className={hrChecks[check.key as keyof typeof hrChecks] ? 'line-through text-gray-400' : 'font-medium text-gray-750'}>
                              {check.label}
                            </span>
                          </label>
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled={!(hrChecks.aadhaar && hrChecks.academic && hrChecks.bank)}
                        onClick={async () => {
                          try {
                            const updated = await recruitmentApi.updateEmployee(selectedEmployee.id, {
                              status: 'active',
                              kyc_status: 'verified',
                            })
                            
                            // Update the local list
                            setEmployees(prev => prev.map(e => e.id === selectedEmployee.id ? updated : e))
                            setSelectedEmployee(updated)
                            
                            // Sync onboarding tasks checklist as fully complete
                            const fullTasks = { agreement: true, identity: true, email: true, assets: true }
                            setTasks(fullTasks)
                            localStorage.setItem(`employee_tasks_${selectedEmployee.id}`, JSON.stringify(fullTasks))
                            
                            // Show simulated welcome mail sending alert
                            alert(`Employee onboarding approved!\n\nWelcome notification email has been successfully sent to ${selectedEmployee.full_name} (${selectedEmployee.email}) with their corporate login details!`);
                            
                            const statsData = await recruitmentApi.getEmployeeStats()
                            setStats(statsData)
                          } catch {
                            setError('Failed to approve employee onboarding.')
                          }
                        }}
                        className="w-full py-2.5 rounded-xl font-semibold text-xs text-white bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        Approve & Activate Employee
                      </button>
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'tasks' && (
                <div className="space-y-6">
                  <div className="bg-violet-50/40 rounded-2xl p-4 border border-violet-100/50">
                    <p className="text-xs text-violet-800 font-medium leading-normal">
                      Track tasks required to transition this profile from a new hire to an active team member.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'agreement', label: 'Sign Employment Agreement Contract', desc: 'Generate and send employment agreement via portal.' },
                      { key: 'identity', label: 'Submit National Identity & Tax Proofs', desc: 'Collect and verify Passport, PAN, or local tax IDs.' },
                      { key: 'email', label: 'Configure Corporate Work Email', desc: 'Set up work mailbox (e.g. name@company.com).' },
                      { key: 'assets', label: 'Assign Corporate Laptop & IT Assets', desc: 'Register hardware asset details in system locker.' },
                    ].map(task => (
                      <label
                        key={task.key}
                        className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer select-none ${
                          tasks[task.key]
                            ? 'border-green-200 bg-green-50/10'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={tasks[task.key]}
                          onChange={() => handleToggleTask(task.key)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold ${tasks[task.key] ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                            {task.label}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{task.desc}</p>
                          {task.key === 'agreement' && !tasks[task.key] && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowESignModal(true);
                              }}
                              className="mt-2 inline-flex items-center gap-1 rounded-lg bg-violet-600 hover:bg-violet-700 px-3 py-1 text-xs font-bold text-white transition-colors"
                            >
                              Sign via E-Sign
                            </button>
                          )}
                          {task.key === 'agreement' && tasks[task.key] && (
                            <span className="mt-2 inline-block rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700 border border-green-100">
                              e-Signed via Aadhaar
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>

                  {selectedEmployee.status === 'onboarding' ? (
                    allTasksDone ? (
                      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center space-y-4 animate-in zoom-in duration-200">
                        <p className="text-sm font-bold text-green-800">✓ Onboarding Checklist Complete!</p>
                        <p className="text-xs text-green-600 leading-normal">
                          All employee onboarding procedures are completed. Promote them to active payroll and attendance tracking.
                        </p>
                        <button
                          onClick={() => handleUpdateStatus(selectedEmployee.id, 'active')}
                          className="w-full rounded-xl bg-green-600 hover:bg-green-700 font-bold text-sm text-white py-2.5 shadow-sm transition-colors"
                        >
                          Activate Employee
                        </button>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-2xl p-4 text-center">
                        <p className="text-xs text-gray-400">
                          Check off all onboarding requirements to activate this employee profile.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="bg-green-50/30 border border-green-100 rounded-2xl p-4 text-center">
                      <p className="text-xs font-semibold text-green-700">
                        This employee has already completed onboarding and is active.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'documents' && (
                <div className="space-y-6">
                  {/* File List */}
                  <div className="space-y-3">
                    {(() => {
                      const docList = []
                      
                      // 1. Employment Contract
                      if (tasks.agreement) {
                        docList.push({ name: 'employment_contract_signed.pdf', size: '2.4 MB', type: 'Employment Contract', signed: true, pending: false })
                      } else {
                        docList.push({ name: 'employment_contract_draft.pdf', size: '1.8 MB', type: 'Draft Contract', signed: false, pending: false })
                      }
                      
                      // 2. Parsed uploaded docs from the self-service portal
                      if (selectedEmployee.uploaded_docs) {
                        const entries = selectedEmployee.uploaded_docs.split(',').map(s => s.trim()).filter(Boolean)
                        entries.forEach(entry => {
                          if (entry.includes(':')) {
                            const [docType, filename] = entry.split(':')
                            const typeMap: Record<string, string> = {
                              aadhaar: 'National ID (Aadhaar)',
                              cert10th: '10th Class Certificate',
                              cert12th: 'Intermediate Certificate',
                              degree: 'B.Tech/Degree Certificate',
                            }
                            docList.push({
                              name: filename,
                              size: 'Uploaded via Portal',
                              type: typeMap[docType] || 'Uploaded Document',
                              signed: false,
                              pending: false,
                              docType: docType,
                            })
                          } else {
                            const docName = entry
                            if (docName === 'Aadhaar Card') {
                              docList.push({ name: 'aadhaar_card.pdf', size: '1.4 MB', type: 'National ID', signed: false, pending: false, docType: 'aadhaar' })
                            } else if (docName === '10th Certificate') {
                              docList.push({ name: 'marksheet_10th.pdf', size: '1.1 MB', type: 'Academic Certificate', signed: false, pending: false, docType: 'cert10th' })
                            } else if (docName === 'Intermediate Certificate') {
                              docList.push({ name: 'marksheet_12th.pdf', size: '1.2 MB', type: 'Academic Certificate', signed: false, pending: false, docType: 'cert12th' })
                            } else if (docName === 'B.Tech/Degree Certificate') {
                              docList.push({ name: 'degree_graduation.pdf', size: '2.1 MB', type: 'Degree Certificate', signed: false, pending: false, docType: 'degree' })
                            } else {
                              docList.push({
                                name: `${docName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
                                size: '1.5 MB',
                                type: 'Uploaded Document',
                                signed: false,
                                pending: false,
                                docType: 'other'
                              })
                            }
                          }
                        })
                      } else {
                        // Standard placeholders for visualization prior to self-service submission
                        docList.push({ name: 'aadhaar_card_placeholder.pdf', size: 'Pending Upload', type: 'National ID', signed: false, pending: true, docType: 'aadhaar' })
                        docList.push({ name: 'academic_transcript_placeholder.pdf', size: 'Pending Upload', type: 'Education', signed: false, pending: true, docType: 'cert10th' })
                      }

                      return docList.map(file => (
                        <div key={file.name} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                          file.pending ? 'border-dashed border-gray-200 bg-gray-50/30 opacity-60' : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-xs'
                        }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-gray-50 text-gray-500 rounded-lg shrink-0">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-semibold truncate ${file.pending ? 'text-gray-400' : 'text-gray-800'}`}>{file.name}</p>
                                {file.signed && (
                                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-[8px] font-bold text-green-700 border border-green-100">
                                    e-Signed
                                  </span>
                                )}
                                {file.pending && (
                                  <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-[8px] font-bold text-yellow-700 border border-yellow-100 animate-pulse">
                                    Awaiting upload
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">{file.size} · <span className="font-medium text-gray-500">{file.type}</span></p>
                            </div>
                          </div>
                          {!file.pending && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {file.docType && file.docType !== 'other' && (
                                <button
                                  onClick={() => {
                                    window.open(recruitmentApi.getEmployeeDocUrl(selectedEmployee.id, file.docType!), '_blank')
                                  }}
                                  className="p-2 text-gray-400 hover:bg-violet-50 hover:text-violet-600 transition-colors border border-gray-200 rounded-lg"
                                  title="View document inline"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (file.docType && file.docType !== 'other') {
                                    window.open(recruitmentApi.getEmployeeDocUrl(selectedEmployee.id, file.docType, true), '_blank')
                                  } else {
                                    alert(`Downloading simulated file: ${file.name}`)
                                  }
                                }}
                                className="p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors border border-gray-200 rounded-lg"
                                title="Download file"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    })()}
                  </div>

                  {/* Upload Zone */}
                  <div className="rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center hover:border-violet-300 transition-colors cursor-pointer bg-gray-50/20">
                    <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-600">Upload new onboarding file</p>
                    <p className="text-[10px] text-gray-400 mt-1">PDF, JPG, PNG or DOCX up to 10MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
              <button
                onClick={() => handleDelete(selectedEmployee.id).then(() => setSelectedEmployee(null))}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 hover:bg-red-50 text-xs font-semibold text-red-600 px-3.5 py-2.5 transition-colors"
              >
                <Trash2 className="h-4 w-4" /> Terminate Employee
              </button>
              <div className="flex gap-2">
                {selectedEmployee.status !== 'suspended' ? (
                  <button
                    onClick={() => handleUpdateStatus(selectedEmployee.id, 'suspended')}
                    className="rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-yellow-600 px-4 py-2.5 transition-colors"
                  >
                    Suspend Staff
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateStatus(selectedEmployee.id, 'active')}
                    className="rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-green-600 px-4 py-2.5 transition-colors"
                  >
                    Activate Staff
                  </button>
                )}
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="rounded-xl bg-gray-900 hover:bg-gray-800 text-xs font-semibold text-white px-4 py-2.5 transition-colors"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* E-Signature Modal */}
        {showESignModal && selectedEmployee && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-2">E-Sign Employment Agreement</h3>
              <p className="text-xs text-gray-400 mb-4">
                Please review the terms and sign the agreement document for <strong>{selectedEmployee.full_name}</strong>.
              </p>

              {/* Scrollable document copy */}
              <div className="border border-gray-105 rounded-xl p-4 bg-gray-50 max-h-[160px] overflow-y-auto text-[10px] text-gray-500 leading-relaxed font-mono mb-4">
                <p className="font-bold text-gray-700 mb-2">EMPLOYMENT & NDA AGREEMENT</p>
                <p className="mb-2">
                  This Agreement is entered into on this day by and between the Employer and {selectedEmployee.full_name} (the "Employee").
                </p>
                <p className="mb-2">
                  1. POSITION AND DUTIES. The Employee shall serve in the capacity of {selectedEmployee.job_title} under the {selectedEmployee.department} department, reporting directly to {selectedEmployee.manager_name || "the direct supervisor"}.
                </p>
                <p className="mb-2">
                  2. CONFIDENTIALITY. The Employee agrees that during and after employment, they shall not disclose any proprietary financial code, consumer data, or trade secrets to any third party.
                </p>
                <p>
                  3. GOVERNING LAW. This agreement is governed by the employment laws of the jurisdiction of incorporation.
                </p>
              </div>

              {/* E-Sign fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Type Full Name to Sign *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={signName}
                    onChange={e => setSignName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
                  />
                </div>

                {/* Signature Preview */}
                <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-violet-50/20 text-center flex flex-col items-center justify-center min-h-[90px]">
                  {signName ? (
                    <div>
                      <p className="font-serif italic text-3xl text-indigo-900 border-b border-dashed border-gray-300 px-6 pb-2 inline-block">
                        {signName}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-2">ComplianceOS Secure E-Sign Certificate: SHA-256 Verified</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Signature preview will appear here</p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 mt-6 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowESignModal(false); setSignName('') }}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!signName}
                  onClick={() => {
                    handleToggleTask('agreement');
                    setShowESignModal(false);
                    setSignName('');
                  }}
                  className="rounded-xl bg-violet-600 hover:bg-violet-700 font-semibold text-sm text-white px-5 py-2 transition-colors disabled:opacity-50"
                >
                  Sign Document
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </FintechLayout>
  )
}
