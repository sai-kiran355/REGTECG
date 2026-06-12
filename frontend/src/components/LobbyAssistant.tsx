import { useState, useEffect, useRef } from 'react'
import { Bot, Send, X, RotateCcw, MessageSquare, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { apiClient } from '../api/client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface Chip {
  text: string
  query?: string
  targetCategory: string
}

const CHIP_CATEGORIES: Record<string, Chip[]> = {
  main: [
    { text: "🏦 Bank Portal & Compliance", query: "Tell me about the Bank Portal and its compliance features.", targetCategory: "bank" },
    { text: "💼 Fintech Portal & HR Suite", query: "Explain the Fintech Portal features for workforce management and HR.", targetCategory: "fintech" },
    { text: "💻 Developer APIs & Webhooks", query: "Does the platform support developer API keys, webhooks, and integrations?", targetCategory: "developer" },
    { text: "🔒 Security & Audit Controls", query: "How is data secured and what audit logs are available?", targetCategory: "security" }
  ],
  bank: [
    { text: "📋 KYC Case Cockpit", query: "Can you detail the KYC (Know Your Customer) Case Cockpit and document checks?", targetCategory: "bank" },
    { text: "🔍 AML Screening Engine", query: "Explain how the AML (Anti-Money Laundering) Screening Engine and simulator detect suspicious patterns.", targetCategory: "bank" },
    { text: "🗣️ Sanctions Match Desk", query: "What is the Sanctions Phonetic Match Desk and how does it screen PEP/OFAC watchlists?", targetCategory: "bank" },
    { text: "🔙 Back to Main Topics", targetCategory: "main" }
  ],
  fintech: [
    { text: "👥 Workforce Onboarding", query: "Tell me about the Workforce Onboarding Directory and self-service flows.", targetCategory: "fintech" },
    { text: "📍 GPS Geofenced Attendance", query: "How does GPS Geofenced Attendance track employee clock-ins and flag breaches?", targetCategory: "fintech" },
    { text: "💰 Automated Payroll Runs", query: "Explain how automated payroll calculations and payslip disbursements work.", targetCategory: "fintech" },
    { text: "🔙 Back to Main Topics", targetCategory: "main" }
  ],
  developer: [
    { text: "🔑 API Keys & Sandboxes", query: "How do developer API keys and the sandbox environment work?", targetCategory: "developer" },
    { text: "🔌 Webhook Subscriptions", query: "Explain the webhook system and the events we can subscribe to.", targetCategory: "developer" },
    { text: "💼 Slack & Zoho Syncs", query: "How does ComplianceOS integrate with third-party apps like Slack and Zoho?", targetCategory: "developer" },
    { text: "🔙 Back to Main Topics", targetCategory: "main" }
  ],
  security: [
    { text: "📜 Immutable Audit Logs", query: "Explain the immutable audit logs for compliance officers.", targetCategory: "security" },
    { text: "👥 Role-Based Access (RBAC)", query: "How does Role-Based Access Control secure employee data?", targetCategory: "security" },
    { text: "🔙 Back to Main Topics", targetCategory: "main" }
  ]
}

function MarkdownRenderer({ content, isUser }: { content: string; isUser: boolean }) {
  const lines = content.split('\n');
  const textColor = isUser ? 'text-white' : 'text-slate-700';
  const boldColor = isUser ? 'text-white font-extrabold' : 'text-slate-900 font-bold';
  const dotBg = isUser ? 'bg-white' : 'bg-blue-600';
  const numColor = isUser ? 'text-blue-200' : 'text-blue-600';

  const parseBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className={boldColor}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-1.5 text-left">
      {lines.map((line, index) => {
        let trimmed = line.trim();
        if (trimmed === '---') {
          return <hr key={index} className={`my-2 ${isUser ? 'border-blue-500' : 'border-slate-200'}`} />;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const rawText = trimmed.substring(2);
          return (
            <div key={index} className="flex items-start gap-2 ml-1 text-left">
              <span className={`mt-2 shrink-0 w-1.5 h-1.5 rounded-full ${dotBg}`} />
              <span className={`${textColor} leading-relaxed`}>
                {parseBoldText(rawText)}
              </span>
            </div>
          );
        }
        const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          const num = numMatch[1];
          const rawText = numMatch[2];
          return (
            <div key={index} className="flex items-start gap-1.5 ml-1 text-left">
              <span className={`font-bold text-xs mt-0.5 shrink-0 ${numColor}`}>{num}.</span>
              <span className={`${textColor} leading-relaxed`}>
                {parseBoldText(rawText)}
              </span>
            </div>
          );
        }
        if (trimmed === '') {
          return <div key={index} className="h-1" />;
        }
        return (
          <p key={index} className={`${textColor} leading-relaxed text-left`}>
            {parseBoldText(line)}
          </p>
        );
      })}
    </div>
  );
}

