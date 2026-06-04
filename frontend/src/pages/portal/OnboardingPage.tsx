import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PortalLayout } from './PortalLayout'
import { PortalSuccess } from './PortalSuccess'
import { Step1PersonalDetails, Step1Data } from './Step1PersonalDetails'
import { Step2Documents, Step2Data } from './Step2Documents'
import { Step3Review } from './Step3Review'
import { BankPicker } from '../../components/BankPicker'
import type { PortalSubmitResponse } from '../../api/portal'

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function OnboardingPage() {
  const [params] = useSearchParams()
  const tenantSlug = slugify(params.get('tenant') ?? '')

  const [step, setStep] = useState(1)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null)
  const [successData, setSuccessData] = useState<PortalSubmitResponse | null>(null)

  // No tenant in URL — show bank picker dropdown
  if (!tenantSlug) {
    return (
      <BankPicker
        redirectPath="/portal/apply"
        title="KYC Application Portal"
        subtitle="Select your bank to start your KYC application"
        backTo="/"
        backLabel="Back to home"
        onSelect={(slug) => { window.location.href = `/portal/apply?tenant=${slug}` }}
      />
    )
  }

  // Format tenant name for display
  const tenantName = tenantSlug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

  if (successData) {
    return (
      <PortalLayout tenantName={tenantName}>
        <PortalSuccess
          referenceNumber={successData.reference_number}
          submittedAt={successData.submitted_at}
          tenantSlug={tenantSlug}
        />
      </PortalLayout>
    )
  }

  return (
    <PortalLayout tenantName={tenantName} step={step} totalSteps={3}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          {step === 1 && 'Personal Details'}
          {step === 2 && 'Identity Documents'}
          {step === 3 && 'Review & Submit'}
        </h1>
        <p className="text-sm text-gray-500">
          {step === 1 && 'Enter your personal information to begin the KYC process'}
          {step === 2 && 'Upload your identity documents for verification'}
          {step === 3 && 'Review your application before final submission'}
        </p>
      </div>

      {step === 1 && (
        <Step1PersonalDetails
          initialValues={step1Data ?? {}}
          onNext={data => {
            setStep1Data(data)
            setStep(2)
            window.scrollTo(0, 0)
          }}
        />
      )}

      {step === 2 && (
        <Step2Documents
          initialValues={step2Data ?? {}}
          onNext={data => {
            setStep2Data(data)
            setStep(3)
            window.scrollTo(0, 0)
          }}
          onBack={() => {
            setStep(1)
            window.scrollTo(0, 0)
          }}
        />
      )}

      {step === 3 && step1Data && step2Data && (
        <Step3Review
          step1={step1Data}
          step2={step2Data}
          tenantSlug={tenantSlug}
          onBack={() => {
            setStep(2)
            window.scrollTo(0, 0)
          }}
          onSuccess={response => {
            setSuccessData(response)
            window.scrollTo(0, 0)
          }}
        />
      )}
    </PortalLayout>
  )
}
