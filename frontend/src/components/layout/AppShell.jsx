import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

const TITLES = {
  '/': 'Dashboard',
  '/vehicles': 'Vehicle Registry',
  '/drivers': 'Driver Management',
  '/trips': 'Trip Management',
  '/maintenance': 'Maintenance',
  '/fuel-expenses': 'Fuel & Expenses',
  '/reports': 'Reports & Analytics',
}

export default function AppShell() {
  const { pathname } = useLocation()
  const title = TITLES[pathname] || 'TransitOps'

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
