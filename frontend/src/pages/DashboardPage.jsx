import { useAuth } from '../context/AuthContext.jsx'
import { ROLE_LABELS } from '../lib/roles.js'

const KPIS = [
  { label: 'Active Vehicles', value: 42 },
  { label: 'Available Vehicles', value: 27 },
  { label: 'Vehicles in Maintenance', value: 5 },
  { label: 'Active Trips', value: 11 },
  { label: 'Pending Trips', value: 6 },
  { label: 'Drivers On Duty', value: 18 },
  { label: 'Fleet Utilization', value: '64%' },
]

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div className="rounded-stamp border border-border bg-surface p-4">
        <p className="text-sm text-ink-muted">
          Signed in as <span className="font-medium text-ink">{user.name}</span> ·{' '}
          {ROLE_LABELS[user.role]}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {['Vehicle type', 'Status', 'Region'].map((filter) => (
          <select
            key={filter}
            disabled
            className="rounded-stamp border border-border bg-surface px-3 py-2 text-xs text-ink-muted"
          >
            <option>{filter}: All</option>
          </select>
        ))}
        <span className="self-center text-[11px] text-ink-muted">
          Filters activate once vehicle data is wired to the backend.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-stamp border border-border bg-surface p-4"
          >
            <p className="font-mono text-2xl font-medium text-ink">{kpi.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-ink-muted">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-stamp border border-dashed border-border p-6 text-center text-sm text-ink-muted">
        Charts and trend analytics land here once <code className="font-mono">/reports</code>{' '}
        endpoints are available.
      </div>
    </div>
  )
}
