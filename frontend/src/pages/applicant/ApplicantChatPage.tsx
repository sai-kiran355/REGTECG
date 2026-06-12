import { useState, useEffect, useRef, useCallback, FormEvent } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, MessageCircle, ShieldCheck, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { useApplicantStore } from '../../store/applicantStore'
import { Spinner } from '../../components/Spinner'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const POLL_INTERVAL = 3000

interface Message {
  id: string
  sender_type: 'officer' | 'applicant'
  sender_name: string
  message: string
  created_at: string
}

export function ApplicantChatPage() {
  const [params] = useSearchParams()
  const caseId = params.get('case')
  const navigate = useNavigate()
  const { accessToken, isAuthenticated, tenantSlug: storedSlug } = useApplicantStore()
  const tenantSlug = params.get('tenant') || storedSlug || ''

  const [messages, setMessages] = useState<Message[]>([])
  const [caseNumber, setCaseNumber] = useState('')
  const [caseStatus, setCaseStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [online, setOnline] = useState(true)
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchMessages = useCallback(async (_silent = false) => {
    if (!caseId || !accessToken) return
    try {
      const r = await axios.get(`${BASE_URL}/api/v1/chat/${caseId}/applicant/messages`, {
        headers: { Authorization: `Bearer ${accessToken}`, 'X-Tenant-ID': tenantSlug },
      })
      setOnline(true)
      setLoadError(null)
      const newMessages: Message[] = r.data.messages || []
      // Always update messages
      setMessages(newMessages)
      // Scroll only when last message changes
      const latestId = newMessages.length > 0 ? newMessages[newMessages.length - 1].id : null
      if (latestId !== lastMessageIdRef.current) {
        lastMessageIdRef.current = latestId
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
      setCaseNumber(r.data.case_number || '')
      setCaseStatus(r.data.case_status || null)
    } catch (err: any) {
      setOnline(false)
      setLoadError(err?.response?.data?.error?.message ?? 'Failed to load messages.')
    } finally {
      setLoading(false)
    }
  }, [caseId, accessToken, tenantSlug])

  useEffect(() => {
    if (!isAuthenticated) { navigate(`/apply/login${tenantSlug ? `?tenant=${tenantSlug}` : ''}`); return }
    if (!caseId) { navigate(`/apply/home${tenantSlug ? `?tenant=${tenantSlug}` : ''}`); return }
    fetchMessages(false)
  }, [isAuthenticated, caseId, fetchMessages, navigate, tenantSlug])

  // Scroll on first load
  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [loading])

  // Smart polling
  useEffect(() => {
    const startPolling = () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      pollingRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') fetchMessages(true)
      }, POLL_INTERVAL)
    }

    startPolling()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchMessages(true)
        startPolling()
      } else {
        if (pollingRef.current) clearInterval(pollingRef.current)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchMessages])

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !caseId || !accessToken) return
    setSending(true)
    setSendError(null)
    const msgText = text.trim()
    setText('')
    try {
      await axios.post(
        `${BASE_URL}/api/v1/chat/${caseId}/applicant/messages`,
        { message: msgText },
        { headers: { Authorization: `Bearer ${accessToken}`, 'X-Tenant-ID': tenantSlug } }
      )
      await fetchMessages(false)
    } catch (err: any) {
      setSendError(err?.response?.data?.error?.message ?? 'Failed to send. Please try again.')
      setText(msgText)
    } finally {
      setSending(false)
    }
  }

  const bankName = tenantSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(`/apply/home${tenantSlug ? `?tenant=${tenantSlug}` : ''}`)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">{bankName} Compliance</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-red-400'}`} />
            <p className="text-xs text-gray-500">
              {caseNumber ? `Case: ${caseNumber} · ` : ''}{online ? 'Live' : 'Reconnecting…'}
            </p>
          </div>
        </div>
      </header>

      {caseStatus === 'in_review' && (
        <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start justify-between gap-3 shadow-sm shrink-0">
          <div className="flex gap-2.5">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Action Required: Document Verification</p>
              <p className="text-xs text-amber-700 mt-0.5">
                The compliance team has requested corrections or document re-uploads.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/apply/reupload?case=${caseId}&tenant=${tenantSlug}`)}
            className="shrink-0 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 transition-colors shadow-sm"
          >
            Re-upload Document
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
            <p className="text-sm font-medium text-gray-700">{loadError}</p>
            <button onClick={() => { setLoading(true); fetchMessages(false) }}
              className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700">Try again</button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageCircle className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No messages yet</p>
            <p className="text-xs text-gray-400 mt-1">Send a message to start the conversation with your compliance officer</p>
          </div>
        ) : (
          messages.map(msg => {
            const isApplicant = msg.sender_type === 'applicant'
            const lowerMsg = msg.message.toLowerCase()
            const isReuploadRequest = !isApplicant && (
              lowerMsg.includes('re-upload') ||
              lowerMsg.includes('reupload') ||
              (lowerMsg.includes('upload') && lowerMsg.includes('please')) ||
              lowerMsg.includes('verification failed')
            )
            
            let docParam = ''
            if (lowerMsg.includes('aadhaar back')) {
              docParam = 'aadhaar_back'
            } else if (lowerMsg.includes('aadhaar front') || lowerMsg.includes('aadhaar')) {
              docParam = 'aadhaar_front'
            } else if (lowerMsg.includes('pan card') || lowerMsg.includes('pan')) {
              docParam = 'pan_card'
            } else if (lowerMsg.includes('selfie') || lowerMsg.includes('photo')) {
              docParam = 'selfie'
            }

            return (
              <div key={msg.id} className={`flex ${isApplicant ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isApplicant
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm shadow-sm'}`}>
                  <p className={`text-xs font-semibold mb-1 ${isApplicant ? 'text-blue-100' : 'text-blue-600'}`}>
                    {isApplicant ? 'You' : msg.sender_name}
                  </p>
                  <p className="text-sm leading-relaxed">{msg.message}</p>
                  {isReuploadRequest && (
                    <button
                      onClick={() => navigate(`/apply/reupload?case=${caseId}&tenant=${tenantSlug}${docParam ? `&doc=${docParam}` : ''}`)}
                      className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 transition-colors shadow-sm"
                    >
                      Re-upload Document
                    </button>
                  )}
                  <p className={`text-xs mt-1 ${isApplicant ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{sendError}</p>
          <button onClick={() => setSendError(null)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-3 items-end">
          <textarea
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Type your message to the compliance officer…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any) } }}
            rows={1}
          />
          <button type="submit" disabled={sending || !text.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {sending ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-400">Enter to send · Shift+Enter for new line</p>
      </form>
    </div>
  )
}
