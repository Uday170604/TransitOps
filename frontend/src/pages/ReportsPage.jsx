import { useState, useEffect } from 'react'
import { Download, AlertCircle } from 'lucide-react'
import { getVehicles, getTrips, getMaintenanceLogs } from '../lib/api.js'

export default function ReportsPage() {
  const [vehicles, setVehicles] = useState([])
  const [trips, setTrips] = useState([])
  const [logs, setLogs] = useState([])
  const [expenses, setExpenses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Load local expenses
    const saved = localStorage.getItem('transitops_expenses')
    if (saved) {
      try {
        setExpenses(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }

    async function loadData() {
      try {
        setIsLoading(true)
        const [vehiclesData, tripsData, logsData] = await Promise.all([
          getVehicles(),
          getTrips(),
          getMaintenanceLogs(),
        ])
        setVehicles(vehiclesData || [])
        setTrips(tripsData || [])
        setLogs(logsData || [])
      } catch (err) {
        setError(err.message || 'Failed to load report data.')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Helper to parse liters from fuel expense details (e.g. "35L", "40 liters", "45")
  function parseLiters(detail) {
    if (!detail) return 0
    const match = detail.match(/\d+(\.\d+)?/)
    return match ? parseFloat(match[0]) : 0
  }

  // Calculate global metrics
  const completedTrips = trips.filter((t) => t.status === 'Completed')
  const totalDistance = completedTrips.reduce((sum, t) => sum + (t.planned_distance || 0), 0)

  const fuelExpenses = expenses.filter((e) => e.type === 'Fuel')
  const totalFuelLiters = fuelExpenses.reduce((sum, e) => sum + parseLiters(e.detail), 0)

  const fuelCost = expenses.filter((e) => e.type === 'Fuel').reduce((sum, e) => sum + e.cost, 0)
  const otherCost = expenses.filter((e) => e.type !== 'Fuel').reduce((sum, e) => sum + e.cost, 0)
  const maintenanceCost = logs.filter((l) => l.status === 'Closed').reduce((sum, l) => sum + (l.cost || 0), 0)

  const operationalCost = fuelCost + otherCost + maintenanceCost
  const fuelEfficiency = totalFuelLiters > 0 ? (totalDistance / totalFuelLiters).toFixed(1) : 0

  const activeVehicles = vehicles.filter((v) => v.status === 'On Trip').length
  const operationalVehicles = vehicles.filter((v) => v.status !== 'Retired')
  const utilization = operationalVehicles.length > 0 ? Math.round((activeVehicles / operationalVehicles.length) * 100) : 0

  // Calculate per-vehicle ROI metrics
  const vehicleMetrics = vehicles.map((vehicle) => {
    const vTrips = completedTrips.filter((t) => t.vehicle_id === vehicle.id)
    const vDistance = vTrips.reduce((sum, t) => sum + (t.planned_distance || 0), 0)
    
    // Revenue model: ₹30 per km for completed trips
    const vRevenue = vDistance * 30

    // Maintenance cost for this vehicle
    const vMaintenance = logs
      .filter((l) => l.vehicle_id === vehicle.id && l.status === 'Closed')
      .reduce((sum, l) => sum + (l.cost || 0), 0)

    // Fuel cost for this vehicle
    const vFuel = expenses
      .filter((e) => e.vehicle_id === vehicle.id && e.type === 'Fuel')
      .reduce((sum, e) => sum + e.cost, 0)

    const totalCosts = vMaintenance + vFuel
    const netProfit = vRevenue - totalCosts
    const acquisition = vehicle.acquisition_cost || 1 // avoid division by zero
    const roi = (netProfit / acquisition) * 100

    return {
      id: vehicle.id,
      reg: vehicle.registration_number,
      model: vehicle.model,
      type: vehicle.type,
      tripsCount: vTrips.length,
      distance: vDistance,
      revenue: vRevenue,
      maintenance: vMaintenance,
      fuel: vFuel,
      costs: totalCosts,
      roi: roi,
      acquisition: vehicle.acquisition_cost
    }
  })

  // Calculate Average ROI
  const operationalVehicleMetrics = vehicleMetrics.filter((vm) => {
    const vObj = vehicles.find((v) => v.id === vm.id)
    return vObj && vObj.status !== 'Retired'
  })
  
  const avgROI = operationalVehicleMetrics.length > 0
    ? (operationalVehicleMetrics.reduce((sum, vm) => sum + vm.roi, 0) / operationalVehicleMetrics.length).toFixed(1)
    : 0

  const METRICS = [
    { label: 'Fuel Efficiency', value: `${fuelEfficiency} km/L`, hint: 'Distance ÷ Fuel' },
    { label: 'Fleet Utilization', value: `${utilization}%`, hint: 'Vehicles on trip vs. total' },
    { label: 'Operational Cost', value: `₹${operationalCost.toLocaleString()}`, hint: 'Fuel + Maintenance + Toll' },
    { label: 'Avg. Vehicle ROI', value: `${avgROI}%`, hint: '(Revenue − Costs) ÷ Acquisition' },
  ]

  // Export CSV
  function handleExportCSV() {
    let csvContent = 'Registration No,Model,Type,Trips Completed,Total Distance (km),Acquisition Cost (INR),Maintenance Cost (INR),Fuel Cost (INR),Est. Revenue (INR),ROI (%)\n'
    
    vehicleMetrics.forEach((vm) => {
      csvContent += `"${vm.reg}","${vm.model}","${vm.type}",${vm.tripsCount},${vm.distance},${vm.acquisition},${vm.maintenance},${vm.fuel},${vm.revenue},${vm.roi.toFixed(1)}\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `transitops_fleet_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
                <th className="px-4 py-3 font-medium">Reg No</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium text-center">Trips</th>
                <th className="px-4 py-3 font-medium text-center">Distance</th>
                <th className="px-4 py-3 font-medium text-right">Maintenance</th>
                <th className="px-4 py-3 font-medium text-right">Fuel Logged</th>
                <th className="px-4 py-3 font-medium text-right">Est. Revenue</th>
                <th className="px-4 py-3 font-medium text-right">Acquisition</th>
                <th className="px-4 py-3 font-medium text-right">ROI %</th>
              </tr>
            </thead>
            <tbody>
              {vehicleMetrics.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-6 text-center text-ink-muted">
                    No vehicles available to calculate metrics.
                  </td>
                </tr>
              ) : (
                vehicleMetrics.map((vm) => (
                  <tr key={vm.id} className="border-b border-border last:border-0 hover:bg-paper/40">
                    <td className="px-4 py-2.5 font-mono text-ink font-semibold">{vm.reg}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{vm.model}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-ink-muted">{vm.tripsCount}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-ink-muted">{vm.distance} km</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink-muted">₹{vm.maintenance.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink-muted">₹{vm.fuel.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink-muted font-medium text-accent-2">₹{vm.revenue.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink-muted">₹{vm.acquisition.toLocaleString()}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${vm.roi >= 0 ? 'text-accent-2' : 'text-danger'}`}>
                      {vm.roi.toFixed(1)}%
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
          ROI is calculated based on an operational revenue yield model of <strong>₹30 per km</strong> for completed trips, offset by vehicle acquisition cost and operational expenses (Maintenance + Fuel).
        </p>
      </div>
    </div>
  )
}
