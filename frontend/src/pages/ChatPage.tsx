import { useState, useEffect, useRef, useCallback, FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, MessageCircle, Wifi } from 'lucide-react'
import { apiClient } from '../api/client'
import { Spinner } from '../components/Spinner'

const POLL_INTERVAL = 3000 // poll every 3 seconds

interface Message {
  id: string
  sender_type: 'officer' | 'applicant'
  sender_name: string
  message: string
  is_read: boolean
  created_at: string
}

export function ChatPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [caseNumber, setCaseNumber] = useState('')
  const [subjectName, setSubjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [text, setText] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const [online, setOnline] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchMessages = useCallback(async (silent = false) => {
    if (!caseId) return
    try {
      const r = await apiClient.get(`/api/v1/chat/${caseId}/messages`)
      const newMessages: Message[] = r.data.messages || []
      setOnline(true)

      // Only update + scroll if there are new messages
      const latestId = newMessages.at(-1)?.id ?? null
      if (latestId !== lastMessageIdRef.current) {
        setMessages(newMessages)
        lastMessageIdRef.current = latestId
        if (!silent) {
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        }
      }

      setCaseNumber(r.data.case_number || '')
      setSubjectName(r.data.subject_name || '')

      if (r.data.unread_count > 0) {
        apiClient.put(`/api/v1/chat/${caseId}/read`).catch(() => null)
      }
    } catch {
      setOnline(false)
    } finally {
      setLoading(false)
    }
  }, [caseId])

  // Initial load
  useEffect(() => {
    fetchMessages(false)
  }, [fetchMessages])

  // Scroll to bottom on first load
  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [loading])

  // Smart polling — only when tab is visible
  useEffect(() => {
    const startPolling = () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      pollingRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchMessages(true)
        }
      }, POLL_INTERVAL)
    }

    startPolling()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchMessages(true) // immediately fetch when tab becomes visible
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
    if (!text.trim() || !caseId) return
    setSending(true)
    setSendError(null)
    const msgText = text.trim()
    setText('') // clear immediately for better UX
    try {
      await apiClient.post(`/api/v1/chat/${caseId}/messages`, { message: msgText })
      await fetchMessages(false) // fetch immediately after send
    } catch (err: any) {
      setSendError(err?.response?.data?.error?.message ?? 'Failed to send. Please try again.')
      setText(msgText) // restore text if failed
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-4">
        <button onClick={() => navigate(`/cases/${caseId}`)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Case
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <p className="font-semibold text-gray-900">{subjectName || 'Chat'}</p>
            {caseNumber && <span className="text-xs text-gray-400">· {caseNumber}</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-red-400'}`} />
            <p className="text-xs text-gray-500">{online ? 'Live · updates every 3s' : 'Reconnecting…'}</p>
          </div>
        </div>
        <button onClick={() => fetchMessages(false)}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" title="Refresh now">
          <Wifi className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <MessageCircle className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No messages yet</p>
            <p className="text-xs text-gray-400 mt-1">Start the conversation by sending a message below</p>
          </div>
        ) : (
          messages.map(msg => {
            const isOfficer = msg.sender_type === 'officer'
            return (
              <div key={msg.id} className={`flex ${isOfficer ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isOfficer
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm shadow-sm'}`}>
                  <p className={`text-xs font-semibold mb-1 ${isOfficer ? 'text-blue-100' : 'text-blue-600'}`}>
                    {isOfficer ? 'You' : msg.sender_name}
                  </p>
                  <p className="text-sm leading-relaxed">{msg.message}</p>
                  <p className={`text-xs mt-1 ${isOfficer ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}
                    {new Date(msg.created_at).toLocaleDateString('en-IN', { dateStyle: 'short' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Send error */}
      {sendError && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <p className="text-sm text-red-700 flex-1">{sendError}</p>
          <button onClick={() => setSendError(null)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-gray-200 bg-white p-4">
        <div className="flex gap-3 items-end">
          <textarea
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px] max-h-[120px]"
            placeholder="Type a message to the applicant…"
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
        <p className="mt-2 text-xs text-gray-400">Enter to send · Shift+Enter for new line</p>
      </form>
    </div>
  )
}
