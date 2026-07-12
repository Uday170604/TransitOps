import { ROLES } from '../lib/roles.js'

// Demo credentials. Password is the same for all: "demo1234"
// Replace this whole file's usage by flipping USE_MOCK in lib/api.js
// once the backend exposes POST /auth/login.
const DEMO_USERS = [
  { id: 1, name: 'Priya Shah', email: 'fleet@transitops.dev', role: ROLES.FLEET_MANAGER },
  { id: 2, name: 'Alex Menon', email: 'driver@transitops.dev', role: ROLES.DRIVER },
  { id: 3, name: 'Ritu Nair', email: 'safety@transitops.dev', role: ROLES.SAFETY_OFFICER },
  { id: 4, name: 'Dev Patel', email: 'finance@transitops.dev', role: ROLES.FINANCIAL_ANALYST },
]

const DEMO_PASSWORD = 'demo1234'

export function mockLogin(email, password) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = DEMO_USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
      if (!user || password !== DEMO_PASSWORD) {
        reject(new Error('Invalid email or password.'))
        return
      }
      resolve({ token: `mock-token-${user.id}`, user })
    }, 450)
  })
}

export const DEMO_ACCOUNTS = DEMO_USERS.map((u) => ({ email: u.email, role: u.role }))