export function LobbyAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [chipCategory, setChipCategory] = useState('main')
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load chat history from sessionStorage on mount (persists within session/tab refresh, but starts fresh on new tab)
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('complianceos_lobby_chat')
      if (cached) {
        setMessages(JSON.parse(cached))
      } else {
        const welcome: Message = {
          id: 'welcome',
          role: 'assistant',
          content: 'Hi there! I am your ComplianceOS AI assistant. Ask me anything about our Bank and Fintech portals, or select a suggested topic below to get started!',
          timestamp: new Date().toISOString()
        }
        setMessages([welcome])
      }
    } catch { /* ignore */ }
  }, [])

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Save history to sessionStorage
  const saveChat = (updated: Message[]) => {
    setMessages(updated)
    try {
      sessionStorage.setItem('complianceos_lobby_chat', JSON.stringify(updated))
    } catch { /* ignore */ }
  }

  const transitionCategoryFromText = (text: string) => {
    const msg = text.toLowerCase()
    if (msg.includes("bank") || msg.includes("kyc") || msg.includes("aml") || msg.includes("sanction") || msg.includes("ofac") || msg.includes("pep")) {
      setChipCategory("bank")
    } else if (msg.includes("fintech") || msg.includes("workforce") || msg.includes("payroll") || msg.includes("employee") || msg.includes("attendance") || msg.includes("gps") || msg.includes("geofence")) {
      setChipCategory("fintech")
    } else if (msg.includes("api") || msg.includes("webhook") || msg.includes("developer") || msg.includes("integration") || msg.includes("slack") || msg.includes("zoho") || msg.includes("teams")) {
      setChipCategory("developer")
    } else if (msg.includes("security") || msg.includes("audit") || msg.includes("rbac") || msg.includes("secure")) {
      setChipCategory("security")
    }
  }

  const handleSend = async (textToSend?: string) => {
    const query = textToSend ? textToSend.trim() : input.trim()
    if (!query || loading) return

    if (!textToSend) {
      setInput('')
    }

    // Update chip category dynamically based on search terms
    transitionCategoryFromText(query)

    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString()
    }

    const updatedWithUser = [...messages, userMsg]
    saveChat(updatedWithUser)
    setLoading(true)

    try {
      // Map history roles for the Gemini API backend
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content
      }))

      const response = await apiClient.post<{ response: string }>('/api/v1/chat/lobby-assistant', {
        message: query,
        history: historyPayload
      })

      const assistantMsg: Message = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString()
      }

      saveChat([...updatedWithUser, assistantMsg])
    } catch (err) {
      console.error("AI Assistant query failed:", err)
      const errorMsg: Message = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: "I apologize, but I am having trouble connecting to my brain right now. Please check your network and try again.",
        timestamp: new Date().toISOString()
      }
      saveChat([...updatedWithUser, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleChipClick = (chip: Chip) => {
    if (chip.query) {
      handleSend(chip.query)
    }
    setChipCategory(chip.targetCategory)
  }

  const handleClear = () => {
    if (!confirm("Clear your chat conversation?")) return
    const welcome: Message = {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi there! I am your ComplianceOS AI assistant. Ask me anything about our Bank and Fintech portals, or select a suggested topic below to get started!',
      timestamp: new Date().toISOString()
    }
    saveChat([welcome])
    setChipCategory('main')
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {/* Toggle Button */}
        {!isOpen && (
          <motion.button
            key="chat-toggle"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all duration-300 relative cursor-pointer group"
          >
            <MessageSquare className="h-6 w-6 group-hover:rotate-6 transition-transform" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
          </motion.button>
        )}

        {/* Chat Window Panel */}
        {isOpen && (
          <motion.div
            key="chat-panel"
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 280, damping: 25 }}
            className="w-96 max-h-[580px] h-[580px] max-w-[calc(100vw-3rem)] rounded-2xl bg-white border border-slate-200/80 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-900 px-4 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600/20 p-1.5 rounded-lg border border-blue-500/30">
                  <Bot className="h-5 w-5 text-blue-400" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold tracking-tight">ComplianceOS AI</h4>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Active Agent</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClear}
                  title="Clear conversation"
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {messages.map(m => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`rounded-2xl p-3.5 text-sm shadow-sm max-w-[85%] leading-relaxed text-left ${
                      m.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white border border-slate-100 text-gray-800 rounded-tl-none'
                    }`}
                  >
                    {m.role === 'assistant' && (
                      <div className="flex items-center gap-1 text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">
                        <Sparkles className="h-3 w-3" /> Assistant
                      </div>
                    )}
                    <MarkdownRenderer content={m.content} isUser={m.role === 'user'} />
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggested Chips */}
            <div className="px-3 py-2 border-t border-slate-100 bg-white flex flex-wrap gap-1.5 shrink-0 overflow-x-auto whitespace-nowrap scrollbar-none">
              {(CHIP_CATEGORIES[chipCategory] || CHIP_CATEGORIES.main).map(chip => (
                <button
                  key={chip.text}
                  onClick={() => handleChipClick(chip)}
                  disabled={loading && !!chip.query}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 shrink-0 ${
                    chip.text.startsWith("🔙")
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                      : "bg-slate-50 border border-slate-200/60 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                  }`}
                >
                  {chip.text}
                </button>
              ))}
            </div>

            {/* Input Footer */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                placeholder="Ask about ComplianceOS features..."
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
