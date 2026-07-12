import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { DEMO_ACCOUNTS } from '../data/mockAuth.js'
import { ROLE_LABELS } from '../lib/roles.js'
import ThemeToggle from '../components/layout/ThemeToggle.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('demo1234')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-stamp bg-accent font-display text-lg font-bold text-white">
            T
          </span>
          <h1 className="font-display text-2xl font-semibold text-ink">TransitOps</h1>
          <p className="mt-1 text-sm text-ink-muted">Smart Transport Operations Platform</p>
        </div>

        <div className="rounded-stamp border border-border bg-surface p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@transitops.dev"
                className="w-full rounded-stamp border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-stamp border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
            </div>

            {error && (
              <p className="stamp border-danger px-2 py-1 text-xs text-danger">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-stamp bg-accent py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-stamp border border-dashed border-border p-4">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            Demo accounts · password: demo1234
          </p>
          <ul className="space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => setEmail(account.email)}
                  className="flex w-full items-center justify-between rounded-stamp px-2 py-1.5 text-left text-xs text-ink-muted transition-colors hover:bg-paper hover:text-ink"
                >
                  <span className="font-mono">{account.email}</span>
                  <span>{ROLE_LABELS[account.role]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
