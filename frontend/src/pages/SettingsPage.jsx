import { useState, useEffect } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function SettingsPage() {
  const { user } = useAuth()
  const [depotName, setDepotName] = useState('Gandhinagar Depot GJ4')
  const [currency, setCurrency] = useState('INR (Rs)')
  const [distanceUnit, setDistanceUnit] = useState('Kilometers')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Load settings on mount (with localStorage fallback)
  useEffect(() => {
    const savedDepot = localStorage.getItem('transitops_depot_name')
    const savedCurrency = localStorage.getItem('transitops_currency')
    const savedUnit = localStorage.getItem('transitops_distance_unit')
    
    if (savedDepot) setDepotName(savedDepot)
    if (savedCurrency) setCurrency(savedCurrency)
    if (savedUnit) setDistanceUnit(savedUnit)

    // Also fetch from API in background if available
    async function fetchSettings() {
      try {
        const token = localStorage.getItem('transitops_token')
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
        const response = await fetch(`${baseUrl}/api/v1/settings/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        })
        if (response.ok) {
          const res = await response.json()
          if (res.success && res.data) {
            setDepotName(res.data.depot_name)
            setCurrency(res.data.currency)
            setDistanceUnit(res.data.distance_unit)
            // Sync local storage
            localStorage.setItem('transitops_depot_name', res.data.depot_name)
            localStorage.setItem('transitops_currency', res.data.currency)
            localStorage.setItem('transitops_distance_unit', res.data.distance_unit)
          }
        }
      } catch (err) {
        console.warn('Backend settings endpoint not available, using local storage.')
      }
    }
    fetchSettings()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setIsSubmitting(true)
    setSuccessMsg('')
    setErrorMsg('')

    // Save to local storage immediately
    localStorage.setItem('transitops_depot_name', depotName)
    localStorage.setItem('transitops_currency', currency)
    localStorage.setItem('transitops_distance_unit', distanceUnit)

    // Save to backend API
    try {
      const token = localStorage.getItem('transitops_token')
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/api/v1/settings/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          depot_name: depotName,
          currency: currency,
          distance_unit: distanceUnit
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update settings on server.')
      }

      setSuccessMsg('Settings updated successfully!')
    } catch (err) {
      console.warn(err)
      // Since database might not be local or accessible, success is local
      setSuccessMsg('Settings saved locally (Server update pending).')
    } finally {
      setIsSubmitting(false)
    }
  }

  // RBAC permissions table data
  const rbacData = [
    { role: 'Fleet Manager', fleet: '✓', driver: '✓', trips: '--', fuel: '--', analytics: '✓' },
    { role: 'Dispatcher', fleet: 'view', driver: '--', trips: '✓', fuel: '--', analytics: '--' },
    { role: 'Safety Officer', fleet: '--', driver: '✓', trips: 'view', fuel: '--', analytics: '--' },
    { role: 'Financial Analyst', fleet: 'view', driver: '--', trips: '--', fuel: '✓', analytics: '✓' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* General Settings Column */}
      <div className="lg:col-span-5 rounded-stamp border border-border bg-surface p-6">
        <h2 className="text-xs font-bold text-ink uppercase tracking-wider mb-6 pb-2 border-b border-border/60">
          General
        </h2>
        
        <form onSubmit={handleSave} className="space-y-4">
          {successMsg && (
            <p className="stamp border-accent px-3 py-1.5 text-xs text-accent bg-accent/5 font-semibold">
              {successMsg}
            </p>
          )}
          {errorMsg && (
            <p className="stamp border-danger px-3 py-1.5 text-xs text-danger bg-danger/5">
              {errorMsg}
            </p>
          )}

          <div>
            <label htmlFor="depotName" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
              Depot Name
            </label>
            <input
              id="depotName"
              type="text"
              required
              value={depotName}
              onChange={(e) => setDepotName(e.target.value)}
              className="w-full rounded-stamp border border-border bg-paper px-3 py-2 text-xs text-ink outline-none focus:border-accent"
              placeholder="e.g. Depot GJ4"
            />
          </div>

          <div>
            <label htmlFor="currency" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
              Currency
            </label>
            <input
              id="currency"
              type="text"
              required
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-stamp border border-border bg-paper px-3 py-2 text-xs text-ink outline-none focus:border-accent"
              placeholder="e.g. INR (Rs)"
            />
          </div>

          <div>
            <label htmlFor="distanceUnit" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
              Distance Unit
            </label>
            <input
              id="distanceUnit"
              type="text"
              required
              value={distanceUnit}
              onChange={(e) => setDistanceUnit(e.target.value)}
              className="w-full rounded-stamp border border-border bg-paper px-3 py-2 text-xs text-ink outline-none focus:border-accent"
              placeholder="e.g. Kilometers"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-stamp bg-accent py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving changes...' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Role-Based Access Control Column */}
      <div className="lg:col-span-7 rounded-stamp border border-border bg-surface p-6">
        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-border/60 justify-between">
          <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
            Role-Based Access (RBAC)
          </h2>
          <ShieldCheck size={16} className="text-accent" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 text-[10px] uppercase tracking-wide text-ink-muted font-medium">
                <th className="py-2.5 font-semibold text-left">Role</th>
                <th className="py-2.5 font-semibold text-center">Fleet</th>
                <th className="py-2.5 font-semibold text-center">Driver</th>
                <th className="py-2.5 font-semibold text-center">Trips</th>
                <th className="py-2.5 font-semibold text-center">Fuel/Exp.</th>
                <th className="py-2.5 font-semibold text-center">Analytics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rbacData.map((row) => (
                <tr key={row.role} className="hover:bg-paper/30 transition-colors">
                  <td className="py-3 font-medium text-ink">{row.role}</td>
                  
                  {/* Fleet */}
                  <td className="py-3 text-center">
                    {row.fleet === '✓' ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-accent text-sm font-semibold">✓</span>
                    ) : row.fleet === 'view' ? (
                      <span className="font-medium text-ink-muted italic">view</span>
                    ) : (
                      <span className="text-ink-muted/40 font-mono">--</span>
                    )}
                  </td>

                  {/* Driver */}
                  <td className="py-3 text-center">
                    {row.driver === '✓' ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-accent text-sm font-semibold">✓</span>
                    ) : row.driver === 'view' ? (
                      <span className="font-medium text-ink-muted italic">view</span>
                    ) : (
                      <span className="text-ink-muted/40 font-mono">--</span>
                    )}
                  </td>

                  {/* Trips */}
                  <td className="py-3 text-center">
                    {row.trips === '✓' ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-accent text-sm font-semibold">✓</span>
                    ) : row.trips === 'view' ? (
                      <span className="font-medium text-ink-muted italic">view</span>
                    ) : (
                      <span className="text-ink-muted/40 font-mono">--</span>
                    )}
                  </td>

                  {/* Fuel/Exp */}
                  <td className="py-3 text-center">
                    {row.fuel === '✓' ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-accent text-sm font-semibold">✓</span>
                    ) : row.fuel === 'view' ? (
                      <span className="font-medium text-ink-muted italic">view</span>
                    ) : (
                      <span className="text-ink-muted/40 font-mono">--</span>
                    )}
                  </td>

                  {/* Analytics */}
                  <td className="py-3 text-center">
                    {row.analytics === '✓' ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-accent text-sm font-semibold">✓</span>
                    ) : row.analytics === 'view' ? (
                      <span className="font-medium text-ink-muted italic">view</span>
                    ) : (
                      <span className="text-ink-muted/40 font-mono">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
