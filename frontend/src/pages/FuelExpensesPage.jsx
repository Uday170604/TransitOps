import { Plus } from 'lucide-react'

const LOGS = [
  { date: '2026-07-10', vehicle: 'Van-05', type: 'Fuel', detail: '38 L', cost: '₹4,180' },
  { date: '2026-07-09', vehicle: 'Truck-11', type: 'Toll', detail: 'NH-48 plaza', cost: '₹560' },
  { date: '2026-07-08', vehicle: 'Van-02', type: 'Maintenance', detail: 'Oil change', cost: '₹2,300' },
  { date: '2026-07-05', vehicle: 'Truck-11', type: 'Fuel', detail: '112 L', cost: '₹12,320' },
]

export default function FuelExpensesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Fuel logs and other operational expenses. Total cost per vehicle rolls up
          automatically once wired to the backend.
        </p>
        <button
          type="button"
          disabled
          className="flex items-center gap-1.5 rounded-stamp bg-accent px-3 py-2 text-xs font-medium text-white opacity-60"
          title="Enable once POST /expenses is available"
        >
          <Plus size={14} /> Log expense
        </button>
      </div>

      <div className="overflow-x-auto rounded-stamp border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Detail</th>
              <th className="px-4 py-3 font-medium text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
            {LOGS.map((l, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{l.date}</td>
                <td className="px-4 py-3 text-ink">{l.vehicle}</td>
                <td className="px-4 py-3 text-ink-muted">{l.type}</td>
                <td className="px-4 py-3 text-ink-muted">{l.detail}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-ink">{l.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-ink-muted">
        Sample data shown — connect to the backend to replace this with live logs.
      </p>
    </div>
  )
}
