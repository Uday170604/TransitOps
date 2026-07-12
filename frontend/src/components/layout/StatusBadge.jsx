const STATUS_STYLES = {
  Available: 'text-accent-2 border-accent-2',
  'On Trip': 'text-accent border-accent',
  'In Shop': 'text-ink-muted border-ink-muted',
  Retired: 'text-danger border-danger',
  'Off Duty': 'text-ink-muted border-ink-muted',
  Suspended: 'text-danger border-danger',
  Draft: 'text-ink-muted border-ink-muted',
  Dispatched: 'text-accent border-accent',
  Completed: 'text-accent-2 border-accent-2',
  Cancelled: 'text-danger border-danger',
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'text-ink-muted border-ink-muted'
  return (
    <span className={`stamp inline-block px-2 py-0.5 text-[11px] font-medium ${style}`}>
      {status}
    </span>
  )
}
