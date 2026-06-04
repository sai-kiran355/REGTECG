import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cases':     'Case Management',
  '/kyc':       'KYC Verification',
  '/aml':       'AML Screening',
  '/sanctions': 'Sanctions Screening',
  '/reports':   'Reports',
  '/audit':     'Audit Log',
  '/users':     'User Management',
  '/settings':  'Settings',
  '/monitoring':'System Monitoring',
}

export function Layout() {
  const { pathname } = useLocation()
  const title = titles[pathname] ?? 'RegTech Compliance OS'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
