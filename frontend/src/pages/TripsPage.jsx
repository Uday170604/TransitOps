import { useState, useEffect } from 'react'
import { Plus, X, Play, CheckCircle, XCircle } from 'lucide-react'
import StatusBadge from '../components/layout/StatusBadge.jsx'
import { getTrips, getVehicles, getDrivers, createTrip, updateTripStatus } from '../lib/api.js'

export default function TripsPage() {
  const [trips, setTrips] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // New Trip Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // New Trip Form Fields
  const [source, setSource] = useState('')
  const [destination, setDestination] = useState('')
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [cargoWeight, setCargoWeight] = useState('')
  const [plannedDistance, setPlannedDistance] = useState('')

  // Complete Trip Modal State
  const [completingTrip, setCompletingTrip] = useState(null) // holds trip object to complete
  const [finalOdometer, setFinalOdometer] = useState('')
  const [completeError, setCompleteError] = useState('')
  const [isCompletingSubmit, setIsCompletingSubmit] = useState(false)

  async function loadData() {
    try {
      setIsLoading(true)
      const [tripsData, vehiclesData, driversData] = await Promise.all([
        getTrips(),
        getVehicles(),
        getDrivers(),
      ])
      setTrips(tripsData || [])
      setVehicles(vehiclesData || [])
      setDrivers(driversData || [])
    } catch (err) {
      setError(err.message || 'Failed to load trips data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function isLicenseExpired(expiryDate) {
    if (!expiryDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(expiryDate) < today
  }

  // Filters for available vehicles and drivers
  const availableVehicles = vehicles.filter((v) => v.status === 'Available')
  const availableDrivers = drivers.filter(
    (d) => d.status === 'Available' && !isLicenseExpired(d.license_expiry_date)
  )

  // Selected vehicle object for capacity checks
  const selectedVehicleObj = vehicles.find((v) => v.id === parseInt(selectedVehicleId))

  // Handle Create Trip
  async function handleCreateTrip(e) {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    if (!source.trim()) return setFormError('Source is required.')
    if (!destination.trim()) return setFormError('Destination is required.')
    if (!selectedVehicleId) return setFormError('Vehicle selection is required.')
    if (!selectedDriverId) return setFormError('Driver selection is required.')

    const cargoVal = parseFloat(cargoWeight)
    if (isNaN(cargoVal) || cargoVal <= 0) {
      setIsSubmitting(false)
      return setFormError('Cargo weight must be greater than 0.')
    }

    const distVal = parseFloat(plannedDistance)
    if (isNaN(distVal) || distVal <= 0) {
      setIsSubmitting(false)
      return setFormError('Planned distance must be greater than 0.')
    }

    if (selectedVehicleObj && cargoVal > selectedVehicleObj.max_load_capacity) {
      setIsSubmitting(false)
      return setFormError(
        `Cargo weight (${cargoVal} kg) exceeds vehicle maximum capacity (${selectedVehicleObj.max_load_capacity} kg).`
      );
    }

    try {
      await createTrip({
        source: source.trim(),
        destination: destination.trim(),
        vehicle_id: parseInt(selectedVehicleId),
        driver_id: parseInt(selectedDriverId),
        cargo_weight: cargoVal,
        planned_distance: distVal,
        status: 'Draft',
      })
      // Reset Form
      setSource('')
      setDestination('')
      setSelectedVehicleId('')
      setSelectedDriverId('')
      setCargoWeight('')
      setPlannedDistance('')
      setIsModalOpen(false)
      loadData()
    } catch (err) {
      setFormError(err.message || 'Failed to create trip.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Dispatch
  async function handleDispatch(tripId) {
    try {
      await updateTripStatus(tripId, 'Dispatched')
      loadData()
    } catch (err) {
      alert(`Failed to dispatch trip: ${err.message}`)
    }
  }

  // Handle Cancel
  async function handleCancel(tripId) {
    if (!confirm('Are you sure you want to cancel this trip?')) return
    try {
      await updateTripStatus(tripId, 'Cancelled')
      loadData()
    } catch (err) {
      alert(`Failed to cancel trip: ${err.message}`)
    }
  }

  // Handle Complete Submission
  async function handleCompleteSubmit(e) {
    e.preventDefault()
    setCompleteError('')
    setIsCompletingSubmit(true)

    const odoVal = parseFloat(finalOdometer)
    const currentOdo = completingTrip.vehicle?.odometer || 0

    if (isNaN(odoVal) || odoVal < currentOdo) {
      setIsCompletingSubmit(false)
      return setCompleteError(`Final odometer must be at least ${currentOdo} km.`)
    }

    try {
      await updateTripStatus(completingTrip.id, 'Completed', odoVal)
      setCompletingTrip(null)
      setFinalOdometer('')
      loadData()
    } catch (err) {
      setCompleteError(err.message || 'Failed to complete trip.')
    } finally {
      setIsCompletingSubmit(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Manage trip lifecycle: Draft → Dispatched → Completed / Cancelled.
        </p>
        <button
          type="button"
          onClick={() => {
            setFormError('')
            setIsModalOpen(true)
          }}
          className="flex items-center gap-1.5 rounded-stamp bg-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={14} /> New trip
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-ink-muted animate-pulse">Loading trips...</p>
        </div>
      ) : error ? (
        <div className="rounded-stamp border border-danger bg-surface p-4 text-danger text-sm">
          {error}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-stamp border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-medium">Trip ID</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Distance</th>
                <th className="px-4 py-3 font-medium">Cargo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trips.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-ink-muted text-sm">
                    No trips found. Click "New trip" to schedule one.
                  </td>
                </tr>
              ) : (
                trips.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-ink font-semibold">TRP-{t.id}</td>
                    <td className="px-4 py-3 text-ink">
                      {t.source} → {t.destination}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-ink font-medium">{t.vehicle?.model || 'Unknown'}</p>
                      <p className="font-mono text-[10px] text-ink-muted">{t.vehicle?.registration_number}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-muted text-xs">
                      {t.driver?.name || 'Unassigned'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{t.planned_distance} km</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{t.cargo_weight} kg</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.status === 'Draft' && (
                        <button
                          type="button"
                          onClick={() => handleDispatch(t.id)}
                          className="inline-flex items-center gap-1 rounded-stamp bg-accent-2 px-2.5 py-1 text-[10px] font-medium text-white transition-opacity hover:opacity-95"
                        >
                          <Play size={10} /> Dispatch
                        </button>
                      )}
                      {t.status === 'Dispatched' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setCompleteError('')
                              setFinalOdometer(t.vehicle?.odometer?.toString() || '')
                              setCompletingTrip(t)
                            }}
                            className="inline-flex items-center gap-1 rounded-stamp bg-accent px-2 py-1 text-[10px] font-medium text-white transition-opacity hover:opacity-95"
                          >
                            <CheckCircle size={10} /> Complete
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancel(t.id)}
                            className="inline-flex items-center gap-1 rounded-stamp border border-danger px-2 py-1 text-[10px] font-medium text-danger transition-colors hover:bg-danger hover:text-white"
                          >
                            <XCircle size={10} /> Cancel
                          </button>
                        </div>
                      )}
                      {(t.status === 'Completed' || t.status === 'Cancelled') && (
                        <span className="text-[10px] text-ink-muted font-mono uppercase">Archived</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Trip Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-stamp border border-border bg-surface p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-base font-semibold text-ink">New Trip</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-ink-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="mt-4 space-y-4">
              {formError && (
                <p className="stamp border-danger px-2 py-1 text-xs text-danger">{formError}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="source" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Source
                  </label>
                  <input
                    id="source"
                    type="text"
                    required
                    placeholder="e.g. Warehouse A"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label htmlFor="dest" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Destination
                  </label>
                  <input
                    id="dest"
                    type="text"
                    required
                    placeholder="e.g. Client Site B"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="vehicle" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                  Assign Vehicle
                </label>
                <select
                  id="vehicle"
                  required
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                >
                  <option value="">Select an available vehicle...</option>
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.model} ({v.registration_number}) - Cap: {v.max_load_capacity} kg
                    </option>
                  ))}
                </select>
                {selectedVehicleObj && (
                  <p className="mt-1 text-[10px] text-ink-muted">
                    Vehicle capacity: <span className="font-semibold text-ink">{selectedVehicleObj.max_load_capacity} kg</span>. Current odometer: {selectedVehicleObj.odometer} km.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="driver" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                  Assign Driver
                </label>
                <select
                  id="driver"
                  required
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                >
                  <option value="">Select an available driver...</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} (Safety: {d.safety_score})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cargo" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Cargo Weight (kg)
                  </label>
                  <input
                    id="cargo"
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 800"
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="dist" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Planned Distance (km)
                  </label>
                  <input
                    id="dist"
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 150"
                    value={plannedDistance}
                    onChange={(e) => setPlannedDistance(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-stamp border border-border bg-paper px-3 py-2 text-xs font-medium text-ink hover:bg-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-stamp bg-accent px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isSubmitting ? 'Creating...' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Trip Modal */}
      {completingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-stamp border border-border bg-surface p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-base font-semibold text-ink font-semibold">Complete Trip</h2>
              <button
                type="button"
                onClick={() => setCompletingTrip(null)}
                className="text-ink-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="mt-4 space-y-4">
              {completeError && (
                <p className="stamp border-danger px-2 py-1 text-xs text-danger">{completeError}</p>
              )}

              <div>
                <p className="text-xs text-ink-muted mb-3">
                  You are completing the trip from <span className="font-medium text-ink">{completingTrip.source}</span> to <span className="font-medium text-ink">{completingTrip.destination}</span>.
                </p>
                <p className="text-xs text-ink-muted mb-3">
                  Vehicle: <span className="font-medium text-ink">{completingTrip.vehicle?.model}</span> ({completingTrip.vehicle?.registration_number}).
                </p>
                <p className="text-xs text-ink-muted mb-4">
                  Odometer before trip: <span className="font-semibold text-ink">{completingTrip.vehicle?.odometer} km</span>.
                </p>

                <label htmlFor="finalOdo" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                  Final Odometer Reading (km)
                </label>
                <input
                  id="finalOdo"
                  type="number"
                  required
                  min={completingTrip.vehicle?.odometer || 0}
                  value={finalOdometer}
                  onChange={(e) => setFinalOdometer(e.target.value)}
                  className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setCompletingTrip(null)}
                  className="rounded-stamp border border-border bg-paper px-3 py-2 text-xs font-medium text-ink hover:bg-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCompletingSubmit}
                  className="rounded-stamp bg-accent px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isCompletingSubmit ? 'Submitting...' : 'Complete Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
