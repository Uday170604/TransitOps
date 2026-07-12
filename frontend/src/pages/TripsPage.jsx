import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Play, CheckCircle, Search, AlertTriangle, ArrowRight } from 'lucide-react'
import { getTrips, getVehicles, getDrivers, createTrip, updateTripStatus } from '../lib/api.js'
import { useSettings } from '../context/SettingsContext.jsx'

export default function TripsPage() {
  const { formatDistance, distanceUnitLabel } = useSettings()
  const [trips, setTrips] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Create Trip Form Fields
  const [source, setSource] = useState('Gandhinagar Depot')
  const [destination, setDestination] = useState('Ahmedabad Hub')
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [cargoWeight, setCargoWeight] = useState('')
  const [plannedDistance, setPlannedDistance] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Live board search
  const [searchTerm, setSearchTerm] = useState('')

  // Complete Trip Modal State
  const [completingTrip, setCompletingTrip] = useState(null)
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

  // Filter available drivers & vehicles
  const availableVehicles = vehicles.filter(v => v.status === 'Available')
  
  // Enforce rule: Expired license or Suspended safety_status/status blocks from trip assignment
  const availableDrivers = drivers.filter(d => {
    const expired = isLicenseExpired(d.license_expiry_date)
    const isSuspended = d.status === 'Suspended' || d.safety_status === 'Suspended'
    return d.status === 'Available' && !expired && !isSuspended
  })

  // Selected vehicle object for capacity checks
  const selectedVehicleObj = vehicles.find(v => v.id === parseInt(selectedVehicleId))

  // Capacity calculations
  const weightVal = parseFloat(cargoWeight) || 0
  const capacityExceeded = selectedVehicleObj && weightVal > selectedVehicleObj.max_load_capacity
  const excessWeight = selectedVehicleObj ? Math.max(0, weightVal - selectedVehicleObj.max_load_capacity) : 0

  // Check if dispatcher form is valid
  const isFormValid = source.trim() !== '' && 
                       destination.trim() !== '' && 
                       selectedVehicleId !== '' && 
                       selectedDriverId !== '' && 
                       parseFloat(cargoWeight) > 0 && 
                       parseFloat(plannedDistance) > 0 && 
                       !capacityExceeded

  // Create Trip handler
  async function handleCreateTrip(e) {
    e.preventDefault()
    if (!isFormValid) return
    
    setFormError('')
    setIsSubmitting(true)

    try {
      const finalDistance = distanceUnitLabel === 'mi' ? Math.round(parseFloat(plannedDistance) / 0.621371) : parseFloat(plannedDistance)
      await createTrip({
        source: source.trim(),
        destination: destination.trim(),
        vehicle_id: parseInt(selectedVehicleId),
        driver_id: parseInt(selectedDriverId),
        cargo_weight: parseFloat(cargoWeight),
        planned_distance: finalDistance,
        status: 'Draft' // Default status is Draft
      })
      
      // Clear form
      setSource('Gandhinagar Depot')
      setDestination('Ahmedabad Hub')
      setSelectedVehicleId('')
      setSelectedDriverId('')
      setCargoWeight('')
      setPlannedDistance('')
      
      // Reload lists
      loadData()
    } catch (err) {
      setFormError(err.message || 'Failed to dispatch/create trip.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle direct dispatch of draft trip
  const handleDispatch = async (tripId) => {
    try {
      setIsLoading(true)
      // Transition from Draft to Dispatched
      await updateTripStatus(tripId, 'Dispatched')
      loadData()
    } catch (err) {
      alert(err.message || 'Failed to dispatch trip.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle cancel trip
  const handleCancel = async (tripId) => {
    if (!confirm('Are you sure you want to cancel this trip?')) return
    try {
      setIsLoading(true)
      await updateTripStatus(tripId, 'Cancelled')
      loadData()
    } catch (err) {
      alert(err.message || 'Failed to cancel trip.')
    } finally {
      setIsLoading(false)
    }
  }

  // Complete trip handler
  async function handleCompleteTripSubmit(e) {
    e.preventDefault()
    setCompleteError('')
    setIsCompletingSubmit(true)

    const odoVal = parseFloat(finalOdometer)
    const dbCurrentOdo = completingTrip.vehicle?.odometer || 0
    const currentOdo = distanceUnitLabel === 'mi' ? Math.round(dbCurrentOdo * 0.621371) : dbCurrentOdo

    if (isNaN(odoVal) || odoVal < currentOdo) {
      setIsCompletingSubmit(false)
      return setCompleteError(`Final odometer must be at least ${currentOdo} ${distanceUnitLabel}.`)
    }

    try {
      const dbOdoVal = distanceUnitLabel === 'mi' ? Math.round(odoVal / 0.621371) : odoVal
      await updateTripStatus(completingTrip.id, 'Completed', dbOdoVal)
      setCompletingTrip(null)
      setFinalOdometer('')
      loadData()
    } catch (err) {
      setCompleteError(err.message || 'Failed to complete trip.')
    } finally {
      setIsCompletingSubmit(false)
    }
  }

  // Clear Form fields
  const handleCancelForm = () => {
    setSource('')
    setDestination('')
    setSelectedVehicleId('')
    setSelectedDriverId('')
    setCargoWeight('')
    setPlannedDistance('')
    setFormError('')
  }

  // Filter live board list
  const filteredTrips = trips.filter(t => {
    const term = searchTerm.toLowerCase()
    return t.source.toLowerCase().includes(term) || 
           t.destination.toLowerCase().includes(term) ||
           (t.vehicle && t.vehicle.registration_number.toLowerCase().includes(term)) ||
           (t.driver && t.driver.name.toLowerCase().includes(term)) ||
           `TR00${t.id}`.toLowerCase().includes(term)
  })

  // Style helper for trip status badge
  const renderStatusBadge = (statusValue) => {
    let badgeStyle = 'px-2 py-0.5 rounded text-[10px] font-semibold border inline-block '
    if (statusValue === 'Draft') {
      badgeStyle += 'bg-gray-150 text-gray-500 border-gray-200'
    } else if (statusValue === 'Dispatched') {
      badgeStyle += 'bg-blue-50 text-blue-500 border-blue-200'
    } else if (statusValue === 'Completed') {
      badgeStyle += 'bg-green-50 text-green-500 border-green-200'
    } else if (statusValue === 'Cancelled') {
      badgeStyle += 'bg-red-50 text-red-500 border-red-200'
    }
    return <span className={badgeStyle}>{statusValue}</span>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Form & Lifecycle (approx 5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Trip Lifecycle Visual Flow */}
        <div className="rounded-stamp border border-border bg-surface p-5 space-y-3">
          <h3 className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
            Trip Lifecycle
          </h3>
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="flex flex-col items-center">
              <div className="h-5 w-5 rounded-full bg-[#10B981] flex items-center justify-center text-white text-[10px] font-bold">1</div>
              <span className="text-[10px] font-semibold text-[#10B981] mt-1">Draft</span>
            </div>
            <div className="flex-1 h-0.5 bg-border mx-2 -mt-4" />
            <div className="flex flex-col items-center">
              <div className="h-5 w-5 rounded-full bg-[#3B82F6] flex items-center justify-center text-white text-[10px] font-bold">2</div>
              <span className="text-[10px] font-semibold text-[#3B82F6] mt-1">Dispatched</span>
            </div>
            <div className="flex-1 h-0.5 bg-border mx-2 -mt-4" />
            <div className="flex flex-col items-center">
              <div className="h-5 w-5 rounded-full bg-[#6B7280] flex items-center justify-center text-white text-[10px] font-bold">3</div>
              <span className="text-[10px] font-semibold text-ink-muted mt-1">Completed</span>
            </div>
            <div className="flex-1 h-0.5 bg-border mx-2 -mt-4" />
            <div className="flex flex-col items-center">
              <div className="h-5 w-5 rounded-full bg-[#EF4444] flex items-center justify-center text-white text-[10px] font-bold">4</div>
              <span className="text-[10px] font-semibold text-danger mt-1">Cancelled</span>
            </div>
          </div>
        </div>

        {/* Create Trip Form */}
        <div className="rounded-stamp border border-border bg-surface p-6 space-y-4">
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider pb-2 border-b border-border/60">
            Create Trip
          </h3>

          <form onSubmit={handleCreateTrip} className="space-y-4">
            {formError && (
              <p className="stamp border-danger px-2.5 py-1 text-xs text-danger bg-danger/5">{formError}</p>
            )}

            <div>
              <label htmlFor="source" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                Source
              </label>
              <input
                id="source"
                type="text"
                required
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full rounded-stamp border border-border bg-paper px-3 py-2 text-xs text-ink outline-none focus:border-accent"
              />
            </div>

            <div>
              <label htmlFor="destination" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                Destination
              </label>
              <input
                id="destination"
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full rounded-stamp border border-border bg-paper px-3 py-2 text-xs text-ink outline-none focus:border-accent"
              />
            </div>

            <div>
              <label htmlFor="vehicle" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                Vehicle (Available Only)
              </label>
              <select
                id="vehicle"
                required
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full rounded-stamp border border-border bg-paper px-2 py-2 text-xs text-ink outline-none focus:border-accent"
              >
                <option value="">Select a vehicle...</option>
                {availableVehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.model} ({v.registration_number}) - Cap: {v.max_load_capacity} kg
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="driver" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                Driver (Available Only)
              </label>
              <select
                id="driver"
                required
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full rounded-stamp border border-border bg-paper px-2 py-2 text-xs text-ink outline-none focus:border-accent"
              >
                <option value="">Select a driver...</option>
                {availableDrivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} (License: {d.license_category})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cargoWeight" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                  Cargo Weight (KG)
                </label>
                <input
                  id="cargoWeight"
                  type="number"
                  required
                  placeholder="e.g. 500"
                  value={cargoWeight}
                  onChange={(e) => setCargoWeight(e.target.value)}
                  className="w-full rounded-stamp border border-border bg-paper px-3 py-2 text-xs text-ink outline-none focus:border-accent font-mono"
                />
              </div>
              <div>
                <label htmlFor="distance" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                  Planned Distance ({distanceUnitLabel === 'mi' ? 'Miles' : 'KM'})
                </label>
                <input
                  id="distance"
                  type="number"
                  required
                  placeholder="e.g. 150"
                  value={plannedDistance}
                  onChange={(e) => setPlannedDistance(e.target.value)}
                  className="w-full rounded-stamp border border-border bg-paper px-3 py-2 text-xs text-ink outline-none focus:border-accent font-mono"
                />
              </div>
            </div>

            {/* Validation warning block if capacity exceeded */}
            {capacityExceeded && (
              <div className="p-3 border border-[#EF4444] rounded bg-[#EF4444]/5 text-[#EF4444] text-xs font-semibold space-y-1">
                <p>Vehicle Capacity: {selectedVehicleObj.max_load_capacity} kg</p>
                <p>Cargo Weight: {weightVal} kg</p>
                <div className="flex items-center gap-1.5 mt-1 border-t border-[#EF4444]/20 pt-1 text-[11px] uppercase tracking-wide">
                  <AlertTriangle size={12} />
                  <span>Capacity exceeded by {excessWeight} kg → dispatch blocked</span>
                </div>
              </div>
            )}

            {/* Actions Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className={`flex-1 rounded-stamp py-2.5 text-xs font-bold transition-all ${
                  isFormValid 
                    ? 'bg-accent hover:opacity-90 text-white' 
                    : 'bg-border/60 text-ink-muted cursor-not-allowed'
                }`}
              >
                {!isFormValid ? 'Dispatch (disabled)' : 'Dispatch Trip'}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-4 py-2.5 text-xs font-semibold border border-danger text-danger bg-danger/5 hover:bg-danger hover:text-white transition-colors rounded-stamp"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column: Live Board (approx 7 cols) */}
      <div className="lg:col-span-7 rounded-stamp border border-border bg-surface p-6 flex flex-col justify-between min-h-[500px]">
        <div className="space-y-4 flex-1">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
              Live Board
            </h2>
            
            {/* Live Board search */}
            <div className="relative max-w-[200px]">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-ink-muted" />
              <input
                type="text"
                placeholder="Search board..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-stamp border border-border bg-paper pl-7 pr-2 py-1 text-[11px] text-ink outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Cards listing */}
          <div className="space-y-3">
            {isLoading && trips.length === 0 ? (
              <p className="text-center text-xs text-ink-muted py-8 animate-pulse">Loading live board...</p>
            ) : filteredTrips.length === 0 ? (
              <p className="text-center text-xs text-ink-muted py-12 border border-dashed border-border rounded-stamp bg-paper/30">
                No active or dispatched trips on the board.
              </p>
            ) : (
              filteredTrips.map((t) => (
                <div key={t.id} className="p-4 border border-border rounded-stamp bg-paper/50 hover:bg-paper transition-shadow hover:shadow-sm space-y-3">
                  {/* Card Header row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-ink">TR-{t.id.toString().padStart(3, '0')}</span>
                      <span className="text-[10px] text-ink-muted ml-2 bg-border/60 px-1.5 py-0.5 rounded-stamp">
                        {t.vehicle?.registration_number || 'Unassigned'} / {t.driver?.name || 'Unassigned'}
                      </span>
                    </div>
                    {/* Action buttons inside card */}
                    <div className="flex items-center gap-1.5">
                      {t.status === 'Draft' && (
                        <button
                          type="button"
                          onClick={() => handleDispatch(t.id)}
                          className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Play size={8} /> Dispatch
                        </button>
                      )}
                      {t.status === 'Dispatched' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setCompleteError('')
                              setFinalOdometer(t.vehicle?.odometer?.toString() || '0')
                              setCompletingTrip(t)
                            }}
                            className="bg-[#10B981] hover:bg-[#0D9488] text-white px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancel(t.id)}
                            className="border border-danger text-danger bg-danger/5 hover:bg-danger hover:text-white px-2 py-1 rounded text-[10px] font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {(t.status === 'Completed' || t.status === 'Cancelled') && (
                        <span className="text-[9px] uppercase font-bold tracking-wider text-ink-muted border border-border bg-border/30 px-1.5 py-0.5 rounded">
                          Archived
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Route information */}
                  <div className="flex items-center gap-2 text-xs font-medium text-ink">
                    <span>{t.source}</span>
                    <ArrowRight size={12} className="text-ink-muted" />
                    <span>{t.destination}</span>
                  </div>

                  {/* Details and Badge Row */}
                  <div className="flex items-center justify-between text-[11px] text-ink-muted border-t border-border/30 pt-2">
                    <div className="flex items-center gap-4">
                      <span>{formatDistance(t.planned_distance)}</span>
                      <span>{t.cargo_weight} kg</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.status === 'Dispatched' ? (
                        <span className="text-blue-500 font-semibold">45 min remaining</span>
                      ) : t.status === 'Draft' ? (
                        <span className="text-ink-muted italic">Awaiting driver</span>
                      ) : t.status === 'Cancelled' ? (
                        <span className="text-danger italic font-semibold">Vehicle went to shop</span>
                      ) : (
                        <span className="text-green-500 font-semibold">Completed</span>
                      )}
                      {renderStatusBadge(t.status)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-[10px] text-ink-muted border-t border-border/40 pt-4 mt-6">
          <strong>On Complete:</strong> odometer → fuel log → expenses → Vehicle & Driver Available
        </div>
      </div>

      {/* Complete Trip Odometer Modal */}
      {completingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-stamp border border-border bg-surface p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-base font-semibold text-ink">Complete Trip</h2>
              <button
                type="button"
                onClick={() => setCompletingTrip(null)}
                className="text-ink-muted hover:text-ink"
              >
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleCompleteTripSubmit} className="mt-4 space-y-4">
              {completeError && (
                <p className="stamp border-danger px-2 py-1 text-xs text-danger">{completeError}</p>
              )}

              <div>
                <p className="text-xs text-ink-muted mb-2">
                  Trip: <strong className="text-ink">{completingTrip.source} → {completingTrip.destination}</strong>
                </p>
                <p className="text-xs text-ink-muted mb-4">
                  Starting Odometer: <strong className="text-ink font-mono">{formatDistance(completingTrip.vehicle?.odometer || 0)}</strong>
                </p>
              </div>

              <div>
                <label htmlFor="finalOdo" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                  Final Odometer reading ({distanceUnitLabel})
                </label>
                <input
                  id="finalOdo"
                  type="number"
                  required
                  min={distanceUnitLabel === 'mi' ? Math.round((completingTrip.vehicle?.odometer || 0) * 0.621371) : (completingTrip.vehicle?.odometer || 0)}
                  value={finalOdometer}
                  onChange={(e) => setFinalOdometer(e.target.value)}
                  className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                  placeholder="e.g. 12050"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setCompletingTrip(null)}
                  className="rounded-stamp border border-border bg-paper px-3 py-2 text-xs font-medium text-ink hover:bg-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCompletingSubmit}
                  className="rounded-stamp bg-accent px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 font-semibold"
                >
                  {isCompletingSubmit ? 'Saving...' : 'Submit & Complete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
