import { useState, useEffect } from 'react'
import { Plus, X, AlertTriangle, Edit, Trash2, Mail, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import StatusBadge from '../components/layout/StatusBadge.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  sendExpiryReminders,
  getExpiryReminders
} from '../lib/api.js'

export default function DriversPage() {
  const { user } = useAuth()
  const isSafetyOrManager = user?.role === 'fleet_manager' || user?.role === 'safety_officer'

  const [drivers, setDrivers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Search & Sort states
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')

  // Selected driver for toggle status
  const [selectedDriverId, setSelectedDriverId] = useState(null)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseCategory, setLicenseCategory] = useState('LMV')
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [safetyScore, setSafetyScore] = useState('100')
  const [status, setStatus] = useState('Available')
  const [email, setEmail] = useState('')
  const [tripCompletionRate, setTripCompletionRate] = useState('90')
  const [safetyStatus, setSafetyStatus] = useState('Available')

  // Outbox states
  const [isOutboxOpen, setIsOutboxOpen] = useState(false)
  const [remindersList, setRemindersList] = useState([])
  const [outboxLoading, setOutboxLoading] = useState(false)
  const [scanMessage, setScanMessage] = useState('')

  async function loadDrivers() {
    try {
      setIsLoading(true)
      const data = await getDrivers()
      setDrivers(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load drivers.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDrivers()
  }, [])

  function isLicenseExpired(expiryDate) {
    if (!expiryDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(expiryDate) < today
  }

  function formatExpiryDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${month}/${year}`
  }

  // Open add modal
  const handleOpenAdd = () => {
    setEditingDriver(null)
    setName('')
    setLicenseNumber('')
    setLicenseCategory('LMV')
    setLicenseExpiryDate('')
    setContactNumber('')
    setSafetyScore('100')
    setStatus('Available')
    setEmail('')
    setTripCompletionRate('90')
    setSafetyStatus('Available')
    setFormError('')
    setIsModalOpen(true)
  }

  // Open edit modal
  const handleOpenEdit = (d, e) => {
    e.stopPropagation() // Prevent row selection
    setEditingDriver(d)
    setName(d.name)
    setLicenseNumber(d.license_number)
    setLicenseCategory(d.license_category)
    setLicenseExpiryDate(d.license_expiry_date)
    setContactNumber(d.contact_number)
    setSafetyScore(d.safety_score?.toString() || '100')
    setStatus(d.status)
    setEmail(d.email || '')
    setTripCompletionRate(d.trip_completion_rate?.toString() || '90')
    setSafetyStatus(d.safety_status || 'Available')
    setFormError('')
    setIsModalOpen(true)
  }

  // Handle delete
  const handleDelete = async (id, name, e) => {
    e.stopPropagation() // Prevent row selection
    if (!confirm(`Are you sure you want to delete driver profile for ${name}?`)) return
    try {
      await deleteDriver(id)
      if (selectedDriverId === id) setSelectedDriverId(null)
      loadDrivers()
    } catch (err) {
      alert(err.message || 'Failed to delete driver.')
    }
  }

  // Toggle status at the bottom
  const handleToggleStatus = async (newStatus) => {
    if (!selectedDriverId) return
    const driver = drivers.find(d => d.id === selectedDriverId)
    if (!driver) return

    // Map safety_status logically or set it directly
    let newSafety = driver.safety_status
    if (newStatus === 'Available') newSafety = 'Available'
    if (newStatus === 'On Trip') newSafety = 'On Trip'
    if (newStatus === 'Suspended') newSafety = 'Suspended'
    if (newStatus === 'Off Duty') newSafety = 'Available' // remains Available safety wise

    try {
      setIsLoading(true)
      await updateDriver(driver.id, {
        status: newStatus,
        safety_status: newSafety
      })
      await loadDrivers()
    } catch (err) {
      alert(err.message || 'Failed to update driver status.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    if (!name.trim()) return setFormError('Name is required.')
    if (!licenseNumber.trim()) return setFormError('License number is required.')
    if (!licenseCategory.trim()) return setFormError('License category is required.')
    if (!licenseExpiryDate) return setFormError('License expiry date is required.')
    if (!contactNumber.trim()) return setFormError('Contact number is required.')
    
    const scoreVal = parseFloat(safetyScore)
    if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > 100) {
      setIsSubmitting(false)
      return setFormError('Safety score must be between 0 and 100.')
    }

    try {
      const payload = {
        name: name.trim(),
        license_number: licenseNumber.trim(),
        license_category: licenseCategory.trim(),
        license_expiry_date: licenseExpiryDate,
        contact_number: contactNumber.trim(),
        safety_score: scoreVal,
        status,
        email: email.trim() || null,
        trip_completion_rate: parseFloat(tripCompletionRate) || 90,
        safety_status: safetyStatus
      }

      if (editingDriver) {
        await updateDriver(editingDriver.id, payload)
      } else {
        await createDriver(payload)
      }

      setIsModalOpen(false)
      loadDrivers()
    } catch (err) {
      setFormError(err.message || 'Failed to save driver profile.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reminders Outbox trigger & retrieval
  const handleOpenOutbox = () => {
    setIsOutboxOpen(true)
    setScanMessage('')
    loadReminders()
  }

  const loadReminders = async () => {
    setOutboxLoading(true)
    try {
      const data = await getExpiryReminders()
      setRemindersList(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setOutboxLoading(false)
    }
  }

  const handleTriggerReminders = async () => {
    setOutboxLoading(true)
    setScanMessage('')
    try {
      const res = await sendExpiryReminders()
      setScanMessage(res.message || 'Scan completed.')
      await loadReminders()
    } catch (err) {
      setScanMessage(`Scan failed: ${err.message}`)
    } finally {
      setOutboxLoading(false)
    }
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

  const filteredDrivers = drivers.filter((d) => {
    const term = searchTerm.toLowerCase()
    return (
      d.name.toLowerCase().includes(term) ||
      d.license_number.toLowerCase().includes(term) ||
      (d.email && d.email.toLowerCase().includes(term))
    )
  })

  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
    let valA = a[sortField]
    let valB = b[sortField]

    if (typeof valA === 'string') {
      valA = valA.toLowerCase()
      valB = valB.toLowerCase()
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // Function to render status badge with custom color styling to match screenshot
  const renderStatusBadge = (statusValue) => {
    let badgeClass = ''
    if (statusValue === 'Available') {
      badgeClass = 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/20 px-2 py-0.5 rounded text-[11px] font-semibold inline-block'
    } else if (statusValue === 'On Trip') {
      badgeClass = 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/20 px-2 py-0.5 rounded text-[11px] font-semibold inline-block'
    } else if (statusValue === 'Off Duty') {
      badgeClass = 'bg-[#6B7280]/15 text-[#6B7280] border border-[#6B7280]/20 px-2 py-0.5 rounded text-[11px] font-semibold inline-block'
    } else if (statusValue === 'Suspended') {
      badgeClass = 'bg-[#F97316]/15 text-[#F97316] border border-[#F97316]/20 px-2 py-0.5 rounded text-[11px] font-semibold inline-block'
    }
    return <span className={badgeClass}>{statusValue}</span>
  }

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Search drivers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-stamp border border-border bg-surface pl-9 pr-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-center gap-2 self-end">
          <button
            type="button"
            onClick={handleOpenOutbox}
            className="flex items-center gap-1.5 rounded-stamp border border-border bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-paper"
          >
            <Mail size={14} /> Reminders Outbox
          </button>
          {isSafetyOrManager && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 rounded-stamp bg-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 font-semibold"
            >
              <Plus size={14} /> Add Driver
            </button>
          )}
        </div>
      </div>

      {/* Drivers List Table */}
      {isLoading && drivers.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-ink-muted animate-pulse">Loading drivers...</p>
        </div>
      ) : error ? (
        <div className="rounded-stamp border border-danger bg-surface p-4 text-danger text-sm">
          {error}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-stamp border border-border bg-surface shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 text-[10px] uppercase tracking-wide text-ink-muted select-none font-semibold">
                <th className="px-4 py-3 cursor-pointer hover:text-ink" onClick={() => toggleSort('name')}>
                  Driver {renderSortIcon('name')}
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-ink" onClick={() => toggleSort('license_number')}>
                  License No {renderSortIcon('license_number')}
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-ink" onClick={() => toggleSort('license_category')}>
                  Category {renderSortIcon('license_category')}
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-ink" onClick={() => toggleSort('license_expiry_date')}>
                  Expiry {renderSortIcon('license_expiry_date')}
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-ink" onClick={() => toggleSort('contact_number')}>
                  Contact {renderSortIcon('contact_number')}
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-ink" onClick={() => toggleSort('trip_completion_rate')}>
                  Trip Compl. {renderSortIcon('trip_completion_rate')}
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-ink" onClick={() => toggleSort('safety_status')}>
                  Safety {renderSortIcon('safety_status')}
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-ink" onClick={() => toggleSort('status')}>
                  Status {renderSortIcon('status')}
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedDrivers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-ink-muted text-sm">
                    No drivers registered.
                  </td>
                </tr>
              ) : (
                sortedDrivers.map((d) => {
                  const expired = isLicenseExpired(d.license_expiry_date)
                  const isSelected = selectedDriverId === d.id
                  return (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedDriverId(isSelected ? null : d.id)}
                      className={`border-b border-border/50 last:border-0 hover:bg-paper/30 cursor-pointer transition-colors ${
                        isSelected ? 'bg-accent/5 border-l-2 border-l-accent' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-ink font-medium">
                        <div>
                          <p className="text-xs font-semibold text-ink">{d.name}</p>
                          {d.email && <p className="font-mono text-[9px] text-ink-muted">{d.email}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-ink-muted">{d.license_number}</td>
                      <td className="px-4 py-3 text-ink">{d.license_category}</td>
                      <td className="px-4 py-3">
                        <span className={`font-mono ${expired ? 'text-orange-500 font-semibold' : 'text-ink-muted'}`}>
                          {formatExpiryDate(d.license_expiry_date)}
                          {expired && ' EXPIRED'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-ink-muted">{d.contact_number}</td>
                      <td className="px-4 py-3 font-mono text-ink">{d.trip_completion_rate || 90}%</td>
                      <td className="px-4 py-3">
                        {renderStatusBadge(expired ? 'Suspended' : (d.safety_status || 'Available'))}
                      </td>
                      <td className="px-4 py-3">
                        {renderStatusBadge(expired ? 'Suspended' : d.status)}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {isSafetyOrManager && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleOpenEdit(d, e)}
                              title="Edit Profile"
                              className="p-1 rounded hover:bg-border text-accent transition-colors"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(d.id, d.name, e)}
                              title="Delete Profile"
                              className="p-1 rounded hover:bg-border text-danger transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Toggle Status Bar & Safety Rules */}
      <div className="p-4 border border-border rounded-stamp bg-surface space-y-4">
        <h3 className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
          Toggle Status {selectedDriverId ? '(Selected Driver)' : '(Select a driver row from the table above)'}
        </h3>
        <div className="flex flex-wrap gap-2.5 items-center">
          <button
            type="button"
            disabled={!selectedDriverId || isLoading}
            onClick={() => handleToggleStatus('Available')}
            className={`px-4 py-2 text-xs font-semibold rounded transition-colors ${
              selectedDriverId 
                ? 'bg-[#10B981] hover:bg-[#0D9488] text-white' 
                : 'bg-border/60 text-ink-muted/50 cursor-not-allowed'
            }`}
          >
            Available
          </button>
          <button
            type="button"
            disabled={!selectedDriverId || isLoading}
            onClick={() => handleToggleStatus('On Trip')}
            className={`px-4 py-2 text-xs font-semibold rounded transition-colors ${
              selectedDriverId 
                ? 'bg-[#3B82F6] hover:bg-[#2563EB] text-white' 
                : 'bg-border/60 text-ink-muted/50 cursor-not-allowed'
            }`}
          >
            On Trip
          </button>
          <button
            type="button"
            disabled={!selectedDriverId || isLoading}
            onClick={() => handleToggleStatus('Off Duty')}
            className={`px-4 py-2 text-xs font-semibold rounded transition-colors ${
              selectedDriverId 
                ? 'bg-[#6B7280] hover:bg-[#4B5563] text-white' 
                : 'bg-border/60 text-ink-muted/50 cursor-not-allowed'
            }`}
          >
            Off Duty
          </button>
          <button
            type="button"
            disabled={!selectedDriverId || isLoading}
            onClick={() => handleToggleStatus('Suspended')}
            className={`px-4 py-2 text-xs font-semibold rounded transition-colors ${
              selectedDriverId 
                ? 'bg-[#F97316] hover:bg-[#EA580C] text-white' 
                : 'bg-border/60 text-ink-muted/50 cursor-not-allowed'
            }`}
          >
            Suspended
          </button>
        </div>
        <p className="text-xs font-semibold text-orange-500 font-mono">
          Rule: Expired license or Suspended status → blocked from trip assignment
        </p>
      </div>

      {/* Add / Edit Driver Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-stamp border border-border bg-surface p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-base font-semibold text-ink">
                {editingDriver ? 'Edit Driver' : 'Add Driver'}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="name" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Driver Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label htmlFor="contact" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Contact Number
                  </label>
                  <input
                    id="contact"
                    type="text"
                    required
                    placeholder="e.g. 98765xxxxx"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="licNum" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    License No.
                  </label>
                  <input
                    id="licNum"
                    type="text"
                    required
                    placeholder="e.g. DL-12345"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="category" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Category
                  </label>
                  <select
                    id="category"
                    value={licenseCategory}
                    onChange={(e) => setLicenseCategory(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  >
                    <option value="LMV">LMV</option>
                    <option value="HMV">HMV</option>
                    <option value="Class A CDL">Class A CDL</option>
                    <option value="Class B">Class B</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="expiry" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Expiry Date
                  </label>
                  <input
                    id="expiry"
                    type="date"
                    required
                    value={licenseExpiryDate}
                    onChange={(e) => setLicenseExpiryDate(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="safety" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Safety Score
                  </label>
                  <input
                    id="safety"
                    type="number"
                    required
                    min="0"
                    max="100"
                    placeholder="100"
                    value={safetyScore}
                    onChange={(e) => setSafetyScore(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="completion" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Trip Compl. (%)
                  </label>
                  <input
                    id="completion"
                    type="number"
                    required
                    min="0"
                    max="100"
                    placeholder="90"
                    value={tripCompletionRate}
                    onChange={(e) => setTripCompletionRate(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="status" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Status
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="safetyStatus" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Safety Status
                  </label>
                  <select
                    id="safetyStatus"
                    value={safetyStatus}
                    onChange={(e) => setSafetyStatus(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="email" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Email (Optional)
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@transitops.dev"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                  className="rounded-stamp bg-accent px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity font-semibold"
                >
                  {isSubmitting ? 'Saving...' : editingDriver ? 'Save Changes' : 'Add Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reminders Outbox Modal */}
      {isOutboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-stamp border border-border bg-surface p-6 shadow-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="font-display text-base font-semibold text-ink">Simulated Reminders Outbox</h2>
                <p className="text-[10px] text-ink-muted mt-0.5">Visually verify emails dispatched for expiring driving licenses.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOutboxOpen(false)}
                className="text-ink-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            {scanMessage && (
              <p className="mt-3 text-xs bg-paper border border-accent/20 px-3 py-2 rounded-stamp text-accent font-medium">{scanMessage}</p>
            )}

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-ink-muted font-mono">{remindersList.length} total warnings logged</span>
              {isSafetyOrManager && (
                <button
                  type="button"
                  disabled={outboxLoading}
                  onClick={handleTriggerReminders}
                  className="rounded-stamp bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                >
                  {outboxLoading ? 'Scanning...' : 'Trigger Expiry Scan'}
                </button>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {remindersList.length === 0 ? (
                <p className="text-xs text-ink-muted py-8 text-center border border-dashed border-border rounded-stamp bg-paper/30">
                  Outbox is empty. Trigger an expiry scan to send simulated reminders.
                </p>
              ) : (
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                  {remindersList.map((rem, idx) => (
                    <div key={idx} className="p-3 border border-border rounded-stamp bg-paper text-xs space-y-1">
                      <div className="flex items-center justify-between border-b border-border/60 pb-1.5 mb-1.5">
                        <span className="font-semibold text-ink">To: {rem.driver_name} &lt;{rem.email}&gt;</span>
                        <span className="font-mono text-[10px] text-ink-muted bg-border px-1.5 py-0.5 rounded-stamp">License Warning</span>
                      </div>
                      <p className="text-[10px] text-ink-muted font-mono"><strong className="text-ink">Subject:</strong> {rem.subject}</p>
                      <div className="mt-2 bg-surface/50 p-2 rounded-stamp border border-border/40 font-mono text-[10px] text-ink whitespace-pre-wrap">
                        {rem.body}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
