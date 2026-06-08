import { useNavigate } from 'react-router-dom'
import {
  Users, BriefcaseBusiness, Clock,
  UserCheck, CalendarDays, FileText, TrendingUp,
  Wallet, Globe, ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { FintechLayout } from './FintechLayout'

const stats = [
  { label: 'Total Employees',    value: '—', icon: Users,             color: 'bg-blue-50 text-blue-600'   },
  { label: 'Open Positions',     value: '—', icon: BriefcaseBusiness, color: 'bg-violet-50 text-violet-600' },
  { label: 'Present Today',      value: '—', icon: Clock,             color: 'bg-green-50 text-green-600'  },
  { label: 'Pending Approvals',  value: '—', icon: FileText,          color: 'bg-orange-50 text-orange-600' },
]

const modules = [
  {
    title: 'Recruitment & ATS',
    desc: 'AI-powered resume screening, smart job matching, candidate ranking, and automated interview scheduling.',
    icon: UserCheck,
    color: 'bg-blue-600',
    route: '/fintech/recruitment',
    badge: 'Coming Soon',
    features: ['AI Resume Screening', 'Candidate Ranking', 'Interview Scheduling', 'Job Board Integration'],
  },
  {
    title: 'Employee Management',
    desc: 'Digital onboarding, employee records, document management, and e-signature workflows.',
    icon: Users,
    color: 'bg-violet-600',
    route: '/fintech/employees',
    badge: 'Coming Soon',
    features: ['Digital Onboarding', 'Employee Records', 'Document Vault', 'E-Signature Support'],
  },
  {
    title: 'Attendance & Workforce',
    desc: 'Face recognition attendance, GPS geo-fencing, shift scheduling, and leave management.',
    icon: CalendarDays,
    color: 'bg-green-600',
    route: '/fintech/attendance',
    badge: 'Coming Soon',
    features: ['Face Recognition', 'GPS Geo-Fencing', 'Shift Scheduling', 'Leave Management'],
  },
  {
    title: 'Payroll & Compensation',
    desc: 'Automated payroll processing, salary slips, tax computation, and compliance reporting.',
    icon: Wallet,
    color: 'bg-orange-600',
    route: '/fintech/payroll',
    badge: 'Coming Soon',
    features: ['Auto Payroll', 'Salary Slips', 'TDS Computation', 'PF & ESI Compliance'],
  },
  {
    title: 'Workforce Analytics',
    desc: 'Attrition prediction, performance dashboards, headcount planning, and workforce insights.',
    icon: TrendingUp,
    color: 'bg-teal-600',
    route: '/fintech/analytics',
    badge: 'Coming Soon',
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
          {stats.map(s => {
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
              return (
                <div key={m.title} className="group rounded-2xl border border-gray-100 bg-white p-6 hover:border-violet-200 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${m.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">{m.badge}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1.5">{m.title}</h3>
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
