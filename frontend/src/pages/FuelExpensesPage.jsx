import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { getVehicles, getFuelLogs, getExpenses, createFuelLog, createExpense } from '../lib/api.js'

export default function FuelExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Form Fields
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [type, setType] = useState('Fuel')
  const [liters, setLiters] = useState('')
  const [cost, setCost] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  async function loadData() {
    try {
      setIsLoading(true)
      const [vehiclesData, fuelData, expensesData] = await Promise.all([
        getVehicles(),
        getFuelLogs(),
        getExpenses(),
      ])
      setVehicles(vehiclesData || [])

      const mappedFuel = (fuelData || []).map((f) => ({
        id: `fuel-${f.id}`,
        dbId: f.id,
        date: f.date,
        vehicle_id: f.vehicle_id,
        type: 'Fuel',
        detail: `${f.liters} L${f.description ? ` (${f.description})` : ''}`,
        cost: f.cost,
      }))

      const mappedOther = (expensesData || []).map((e) => ({
        id: `exp-${e.id}`,
        dbId: e.id,
        date: e.date,
        vehicle_id: e.vehicle_id,
        type: e.category === 'toll' ? 'Toll' : 'Other',
        detail: e.description,
        cost: e.amount,
      }))

      const combined = [...mappedFuel, ...mappedOther].sort((a, b) => new Date(b.date) - new Date(a.date))
      setExpenses(combined)
    } catch (err) {
      setError(err.message || 'Failed to load expenses data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    if (!selectedVehicleId) return setFormError('Vehicle is required.')
    if (!date) return setFormError('Date is required.')

    const costVal = parseFloat(cost)
    if (isNaN(costVal) || costVal <= 0) {
      setIsSubmitting(false)
      return setFormError('Cost / Amount must be greater than 0.')
    }

    try {
      if (type === 'Fuel') {
        const litersVal = parseFloat(liters)
        if (isNaN(litersVal) || litersVal <= 0) {
          setIsSubmitting(false)
          return setFormError('Liters must be greater than 0.')
        }
        await createFuelLog({
          vehicle_id: parseInt(selectedVehicleId),
          liters: litersVal,
          cost: costVal,
          date,
          description: description.trim() || null,
        })
      } else {
        if (!description.trim()) {
          setIsSubmitting(false)
          return setFormError('Description / Notes is required.')
        }
        await createExpense({
          vehicle_id: parseInt(selectedVehicleId),
          description: description.trim(),
          amount: costVal,
          date,
          category: type.toLowerCase(),
        })
      }

      // Reset Form
      setSelectedVehicleId('')
      setType('Fuel')
      setLiters('')
      setCost('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
      setIsModalOpen(false)
      loadData()
    } catch (err) {
      setFormError(err.message || 'Failed to record expense.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getVehicleInfo = (vId) => {
    const v = vehicles.find((vehicle) => vehicle.id === vId)
    return v ? `${v.model} (${v.registration_number})` : `Vehicle #${vId}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Fuel logs and other operational expenses. Expenses are recorded to the backend.
        </p>
        <button
          type="button"
          onClick={() => {
            setFormError('')
            setIsModalOpen(true)
          }}
          className="flex items-center gap-1.5 rounded-stamp bg-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={14} /> Log expense
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
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Detail / Description</th>
                <th className="px-4 py-3 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-ink-muted text-sm">
                    No expenses logged yet. Click "Log expense" to add one.
                  </td>
                </tr>
              ) : (
                expenses.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{l.date}</td>
                    <td className="px-4 py-3 text-ink">
                      <span className="font-medium text-xs">{getVehicleInfo(l.vehicle_id)}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted text-xs">{l.type}</td>
                    <td className="px-4 py-3 text-ink-muted text-xs">{l.detail}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-ink font-semibold">
                      ₹{l.cost.toLocaleString()}
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
              <h2 className="font-display text-base font-semibold text-ink">Log Expense</h2>
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

              <div>
                <label htmlFor="exp-vehicle" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                  Select Vehicle
                </label>
                <select
                  id="exp-vehicle"
                  required
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                >
                  <option value="">Choose a vehicle...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.model} ({v.registration_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="exp-type" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Expense Type
                  </label>
                  <select
                    id="exp-type"
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value)
                      setDescription('')
                      setLiters('')
                      setCost('')
                    }}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  >
                    <option value="Fuel">Fuel</option>
                    <option value="Toll">Toll</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="exp-date" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Date
                  </label>
                  <input
                    id="exp-date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1 text-xs text-ink outline-none focus:border-accent font-mono"
                  />
                </div>
              </div>

              {type === 'Fuel' ? (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="fuel-liters" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                      Liters (L)
                    </label>
                    <input
                      id="fuel-liters"
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 45"
                      value={liters}
                      onChange={(e) => setLiters(e.target.value)}
                      className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="fuel-cost" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                      Cost (₹)
                    </label>
                    <input
                      id="fuel-cost"
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 4500"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="fuel-desc" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                      Notes (Optional)
                    </label>
                    <input
                      id="fuel-desc"
                      type="text"
                      placeholder="e.g. HP pump"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label htmlFor="exp-desc" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                      Description / notes
                    </label>
                    <input
                      id="exp-desc"
                      type="text"
                      required
                      placeholder={type === 'Toll' ? 'e.g. NH-48 Plaza' : 'e.g. Tire replacement'}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label htmlFor="exp-cost" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                      Amount (₹)
                    </label>
                    <input
                      id="exp-cost"
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 500"
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
                  {isSubmitting ? 'Logging...' : 'Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
