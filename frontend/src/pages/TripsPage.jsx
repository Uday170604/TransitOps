import { Plus } from 'lucide-react'
import StatusBadge from '../components/layout/StatusBadge.jsx'

const TRIPS = [
  { id: 'TRP-1042', route: 'Rajkot → Ahmedabad', vehicle: 'Van-05', driver: 'Alex Menon', cargo: '450 kg', status: 'Dispatched' },
  { id: 'TRP-1041', route: 'Surat → Vadodara', vehicle: 'Truck-11', driver: 'Kiran Rao', cargo: '2,900 kg', status: 'Completed' },
  { id: 'TRP-1040', route: 'Rajkot → Jamnagar', vehicle: 'Van-02', driver: 'Rohit Verma', cargo: '300 kg', status: 'Draft' },
  { id: 'TRP-1039', route: 'Ahmedabad → Rajkot', vehicle: 'Truck-04', driver: 'Sana Iqbal', cargo: '2,100 kg', status: 'Cancelled' },
]

export default function TripsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Draft → Dispatched → Completed → Cancelled. Dispatch validates vehicle/driver
          availability and cargo weight against capacity.
        </p>
        <button
          type="button"
          disabled
          className="flex items-center gap-1.5 rounded-stamp bg-accent px-3 py-2 text-xs font-medium text-white opacity-60"
          title="Enable once POST /trips is available"
        >
          <Plus size={14} /> New trip
        </button>
      </div>

      <div className="overflow-x-auto rounded-stamp border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Trip ID</th>
              <th className="px-4 py-3 font-medium">Route</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Driver</th>
              <th className="px-4 py-3 font-medium">Cargo</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {TRIPS.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-ink">{t.id}</td>
                <td className="px-4 py-3 text-ink">{t.route}</td>
                <td className="px-4 py-3 text-ink-muted">{t.vehicle}</td>
                <td className="px-4 py-3 text-ink-muted">{t.driver}</td>
                <td className="px-4 py-3 text-ink-muted">{t.cargo}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-ink-muted">
        Sample data shown — connect to the backend to replace this with live trips.
      </p>
    </div>
  )
}
