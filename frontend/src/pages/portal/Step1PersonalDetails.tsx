import { useState, FormEvent } from 'react'
import { User, Phone, MapPin, ChevronRight } from 'lucide-react'

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry',
]

export interface Step1Data {
  full_name: string
  date_of_birth: string
  gender: string
  mobile: string
  email: string
  address: string
  city: string
  state: string
  pincode: string
}

interface Props {
  initialValues?: Partial<Step1Data>
  onNext: (data: Step1Data) => void
}

function isAtLeast18(dob: string): boolean {
  const birth = new Date(dob)
  const today = new Date()
  const age = today.getFullYear() - birth.getFullYear() -
    (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0)
  return age >= 18
}

export function Step1PersonalDetails({ initialValues = {}, onNext }: Props) {
  const [form, setForm] = useState<Step1Data>({
    full_name: initialValues.full_name ?? '',
    date_of_birth: initialValues.date_of_birth ?? '',
    gender: initialValues.gender ?? '',
    mobile: initialValues.mobile ?? '',
    email: initialValues.email ?? '',
    address: initialValues.address ?? '',
    city: initialValues.city ?? '',
    state: initialValues.state ?? '',
    pincode: initialValues.pincode ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof Step1Data, string>>>({})

  const set = (field: keyof Step1Data) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const validate = (): boolean => {
    const errs: Partial<Record<keyof Step1Data, string>> = {}
    if (!form.full_name.trim() || form.full_name.trim().length < 2) errs.full_name = 'Full name must be at least 2 characters.'
    if (form.full_name.trim().length > 255) errs.full_name = 'Full name must be at most 255 characters.'
    if (!form.date_of_birth) errs.date_of_birth = 'Date of birth is required.'
    else if (!isAtLeast18(form.date_of_birth)) errs.date_of_birth = 'You must be at least 18 years old.'
    if (!form.gender) errs.gender = 'Please select your gender.'
    if (!/^[6-9]\d{9}$/.test(form.mobile)) errs.mobile = 'Enter a valid 10-digit Indian mobile number (starts with 6-9).'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address.'
    if (!form.address.trim()) errs.address = 'Address is required.'
    if (!form.city.trim()) errs.city = 'City is required.'
    if (!form.state) errs.state = 'Please select your state.'
    if (!/^\d{6}$/.test(form.pincode)) errs.pincode = 'Pincode must be exactly 6 digits.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (validate()) onNext(form)
  }

  const field = (label: string, key: keyof Step1Data, type = 'text', placeholder = '') => (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label} <span className="text-red-500">*</span></label>
      <input
        type={type}
        className={`input ${errors[key] ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}`}
        placeholder={placeholder}
        value={form[key]}
        onChange={set(key)}
      />
      {errors[key] && <p className="mt-1 text-xs text-red-600">{errors[key]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="card p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <User className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Personal Details</h2>
            <p className="text-xs text-gray-500">Please enter your personal information as per your Aadhaar card</p>
          </div>
        </div>

        <div className="space-y-4">
          {field('Full Name (as per Aadhaar)', 'full_name', 'text', 'e.g. Rahul Kumar Sharma')}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date of Birth <span className="text-red-500">*</span></label>
              <input type="date" className={`input ${errors.date_of_birth ? 'border-red-400' : ''}`} value={form.date_of_birth} onChange={set('date_of_birth')} max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]} />
              {errors.date_of_birth && <p className="mt-1 text-xs text-red-600">{errors.date_of_birth}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Gender <span className="text-red-500">*</span></label>
              <select className={`input ${errors.gender ? 'border-red-400' : ''}`} value={form.gender} onChange={set('gender')}>
                <option value="">Select gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              {errors.gender && <p className="mt-1 text-xs text-red-600">{errors.gender}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
            <Phone className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Contact Information</h2>
            <p className="text-xs text-gray-500">We'll use this to send you updates about your application</p>
          </div>
        </div>
        <div className="space-y-4">
          {field('Mobile Number', 'mobile', 'tel', '10-digit mobile number')}
          {field('Email Address', 'email', 'email', 'your@email.com')}
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <MapPin className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Residential Address</h2>
            <p className="text-xs text-gray-500">Enter your current residential address</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Address <span className="text-red-500">*</span></label>
            <textarea className={`input ${errors.address ? 'border-red-400' : ''}`} rows={2} placeholder="House/Flat No., Street, Area" value={form.address} onChange={set('address')} />
            {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('City', 'city', 'text', 'e.g. Mumbai')}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">State <span className="text-red-500">*</span></label>
              <select className={`input ${errors.state ? 'border-red-400' : ''}`} value={form.state} onChange={set('state')}>
                <option value="">Select state</option>
                {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
              {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
            </div>
          </div>
          {field('Pincode', 'pincode', 'text', '6-digit pincode')}
        </div>
      </div>

      <button type="submit" className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-base font-semibold text-white shadow-sm transition-colors" style={{ backgroundColor: '#1a3c6e' }}>
        Continue to Documents <ChevronRight className="h-5 w-5" />
      </button>
    </form>
  )
}
