import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { canAccess } from '../../lib/roles.js'

export default function RoleGate({ moduleKey, children }) {
  const { user } = useAuth()

  if (!canAccess(user.role, moduleKey)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
