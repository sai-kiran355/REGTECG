import React, { useState, useEffect } from 'react'
import {
  Globe, Key, Cpu, Slack, Terminal, CalendarDays,
  Database, RefreshCw, Trash2,
  Copy, Check, ShieldAlert, Plus, Play, ExternalLink, X, Settings2
} from 'lucide-react'
import { FintechLayout } from './FintechLayout'
import {
  integrationApi, IntegrationConfig, ApiKey,
  WebhookSubscription, WebhookDeliveryLog
} from '../../api/integration'
import { Spinner } from '../../components/Spinner'
import { Alert } from '../../components/Alert'

type ActiveTab = 'directory' | 'keys' | 'webhooks'
type ConnectedService = 'slack' | 'teams' | 'google' | 'zoho'

export function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('directory')
  const [configs, setConfigs] = useState<IntegrationConfig[]>([])
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([])
  const [deliveryLogs, setDeliveryLogs] = useState<WebhookDeliveryLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Service configuration panel selection
  const [selectedService, setSelectedService] = useState<ConnectedService | null>(null)
  const [slackUrl, setSlackUrl] = useState('')
  const [teamsUrl, setTeamsUrl] = useState('')
  const [googleClientEmail, setGoogleClientEmail] = useState('')
  const [googleCalendarId, setGoogleCalendarId] = useState('')
  const [zohoToken, setZohoToken] = useState('')
  const [serviceEnabled, setServiceEnabled] = useState(true)
  const [testingSlack, setTestingSlack] = useState(false)

  // API Key creation modal state
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [keyScopes, setKeyScopes] = useState<string[]>(['*'])
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  // Webhook subscription form state
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['*'])
  const [registeringWebhook, setRegisteringWebhook] = useState(false)

  // Event simulator state
  const [simEvent, setSimEvent] = useState('employee.activated')
  const [simulating, setSimulating] = useState(false)

  // Log inspector modal state
  const [selectedLog, setSelectedLog] = useState<WebhookDeliveryLog | null>(null)

  const loadAllData = async () => {
    try {
      setLoading(true)
      const [confData, keysData, webData, logsData] = await Promise.all([
        integrationApi.listConfigs(),
        integrationApi.listKeys(),
        integrationApi.listWebhooks(),
        integrationApi.listWebhookLogs(),
      ])
      setConfigs(confData)
      setKeys(keysData)
      setWebhooks(webData)
      setDeliveryLogs(logsData)
      
      // Auto-bind configuration fields if configs exist
      const slackConf = confData.find(c => c.service === 'slack')
      if (slackConf) {
        setSlackUrl(slackConf.config_data?.webhook_url || '')
      }
      const teamsConf = confData.find(c => c.service === 'teams')
      if (teamsConf) {
        setTeamsUrl(teamsConf.config_data?.webhook_url || '')
      }
      const googleConf = confData.find(c => c.service === 'google')
      if (googleConf) {
        setGoogleClientEmail(googleConf.config_data?.client_email || '')
        setGoogleCalendarId(googleConf.config_data?.calendar_id || '')
      }
      const zohoConf = confData.find(c => c.service === 'zoho')
      if (zohoConf) {
        setZohoToken(zohoConf.config_data?.auth_token || '')
      }

    } catch (err: any) {
      console.error(err)
      setError('Failed to fetch integrations configuration maps.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  // Clear notices helper
  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setError(null)
    setTimeout(() => setSuccess(null), 5000)
  }

  const showError = (msg: string) => {
    setError(msg)
    setSuccess(null)
    setTimeout(() => setError(null), 5000)
  }

  // --- App Directory Connectors ---
  const handleSelectService = (service: ConnectedService) => {
    setSelectedService(service)
    const conf = configs.find(c => c.service === service)
    setServiceEnabled(conf ? conf.is_enabled : true)
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedService) return
    try {
      let configData: Record<string, any> = {}
      if (selectedService === 'slack') {
        configData = { webhook_url: slackUrl }
      } else if (selectedService === 'teams') {
        configData = { webhook_url: teamsUrl }
      } else if (selectedService === 'google') {
        configData = { client_email: googleClientEmail, calendar_id: googleCalendarId }
      } else if (selectedService === 'zoho') {
        configData = { auth_token: zohoToken }
      }

      await integrationApi.saveConfig({
        service: selectedService,
        config_data: configData,
        is_enabled: serviceEnabled
      })
      
      showSuccess(`Saved ${selectedService.toUpperCase()} integration settings successfully.`)
      // Refresh configs
      const updatedConfigs = await integrationApi.listConfigs()
      setConfigs(updatedConfigs)
      setSelectedService(null)
    } catch {
      showError(`Failed to save ${selectedService} integrations credentials.`)
    }
  }

  const handleTestSlack = async () => {
    if (!slackUrl) {
      showError('Please configure a valid Slack webhook target URL first.')
      return
    }
    setTestingSlack(true)
    try {
      const res = await integrationApi.testSlackConnection({ webhook_url: slackUrl })
      if (res.success) {
        showSuccess('Slack notification dispatched successfully! Verify your alert channel.')
      }
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Slack webhook returned a delivery error.')
    } finally {
      setTestingSlack(false)
    }
  }

  // --- Developer API Keys ---
  const handleToggleScope = (scope: string) => {
    if (scope === '*') {
      setKeyScopes(['*'])
    } else {
      let next = keyScopes.filter(s => s !== '*')
      if (next.includes(scope)) {
        next = next.filter(s => s !== scope)
      } else {
        next.push(scope)
      }
      if (next.length === 0) next = ['*']
      setKeyScopes(next)
    }
  }

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyName.trim()) return
    try {
      const scopesStr = keyScopes.join(', ')
      const res = await integrationApi.createKey({ name: keyName, scopes: scopesStr })
      setCreatedSecret(res.raw_key)
      setKeyName('')
      setKeyScopes(['*'])
      setCopiedKey(false)
      
      // Refresh keys
      const updatedKeys = await integrationApi.listKeys()
      setKeys(updatedKeys)
    } catch {
      showError('Failed to generate developer API credential key.')
    }
  }

  const handleCopyKey = () => {
    if (createdSecret) {
      navigator.clipboard.writeText(createdSecret)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to permanently revoke this developer API key? Applications using it will immediately lose API access.')) return
    try {
      await integrationApi.deleteKey(id)
      setKeys(keys.filter(k => k.id !== id))
      showSuccess('API key has been revoked successfully.')
    } catch {
      showError('Failed to revoke API key.')
    }
  }

  // --- Webhook Subscriptions ---
  const handleToggleWebhookEvent = (ev: string) => {
    if (ev === '*') {
      setWebhookEvents(['*'])
    } else {
      let next = webhookEvents.filter(e => e !== '*')
      if (next.includes(ev)) {
        next = next.filter(e => e !== ev)
      } else {
        next.push(ev)
      }
      if (next.length === 0) next = ['*']
      setWebhookEvents(next)
    }
  }

  const handleRegisterWebhook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!webhookUrl.trim()) return
    setRegisteringWebhook(true)
    try {
      const eventsStr = webhookEvents.join(', ')
      await integrationApi.createWebhook({ target_url: webhookUrl, event_types: eventsStr })
      setWebhookUrl('')
      setWebhookEvents(['*'])
      showSuccess('Webhook subscription target registered successfully!')
      
      const updatedWebhooks = await integrationApi.listWebhooks()
      setWebhooks(updatedWebhooks)
    } catch {
      showError('Failed to register webhook subscription.')
    } finally {
      setRegisteringWebhook(false)
    }
  }

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook subscription? The endpoint will stop receiving event notifications.')) return
    try {
      await integrationApi.deleteWebhook(id)
      setWebhooks(webhooks.filter(w => w.id !== id))
      showSuccess('Webhook subscription deleted.')
    } catch {
      showError('Failed to delete webhook subscription.')
    }
  }

  const handleSimulateWebhook = async () => {
    setSimulating(true)
    try {
      await integrationApi.triggerTestWebhook({ event_type: simEvent })
      showSuccess(`Simulated event '${simEvent}' triggered successfully! Refresh fire logs to see delivery trail.`)
      // Auto refresh logs after 1.5 seconds to wait for background execution
      setTimeout(async () => {
        const logs = await integrationApi.listWebhookLogs()
        setDeliveryLogs(logs)
      }, 1500)
    } catch {
      showError('Simulating outbound event trigger failed.')
    } finally {
      setSimulating(false)
    }
  }

  const handleRefreshLogs = async () => {
    try {
      const logs = await integrationApi.listWebhookLogs()
      setDeliveryLogs(logs)
      showSuccess('Delivery audit log updated.')
    } catch {
      showError('Failed to load webhook delivery audit logs.')
    }
  }

  const getServiceStatus = (service: ConnectedService) => {
    const conf = configs.find(c => c.service === service)
    if (!conf) return 'Not Configured'
    return conf.is_enabled ? 'Connected' : 'Disabled'
  }

  if (loading) {
    return (
      <FintechLayout title="Integrations & API" subtitle="Loading workspaces...">
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-8 w-8 text-violet-600" />
        </div>
      </FintechLayout>
    )
  }

  return (
    <FintechLayout title="Integrations & API Hub" subtitle="Automate workflows, connect internal systems, and manage secure developer tokens.">
      <div className="space-y-6">
        
        {/* Banner with glassmorphism gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-emerald-600/10 blur-3xl" />
          
          <div className="relative z-10 max-w-2xl">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-300 border border-violet-500/30">
              <Cpu className="h-3.5 w-3.5" /> Developer Console Active
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight">Workforce Integration Core</h1>
            <p className="mt-2 text-slate-300 text-sm leading-relaxed">
              Connect external tools, build customized pipelines using raw JSON webhook listener sockets, and generate secure SHA-256 developer credentials to access internal platform directories.
            </p>
          </div>
        </div>

        {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}
        {success && <Alert variant="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Tab Selection */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'directory', label: 'App Directory', icon: Globe },
              { id: 'keys', label: 'Developer API Keys', icon: Key },
              { id: 'webhooks', label: 'Webhooks & Fire Logs', icon: Terminal },
            ].map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-semibold transition-all ${
                    active
                      ? 'border-violet-600 text-violet-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* TAB 1: App Directory */}
        {activeTab === 'directory' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Slack Card */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                      <Slack className="h-6 w-6" />
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                      getServiceStatus('slack') === 'Connected'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                      {getServiceStatus('slack')}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">Slack Workspace</h3>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    Dispatch notifications cards, geofence violations, and employee contract status triggers directly to a company Slack channel.
                  </p>
                </div>
                <button
                  id="connect-slack-btn"
                  onClick={() => handleSelectService('slack')}
                  className="mt-6 w-full rounded-xl bg-gray-50 hover:bg-gray-100 py-2.5 text-xs font-bold text-gray-700 transition-colors flex items-center justify-center gap-1"
                >
                  <Settings2 className="h-3.5 w-3.5" /> Configure Slack
                </button>
              </div>

              {/* Microsoft Teams Card */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Cpu className="h-6 w-6" />
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                      getServiceStatus('teams') === 'Connected'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                      {getServiceStatus('teams')}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">Microsoft Teams</h3>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    Send employee alerts and compliance checklist warnings to Microsoft Teams channels using Office 365 webhook sockets.
                  </p>
                </div>
                <button
                  id="connect-teams-btn"
                  onClick={() => handleSelectService('teams')}
                  className="mt-6 w-full rounded-xl bg-gray-50 hover:bg-gray-100 py-2.5 text-xs font-bold text-gray-700 transition-colors flex items-center justify-center gap-1"
                >
                  <Settings2 className="h-3.5 w-3.5" /> Configure Teams
                </button>
              </div>

              {/* Google Workspace Card */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <CalendarDays className="h-6 w-6" />
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                      getServiceStatus('google') === 'Connected'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                      {getServiceStatus('google')}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">Google Workspace</h3>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    Sync employee leave requests and shifts directly onto shared organization Google Calendars.
                  </p>
                </div>
                <button
                  id="connect-google-btn"
                  onClick={() => handleSelectService('google')}
                  className="mt-6 w-full rounded-xl bg-gray-50 hover:bg-gray-100 py-2.5 text-xs font-bold text-gray-700 transition-colors flex items-center justify-center gap-1"
                >
                  <Settings2 className="h-3.5 w-3.5" /> Configure Google
                </button>
              </div>

              {/* Zoho Calendar/Sync Card */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                      <Database className="h-6 w-6" />
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                      getServiceStatus('zoho') === 'Connected'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                      {getServiceStatus('zoho')}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">Zoho Sync</h3>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    Push payroll statements and tax deductions audit logs straight to Zoho books and inventory databases.
                  </p>
                </div>
                <button
                  id="connect-zoho-btn"
                  onClick={() => handleSelectService('zoho')}
                  className="mt-6 w-full rounded-xl bg-gray-50 hover:bg-gray-100 py-2.5 text-xs font-bold text-gray-700 transition-colors flex items-center justify-center gap-1"
                >
                  <Settings2 className="h-3.5 w-3.5" /> Configure Zoho
                </button>
              </div>

            </div>

            {/* Service Config Panel (Expands when clicked) */}
            {selectedService && (
              <div className="rounded-2xl border border-violet-100 bg-violet-50/20 p-8 shadow-sm animate-fadeIn">
                <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      Configure {selectedService.charAt(0).toUpperCase() + selectedService.slice(1)} Integration
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Define connection endpoints, keys, and operational behaviors.</p>
                  </div>
                  <button
                    onClick={() => setSelectedService(null)}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveConfig} className="space-y-6 max-w-xl">
                  {selectedService === 'slack' && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="slack-webhook-url" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Slack Incoming Webhook URL</label>
                        <input
                          id="slack-webhook-url"
                          type="url"
                          required
                          placeholder="https://hooks.slack.com/services/YOUR_WEBHOOK_URL"
                          value={slackUrl}
                          onChange={e => setSlackUrl(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-violet-600 focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          id="test-slack-btn"
                          disabled={testingSlack}
                          onClick={handleTestSlack}
                          className="rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 px-4 py-2 text-xs font-bold text-gray-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {testingSlack ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 text-gray-500" />}
                          Send Test Notification
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedService === 'teams' && (
                    <div>
                      <label htmlFor="teams-webhook-url" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Microsoft Teams Webhook URL</label>
                      <input
                        id="teams-webhook-url"
                        type="url"
                        required
                        placeholder="https://yourdomain.webhook.office.com/webhookb2/..."
                        value={teamsUrl}
                        onChange={e => setTeamsUrl(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-violet-600 focus:outline-none"
                      />
                    </div>
                  )}

                  {selectedService === 'google' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="google-client-email" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Service Account Email</label>
                        <input
                          id="google-client-email"
                          type="email"
                          required
                          placeholder="regtech-sync@project-id.iam.gserviceaccount.com"
                          value={googleClientEmail}
                          onChange={e => setGoogleClientEmail(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-violet-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="google-calendar-id" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Calendar ID</label>
                        <input
                          id="google-calendar-id"
                          type="text"
                          required
                          placeholder="primary or google-calendar-hash-id@group.calendar.google.com"
                          value={googleCalendarId}
                          onChange={e => setGoogleCalendarId(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-violet-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {selectedService === 'zoho' && (
                    <div>
                      <label htmlFor="zoho-token" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Zoho API Auth Token</label>
                      <input
                        id="zoho-token"
                        type="password"
                        required
                        placeholder="1000.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={zohoToken}
                        onChange={e => setZohoToken(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-violet-600 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <label htmlFor="service-enabled-toggle" className="flex items-center cursor-pointer select-none">
                      <div className="relative">
                        <input
                          id="service-enabled-toggle"
                          type="checkbox"
                          className="sr-only"
                          checked={serviceEnabled}
                          onChange={e => setServiceEnabled(e.target.checked)}
                        />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${serviceEnabled ? 'bg-violet-600' : 'bg-gray-300'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${serviceEnabled ? 'transform translate-x-4' : ''}`}></div>
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-700">Enable this integration connection</span>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      id="save-config-btn"
                      className="rounded-xl bg-violet-600 hover:bg-violet-700 px-6 py-2.5 text-xs font-bold text-white transition-colors"
                    >
                      Save Configuration
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedService(null)}
                      className="rounded-xl border border-gray-200 hover:bg-gray-50 px-5 py-2.5 text-xs font-bold text-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>

                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Developer API Keys */}
        {activeTab === 'keys' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Developer Tokens</h3>
                <p className="text-xs text-gray-500 mt-0.5">Manage access tokens for programmatic CRUD sync operations.</p>
              </div>
              <button
                id="generate-key-btn"
                onClick={() => {
                  setCreatedSecret(null)
                  setShowKeyModal(true)
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors"
              >
                <Plus className="h-4 w-4" /> Generate API Key
              </button>
            </div>

            {/* Keys Table */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full border-collapse text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-4">Key Name</th>
                    <th scope="col" className="px-6 py-4">Prefix</th>
                    <th scope="col" className="px-6 py-4">Access Scopes</th>
                    <th scope="col" className="px-6 py-4">Expires At</th>
                    <th scope="col" className="px-6 py-4">Last Used</th>
                    <th scope="col" className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {keys.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                        <Key className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                        No developer API keys created yet. Generate a key to connect external services.
                      </td>
                    </tr>
                  ) : (
                    keys.map(key => (
                      <tr key={key.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-semibold text-gray-900">{key.name}</td>
                        <td className="px-6 py-4">
                          <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-slate-700 font-mono">{key.key_prefix}...</code>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {key.scopes.split(',').map(s => (
                              <span key={s} className="rounded bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                                {s.trim()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {key.expires_at ? new Date(key.expires_at).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono">
                          {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never used'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteKey(key.id)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Revoke Token"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal: Generate Key */}
            {showKeyModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
                <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Generate Developer API Key</h3>
                    {!createdSecret && (
                      <button
                        onClick={() => setShowKeyModal(false)}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {!createdSecret ? (
                    <form onSubmit={handleCreateKey} className="space-y-4">
                      <div>
                        <label htmlFor="api-key-name" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Key Name / Identifier</label>
                        <input
                          id="api-key-name"
                          type="text"
                          required
                          placeholder="e.g. Jira Sync Engine, External Analytics Script"
                          value={keyName}
                          onChange={e => setKeyName(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-violet-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-semibold">Select API Scopes</span>
                        <div className="grid grid-cols-2 gap-3.5 border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                          {[
                            { val: '*', label: 'All Scopes (*)' },
                            { val: 'recruitment:read', label: 'Read Recruitment' },
                            { val: 'recruitment:write', label: 'Write Recruitment' },
                            { val: 'employee:read', label: 'Read Employees' },
                            { val: 'employee:write', label: 'Write Employees' },
                            { val: 'cases:read', label: 'Read Cases' },
                            { val: 'cases:write', label: 'Write Cases' }
                          ].map(s => (
                            <label key={s.val} className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={keyScopes.includes(s.val)}
                                onChange={() => handleToggleScope(s.val)}
                                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
                              />
                              <span>{s.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setShowKeyModal(false)}
                          className="rounded-xl border border-gray-200 hover:bg-gray-50 px-5 py-2.5 text-xs font-bold text-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          id="submit-generate-key"
                          className="rounded-xl bg-violet-600 hover:bg-violet-700 px-6 py-2.5 text-xs font-bold text-white transition-colors"
                        >
                          Generate Key
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-800 flex items-start gap-2.5">
                        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Security Warning — Copy Secret Token Now</p>
                          <p className="mt-0.5 leading-relaxed">
                            For security reasons, this token will only be visible **once**. If you navigate away or close this modal, you will not be able to retrieve it again.
                          </p>
                        </div>
                      </div>

                      <div>
                        <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-semibold">Your Developer API Key</span>
                        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-slate-900 p-4 font-mono text-sm text-emerald-400 shadow-inner overflow-x-auto">
                          <span className="flex-1 select-all break-all">{createdSecret}</span>
                          <button
                            onClick={handleCopyKey}
                            id="copy-secret-key-btn"
                            className="rounded-lg bg-white/10 hover:bg-white/20 p-2 text-white transition-colors shrink-0"
                            title="Copy Key"
                          >
                            {copiedKey ? <Check className="h-4.5 w-4.5 text-green-400" /> : <Copy className="h-4.5 w-4.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex pt-4 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setShowKeyModal(false)
                            setCreatedSecret(null)
                          }}
                          className="rounded-xl bg-gray-900 hover:bg-black px-6 py-2.5 text-xs font-bold text-white transition-colors"
                        >
                          I have secured this key
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: Webhooks & Logs */}
        {activeTab === 'webhooks' && (
          <div className="space-y-8">
            
            {/* Top configuration split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left form: Add Listener URL */}
              <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-gray-900 mb-1">Add Webhook Endpoint</h3>
                <p className="text-xs text-gray-500 mb-5 leading-relaxed">Configure listener endpoints to receive real-time payload updates.</p>
                
                <form onSubmit={handleRegisterWebhook} className="space-y-4">
                  <div>
                    <label htmlFor="webhook-target-url" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Payload Delivery Target URL</label>
                    <input
                      id="webhook-target-url"
                      type="url"
                      required
                      placeholder="https://yourdomain.com/api/webhooks/listener"
                      value={webhookUrl}
                      onChange={e => setWebhookUrl(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-violet-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-semibold">Subscribe to Events</span>
                    <div className="grid grid-cols-2 gap-3 border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                      {[
                        { val: '*', label: 'All Platform Events (*)' },
                        { val: 'employee.onboarded', label: 'Employee Onboarded' },
                        { val: 'employee.activated', label: 'Employee Activated' },
                        { val: 'attendance.breach', label: 'Geofence Breach Clock' },
                        { val: 'payroll.disbursed', label: 'Payroll Disbursed' }
                      ].map(e => (
                        <label key={e.val} className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={webhookEvents.includes(e.val)}
                            onChange={() => handleToggleWebhookEvent(e.val)}
                            className="rounded border-gray-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
                          />
                          <span>{e.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={registeringWebhook}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 px-5 py-2.5 text-xs font-bold text-white transition-colors"
                    >
                      {registeringWebhook ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Add Endpoint
                    </button>
                  </div>
                </form>
              </div>

              {/* Right panel: Event simulator */}
              <div className="rounded-2xl border border-violet-100 bg-violet-50/20 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-violet-900 flex items-center gap-1.5">
                    <Cpu className="h-4.5 w-4.5 text-violet-600" /> Event Simulator
                  </h3>
                  <p className="text-xs text-violet-700/80 mt-1 leading-relaxed">
                    Trigger simulated mock payloads to active endpoints to evaluate webhook response logs and header payload signature handshakes.
                  </p>

                  <div className="mt-4">
                    <label htmlFor="sim-event-select" className="block text-[10px] font-bold text-violet-700 uppercase tracking-wider mb-1.5">Simulation Event</label>
                    <select
                      id="sim-event-select"
                      value={simEvent}
                      onChange={e => setSimEvent(e.target.value)}
                      className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-xs text-gray-700 font-medium focus:border-violet-600 focus:outline-none"
                    >
                      <option value="employee.onboarded">employee.onboarded</option>
                      <option value="employee.activated">employee.activated</option>
                      <option value="attendance.breach">attendance.breach</option>
                      <option value="payroll.disbursed">payroll.disbursed</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  id="simulate-event-btn"
                  disabled={simulating || webhooks.length === 0}
                  onClick={handleSimulateWebhook}
                  className="mt-6 w-full rounded-xl bg-violet-600 hover:bg-violet-700 py-3 text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="h-4 w-4" /> Simulate Dispatch
                </button>
              </div>

            </div>

            {/* List of active webhook listener entries */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Active Webhook Subscriptions</h3>
              <div className="grid grid-cols-1 gap-4">
                {webhooks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-400">
                    No active webhook endpoint targets defined. Configure a listener above.
                  </div>
                ) : (
                  webhooks.map(sub => (
                    <div key={sub.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-semibold text-gray-900 break-all">{sub.target_url}</code>
                          <span className="rounded bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 border border-green-200">
                            Active
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1 select-all font-mono">
                            <span className="font-bold text-gray-700">Secret Token:</span> {sub.secret_token}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-700">Events:</span>
                            {sub.event_types.split(',').map(e => (
                              <span key={e} className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                                {e.trim()}
                              </span>
                            ))}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteWebhook(sub.id)}
                        className="rounded-xl border border-gray-100 hover:border-red-100 hover:bg-red-50 px-4 py-2 text-xs font-bold text-gray-500 hover:text-red-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Revoke
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Fire Logs and Delivery Audit Trail */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="h-4.5 w-4.5 text-violet-600" /> Webhook Fire Logs
                </h3>
                <button
                  onClick={handleRefreshLogs}
                  id="refresh-logs-btn"
                  className="rounded-lg border border-gray-200 hover:bg-gray-50 p-2 text-gray-500 transition-colors"
                  title="Refresh Logs"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {/* Logs Table */}
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <table className="w-full border-collapse text-left text-sm text-gray-500">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th scope="col" className="px-6 py-4">Status</th>
                      <th scope="col" className="px-6 py-4">Event Type</th>
                      <th scope="col" className="px-6 py-4">Destination Target</th>
                      <th scope="col" className="px-6 py-4">Delivered Time</th>
                      <th scope="col" className="px-6 py-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deliveryLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                          No event delivery logs registered yet. Trigger a simulated event to generate dispatch outcomes.
                        </td>
                      </tr>
                    ) : (
                      deliveryLogs.map(log => {
                        const success = log.response_status && log.response_status >= 200 && log.response_status < 300
                        return (
                          <tr key={log.id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4">
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                                success
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {log.response_status || 'ERR'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-gray-900">{log.event_type}</td>
                            <td className="px-6 py-4 truncate max-w-xs" title={log.target_url}>
                              <code className="text-xs text-gray-600">{log.target_url}</code>
                            </td>
                            <td className="px-6 py-4 text-xs">
                              {new Date(log.delivered_at).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => setSelectedLog(log)}
                                className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors"
                              >
                                Inspect <ExternalLink className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal: Log inspector details */}
            {selectedLog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
                <div className="w-full max-w-2xl rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Webhook Dispatch Payload Inspect</h3>
                      <p className="text-xs text-gray-500">Deliver Log UUID: {selectedLog.id}</p>
                    </div>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="font-bold text-gray-700">Response Code:</span>
                        <span className={`ml-1.5 font-bold ${
                          selectedLog.response_status && selectedLog.response_status < 300 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {selectedLog.response_status || 'Network Error'}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-700">Delivered At:</span>
                        <span className="ml-1.5 font-medium">{new Date(selectedLog.delivered_at).toLocaleString()}</span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Request JSON Payload</span>
                      <pre className="rounded-xl bg-slate-900 p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-48 shadow-inner select-all">
                        {JSON.stringify(JSON.parse(selectedLog.payload), null, 2)}
                      </pre>
                    </div>

                    <div>
                      <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Raw Listener Response Body</span>
                      <pre className="rounded-xl bg-gray-950 p-4 font-mono text-xs text-amber-500 overflow-x-auto max-h-36 shadow-inner select-all">
                        {selectedLog.response_body || 'No response body returned.'}
                      </pre>
                    </div>
                  </div>

                  <div className="flex pt-5 justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedLog(null)}
                      className="rounded-xl bg-gray-900 hover:bg-black px-6 py-2.5 text-xs font-bold text-white transition-colors"
                    >
                      Close details
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </FintechLayout>
  )
}
