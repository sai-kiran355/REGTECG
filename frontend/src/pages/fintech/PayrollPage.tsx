import React, { useState, useEffect } from 'react'
import {
  Wallet, Calculator, Trash2, X, Download,
  ShieldCheck, CheckCircle, RefreshCw
} from 'lucide-react'
import { recruitmentApi, Employee } from '../../api/recruitment'
import { payrollApi, SalaryStructure, PayrollLog } from '../../api/payroll'
import { Spinner } from '../../components/Spinner'
import { Alert } from '../../components/Alert'
import { useAuthStore } from '../../store/authStore'
import { FintechLayout } from './FintechLayout'

export function PayrollPage() {
  const accessToken = useAuthStore(state => state.accessToken)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [structures, setStructures] = useState<SalaryStructure[]>([])
  const [logs, setLogs] = useState<PayrollLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'run' | 'structures' | 'history'>('run')

  // Run Payroll Period
  const [payPeriod, setPayPeriod] = useState('June 2026')
  const [processing, setProcessing] = useState(false)
  const [runSummary, setRunSummary] = useState<{
    totalGross: number
    totalTds: number
    totalPf: number
    totalEsi: number
    totalNet: number
    employeesCount: number
  } | null>(null)

  // Configure Structure Modal
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [selectedEmpId, setSelectedEmpId] = useState('')
  const [configForm, setConfigForm] = useState({
    monthly_base_salary: 30000,
    allowances: 5000,
    pf_opt_in: true,
    esi_opt_in: true,
    pan_number: '',
  })

  const loadData = async () => {
    try {
      const [empRes, structRes, logsRes] = await Promise.all([
        recruitmentApi.listEmployees({ page_size: 100 }),
        payrollApi.listSalaryStructures(),
        payrollApi.listPayrollLogs(),
      ])
      setEmployees(empRes.items.filter(e => e.status === 'active'))
      setStructures(structRes.items)
      setLogs(logsRes.items)
    } catch (err: any) {
      setError('Failed to load payroll directory registers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Open config structure modal for an employee
  const handleOpenConfig = (empId: string) => {
    const struct = structures.find(s => s.employee_id === empId)
    setSelectedEmpId(empId)
    if (struct) {
      setConfigForm({
        monthly_base_salary: struct.monthly_base_salary,
        allowances: struct.allowances,
        pf_opt_in: struct.pf_opt_in,
        esi_opt_in: struct.esi_opt_in,
        pan_number: struct.pan_number || '',
      })
    } else {
      setConfigForm({
        monthly_base_salary: 40000,
        allowances: 6000,
        pf_opt_in: true,
        esi_opt_in: true,
        pan_number: '',
      })
    }
    setShowConfigModal(true)
  }

  // Save employee structure
  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    try {
      const saved = await payrollApi.saveSalaryStructure({
        employee_id: selectedEmpId,
        monthly_base_salary: Number(configForm.monthly_base_salary),
        allowances: Number(configForm.allowances),
        pf_opt_in: configForm.pf_opt_in,
        esi_opt_in: configForm.esi_opt_in,
        pan_number: configForm.pan_number || undefined,
      })
      
      // Update local state structures list
      setStructures(prev => {
        const filtered = prev.filter(s => s.employee_id !== selectedEmpId)
        return [saved, ...filtered]
      })

      const empName = employees.find(emp => emp.id === selectedEmpId)?.full_name ?? 'Employee'
      setSuccess(`Salary structure configured successfully for ${empName}.`)
      setShowConfigModal(false)
    } catch {
      setError('Failed to save salary structure settings.')
    }
  }

  // Execute Auto Payroll processing
  const handleProcessPayroll = async () => {
    setError(null)
    setSuccess(null)
    setProcessing(true)
    setRunSummary(null)
    
    // Simulate processing delay for nice animation
    setTimeout(async () => {
      try {
        const result = await payrollApi.processPayroll({ pay_period: payPeriod })
        
        // Refresh logs list
        const logsRes = await payrollApi.listPayrollLogs()
        setLogs(logsRes.items)

        // Compute summary metrics of the current run
        const currentPeriodLogs = result.items.filter(x => x.pay_period === payPeriod)
        
        let gross = 0, tds = 0, pf = 0, esi = 0, net = 0
        currentPeriodLogs.forEach(l => {
          gross += (l.base_salary + l.allowances)
          tds += l.deductions_tds
          pf += l.deductions_pf
          esi += l.deductions_esi
          net += l.net_salary
        })

        setRunSummary({
          totalGross: gross,
          totalTds: tds,
          totalPf: pf,
          totalEsi: esi,
          totalNet: net,
          employeesCount: currentPeriodLogs.length,
        })

        if (currentPeriodLogs.length === 0) {
          setError('No active employees with configured salary structures were found to process.')
        } else {
          setSuccess(`Automated payroll run executed successfully for period: ${payPeriod}!`)
        }
      } catch {
        setError('Failed to execute automated payroll processing run.')
      } finally {
        setProcessing(false)
      }
    }, 1500)
  }

  // Delete log entry
  const handleDeleteLog = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this historical payroll ledger entry?')) return
    setError(null)
    setSuccess(null)
    try {
      await payrollApi.deletePayrollLog(id)
      setLogs(prev => prev.filter(l => l.id !== id))
      setSuccess('Payroll record deleted successfully.')
    } catch {
      setError('Failed to delete payroll record.')
    }
  }

  // Fetch salary configuration matching employee ID
  const getSalaryStructureStr = (empId: string) => {
    const s = structures.find(x => x.employee_id === empId)
    if (!s) return 'Not Configured'
    const gross = s.monthly_base_salary + s.allowances
    return `₹${gross.toLocaleString('en-IN')}/mo`
  }

  if (loading) {
    return (
      <FintechLayout title="Payroll & Compensation" subtitle="Configure base payouts, tax computations, and compliance logs">
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </FintechLayout>
    )
  }

  // Cumulative Metrics Calculations
  const totalTdsPaid = logs.reduce((sum, item) => sum + item.deductions_tds, 0)
  const totalPfDeposited = logs.reduce((sum, item) => sum + item.deductions_pf, 0)
  const totalEsiDeposited = logs.reduce((sum, item) => sum + item.deductions_esi, 0)
  const totalDisbursed = logs.reduce((sum, item) => sum + item.net_salary, 0)

  return (
    <FintechLayout title="Payroll & Compensation" subtitle="Process monthly payroll, generate payslips, calculate taxes and compliance deductions">
      <div className="space-y-6">
        
        {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}
        {success && <Alert variant="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Overview Stats widgets */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Net Payout Disbursed', value: `₹${totalDisbursed.toLocaleString('en-IN')}`, color: 'text-indigo-700 bg-indigo-50' },
            { label: 'Total TDS Withheld (Tax)', value: `₹${totalTdsPaid.toLocaleString('en-IN')}`, color: 'text-orange-700 bg-orange-50' },
            { label: 'Total EPF Contributions', value: `₹${totalPfDeposited.toLocaleString('en-IN')}`, color: 'text-blue-700 bg-blue-50' },
            { label: 'Total ESI Deposits', value: `₹${totalEsiDeposited.toLocaleString('en-IN')}`, color: 'text-emerald-700 bg-emerald-50' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-2xl font-bold mt-2 ${s.color.split(' ')[0]}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs Headers */}
        <div className="flex border-b border-gray-100 bg-white rounded-2xl p-1.5 shadow-xs">
          {[
            { id: 'run', label: 'Auto Payroll Run' },
            { id: 'structures', label: 'Salary Structures' },
            { id: 'history', label: 'Payslips & History Log' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any)
                setSuccess(null)
                setError(null)
              }}
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

        {/* Tabs contents */}
        <div className="space-y-6">

          {/* Tab 1: Run Auto Payroll */}
          {activeTab === 'run' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Controls block */}
              <div className="lg:col-span-1 space-y-6">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                    <Calculator className="h-4 w-4 text-violet-500" />
                    <span>Run Monthly Payroll</span>
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Select target monthly cycle. The system executes salary computations, tax deductions (TDS), PF/ESI contributions, and updates registries.
                  </p>

                  <div className="space-y-3 font-semibold text-xs text-gray-650">
                    <div>
                      <label className="block text-[10px] uppercase text-gray-400 mb-1">Pay Period Cycle</label>
                      <select
                        value={payPeriod}
                        onChange={e => setPayPeriod(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none bg-white font-medium text-sm"
                      >
                        {['April 2026', 'May 2026', 'June 2026', 'July 2026', 'August 2026', 'September 2026'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleProcessPayroll}
                      disabled={processing}
                      className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 text-sm mt-3"
                    >
                      {processing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                      {processing ? 'Processing Payroll Run...' : `Process Payouts: ${payPeriod}`}
                    </button>
                  </div>
                </div>

                {/* Compliance Info Card */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-3.5">
                  <h3 className="font-bold text-gray-950 text-xs flex items-center gap-1.5 uppercase tracking-wider text-gray-400">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>Compliance Guidelines Applied</span>
                  </h3>
                  <div className="space-y-2.5 text-xs text-gray-600 leading-normal">
                    <div className="flex gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <p><strong>Basic Pay:</strong> Computed at 50% of the Base Salary structure configuration.</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <p><strong>EPF (12%):</strong> Deducted from basic salary for all enrolled employee structures.</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <p><strong>ESI (0.75%):</strong> Applicable on monthly gross salary limit up to ₹21,000.</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <p><strong>TDS (Income Tax):</strong> Calculates monthly tax deductions automatically using standard slab rates.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Run summary / status block */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm min-h-[300px] flex flex-col justify-between">
                  {processing ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-10">
                      <Spinner size="lg" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-violet-600 font-mono tracking-wide animate-pulse">AUTOPAYROLL PIPELINE RUNNING...</p>
                        <p className="text-xs text-gray-400 mt-1">Aggregating salary records, calculating tax slabs, and generating ledger</p>
                      </div>
                    </div>
                  ) : runSummary ? (
                    <div className="space-y-6 animate-in zoom-in duration-200">
                      <div>
                        <h3 className="font-bold text-gray-900 text-base flex items-center gap-1.5">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span>Run Summary — {payPeriod}</span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">Ledger generated and disbursed successfully.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'Employees Paid', value: runSummary.employeesCount, color: 'text-gray-900' },
                          { label: 'Net Disbursed Payout', value: `₹${runSummary.totalNet.toLocaleString('en-IN')}`, color: 'text-violet-700' },
                          { label: 'Total Income Tax (TDS)', value: `₹${runSummary.totalTds.toLocaleString('en-IN')}`, color: 'text-orange-600' },
                          { label: 'Provident Fund (EPF)', value: `₹${runSummary.totalPf.toLocaleString('en-IN')}`, color: 'text-blue-600' },
                        ].map(stat => (
                          <div key={stat.label} className="bg-gray-50 border border-gray-100/50 rounded-xl p-4">
                            <p className="text-[10px] uppercase text-gray-400 font-bold">{stat.label}</p>
                            <p className={`text-xl font-extrabold mt-1.5 ${stat.color}`}>{stat.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-xs text-gray-400">
                        <span>Total Salary Ledger Gross Cost:</span>
                        <span className="font-bold text-gray-800 text-sm font-mono">₹{runSummary.totalGross.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-10 space-y-3">
                      <div className="h-12 w-12 rounded-full bg-violet-50 text-violet-500 flex items-center justify-center">
                        <Wallet className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Payroll Standby</p>
                        <p className="text-xs text-gray-400 mt-1">Select cycle and trigger the pay run to view ledger summaries.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Salary Structures */}
          {activeTab === 'structures' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Salary Structure Configuration Directory</h3>
                <p className="text-xs text-gray-400 mt-1">Set monthly base wages, allowances, PAN card details, and opt-in PF or ESI deductions.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-medium">
                      <th className="pb-3 pl-2">Employee Name</th>
                      <th className="pb-3">Department</th>
                      <th className="pb-3 text-center">Gross Wage</th>
                      <th className="pb-3 text-center">PF Status</th>
                      <th className="pb-3 text-center">ESI Status</th>
                      <th className="pb-3">PAN Number</th>
                      <th className="pb-3 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-650 font-medium">
                    {employees.map(emp => {
                      const struct = structures.find(s => s.employee_id === emp.id)
                      const isConfigured = !!struct
                      return (
                        <tr key={emp.id} className="hover:bg-gray-50/50">
                          <td className="py-3.5 pl-2">
                            <div className="font-semibold text-gray-800">{emp.full_name}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{emp.job_title}</div>
                          </td>
                          <td className="py-3.5 text-gray-500">{emp.department}</td>
                          <td className="py-3.5 text-center font-bold text-gray-800 font-mono">
                            {getSalaryStructureStr(emp.id)}
                          </td>
                          <td className="py-3.5 text-center">
                            {isConfigured ? (
                              <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                                struct.pf_opt_in
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                  : 'bg-gray-50 text-gray-500 border border-gray-100'
                              }`}>
                                {struct.pf_opt_in ? 'Enrolled' : 'Opted Out'}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-3.5 text-center">
                            {isConfigured ? (
                              <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                                struct.esi_opt_in
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-gray-50 text-gray-500 border border-gray-100'
                              }`}>
                                {struct.esi_opt_in ? 'Enrolled' : 'Opted Out'}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-3.5 text-gray-500 font-mono">{struct?.pan_number ?? '—'}</td>
                          <td className="py-3.5 text-right pr-2">
                            <button
                              onClick={() => handleOpenConfig(emp.id)}
                              className="px-3 py-1.5 border border-gray-200 hover:border-violet-200 hover:bg-violet-50/20 text-violet-600 rounded-lg transition-colors font-bold text-[11px]"
                            >
                              Configure Pay
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-400">
                          No active employees registered. Please add staff in the Employees registry.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Payroll History & Slips */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Processed Monthly Payroll History Register</h3>
                <p className="text-xs text-gray-400 mt-1">Audit computed gross/net salaries, TDS taxes, PF/ESI deductions, and download payslips.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-medium">
                      <th className="pb-3 pl-2">Employee Name</th>
                      <th className="pb-3">Period</th>
                      <th className="pb-3 text-center">Gross Pay</th>
                      <th className="pb-3 text-center">TDS (Tax)</th>
                      <th className="pb-3 text-center">PF (Fund)</th>
                      <th className="pb-3 text-center">ESI</th>
                      <th className="pb-3 text-center font-bold">Net Salary</th>
                      <th className="pb-3 text-center">Status</th>
                      <th className="pb-3 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-650 font-medium">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50/50">
                        <td className="py-3.5 pl-2 font-semibold text-gray-800">{log.employee_name}</td>
                        <td className="py-3.5 text-gray-500 font-mono">{log.pay_period}</td>
                        <td className="py-3.5 text-center font-mono font-semibold">
                          ₹{(log.base_salary + log.allowances).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 text-center font-mono text-orange-600">₹{log.deductions_tds}</td>
                        <td className="py-3.5 text-center font-mono text-blue-600">₹{log.deductions_pf}</td>
                        <td className="py-3.5 text-center font-mono text-emerald-600">₹{log.deductions_esi}</td>
                        <td className="py-3.5 text-center font-mono font-bold text-indigo-700">
                          ₹{log.net_salary.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 text-center">
                          <span className="inline-flex rounded-full bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 text-[9px] font-bold">
                            Disbursed
                          </span>
                        </td>
                        <td className="py-3.5 text-right pr-2 space-x-1.5">
                          <a
                            href={payrollApi.getPayslipUrl(log.id, accessToken || '')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 hover:bg-violet-50 hover:text-violet-600 border border-gray-200 hover:border-violet-200 text-gray-600 text-[10px] font-bold rounded-lg transition-colors"
                            title="Open printable payslip"
                          >
                            <Download className="h-3 w-3" /> Slip
                          </a>
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1.5 text-gray-400 hover:text-red-650 transition-colors inline-block align-middle"
                            title="Delete Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-gray-400">
                          No processed payroll records. Switch to "Auto Payroll Run" to execute monthly payout processes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal: Configure Salary Structure */}
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setShowConfigModal(false)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="text-base font-bold text-gray-900 mb-2">Configure Employee Compensation</h3>
              <p className="text-xs text-gray-400 mb-4">
                Set salary details for: <span className="font-semibold text-gray-700">{employees.find(e => e.id === selectedEmpId)?.full_name}</span>
              </p>

              <form onSubmit={handleSaveStructure} className="space-y-4 text-xs font-semibold text-gray-650">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-600 mb-1">Monthly Base Salary (₹) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={configForm.monthly_base_salary}
                      onChange={e => setConfigForm(prev => ({ ...prev, monthly_base_salary: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none font-mono font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Monthly Allowances (₹) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={configForm.allowances}
                      onChange={e => setConfigForm(prev => ({ ...prev, allowances: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none font-mono font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-600 mb-1">PAN Card Number (TDS Computation)</label>
                  <input
                    type="text"
                    maxLength={50}
                    placeholder="Enter PAN e.g. ABCDE1234F"
                    value={configForm.pan_number}
                    onChange={e => setConfigForm(prev => ({ ...prev, pan_number: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none font-mono font-medium"
                  />
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                  <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Statutory Deductions Enrollment</p>
                  
                  <label className="flex items-center gap-3 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={configForm.pf_opt_in}
                      onChange={e => setConfigForm(prev => ({ ...prev, pf_opt_in: e.target.checked }))}
                      className="h-4 w-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                    />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Enroll in Employee Provident Fund (EPF)</p>
                      <p className="text-[10px] text-gray-400 font-normal mt-0.5">Deducts standard 12% of employee basic salary.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={configForm.esi_opt_in}
                      onChange={e => setConfigForm(prev => ({ ...prev, esi_opt_in: e.target.checked }))}
                      className="h-4 w-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                    />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Enroll in Employee State Insurance (ESI)</p>
                      <p className="text-[10px] text-gray-400 font-normal mt-0.5">Deducts 0.75% of gross if gross monthly wage is under ₹21,000.</p>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="border border-gray-200 hover:bg-gray-50 text-gray-500 px-4 py-2 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-xl font-bold"
                  >
                    Save Structure
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
