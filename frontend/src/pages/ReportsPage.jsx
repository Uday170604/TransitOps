import { useState, useEffect } from 'react'
import { Download, AlertCircle, FileText, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { getReports } from '../lib/api.js'

export default function ReportsPage() {
  const [reportData, setReportData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Search & Sorting States
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('roi')
  const [sortDirection, setSortDirection] = useState('desc')

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

  // Export CSV
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
      alert(err.message || 'Failed to download CSV report.')
    }
  }

  // Export PDF
  async function handleExportPDF() {
    try {
      const token = localStorage.getItem('transitops_token')
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/reports/export-pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      })
      if (!response.ok) throw new Error('Failed to export PDF')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', 'fleet_operational_report.pdf')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      alert(err.message || 'Failed to download PDF report.')
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

  // Sort & Search execution
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="inline ml-1 text-ink-muted" />
    return sortDirection === 'asc'
      ? <ArrowUp size={12} className="inline ml-1 text-accent" />
      : <ArrowDown size={12} className="inline ml-1 text-accent" />
  }

  const filteredVehicles = vehicles.filter((v) => {
    const term = searchTerm.toLowerCase()
    return (
      v.registration_number.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      v.vehicle_id.toString().includes(term)
    )
  })

  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    let valA = a[sortField]
    let valB = b[sortField]

    if (typeof valA === 'string') {
      valA = valA.toLowerCase()
      valB = valB.toLowerCase()
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // Visual SVG chart: Top 5 vehicles comparison (Cost vs Efficiency)
  const chartVehicles = vehicles.slice(0, 5)
  const maxCost = Math.max(...chartVehicles.map(v => v.total_operational_cost), 1000)
  const maxEff = Math.max(...chartVehicles.map(v => v.fuel_efficiency), 10)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Fleet-wide performance metrics, computed from completed trips, fuel logs, and maintenance logs.
        </p>
        <div className="flex items-center gap-2 self-end">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-stamp border border-border bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-paper"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 rounded-stamp bg-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 font-semibold"
          >
            <FileText size={14} /> Export PDF
          </button>
        </div>
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

      {/* Visual Analytics Chart */}
      {chartVehicles.length > 0 && (
        <div className="rounded-stamp border border-border bg-surface p-6">
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-6">Visual Fleet Analysis (Cost vs. Fuel Efficiency)</h3>
          <div className="w-full h-48 flex items-end justify-around gap-2 px-4 pb-6 border-b border-border/80 relative">
            
            {/* Grid helper lines */}
            <div className="absolute inset-x-0 bottom-6 border-b border-border/40" />
            <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-border/30" />
            <div className="absolute inset-x-0 top-4 border-b border-dashed border-border/30" />

            {chartVehicles.map((v) => {
              const costHeight = (v.total_operational_cost / maxCost) * 100 // max 100px
              const effHeight = (v.fuel_efficiency / maxEff) * 100 // max 100px
              return (
                <div key={v.vehicle_id} className="flex flex-col items-center w-24 gap-2 z-10">
                  <div className="flex items-end justify-center gap-2.5 h-32 w-full">
                    {/* Fuel Efficiency Bar */}
                    <div className="w-4.5 bg-[#10B981] rounded-t-stamp hover:opacity-85 transition-opacity relative group" style={{ height: `${Math.max(effHeight, 5)}%` }}>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-ink text-white text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-mono z-20">
                        {v.fuel_efficiency}km/L
                      </div>
                    </div>
                    {/* Cost Bar */}
                    <div className="w-4.5 bg-[#4F46E5] rounded-t-stamp hover:opacity-85 transition-opacity relative group" style={{ height: `${Math.max(costHeight, 5)}%` }}>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-ink text-white text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-mono z-20">
                        ₹{v.total_operational_cost.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-ink font-semibold truncate max-w-full text-center">{v.registration_number}</span>
                </div>
              )
            })}
          </div>
          
          <div className="flex gap-4 justify-center text-[10px] mt-4 font-semibold uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 bg-[#10B981] rounded-stamp" />
              <span className="text-ink-muted">Fuel Efficiency (km/L)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 bg-[#4F46E5] rounded-stamp" />
              <span className="text-ink-muted">Operational Cost (₹)</span>
            </div>
          </div>
        </div>
      )}

      {/* ROI Registry with Search and Sort */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wide">Vehicle ROI Registry</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2 top-2.5 h-4 w-4 text-ink-muted" />
            <input
              type="text"
              placeholder="Search by ID, Reg, Model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-stamp border border-border bg-surface pl-9 pr-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-stamp border border-border bg-surface">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wide text-ink-muted select-none">
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('vehicle_id')}>
                  Vehicle ID {renderSortIcon('vehicle_id')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('registration_number')}>
                  Reg No {renderSortIcon('registration_number')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('model')}>
                  Model {renderSortIcon('model')}
                </th>
                <th className="px-4 py-3 text-right font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('fuel_efficiency')}>
                  Fuel Efficiency {renderSortIcon('fuel_efficiency')}
                </th>
                <th className="px-4 py-3 text-right font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('total_operational_cost')}>
                  Total Operational Cost {renderSortIcon('total_operational_cost')}
                </th>
                <th className="px-4 py-3 text-right font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('roi')}>
                  ROI % {renderSortIcon('roi')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedVehicles.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-ink-muted">
                    No vehicles found matching search.
                  </td>
                </tr>
              ) : (
                sortedVehicles.map((v) => (
                  <tr key={v.vehicle_id} className="border-b border-border last:border-0 hover:bg-paper/40">
                    <td className="px-4 py-2.5 font-mono text-ink font-semibold">VEH-{v.vehicle_id}</td>
                    <td className="px-4 py-2.5 font-mono text-ink font-semibold">{v.registration_number}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{v.model}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink-muted">{v.fuel_efficiency} km/L</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink-muted">₹{v.total_operational_cost.toLocaleString()}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${(v.roi * 100) >= 0 ? 'text-[#10B981]' : 'text-danger'}`}>
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
