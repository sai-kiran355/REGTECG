import { useState, FormEvent, useRef } from 'react'
import { FileText, Upload, CheckCircle, ChevronRight, ChevronLeft, X } from 'lucide-react'

export interface Step2Data {
  aadhaar_number: string
  pan_number: string
  aadhaar_front: File | null
  aadhaar_back: File | null
  pan_card: File | null
  selfie: File | null
}

interface Props {
  initialValues?: Partial<Step2Data>
  onNext: (data: Step2Data) => void
  onBack: () => void
}

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

function FileUploadField({
  label, hint, value, onChange, error,
}: {
  label: string; hint: string; value: File | null
  onChange: (f: File | null) => void; error?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const isImage = value && value.type.startsWith('image/')
  const preview = value && isImage ? URL.createObjectURL(value) : null

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label} <span className="text-red-500">*</span></label>
      <p className="mb-2 text-xs text-gray-400">{hint}</p>
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 p-3">
          {preview ? (
            <img src={preview} alt="preview" className="h-12 w-12 rounded object-cover border border-gray-200" />
          ) : (
            <FileText className="h-10 w-10 text-gray-400" />
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-gray-800">{value.name}</p>
            <p className="text-xs text-gray-500">{(value.size / 1024).toFixed(0)} KB</p>
          </div>
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-red-500">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-sm transition-colors hover:border-blue-400 hover:bg-blue-50 ${error ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
        >
          <Upload className="h-5 w-5 text-gray-400" />
          <span className="text-gray-500">Click to upload (JPG, PNG, PDF · max 5 MB)</span>
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0] ?? null
          onChange(f)
          e.target.value = ''
        }}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function Step2Documents({ initialValues = {}, onNext, onBack }: Props) {
  const [aadhaar, setAadhaar] = useState(initialValues.aadhaar_number ?? '')
  const [pan, setPan] = useState(initialValues.pan_number ?? '')
  const [aadhaarFront, setAadhaarFront] = useState<File | null>(initialValues.aadhaar_front ?? null)
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(initialValues.aadhaar_back ?? null)
  const [panCard, setPanCard] = useState<File | null>(initialValues.pan_card ?? null)
  const [selfie, setSelfie] = useState<File | null>(initialValues.selfie ?? null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateFile = (f: File | null, name: string): string | null => {
    if (!f) return `${name} is required.`
    if (!ALLOWED_TYPES.includes(f.type)) return `${name} must be JPG, PNG, or PDF.`
    if (f.size > MAX_SIZE) return `${name} must be under 5 MB.`
    return null
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!/^\d{12}$/.test(aadhaar.replace(/\s|-/g, ''))) errs.aadhaar = 'Aadhaar must be exactly 12 digits.'
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase())) errs.pan = 'PAN must be in format ABCDE1234F.'
    const af = validateFile(aadhaarFront, 'Aadhaar Front'); if (af) errs.aadhaar_front = af
    const ab = validateFile(aadhaarBack, 'Aadhaar Back'); if (ab) errs.aadhaar_back = ab
    const pc = validateFile(panCard, 'PAN Card'); if (pc) errs.pan_card = pc
    const sf = validateFile(selfie, 'Selfie'); if (sf) errs.selfie = sf
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onNext({
        aadhaar_number: aadhaar.replace(/\s|-/g, ''),
        pan_number: pan.trim().toUpperCase(),
        aadhaar_front: aadhaarFront,
        aadhaar_back: aadhaarBack,
        pan_card: panCard,
        selfie,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="card p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <FileText className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Identity Details</h2>
            <p className="text-xs text-gray-500">Enter your Aadhaar and PAN numbers</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Aadhaar Number <span className="text-red-500">*</span></label>
            <input
              type="text"
              className={`input font-mono tracking-widest ${errors.aadhaar ? 'border-red-400' : ''}`}
              placeholder="XXXX XXXX XXXX"
              maxLength={14}
              value={aadhaar}
              onChange={e => {
                const v = e.target.value.replace(/[^\d\s]/g, '')
                setAadhaar(v)
              }}
            />
            <p className="mt-1 text-xs text-gray-400">12-digit Aadhaar number (spaces allowed)</p>
            {errors.aadhaar && <p className="mt-1 text-xs text-red-600">{errors.aadhaar}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">PAN Number <span className="text-red-500">*</span></label>
            <input
              type="text"
              className={`input font-mono uppercase tracking-widest ${errors.pan ? 'border-red-400' : ''}`}
              placeholder="ABCDE1234F"
              maxLength={10}
              value={pan}
              onChange={e => setPan(e.target.value.toUpperCase())}
            />
            <p className="mt-1 text-xs text-gray-400">10-character PAN (e.g. ABCDE1234F)</p>
            {errors.pan && <p className="mt-1 text-xs text-red-600">{errors.pan}</p>}
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
            <Upload className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Document Upload</h2>
            <p className="text-xs text-gray-500">Upload clear photos or scans of your documents</p>
          </div>
        </div>

        <FileUploadField label="Aadhaar Card — Front Side" hint="Upload the front side showing your photo and name" value={aadhaarFront} onChange={setAadhaarFront} error={errors.aadhaar_front} />
        <FileUploadField label="Aadhaar Card — Back Side" hint="Upload the back side showing your address" value={aadhaarBack} onChange={setAadhaarBack} error={errors.aadhaar_back} />
        <FileUploadField label="PAN Card" hint="Upload a clear photo of your PAN card" value={panCard} onChange={setPanCard} error={errors.pan_card} />
        <FileUploadField label="Selfie / Live Photo" hint="Take a clear selfie with good lighting" value={selfie} onChange={setSelfie} error={errors.selfie} />
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <button type="submit" className="flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-base font-semibold text-white shadow-sm" style={{ backgroundColor: '#1a3c6e' }}>
          Review Application <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </form>
  )
}
