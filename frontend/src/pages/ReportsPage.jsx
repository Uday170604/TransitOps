import { useState, useEffect } from 'react'
import { Download, AlertCircle } from 'lucide-react'
import { getReports } from '../lib/api.js'

export default function ReportsPage() {
  const [reportData, setReportData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const data = await getReports()
        setReportData(data)
      } catch (err) {
        setError(err.message || 'Failed to load report data.')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Export CSV using authenticating fetch call
  async function handleExportCSV() {
    try {
      const token = localStorage.getItem('transitops_token')
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/reports/export`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      })
      if (!response.ok) throw new Error('Failed to export CSV')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', 'fleet_operational_report.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      alert(err.message || 'Failed to download report.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-ink-muted animate-pulse">Computing fleet metrics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-stamp border border-danger bg-surface p-4 text-danger text-sm">
        {error}
      </div>
    )
  }

  const vehicles = reportData?.vehicles || []
  const validEfficiencies = vehicles.map(v => v.fuel_efficiency).filter(fe => fe > 0)
  const avgFuelEfficiency = validEfficiencies.length > 0
    ? (validEfficiencies.reduce((sum, fe) => sum + fe, 0) / validEfficiencies.length).toFixed(1)
    : '0.0'

  const fleetUtilization = reportData?.fleet_utilization_pct ?? 0
  const totalCost = reportData?.total_operational_cost ?? 0
  
  const avgROI = vehicles.length > 0
    ? ((vehicles.reduce((sum, v) => sum + v.roi, 0) / vehicles.length) * 100).toFixed(1)
    : '0.0'

  const METRICS = [
    { label: 'Avg. Fuel Efficiency', value: `${avgFuelEfficiency} km/L`, hint: 'Sum of efficiency ÷ vehicles' },
    { label: 'Fleet Utilization', value: `${fleetUtilization}%`, hint: 'Vehicles on trip vs. total' },
    { label: 'Operational Cost', value: `₹${totalCost.toLocaleString()}`, hint: 'Fuel + Maintenance + Toll' },
    { label: 'Avg. Vehicle ROI', value: `${avgROI}%`, hint: '(Revenue − Costs) ÷ Acquisition' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Fleet-wide performance metrics, computed from completed trips, fuel logs, and maintenance logs.
        </p>
        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 rounded-stamp border border-border bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-paper"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.label} className="rounded-stamp border border-border bg-surface p-4">
            <p className="font-mono text-xl font-medium text-ink">{m.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-muted text-ink">
              {m.label}
            </p>
            <p className="mt-1 text-[11px] text-ink-muted">{m.hint}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-sm font-semibold text-ink uppercase tracking-wide">Vehicle ROI Registry</h2>
        <div className="overflow-x-auto rounded-stamp border border-border bg-surface">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-medium">Vehicle ID</th>
                <th className="px-4 py-3 font-medium">Reg No</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium text-right">Fuel Efficiency</th>
                <th className="px-4 py-3 font-medium text-right">Total Operational Cost</th>
                <th className="px-4 py-3 font-medium text-right">ROI %</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-ink-muted">
                    No vehicles available to calculate metrics.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.vehicle_id} className="border-b border-border last:border-0 hover:bg-paper/40">
                    <td className="px-4 py-2.5 font-mono text-ink font-semibold">VEH-{v.vehicle_id}</td>
                    <td className="px-4 py-2.5 font-mono text-ink font-semibold">{v.registration_number}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{v.model}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink-muted">{v.fuel_efficiency} km/L</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink-muted">₹{v.total_operational_cost.toLocaleString()}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${(v.roi * 100) >= 0 ? 'text-accent-2' : 'text-danger'}`}>
                      {(v.roi * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex gap-2 rounded-stamp border border-dashed border-border bg-paper/30 p-4 text-xs text-ink-muted">
        <AlertCircle size={14} className="shrink-0 text-ink-muted mt-0.5" />
        <p>
          ROI is calculated based on an operational revenue yield model of completed trips distance, offset by vehicle acquisition cost and operational expenses (Maintenance + Fuel + Expenses) from the database.
        </p>
      </div>
    </div>
  )
}
