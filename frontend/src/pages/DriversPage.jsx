import { useState, useEffect } from 'react'
import { Plus, X, AlertTriangle } from 'lucide-react'
import StatusBadge from '../components/layout/StatusBadge.jsx'
import { getDrivers, createDriver } from '../lib/api.js'

export default function DriversPage() {
  const [drivers, setDrivers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
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

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    // Validations
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
      await createDriver({
        name: name.trim(),
        license_number: licenseNumber.trim(),
        license_category: licenseCategory.trim(),
        license_expiry_date: licenseExpiryDate,
        contact_number: contactNumber.trim(),
        safety_score: scoreVal,
        status,
      })
      // Reset form
      setName('')
      setLicenseNumber('')
      setLicenseCategory('LMV')
      setLicenseExpiryDate('')
      setContactNumber('')
      setSafetyScore('100')
      setStatus('Available')
      setIsModalOpen(false)
      loadDrivers()
    } catch (err) {
      setFormError(err.message || 'Failed to add driver.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Driver profiles, license status, and safety scores. Expired licenses are flagged.
        </p>
        <button
          type="button"
          onClick={() => {
            setFormError('')
            setIsModalOpen(true)
          }}
          className="flex items-center gap-1.5 rounded-stamp bg-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={14} /> Add driver
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-ink-muted animate-pulse">Loading drivers...</p>
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
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">License No.</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Expiry</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Safety Score</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-ink-muted text-sm">
                    No drivers registered. Click "Add driver" to add one.
                  </td>
                </tr>
              ) : (
                drivers.map((d) => {
                  const expired = isLicenseExpired(d.license_expiry_date)
                  return (
                    <tr key={d.id || d.license_number} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-ink font-medium">{d.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">{d.license_number}</td>
                      <td className="px-4 py-3 text-ink-muted">{d.license_category}</td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-xs ${expired ? 'text-danger font-semibold flex items-center gap-1' : 'text-ink-muted'}`}>
                          {expired && <AlertTriangle size={12} />}
                          {d.license_expiry_date}
                          {expired && ' (EXPIRED)'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">{d.contact_number}</td>
                      <td className="px-4 py-3 text-ink-muted font-mono">{d.safety_score}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={expired ? 'Suspended' : d.status} />
                      </td>
                    </tr>
                  )
                })
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
              <h2 className="font-display text-base font-semibold text-ink">Add Driver</h2>
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
                    placeholder="e.g. +91 98765 43210"
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
                    <option value="LMV">LMV (Light Motor Vehicle)</option>
                    <option value="HMV">HMV (Heavy Motor Vehicle)</option>
                    <option value="Class A CDL">Class A CDL</option>
                    <option value="Class B">Class B</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label htmlFor="expiry" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    License Expiry Date
                  </label>
                  <input
                    id="expiry"
                    type="date"
                    required
                    value={licenseExpiryDate}
                    onChange={(e) => setLicenseExpiryDate(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1 text-xs text-ink outline-none focus:border-accent font-mono"
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
              </div>

              <div>
                <label htmlFor="status" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                  Driver Status
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
                  {isSubmitting ? 'Adding...' : 'Add Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
