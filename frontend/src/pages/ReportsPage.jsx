import { Download } from 'lucide-react'

const METRICS = [
  { label: 'Fuel Efficiency', value: '11.4 km/L', hint: 'Distance ÷ Fuel' },
  { label: 'Fleet Utilization', value: '64%', hint: 'Vehicles on trip vs. total' },
  { label: 'Operational Cost', value: '₹3,84,200', hint: 'Fuel + Maintenance' },
  { label: 'Avg. Vehicle ROI', value: '18.6%', hint: '(Revenue − Costs) ÷ Acquisition' },
]

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Fleet-wide performance metrics, computed from trips, fuel logs, and maintenance.
        </p>
        <button
          type="button"
          disabled
          className="flex items-center gap-1.5 rounded-stamp border border-border bg-surface px-3 py-2 text-xs font-medium text-ink-muted opacity-60"
          title="Enable once report data is wired to the backend"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.label} className="rounded-stamp border border-border bg-surface p-4">
            <p className="font-mono text-xl font-medium text-ink">{m.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
              {m.label}
            </p>
            <p className="mt-1 text-[11px] text-ink-muted">{m.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-stamp border border-dashed border-border p-10 text-center text-sm text-ink-muted">
        Trend charts render here once historical trip/fuel data is available from the API.
      </div>
    </div>
  )
}
