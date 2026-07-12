import { useState, useEffect } from 'react'
import { Plus, X, Wrench } from 'lucide-react'
import StatusBadge from '../components/layout/StatusBadge.jsx'
import { getMaintenanceLogs, getVehicles, createMaintenanceLog, closeMaintenanceLog } from '../lib/api.js'

export default function MaintenancePage() {
  const [logs, setLogs] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Form Fields
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState('Active')
  const [endDate, setEndDate] = useState('')
  const [cost, setCost] = useState('')

  // Close Modal State
  const [closingLog, setClosingLog] = useState(null)
  const [closeEndDate, setCloseEndDate] = useState(new Date().toISOString().split('T')[0])
  const [closeCost, setCloseCost] = useState('')
  const [closeError, setCloseError] = useState('')
  const [isClosingSubmit, setIsClosingSubmit] = useState(false)

  async function loadData() {
    try {
      setIsLoading(true)
      const [logsData, vehiclesData] = await Promise.all([
        getMaintenanceLogs(),
        getVehicles(),
      ])
      setLogs(logsData || [])
      setVehicles(vehiclesData || [])
    } catch (err) {
      setError(err.message || 'Failed to load maintenance logs.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter vehicles that can enter maintenance (all except Retired)
  const maintenanceAvailableVehicles = vehicles.filter((v) => v.status !== 'Retired')

  // Handle Log Maintenance
  async function handleCreateLog(e) {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    if (!selectedVehicleId) return setFormError('Vehicle selection is required.')
    if (!description.trim()) return setFormError('Description is required.')
    if (!startDate) return setFormError('Start date is required.')

    let payload = {
      vehicle_id: parseInt(selectedVehicleId),
      description: description.trim(),
      start_date: startDate,
      status,
    }

    if (status === 'Closed') {
      if (!endDate) {
        setIsSubmitting(false)
        return setFormError('End date is required for closed logs.')
      }
      const costVal = parseFloat(cost)
      if (isNaN(costVal) || costVal < 0) {
        setIsSubmitting(false)
        return setFormError('Cost must be 0 or greater.')
      }
      payload.end_date = endDate
      payload.cost = costVal
    } else {
      payload.end_date = null
      payload.cost = null
    }

    try {
      await createMaintenanceLog(payload)
      // Reset Form
      setSelectedVehicleId('')
      setDescription('')
      setStartDate(new Date().toISOString().split('T')[0])
      setStatus('Active')
      setEndDate('')
      setCost('')
      setIsModalOpen(false)
      loadData()
    } catch (err) {
      setFormError(err.message || 'Failed to log maintenance record.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Close Maintenance Submission
  async function handleCloseSubmit(e) {
    e.preventDefault()
    setCloseError('')
    setIsClosingSubmit(true)

    if (!closeEndDate) {
      setIsClosingSubmit(false)
      return setCloseError('End date is required.')
    }
    const costVal = parseFloat(closeCost)
    if (isNaN(costVal) || costVal < 0) {
      setIsClosingSubmit(false)
      return setCloseError('Cost must be 0 or greater.')
    }

    try {
      await closeMaintenanceLog(closingLog.id, closeEndDate, costVal)
      setClosingLog(null)
      setCloseCost('')
      loadData()
    } catch (err) {
      setCloseError(err.message || 'Failed to close maintenance log.')
    } finally {
      setIsClosingSubmit(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Active logs switch the vehicle status to <span className="font-medium text-ink">In Shop</span>. Closing them restores it to Available.
        </p>
        <button
          type="button"
          onClick={() => {
            setFormError('')
            setIsModalOpen(true)
          }}
          className="flex items-center gap-1.5 rounded-stamp bg-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={14} /> Log maintenance
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-ink-muted animate-pulse">Loading logs...</p>
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
                <th className="px-4 py-3 font-medium">Record ID</th>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Work / Description</th>
                <th className="px-4 py-3 font-medium">Opened</th>
                <th className="px-4 py-3 font-medium">Closed</th>
                <th className="px-4 py-3 font-medium">Cost</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-ink-muted text-sm">
                    No maintenance records logged. Click "Log maintenance" to add one.
                  </td>
                </tr>
              ) : (
                logs.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-ink font-semibold">MNT-{r.id}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-ink font-medium">{r.vehicle?.model || 'Unknown'}</p>
                      <p className="font-mono text-[10px] text-ink-muted">{r.vehicle?.registration_number}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-muted text-xs">{r.description}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{r.start_date}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{r.end_date || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      {r.cost !== null ? `₹${r.cost.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status === 'Active' ? 'In Shop' : 'Available'} label={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'Active' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCloseError('')
                            setCloseEndDate(new Date().toISOString().split('T')[0])
                            setClosingLog(r)
                          }}
                          className="inline-flex items-center gap-1 rounded-stamp bg-accent px-2.5 py-1 text-[10px] font-medium text-white transition-opacity hover:opacity-95"
                        >
                          <Wrench size={10} /> Close
                        </button>
                      ) : (
                        <span className="text-[10px] text-ink-muted font-mono uppercase">Closed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Maintenance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-stamp border border-border bg-surface p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-base font-semibold text-ink">Log Maintenance</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-ink-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLog} className="mt-4 space-y-4">
              {formError && (
                <p className="stamp border-danger px-2 py-1 text-xs text-danger">{formError}</p>
              )}

              <div>
                <label htmlFor="m-vehicle" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                  Vehicle in Maintenance
                </label>
                <select
                  id="m-vehicle"
                  required
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                >
                  <option value="">Select a vehicle...</option>
                  {maintenanceAvailableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.model} ({v.registration_number}) - Status: {v.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="m-desc" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                  Work / Description
                </label>
                <textarea
                  id="m-desc"
                  required
                  rows="2"
                  placeholder="e.g. Engine Oil and Filter change, Brake shoes replacement"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="m-start" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Start Date
                  </label>
                  <input
                    id="m-start"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1 text-xs text-ink outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="m-status" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Record Status
                  </label>
                  <select
                    id="m-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  >
                    <option value="Active">Active (In Shop)</option>
                    <option value="Closed">Closed (Resolved)</option>
                  </select>
                </div>
              </div>

              {status === 'Closed' && (
                <div className="grid grid-cols-2 gap-3 border-t border-dashed border-border pt-3">
                  <div>
                    <label htmlFor="m-end" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                      End Date
                    </label>
                    <input
                      id="m-end"
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-stamp border border-border bg-paper px-2 py-1 text-xs text-ink outline-none focus:border-accent font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="m-cost" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                      Cost (₹)
                    </label>
                    <input
                      id="m-cost"
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 2500"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                    />
                  </div>
                </div>
              )}

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
                  {isSubmitting ? 'Logging...' : 'Log Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Maintenance Modal */}
      {closingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-stamp border border-border bg-surface p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-base font-semibold text-ink">Close Maintenance</h2>
              <button
                type="button"
                onClick={() => setClosingLog(null)}
                className="text-ink-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCloseSubmit} className="mt-4 space-y-4">
              {closeError && (
                <p className="stamp border-danger px-2 py-1 text-xs text-danger">{closeError}</p>
              )}

              <div>
                <p className="text-xs text-ink-muted mb-2">
                  Resolving maintenance record for <span className="font-medium text-ink">{closingLog.vehicle?.model}</span> ({closingLog.vehicle?.registration_number}).
                </p>
                <p className="text-xs text-ink-muted mb-4">
                  Work: <span className="font-mono text-xs">{closingLog.description}</span>
                </p>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label htmlFor="c-end" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                      End Date
                    </label>
                    <input
                      id="c-end"
                      type="date"
                      required
                      value={closeEndDate}
                      onChange={(e) => setCloseEndDate(e.target.value)}
                      className="w-full rounded-stamp border border-border bg-paper px-2 py-1 text-xs text-ink outline-none focus:border-accent font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="c-cost" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                      Maintenance Cost (₹)
                    </label>
                    <input
                      id="c-cost"
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 5000"
                      value={closeCost}
                      onChange={(e) => setCloseCost(e.target.value)}
                      className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setClosingLog(null)}
                  className="rounded-stamp border border-border bg-paper px-3 py-2 text-xs font-medium text-ink hover:bg-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isClosingSubmit}
                  className="rounded-stamp bg-accent px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isClosingSubmit ? 'Closing Log...' : 'Close Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
