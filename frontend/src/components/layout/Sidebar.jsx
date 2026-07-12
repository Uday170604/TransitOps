import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  BarChart3,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { canAccess } from '../../lib/roles.js'

const NAV_ITEMS = [
  { key: 'dashboard', to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { key: 'vehicles', to: '/vehicles', label: 'Vehicle Registry', icon: Truck },
  { key: 'drivers', to: '/drivers', label: 'Drivers', icon: Users },
  { key: 'trips', to: '/trips', label: 'Trips', icon: Route },
  { key: 'maintenance', to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { key: 'fuelExpenses', to: '/fuel-expenses', label: 'Fuel & Expenses', icon: Fuel },
  { key: 'reports', to: '/reports', label: 'Reports', icon: BarChart3 },
]

export default function Sidebar() {
  const { user } = useAuth()
  const visibleItems = NAV_ITEMS.filter((item) => canAccess(user.role, item.key))

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-surface px-4 py-6 md:block">
      <div className="mb-8 flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-stamp bg-accent font-display text-sm font-bold text-white">
          T
        </span>
        <div>
          <p className="font-display text-base font-semibold leading-none text-ink">TransitOps</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-muted">
            Ops console
          </p>
        </div>
      </div>

      <nav className="relative pl-4">
        <span className="route-line" aria-hidden="true" />
        <ul className="space-y-1">
          {visibleItems.map(({ key, to, label, icon: Icon, end }) => (
            <li key={key}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `route-stop flex items-center gap-3 rounded-stamp px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'active bg-paper font-medium text-ink'
                      : 'text-ink-muted hover:text-ink'
                  }`
                }
              >
                <Icon size={16} strokeWidth={2} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
