import { useState, useEffect } from 'react'
import { ShieldCheck, ChevronDown, Search, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Spinner } from './Spinner'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

interface Bank {
  slug: string
  name: string
}

interface BankPickerProps {
  onSelect: (slug: string) => void
  redirectPath: string   // e.g. '/apply/login' or '/portal/apply'
  title: string
  subtitle: string
  backTo?: string        // optional back link
  backLabel?: string
}

export function BankPicker({ onSelect: _onSelect, redirectPath, title, subtitle, backTo, backLabel }: BankPickerProps) {
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Bank | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    axios.get(`${BASE_URL}/api/v1/applicant/banks`)
      .then(r => setBanks(r.data))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  const filtered = banks.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.slug.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (bank: Bank) => {
    setSelected(bank)
    setOpen(false)
    setSearch('')
  }

  const handleContinue = () => {
    if (selected) {
      window.location.href = `${redirectPath}?tenant=${selected.slug}`
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4 py-12">
      <div className="w-full max-w-md">
        {backTo && (
          <div className="mb-4">
            <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors">
              <ArrowLeft className="h-4 w-4" /> {backLabel ?? 'Back'}
            </Link>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>

        <div className="card p-7 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Select your Bank or Organisation
            </label>

            {loading ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : banks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No banks available yet.</p>
            ) : (
              <div className="relative">
                {/* Trigger */}
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  className="w-full flex items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                >
                  {selected ? (
                    <span className="font-medium text-gray-900">{selected.name}</span>
                  ) : (
                    <span className="text-gray-400">Choose a bank…</span>
                  )}
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {open && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                    {/* Search inside dropdown */}
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
                          placeholder="Search banks…"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>
                    <ul className="max-h-52 overflow-y-auto">
                      {filtered.length === 0 ? (
                        <li className="px-4 py-3 text-sm text-gray-500 text-center">No results</li>
                      ) : (
                        filtered.map(bank => (
                          <li key={bank.slug}>
                            <button
                              type="button"
                              onClick={() => handleSelect(bank)}
                              className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between"
                            >
                              <span className="font-medium text-gray-900">{bank.name}</span>
                              <span className="text-xs text-gray-400 font-mono">{bank.slug}</span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleContinue}
            disabled={!selected}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}
