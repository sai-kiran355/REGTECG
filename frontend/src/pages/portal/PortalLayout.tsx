import { ShieldCheck } from 'lucide-react'

interface PortalLayoutProps {
  tenantName: string
  children: React.ReactNode
  step?: number
  totalSteps?: number
}

export function PortalLayout({ tenantName, children, step, totalSteps }: PortalLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header style={{ backgroundColor: '#1a3c6e' }} className="shadow-md">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-orange-400" />
            <div>
              <p className="text-lg font-bold text-white">{tenantName}</p>
              <p className="text-xs text-blue-200">Powered by ComplianceOS</p>
            </div>
          </div>
          {step && totalSteps && (
            <div className="text-right">
              <p className="text-sm font-medium text-white">Step {step} of {totalSteps}</p>
              <div className="mt-1 flex gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-8 rounded-full ${i < step ? 'bg-orange-400' : 'bg-blue-700'}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
        <p>This is a secure KYC verification portal. Your data is encrypted and protected.</p>
        <p className="mt-1">© 2024 {tenantName} · Powered by ComplianceOS</p>
      </footer>
    </div>
  )
}
