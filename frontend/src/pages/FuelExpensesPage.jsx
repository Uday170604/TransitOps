import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { getVehicles } from '../lib/api.js'

export default function FuelExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true)
  const [error, setError] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Form Fields
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [type, setType] = useState('Fuel')
  const [detail, setDetail] = useState('')
  const [cost, setCost] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    // Load expenses from localStorage
    const saved = localStorage.getItem('transitops_expenses')
    if (saved) {
      try {
        setExpenses(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse saved expenses:', e)
      }
    }

    // Load vehicles for the selection dropdown
    async function loadVehicles() {
      try {
        setIsLoadingVehicles(true)
        const data = await getVehicles()
        setVehicles(data || [])
      } catch (err) {
        setError(err.message || 'Failed to load vehicles list.')
      } finally {
        setIsLoadingVehicles(false)
      }
    }
    loadVehicles()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    if (!selectedVehicleId) return setFormError('Vehicle is required.')
    if (!detail.trim()) return setFormError('Detail is required.')
    if (!date) return setFormError('Date is required.')

    const costVal = parseFloat(cost)
    if (isNaN(costVal) || costVal <= 0) {
      setIsSubmitting(false)
      return setFormError('Cost must be greater than 0.')
    }

    const vehicleObj = vehicles.find((v) => v.id === parseInt(selectedVehicleId))
    if (!vehicleObj) {
      setIsSubmitting(false)
      return setFormError('Selected vehicle is invalid.')
    }

    const newExpense = {
      id: Date.now().toString(),
      date,
      vehicle_id: vehicleObj.id,
      vehicle_reg: vehicleObj.registration_number,
      vehicle_model: vehicleObj.model,
      type,
      detail: detail.trim(),
      cost: costVal,
    }

    const updated = [newExpense, ...expenses]
    localStorage.setItem('transitops_expenses', JSON.stringify(updated))
    setExpenses(updated)

    // Reset Form
    setSelectedVehicleId('')
    setType('Fuel')
    setDetail('')
    setCost('')
    setDate(new Date().toISOString().split('T')[0])
    setIsModalOpen(false)
    setIsSubmitting(false)
  }

  function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this log?')) return
    const updated = expenses.filter((exp) => exp.id !== id)
    localStorage.setItem('transitops_expenses', JSON.stringify(updated))
    setExpenses(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Fuel logs and other operational expenses. Expenses are persisted locally.
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

      <div className="overflow-x-auto rounded-stamp border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Detail</th>
              <th className="px-4 py-3 text-right font-medium">Cost</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-ink-muted text-sm">
                  No expenses logged yet. Click "Log expense" to add one.
                </td>
              </tr>
            ) : (
              expenses.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{l.date}</td>
                  <td className="px-4 py-3 text-ink">
                    <span className="font-medium">{l.vehicle_model}</span>
                    <span className="ml-1.5 font-mono text-[10px] text-ink-muted">({l.vehicle_reg})</span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{l.type}</td>
                  <td className="px-4 py-3 text-ink-muted">{l.detail}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-ink font-semibold">
                    ₹{l.cost.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(l.id)}
                      className="text-xs text-danger font-medium hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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

              {isLoadingVehicles ? (
                <p className="text-xs text-ink-muted animate-pulse">Loading vehicles list...</p>
              ) : error ? (
                <p className="text-xs text-danger">{error}</p>
              ) : (
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
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="exp-type" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Expense Type
                  </label>
                  <select
                    id="exp-type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
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

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label htmlFor="exp-detail" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Detail / Notes
                  </label>
                  <input
                    id="exp-detail"
                    type="text"
                    required
                    placeholder={type === 'Fuel' ? 'e.g. 45 Liters' : 'e.g. NH-48 Plaza'}
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label htmlFor="exp-cost" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Cost (₹)
                  </label>
                  <input
                    id="exp-cost"
                    type="number"
                    required
                    min="1"
                    placeholder="2500"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
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
                  disabled={isSubmitting || isLoadingVehicles}
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
