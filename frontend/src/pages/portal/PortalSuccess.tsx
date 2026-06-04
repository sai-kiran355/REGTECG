import { CheckCircle, Copy, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  referenceNumber: string
  submittedAt: string
  tenantSlug: string
}

export function PortalSuccess({ referenceNumber, submittedAt, tenantSlug }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(referenceNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const date = new Date(submittedAt).toLocaleString('en-IN', {
    dateStyle: 'long', timeStyle: 'short',
  })

  return (
    <div className="space-y-6">
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-9 w-9 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Application Submitted!</h2>
        <p className="mt-2 text-gray-500">Your KYC application has been received and is under review.</p>

        <div className="mt-6 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-medium text-blue-700">Your Reference Number</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="text-2xl font-bold tracking-widest text-blue-900">{referenceNumber}</span>
            <button onClick={copy} className="rounded-lg p-2 text-blue-600 hover:bg-blue-100" title="Copy">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          {copied && <p className="mt-1 text-xs text-green-600">Copied to clipboard!</p>}
        </div>

        <p className="mt-4 text-sm text-gray-500">Submitted on: <span className="font-medium text-gray-700">{date}</span></p>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
        <ol className="space-y-3">
          {[
            'Our compliance team will review your documents within 2-3 business days.',
            'You will receive an email notification once your KYC is verified.',
            'If additional documents are required, we will contact you on your registered mobile number.',
            'Once verified, your account will be activated.',
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-600">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="text-center">
        <Link
          to={`/portal/status?tenant=${tenantSlug}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Track your application status <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
