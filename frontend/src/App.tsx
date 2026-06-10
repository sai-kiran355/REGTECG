import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { SignUpPage } from './pages/SignUpPage'
import { LandingPage } from './pages/LandingPage'
import { ProductSelectPage } from './pages/ProductSelectPage'
import { OnboardingPage } from './pages/portal/OnboardingPage'
import { PortalStatus } from './pages/portal/PortalStatus'
import { ApplicantLoginPage } from './pages/applicant/ApplicantLoginPage'
import { ApplicantSignupPage } from './pages/applicant/ApplicantSignupPage'
import { ApplicantHomePage } from './pages/applicant/ApplicantHomePage' 
import { ApplicantChatPage } from './pages/applicant/ApplicantChatPage'
import { ApplicantSettingsPage } from './pages/applicant/ApplicantSettingsPage'
import { ApplicantReuploadPage } from './pages/applicant/ApplicantReuploadPage'
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
import { FintechDashboardPage } from './pages/fintech/FintechDashboardPage'
import { JobsPage } from './pages/fintech/JobsPage'
import { JobFormPage } from './pages/fintech/JobFormPage'
import { JobDetailPage } from './pages/fintech/JobDetailPage'
import { EmployeesPage } from './pages/fintech/EmployeesPage'
import { OnboardingPortalPage } from './pages/fintech/OnboardingPortalPage'
import { AttendancePage } from './pages/fintech/AttendancePage'
import { PayrollPage } from './pages/fintech/PayrollPage'
import { AnalyticsPage } from './pages/fintech/AnalyticsPage'
import { CareersJobsPage } from './pages/careers/CareersJobsPage'
import { CareersApplyPage } from './pages/careers/CareersApplyPage'
import { CareersStatusPage } from './pages/careers/CareersStatusPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<ProductSelectPage />} />
        <Route path="/login/compliance" element={<LoginPage />} />
        <Route path="/login/fintech" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        {/* Public Careers Portal — no login required */}
        <Route path="/careers"              element={<CareersJobsPage />} />
        <Route path="/careers/status"       element={<CareersStatusPage />} />
        <Route path="/careers/:jobId"       element={<CareersApplyPage />} />

        <Route path="/portal/apply" element={<OnboardingPage />} />
        <Route path="/portal/status" element={<PortalStatus />} />

        {/* Applicant portal — customer-facing */}
        <Route path="/apply/login" element={<ApplicantLoginPage />} />
        <Route path="/apply/signup" element={<ApplicantSignupPage />} />
        <Route path="/apply/home" element={<ApplicantHomePage />} />
        <Route path="/apply/chat" element={<ApplicantChatPage />} />
        <Route path="/apply/settings" element={<ApplicantSettingsPage />} />
        <Route path="/apply/reupload" element={<ApplicantReuploadPage />} />

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

        <Route path="/onboard/:employeeId" element={<OnboardingPortalPage />} />
        <Route path="*" element={<NotFoundPage />} />

        {/* Fintech platform — protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/fintech/dashboard"        element={<FintechDashboardPage />} />
          <Route path="/fintech/jobs"             element={<JobsPage />} />
          <Route path="/fintech/jobs/new"         element={<JobFormPage />} />
          <Route path="/fintech/jobs/:jobId"      element={<JobDetailPage />} />
          <Route path="/fintech/jobs/:jobId/edit" element={<JobFormPage />} />
          <Route path="/fintech/employees"        element={<EmployeesPage />} />
          <Route path="/fintech/attendance"       element={<AttendancePage />} />
          <Route path="/fintech/payroll"          element={<PayrollPage />} />
          <Route path="/fintech/analytics"        element={<AnalyticsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
