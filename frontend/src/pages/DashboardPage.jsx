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
    { label: 'Active Vehicles', value: activeVehicles },
    { label: 'Available Vehicles', value: availableVehicles },
    { label: 'Vehicles in Maintenance', value: maintenanceVehicles },
    { label: 'Active Trips', value: activeTrips },
    { label: 'Pending Trips', value: pendingTrips },
    { label: 'Drivers On Duty', value: driversOnDuty },
    { label: 'Fleet Utilization', value: `${fleetUtilization}%` },
  ]

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
        Active status of fleet operations.
      </div>
    </div>
  )
}
