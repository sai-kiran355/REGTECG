import { useState, useEffect } from 'react'
import { Activity, Users, FileText, AlertTriangle, CheckCircle, Clock, TrendingUp, Shield } from 'lucide-react'
import { casesApi, kycApi, amlApi, sanctionsApi } from '../api/compliance'
import { healthApi } from '../api/client'
import { Spinner } from '../components/Spinner'

interface Metric {
  label: string
  value: string | number
  sub?: string
  icon: typeof Activity
  color: string
}

function MetricCard({ m }: { m: Metric }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{m.label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{m.value}</p>
          {m.sub && <p className="mt-1 text-xs text-gray-400">{m.sub}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${m.color}`}>
          <m.icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

export function MonitoringPage() {
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState<any>(null)
  const [metrics, setMetrics] = useState({
    totalCases: 0, openCases: 0, closedCases: 0,
    totalKYC: 0, pendingKYC: 0, verifiedKYC: 0,
    amlAlerts: 0, sanctionHits: 0,
  })

  useEffect(() => {
    Promise.all([
      healthApi().catch(() => null),
      casesApi.list({ page: 1, page_size: 1 }).catch(() => null),
      casesApi.list({ status: 'open', page: 1, page_size: 1 }).catch(() => null),
      casesApi.list({ status: 'closed', page: 1, page_size: 1 }).catch(() => null),
      kycApi.list({ page: 1, page_size: 1 }).catch(() => null),
      kycApi.list({ status: 'pending', page: 1, page_size: 1 }).catch(() => null),
      kycApi.list({ status: 'verified', page: 1, page_size: 1 }).catch(() => null),
      amlApi.list({ page: 1, page_size: 1 }).catch(() => null),
      sanctionsApi.list({ status: 'hit', page: 1, page_size: 1 }).catch(() => null),
    ]).then(([h, cases, open, closed, kyc, pending, verified, aml, hits]) => {
      setHealth(h)
      setMetrics({
        totalCases: cases?.total ?? 0,
        openCases: open?.total ?? 0,
        closedCases: closed?.total ?? 0,
        totalKYC: kyc?.total ?? 0,
        pendingKYC: pending?.total ?? 0,
        verifiedKYC: verified?.total ?? 0,
        amlAlerts: aml?.total ?? 0,
        sanctionHits: hits?.total ?? 0,
      })
    }).finally(() => setLoading(false))
  }, [])

  const metricCards: Metric[] = [
    { label: 'Total Cases', value: metrics.totalCases, sub: `${metrics.openCases} open · ${metrics.closedCases} closed`, icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { label: 'KYC Applications', value: metrics.totalKYC, sub: `${metrics.pendingKYC} pending · ${metrics.verifiedKYC} verified`, icon: Users, color: 'bg-green-50 text-green-600' },
    { label: 'AML Alerts', value: metrics.amlAlerts, sub: 'Total flagged transactions', icon: AlertTriangle, color: 'bg-orange-50 text-orange-600' },
    { label: 'Sanctions Hits', value: metrics.sanctionHits, sub: 'Confirmed matches', icon: Shield, color: 'bg-red-50 text-red-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">System Monitoring</h2>
        <p className="text-sm text-gray-500">Real-time overview of platform activity and health</p>
      </div>

      {/* System Health */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <Activity className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">System Health</h3>
          {health && (
            <span className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${health.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${health.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
              {health.status === 'ok' ? 'All Systems Operational' : 'Degraded'}
            </span>
          )}
        </div>
        {loading ? <Spinner /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'API', status: health?.status ?? 'unknown' },
              { label: 'Database', status: health?.db ?? 'unknown' },
              { label: 'Redis Cache', status: health?.redis ?? 'unknown' },
              { label: 'Version', status: health?.version ?? '—', isVersion: true },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
                <p className="text-xs text-gray-500 mb-2">{item.label}</p>
                {item.isVersion ? (
                  <p className="text-sm font-semibold text-gray-700">{item.status}</p>
                ) : (
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${item.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={`text-sm font-semibold ${item.status === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
                      {item.status === 'ok' ? 'Operational' : 'Degraded'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metrics */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {metricCards.map(m => <MetricCard key={m.label} m={m} />)}
        </div>
      )}

      {/* Processing stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Avg KYC Processing Time', value: '< 2 days', icon: Clock, color: 'text-blue-600 bg-blue-50', desc: 'From submission to decision' },
          { label: 'KYC Approval Rate', value: metrics.totalKYC > 0 ? `${Math.round((metrics.verifiedKYC / metrics.totalKYC) * 100)}%` : '—', icon: CheckCircle, color: 'text-green-600 bg-green-50', desc: 'Verified vs total applications' },
          { label: 'Active Cases', value: metrics.openCases, icon: TrendingUp, color: 'text-orange-600 bg-orange-50', desc: 'Require compliance action' },
        ].map(item => (
          <div key={item.label} className="card p-5 flex items-center gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-xs text-gray-400">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
