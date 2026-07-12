import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <p className="font-mono text-xs uppercase tracking-wide text-ink-muted">404</p>
      <h2 className="font-display text-lg font-semibold text-ink">Route not found</h2>
      <Link
        to="/"
        className="mt-2 rounded-stamp border border-border bg-surface px-4 py-2 text-sm text-ink hover:text-accent"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
