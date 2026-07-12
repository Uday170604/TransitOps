import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { ROLE_LABELS } from '../../lib/roles.js'
import ThemeToggle from './ThemeToggle.jsx'

export default function Topbar({ title, onMenuClick }) {
  const { user, logout } = useAuth()

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open sidebar"
          className="flex h-9 w-9 items-center justify-center rounded-stamp border border-border text-ink-muted transition-colors hover:text-ink md:hidden focus:outline-none"
        >
          <Menu size={18} />
        </button>
        <h1 className="font-display text-lg font-semibold text-ink">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight text-ink">{user.name}</p>
          <p className="text-xs leading-tight text-ink-muted">{ROLE_LABELS[user.role]}</p>
        </div>
        <ThemeToggle />
        <button
          type="button"
          onClick={logout}
          aria-label="Log out"
          className="flex h-9 w-9 items-center justify-center rounded-stamp border border-border bg-surface text-ink-muted transition-colors hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
