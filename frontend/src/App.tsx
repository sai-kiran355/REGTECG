import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { SignUpPage } from './pages/SignUpPage'
import { LandingPage } from './pages/LandingPage'
import { OnboardingPage } from './pages/portal/OnboardingPage'
import { PortalStatus } from './pages/portal/PortalStatus'
import { ApplicantLoginPage } from './pages/applicant/ApplicantLoginPage'
import { ApplicantSignupPage } from './pages/applicant/ApplicantSignupPage'
import { ApplicantHomePage } from './pages/applicant/ApplicantHomePage' 
import { ApplicantChatPage } from './pages/applicant/ApplicantChatPage'
import { ApplicantSettingsPage } from './pages/applicant/ApplicantSettingsPage'
import { DashboardPage } from './pages/DashboardPage'
import { CasesPage } from './pages/CasesPage'
import { CaseDetailPage } from './pages/CaseDetailPage'
import { KYCPage } from './pages/KYCPage'
import { KYCDetailPage } from './pages/KYCDetailPage'
import { AMLPage } from './pages/AMLPage'
import { SanctionsPage } from './pages/SanctionsPage'
import { ReportsPage } from './pages/ReportsPage'
import { AuditPage } from './pages/AuditPage'
import { UsersPage } from './pages/UsersPage'
import { SettingsPage } from './pages/SettingsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { MonitoringPage } from './pages/MonitoringPage'
import { ChatPage } from './pages/ChatPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/portal/apply" element={<OnboardingPage />} />
        <Route path="/portal/status" element={<PortalStatus />} />

        {/* Applicant portal — customer-facing */}
        <Route path="/apply/login" element={<ApplicantLoginPage />} />
        <Route path="/apply/signup" element={<ApplicantSignupPage />} />
        <Route path="/apply/home" element={<ApplicantHomePage />} />
        <Route path="/apply/chat" element={<ApplicantChatPage />} />
        <Route path="/apply/settings" element={<ApplicantSettingsPage />} />

        {/* Protected — compliance back-office */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard"          element={<DashboardPage />} />
            <Route path="/cases"              element={<CasesPage />} />
            <Route path="/cases/:id"          element={<CaseDetailPage />} />
            <Route path="/cases/:caseId/chat" element={<ChatPage />} />
            <Route path="/kyc"               element={<KYCPage />} />
            <Route path="/kyc/:id"           element={<KYCDetailPage />} />
            <Route path="/aml"               element={<AMLPage />} />
            <Route path="/sanctions"         element={<SanctionsPage />} />
            <Route path="/reports"           element={<ReportsPage />} />
            <Route path="/settings"          element={<SettingsPage />} />
            <Route path="/monitoring"        element={<MonitoringPage />} />

            <Route element={<ProtectedRoute permission="audit:read" />}>
              <Route path="/audit" element={<AuditPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="admin:users" />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
