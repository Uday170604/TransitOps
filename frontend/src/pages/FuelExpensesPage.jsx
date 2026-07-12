import { useState, useEffect } from 'react'
import { Plus, X, Edit, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  getVehicles,
  getFuelLogs,
  getExpenses,
  createFuelLog,
  updateFuelLog,
  deleteFuelLog,
  createExpense,
  updateExpense,
  deleteExpense
} from '../lib/api.js'

export default function FuelExpensesPage() {
  const { user } = useAuth()
  const isManagerOrDriver = user?.role === 'fleet_manager' || user?.role === 'driver'

  const [expenses, setExpenses] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Search & Sort states
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('date')
  const [sortDirection, setSortDirection] = useState('desc')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
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
        detail: f.description || '',
        liters: f.liters,
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

      const combined = [...mappedFuel, ...mappedOther]
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

  const handleOpenAdd = () => {
    setEditingItem(null)
    setSelectedVehicleId('')
    setType('Fuel')
    setLiters('')
    setCost('')
    setDescription('')
    setDate(new Date().toISOString().split('T')[0])
    setFormError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setSelectedVehicleId(item.vehicle_id.toString())
    setType(item.type)
    setDate(item.date)
    setCost(item.cost.toString())
    setDescription(item.detail || '')
    if (item.type === 'Fuel') {
      setLiters(item.liters.toString())
    } else {
      setLiters('')
    }
    setFormError('')
    setIsModalOpen(true)
  }

  const handleDelete = async (item) => {
    if (!confirm('Are you sure you want to delete this log?')) return
    try {
      if (item.type === 'Fuel') {
        await deleteFuelLog(item.dbId)
      } else {
        await deleteExpense(item.dbId)
      }
      loadData()
    } catch (err) {
      alert(err.message || 'Failed to delete log.')
    }
  }

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

        const payload = {
          vehicle_id: parseInt(selectedVehicleId),
          liters: litersVal,
          cost: costVal,
          date,
          description: description.trim() || null,
        }

        if (editingItem) {
          await updateFuelLog(editingItem.dbId, payload)
        } else {
          await createFuelLog(payload)
        }
      } else {
        if (!description.trim()) {
          setIsSubmitting(false)
          return setFormError('Description / Notes is required.')
        }

        const payload = {
          vehicle_id: parseInt(selectedVehicleId),
          description: description.trim(),
          amount: costVal,
          date,
          category: type.toLowerCase(),
        }

        if (editingItem) {
          await updateExpense(editingItem.dbId, payload)
        } else {
          await createExpense(payload)
        }
      }

      setIsModalOpen(false)
      loadData()
    } catch (err) {
      setFormError(err.message || 'Failed to record log.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getVehicleInfo = (vId) => {
    const v = vehicles.find((vehicle) => vehicle.id === vId)
    return v ? `${v.model} (${v.registration_number})` : `Vehicle #${vId}`
  }

  // Sort & Search execution
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="inline ml-1 text-ink-muted" />
    return sortDirection === 'asc'
      ? <ArrowUp size={12} className="inline ml-1 text-accent" />
      : <ArrowDown size={12} className="inline ml-1 text-accent" />
  }

  const filteredExpenses = expenses.filter((e) => {
    const term = searchTerm.toLowerCase()
    const vehicleText = getVehicleInfo(e.vehicle_id).toLowerCase()
    const detailText = e.detail.toLowerCase()
    const typeText = e.type.toLowerCase()
    return (
      vehicleText.includes(term) ||
      detailText.includes(term) ||
      typeText.includes(term)
    )
  })

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    let valA = a[sortField]
    let valB = b[sortField]

    if (sortField === 'vehicle') {
      valA = getVehicleInfo(a.vehicle_id).toLowerCase()
      valB = getVehicleInfo(b.vehicle_id).toLowerCase()
    } else if (typeof valA === 'string') {
      valA = valA.toLowerCase()
      valB = valB.toLowerCase()
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Search by vehicle, type, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-stamp border border-border bg-surface pl-9 pr-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
          />
        </div>
        {isManagerOrDriver && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 rounded-stamp bg-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 font-semibold"
          >
            <Plus size={14} /> Log expense
          </button>
        )}
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
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-ink-muted select-none">
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('date')}>
                  Date {renderSortIcon('date')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('vehicle')}>
                  Vehicle {renderSortIcon('vehicle')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('type')}>
                  Type {renderSortIcon('type')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('detail')}>
                  Detail / Description {renderSortIcon('detail')}
                </th>
                <th className="px-4 py-3 text-right font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('cost')}>
                  Cost {renderSortIcon('cost')}
                </th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-ink-muted text-sm">
                    No logs found.
                  </td>
                </tr>
              ) : (
                sortedExpenses.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-paper/40">
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{l.date}</td>
                    <td className="px-4 py-3 text-ink font-medium">
                      {getVehicleInfo(l.vehicle_id)}
                    </td>
                    <td className="px-4 py-3 text-ink-muted text-xs">{l.type}</td>
                    <td className="px-4 py-3 text-ink-muted text-xs">
                      {l.type === 'Fuel' ? `${l.liters} L${l.detail ? ` (${l.detail})` : ''}` : l.detail}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-ink font-semibold">
                      ₹{l.cost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isManagerOrDriver && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(l)}
                            title="Edit Log"
                            className="p-1 rounded hover:bg-border text-accent transition-colors"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(l)}
                            title="Delete Log"
                            className="p-1 rounded hover:bg-border text-danger transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Log/Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-stamp border border-border bg-surface p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-base font-semibold text-ink">
                {editingItem ? 'Edit Log Entry' : 'Log Expense'}
              </h2>
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
                    disabled={!!editingItem} // Type cannot be modified after creation
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value)
                      setDescription('')
                      setLiters('')
                      setCost('')
                    }}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent disabled:opacity-75"
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
                  className="rounded-stamp bg-accent px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity font-semibold"
                >
                  {isSubmitting ? 'Logging...' : editingItem ? 'Save Changes' : 'Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
