import { Plus } from 'lucide-react'
import StatusBadge from '../components/layout/StatusBadge.jsx'

const RECORDS = [
  { id: 'MNT-221', vehicle: 'Van-02', work: 'Oil change', opened: '2026-07-08', vehicleStatus: 'In Shop', recordStatus: 'Open' },
  { id: 'MNT-220', vehicle: 'Truck-04', work: 'Brake pad replacement', opened: '2026-06-29', vehicleStatus: 'Retired', recordStatus: 'Open' },
  { id: 'MNT-219', vehicle: 'Van-05', work: 'Tyre rotation', opened: '2026-06-18', vehicleStatus: 'Available', recordStatus: 'Closed' },
]

export default function MaintenancePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Opening a record switches the vehicle to <span className="font-medium text-ink">In Shop</span> and
          removes it from dispatch; closing restores it to Available (unless retired).
        </p>
        <button
          type="button"
          disabled
          className="flex items-center gap-1.5 rounded-stamp bg-accent px-3 py-2 text-xs font-medium text-white opacity-60"
          title="Enable once POST /maintenance is available"
        >
          <Plus size={14} /> Log maintenance
        </button>
      </div>

      <div className="overflow-x-auto rounded-stamp border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Record ID</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Work</th>
              <th className="px-4 py-3 font-medium">Opened</th>
              <th className="px-4 py-3 font-medium">Vehicle Status</th>
              <th className="px-4 py-3 font-medium">Record</th>
            </tr>
          </thead>
          <tbody>
            {RECORDS.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-ink">{r.id}</td>
                <td className="px-4 py-3 text-ink">{r.vehicle}</td>
                <td className="px-4 py-3 text-ink-muted">{r.work}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{r.opened}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.vehicleStatus} />
                </td>
                <td className="px-4 py-3 text-ink-muted">{r.recordStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-ink-muted">
        Sample data shown — connect to the backend to replace this with live records.
      </p>
    </div>
  )
}
