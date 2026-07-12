import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext.jsx'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [settings, setSettings] = useState({
    depot_name: 'Gandhinagar Depot GJ4',
    currency: 'INR (Rs)',
    distance_unit: 'Kilometers'
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    const token = localStorage.getItem('transitops_token')
    if (!token) {
      setIsLoading(false)
      return
    }

    try {
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
          setSettings({
            depot_name: res.data.depot_name,
            currency: res.data.currency,
            distance_unit: res.data.distance_unit
          })
        }
      }
    } catch (err) {
      console.warn('Failed to fetch settings from API, using defaults.', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings()
    } else {
      setSettings({
        depot_name: 'Gandhinagar Depot GJ4',
        currency: 'INR (Rs)',
        distance_unit: 'Kilometers'
      })
      setIsLoading(false)
    }
  }, [isAuthenticated, fetchSettings])

  const updateSettings = useCallback(async (newSettings) => {
    const token = localStorage.getItem('transitops_token')
    if (!token) return false

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/api/v1/settings/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSettings)
      })
      if (response.ok) {
        const res = await response.json()
        if (res.success && res.data) {
          setSettings({
            depot_name: res.data.depot_name,
            currency: res.data.currency,
            distance_unit: res.data.distance_unit
          })
          return true
        }
      }
    } catch (err) {
      console.error('Failed to update settings', err)
    }
    return false
  }, [])

  const getCurrencySymbol = useCallback(() => {
    const c = settings.currency || 'INR (Rs)'
    if (c.includes('$') || c.toLowerCase().includes('usd')) return '$'
    if (c.includes('€') || c.toLowerCase().includes('eur')) return '€'
    if (c.includes('£') || c.toLowerCase().includes('gbp')) return '£'
    return '₹'
  }, [settings.currency])

  const getDistanceUnitLabel = useCallback(() => {
    const u = settings.distance_unit || 'Kilometers'
    if (u.toLowerCase().includes('mile')) return 'mi'
    return 'km'
  }, [settings.distance_unit])

  const formatCurrency = useCallback((inrValue) => {
    if (inrValue === null || inrValue === undefined || isNaN(inrValue)) return '—'
    const symbol = getCurrencySymbol()
    let val = inrValue
    if (symbol === '$') val = inrValue / 80
    else if (symbol === '€') val = inrValue / 90
    else if (symbol === '£') val = inrValue / 100
    
    return `${symbol}${Math.round(val).toLocaleString()}`
  }, [getCurrencySymbol])

  const formatDistance = useCallback((kmValue) => {
    if (kmValue === null || kmValue === undefined || isNaN(kmValue)) return '—'
    const label = getDistanceUnitLabel()
    let val = kmValue
    if (label === 'mi') val = kmValue * 0.621371
    
    return `${Math.round(val).toLocaleString()} ${label}`
  }, [getDistanceUnitLabel])

  return (
    <SettingsContext.Provider value={{
      settings,
      isLoading,
      updateSettings,
      fetchSettings,
      currencySymbol: getCurrencySymbol(),
      distanceUnitLabel: getDistanceUnitLabel(),
      formatCurrency,
      formatDistance
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
