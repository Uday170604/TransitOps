import { Plus } from 'lucide-react'
import StatusBadge from '../components/layout/StatusBadge.jsx'

const DRIVERS = [
  { name: 'Alex Menon', license: 'DL-GJ-2019-0234', category: 'LMV', expiry: '2027-04-12', safety: 92, status: 'Available' },
  { name: 'Kiran Rao', license: 'DL-GJ-2017-1187', category: 'HMV', expiry: '2026-08-30', safety: 88, status: 'On Trip' },
  { name: 'Sana Iqbal', license: 'DL-GJ-2021-0459', category: 'LMV', expiry: '2025-12-01', safety: 74, status: 'Suspended' },
  { name: 'Rohit Verma', license: 'DL-GJ-2020-0902', category: 'HMV', expiry: '2028-01-15', safety: 95, status: 'Off Duty' },
]

export default function DriversPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Driver profiles, license status, and safety scores.
        </p>
        <button
          type="button"
          disabled
          className="flex items-center gap-1.5 rounded-stamp bg-accent px-3 py-2 text-xs font-medium text-white opacity-60"
          title="Enable once POST /drivers is available"
        >
          <Plus size={14} /> Add driver
        </button>
      </div>

      <div className="overflow-x-auto rounded-stamp border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">License No.</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Expiry</th>
              <th className="px-4 py-3 font-medium">Safety Score</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {DRIVERS.map((d) => (
              <tr key={d.license} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-ink">{d.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{d.license}</td>
                <td className="px-4 py-3 text-ink-muted">{d.category}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{d.expiry}</td>
                <td className="px-4 py-3 text-ink-muted">{d.safety}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={d.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-ink-muted">
        Sample data shown — connect to the backend to replace this with live drivers.
      </p>
    </div>
  )
}
