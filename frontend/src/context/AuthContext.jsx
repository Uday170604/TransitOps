import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { login as apiLogin } from '../lib/api.js'

const AuthContext = createContext(null)

const STORAGE_TOKEN = 'transitops_token'
const STORAGE_USER = 'transitops_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_USER)
    const storedToken = localStorage.getItem(STORAGE_TOKEN)
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const { token, user: loggedInUser } = await apiLogin(email, password)
    localStorage.setItem(STORAGE_TOKEN, token)
    localStorage.setItem(STORAGE_USER, JSON.stringify(loggedInUser))
    setUser(loggedInUser)
    return loggedInUser
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN)
    localStorage.removeItem(STORAGE_USER)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
