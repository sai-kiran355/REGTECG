import { Link } from 'react-router-dom'
import { BriefcaseBusiness } from 'lucide-react'

interface Props {
  companyName: string
  companySlug: string
  children: React.ReactNode
}

export function CareersLayout({ companyName, companySlug, children }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <Link to={`/careers?company=${companySlug}`} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600">
              <BriefcaseBusiness className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{companyName}</p>
              <p className="text-xs text-gray-500">Careers Portal</p>
            </div>
          </Link>
          <Link
            to={`/careers/status?company=${companySlug}`}
            className="text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
          >
            Track Application
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="mx-auto max-w-4xl px-4 py-5 flex items-center justify-between">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} {companyName}. Powered by ComplianceOS Fintech Platform.</p>
        </div>
      </footer>
    </div>
  )
}
