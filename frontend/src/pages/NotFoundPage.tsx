import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <ShieldCheck className="mx-auto mb-4 h-16 w-16 text-gray-300" />
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <p className="mt-2 text-lg font-semibold text-gray-700">Page not found</p>
        <p className="mt-1 text-sm text-gray-500">The page you're looking for doesn't exist.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary mt-6">
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}
