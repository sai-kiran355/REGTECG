import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, BriefcaseBusiness, Clock,
  UserCheck, CalendarDays, FileText, TrendingUp,
  Wallet, Globe, ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { FintechLayout } from './FintechLayout'
import { recruitmentApi } from '../../api/recruitment'

const modules = [
  {
    title: 'Recruitment & ATS',
    desc: 'AI-powered resume screening, smart job matching, candidate ranking, and automated candidate hiring pipelines.',
    icon: UserCheck,
    color: 'bg-blue-600',
    route: '/fintech/jobs',
    badge: 'Active',
    features: ['AI Resume Screening', 'Candidate Ranking', 'Stage Pipelines', 'Job Posting & Details'],
  },
  {
    title: 'Employee Management',
    desc: 'Digital onboarding, employee records, document management, and direct checklist workflows.',
    icon: Users,
    color: 'bg-violet-600',
    route: '/fintech/employees',
    badge: 'Active',
    features: ['Digital Onboarding', 'Employee Records', 'Document Vault', 'Interactive Checklist'],
  },
  {
    title: 'Attendance & Workforce',
    desc: 'Face recognition attendance, GPS geo-fencing, shift scheduling, and leave management.',
    icon: CalendarDays,
    color: 'bg-green-600',
    route: '/fintech/attendance',
    badge: 'Active',
    features: ['Face Recognition', 'GPS Geo-Fencing', 'Shift Scheduling', 'Leave Management'],
  },
  {
    title: 'Payroll & Compensation',
    desc: 'Automated payroll processing, salary slips, tax computation, and compliance reporting.',
    icon: Wallet,
    color: 'bg-orange-600',
    route: '/fintech/payroll',
    badge: 'Active',
    features: ['Auto Payroll', 'Salary Slips', 'TDS Computation', 'PF & ESI Compliance'],
  },
  {
    title: 'Workforce Analytics',
    desc: 'Attrition prediction, performance dashboards, headcount planning, and workforce insights.',
    icon: TrendingUp,
    color: 'bg-teal-600',
    route: '/fintech/analytics',
    badge: 'Active',
    features: ['Attrition Prediction', 'Performance Reports', 'Headcount Planning', 'AI Insights'],
  },
  {
    title: 'Integrations & API',
    desc: 'Connect with Slack, Jira, Google Workspace, Zoho, and your existing tools via REST API.',
    icon: Globe,
    color: 'bg-slate-600',
    route: '/fintech/integrations',
    badge: 'Coming Soon',
    features: ['Slack & Teams', 'Google Workspace', 'REST API Access', 'Webhook Support'],
  },
]

export function FintechDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [totalEmployees, setTotalEmployees] = useState<number | string>('—')
  const [openPositions, setOpenPositions] = useState<number | string>('—')
  const [onboardingCount, setOnboardingCount] = useState<number | string>('—')
  const [flaggedCount, setFlaggedCount] = useState<number | string>('—')

  useEffect(() => {
    async function loadStats() {
      try {
        const [empStats, jobsData] = await Promise.all([
          recruitmentApi.getEmployeeStats(),
          recruitmentApi.listJobs(),
        ])
        setTotalEmployees(empStats.total)
        setOnboardingCount(empStats.onboarding)
        setFlaggedCount(empStats.flagged)
        
        const openCount = jobsData.items.filter(j => j.status === 'open').length
        setOpenPositions(openCount)
      } catch (err) {
        console.error("Failed to load dashboard metrics", err)
      }
    }
    loadStats()
  }, [])

  return (
    <FintechLayout title="Dashboard" subtitle="Welcome to your Fintech platform">
      <div className="space-y-8">
        {/* Welcome banner */}
        <div className="rounded-2xl bg-gradient-to-r from-violet-600 via-violet-700 to-indigo-700 p-7 text-white">
          <p className="text-violet-200 text-sm mb-1">Welcome back,</p>
          <h1 className="text-2xl font-bold">{user?.full_name ?? 'Admin'}</h1>
          <p className="text-violet-200 text-sm mt-1">Your platform is ready. Start by posting your first job.</p>
          <button
            onClick={() => navigate('/fintech/jobs/new')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            Post a Job <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Employees', value: totalEmployees, icon: Users, color: 'bg-blue-50 text-blue-600' },
            { label: 'Open Positions', value: openPositions, icon: BriefcaseBusiness, color: 'bg-violet-50 text-violet-600' },
            { label: 'Onboarding Staff', value: onboardingCount, icon: Clock, color: 'bg-green-50 text-green-600' },
            { label: 'Compliance Flagged', value: flaggedCount, icon: FileText, color: 'bg-red-50 text-red-600' },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            )
          })}
        </div>

        {/* Modules */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-5">Platform Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {modules.map(m => {
              const Icon = m.icon
              const isActive = m.badge === 'Active'
              return (
                <div
                  key={m.title}
                  onClick={() => isActive && navigate(m.route)}
                  className={`group rounded-2xl border bg-white p-6 transition-all ${
                    isActive
                      ? 'border-gray-100 hover:border-violet-200 hover:shadow-md cursor-pointer hover:scale-[1.01]'
                      : 'border-gray-100 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${m.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isActive
                        ? 'bg-green-50 text-green-700 border border-green-100'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {m.badge}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1.5 flex items-center gap-1 group-hover:text-violet-700 transition-colors">
                    {m.title} {isActive && <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-violet-600" />}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">{m.desc}</p>
                  <ul className="space-y-1.5">
                    {m.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="h-1.5 w-1.5 rounded-full bg-violet-300 shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </FintechLayout>
  )
}
