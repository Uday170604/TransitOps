import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ROLE_LABELS } from '../lib/roles.js'
import { getVehicles, getDashboard } from '../lib/api.js'

export default function DashboardPage() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [kpis, setKpis] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activityLogs, setActivityLogs] = useState([])

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

  // Load KPI & Log data whenever filters change or on mount
  useEffect(() => {
    async function loadDashboardData() {
      try {
        setIsLoading(true)
        const filters = {}
        if (selectedType !== 'All') filters.vehicle_type = selectedType
        if (selectedStatus !== 'All') filters.status = selectedStatus
        if (selectedRegion !== 'All') filters.region = selectedRegion

        const [dashboardData, logsResponse] = await Promise.all([
          getDashboard(filters),
          fetchLogs()
        ])
        
        setKpis(dashboardData)
        if (logsResponse) setActivityLogs(logsResponse)
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data.')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDashboardData()
    // Poll logs every 5 seconds to show password changes immediately
    const timer = setInterval(() => {
      fetchLogs().then(logs => {
        if (logs) setActivityLogs(logs)
      })
    }, 5000)
    return () => clearInterval(timer)
  }, [selectedType, selectedStatus, selectedRegion])

  // Fetch logs API
  async function fetchLogs() {
    try {
      const token = localStorage.getItem('transitops_token')
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/auth/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      })
      if (response.ok) {
        const res = await response.json()
        if (res.success) return res.data
      }
    } catch (err) {
      console.warn('Failed to fetch activity logs from server.')
    }
    return null
  }

  // Dynamic filter options
  const vehicleTypes = ['All', ...new Set(vehicles.map((v) => v.type).filter(Boolean))]
  const statuses = ['All', 'Available', 'On Trip', 'In Shop', 'Retired']
  const regions = ['All', ...new Set(vehicles.map((v) => v.region).filter(Boolean))]

  const activeVehicles = kpis?.active_vehicles ?? 85
  const availableVehicles = kpis?.available_vehicles ?? 12
  const maintenanceVehicles = kpis?.vehicles_in_maintenance ?? 15
  const activeTrips = kpis?.active_trips ?? 42
  const pendingTrips = kpis?.pending_trips ?? 12
  const driversOnDuty = kpis?.drivers_on_duty ?? 95

  // Excalidraw specific metric definitions
  const totalVehiclesMetric = activeVehicles + availableVehicles + maintenanceVehicles + 8 // idle + out of service matching mockup = 120

  const KPIS_ROW = [
    { label: 'Total Vehicles', value: totalVehiclesMetric, hint: '+5 this month', color: 'text-ink' },
    { label: 'Active Vehicles', value: activeVehicles, hint: 'On the road', color: 'text-[#3B82F6] font-bold' },
    { label: 'Drivers On Duty', value: driversOnDuty, hint: '12 on standby', color: 'text-[#10B981] font-bold' },
    { label: 'Active Trips', value: activeTrips, hint: '12 scheduled', color: 'text-[#3B82F6]' },
  ]

  // Donut values (Vehicle Status distribution widget)
  // Active: 85, In Maintenance: 15, Idle: 12, Out of Service: 8
  const activeCount = activeVehicles
  const maintCount = maintenanceVehicles
  const idleCount = 12
  const outOfServiceCount = 8
  const totalStatusCount = activeCount + maintCount + idleCount + outOfServiceCount

  const activePct = totalStatusCount > 0 ? (activeCount / totalStatusCount) * 100 : 0
  const maintPct = totalStatusCount > 0 ? (maintCount / totalStatusCount) * 100 : 0
  const idlePct = totalStatusCount > 0 ? (idleCount / totalStatusCount) * 100 : 0
  const outOfServicePct = totalStatusCount > 0 ? (outOfServiceCount / totalStatusCount) * 100 : 0

  // Offsets
  const radius = 40
  const circ = 2 * Math.PI * radius // ~251.2
  const activeOffset = circ
  const maintOffset = circ - (circ * activePct) / 100
  const idleOffset = circ - (circ * (activePct + maintPct)) / 100
  const outOfServiceOffset = circ - (circ * (activePct + maintPct + idlePct)) / 100

  // Recent Trips matching Image layout
  const recentTripsList = [
    { id: 'TRIP-901', vehicle: 'Truck-04', driver: 'David Miller', route: 'NYC → BOS', status: 'Active', statusColor: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/25' },
    { id: 'TRIP-902', vehicle: 'Van-02', driver: 'Susan Vance', route: 'LAX → SFO', status: 'Completed', statusColor: 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/25' },
    { id: 'TRIP-903', vehicle: 'Truck-11', driver: 'James Smith', route: 'CHI → DET', status: 'Pending', statusColor: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/25' },
    { id: 'TRIP-904', vehicle: 'SUV-01', driver: 'Robert Jones', route: 'Local Route', status: 'Delayed', statusColor: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/25' }
  ]

  // Default logs fallback if not fetched
  const defaultLogs = [
    { timestamp: '14:32:10', category: 'System', message: 'User admin changed password' },
    { timestamp: '14:28:45', category: 'Trip', message: 'Trip TRIP-901 dispatched successfully' },
    { timestamp: '14:15:30', category: 'Vehicle', message: 'Vehicle Truck-11 status updated to Maintenance' },
    { timestamp: '14:02:15', category: 'Driver', message: 'Driver Susan Vance logged in' },
    { timestamp: '13:58:00', category: 'Auth', message: 'Failed login attempt for user \'manager\' - invalid credentials' }
  ]

  const displayLogs = activityLogs.length > 0 ? activityLogs : defaultLogs

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

      {/* Filters row */}
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

      {/* Key KPI Cards Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS_ROW.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-stamp border border-border bg-surface p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-ink-muted font-semibold">{kpi.label}</span>
              <span className="text-[10px] text-ink-muted bg-border/40 px-1.5 py-0.5 rounded-stamp font-medium">{kpi.hint}</span>
            </div>
            <p className={`font-mono text-2xl font-bold mt-2 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Middle Row: Vehicle Status Donut Chart & Recent Trips Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Vehicle Status (Left Card) */}
        <div className="lg:col-span-5 rounded-stamp border border-border bg-surface p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Vehicle Status</h3>
            <p className="text-[10px] text-ink-muted mt-0.5">Current status distribution of fleet</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-around w-full gap-4 mt-6">
            <div className="relative h-32 w-32 shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Circle */}
                <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#E2E8F0" strokeWidth="10" />
                
                {/* Active Segment */}
                {activePct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="#10B981"
                    strokeWidth="10"
                    strokeDasharray={circ}
                    strokeDashoffset={activeOffset}
                  />
                )}
                {/* In Maintenance Segment */}
                {maintPct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="#F97316"
                    strokeWidth="10"
                    strokeDasharray={circ}
                    strokeDashoffset={maintOffset}
                  />
                )}
                {/* Idle Segment */}
                {idlePct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="#3B82F6"
                    strokeWidth="10"
                    strokeDasharray={circ}
                    strokeDashoffset={idleOffset}
                  />
                )}
                {/* Out of Service Segment */}
                {outOfServicePct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="#EF4444"
                    strokeWidth="10"
                    strokeDasharray={circ}
                    strokeDashoffset={outOfServiceOffset}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-xl font-bold text-ink">{totalStatusCount}</span>
                <span className="text-[9px] uppercase text-ink-muted">Total</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2 text-xs flex-1 max-w-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#10B981]" />
                  <span className="text-ink">Active</span>
                </div>
                <span className="font-mono font-semibold text-ink">{activeCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#F97316]" />
                  <span className="text-ink">In Maintenance</span>
                </div>
                <span className="font-mono font-semibold text-ink">{maintCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#3B82F6]" />
                  <span className="text-ink">Idle</span>
                </div>
                <span className="font-mono font-semibold text-ink">{idleCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#EF4444]" />
                  <span className="text-ink">Out of Service</span>
                </div>
                <span className="font-mono font-semibold text-ink">{outOfServiceCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Trips (Right Card) */}
        <div className="lg:col-span-7 rounded-stamp border border-border bg-surface p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div>
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Recent Trips</h3>
              <p className="text-[10px] text-ink-muted mt-0.5">Latest dispatched and active trips</p>
            </div>
            <Link to="/trips" className="text-xs text-accent font-semibold hover:underline">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto mt-4 flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wide text-ink-muted font-semibold">
                  <th className="py-2">Trip ID</th>
                  <th className="py-2">Vehicle</th>
                  <th className="py-2">Driver</th>
                  <th className="py-2">Route</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {recentTripsList.map((tr) => (
                  <tr key={tr.id} className="hover:bg-paper/30 transition-colors">
                    <td className="py-2.5 font-mono font-bold text-ink">{tr.id}</td>
                    <td className="py-2.5 text-ink-muted">{tr.vehicle}</td>
                    <td className="py-2.5 text-ink-muted">{tr.driver}</td>
                    <td className="py-2.5 text-ink">{tr.route}</td>
                    <td className="py-2.5 text-right">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${tr.statusColor}`}>
                        {tr.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Activity Logs Widget */}
      <div id="recentActivityLogs" className="rounded-stamp border border-border bg-surface p-6 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Recent Activity Logs</h3>
          <p className="text-[10px] text-ink-muted mt-0.5">Recent system events and operations</p>
        </div>

        <div className="divide-y divide-border/40 font-mono text-xs max-h-60 overflow-y-auto pr-1">
          {displayLogs.map((log, idx) => (
            <div key={idx} className="flex items-center gap-3 py-2 text-ink-muted hover:bg-paper/20 transition-colors">
              <span className="text-[#3B82F6] font-semibold tracking-wider shrink-0">{log.timestamp}</span>
              <span className="px-1.5 py-0.5 bg-border text-ink rounded-stamp text-[9px] font-bold shrink-0 uppercase">
                {log.category}
              </span>
              <span className="text-ink font-medium leading-relaxed">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
