import { useState, useEffect } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'

export default function SettingsPage() {
  const { user } = useAuth()
  const { settings, updateSettings } = useSettings()
  
  const [depotName, setDepotName] = useState(settings.depot_name)
  const [currency, setCurrency] = useState(settings.currency)
  const [distanceUnit, setDistanceUnit] = useState(settings.distance_unit)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // RBAC permissions state
  const [rbacList, setRbacList] = useState([])
  const [isSubmittingRbac, setIsSubmittingRbac] = useState(false)
  const [rbacSuccessMsg, setRbacSuccessMsg] = useState('')
  const [rbacErrorMsg, setRbacErrorMsg] = useState('')

  // Sync settings when they load
  useEffect(() => {
    if (settings) {
      setDepotName(settings.depot_name)
      setCurrency(settings.currency)
      setDistanceUnit(settings.distance_unit)
    }
  }, [settings])

  // Load RBAC permissions
  useEffect(() => {
    async function fetchRbac() {
      try {
        const token = localStorage.getItem('transitops_token')
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
        const response = await fetch(`${baseUrl}/api/v1/settings/rbac`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        })
        if (response.ok) {
          const res = await response.json()
          if (res.success && res.data) {
            setRbacList(res.data)
          }
        }
      } catch (err) {
        console.error('Failed to fetch RBAC settings from database.', err)
      }
    }
    fetchRbac()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setIsSubmitting(true)
    setSuccessMsg('')
    setErrorMsg('')

    const success = await updateSettings({
      depot_name: depotName,
      currency: currency,
      distance_unit: distanceUnit
    })

    if (success) {
      setSuccessMsg('Settings updated successfully!')
    } else {
      setErrorMsg('Failed to update settings on server.')
    }
    setIsSubmitting(false)
  }

  async function handleSaveRbac() {
    setIsSubmittingRbac(true)
    setRbacSuccessMsg('')
    setRbacErrorMsg('')

    try {
      const token = localStorage.getItem('transitops_token')
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/api/v1/settings/rbac`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(rbacList)
      })

      if (response.ok) {
        const res = await response.json()
        if (res.success && res.data) {
          setRbacList(res.data)
          setRbacSuccessMsg('RBAC Permissions updated successfully!')
        } else {
          setRbacErrorMsg('Failed to update RBAC permissions.')
        }
      } else {
        const errorData = await response.json()
        setRbacErrorMsg(errorData.detail || 'Failed to update RBAC permissions.')
      }
    } catch (err) {
      setRbacErrorMsg('Network error while updating RBAC permissions.')
    } finally {
      setIsSubmittingRbac(false)
    }
  }

  const handlePermissionChange = (roleId, field, value) => {
    setRbacList(prev => prev.map(role => {
      if (role.id === roleId) {
        return { ...role, [field]: value }
      }
      return role
    }))
  }

  const getRoleFriendlyName = (name) => {
    const mapping = {
      "fleet_manager": "Fleet Manager",
      "driver": "Driver",
      "safety_officer": "Safety Officer",
      "financial_analyst": "Financial Analyst"
    }
    return mapping[name] || name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const resources = [
    { key: 'permission_fleet', label: 'Fleet' },
    { key: 'permission_driver', label: 'Driver' },
    { key: 'permission_trips', label: 'Trips' },
    { key: 'permission_fuel', label: 'Fuel/Exp.' },
    { key: 'permission_analytics', label: 'Analytics' }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* General Settings Column */}
      <div className="lg:col-span-5 rounded-stamp border border-border bg-surface p-6">
        <h2 className="text-xs font-bold text-ink uppercase tracking-wider mb-6 pb-2 border-b border-border/60">
          General Settings
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
      <div className="lg:col-span-7 rounded-stamp border border-border bg-surface p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-6 pb-2 border-b border-border/60 justify-between">
            <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
              Role-Based Access (RBAC)
            </h2>
            <ShieldCheck size={16} className="text-accent" />
          </div>

          {rbacSuccessMsg && (
            <p className="stamp border-accent px-3 py-1.5 text-xs text-accent bg-accent/5 font-semibold mb-4">
              {rbacSuccessMsg}
            </p>
          )}
          {rbacErrorMsg && (
            <p className="stamp border-danger px-3 py-1.5 text-xs text-danger bg-danger/5 mb-4">
              {rbacErrorMsg}
            </p>
          )}

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
                {rbacList.map((role) => (
                  <tr key={role.id} className="hover:bg-paper/30 transition-colors">
                    <td className="py-3 font-medium text-ink">{getRoleFriendlyName(role.name)}</td>
                    
                    {resources.map((res) => (
                      <td key={res.key} className="py-2 text-center">
                        <select
                          value={role[res.key]}
                          disabled={user?.role !== 'fleet_manager'}
                          onChange={(e) => handlePermissionChange(role.id, res.key, e.target.value)}
                          className="bg-paper border border-border rounded-stamp text-[11px] text-ink outline-none px-1.5 py-1 focus:border-accent disabled:opacity-100 disabled:bg-transparent disabled:border-transparent text-center font-semibold"
                        >
                          <option value="write">✓ Full</option>
                          <option value="read">view</option>
                          <option value="none">-- None</option>
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {user?.role === 'fleet_manager' && rbacList.length > 0 && (
          <button
            onClick={handleSaveRbac}
            disabled={isSubmittingRbac}
            className="self-end mt-6 rounded-stamp bg-accent px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSubmittingRbac ? 'Saving Permissions...' : 'Save RBAC Permissions'}
          </button>
        )}
      </div>
    </div>
  )
}
