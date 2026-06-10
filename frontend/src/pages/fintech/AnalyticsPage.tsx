import React, { useState, useEffect } from 'react'
import {
  TrendingUp, BarChart3, Target, Sparkles, Plus, X, Trash2,
  RefreshCw, CheckCircle, AlertTriangle, AlertOctagon, HelpCircle,
  Users, Wallet, Award, Star, Activity
} from 'lucide-react'
import { recruitmentApi, Employee } from '../../api/recruitment'
import {
  analyticsApi, PerformanceReview,
  HeadcountSummary, AttritionPrediction, AIInsight, AnalyticsOverview
} from '../../api/analytics'
import { Spinner } from '../../components/Spinner'
import { Alert } from '../../components/Alert'
import { FintechLayout } from './FintechLayout'

export function AnalyticsPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [reviews, setReviews] = useState<PerformanceReview[]>([])
  const [headcountSummary, setHeadcountSummary] = useState<HeadcountSummary[]>([])
  const [attritionList, setAttritionList] = useState<AttritionPrediction[]>([])
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'attrition' | 'performance' | 'headcount' | 'insights'>('attrition')
  const [selectedYear] = useState(2026)
  const [recalculating, setRecalculating] = useState(false)

  // Modals state
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    employee_id: '',
    reviewer_name: '',
    rating: 4,
    goals_met_pct: 90,
    feedback: '',
  })

  const [showHeadcountModal, setShowHeadcountModal] = useState(false)
  const [headcountForm, setHeadcountForm] = useState({
    department: 'Engineering',
    target_count: 15,
    budget_allocated: 12000000,
  })

  const loadData = async () => {
    try {
      const [empRes, overviewRes, reviewsRes, headcountRes, attritionRes, insightsRes] = await Promise.all([
        recruitmentApi.listEmployees({ page_size: 100 }),
        analyticsApi.getOverview(selectedYear),
        analyticsApi.listPerformanceReviews(),
        analyticsApi.getHeadcountSummary(selectedYear),
        analyticsApi.listAttritionPredictions(),
        analyticsApi.listAIInsights(selectedYear),
      ])
      setEmployees(empRes.items.filter(e => e.status === 'active'))
      setOverview(overviewRes)
      setReviews(reviewsRes)
      setHeadcountSummary(headcountRes)
      setAttritionList(attritionRes)
      setInsights(insightsRes)
    } catch (err) {
      setError('Failed to fetch workforce analytics directories.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Recalculate AI Risk
  const handleRecalculate = async () => {
    setRecalculating(true)
    setError(null)
    setSuccess(null)
    try {
      const updated = await analyticsApi.recalculateAttrition()
      setAttritionList(updated)
      
      // Reload stats overview & insights to reflect updated scores
      const [overviewRes, insightsRes] = await Promise.all([
        analyticsApi.getOverview(selectedYear),
        analyticsApi.listAIInsights(selectedYear)
      ])
      setOverview(overviewRes)
      setInsights(insightsRes)
      setSuccess('AI Attrition Risk recalculation completed successfully.')
    } catch {
      setError('Failed to recalculate workforce attrition forecasting.')
    } finally {
      setRecalculating(false)
    }
  }

  // Create review
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewForm.employee_id) {
      setError('Please select an employee.')
      return
    }
    setError(null)
    setSuccess(null)
    try {
      const saved = await analyticsApi.createPerformanceReview({
        employee_id: reviewForm.employee_id,
        reviewer_name: reviewForm.reviewer_name,
        rating: Number(reviewForm.rating),
        goals_met_pct: Number(reviewForm.goals_met_pct),
        feedback: reviewForm.feedback || undefined,
      })
      setReviews(prev => [saved, ...prev])
      
      // Reload overview
      const overviewRes = await analyticsApi.getOverview(selectedYear)
      setOverview(overviewRes)
      
      setSuccess('Employee performance evaluation recorded successfully.')
      setShowReviewModal(false)
      setReviewForm({
        employee_id: '',
        reviewer_name: '',
        rating: 4,
        goals_met_pct: 90,
        feedback: '',
      })
    } catch {
      setError('Failed to record performance review.')
    }
  }

  // Delete review
  const handleDeleteReview = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this performance review history entry?')) return
    setError(null)
    setSuccess(null)
    try {
      await analyticsApi.deletePerformanceReview(id)
      setReviews(prev => prev.filter(r => r.id !== id))
      
      const overviewRes = await analyticsApi.getOverview(selectedYear)
      setOverview(overviewRes)
      setSuccess('Performance review deleted successfully.')
    } catch {
      setError('Failed to delete performance review.')
    }
  }

  // Save headcount plan
  const handleSaveHeadcountPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    try {
      await analyticsApi.saveHeadcountPlan({
        department: headcountForm.department,
        year: selectedYear,
        target_count: Number(headcountForm.target_count),
        budget_allocated: Number(headcountForm.budget_allocated),
      })
      
      // Reload summary stats
      const [sumRes, overviewRes, insightsRes] = await Promise.all([
        analyticsApi.getHeadcountSummary(selectedYear),
        analyticsApi.getOverview(selectedYear),
        analyticsApi.listAIInsights(selectedYear)
      ])
      setHeadcountSummary(sumRes)
      setOverview(overviewRes)
      setInsights(insightsRes)
      
      setSuccess(`Headcount target for ${headcountForm.department} updated successfully.`)
      setShowHeadcountModal(false)
    } catch {
      setError('Failed to save headcount target plan.')
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'bg-red-50 text-red-700 border-red-100'
      case 'Medium': return 'bg-orange-50 text-orange-700 border-orange-100'
      default: return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'danger': return <AlertOctagon className="h-5 w-5 text-red-500 shrink-0" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
      default: return <HelpCircle className="h-5 w-5 text-violet-500 shrink-0" />
    }
  }

  const getInsightCardColor = (type: string) => {
    switch (type) {
      case 'danger': return 'border-red-100 bg-red-50/20'
      case 'warning': return 'border-orange-100 bg-orange-50/20'
      case 'success': return 'border-emerald-100 bg-emerald-50/20'
      default: return 'border-violet-100 bg-violet-50/20'
    }
  }

  if (loading) {
    return (
      <FintechLayout title="Workforce Analytics" subtitle="Headcount planning, attrition predictions, and talent density insights">
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </FintechLayout>
    )
  }

  return (
    <FintechLayout title="Workforce Analytics" subtitle="Harness AI forecasting insights, analyze performance benchmarks, and manage headcount budgets">
      <div className="space-y-6">

        {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}
        {success && <Alert variant="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Overview Stats widgets */}
        {overview && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Talent Density Rating', value: `${overview.avg_rating} / 5.0`, desc: 'Average Performance Score', icon: Award, color: 'text-violet-700 bg-violet-50' },
              { label: 'Forecast Attrition Risk', value: `${overview.high_risk_pct}%`, desc: 'High Risk Watchlist Ratio', icon: Activity, color: 'text-orange-700 bg-orange-50' },
              { label: 'Headcount Completion', value: `${overview.headcount_completion_pct}%`, desc: 'Actual vs Target Headcount', icon: Users, color: 'text-blue-700 bg-blue-50' },
              { label: 'Remaining Hiring Budget', value: `₹${(overview.total_budget - overview.total_spent).toLocaleString('en-IN')}`, desc: `Allocated: ₹${overview.total_budget.toLocaleString('en-IN')}`, icon: Wallet, color: 'text-emerald-700 bg-emerald-50' },
            ].map(s => {
              const Icon = s.icon
              return (
                <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                      <p className="text-2xl font-bold mt-1.5 text-gray-900">{s.value}</p>
                    </div>
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${s.color}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 font-medium">{s.desc}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Tabs Headers */}
        <div className="flex border-b border-gray-100 bg-white rounded-2xl p-1.5 shadow-xs">
          {[
            { id: 'attrition', label: 'Attrition Forecast', icon: TrendingUp },
            { id: 'performance', label: 'Performance Reviews', icon: BarChart3 },
            { id: 'headcount', label: 'Headcount Planning', icon: Target },
            { id: 'insights', label: 'AI Analytics Insights', icon: Sparkles },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any)
                  setSuccess(null)
                  setError(null)
                }}
                className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tabs Contents */}
        <div className="space-y-6">

          {/* Attrition Tab */}
          {activeTab === 'attrition' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Workforce Attrition Risk Directory</h3>
                  <p className="text-xs text-gray-400 mt-1">AI-calculated employee retention risks based on performance ratings, attendance logs, and pay structures.</p>
                </div>
                <button
                  onClick={handleRecalculate}
                  disabled={recalculating}
                  className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? 'animate-spin' : ''}`} />
                  {recalculating ? 'Recalculating AI Risk...' : 'Recalculate AI Risk'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-medium">
                      <th className="pb-3 pl-2">Employee Name</th>
                      <th className="pb-3">Department</th>
                      <th className="pb-3">Risk Level</th>
                      <th className="pb-3" style={{ width: '20%' }}>Risk Probability Score</th>
                      <th className="pb-3">Top Risk Drivers</th>
                      <th className="pb-3">Retention Guidance Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-650 font-medium">
                    {attritionList.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="py-4 pl-2">
                          <div className="font-semibold text-gray-800">{item.employee_name}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{item.job_title}</div>
                        </td>
                        <td className="py-4 text-gray-500">{item.department}</td>
                        <td className="py-4">
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold border ${getRiskColor(item.risk_level)}`}>
                            {item.risk_level} Risk
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-700 font-mono w-8">{(item.risk_score * 100).toFixed(0)}%</span>
                            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.risk_level === 'High' ? 'bg-red-500' : item.risk_level === 'Medium' ? 'bg-orange-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${item.risk_score * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex flex-wrap gap-1">
                            {item.risk_drivers.length > 0 && item.risk_drivers[0] !== 'None' ? (
                              item.risk_drivers.map(driver => (
                                <span key={driver} className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-gray-100 text-gray-650">
                                  {driver}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 font-normal text-[10px]">Healthy Metrics</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 text-gray-500 leading-relaxed max-w-xs">{item.recommendations ?? '—'}</td>
                      </tr>
                    ))}
                    {attritionList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          No attrition risk records calculated. Click "Recalculate AI Risk" to compute forecaster scores.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Performance Reviews Tab */}
          {activeTab === 'performance' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Rating metrics card */}
              <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <Award className="h-4.5 w-4.5 text-violet-500" />
                  <span>Performance Benchmarks</span>
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Record regular employee reviews to calculate historical ratings, goal accomplishments, and performance density maps.
                </p>

                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Talent density metrics</h4>
                    <div className="space-y-3 font-semibold text-xs text-gray-700">
                      {[
                        { label: 'Outstanding (4.5 - 5.0)', count: reviews.filter(r => r.rating >= 4.5).length, color: 'bg-violet-600' },
                        { label: 'Achieved Expectations (3.0 - 4.4)', count: reviews.filter(r => r.rating >= 3.0 && r.rating < 4.5).length, color: 'bg-emerald-600' },
                        { label: 'Needs Improvement (< 3.0)', count: reviews.filter(r => r.rating < 3.0).length, color: 'bg-red-500' },
                      ].map(metric => (
                        <div key={metric.label} className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span>{metric.label}</span>
                            <span className="font-bold">{metric.count} reviews</span>
                          </div>
                          <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full ${metric.color}`}
                              style={{ width: `${reviews.length > 0 ? (metric.count / reviews.length) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Evaluate Performance</span>
                  </button>
                </div>
              </div>

              {/* Review history table */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Performance Review History Log</h3>
                  <p className="text-xs text-gray-400 mt-1">Audit log of all registered quarterly reviews, goal targets, and supervisor feedback.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-medium">
                        <th className="pb-3 pl-2">Employee</th>
                        <th className="pb-3">Rating Score</th>
                        <th className="pb-3 text-center">Goals Met</th>
                        <th className="pb-3">Review Date</th>
                        <th className="pb-3">Supervisor Feedback</th>
                        <th className="pb-3 text-right pr-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-650 font-medium">
                      {reviews.map(rev => (
                        <tr key={rev.id} className="hover:bg-gray-50/50">
                          <td className="py-3.5 pl-2">
                            <div className="font-semibold text-gray-800">{rev.employee_name}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{rev.department}</div>
                          </td>
                          <td className="py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-800 font-mono text-[13px]">{rev.rating}</span>
                              <div className="flex text-amber-400">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${i < Math.floor(rev.rating) ? 'fill-amber-400' : 'text-gray-200'}`}
                                  />
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 text-center font-bold text-gray-700 font-mono">
                            {rev.goals_met_pct}%
                          </td>
                          <td className="py-3.5 text-gray-400 font-mono">
                            {new Date(rev.review_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3.5 text-gray-500 max-w-xs truncate" title={rev.feedback || ''}>
                            {rev.feedback ?? '—'}
                          </td>
                          <td className="py-3.5 text-right pr-2">
                            <button
                              onClick={() => handleDeleteReview(rev.id)}
                              className="p-1.5 text-gray-400 hover:text-red-650 transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {reviews.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-400">
                            No performance evaluations registered. Click "Evaluate Performance" to log scores.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Headcount Planning Tab */}
          {activeTab === 'headcount' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Departmental Headcount & Target Budget Planning</h3>
                  <p className="text-xs text-gray-400 mt-1">Set headcount requirements and hiring budgets for Fiscal Year {selectedYear}. View gap analysis compared to active employees.</p>
                </div>
                <button
                  onClick={() => setShowHeadcountModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Configure Target Plan</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-medium">
                      <th className="pb-3 pl-2">Department Name</th>
                      <th className="pb-3 text-center">Actual Active Count</th>
                      <th className="pb-3 text-center">Target Plan Count</th>
                      <th className="pb-3 text-center">Headcount Gap / Target Remaining</th>
                      <th className="pb-3">Allocated Annual Budget</th>
                      <th className="pb-3">Current Employee Costs (Annualized)</th>
                      <th className="pb-3" style={{ width: '25%' }}>Annual Budget Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-650 font-medium">
                    {headcountSummary.map(item => {
                      const utilPct = item.budget_allocated > 0 ? (item.budget_spent / item.budget_allocated) * 100 : 0
                      return (
                        <tr key={item.department} className="hover:bg-gray-50/50">
                          <td className="py-4 pl-2 font-bold text-gray-800">{item.department}</td>
                          <td className="py-4 text-center font-bold text-gray-700 font-mono text-[13px]">{item.actual_count}</td>
                          <td className="py-4 text-center font-bold text-gray-400 font-mono text-[13px]">{item.target_count || 'Not Configured'}</td>
                          <td className="py-4 text-center">
                            {item.target_count > 0 ? (
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold font-mono ${
                                item.gap > 0
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                  : item.gap === 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-red-50 text-red-700 border border-red-100'
                              }`}>
                                {item.gap > 0 ? `+${item.gap} Sourcing` : item.gap === 0 ? 'Optimal' : `${item.gap} Over Plan`}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-4 font-mono font-semibold">
                            {item.budget_allocated > 0 ? `₹${item.budget_allocated.toLocaleString('en-IN')}` : '₹0'}
                          </td>
                          <td className="py-4 font-mono text-gray-500 font-semibold">
                            ₹{item.budget_spent.toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 pr-2">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono font-semibold">
                                <span className={utilPct > 100 ? 'text-red-600' : 'text-gray-500'}>{utilPct.toFixed(1)}% Spent</span>
                                <span className="text-gray-400">Limit: ₹{(item.budget_allocated - item.budget_spent).toLocaleString('en-IN')}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    utilPct > 100 ? 'bg-red-500' : utilPct > 80 ? 'bg-orange-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, utilPct)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {headcountSummary.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-400">
                          No active employees or target headcount plans found. Configure targets to load gaps data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI Insights Tab */}
          {activeTab === 'insights' && (
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-xl text-slate-100 space-y-6 relative overflow-hidden font-mono min-h-[400px] flex flex-col justify-between">
              
              {/* Background gradient lights */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-violet-400 animate-pulse" />
                    <span className="text-xs uppercase font-bold tracking-widest text-violet-400 font-sans">AI Workforce Copilot</span>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                </div>

                <div className="space-y-4 text-xs font-sans">
                  <p className="text-[11px] font-mono text-slate-500 leading-relaxed">$ python -m regtech.ai_analytics --generate-tactical-insights</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.map(item => (
                      <div key={item.id} className={`border rounded-2xl p-5 space-y-2.5 transition-all ${getInsightCardColor(item.type)}`}>
                        <div className="flex items-center gap-2">
                          {getInsightIcon(item.type)}
                          <h4 className="font-bold text-sm text-slate-100">{item.title}</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                          {item.description}
                        </p>
                        <div className="flex justify-between items-center text-[9px] font-mono pt-1">
                          <span className="text-slate-500">Dept: {item.department}</span>
                          <span className="uppercase tracking-widest font-extrabold text-[8px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-400">
                            {item.type}
                          </span>
                        </div>
                      </div>
                    ))}
                    {insights.length === 0 && (
                      <div className="col-span-2 py-8 text-center text-slate-500 font-mono text-xs">
                        No AI insights generated yet. Add employee reviews or configure headcount plans.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-4 flex justify-between items-center text-[10px] text-slate-500">
                <span>Core Analytics Engine v1.2</span>
                <span>System status: optimal</span>
              </div>
            </div>
          )}

        </div>

        {/* Modal: Evaluate Performance Review */}
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
            <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-xl animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setShowReviewModal(false)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Award className="h-5 w-5 text-violet-500" />
                <span>Evaluate Staff Performance</span>
              </h3>
              <p className="text-xs text-gray-400 mb-4">Record performance scoring metrics and supervisor feedback.</p>

              <form onSubmit={handleSaveReview} className="space-y-4 text-xs font-semibold text-gray-650">
                <div>
                  <label className="block text-gray-600 mb-1">Select Employee *</label>
                  <select
                    required
                    value={reviewForm.employee_id}
                    onChange={e => setReviewForm(prev => ({ ...prev, employee_id: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="">Choose employee...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.full_name} ({e.department} - {e.job_title})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-600 mb-1">Rating Rating (1.0 - 5.0) *</label>
                    <input
                      type="number"
                      required
                      step="0.1"
                      min="1.0"
                      max="5.0"
                      value={reviewForm.rating}
                      onChange={e => setReviewForm(prev => ({ ...prev, rating: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none font-medium font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Target Goals Met (%) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      value={reviewForm.goals_met_pct}
                      onChange={e => setReviewForm(prev => ({ ...prev, goals_met_pct: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none font-medium font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-600 mb-1">Reviewer Supervisor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter evaluator name"
                    value={reviewForm.reviewer_name}
                    onChange={e => setReviewForm(prev => ({ ...prev, reviewer_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 mb-1">Written Feedback & Comments</label>
                  <textarea
                    rows={3}
                    placeholder="Describe goals met, milestones, or improvement targets"
                    value={reviewForm.feedback}
                    onChange={e => setReviewForm(prev => ({ ...prev, feedback: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none font-medium leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="border border-gray-200 hover:bg-gray-50 text-gray-500 px-4 py-2 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-xl font-bold shadow-sm"
                  >
                    Record Review
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Set Headcount Target */}
        {showHeadcountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
            <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-xl animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setShowHeadcountModal(false)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Target className="h-5 w-5 text-violet-500" />
                <span>Configure Department Roster Target</span>
              </h3>
              <p className="text-xs text-gray-400 mb-4">Set target headcount bounds and budget for Fiscal Year {selectedYear}.</p>

              <form onSubmit={handleSaveHeadcountPlan} className="space-y-4 text-xs font-semibold text-gray-650">
                <div>
                  <label className="block text-gray-600 mb-1">Target Department *</label>
                  <select
                    required
                    value={headcountForm.department}
                    onChange={e => setHeadcountForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none bg-white font-medium"
                  >
                    {['Engineering', 'HR', 'Product', 'Sales', 'Marketing', 'Customer Support'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-650 mb-1">Target Headcount Count *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={headcountForm.target_count}
                    onChange={e => setHeadcountForm(prev => ({ ...prev, target_count: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none font-medium font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-650 mb-1">Annual Allocated Budget (INR) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="100000"
                    value={headcountForm.budget_allocated}
                    onChange={e => setHeadcountForm(prev => ({ ...prev, budget_allocated: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none font-medium font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowHeadcountModal(false)}
                    className="border border-gray-200 hover:bg-gray-50 text-gray-500 px-4 py-2 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-xl font-bold shadow-sm"
                  >
                    Save Target Plan
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
