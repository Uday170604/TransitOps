import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { ROLE_LABELS } from '../lib/roles.js'
import { getVehicles, getDrivers, getTrips } from '../lib/api.js'

function getVehicleRegion(regNum) {
  if (!regNum) return 'Other'
  const prefix = regNum.trim().substring(0, 2).toUpperCase()
  if (prefix === 'GJ') return 'Gujarat'
  if (prefix === 'MH') return 'Maharashtra'
  if (prefix === 'DL') return 'Delhi'
  if (prefix === 'KA') return 'Karnataka'
  if (prefix === 'TN') return 'Tamil Nadu'
  return 'Other'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [trips, setTrips] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Filter states
  const [selectedType, setSelectedType] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedRegion, setSelectedRegion] = useState('All')

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const [vehiclesData, driversData, tripsData] = await Promise.all([
          getVehicles(),
          getDrivers(),
          getTrips(),
        ])
        setVehicles(vehiclesData || [])
        setDrivers(driversData || [])
        setTrips(tripsData || [])
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data.')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Dynamic filter options
  const vehicleTypes = ['All', ...new Set(vehicles.map((v) => v.type).filter(Boolean))]
  const statuses = ['All', 'Available', 'On Trip', 'In Shop', 'Retired']
  const regions = ['All', ...new Set(vehicles.map((v) => getVehicleRegion(v.registration_number)).filter(Boolean))]

  // Apply filters
  const filteredVehicles = vehicles.filter((v) => {
    const matchesType = selectedType === 'All' || v.type === selectedType
    const matchesStatus = selectedStatus === 'All' || v.status === selectedStatus
    const matchesRegion = selectedRegion === 'All' || getVehicleRegion(v.registration_number) === selectedRegion
    return matchesType && matchesStatus && matchesRegion
  })

  // Filtered vehicle IDs for trip filtering
  const filteredVehicleIds = new Set(filteredVehicles.map((v) => v.id))

  // Apply filters to trips (trips associated with filtered vehicles)
  const filteredTrips = trips.filter((t) => filteredVehicleIds.has(t.vehicle_id))

  // Calculate KPIs
  const activeVehicles = filteredVehicles.filter((v) => v.status === 'On Trip').length
  const availableVehicles = filteredVehicles.filter((v) => v.status === 'Available').length
  const maintenanceVehicles = filteredVehicles.filter((v) => v.status === 'In Shop').length
  
  const activeTrips = filteredTrips.filter((t) => t.status === 'Dispatched').length
  const pendingTrips = filteredTrips.filter((t) => t.status === 'Draft').length

  const driversOnDuty = drivers.filter(d => d.status === 'Available' || d.status === 'On Trip').length

  const totalOperationalVehicles = activeVehicles + availableVehicles + maintenanceVehicles
  const fleetUtilization = totalOperationalVehicles > 0 
    ? Math.round((activeVehicles / totalOperationalVehicles) * 100) 
    : 0

  const KPIS = [
    { label: 'Active Vehicles', value: activeVehicles },
    { label: 'Available Vehicles', value: availableVehicles },
    { label: 'Vehicles in Maintenance', value: maintenanceVehicles },
    { label: 'Active Trips', value: activeTrips },
    { label: 'Pending Trips', value: pendingTrips },
    { label: 'Drivers On Duty', value: driversOnDuty },
    { label: 'Fleet Utilization', value: `${fleetUtilization}%` },
  ]

  if (isLoading) {
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
        Active status of fleet operations: <span className="font-semibold text-ink">{filteredVehicles.length}</span> vehicles matched.
      </div>
    </div>
  )
}
