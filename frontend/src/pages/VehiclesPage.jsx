import { Plus } from 'lucide-react'
import StatusBadge from '../components/layout/StatusBadge.jsx'

const VEHICLES = [
  { reg: 'GJ-03-AB-1042', name: 'Van-05', type: 'Van', capacity: '500 kg', odometer: '48,210 km', status: 'Available' },
  { reg: 'GJ-03-CD-7781', name: 'Truck-11', type: 'Truck', capacity: '3,200 kg', odometer: '112,430 km', status: 'On Trip' },
  { reg: 'GJ-03-EF-2290', name: 'Van-02', type: 'Van', capacity: '450 kg', odometer: '76,880 km', status: 'In Shop' },
  { reg: 'GJ-03-GH-5567', name: 'Truck-04', type: 'Truck', capacity: '2,800 kg', odometer: '203,110 km', status: 'Retired' },
]

export default function VehiclesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Master list of registered vehicles. Registration number is unique.
        </p>
        <button
          type="button"
          disabled
          className="flex items-center gap-1.5 rounded-stamp bg-accent px-3 py-2 text-xs font-medium text-white opacity-60"
          title="Enable once POST /vehicles is available"
        >
          <Plus size={14} /> Register vehicle
        </button>
      </div>

      <div className="overflow-x-auto rounded-stamp border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Registration No.</th>
              <th className="px-4 py-3 font-medium">Name / Model</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Max Load</th>
              <th className="px-4 py-3 font-medium">Odometer</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {VEHICLES.map((v) => (
              <tr key={v.reg} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-ink">{v.reg}</td>
                <td className="px-4 py-3 text-ink">{v.name}</td>
                <td className="px-4 py-3 text-ink-muted">{v.type}</td>
                <td className="px-4 py-3 text-ink-muted">{v.capacity}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{v.odometer}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={v.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-ink-muted">
        Sample data shown — connect to the backend to replace this with live vehicles.
      </p>
    </div>
  )
}
