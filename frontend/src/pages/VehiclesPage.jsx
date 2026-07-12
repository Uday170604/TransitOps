import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import StatusBadge from '../components/layout/StatusBadge.jsx'
import { getVehicles, createVehicle } from '../lib/api.js'

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Form fields
  const [regNum, setRegNum] = useState('')
  const [model, setModel] = useState('')
  const [type, setType] = useState('Van')
  const [maxLoad, setMaxLoad] = useState('')
  const [odometer, setOdometer] = useState('0')
  const [acqCost, setAcqCost] = useState('')
  const [status, setStatus] = useState('Available')
  const [region, setRegion] = useState('')

  async function loadVehicles() {
    try {
      setIsLoading(true)
      const data = await getVehicles()
      setVehicles(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load vehicles.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVehicles()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    // Validations
    if (!regNum.trim()) return setFormError('Registration number is required.')
    if (!model.trim()) return setFormError('Model is required.')
    if (parseFloat(maxLoad) <= 0 || isNaN(parseFloat(maxLoad))) {
      setIsSubmitting(false)
      return setFormError('Maximum load capacity must be greater than 0.')
    }
    if (parseFloat(odometer) < 0 || isNaN(parseFloat(odometer))) {
      setIsSubmitting(false)
      return setFormError('Odometer must be 0 or greater.')
    }
    if (parseFloat(acqCost) <= 0 || isNaN(parseFloat(acqCost))) {
      setIsSubmitting(false)
      return setFormError('Acquisition cost must be greater than 0.')
    }

    try {
      await createVehicle({
        registration_number: regNum.trim(),
        model: model.trim(),
        type,
        max_load_capacity: parseFloat(maxLoad),
        odometer: parseFloat(odometer),
        acquisition_cost: parseFloat(acqCost),
        status,
        region: region.trim() || null,
      })
      // Reset form
      setRegNum('')
      setModel('')
      setType('Van')
      setMaxLoad('')
      setOdometer('0')
      setAcqCost('')
      setStatus('Available')
      setRegion('')
      setIsModalOpen(false)
      loadVehicles()
    } catch (err) {
      setFormError(err.message || 'Failed to register vehicle.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Master list of registered vehicles. Registration number is unique.
        </p>
        <button
          type="button"
          onClick={() => {
            setFormError('')
            setIsModalOpen(true)
          }}
          className="flex items-center gap-1.5 rounded-stamp bg-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={14} /> Register vehicle
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-ink-muted animate-pulse">Loading vehicles...</p>
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
                <th className="px-4 py-3 font-medium">Registration No.</th>
                <th className="px-4 py-3 font-medium">Name / Model</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Max Load</th>
                <th className="px-4 py-3 font-medium">Region</th>
                <th className="px-4 py-3 font-medium">Odometer</th>
                <th className="px-4 py-3 font-medium">Acquisition Cost</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-ink-muted text-sm">
                    No vehicles registered. Click "Register vehicle" to add one.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.id || v.registration_number} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-ink">{v.registration_number}</td>
                    <td className="px-4 py-3 text-ink">{v.model}</td>
                    <td className="px-4 py-3 text-ink-muted">{v.type}</td>
                    <td className="px-4 py-3 text-ink-muted">{v.max_load_capacity} kg</td>
                    <td className="px-4 py-3 text-ink-muted">{v.region || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      {v.odometer.toLocaleString()} km
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      ₹{v.acquisition_cost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={v.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-stamp border border-border bg-surface p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-base font-semibold text-ink">Register Vehicle</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-ink-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {formError && (
                <p className="stamp border-danger px-2 py-1 text-xs text-danger">{formError}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="regNum" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Registration No.
                  </label>
                  <input
                    id="regNum"
                    type="text"
                    required
                    placeholder="e.g. GJ-03-AB-1234"
                    value={regNum}
                    onChange={(e) => setRegNum(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="model" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Model / Name
                  </label>
                  <input
                    id="model"
                    type="text"
                    required
                    placeholder="e.g. Tata Ultra 1918"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="type" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Vehicle Type
                  </label>
                  <select
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  >
                    <option value="Van">Van</option>
                    <option value="Truck">Truck</option>
                    <option value="Mini Van">Mini Van</option>
                    <option value="Heavy Truck">Heavy Truck</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="status" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Initial Status
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="In Shop">In Shop</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="region" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Region / Hub
                  </label>
                  <input
                    id="region"
                    type="text"
                    placeholder="e.g. East"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="maxLoad" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Max Load (kg)
                  </label>
                  <input
                    id="maxLoad"
                    type="number"
                    required
                    min="1"
                    placeholder="500"
                    value={maxLoad}
                    onChange={(e) => setMaxLoad(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="odometer" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Odometer (km)
                  </label>
                  <input
                    id="odometer"
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="acqCost" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Cost (₹)
                  </label>
                  <input
                    id="acqCost"
                    type="number"
                    required
                    min="1"
                    placeholder="450000"
                    value={acqCost}
                    onChange={(e) => setAcqCost(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
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
                  {isSubmitting ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
