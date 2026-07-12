import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { ROLE_LABELS } from '../lib/roles.js'
import { getVehicles, getDashboard } from '../lib/api.js'

export default function DashboardPage() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [kpis, setKpis] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Filter states
  const [selectedType, setSelectedType] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedRegion, setSelectedRegion] = useState('All')

  // Load static filter options on mount
  useEffect(() => {
    async function loadInitial() {
      try {
        const vehiclesData = await getVehicles()
        setVehicles(vehiclesData || [])
      } catch (err) {
        console.error('Failed to load vehicles list for filters', err)
      }
    }
    loadInitial()
  }, [])

  // Load KPI data whenever filters change
  useEffect(() => {
    async function loadKpis() {
      try {
        setIsLoading(true)
        const filters = {}
        if (selectedType !== 'All') filters.vehicle_type = selectedType
        if (selectedStatus !== 'All') filters.status = selectedStatus
        if (selectedRegion !== 'All') filters.region = selectedRegion

        const dashboardData = await getDashboard(filters)
        setKpis(dashboardData)
      } catch (err) {
        setError(err.message || 'Failed to load dashboard KPIs.')
      } finally {
        setIsLoading(false)
      }
    }
    loadKpis()
  }, [selectedType, selectedStatus, selectedRegion])

  // Dynamic filter options
  const vehicleTypes = ['All', ...new Set(vehicles.map((v) => v.type).filter(Boolean))]
  const statuses = ['All', 'Available', 'On Trip', 'In Shop', 'Retired']
  const regions = ['All', ...new Set(vehicles.map((v) => v.region).filter(Boolean))]

  const activeVehicles = kpis?.active_vehicles ?? 0
  const availableVehicles = kpis?.available_vehicles ?? 0
  const maintenanceVehicles = kpis?.vehicles_in_maintenance ?? 0
  const activeTrips = kpis?.active_trips ?? 0
  const pendingTrips = kpis?.pending_trips ?? 0
  const driversOnDuty = kpis?.drivers_on_duty ?? 0
  const fleetUtilization = kpis?.fleet_utilization_pct ?? 0

  const KPIS = [
    { label: 'Active Vehicles', value: activeVehicles, color: 'text-accent-2' },
    { label: 'Available Vehicles', value: availableVehicles, color: 'text-accent' },
    { label: 'Vehicles in Maintenance', value: maintenanceVehicles, color: 'text-warning' },
    { label: 'Active Trips', value: activeTrips, color: 'text-accent-2' },
    { label: 'Pending Trips', value: pendingTrips, color: 'text-ink-muted' },
    { label: 'Drivers On Duty', value: driversOnDuty, color: 'text-accent' },
    { label: 'Fleet Utilization', value: `${fleetUtilization}%`, color: 'text-ink font-semibold' },
  ]

  // Custom SVG Donut Calculation
  const totalVehicles = activeVehicles + availableVehicles + maintenanceVehicles
  const radius = 40
  const circ = 2 * Math.PI * radius // ~251.2
  
  // Percentages
  const activePct = totalVehicles > 0 ? (activeVehicles / totalVehicles) * 100 : 0
  const availablePct = totalVehicles > 0 ? (availableVehicles / totalVehicles) * 100 : 0
  const maintPct = totalVehicles > 0 ? (maintenanceVehicles / totalVehicles) * 100 : 0

  // Offsets
  const activeOffset = circ
  const availableOffset = circ - (circ * activePct) / 100
  const maintOffset = circ - (circ * (activePct + availablePct)) / 100

  if (isLoading && !kpis) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-ink-muted animate-pulse">Loading dashboard metrics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-stamp border border-danger bg-surface p-4 text-danger">
        <p className="font-semibold">Error Loading Dashboard</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-stamp border border-border bg-surface p-4">
        <p className="text-sm text-ink-muted">
          Signed in as <span className="font-medium text-ink">{user.name}</span> ·{' '}
          {ROLE_LABELS[user.role]}
        </p>
      </div>

      {/* Filters dropdown row */}
      <div className="flex flex-wrap gap-3">
        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-stamp border border-border bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-accent"
          >
            {vehicleTypes.map((type) => (
              <option key={type} value={type}>Vehicle Type: {type}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-stamp border border-border bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-accent"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>Status: {status}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="rounded-stamp border border-border bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-accent"
          >
            {regions.map((reg) => (
              <option key={reg} value={reg}>Region: {reg}</option>
            ))}
          </select>
        </div>

        {(selectedType !== 'All' || selectedStatus !== 'All' || selectedRegion !== 'All') && (
          <button
            type="button"
            onClick={() => {
              setSelectedType('All')
              setSelectedStatus('All')
              setSelectedRegion('All')
            }}
            className="rounded-stamp border border-border bg-paper px-3 py-2 text-xs text-ink-muted hover:text-ink"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-stamp border border-border bg-surface p-4 hover:shadow-sm transition-shadow"
          >
            <p className={`font-mono text-2xl font-medium ${kpi.color}`}>{kpi.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-ink-muted font-medium">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Visual Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="rounded-stamp border border-border bg-surface p-6 flex flex-col items-center">
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider self-start mb-6">Vehicle Allocation Breakdown</h3>
          {totalVehicles > 0 ? (
            <div className="flex flex-col sm:flex-row items-center justify-around w-full gap-4">
              <div className="relative h-32 w-32 shrink-0">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background Circle */}
                  <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#E2E8F0" strokeWidth="10" />
                  
                  {/* On Trip Segment */}
                  {activePct > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke="#8B5CF6"
                      strokeWidth="10"
                      strokeDasharray={circ}
                      strokeDashoffset={activeOffset}
                    />
                  )}
                  {/* Available Segment */}
                  {availablePct > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke="#10B981"
                      strokeWidth="10"
                      strokeDasharray={circ}
                      strokeDashoffset={availableOffset}
                    />
                  )}
                  {/* Maintenance Segment */}
                  {maintPct > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke="#F59E0B"
                      strokeWidth="10"
                      strokeDasharray={circ}
                      strokeDashoffset={maintOffset}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-xl font-bold text-ink">{totalVehicles}</span>
                  <span className="text-[9px] uppercase text-ink-muted">Total</span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2 text-xs flex-1 max-w-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#8B5CF6]" />
                    <span className="text-ink">On Trip</span>
                  </div>
                  <span className="font-mono font-semibold text-ink">{activeVehicles} ({activePct.toFixed(0)}%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#10B981]" />
                    <span className="text-ink">Available</span>
                  </div>
                  <span className="font-mono font-semibold text-ink">{availableVehicles} ({availablePct.toFixed(0)}%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#F59E0B]" />
                    <span className="text-ink">In Shop</span>
                  </div>
                  <span className="font-mono font-semibold text-ink">{maintenanceVehicles} ({maintPct.toFixed(0)}%)</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-muted py-8 text-center w-full">No vehicle data matches selected filters.</p>
          )}
        </div>

        {/* Capacity Bar Graph */}
        <div className="rounded-stamp border border-border bg-surface p-6 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-6">Resource Allocation Load</h3>
          <div className="space-y-4">
            {/* Active Vehicles Bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-ink font-medium">Active Vehicles vs Total Fleet</span>
                <span className="font-mono font-semibold text-ink-muted">{activeVehicles} / {totalVehicles}</span>
              </div>
              <div className="h-3.5 w-full bg-border rounded-stamp overflow-hidden">
                <div
                  className="h-full bg-accent-2 transition-all duration-500 rounded-stamp"
                  style={{ width: `${totalVehicles > 0 ? (activeVehicles / totalVehicles) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Drivers On Duty Bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-ink font-medium">Drivers On Duty</span>
                <span className="font-mono font-semibold text-ink-muted">{driversOnDuty} Active</span>
              </div>
              <div className="h-3.5 w-full bg-border rounded-stamp overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-500 rounded-stamp"
                  style={{ width: `${driversOnDuty > 0 ? 80 : 0}%` }} // Simulating occupancy capacity
                />
              </div>
            </div>

            {/* Trips Ratio Bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-ink font-medium">Active Trips vs Pending Queue</span>
                <span className="font-mono font-semibold text-ink-muted">{activeTrips} Active / {pendingTrips} Draft</span>
              </div>
              <div className="h-3.5 w-full bg-border rounded-stamp overflow-hidden">
                <div
                  className="h-full bg-warning transition-all duration-500 rounded-stamp"
                  style={{ width: `${(activeTrips + pendingTrips) > 0 ? (activeTrips / (activeTrips + pendingTrips)) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
          <div className="text-[10px] text-ink-muted mt-4 border-t border-border/40 pt-3">
            Utilization calculations are updated in real-time based on active dispatches and logs.
          </div>
        </div>
      </div>
    </div>
  )
}
