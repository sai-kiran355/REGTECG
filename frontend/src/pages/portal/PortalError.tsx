import { AlertTriangle } from 'lucide-react'

export function PortalError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Invalid Portal Link</h1>
        <p className="mt-2 text-gray-600">
          This portal link is invalid. Please contact your bank or financial institution for a valid onboarding link.
        </p>
        <p className="mt-4 text-sm text-gray-400">
          If you believe this is an error, please reach out to your relationship manager.
        </p>
      </div>
    </div>
  )
}
