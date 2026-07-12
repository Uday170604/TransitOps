import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <ShieldAlert size={28} className="text-danger" />
      <h2 className="font-display text-lg font-semibold text-ink">Access restricted</h2>
      <p className="max-w-sm text-sm text-ink-muted">
        Your role doesn't have access to this module. Switch accounts on the login screen
        to view it, or ask a Fleet Manager for access.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-stamp border border-border bg-surface px-4 py-2 text-sm text-ink hover:text-accent"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
